import "server-only";

import { getPoiProvider } from "../poi/client";
import type { PoiProvider } from "../poi/provider";
import type { PoiCandidate } from "../poi/types";
import { getRouteProvider } from "../route/client";
import { ROUTE_WARNINGS } from "../route/provider";
import type { RouteProvider } from "../route/provider";
import type { RouteEstimateResult, RouteLeg, RouteMode } from "../route/types";
import {
  type AnalyzeDayPaceInput,
  type DayRouteSummary,
  type ExtractedDayPlaces,
  type ExtractedPlace,
  type MapPoint,
  type PaceWarning,
  type TripEnrichment,
} from "./enrichment-types";
import type { ItineraryItem, TripPlan } from "./types";
import type { TimeSlotKey } from "./itinerary-view";
import type { ItineraryItemType } from "./types";

const EXCLUDED_ITEM_TYPES = new Set<ItineraryItemType>([
  "transport",
  "hotel",
  "free_time",
]);
const GENERIC_NON_POI_NAMES = new Set([
  "早餐",
  "午餐",
  "晚餐",
  "午饭",
  "晚饭",
  "夜宵",
  "下午茶",
  "自由活动",
  "自由安排",
  "酒店休息",
  "回酒店休息",
  "返程",
  "休息",
  "入住",
  "退房",
]);
const GENERIC_NON_POI_PATTERNS = [
  "早餐",
  "午餐",
  "晚餐",
  "午饭",
  "晚饭",
  "夜宵",
  "自由活动",
  "自由安排",
  "酒店休息",
  "回酒店休息",
  "入住酒店",
  "办理入住",
  "退房",
  "返程",
];
const AMAP_FALLBACK_WARNINGS = new Set<string>([
  ROUTE_WARNINGS.amapInvalidStatus,
  ROUTE_WARNINGS.amapNoRoute,
  ROUTE_WARNINGS.amapInvalidMetrics,
]);
const SLOT_KEYS: TimeSlotKey[] = ["morning", "afternoon", "evening"];

export interface TripEnrichmentOptions {
  city?: string;
  routeMode?: RouteMode;
  poiProvider?: PoiProvider;
  routeProvider?: RouteProvider;
}

interface RouteAttemptIssue {
  fromName: string;
  toName: string;
}

