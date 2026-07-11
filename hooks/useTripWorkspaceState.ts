import { useEffect, useMemo, useState } from "react";

import type { TripResultEnrichment } from "@/lib/trip/enrichment-types";
import {
  mapTripPlanToCabinets,
  type DayCabinetView,
  type ItineraryBlockView,
} from "@/lib/trip/itinerary-view";
import type {
  BlockActionType,
  QuickModificationType,
} from "@/lib/trip/modification-intents";
import {
  buildDayRouteInsight,
  resolveInsightDayNumber,
} from "@/lib/trip/route-insight";
import type {
  GenerateTripResponse,
  ItineraryItem,
  TripPlan,
  TripRequest,
} from "@/lib/trip/types";

import type { WorkspaceSidebarItemId } from "@/components/workspace/WorkspaceSidebar";

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

function collectAttractions(tripPlan: TripPlan): AttractionEntry[] {
  const seen = new Set<string>();
  const attractions: AttractionEntry[] = [];

  for (const day of tripPlan.dailyItinerary) {
    const items = [...day.morning, ...day.afternoon, ...day.evening];

    for (const item of items) {
      const key = item.placeName.trim().toLocaleLowerCase();

      if (item.type === "attraction" && !seen.has(key)) {
        seen.add(key);
        attractions.push({ attraction: item, day: day.day });
      }
    }
  }

  return attractions;
}

export function useTripWorkspaceState({
  tripPlan,
  tripRequest,
}: UseTripWorkspaceStateOptions) {
  const { currentTripPlan, applyRegeneratedTrip } = useTripSave(tripPlan);
  const [enrichmentState, setEnrichmentState] =
    useState<EnrichmentState>("idle");
  const [tripEnrichment, setTripEnrichment] =
    useState<TripResultEnrichment | null>(null);
  const [enrichmentError, setEnrichmentError] = useState<string>();
  const [activeMobilePage, setActiveMobilePage] =
    useState<MobilePageKey>("overview");
  const [activeWorkspaceDayNumber, setActiveWorkspaceDayNumber] = useState(1);
  const [selectedInsightDay, setSelectedInsightDay] = useState(1);
  const [activeWorkspaceNav, setActiveWorkspaceNav] =
    useState<WorkspaceSidebarItemId>("route");
  const [sidebarNotice, setSidebarNotice] = useState<SidebarNotice>(null);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("read");

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
        label: `Day ${cabinet.dayNumber}`,
      })),
      { key: "budget", label: "预算" },
      { key: "more", label: "更多" },
      { key: "route", label: "路线" },
      {
        key: "edit",
        label: "修改",
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
        label: `Day ${cabinet.dayNumber}`,
      })),
    [cabinets],
  );
  const effectiveSelectedInsightDay = resolveInsightDayNumber(
    currentTripPlan,
    selectedInsightDay,
  );
  const selectedInsight = useMemo(() => {
    if (!tripEnrichment) {
      return undefined;
    }

    return buildDayRouteInsight(
      currentTripPlan,
      tripEnrichment,
      effectiveSelectedInsightDay,
    );
  }, [currentTripPlan, effectiveSelectedInsightDay, tripEnrichment]);
  const desktopSelectedInsight = useMemo(() => {
    if (!tripEnrichment) {
      return undefined;
    }

    return buildDayRouteInsight(
      currentTripPlan,
      tripEnrichment,
      resolvedWorkspaceDayNumber,
    );
  }, [currentTripPlan, resolvedWorkspaceDayNumber, tripEnrichment]);

  const map = useTripMap({
    activeCabinet: activeWorkspaceCabinet,
    insight: desktopSelectedInsight,
  });

  useEffect(() => {
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
        setEnrichmentError("路线洞察暂不可用，行程方案仍可正常参考。");
      }
    }

    void loadEnrichment();

    return () => controller.abort();
  }, [currentTripPlan, tripRequest]);

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
      scrollToSection("result-regenerate");
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
    setActiveWorkspaceNav("route");
    setSidebarNotice(null);
    map.clearMapSelection();
  }

  function handleRegenerated(response: GenerateTripResponse) {
    const savedTripPlan = applyRegeneratedTrip(response);
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
    actionType: BlockActionType,
    block: ItineraryBlockView,
  ) {
    modification.queueBlockAction(actionType, block);
  }

  function handleQuickModification(type: QuickModificationType) {
    modification.applyQuickModification(type);
    activateEditSurface();
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
      scrollToSection("workspace-edit");
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
      title: "后续开放",
      message: "该功能将在后续版本开放。",
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

  function handleWorkspaceBlockSelect(block: ItineraryBlockView) {
    map.selectItineraryBlock(block);
  }

  return {
    currentTripPlan,
    workspaceMode,
    tripEnrichment,
    enrichmentState,
    enrichmentError,
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
    setModificationDraft: modification.setModificationDraft,
    handleRegenerated,
    handleBlockAction,
    handleQuickModification,
    handleRemovePendingChange: modification.removePendingChange,
    handleClearPendingChanges: modification.clearPendingChanges,
    handleWritePendingChangesToDraft,
    handleWorkspaceNewTrip,
    handleWorkspaceFocusRoute,
    handleWorkspaceTrips,
    handleWorkspaceModeChange,
    handleDesktopMapPointSelect: map.selectMapPoint,
    handleWorkspaceBlockSelect,
    handleWorkspaceFocusEdit,
    handleWorkspaceFocusExport,
    handleWorkspacePlaceholder,
    handleMobileNavSelect,
    handleInsightDaySelect,
    handleWorkspaceDaySelect,
  };
}
