"use client";

import { useEffect, useMemo, useState } from "react";

import type { WorkspaceMode } from "@/hooks/useTripWorkspaceState";
import { useMapStudioState } from "@/hooks/useMapStudioState";
import {
  buildChinaOverviewMapProject,
} from "@/lib/map-studio/destination-profiles";
import type { CandidatePlace, MapPlace, MapProject } from "@/lib/map-studio/types";
import { enrichAreaDetail, enrichPlace, getPlaceDetail, planBasicRoute } from "@/src/lib/data-hub/client";
import type { MissingFieldNotice, NormalizedPlaceDetail, NormalizedTravelRegionDetail } from "@/src/server/data-hub/types";
import type { BasicRouteDraft } from "@/src/lib/data-hub/planningTypes";
import type { TripPlan, TripRequest } from "@/lib/trip/types";
import type { TimeSlotKey } from "@/lib/trip/types";

import { MapStudioBottomBar } from "./MapStudioBottomBar";
import { MapStudioCanvas } from "./MapStudioCanvas";
import {
  MapStudioFeedbackPanel,
  type MapStudioFeedbackKey,
} from "./MapStudioFeedbackPanel";
import { MapStudioLeftPanel } from "./MapStudioLeftPanel";
import {
  MapStudioRightDrawer,
  type MapStudioRightDrawerMode,
} from "./MapStudioRightDrawer";
import { MapStudioRightToolbar } from "./MapStudioRightToolbar";
import { MapStudioRouteDraftPanel } from "./MapStudioRouteDraftPanel";
import { MapStudioTopBar } from "./MapStudioTopBar";

interface MapStudioProps {
  tripPlan: TripPlan;
  tripRequest: TripRequest | null;
  mapProject?: MapProject | null;
  requiresDestinationSelection?: boolean;
  onWorkspaceModeChange: (mode: WorkspaceMode) => void;
  workspaceHref?: string;
  onAssignCandidate?: (input: {
    candidate: CandidatePlace;
    dayNumber: number;
    slot: TimeSlotKey;
  }) => { candidate: CandidatePlace } | void;
  onUndoCandidateAssignment?: (input: {
    candidate: CandidatePlace;
    dayNumber: number;
    slot: TimeSlotKey;
  }) => { candidate: CandidatePlace; removed?: boolean } | void;
}

interface MapStudioConsoleProps extends Omit<
  MapStudioProps,
  "mapProject" | "requiresDestinationSelection"
> {
  mapProject: MapProject;
}

export type MapStudioPlaceDetailLoadStatus =
  | "idle"
  | "loading"
  | "partial"
  | "success"
  | "error";

type BasicRouteDraftStatus = "idle" | "loading" | "success" | "error";

export interface MapStudioPlaceDetailState {
  placeId?: string;
  status: MapStudioPlaceDetailLoadStatus;
  error?: string;
  missingFields: MissingFieldNotice[];
}

export interface MapStudioRegionDetailState {
  regionId?: string;
  status: MapStudioPlaceDetailLoadStatus;
  detail?: NormalizedTravelRegionDetail;
  error?: string;
  missingFields: MissingFieldNotice[];
}

export interface MapStudioPlaceDetailClient {
  getPlaceDetail: typeof getPlaceDetail;
  enrichPlace: typeof enrichPlace;
}

export function buildMapStudioEnrichInput(selectedPlace: MapPlace) {
  return {
    name: selectedPlace.name || selectedPlace.displayName,
    lat: selectedPlace.lat,
    lng: selectedPlace.lng,
    address: selectedPlace.planMeta?.address ?? null,
    category: selectedPlace.category,
    destinationId: undefined,
    regionId: selectedPlace.regionId,
    sourceProvider: selectedPlace.sourceProvider ?? selectedPlace.sourceStatus,
    sourceExternalId: selectedPlace.sourceExternalId ?? selectedPlace.dataHubPlaceId,
  };
}