function normalizePlaceName(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

function shouldSkipItem(item: ItineraryItem): boolean {
  if (EXCLUDED_ITEM_TYPES.has(item.type)) {
    return true;
  }

  const normalized = item.placeName.trim();
  if (!normalized) {
    return true;
  }

  if (GENERIC_NON_POI_NAMES.has(normalized)) {
    return true;
  }

  return GENERIC_NON_POI_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function toStableMapPointId(place: ExtractedPlace): string {
  const nameKey = normalizePlaceName(place.name).replace(/\s+/g, "-");
  return `day-${place.dayIndex}-${place.slot}-${place.itemIndex}-${nameKey}`;
}

function createWarning(
  dayIndex: number,
  type: PaceWarning["type"],
  level: PaceWarning["level"],
  message: string,
  extra: Partial<Pick<PaceWarning, "relatedPlaceNames" | "relatedLegIndex">> = {},
): PaceWarning {
  return {
    id: `day-${dayIndex}-${type}-${level}-${message}`,
    level,
    type,
    message,
    ...(extra.relatedPlaceNames ? { relatedPlaceNames: extra.relatedPlaceNames } : {}),
    ...(extra.relatedLegIndex === undefined
      ? {}
      : { relatedLegIndex: extra.relatedLegIndex }),
  };
}

function hasFallbackWarning(result: RouteEstimateResult): boolean {
  return (result.warnings ?? []).some((warning) =>
    AMAP_FALLBACK_WARNINGS.has(warning),
  );
}

function buildMapPoint(
  place: ExtractedPlace,
  candidate?: PoiCandidate,
  warning?: string,
): MapPoint {
  return {
    id: toStableMapPointId(place),
    name: place.name,
    dayIndex: place.dayIndex,
    slot: place.slot,
    itemIndex: place.itemIndex,
    itemType: place.itemType,
    coordinates: candidate?.coordinates,
    address: candidate?.address,
    provider: candidate?.provider,
    resolved: Boolean(candidate),
    ...(warning ? { warning } : {}),
  };
}

export function extractPlaceNamesFromTripPlan(
  tripPlan: TripPlan,
): ExtractedDayPlaces[] {
  return tripPlan.dailyItinerary.map((day) => {
    const seen = new Set<string>();
    const places: ExtractedPlace[] = [];

    for (const slot of SLOT_KEYS) {
      for (const [itemIndex, item] of day[slot].entries()) {
        if (shouldSkipItem(item)) {
          continue;
        }

        const normalizedName = normalizePlaceName(item.placeName);
        if (!normalizedName || seen.has(normalizedName)) {
          continue;
        }

        seen.add(normalizedName);
        places.push({
          name: item.placeName.trim(),
          dayIndex: day.day,
          slot,
          itemIndex,
          itemType: item.type,
        });
      }
    }

    return {
      dayIndex: day.day,
      places,
    };
  });
}

export function analyzeDayPace(input: AnalyzeDayPaceInput): DayRouteSummary {
  const totalDistanceMeters = input.routeLegs.reduce(
    (sum, leg) => sum + leg.distanceMeters,
    0,
  );
  const totalDurationMinutes = input.routeLegs.reduce(
    (sum, leg) => sum + leg.durationMinutes,
    0,
  );
  const warnings: PaceWarning[] = [];
  const placeCount = input.places.length;
  const eveningCount = input.places.filter((place) => place.slot === "evening").length;

  if (placeCount >= 7) {
    warnings.push(
      createWarning(
        input.dayIndex,
        "too_many_places",
        "critical",
        "这一天地点很多，节奏会比较赶，建议至少减掉 1 到 2 个点。",
        {
          relatedPlaceNames: input.places.map((place) => place.name),
        },
      ),
    );
  } else if (placeCount >= 5) {
    warnings.push(
      createWarning(
        input.dayIndex,
        "too_many_places",
        "warning",
        "这一天地点有点多，建议少排 1 个点，会更从容。",
        {
          relatedPlaceNames: input.places.map((place) => place.name),
        },
      ),
    );
  }

  input.routeLegs.forEach((leg, index) => {
    const relatedPlaceNames = [leg.fromName, leg.toName].filter(
      (name): name is string => Boolean(name),
    );

    if (leg.durationMinutes >= 75) {
      warnings.push(
        createWarning(
          input.dayIndex,
          "long_transfer",
          "critical",
          `从 ${leg.fromName ?? "上一站"} 到 ${leg.toName ?? "下一站"} 的通勤时间很长，建议换成更近的点。`,
          {
            relatedPlaceNames,
            relatedLegIndex: index,
          },
        ),
      );
    } else if (leg.durationMinutes >= 45) {
      warnings.push(
        createWarning(
          input.dayIndex,
          "long_transfer",
          "warning",
          `从 ${leg.fromName ?? "上一站"} 到 ${leg.toName ?? "下一站"} 的通勤偏长，最好留一点机动时间。`,
          {
            relatedPlaceNames,
            relatedLegIndex: index,
          },
        ),
      );
    }
  });

  if (totalDurationMinutes >= 180) {
    warnings.push(
      createWarning(
        input.dayIndex,
        "high_total_transfer",
        "critical",
        "这一天总通勤时间很长，建议把部分地点挪到别的天。",
      ),
    );
  } else if (totalDurationMinutes >= 120) {
    warnings.push(
      createWarning(
        input.dayIndex,
        "high_total_transfer",
        "warning",
        "这一天预计通勤时间偏长，行程会有点赶。",
      ),
    );
  }

  if (input.unresolvedPlaces.length > 0) {
    warnings.push(
      createWarning(
        input.dayIndex,
        "unresolved_place",
        "warning",
        "有地点暂时无法确认，出发前请再核对名称和地址。",
        {
          relatedPlaceNames: input.unresolvedPlaces,
        },
      ),
    );
  }

  for (const pair of input.routeUnavailablePairs ?? []) {
    warnings.push(
      createWarning(
        input.dayIndex,
        "route_unavailable",
        "warning",
        `从 ${pair.fromName} 到 ${pair.toName} 的路线暂时没算出来，建议出发前再看一下。`,
        {
          relatedPlaceNames: [pair.fromName, pair.toName],
        },
      ),
    );
  }

  for (const legIndex of input.fallbackLegIndices ?? []) {
    const leg = input.routeLegs[legIndex];
    if (!leg) {
      continue;
    }

    warnings.push(
      createWarning(
        input.dayIndex,
        "fallback_estimate",
        "info",
        `从 ${leg.fromName ?? "上一站"} 到 ${leg.toName ?? "下一站"} 目前用了保守估算，实际通勤可能会有出入。`,
        {
          relatedPlaceNames: [leg.fromName, leg.toName].filter(
            (name): name is string => Boolean(name),
          ),
          relatedLegIndex: legIndex,
        },
      ),
    );
  }

  if (eveningCount >= 3) {
    warnings.push(
      createWarning(
        input.dayIndex,
        "dense_evening",
        "warning",
        "晚上安排有点密，最好留一点慢慢走和吃饭的时间。",
        {
          relatedPlaceNames: input.places
            .filter((place) => place.slot === "evening")
            .map((place) => place.name),
        },
      ),
    );
  }

  return {
    dayIndex: input.dayIndex,
    totalDistanceMeters,
    totalDurationMinutes,
    legs: input.routeLegs,
    unresolvedPlaces: [...input.unresolvedPlaces],
    warnings,
  };
}

async function resolvePlace(
  city: string,
  place: ExtractedPlace,
  poiProvider: PoiProvider,
): Promise<{
  mapPoint: MapPoint;
  candidate?: PoiCandidate;
}> {
  try {
    const result = await poiProvider.searchPoi({
      city,
      keyword: place.name,
      limit: 1,
    });
    const candidate = result.candidates[0];

    if (!candidate) {
      return {
        mapPoint: buildMapPoint(place, undefined, result.warnings?.[0]),
      };
    }

    return {
      mapPoint: buildMapPoint(place, candidate, result.warnings?.[0]),
      candidate,
    };
  } catch {
    return {
      mapPoint: buildMapPoint(
        place,
        undefined,
        "地点解析暂时失败了，先把这一站标成待确认。",
      ),
    };
  }
}

export async function enrichTripPlanWithRoutes(
  tripPlan: TripPlan,
  options: TripEnrichmentOptions = {},
): Promise<TripEnrichment> {
  const poiProvider = options.poiProvider ?? getPoiProvider();
  const routeProvider = options.routeProvider ?? getRouteProvider();
  const city = options.city ?? tripPlan.destination;
  const routeMode = options.routeMode ?? "driving";
  const extractedDays = extractPlaceNamesFromTripPlan(tripPlan);
  const mapPoints: MapPoint[] = [];
  const daySummaries: DayRouteSummary[] = [];

  for (const day of extractedDays) {
    const resolvedPoints = await Promise.all(
      day.places.map((place) => resolvePlace(city, place, poiProvider)),
    );
    const dayMapPoints = resolvedPoints.map((result) => result.mapPoint);
    mapPoints.push(...dayMapPoints);

    const routeLegs: RouteLeg[] = [];
    const routeUnavailablePairs: RouteAttemptIssue[] = [];
    const fallbackLegIndices: number[] = [];
    const unresolvedPlaces = dayMapPoints
      .filter((point) => !point.resolved)
      .map((point) => point.name);
    const resolvedCandidates = resolvedPoints.filter(
      (point): point is { mapPoint: MapPoint; candidate: PoiCandidate } =>
        Boolean(point.candidate),
    );

    for (let index = 0; index < resolvedCandidates.length - 1; index += 1) {
      const current = resolvedCandidates[index];
      const next = resolvedCandidates[index + 1];

      try {
        const result = await routeProvider.estimateRoute({
          origin: current.candidate.coordinates,
          destination: next.candidate.coordinates,
          mode: routeMode,
        });

        const legIndex = routeLegs.length;
        routeLegs.push({
          ...result.leg,
          fromName: current.mapPoint.name,
          toName: next.mapPoint.name,
        });

        if (hasFallbackWarning(result)) {
          fallbackLegIndices.push(legIndex);
        }
      } catch {
        routeUnavailablePairs.push({
          fromName: current.mapPoint.name,
          toName: next.mapPoint.name,
        });
      }
    }

    daySummaries.push(
      analyzeDayPace({
        dayIndex: day.dayIndex,
        places: dayMapPoints.map((point) => ({
          name: point.name,
          slot: point.slot,
        })),
        routeLegs,
        unresolvedPlaces,
        routeUnavailablePairs,
        fallbackLegIndices,
      }),
    );
  }

  return {
    daySummaries,
    mapPoints,
    warnings: daySummaries.flatMap((summary) => summary.warnings),
  };
}
