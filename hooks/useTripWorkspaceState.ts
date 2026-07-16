import { useEffect, useMemo, useState } from "react";

import type { WorkspaceSidebarItemId } from "@/components/workspace/WorkspaceSidebar";
import type { PoiCandidate, Coordinates } from "@/lib/poi/types";
import type { RouteEstimateResult } from "@/lib/route/types";
import type { TripResultEnrichment } from "@/lib/trip/enrichment-types";
import {
  mapTripPlanToCabinets,
  type DayCabinetView,
  type ItineraryBlockView,
  type TimeSlotDefinition,
  type TimeSlotKey,
} from "@/lib/trip/itinerary-view";
import type {
  PendingChangeAction,
  QuickModificationType,
} from "@/lib/trip/modification-intents";
import {
  buildDayRouteInsight,
  resolveInsightDayNumber,
} from "@/lib/trip/route-insight";
import {
  ensureWorkspaceSessionMetadata,
  type WorkspaceSessionSourceType,
} from "@/lib/trip/storage";
import type {
  DailyItinerary,
  DailyTimeSlot,
  GenerateTripResponse,
  ItineraryItem,
  TripPlan,
  TripRequest,
} from "@/lib/trip/types";

import { useTripMap } from "./useTripMap";
import { useTripModification } from "./useTripModification";
import { useTripSave } from "./useTripSave";

export interface AttractionEntry {
  attraction: ItineraryItem;
  day: number;
}

export interface WorkspaceNavItem {
  key: string;
  label: string;
  badge?: number;
}

export type WorkspaceMode = "read" | "edit";
export interface WorkspaceDistanceSummary {
  fromName: string;
  toName: string;
  distanceText: string;
  durationText: string;
  summary: string;
  provider: string;
}

type EnrichmentState = "idle" | "loading" | "ready" | "error";
type SidebarNotice = {
  title: string;
  message: string;
} | null;
type MobilePageKey =
  | "overview"
  | "budget"
  | "more"
  | "edit"
  | "route"
  | `day-${number}`;

interface UseTripWorkspaceStateOptions {
  tripPlan: TripPlan;
  tripRequest: TripRequest | null;
}

function isValidCoordinates(value: Coordinates | undefined): value is Coordinates {
  return Boolean(
    value &&
      Number.isFinite(value.lat) &&
      Number.isFinite(value.lng) &&
      Math.abs(value.lat) <= 90 &&
      Math.abs(value.lng) <= 180,
  );
}

function formatDistanceText(distanceMeters: number) {
  if (distanceMeters >= 1000) {
    return `${(distanceMeters / 1000).toFixed(1)} 公里`;
  }

  return `${Math.round(distanceMeters)} 米`;
}

function formatDurationText(durationMinutes: number) {
  if (durationMinutes >= 60) {
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    if (minutes === 0) {
      return `${hours} 小时`;
    }

    return `${hours} 小时 ${minutes} 分钟`;
  }

  return `${Math.max(1, Math.round(durationMinutes))} 分钟`;
}

function collectAttractions(tripPlan: TripPlan): AttractionEntry[] {
  const seen = new Set<string>();
  const attractions: AttractionEntry[] = [];

  for (const day of tripPlan.dailyItinerary) {
    const items = [...day.morning, ...day.afternoon, ...day.evening];

    for (const item of items) {
      const key = item.placeName.trim().toLowerCase();

      if (item.type === "attraction" && !seen.has(key)) {
        seen.add(key);
        attractions.push({ attraction: item, day: day.day });
      }
    }
  }

  return attractions;
}

function hasItineraryStops(tripPlan: TripPlan) {
  return tripPlan.dailyItinerary.some(
    (day) =>
      day.morning.length > 0 || day.afternoon.length > 0 || day.evening.length > 0,
  );
}

