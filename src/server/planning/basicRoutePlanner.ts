import type { DataSourceSummary, MissingFieldNotice, NormalizedPlaceDetail, RouteMode } from "@/src/server/data-hub/types";
import { createDataHubService } from "@/src/server/data-hub/dataHubService";
import { createMissingFieldNotice } from "@/src/server/data-hub/providers/providerTypes";
import type {
  BasicRouteDraft,
  BasicRouteDraftDay,
  BasicRouteDraftSlot,
  BasicRoutePace,
  BasicRoutePlannerInput,
  BasicRouteUnresolvedPlace,
} from "@/src/lib/data-hub/planningTypes";

export type BasicRouteDataHubService = Pick<
  ReturnType<typeof createDataHubService>,
  "getOrEnrichPlaceDetails" | "getRouteEstimate"
>;

export interface BasicRoutePlannerOptions {
  dataHubService?: BasicRouteDataHubService;
}

const PACE_CAPACITY: Record<BasicRoutePace, number> = {
  relaxed: 3,
  balanced: 5,
  intense: 7,
};

const DEFAULT_DURATION_MINUTES = 90;

function createPlannerMissingField(input: {
  fieldName: string;
  message: string;
  reason?: MissingFieldNotice["reason"];
  severity?: MissingFieldNotice["severity"];
}) {
  return createMissingFieldNotice({
    fieldName: input.fieldName,
    reason: input.reason ?? "not_returned",
    severity: input.severity ?? "warning",
    message: input.message,
    provider: "data-hub-planner",
  });
}

function hasCoordinates(detail: NormalizedPlaceDetail) {
  return typeof detail.place.lat === "number" && typeof detail.place.lng === "number";
}

function getRegionKey(detail: NormalizedPlaceDetail) {
  return detail.place.regionId ?? detail.place.category ?? "unknown-region";
}

function getDuration(detail: NormalizedPlaceDetail) {
  return detail.recommendedDurationMinutes ?? DEFAULT_DURATION_MINUTES;
}

function getMissingFieldWarnings(detail: NormalizedPlaceDetail) {
  const warnings: string[] = [];
  const fieldNames = new Set(detail.missingFields.map((field) => field.fieldName));

  if (!detail.openingHours || fieldNames.has("openingHours")) {
    warnings.push("开放时间暂缺，规划时未按实时开放状态过滤。");
  }
  if (!detail.ticketInfo || fieldNames.has("ticketInfo")) {
    warnings.push("门票/预约信息暂缺，出行前需要再次确认。");
  }

  return warnings;
}

function getSlotTimes(dayIndex: number, slotIndex: number, durationMinutes: number | null) {
  const baseStartMinutes = 9 * 60 + slotIndex * 150;
  const startHours = Math.floor(baseStartMinutes / 60);
  const startMinutes = baseStartMinutes % 60;
  const endTotal = baseStartMinutes + (durationMinutes ?? DEFAULT_DURATION_MINUTES);
  const endHours = Math.floor(endTotal / 60);
  const endMinutes = endTotal % 60;
  const pad = (value: number) => String(value).padStart(2, "0");

  return {
    startTime: `${pad(startHours)}:${pad(startMinutes)}`,
    endTime: `${pad(endHours)}:${pad(endMinutes)}`,
  };
}

function buildPlaceReason(detail: NormalizedPlaceDetail, index: number) {
  const regionText = detail.place.regionId ? `同区域 ${detail.place.regionId}` : "按候选地点顺序";
  return index === 0
    ? `作为当天起点，${regionText}优先安排。`
    : `根据地理聚类和前后路线耗时排在第 ${index + 1} 站。`;
}

function sortByRegionAndInputOrder(details: NormalizedPlaceDetail[], inputOrder: string[]) {
  return [...details].sort((a, b) => {
    const regionCompare = getRegionKey(a).localeCompare(getRegionKey(b), "zh-CN");
    if (regionCompare !== 0) return regionCompare;
    return inputOrder.indexOf(a.place.id) - inputOrder.indexOf(b.place.id);
  });
}

function chunkByCapacity<T>(items: T[], dayCount: number, capacity: number) {
  const safeDayCount = Math.max(1, dayCount);
  const days: T[][] = Array.from({ length: safeDayCount }, () => []);
  let dayIndex = 0;

  for (const item of items) {
    if (days[dayIndex]!.length >= capacity) {
      if (dayIndex >= safeDayCount - 1) {
        continue;
      }
      dayIndex += 1;
    }
    days[dayIndex]!.push(item);
  }

  return days;
}

function collectSources(detail: NormalizedPlaceDetail): DataSourceSummary[] {
  return detail.sources.length ? detail.sources : [detail.place.source];
}

