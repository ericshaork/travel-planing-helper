import { useEffect, useMemo, useState } from "react";

import type { WorkspaceSidebarItemId } from "@/components/workspace/WorkspaceSidebar";
import type { PoiCandidate, Coordinates } from "@/lib/poi/types";
import type { RouteEstimateResult } from "@/lib/route/types";
import type { WorkspacePreferences } from "@/lib/settings/types";
import {
  applyCandidateToTripPlan,
  revertCandidateFromTripPlan,
} from "@/lib/map-studio/trip-adapter";
import type { CandidatePlace } from "@/lib/map-studio/types";
import type { TripResultEnrichment } from "@/lib/trip/enrichment-types";
import {
  mapTripPlanToCabinets,
  type DayCabinetView,
  type ItineraryBlockUpdate,
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
import {
  applyWorkspaceItineraryItemUpdate,
  createWorkspaceEventInputFromPoiCandidate,
  createWorkspaceItineraryItem,
  type WorkspaceCreateEventInput,
} from "@/lib/trip/workspace-events";

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

export type WorkspaceMode = "read" | "edit" | "map";
export type WorkspaceDefaultMode = Extract<WorkspaceMode, "read" | "edit">;
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
  initialWorkspaceModeDefault?: WorkspaceDefaultMode;
}