export async function loadMapStudioPlaceDetail(
  selectedPlace: MapPlace,
  client: MapStudioPlaceDetailClient = { getPlaceDetail, enrichPlace },
) {
  if (selectedPlace.dataHubPlaceId) {
    return client.getPlaceDetail(selectedPlace.dataHubPlaceId);
  }

  return client.enrichPlace(buildMapStudioEnrichInput(selectedPlace));
}
function formatOpeningHours(detail: NormalizedPlaceDetail) {
  return detail.openingHours?.weeklyText?.join(" / ") ?? "开放时间暂缺，建议出行前确认";
}

function formatTicketInfo(detail: NormalizedPlaceDetail) {
  return detail.ticketInfo?.priceText ?? "门票信息暂缺，价格可能随时间变化";
}

function formatSuggestedDuration(detail: NormalizedPlaceDetail) {
  return detail.recommendedDurationMinutes
    ? `${detail.recommendedDurationMinutes} 分钟`
    : undefined;
}

function patchPlaceWithDataHubDetail(
  mapProject: MapProject,
  localPlaceId: string,
  detail: NormalizedPlaceDetail,
): MapProject {
  return {
    ...mapProject,
    places: mapProject.places.map((place) => {
      if (place.id !== localPlaceId) {
        return place;
      }

      return {
        ...place,
        dataHubPlaceId: detail.place.id,
        sourceProvider: String(detail.place.source.provider),
        sourceExternalId: detail.place.source.externalId ?? undefined,
        dataHubDetail: detail,
        dataHubSources: detail.sources,
        missingFields: detail.missingFields,
        lastVerifiedAt: detail.lastVerifiedAt,
        confidence: detail.confidence,
        shortDescription: detail.intro ?? place.shortDescription,
        longDescription: detail.intro ?? place.longDescription,
        suggestedDuration: formatSuggestedDuration(detail) ?? place.suggestedDuration,
        openingHours: formatOpeningHours(detail),
        ticketInfo: formatTicketInfo(detail),
        source: {
          label: String(detail.place.source.provider),
          url: detail.place.source.sourceUrl ?? place.source.url,
        },
        sourceStatus: "api",
        dataStatus: "api",
      };
    }),
  };
}