export async function buildBasicRouteDraft(
  input: BasicRoutePlannerInput,
  options: BasicRoutePlannerOptions = {},
): Promise<BasicRouteDraft> {
  const dataHubService = options.dataHubService ?? createDataHubService();
  const uniquePlaceIds = Array.from(new Set(input.candidatePlaceIds.map((id) => id.trim()).filter(Boolean)));
  const missingFields: MissingFieldNotice[] = [];
  const warnings: string[] = [];
  const unresolved: BasicRouteUnresolvedPlace[] = [];

  if (uniquePlaceIds.length === 0) {
    const warning = "候选地点不足，先添加至少 1 个候选地点。";
    return {
      days: Array.from({ length: Math.max(1, input.dayCount) }, (_, index) => ({
        dayNumber: index + 1,
        title: `Day ${index + 1}`,
        slots: [],
        totalTravelTimeSeconds: 0,
        missingFields: [],
        feasibilityWarnings: [warning],
      })),
      unresolved: [],
      evidence: [],
      missingFields: [createPlannerMissingField({ fieldName: "candidatePlaceIds", message: warning, severity: "info" })],
      warnings: [warning],
    };
  }

  const detailResults = await Promise.all(
    uniquePlaceIds.map(async (placeId) => ({
      placeId,
      result: await dataHubService.getOrEnrichPlaceDetails(placeId),
    })),
  );

  const usableDetails: NormalizedPlaceDetail[] = [];

  for (const { placeId, result } of detailResults) {
    if (!result.detail) {
      const fields = result.missingFields.length
        ? result.missingFields
        : [createPlannerMissingField({ fieldName: "place", message: "地点详情暂缺，不能参与路线规划。", severity: "blocking" })];
      unresolved.push({ placeId, reason: "地点详情暂缺", missingFields: fields });
      missingFields.push(...fields);
      continue;
    }

    if (!hasCoordinates(result.detail)) {
      const fields = [
        ...result.missingFields,
        createPlannerMissingField({
          fieldName: "coordinates",
          reason: "unresolved_place",
          severity: "blocking",
          message: `${result.detail.place.name} 缺少坐标，不能参与路线计算。`,
        }),
      ];
      unresolved.push({ placeId, reason: "缺少坐标", missingFields: fields });
      missingFields.push(...fields);
      continue;
    }

    usableDetails.push(result.detail);
    missingFields.push(...result.detail.missingFields);
  }

  const capacity = PACE_CAPACITY[input.pace] ?? PACE_CAPACITY.balanced;
  const sorted = sortByRegionAndInputOrder(usableDetails, uniquePlaceIds);
  const overflowCount = Math.max(0, sorted.length - Math.max(1, input.dayCount) * capacity);
  if (overflowCount > 0) {
    warnings.push(`候选地点比 ${input.pace} 节奏容量多 ${overflowCount} 个，已先放在最后一天。`);
  }

  const dayChunks = chunkByCapacity(sorted, Math.max(1, input.dayCount), capacity);
  const days: BasicRouteDraftDay[] = [];

  for (const [dayIndex, dayDetails] of dayChunks.entries()) {
    const slots: BasicRouteDraftSlot[] = [];
    const dayMissingFields: MissingFieldNotice[] = [];
    const feasibilityWarnings: string[] = [];
    let totalTravelTimeSeconds = 0;

    for (const [slotIndex, detail] of dayDetails.entries()) {
      const duration = getDuration(detail);
      const warningsForPlace = getMissingFieldWarnings(detail);
      if (warningsForPlace.length) feasibilityWarnings.push(...warningsForPlace.map((warning) => `${detail.place.name}：${warning}`));

      let routeFromPrevious: BasicRouteDraftSlot["routeFromPrevious"] = null;
      if (slotIndex > 0) {
        const previous = dayDetails[slotIndex - 1]!;
        const routeResult = await dataHubService.getRouteEstimate(previous.place.id, detail.place.id, input.transportMode);
        if (routeResult.route) {
          routeFromPrevious = {
            distanceMeters: routeResult.route.distanceMeters,
            durationSeconds: routeResult.route.durationSeconds,
            provider: String(routeResult.route.provider),
            confidence: routeResult.route.confidence,
          };
          totalTravelTimeSeconds += routeResult.route.durationSeconds ?? 0;
        } else {
          const routeMissing = routeResult.missingFields.length
            ? routeResult.missingFields
            : [createPlannerMissingField({ fieldName: "route", message: `${previous.place.name} 到 ${detail.place.name} 的路线耗时暂缺。` })];
          dayMissingFields.push(...routeMissing);
          routeFromPrevious = {
            distanceMeters: null,
            durationSeconds: null,
            provider: "missing",
            confidence: null,
          };
          feasibilityWarnings.push(`${previous.place.name} → ${detail.place.name} 的路线耗时暂缺，已保留地点顺序但不计入通勤时间。`);
        }
      }

      slots.push({
        placeId: detail.place.id,
        name: detail.place.name,
        ...getSlotTimes(dayIndex, slotIndex, duration),
        recommendedDurationMinutes: duration,
        routeFromPrevious,
        reason: buildPlaceReason(detail, slotIndex),
        warnings: warningsForPlace,
        sourceSummary: collectSources(detail),
      });
    }

    days.push({
      dayNumber: dayIndex + 1,
      title: dayDetails.length ? `Day ${dayIndex + 1} · ${dayDetails[0]!.place.name} 周边` : `Day ${dayIndex + 1}`,
      slots,
      totalTravelTimeSeconds,
      missingFields: dayMissingFields,
      feasibilityWarnings: Array.from(new Set(feasibilityWarnings)),
    });
  }

  return {
    days,
    unresolved,
    evidence: days.flatMap((day) =>
      day.slots.map((slot, index) => ({
        placeId: slot.placeId,
        sourceType: "data_hub_basic_route_planner",
        sourceId: slot.sourceSummary[0]?.externalId ?? slot.sourceSummary[0]?.sourceUrl ?? null,
        reason: index === 0 ? "按区域聚类作为当天起点。" : "按候选地点区域和 DataHub 路线估算排序。",
      })),
    ),
    missingFields,
    warnings,
  };
}