export function resolveInitialWorkspaceModeDefault(input: {
  sessionModeDefault?: WorkspaceDefaultMode;
  settingsDefaultMode?: WorkspacePreferences["defaultMode"];
}) {
  return input.sessionModeDefault ?? input.settingsDefaultMode ?? "read";
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

  return routeOrder.length > 0 ? routeOrder : ["还没有地点"];
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
    theme: `第 ${dayNumber} 天`,
    routeOrder: ["待补充地点"],
    routeReason: "先把想去的地方放进来，Wanderly 会帮你整理路线。",
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

export function appendWorkspaceDay(tripPlan: TripPlan) {
  const nextDayNumber = tripPlan.dailyItinerary.length + 1;

  return {
    nextDayNumber,
    nextTripPlan: {
      ...tripPlan,
      days: nextDayNumber,
      dailyItinerary: [
        ...tripPlan.dailyItinerary,
        createWorkspaceEmptyDay(nextDayNumber),
      ],
    },
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
    reason: `${slotLabelMap[slot]}先把这一站放进行程，后续可以继续补充路线和提醒。`,
    guide: ["可以在详情里补充备注、时间和交通提醒。"],
    editorId: createEditorId("item"),
    editorSlotId: slotId,
  };
}

export function useTripWorkspaceState({
  tripPlan,
  tripRequest,
  initialWorkspaceModeDefault,
}: UseTripWorkspaceStateOptions) {
  const workspaceSession = useMemo(
    () =>
      ensureWorkspaceSessionMetadata(
        {
          sourceType: "ai_generated",
          workspaceModeDefault: initialWorkspaceModeDefault ?? "read",
        },
      ),
    [initialWorkspaceModeDefault],
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
    return resolveInitialWorkspaceModeDefault({
      sessionModeDefault: workspaceSession?.workspaceModeDefault,
      settingsDefaultMode: initialWorkspaceModeDefault,
    });
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
        label: "调整",
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
        setEnrichmentError("暂时无法加载地图补充信息。");
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
    if (mode === "map") {
      setActiveMobilePage("route");
    }
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
    const { nextDayNumber, nextTripPlan: appendedTripPlan } =
      appendWorkspaceDay(currentTripPlan);
    const nextTripPlan = persistWorkspaceTripPlan(appendedTripPlan);

    setActiveWorkspaceDayNumber(nextDayNumber);
    setSelectedInsightDay(nextDayNumber);
    setWorkspaceMode("edit");
    setActiveWorkspaceNav("edit");
    setActiveMobilePage(`day-${nextDayNumber}`);
    setSidebarNotice(null);
    setSelectedSearchCandidate(null);
    setPendingSearchCandidate(null);
    setMapTargetSlotId(null);
    setMapActionMessage(undefined);
    setDistanceTargetPointId("");
    setDistanceSummary(null);
    setDistanceError(undefined);
    map.clearMapSelection();

    return nextTripPlan;
  }

  function handleMapStudioCandidateAssign(input: {
    candidate: CandidatePlace;
    dayNumber: number;
    slot: TimeSlotKey;
  }) {
    const result = applyCandidateToTripPlan({
      tripPlan: currentTripPlan,
      candidate: input.candidate,
      dayNumber: input.dayNumber,
      slot: input.slot,
    });
    const nextTripPlan = persistWorkspaceTripPlan(result.tripPlan);

    setActiveWorkspaceDayNumber(input.dayNumber);
    setSelectedInsightDay(input.dayNumber);
    setActiveWorkspaceNav("route");
    setActiveMobilePage(`day-${input.dayNumber}`);
    setSidebarNotice({
      title: "已写入行程",
      message: `${result.item.placeName} 已加入 Day ${input.dayNumber} 的${result.item.timeLabel ?? "时段"}。`,
    });
    setMapActionMessage(
      `${result.item.placeName} 已加入 Day ${input.dayNumber} 的${result.item.timeLabel ?? "时段"}。`,
    );
    map.clearMapSelection();

    return {
      ...result,
      tripPlan: nextTripPlan,
    };
  }

  function handleMapStudioCandidateUndo(input: {
    candidate: CandidatePlace;
    dayNumber: number;
    slot: TimeSlotKey;
  }) {
    const result = revertCandidateFromTripPlan({
      tripPlan: currentTripPlan,
      candidate: input.candidate,
      dayNumber: input.dayNumber,
      slot: input.slot,
    });

    if (!result.removed) {
      return {
        ...result,
        tripPlan: currentTripPlan,
      };
    }

    const nextTripPlan = persistWorkspaceTripPlan(result.tripPlan);

    setActiveWorkspaceDayNumber(input.dayNumber);
    setSelectedInsightDay(input.dayNumber);
    setActiveWorkspaceNav("route");
    setWorkspaceMode("map");
    setSidebarNotice(null);
    setMapActionMessage(
      `${input.candidate.place.displayName} 已从 Day ${input.dayNumber} 撤销。`,
    );
    map.clearMapSelection();

    return {
      ...result,
      tripPlan: nextTripPlan,
    };
  }

  function handleWorkspaceAddPlace(
    slotId: string,
    input?: WorkspaceCreateEventInput,
  ) {
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
    const nextPlaceName = "待补充地点 " + String(currentCount + 1);
    const fallbackTimeLabel =
      slotDefinition.startTime || slotDefinition.endTime
        ? (slotDefinition.startTime || "--:--") +
          "-" +
          (slotDefinition.endTime || "--:--")
        : slotDefinition.label;
    const nextManualItem = input
      ? createWorkspaceItineraryItem({
          event: input,
          editorId: createEditorId("item"),
          editorSlotId: slotDefinition.id,
          fallbackTimeLabel,
        })
      : null;

    if (input && !nextManualItem) {
      return;
    }

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
            nextManualItem ??
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
    setPendingSearchCandidate(input?.sourceCandidate ?? null);
    map.clearMapSelection();

    if (nextActiveDay) {
      window.requestAnimationFrame(() => {
        scrollToSection("workspace-day-panel-" + String(nextActiveDay.day));
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
      setMapSearchError("请先确认目的地城市。");
      setMapSearchResults([]);
      setMapSearchWarnings([]);
      return;
    }

    if (!keyword) {
      setMapSearchError("请输入要搜索的地点。");
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
        throw new Error(errorMessage || "暂时没有搜到合适的地点。");
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
          : "地点搜索失败，请稍后再试。",
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
      setMapActionMessage("请先选择一个地点。");
      return;
    }

    if (workspaceMode !== "edit") {
      setMapActionMessage("请先切换到编辑模式，再加入行程。");
      return;
    }

    const activeDay = activeWorkspaceCabinet;
    const targetSlot =
      activeDay?.slots.find((slot) => slot.id === resolvedMapTargetSlotId) ??
      activeDay?.slots[0];

    if (!activeDay || !targetSlot) {
      setMapActionMessage("请先选择要加入的日期和时间段。");
      return;
    }

    const nextTripPlan = persistWorkspaceTripPlan({
      ...currentTripPlan,
      dailyItinerary: currentTripPlan.dailyItinerary.map((day) => {
        if (day.day !== activeDay.dayNumber) {
          return day;
        }

        const nextItem = createWorkspaceItineraryItem({
          event: createWorkspaceEventInputFromPoiCandidate({
            candidate: selectedSearchCandidate,
            timeLabel:
              targetSlot.startTime || targetSlot.endTime
                ? (targetSlot.startTime || "--:--") +
                  "-" +
                  (targetSlot.endTime || "--:--")
                : targetSlot.label,
            type: "other",
          }),
          editorId: createEditorId("item"),
          editorSlotId: targetSlot.id,
        });

        if (!nextItem) {
          return day;
        }
        return updateDayRouteMeta({
          ...day,
          [targetSlot.key]: [...day[targetSlot.key], nextItem],
        });
      }),
    });

    setPendingSearchCandidate(selectedSearchCandidate);
    setMapActionMessage(
      selectedSearchCandidate.name +
        " 已加入第 " +
        String(activeDay.dayNumber) +
        " 天 " +
        targetSlot.label,
    );
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
        scrollToSection("workspace-day-panel-" + String(nextActiveDay.day));
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
      setDistanceError("请选择一个带坐标的地点。");
      setDistanceSummary(null);
      return;
    }

    if (!distanceTargetPointId) {
      setDistanceError("请选择要比较距离的目标地点。");
      setDistanceSummary(null);
      return;
    }

    const targetPoint = activeResolvedPoints.find(
      (point) => point.id === distanceTargetPointId,
    );

    if (!targetPoint || !isValidCoordinates(targetPoint.coordinates)) {
      setDistanceError("目标地点缺少坐标，暂时不能估算距离。");
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
        throw new Error(errorMessage || "暂时无法估算路线距离。");
      }

      setDistanceSummary({
        fromName: originName,
        toName: targetPoint.name,
        distanceText: formatDistanceText(payload.leg.distanceMeters),
        durationText: formatDurationText(payload.leg.durationMinutes),
        summary:
          payload.leg.summary ||
          "预计 " +
            formatDistanceText(payload.leg.distanceMeters) +
            "，步行约 " +
            formatDurationText(payload.leg.durationMinutes),
        provider: payload.leg.provider,
      });
    } catch (error) {
      setDistanceSummary(null);
      setDistanceError(
        error instanceof Error && error.message.trim()
          ? error.message
          : "暂时无法估算路线距离。",
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

  function handleWorkspaceBlockSelectionClear() {
    map.clearMapSelection();
    setSelectedSearchCandidate(null);
    setMapActionMessage(undefined);
    setDistanceSummary(null);
    setDistanceError(undefined);
    setDistanceTargetPointId("");
  }

  function handleWorkspaceBlockUpdate(
    block: ItineraryBlockView,
    updates: ItineraryBlockUpdate,
  ) {
    const candidateUpdate = applyWorkspaceItineraryItemUpdate(block.item, updates);

    if (!candidateUpdate) {
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
              ? applyWorkspaceItineraryItemUpdate(item, updates) ?? item
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
          label: "自定义时间段",
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

  function handleWorkspaceTimeSlotsChange(
    dayNumber: number,
    timeSlots: DailyTimeSlot[],
  ) {
    if (timeSlots.length === 0) {
      return;
    }

    persistWorkspaceTripPlan({
      ...currentTripPlan,
      dailyItinerary: currentTripPlan.dailyItinerary.map((day) => {
        if (day.day !== dayNumber) {
          return day;
        }

        return {
          ...day,
          timeSlots: timeSlots.map((slot) => ({ ...slot })),
        };
      }),
    });

    setWorkspaceMode("edit");
    setActiveWorkspaceNav("edit");
    setSidebarNotice(null);
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
      title: "这个功能还在整理中",
      message: "先把地点放进旅行柜，后续会继续补上更完整的编辑工具。",
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
    handleMapStudioCandidateAssign,
    handleMapStudioCandidateUndo,
    handleWorkspaceAddNote,
    handleDesktopMapPointSelect,
    handleWorkspaceBlockSelect,
    handleWorkspaceBlockSelectionClear,
    handleWorkspaceBlockUpdate,
    handleWorkspaceBlockDelete,
    handleWorkspaceBlockMove,
    handleWorkspaceTimeSlotAdd,
    handleWorkspaceTimeSlotUpdate,
    handleWorkspaceTimeSlotDelete,
    handleWorkspaceTimeSlotsChange,
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