function MapStudioConsole({
  tripPlan,
  tripRequest,
  mapProject,
  onWorkspaceModeChange,
  workspaceHref,
  onAssignCandidate,
  onUndoCandidateAssignment,
}: MapStudioConsoleProps) {
  const [dataHubPlacePatches, setDataHubPlacePatches] = useState<
    Record<string, NormalizedPlaceDetail>
  >({});
  const [placeDetailState, setPlaceDetailState] =
    useState<MapStudioPlaceDetailState>({
      status: "idle",
      missingFields: [],
    });
  const [regionDetailState, setRegionDetailState] =
    useState<MapStudioRegionDetailState>({
      status: "idle",
      missingFields: [],
    });
  const enrichedMapProject = useMemo(
    () =>
      Object.entries(dataHubPlacePatches).reduce(
        (project, [placeId, detail]) =>
          patchPlaceWithDataHubDetail(project, placeId, detail),
        mapProject,
      ),
    [dataHubPlacePatches, mapProject],
  );
  const mapStudio = useMapStudioState({
    mapProject: enrichedMapProject,
    onAssignCandidate,
    onUndoCandidateAssignment,
  });
  const [activeDrawer, setActiveDrawer] =
    useState<MapStudioRightDrawerMode | null>(null);
  const [activeFeedback, setActiveFeedback] =
    useState<MapStudioFeedbackKey | null>(null);
  const [routeDraft, setRouteDraft] = useState<BasicRouteDraft | null>(null);
  const [routeDraftStatus, setRouteDraftStatus] =
    useState<BasicRouteDraftStatus>("idle");
  const [routeDraftError, setRouteDraftError] = useState<string | undefined>();

  async function generateBasicRouteDraft() {
    const candidates = mapStudio.project.candidatePlaces;
    setActiveFeedback(null);
    setActiveDrawer(null);

    if (candidates.length === 0) {
      setRouteDraft(null);
      setRouteDraftStatus("error");
      setRouteDraftError("候选地点不足，先把地点加入候选后再整理路线。");
      return;
    }

    setRouteDraftStatus("loading");
    setRouteDraftError(undefined);

    try {
      const response = await planBasicRoute({
        destinationId: mapProject.projectId ?? null,
        dayCount: Math.max(1, tripPlan.days),
        candidatePlaceIds: candidates.map((candidate) =>
          candidate.dataHubPlaceId ?? candidate.place.dataHubPlaceId ?? candidate.placeId,
        ),
        pace: "balanced",
        transportMode: "walking",
        userPreferences: tripRequest?.interests ?? [],
      });

      if (response.ok && response.draft) {
        setRouteDraft(response.draft);
        setRouteDraftStatus("success");
        return;
      }

      setRouteDraft(null);
      setRouteDraftStatus("error");
      setRouteDraftError(response.error?.message ?? "基础路线规划暂时不可用。");
    } catch {
      setRouteDraft(null);
      setRouteDraftStatus("error");
      setRouteDraftError("基础路线规划暂时不可用。");
    }
  }

  function getSlotForDraftIndex(index: number): TimeSlotKey {
    if (index === 0) return "morning";
    if (index <= 2) return "afternoon";
    return "evening";
  }

  function findCandidateForDraftPlace(placeId: string) {
    return mapStudio.project.candidatePlaces.find((candidate) =>
      candidate.dataHubPlaceId === placeId ||
      candidate.place.dataHubPlaceId === placeId ||
      candidate.placeId === placeId,
    );
  }

  function confirmBasicRouteDraft() {
    if (!routeDraft) return;

    let assignedCount = 0;
    for (const day of routeDraft.days) {
      day.slots.forEach((slot, index) => {
        const candidate = findCandidateForDraftPlace(slot.placeId);
        if (!candidate) return;

        const didAssign = mapStudio.assignCandidateToSlot(
          candidate.id,
          day.dayNumber,
          getSlotForDraftIndex(index),
        );
        if (didAssign) assignedCount += 1;
      });
    }

    if (assignedCount > 0) {
      setRouteDraftStatus("idle");
      setRouteDraft(null);
      setRouteDraftError(undefined);
    } else {
      setRouteDraftStatus("error");
      setRouteDraftError("预览中的地点没有匹配到当前候选，暂时无法写入。");
    }
  }

  function closeBasicRouteDraft() {
    setRouteDraftStatus("idle");
    setRouteDraft(null);
    setRouteDraftError(undefined);
  }
  function toggleRightDrawer(drawer: MapStudioRightDrawerMode) {
    setActiveFeedback(null);
    setActiveDrawer((currentDrawer) =>
      currentDrawer === drawer ? null : drawer,
    );
  }

  function openFeedback(key: MapStudioFeedbackKey) {
    setActiveDrawer(null);
    setActiveFeedback(key);
  }
  useEffect(() => {
    const region = mapStudio.selectedRegion;

    if (!region) {
      setRegionDetailState({ status: "idle", missingFields: [] });
      return;
    }

    const selectedRegion = region;
    let cancelled = false;
    setRegionDetailState({
      regionId: selectedRegion.id,
      status: "loading",
      missingFields: [],
    });

    async function loadRegionDetail() {
      try {
        const response = await enrichAreaDetail({
          targetType: "travel_region",
          travelRegionId: selectedRegion.id,
          name: selectedRegion.displayName || selectedRegion.name,
          intro: selectedRegion.summary,
          playStyle: selectedRegion.bestFor.join(" / ") || null,
          suggestedRoute: null,
          suitableFor: [...selectedRegion.bestFor, ...selectedRegion.tags],
          representativePlaceIds: selectedRegion.representativePlaceIds,
          sourceProvider: "wanderly_curated",
          sourceExternalId: selectedRegion.id,
        });

        if (cancelled) return;

        if (response.ok && response.detail && "travelRegionId" in response.detail) {
          setRegionDetailState({
            regionId: selectedRegion.id,
            status: (response.detail.missingFields?.length ?? 0) > 0 ? "partial" : "success",
            detail: response.detail,
            missingFields: response.detail.missingFields ?? response.missingFields ?? [],
          });
          return;
        }

        setRegionDetailState({
          regionId: selectedRegion.id,
          status: "error",
          error: response.error?.message ?? "区域资料暂时不可用。",
          missingFields: response.missingFields ?? [],
        });
      } catch {
        if (cancelled) return;
        setRegionDetailState({
          regionId: selectedRegion.id,
          status: "error",
          error: "区域资料暂时不可用。",
          missingFields: [],
        });
      }
    }

    void loadRegionDetail();

    return () => {
      cancelled = true;
    };
  }, [mapStudio.selectedRegion]);


  useEffect(() => {
    const place = mapStudio.selectedPlace;

    if (!place) {
      setPlaceDetailState({ status: "idle", missingFields: [] });
      return;
    }

    if (dataHubPlacePatches[place.id]) {
      setPlaceDetailState({
        placeId: place.id,
        status:
          dataHubPlacePatches[place.id].missingFields.length > 0
            ? "partial"
            : "success",
        missingFields: dataHubPlacePatches[place.id].missingFields,
      });
      return;
    }

    const selectedPlace = place;
    let cancelled = false;
    setPlaceDetailState({
      placeId: selectedPlace.id,
      status: "loading",
      missingFields: [],
    });

    async function loadPlaceDetail() {
      try {
        const response = await loadMapStudioPlaceDetail(selectedPlace);

        if (cancelled) return;

        if (response.ok && response.detail) {
          setDataHubPlacePatches((current) => ({
            ...current,
            [selectedPlace.id]: response.detail!,
          }));
          setPlaceDetailState({
            placeId: selectedPlace.id,
            status:
              (response.detail.missingFields?.length ?? 0) > 0 ||
              (response.missingFields?.length ?? 0) > 0
                ? "partial"
                : "success",
            missingFields:
              response.detail.missingFields?.length
                ? response.detail.missingFields
                : response.missingFields ?? [],
          });
          return;
        }

        setPlaceDetailState({
          placeId: selectedPlace.id,
          status: "error",
          error:
            response.error?.message ??
            "地点资料暂时不可用，已保留当前地图里的基础信息。",
          missingFields: response.missingFields ?? [],
        });
      } catch {
        if (cancelled) return;
        setPlaceDetailState({
          placeId: selectedPlace.id,
          status: "error",
          error: "地点资料暂时不可用，已保留当前地图里的基础信息。",
          missingFields: [],
        });
      }
    }

    void loadPlaceDetail();

    return () => {
      cancelled = true;
    };
  }, [dataHubPlacePatches, mapStudio.selectedPlace]);

  return (
    <section
      aria-label="Wanderly Map Studio"
      className="relative hidden min-h-0 flex-1 overflow-hidden bg-[#071012] text-[rgba(255,250,235,0.92)] lg:block"
    >
      <div className="relative h-full min-h-0 w-full overflow-hidden">
        <div className="absolute inset-0 z-0">
          <MapStudioCanvas
            mapProject={mapStudio.project}
            hoveredRegionId={mapStudio.hoveredRegionId}
            selectedPlaceId={mapStudio.selectedPlaceId}
            layerState={mapStudio.layerState}
            onRegionClick={mapStudio.selectRegion}
            onRegionMouseEnter={mapStudio.hoverRegion}
            onRegionMouseLeave={mapStudio.clearHoveredRegion}
            onPlaceClick={mapStudio.selectPlace}
            onZoomChange={mapStudio.setMapZoom}
          />
        </div>

        <MapStudioTopBar
          tripPlan={tripPlan}
          tripRequest={tripRequest}
          mapProject={mapStudio.project}
          activeTool={mapStudio.activeTool}
          onWorkspaceModeChange={onWorkspaceModeChange}
          workspaceHref={workspaceHref}
          onToolSelect={mapStudio.setTool}
          onRouteToggle={mapStudio.toggleRoutes}
          onOpenFeedback={openFeedback}
        />

        {mapStudio.selectedRegion || mapStudio.selectedPlace ? (
          <MapStudioLeftPanel
            mapProject={mapStudio.project}
            tripRequest={tripRequest}
            selectedRegion={mapStudio.selectedRegion}
            hoveredRegion={mapStudio.hoveredRegion}
            selectedPlace={mapStudio.selectedPlace}
            regionDetailState={regionDetailState}
            placeDetailState={placeDetailState}
            visibleRegionPlaces={mapStudio.visibleRegionPlaces}
            onPlaceSelect={mapStudio.selectPlace}
            onAddCandidate={mapStudio.addPlaceToCandidates}
            onClearSelection={mapStudio.clearSelection}
          />
        ) : null}
        <MapStudioRightDrawer
          mode={activeDrawer}
          layerState={mapStudio.layerState}
          layerAvailability={mapStudio.layerAvailability}
          activeCategoryIds={mapStudio.activeCategoryIds}
          onPrimaryViewChange={mapStudio.setPrimaryView}
          onAdminPrecisionChange={mapStudio.setAdminPrecision}
          onToggleExploreLayer={mapStudio.toggleExploreLayer}
          onToggleEnvironmentLayer={mapStudio.toggleEnvironmentLayer}
          onToggleCategory={mapStudio.toggleCategory}
          onClose={() => setActiveDrawer(null)}
        />
        <MapStudioFeedbackPanel
          activeKey={activeFeedback}
          onClose={() => setActiveFeedback(null)}
        />
        <MapStudioBottomBar
          mapProject={mapStudio.project}
          tripPlan={tripPlan}
          selectedPlaceId={mapStudio.selectedPlaceId}
          assignmentCandidateId={mapStudio.assignmentCandidateId}
          assignmentSlot={mapStudio.assignmentSlot}
          assignmentMessage={mapStudio.assignmentMessage}
          canUndoAssignment={mapStudio.canUndoAssignment}
          onAddCandidate={mapStudio.addPlaceToCandidates}
          onCandidateSelect={mapStudio.selectAssignmentCandidate}
          onDaySelect={mapStudio.selectAssignmentDay}
          onSlotSelect={mapStudio.selectAssignmentSlot}
          onConfirmAssignment={mapStudio.confirmCandidateAssignment}
          onUndoAssignment={mapStudio.undoCandidateAssignment}
          onRouteToggle={generateBasicRouteDraft}
          onImportClick={() => openFeedback("import")}
        />
        <MapStudioRouteDraftPanel
          status={routeDraftStatus}
          draft={routeDraft}
          error={routeDraftError}
          onClose={closeBasicRouteDraft}
          onConfirm={confirmBasicRouteDraft}
        />
        <MapStudioRightToolbar
          activeDrawer={activeDrawer}
          activeFeedback={activeFeedback}
          onZoomIn={mapStudio.zoomIn}
          onZoomOut={mapStudio.zoomOut}
          onRecenter={mapStudio.recenterMap}
          onReset={mapStudio.resetMapView}
          onToggleDrawer={toggleRightDrawer}
          onOpenFeedback={openFeedback}
        />
      </div>
    </section>
  );
}

export function MapStudio({
  tripPlan,
  tripRequest,
  mapProject,
  onWorkspaceModeChange,
  workspaceHref,
  onAssignCandidate,
  onUndoCandidateAssignment,
}: MapStudioProps) {
  const resolvedMapProject = useMemo(() => {
    return mapProject ?? buildChinaOverviewMapProject({
      tripPlan,
      tripRequest,
    });
  }, [mapProject, tripPlan, tripRequest]);

  return (
    <MapStudioConsole
      tripPlan={tripPlan}
      tripRequest={tripRequest}
      mapProject={resolvedMapProject}
      onWorkspaceModeChange={onWorkspaceModeChange}
      workspaceHref={workspaceHref}
      onAssignCandidate={onAssignCandidate}
      onUndoCandidateAssignment={onUndoCandidateAssignment}
    />
  );
}