function createEditorId(prefix: "item" | "slot") {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createTimeSlotDefinition(
  baseSlot: TimeSlotKey,
  overrides?: Partial<DailyTimeSlot>,
): DailyTimeSlot {
  const defaults: Record<
    TimeSlotKey,
    Pick<DailyTimeSlot, "label" | "startTime" | "endTime">
  > = {
    morning: { label: "上午", startTime: "08:00", endTime: "12:00" },
    afternoon: { label: "下午", startTime: "12:00", endTime: "18:00" },
    evening: { label: "晚上", startTime: "18:00", endTime: "22:00" },
  };

  return {
    id: overrides?.id ?? (overrides ? createEditorId("slot") : baseSlot),
    baseSlot,
    label: overrides?.label ?? defaults[baseSlot].label,
    startTime: overrides?.startTime ?? defaults[baseSlot].startTime,
    endTime: overrides?.endTime ?? defaults[baseSlot].endTime,
  };
}

function createDefaultTimeSlots() {
  return [
    createTimeSlotDefinition("morning"),
    createTimeSlotDefinition("afternoon"),
    createTimeSlotDefinition("evening"),
  ];
}

function getDayTimeSlots(day: DailyItinerary): DailyTimeSlot[] {
  return day.timeSlots?.length ? day.timeSlots : createDefaultTimeSlots();
}

function getSlotDefinitions(day: DailyItinerary): TimeSlotDefinition[] {
  return getDayTimeSlots(day).map((slot) => ({
    id: slot.id,
    key: slot.baseSlot,
    label: slot.label,
    startTime: slot.startTime,
    endTime: slot.endTime,
  }));
}

function getFallbackSlotId(day: DailyItinerary, baseSlot: TimeSlotKey): string {
  return getDayTimeSlots(day).find((slot) => slot.baseSlot === baseSlot)?.id ?? baseSlot;
}

function normalizeDayForWorkspace(day: DailyItinerary): DailyItinerary {
  const timeSlots = getDayTimeSlots(day).map((slot) => ({ ...slot }));
  const nextDay = { ...day, timeSlots };

  return {
    ...nextDay,
    morning: day.morning.map((item) => ({
      ...item,
      editorId: item.editorId ?? createEditorId("item"),
      editorSlotId:
        item.editorSlotId && timeSlots.some((slot) => slot.id === item.editorSlotId)
          ? item.editorSlotId
          : getFallbackSlotId(nextDay, "morning"),
    })),
    afternoon: day.afternoon.map((item) => ({
      ...item,
      editorId: item.editorId ?? createEditorId("item"),
      editorSlotId:
        item.editorSlotId && timeSlots.some((slot) => slot.id === item.editorSlotId)
          ? item.editorSlotId
          : getFallbackSlotId(nextDay, "afternoon"),
    })),
    evening: day.evening.map((item) => ({
      ...item,
      editorId: item.editorId ?? createEditorId("item"),
      editorSlotId:
        item.editorSlotId && timeSlots.some((slot) => slot.id === item.editorSlotId)
          ? item.editorSlotId
          : getFallbackSlotId(nextDay, "evening"),
    })),
  };
}

function normalizeTripPlanForWorkspace(tripPlan: TripPlan): TripPlan {
  return {
    ...tripPlan,
    dailyItinerary: tripPlan.dailyItinerary.map(normalizeDayForWorkspace),
  };
}

function buildRouteOrderFromDay(day: DailyItinerary): string[] {
  const normalizedDay = normalizeDayForWorkspace(day);
  const slotDefinitions = getSlotDefinitions(normalizedDay);
  const routeOrder = slotDefinitions.flatMap((slot) =>
    normalizedDay[slot.key]
      .filter((item) => item.editorSlotId === slot.id)
      .map((item) => item.placeName),
  );

  return routeOrder.length > 0 ? routeOrder : ["待补地点"];
}

function updateDayRouteMeta(day: DailyItinerary): DailyItinerary {
  return {
    ...day,
    routeOrder: buildRouteOrderFromDay(day),
  };
}

function findBlockItem(
  day: DailyItinerary,
  block: ItineraryBlockView,
): { slot: TimeSlotKey; itemIndex: number; item: ItineraryItem } | null {
  const slots: TimeSlotKey[] = ["morning", "afternoon", "evening"];

  for (const slot of slots) {
    const itemIndex = day[slot].findIndex((item, index) => {
      if (block.item.editorId && item.editorId) {
        return item.editorId === block.item.editorId;
      }

      return (
        index === block.ref.itemIndex &&
        item.placeName === block.ref.placeName &&
        item.type === block.ref.type
      );
    });

    if (itemIndex >= 0) {
      return {
        slot,
        itemIndex,
        item: day[slot][itemIndex],
      };
    }
  }

  return null;
}

function createEmptyDay(dayNumber: number): DailyItinerary {
  return {
    day: dayNumber,
    theme: `第 ${dayNumber} 天待整理`,
    routeOrder: [],
    routeReason: "先补地点，再慢慢把这一天排顺。",
    morning: [],
    afternoon: [],
    evening: [],
    dailyTips: [],
  };
}

function createWorkspaceEmptyDay(dayNumber: number): DailyItinerary {
  return {
    ...createEmptyDay(dayNumber),
    date: undefined,
    timeSlots: createDefaultTimeSlots(),
  };
}

function createWorkspaceManualPlaceDraft(
  slot: TimeSlotKey,
  placeName: string,
  slotId: string,
): ItineraryItem {
  const slotLabelMap: Record<TimeSlotKey, string> = {
    morning: "上午",
    afternoon: "下午",
    evening: "晚上",
  };

  return {
    placeName,
    type: "other",
    reason: `${slotLabelMap[slot]}先留一个位置，后面再补细节。`,
    guide: ["先记下想去的地方，路线和备注可以稍后整理。"],
    editorId: createEditorId("item"),
    editorSlotId: slotId,
  };
}

export function useTripWorkspaceState({
  tripPlan,
  tripRequest,
}: UseTripWorkspaceStateOptions) {
  const workspaceSession = useMemo(
    () =>
      ensureWorkspaceSessionMetadata(
        {
          sourceType: "ai_generated",
          workspaceModeDefault: "read",
        },
      ),
    [],
  );
  const workspaceSourceType: WorkspaceSessionSourceType | undefined =
    workspaceSession?.sourceType;
  const normalizedTripPlan = useMemo(
    () => normalizeTripPlanForWorkspace(tripPlan),
    [tripPlan],
  );
  const {
    currentTripPlan: storedTripPlan,
    persistTripPlan: persistStoredTripPlan,
    applyRegeneratedTrip: applyStoredRegeneratedTrip,
  } = useTripSave(normalizedTripPlan);
  const currentTripPlan = useMemo(
    () => normalizeTripPlanForWorkspace(storedTripPlan),
    [storedTripPlan],
  );
  const [enrichmentState, setEnrichmentState] = useState<EnrichmentState>("idle");
  const [tripEnrichment, setTripEnrichment] = useState<TripResultEnrichment | null>(
    null,
  );
  const [enrichmentError, setEnrichmentError] = useState<string>();
  const [activeMobilePage, setActiveMobilePage] =
    useState<MobilePageKey>("overview");
  const [activeWorkspaceDayNumber, setActiveWorkspaceDayNumber] = useState(1);
  const [selectedInsightDay, setSelectedInsightDay] = useState(1);
  const [activeWorkspaceNav, setActiveWorkspaceNav] =
    useState<WorkspaceSidebarItemId>("route");
  const [sidebarNotice, setSidebarNotice] = useState<SidebarNotice>(null);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(() => {
    return workspaceSession?.workspaceModeDefault ?? "read";
  });
  const [mapSearchKeyword, setMapSearchKeyword] = useState("");
  const [mapSearchResults, setMapSearchResults] = useState<PoiCandidate[]>([]);
  const [mapSearchWarnings, setMapSearchWarnings] = useState<string[]>([]);
  const [mapSearchLoading, setMapSearchLoading] = useState(false);
  const [mapSearchError, setMapSearchError] = useState<string>();
  const [selectedSearchCandidate, setSelectedSearchCandidate] =
    useState<PoiCandidate | null>(null);
  const [pendingSearchCandidate, setPendingSearchCandidate] =
    useState<PoiCandidate | null>(null);
  const [mapTargetSlotId, setMapTargetSlotId] = useState<string | null>(null);
  const [distanceTargetPointId, setDistanceTargetPointId] = useState<string>("");
  const [distanceSummary, setDistanceSummary] =
    useState<WorkspaceDistanceSummary | null>(null);
  const [distanceLoading, setDistanceLoading] = useState(false);
  const [distanceError, setDistanceError] = useState<string>();
  const [mapActionMessage, setMapActionMessage] = useState<string>();

  function persistWorkspaceTripPlan(nextTripPlan: TripPlan) {
    return persistStoredTripPlan(normalizeTripPlanForWorkspace(nextTripPlan));
  }

  function applyWorkspaceRegeneratedTrip(response: GenerateTripResponse) {
    return applyStoredRegeneratedTrip({
      ...response,
      tripPlan: normalizeTripPlanForWorkspace(response.tripPlan),
    });
  }

  const modification = useTripModification();
  const attractions = useMemo(
    () => collectAttractions(currentTripPlan),
    [currentTripPlan],
  );
  const cabinets = useMemo(
    () => mapTripPlanToCabinets(currentTripPlan),
    [currentTripPlan],
  );
  const firstCabinet = cabinets[0];
  const hasStops = useMemo(() => hasItineraryStops(currentTripPlan), [currentTripPlan]);
  const isBlankWorkspace = workspaceSourceType === "blank_manual" && !hasStops;
  const effectiveTripEnrichment = isBlankWorkspace ? null : tripEnrichment;
  const effectiveEnrichmentState = isBlankWorkspace ? "idle" : enrichmentState;
  const effectiveEnrichmentError = isBlankWorkspace ? undefined : enrichmentError;
  const resolvedWorkspaceDayNumber = cabinets.some(
    (cabinet) => cabinet.dayNumber === activeWorkspaceDayNumber,
  )
    ? activeWorkspaceDayNumber
    : firstCabinet?.dayNumber ?? 1;
  const activeWorkspaceCabinet = cabinets.find(
    (cabinet) => cabinet.dayNumber === resolvedWorkspaceDayNumber,
  );
  const pendingChangesCount = modification.pendingChanges.length;
  const mobileNavItems = useMemo<WorkspaceNavItem[]>(
    () => [
      { key: "overview", label: "总览" },
      ...cabinets.map((cabinet) => ({
        key: `day-${cabinet.dayNumber}`,
        label: `第 ${cabinet.dayNumber} 天`,
      })),
      { key: "budget", label: "预算" },
      { key: "more", label: "更多" },
      { key: "route", label: "路线" },
      {
        key: "edit",
        label: "编辑",
        badge: pendingChangesCount,
      },
    ],
    [cabinets, pendingChangesCount],
  );
  const activeMobileCabinet = useMemo<DayCabinetView | undefined>(() => {
    if (!activeMobilePage.startsWith("day-")) {
      return undefined;
    }

    const dayNumber = Number(activeMobilePage.replace("day-", ""));

    if (Number.isNaN(dayNumber)) {
      return undefined;
    }

    return cabinets.find((cabinet) => cabinet.dayNumber === dayNumber);
  }, [activeMobilePage, cabinets]);
  const insightDayItems = useMemo<WorkspaceNavItem[]>(
    () =>
      cabinets.map((cabinet) => ({
        key: `day-${cabinet.dayNumber}`,
        label: `第 ${cabinet.dayNumber} 天`,
      })),
    [cabinets],
  );
  const effectiveSelectedInsightDay = resolveInsightDayNumber(
    currentTripPlan,
    selectedInsightDay,
  );
  const selectedInsight = useMemo(() => {
    if (!effectiveTripEnrichment) {
      return undefined;
    }

    return buildDayRouteInsight(
      currentTripPlan,
      effectiveTripEnrichment,
      effectiveSelectedInsightDay,
    );
  }, [currentTripPlan, effectiveSelectedInsightDay, effectiveTripEnrichment]);
  const desktopSelectedInsight = useMemo(() => {
    if (!effectiveTripEnrichment) {
      return undefined;
    }

    return buildDayRouteInsight(
      currentTripPlan,
      effectiveTripEnrichment,
      resolvedWorkspaceDayNumber,
    );
  }, [currentTripPlan, effectiveTripEnrichment, resolvedWorkspaceDayNumber]);
  const map = useTripMap({
    activeCabinet: activeWorkspaceCabinet,
    insight: desktopSelectedInsight,
  });
  const activeInsightPoints = desktopSelectedInsight?.mapPoints ?? [];
  const activeResolvedPoints = activeInsightPoints.filter(
    (point) => point.resolved && isValidCoordinates(point.coordinates),
  );
  const resolvedMapTargetSlotId =
    mapTargetSlotId &&
    activeWorkspaceCabinet?.slots.some((slot) => slot.id === mapTargetSlotId)
      ? mapTargetSlotId
      : activeWorkspaceCabinet?.slots[0]?.id ?? null;
  const visiblePendingSearchCandidate =
    pendingSearchCandidate &&
    !activeResolvedPoints.some(
      (point) => point.name.trim() === pendingSearchCandidate.name.trim(),
    )
      ? pendingSearchCandidate
      : null;

  useEffect(() => {
    if (isBlankWorkspace) {
      return;
    }

    const controller = new AbortController();

    async function loadEnrichment() {
      setEnrichmentState("loading");
      setEnrichmentError(undefined);

      try {
        const response = await fetch("/api/enrich-trip", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tripPlan: currentTripPlan,
            tripRequest,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to load enrichment");
        }

        const payload = (await response.json()) as TripResultEnrichment;

        if (controller.signal.aborted) {
          return;
        }

        setTripEnrichment(payload);
        setEnrichmentState("ready");
      } catch {
        if (controller.signal.aborted) {
          return;
        }

        setTripEnrichment(null);
        setEnrichmentState("error");
        setEnrichmentError("暂时拿不到地图补充信息，请稍后再试。");
      }
    }

    void loadEnrichment();

    return () => controller.abort();
  }, [currentTripPlan, isBlankWorkspace, tripRequest]);

  function scrollToSection(sectionId: string) {
    const element = document.getElementById(sectionId);

    if (!(element instanceof HTMLElement)) {
      return;
    }

    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function scrollToWorkspaceEditIfDesktop() {
    if (!window.matchMedia("(min-width: 1024px)").matches) {
      return;
    }

    window.requestAnimationFrame(() => {
      scrollToSection("workspace-ai-assist");
    });
  }

  function goToMobilePage(page: MobilePageKey) {
    setActiveMobilePage(page);

    if (page.startsWith("day-")) {
      const dayNumber = Number(page.replace("day-", ""));

      if (!Number.isNaN(dayNumber)) {
        setSelectedInsightDay(dayNumber);
      }
    }
  }

  function activateEditSurface() {
    setWorkspaceMode("edit");
    setActiveWorkspaceNav("edit");
    setActiveMobilePage("edit");
    setSidebarNotice(null);
    scrollToWorkspaceEditIfDesktop();
  }

  function handleWorkspaceModeChange(mode: WorkspaceMode) {
    setWorkspaceMode(mode);
    setActiveWorkspaceNav(mode === "edit" ? "edit" : "route");
    setSidebarNotice(null);
  }

  function handleWorkspaceDaySelect(dayNumber: number) {
    setActiveWorkspaceDayNumber(dayNumber);
    setSelectedInsightDay(dayNumber);
    setActiveWorkspaceNav("route");
    setSidebarNotice(null);
    setSelectedSearchCandidate(null);
    setMapActionMessage(undefined);
    setDistanceTargetPointId("");
    setDistanceSummary(null);
    setDistanceError(undefined);
    map.clearMapSelection();
  }

  function handleWorkspaceAddDay() {
    const nextDayNumber = currentTripPlan.dailyItinerary.length + 1;
    const nextTripPlan = persistWorkspaceTripPlan({
      ...currentTripPlan,
      days: nextDayNumber,
      dailyItinerary: [
        ...currentTripPlan.dailyItinerary,
        createWorkspaceEmptyDay(nextDayNumber),
      ],
    });

    setActiveWorkspaceDayNumber(nextDayNumber);
    setSelectedInsightDay(nextDayNumber);
    setWorkspaceMode("edit");
    setActiveWorkspaceNav("edit");
    setSidebarNotice(null);
    setDistanceTargetPointId("");
    setDistanceSummary(null);
    setDistanceError(undefined);
    map.clearMapSelection();

    return nextTripPlan;
  }

  function handleWorkspaceAddPlace(slotId: string) {
    const activeDay = activeWorkspaceCabinet;

    if (!activeDay) {
      return;
    }

    const slotDefinition = activeDay.slots.find((slot) => slot.id === slotId);

    if (!slotDefinition) {
      return;
    }

    const currentCount = activeDay.slots.reduce(
      (total, slot) => total + slot.items.length,
      0,
    );
    const nextPlaceName = `未命名地点 ${currentCount + 1}`;
    const nextTripPlan = persistWorkspaceTripPlan({
      ...currentTripPlan,
      dailyItinerary: currentTripPlan.dailyItinerary.map((day) => {
        if (day.day !== activeDay.dayNumber) {
          return day;
        }

        return updateDayRouteMeta({
          ...day,
          [slotDefinition.key]: [
            ...day[slotDefinition.key],
            createWorkspaceManualPlaceDraft(
              slotDefinition.key,
              nextPlaceName,
              slotDefinition.id,
            ),
          ],
        });
      }),
    });

    const nextActiveDay = nextTripPlan.dailyItinerary.find(
      (day) => day.day === activeDay.dayNumber,
    );

    setActiveWorkspaceDayNumber(activeDay.dayNumber);
    setSelectedInsightDay(activeDay.dayNumber);
    setWorkspaceMode("edit");
    setActiveWorkspaceNav("edit");
    setSidebarNotice(null);
    map.clearMapSelection();

    if (nextActiveDay) {
      window.requestAnimationFrame(() => {
        scrollToSection(`workspace-day-panel-${nextActiveDay.day}`);
      });
    }
  }

  function handleMapSearchResultSelect(candidate: PoiCandidate) {
    setSelectedSearchCandidate(candidate);
    setMapActionMessage(undefined);
    setDistanceError(undefined);
    setDistanceSummary(null);
    setDistanceTargetPointId("");
    map.clearMapSelection();
  }

  async function handleMapSearchSubmit() {
    const keyword = mapSearchKeyword.trim();
    const city = currentTripPlan.destination.trim();

    if (!city) {
      setMapSearchError("还没有明确目的地，暂时不能搜索地点。");
      setMapSearchResults([]);
      setMapSearchWarnings([]);
      return;
    }

    if (!keyword) {
      setMapSearchError("先输入想找的地点。");
      setMapSearchResults([]);
      setMapSearchWarnings([]);
      return;
    }

    setMapSearchLoading(true);
    setMapSearchError(undefined);
    setMapSearchWarnings([]);

    try {
      const response = await fetch("/api/map/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          city,
          keyword,
          limit: 6,
        }),
      });

      const payload = (await response.json()) as
        | { candidates: PoiCandidate[]; warnings?: string[] }
        | { error?: { message?: string } };
      const errorMessage =
        "error" in payload ? payload.error?.message : undefined;

      if (!response.ok || !("candidates" in payload)) {
        throw new Error(errorMessage || "地点搜索暂时不可用。");
      }

      setMapSearchResults(payload.candidates);
      setMapSearchWarnings(payload.warnings ?? []);
      setSelectedSearchCandidate(payload.candidates[0] ?? null);
      setMapActionMessage(undefined);
    } catch (error) {
      setMapSearchResults([]);
      setSelectedSearchCandidate(null);
      setMapSearchWarnings([]);
      setMapSearchError(
        error instanceof Error && error.message.trim()
          ? error.message
          : "地点搜索暂时不可用，请稍后再试。",
      );
    } finally {
      setMapSearchLoading(false);
    }
  }

  function handleMapSearchClear() {
    setMapSearchKeyword("");
    setMapSearchResults([]);
    setMapSearchWarnings([]);
    setMapSearchError(undefined);
    setSelectedSearchCandidate(null);
    setMapActionMessage(undefined);
    setDistanceSummary(null);
    setDistanceError(undefined);
    setDistanceTargetPointId("");
  }

  function handleMapTargetSlotChange(slotId: string) {
    setMapTargetSlotId(slotId);
  }

  function handleMapAddSelectedPlace() {
    if (!selectedSearchCandidate) {
      setMapActionMessage("先从搜索结果里选一个地点。");
      return;
    }

    if (workspaceMode !== "edit") {
      setMapActionMessage("切到编辑模式后，才能把地点加入行程。");
      return;
    }

    const activeDay = activeWorkspaceCabinet;
    const targetSlot =
      activeDay?.slots.find((slot) => slot.id === resolvedMapTargetSlotId) ??
      activeDay?.slots[0];

    if (!activeDay || !targetSlot) {
      setMapActionMessage("当前还没有可用时间段，先添加一天或时间段。");
      return;
    }

    const nextTripPlan = persistWorkspaceTripPlan({
      ...currentTripPlan,
      dailyItinerary: currentTripPlan.dailyItinerary.map((day) => {
        if (day.day !== activeDay.dayNumber) {
          return day;
        }

        const slotLabelMap: Record<TimeSlotKey, string> = {
          morning: "上午",
          afternoon: "下午",
          evening: "晚上",
        };
        const nextItem: ItineraryItem = {
          placeName: selectedSearchCandidate.name,
          type: "other",
          reason: `${slotLabelMap[targetSlot.key]}从地图加入，后续可以继续补备注。`,
          guide: [
            selectedSearchCandidate.address
              ? `参考位置：${selectedSearchCandidate.address}`
              : "这个地点是从地图搜索加入的。",
          ],
          editorId: createEditorId("item"),
          editorSlotId: targetSlot.id,
        };

        return updateDayRouteMeta({
          ...day,
          [targetSlot.key]: [...day[targetSlot.key], nextItem],
        });
      }),
    });

    setPendingSearchCandidate(selectedSearchCandidate);
    setMapActionMessage(`已加入第 ${activeDay.dayNumber} 天的${targetSlot.label}。`);
    setDistanceSummary(null);
    setDistanceError(undefined);
    setDistanceTargetPointId("");
    setWorkspaceMode("edit");
    setActiveWorkspaceNav("edit");
    setSidebarNotice(null);
    map.clearMapSelection();

    const nextActiveDay = nextTripPlan.dailyItinerary.find(
      (day) => day.day === activeDay.dayNumber,
    );

    if (nextActiveDay) {
      window.requestAnimationFrame(() => {
        scrollToSection(`workspace-day-panel-${nextActiveDay.day}`);
      });
    }
  }

  function handleDesktopMapPointSelect(pointId: string) {
    setSelectedSearchCandidate(null);
    setMapActionMessage(undefined);
    setDistanceSummary(null);
    setDistanceError(undefined);
    setDistanceTargetPointId("");
    map.selectMapPoint(pointId);
  }

  async function handleMapDistanceEstimate() {
    const activePoint =
      map.resolvedActiveMapPointId === null
        ? undefined
        : activeInsightPoints.find((point) => point.id === map.resolvedActiveMapPointId);
    const originName = selectedSearchCandidate?.name ?? activePoint?.name;
    const originCoordinates =
      selectedSearchCandidate?.coordinates ?? activePoint?.coordinates;

    if (!originName || !isValidCoordinates(originCoordinates)) {
      setDistanceError("先选一个已定位地点，再查询距离。");
      setDistanceSummary(null);
      return;
    }

    if (!distanceTargetPointId) {
      setDistanceError("再选另一个地点，才能查询距离。");
      setDistanceSummary(null);
      return;
    }

    const targetPoint = activeResolvedPoints.find(
      (point) => point.id === distanceTargetPointId,
    );

    if (!targetPoint || !isValidCoordinates(targetPoint.coordinates)) {
      setDistanceError("另一个地点还没有可用坐标，暂时不能查询。");
      setDistanceSummary(null);
      return;
    }

    setDistanceLoading(true);
    setDistanceError(undefined);

    try {
      const response = await fetch("/api/map/route-estimate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          origin: originCoordinates,
          destination: targetPoint.coordinates,
          mode: "walking",
        }),
      });

      const payload = (await response.json()) as
        | RouteEstimateResult
        | { error?: { message?: string } };
      const errorMessage =
        "error" in payload ? payload.error?.message : undefined;

      if (!response.ok || !("leg" in payload)) {
        throw new Error(errorMessage || "距离查询暂时不可用。");
      }

      setDistanceSummary({
        fromName: originName,
        toName: targetPoint.name,
        distanceText: formatDistanceText(payload.leg.distanceMeters),
        durationText: formatDurationText(payload.leg.durationMinutes),
        summary:
          payload.leg.summary ||
          `两地距离约 ${formatDistanceText(payload.leg.distanceMeters)}，预计 ${formatDurationText(payload.leg.durationMinutes)}。`,
        provider: payload.leg.provider,
      });
    } catch (error) {
      setDistanceSummary(null);
      setDistanceError(
        error instanceof Error && error.message.trim()
          ? error.message
          : "距离查询暂时不可用，请稍后再试。",
      );
    } finally {
      setDistanceLoading(false);
    }
  }

  function handleWorkspaceAddNote(note: string) {
    const activeDay = activeWorkspaceCabinet;

    if (!activeDay || !note.trim()) {
      return;
    }

    persistWorkspaceTripPlan({
      ...currentTripPlan,
      dailyItinerary: currentTripPlan.dailyItinerary.map((day) => {
        if (day.day !== activeDay.dayNumber) {
          return day;
        }

        return {
          ...day,
          dailyTips: [...day.dailyTips, note.trim()],
        };
      }),
    });

    setWorkspaceMode("edit");
    setActiveWorkspaceNav("edit");
    setSidebarNotice(null);
  }

  function handleWorkspaceBlockSelect(block: ItineraryBlockView) {
    setSelectedSearchCandidate(null);
    setMapActionMessage(undefined);
    setDistanceSummary(null);
    setDistanceError(undefined);
    setDistanceTargetPointId("");
    map.selectItineraryBlock(block);
  }

  function handleWorkspaceBlockUpdate(
    block: ItineraryBlockView,
    updates: Pick<ItineraryItem, "placeName" | "reason">,
  ) {
    const nextPlaceName = updates.placeName.trim();
    const nextReason = updates.reason.trim();

    if (!nextPlaceName || !nextReason) {
      return;
    }

    persistWorkspaceTripPlan({
      ...currentTripPlan,
      dailyItinerary: currentTripPlan.dailyItinerary.map((day) => {
        if (day.day !== block.ref.day) {
          return day;
        }

        const blockLocation = findBlockItem(day, block);

        if (!blockLocation) {
          return day;
        }

        return updateDayRouteMeta({
          ...day,
          [blockLocation.slot]: day[blockLocation.slot].map((item, itemIndex) =>
            itemIndex === blockLocation.itemIndex
              ? {
                  ...item,
                  placeName: nextPlaceName,
                  reason: nextReason,
                }
              : item,
          ),
        });
      }),
    });
  }

  function handleWorkspaceBlockDelete(block: ItineraryBlockView) {
    persistWorkspaceTripPlan({
      ...currentTripPlan,
      dailyItinerary: currentTripPlan.dailyItinerary.map((day) => {
        if (day.day !== block.ref.day) {
          return day;
        }

        const blockLocation = findBlockItem(day, block);

        if (!blockLocation) {
          return day;
        }

        return updateDayRouteMeta({
          ...day,
          [blockLocation.slot]: day[blockLocation.slot].filter(
            (_, itemIndex) => itemIndex !== blockLocation.itemIndex,
          ),
        });
      }),
    });

    setWorkspaceMode("edit");
    setActiveWorkspaceNav("edit");
    setSidebarNotice(null);
    map.clearMapSelection();
  }

  function handleWorkspaceBlockMove(
    block: ItineraryBlockView,
    targetDayNumber: number,
    targetSlotId: string,
  ) {
    const targetDay = currentTripPlan.dailyItinerary.find(
      (day) => day.day === targetDayNumber,
    );
    const targetSlotDefinition = targetDay
      ? getSlotDefinitions(targetDay).find((slot) => slot.id === targetSlotId)
      : null;

    if (!targetDay || !targetSlotDefinition) {
      return;
    }

    let movingItem: ItineraryItem | null = null;

    persistWorkspaceTripPlan({
      ...currentTripPlan,
      dailyItinerary: currentTripPlan.dailyItinerary
        .map((day) => {
          if (day.day !== block.ref.day) {
            return day;
          }

          const blockLocation = findBlockItem(day, block);

          if (!blockLocation) {
            return day;
          }

          movingItem = {
            ...blockLocation.item,
            editorSlotId: targetSlotDefinition.id,
          };

          return updateDayRouteMeta({
            ...day,
            [blockLocation.slot]: day[blockLocation.slot].filter(
              (_, itemIndex) => itemIndex !== blockLocation.itemIndex,
            ),
          });
        })
        .map((day) => {
          if (!movingItem || day.day !== targetDayNumber) {
            return day;
          }

          return updateDayRouteMeta({
            ...day,
            [targetSlotDefinition.key]: [...day[targetSlotDefinition.key], movingItem],
          });
        }),
    });

    setActiveWorkspaceDayNumber(targetDayNumber);
    setSelectedInsightDay(targetDayNumber);
    setWorkspaceMode("edit");
    setActiveWorkspaceNav("edit");
    setSidebarNotice(null);
    map.clearMapSelection();
  }

  function handleWorkspaceTimeSlotAdd(dayNumber: number, afterSlotId: string) {
    persistWorkspaceTripPlan({
      ...currentTripPlan,
      dailyItinerary: currentTripPlan.dailyItinerary.map((day) => {
        if (day.day !== dayNumber) {
          return day;
        }

        const currentSlots = getDayTimeSlots(day);
        const currentIndex = currentSlots.findIndex((slot) => slot.id === afterSlotId);
        const baseSlot =
          currentSlots[currentIndex]?.baseSlot ??
          currentSlots[currentSlots.length - 1]?.baseSlot ??
          "afternoon";
        const nextSlot = createTimeSlotDefinition(baseSlot, {
          label: "新增时间段",
          startTime: "",
          endTime: "",
        });

        return {
          ...day,
          timeSlots: [
            ...currentSlots.slice(0, currentIndex + 1),
            nextSlot,
            ...currentSlots.slice(currentIndex + 1),
          ],
        };
      }),
    });
  }

  function handleWorkspaceTimeSlotUpdate(
    dayNumber: number,
    slotId: string,
    updates: Pick<DailyTimeSlot, "label" | "startTime" | "endTime">,
  ) {
    persistWorkspaceTripPlan({
      ...currentTripPlan,
      dailyItinerary: currentTripPlan.dailyItinerary.map((day) => {
        if (day.day !== dayNumber) {
          return day;
        }

        return {
          ...day,
          timeSlots: getDayTimeSlots(day).map((slot) =>
            slot.id === slotId
              ? {
                  ...slot,
                  label: updates.label.trim() || slot.label,
                  startTime: updates.startTime,
                  endTime: updates.endTime,
                }
              : slot,
          ),
        };
      }),
    });
  }

  function handleWorkspaceTimeSlotDelete(dayNumber: number, slotId: string) {
    const targetDay = currentTripPlan.dailyItinerary.find((day) => day.day === dayNumber);
    const normalizedDay = targetDay ? normalizeDayForWorkspace(targetDay) : null;
    const slotHasItems = normalizedDay
      ? (["morning", "afternoon", "evening"] as TimeSlotKey[]).some((baseSlot) =>
          normalizedDay[baseSlot].some((item) => item.editorSlotId === slotId),
        )
      : false;

    if (slotHasItems) {
      return;
    }

    persistWorkspaceTripPlan({
      ...currentTripPlan,
      dailyItinerary: currentTripPlan.dailyItinerary.map((day) => {
        if (day.day !== dayNumber) {
          return day;
        }

        const nextSlots = getDayTimeSlots(day).filter((slot) => slot.id !== slotId);

        return {
          ...day,
          timeSlots: nextSlots.length > 0 ? nextSlots : createDefaultTimeSlots(),
        };
      }),
    });
  }

  function handleRegenerated(response: GenerateTripResponse) {
    const savedTripPlan = applyWorkspaceRegeneratedTrip(response);
    const nextFirstDay = savedTripPlan.dailyItinerary[0]?.day ?? 1;

    setTripEnrichment(null);
    setEnrichmentState("idle");
    setActiveWorkspaceDayNumber(nextFirstDay);
    setActiveWorkspaceNav("route");
    setWorkspaceMode("read");
    setActiveMobilePage("overview");
    setSelectedInsightDay(nextFirstDay);
    modification.resetModificationState();
    map.clearMapSelection();
    setSidebarNotice(null);
  }

  function handleBlockAction(
    actionType: PendingChangeAction,
    block: ItineraryBlockView,
  ) {
    modification.queueBlockAction(actionType, block);
  }

  function handleQuickModification(type: QuickModificationType) {
    modification.applyQuickModification(type);
    activateEditSurface();
  }

  function handleRemovePendingChange(id: string) {
    modification.removePendingChange(id);
  }

  function handleClearPendingChanges() {
    modification.clearPendingChanges();
  }

  function handleWritePendingChangesToDraft() {
    const didWrite = modification.writePendingChangesToDraft();

    if (!didWrite) {
      return;
    }

    activateEditSurface();
  }

  function handleWorkspaceNewTrip() {
    setActiveWorkspaceNav("new-trip");
    setSidebarNotice(null);
    window.location.assign("/create");
  }

  function handleWorkspaceFocusRoute() {
    setWorkspaceMode("read");
    setActiveWorkspaceNav("route");
    setSidebarNotice(null);
    window.requestAnimationFrame(() => {
      scrollToSection("workspace-route-insight");
    });
  }

  function handleWorkspaceTrips() {
    setActiveWorkspaceNav("trips");
    setSidebarNotice(null);
    window.location.assign("/trips");
  }

  function handleWorkspaceFocusEdit() {
    setWorkspaceMode("edit");
    setActiveWorkspaceNav("edit");
    setSidebarNotice(null);
    window.requestAnimationFrame(() => {
      scrollToSection("workspace-editor");
    });
  }

  function handleWorkspaceOpenAiAssist() {
    setWorkspaceMode("edit");
    setActiveWorkspaceNav("edit");
    setSidebarNotice(null);
    window.requestAnimationFrame(() => {
      scrollToSection("workspace-ai-assist");
    });
  }

  function handleWorkspaceFocusExport() {
    setActiveWorkspaceNav("export");
    setSidebarNotice(null);
    window.requestAnimationFrame(() => {
      scrollToSection("workspace-export");
    });
  }

  function handleWorkspacePlaceholder(item: WorkspaceSidebarItemId) {
    setActiveWorkspaceNav(item);
    setSidebarNotice({
      title: "这里还在整理",
      message: "这一块稍后会补齐，先继续看行程和地图。",
    });
  }

  function handleMobileNavSelect(key: string) {
    if (
      key === "overview" ||
      key === "budget" ||
      key === "more" ||
      key === "route" ||
      key === "edit"
    ) {
      goToMobilePage(key);
      return;
    }

    if (key.startsWith("day-")) {
      goToMobilePage(key as MobilePageKey);
    }
  }

  function handleInsightDaySelect(key: string) {
    if (!key.startsWith("day-")) {
      return;
    }

    const dayNumber = Number(key.replace("day-", ""));

    if (Number.isNaN(dayNumber)) {
      return;
    }

    setSelectedInsightDay(dayNumber);
  }

  void createEmptyDay;

  return {
    currentTripPlan,
    workspaceMode,
    workspaceSourceType,
    isBlankWorkspace,
    hasStops,
    tripEnrichment: effectiveTripEnrichment,
    enrichmentState: effectiveEnrichmentState,
    enrichmentError: effectiveEnrichmentError,
    attractions,
    cabinets,
    firstCabinet,
    activeWorkspaceCabinet,
    pendingChanges: modification.pendingChanges,
    pendingChangesCount,
    modificationDraft: modification.modificationDraft,
    externalDraftVersion: modification.externalDraftVersion,
    activeMobilePage,
    activeWorkspaceNav,
    sidebarNotice,
    mobileNavItems,
    activeMobileCabinet,
    insightDayItems,
    effectiveSelectedInsightDay,
    selectedInsight,
    desktopSelectedInsight,
    resolvedActiveMapPointId: map.resolvedActiveMapPointId,
    resolvedActiveItineraryBlockId: map.resolvedActiveItineraryBlockId,
    unmatchedBlockPlaceName: map.unmatchedBlockPlaceName,
    activeResolvedPoints,
    mapSearchKeyword,
    mapSearchResults,
    mapSearchWarnings,
    mapSearchLoading,
    mapSearchError,
    selectedSearchCandidate,
    pendingSearchCandidate: visiblePendingSearchCandidate,
    mapTargetSlotId: resolvedMapTargetSlotId,
    distanceTargetPointId,
    distanceSummary,
    distanceLoading,
    distanceError,
    mapActionMessage,
    setModificationDraft: modification.setModificationDraft,
    setMapSearchKeyword,
    handleRegenerated,
    handleBlockAction,
    handleQuickModification,
    handleRemovePendingChange,
    handleClearPendingChanges,
    handleWritePendingChangesToDraft,
    handleWorkspaceModeChange,
    handleWorkspaceDaySelect,
    handleWorkspaceAddDay,
    handleWorkspaceAddPlace,
    handleWorkspaceAddNote,
    handleDesktopMapPointSelect,
    handleWorkspaceBlockSelect,
    handleWorkspaceBlockUpdate,
    handleWorkspaceBlockDelete,
    handleWorkspaceBlockMove,
    handleWorkspaceTimeSlotAdd,
    handleWorkspaceTimeSlotUpdate,
    handleWorkspaceTimeSlotDelete,
    handleMapSearchSubmit,
    handleMapSearchResultSelect,
    handleMapSearchClear,
    handleMapTargetSlotChange,
    handleMapAddSelectedPlace,
    handleMapDistanceEstimate,
    setDistanceTargetPointId,
    handleWorkspaceNewTrip,
    handleWorkspaceFocusRoute,
    handleWorkspaceTrips,
    handleWorkspaceFocusEdit,
    handleWorkspaceOpenAiAssist,
    handleWorkspaceFocusExport,
    handleWorkspacePlaceholder,
    handleMobileNavSelect,
    handleInsightDaySelect,
  };
}
