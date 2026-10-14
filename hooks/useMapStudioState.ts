"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type {
  CandidatePlace,
  MapCoordinate,
  MapPlace,
  MapPlaceCategory,
  MapProject,
  MapRegion,
  MapStudioTool,
} from "@/lib/map-studio/types";
import {
  createDefaultMapLayerAvailability,
  createDefaultMapLayerState,
  type AdminPrecision,
  type MapEnvironmentLayerKey,
  type MapExploreLayerKey,
  type MapLayerAvailability,
  type MapLayerState,
  type MapPrimaryView,
} from "@/lib/map-studio/layer-state";
import { createCandidateFromPlace } from "@/lib/map-studio/trip-adapter";
import type { TimeSlotKey } from "@/lib/trip/types";

interface UseMapStudioStateOptions {
  mapProject: MapProject;
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

export interface MapStudioController {
  project: MapProject;
  selectedRegionId?: string;
  hoveredRegionId?: string;
  selectedPlaceId?: string;
  activeLayerIds: string[];
  layerState: MapLayerState;
  layerAvailability: MapLayerAvailability;
  activeCategoryIds: MapPlaceCategory[];
  activeTool: MapStudioTool;
  activeDayId?: string;
  assignmentCandidateId?: string;
  assignmentSlot: TimeSlotKey;
  assignmentMessage?: string;
  canUndoAssignment: boolean;
  mapZoom: number;
  mapCenter: MapCoordinate;
  selectedRegion?: MapRegion;
  hoveredRegion?: MapRegion;
  selectedPlace?: MapPlace;
  visibleRegionPlaces: MapProject["places"];
  selectRegion: (regionId: string) => void;
  hoverRegion: (regionId: string) => void;
  clearHoveredRegion: () => void;
  selectPlace: (placeId: string) => void;
  toggleLayer: (layerId: string) => void;
  setPrimaryView: (view: MapPrimaryView) => void;
  setAdminPrecision: (precision: AdminPrecision) => void;
  toggleExploreLayer: (layer: MapExploreLayerKey) => void;
  toggleEnvironmentLayer: (layer: MapEnvironmentLayerKey) => void;
  toggleCategory: (category: MapPlaceCategory) => void;
  setTool: (tool: MapStudioTool) => void;
  toggleRoutes: () => void;
  toggleFoodCategory: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setMapZoom: (zoom: number) => void;
  recenterMap: () => void;
  addPlaceToCandidates: (placeId: string) => void;
  selectAssignmentCandidate: (candidateId: string) => void;
  selectAssignmentDay: (dayId: string) => void;
  selectAssignmentSlot: (slot: TimeSlotKey) => void;
  confirmCandidateAssignment: () => void;
  assignCandidateToSlot: (candidateId: string, dayNumber: number, slot: TimeSlotKey) => boolean;
  undoCandidateAssignment: () => void;
  clearSelection: () => void;
  resetMapView: () => void;
}

const DEFAULT_CATEGORY_FILTERS: MapPlaceCategory[] = [
  "attraction",
  "neighborhood",
  "museum",
  "nature",
  "food",
  "shopping",
  "experience",
];

function getInitialSelectedRegionId(mapProject: MapProject) {
  return mapProject.selectedRegionId;
}

function clampZoom(zoom: number) {
  return Math.min(18, Math.max(3, zoom));
}

function resolveRegionFocusZoom(region: MapRegion) {
  if (region.regionType === "scenic_zone") {
    return 12;
  }

  return 13;
}

function findLayerIdByType(mapProject: MapProject, layerType: string) {
  return mapProject.layers.find((layer) => layer.type === layerType)?.id;
}

function setLayerTypesVisible(input: {
  mapProject: MapProject;
  currentLayerIds: string[];
  visibleTypes?: string[];
  hiddenTypes?: string[];
}) {
  const visibleTypes = new Set(input.visibleTypes ?? []);
  const hiddenTypes = new Set(input.hiddenTypes ?? []);
  const nextLayerIds = new Set(input.currentLayerIds);

  input.mapProject.layers.forEach((layer) => {
    if (visibleTypes.has(layer.type)) {
      nextLayerIds.add(layer.id);
      return;
    }

    if (hiddenTypes.has(layer.type)) {
      nextLayerIds.delete(layer.id);
    }
  });

  return [...nextLayerIds];
}

function resolveLayerAvailability(mapProject: MapProject): MapLayerAvailability {
  const availability = createDefaultMapLayerAvailability();

  availability.explore.food = mapProject.places.some(
    (place) => place.category === "food",
  );
  availability.explore.transportHubs = mapProject.places.some(
    (place) => place.category === "transport",
  );

  return availability;
}

function getVisiblePlaceLayerTypes(layerState: MapLayerState) {
  const visibleTypes: string[] = [];
  const hiddenTypes: string[] = [];
  const hasRecommendedPlaceGroup =
    layerState.explore.recommendedPlaces &&
    (layerState.explore.attractions ||
      layerState.explore.food ||
      layerState.explore.hotels ||
      layerState.explore.transportHubs);

  if (hasRecommendedPlaceGroup) {
    visibleTypes.push("places");
  } else {
    hiddenTypes.push("places");
  }

  if (layerState.explore.candidatePlaces) {
    visibleTypes.push("candidates");
  } else {
    hiddenTypes.push("candidates");
  }

  if (layerState.explore.plannedPlaces) {
    visibleTypes.push("plan_places");
  } else {
    hiddenTypes.push("plan_places");
  }

  return { visibleTypes, hiddenTypes };
}

export function buildMapStudioViewProject(input: {
  mapProject: MapProject;
  selectedRegionId?: string;
  hoveredRegionId?: string;
  selectedPlaceId?: string;
  activeLayerIds: string[];
  activeCategoryIds: MapPlaceCategory[];
  candidatePlaces: CandidatePlace[];
  activeTool: MapStudioTool;
  activeDayId?: string;
  mapZoom: number;
  mapCenter: MapCoordinate;
}): MapProject {
  const {
    mapProject,
    selectedRegionId,
    hoveredRegionId,
    selectedPlaceId,
    activeLayerIds,
    activeCategoryIds,
    candidatePlaces,
    activeTool,
    activeDayId,
    mapZoom,
    mapCenter,
  } = input;
  const hasFocus = Boolean(selectedRegionId || hoveredRegionId);

  return {
    ...mapProject,
    selectedRegionId,
    selectedPlaceId,
    activeDayId,
    candidatePlaceIds: candidatePlaces.map((candidate) => candidate.placeId),
    candidatePlaces,
    mapMode: {
      ...mapProject.mapMode,
      activeTool,
      center: mapCenter,
      zoomLevel: mapZoom,
    },
    layers: mapProject.layers.map((layer) => ({
      ...layer,
      isVisible: activeLayerIds.includes(layer.id),
    })),
    regions: mapProject.regions.map((region) => {
      const isSelected = region.id === selectedRegionId;
      const isHovered = region.id === hoveredRegionId;

      return {
        ...region,
        state: {
          ...region.state,
          isHovered,
          isSelected,
          isHighlighted: isSelected || isHovered,
          isVisible: region.state.isVisible,
        },
        fillColor:
          hasFocus && !isSelected && !isHovered
            ? "rgba(67, 85, 81, 0.28)"
            : region.fillColor,
      };
    }),
    places: mapProject.places.map((place) => {
      const inSelectedRegion = place.regionId === selectedRegionId;
      const inHoveredRegion = place.regionId === hoveredRegionId;
      const passesCategory = activeCategoryIds.includes(place.category);
      const isSelected = place.id === selectedPlaceId;
      const isCandidate = candidatePlaces.some(
        (candidate) => candidate.placeId === place.id,
      );
      const isVisible = selectedRegionId
        ? inSelectedRegion || inHoveredRegion
        : hoveredRegionId
          ? inHoveredRegion
          : true;
      const isHighlighted =
        isSelected || isCandidate || inSelectedRegion || inHoveredRegion;

      return {
        ...place,
        isCandidate,
        sourceType: isCandidate ? "candidate" : place.sourceType,
        ui: {
          ...place.ui,
          isVisible: isVisible && passesCategory,
          isSelected,
          isHighlighted,
        },
      };
    }),
  };
}

export function useMapStudioState({
  mapProject,
  onAssignCandidate,
  onUndoCandidateAssignment,
}: UseMapStudioStateOptions): MapStudioController {
  const previousProjectIdRef = useRef(mapProject.id);
  const [selectedRegionId, setSelectedRegionId] = useState<string | undefined>(
    () => getInitialSelectedRegionId(mapProject),
  );
  const [hoveredRegionId, setHoveredRegionId] = useState<string | undefined>();
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | undefined>(
    mapProject.selectedPlaceId,
  );
  const [activeLayerIdList, setActiveLayerIdList] = useState<string[]>(() =>
    mapProject.layers
      .filter((layer) => layer.isVisible)
      .map((layer) => layer.id),
  );
  const [layerState, setLayerState] = useState<MapLayerState>(() =>
    createDefaultMapLayerState(),
  );
  const [activeCategoryIds, setActiveCategoryIds] = useState<MapPlaceCategory[]>(
    DEFAULT_CATEGORY_FILTERS,
  );
  const [candidatePlaces, setCandidatePlaces] = useState<CandidatePlace[]>(
    mapProject.candidatePlaces,
  );
  const [activeTool, setActiveTool] = useState<MapStudioTool>(
    mapProject.mapMode.activeTool,
  );
  const [activeDayId, setActiveDayId] = useState<string | undefined>(
    mapProject.activeDayId,
  );
  const [assignmentCandidateId, setAssignmentCandidateId] = useState<
    string | undefined
  >();
  const [assignmentSlot, setAssignmentSlot] = useState<TimeSlotKey>("afternoon");
  const [assignmentMessage, setAssignmentMessage] = useState<string | undefined>();
  const [assignmentHistory, setAssignmentHistory] = useState<
    Array<{
      candidate: CandidatePlace;
      dayNumber: number;
      slot: TimeSlotKey;
    }>
  >([]);
  const [mapZoom, setMapZoom] = useState(mapProject.mapMode.zoomLevel);
  const [mapCenter, setMapCenter] = useState<MapCoordinate>(
    mapProject.mapMode.center,
  );

  useEffect(() => {
    if (previousProjectIdRef.current === mapProject.id) {
      return;
    }

    previousProjectIdRef.current = mapProject.id;
    setSelectedRegionId(getInitialSelectedRegionId(mapProject));
    setHoveredRegionId(undefined);
    setSelectedPlaceId(mapProject.selectedPlaceId);
    setActiveLayerIdList(
      mapProject.layers
        .filter((layer) => layer.isVisible)
        .map((layer) => layer.id),
    );
    setLayerState(createDefaultMapLayerState());
    setCandidatePlaces(mapProject.candidatePlaces);
    setActiveTool(mapProject.mapMode.activeTool);
    setActiveDayId(mapProject.activeDayId);
    setAssignmentCandidateId(undefined);
    setAssignmentMessage(undefined);
    setAssignmentHistory([]);
    setMapZoom(mapProject.mapMode.zoomLevel);
    setMapCenter(mapProject.mapMode.center);
  }, [mapProject]);

  const project = useMemo(
    () =>
      buildMapStudioViewProject({
        mapProject,
        selectedRegionId,
        hoveredRegionId,
        selectedPlaceId,
        activeLayerIds: activeLayerIdList,
        activeCategoryIds,
        candidatePlaces,
        activeTool,
        activeDayId,
        mapZoom,
        mapCenter,
      }),
    [
      activeDayId,
      activeCategoryIds,
      activeLayerIdList,
      activeTool,
      candidatePlaces,
      hoveredRegionId,
      mapCenter,
      mapProject,
      mapZoom,
      selectedPlaceId,
      selectedRegionId,
    ],
  );

  const selectedRegion = project.regions.find(
    (region) => region.id === selectedRegionId,
  );
  const hoveredRegion = project.regions.find(
    (region) => region.id === hoveredRegionId,
  );
  const selectedPlace = project.places.find((place) => place.id === selectedPlaceId);
  const layerAvailability = useMemo(
    () => resolveLayerAvailability(project),
    [project],
  );
  const activeRegionId = selectedRegionId ?? hoveredRegionId;
  const visibleRegionPlaces = activeRegionId
    ? project.places.filter(
        (place) => place.regionId === activeRegionId && place.ui.isVisible,
      )
    : project.places.filter((place) => place.ui.isVisible);

  function selectRegion(regionId: string) {
    const region = mapProject.regions.find((candidate) => candidate.id === regionId);

    if (!region || region.regionType === "administrative") {
      return;
    }

    setSelectedRegionId(regionId);
    setSelectedPlaceId(undefined);
    setMapCenter(region.fallbackCenter);
    setMapZoom((currentZoom) =>
      Math.max(currentZoom, resolveRegionFocusZoom(region)),
    );
  }

  function hoverRegion(regionId: string) {
    setHoveredRegionId(regionId);
  }

  function clearHoveredRegion() {
    setHoveredRegionId(undefined);
  }

  function selectPlace(placeId: string) {
    const place = mapProject.places.find((candidate) => candidate.id === placeId);

    if (!place) {
      return;
    }

    setSelectedPlaceId(placeId);
    setSelectedRegionId(place.regionId);
  }

  function toggleLayer(layerId: string) {
    setActiveLayerIdList((current) =>
      current.includes(layerId)
        ? current.filter((id) => id !== layerId)
        : [...current, layerId],
    );
    setActiveTool("layer");
  }

  function setPrimaryView(view: MapPrimaryView) {
    setLayerState({
      ...layerState,
      primaryView: view,
    });
    setActiveLayerIdList((current) => {
      if (view === "admin") {
        return setLayerTypesVisible({
          mapProject,
          currentLayerIds: current,
          visibleTypes: ["districts", "labels"],
          hiddenTypes: ["regions", "hotspots"],
        });
      }

      if (view === "travel_region") {
        return setLayerTypesVisible({
          mapProject,
          currentLayerIds: current,
          visibleTypes: ["regions", "hotspots", "labels"],
          hiddenTypes: ["districts"],
        });
      }

      return setLayerTypesVisible({
        mapProject,
        currentLayerIds: current,
        visibleTypes: ["labels"],
        hiddenTypes: ["districts", "regions", "hotspots"],
      });
    });
    setActiveTool("layer");
  }

  function setAdminPrecision(precision: AdminPrecision) {
    setLayerState({
      ...layerState,
      adminPrecision: precision,
    });
    setActiveTool("layer");
  }

  function toggleExploreLayer(layer: MapExploreLayerKey) {
    const next: MapLayerState = {
      ...layerState,
      explore: {
        ...layerState.explore,
        [layer]: !layerState.explore[layer],
      },
    };
    const { visibleTypes, hiddenTypes } = getVisiblePlaceLayerTypes(next);

    setLayerState(next);
    setActiveLayerIdList((currentLayerIds) =>
      setLayerTypesVisible({
        mapProject,
        currentLayerIds,
        visibleTypes,
        hiddenTypes,
      }),
    );
    setActiveTool("layer");
  }

  function toggleEnvironmentLayer(layer: MapEnvironmentLayerKey) {
    setLayerState({
      ...layerState,
      environment: {
        ...layerState.environment,
        [layer]: !layerState.environment[layer],
      },
    });
    setActiveTool("layer");
  }

  function toggleCategory(category: MapPlaceCategory) {
    setActiveCategoryIds((current) =>
      current.includes(category)
        ? current.filter((id) => id !== category)
        : [...current, category],
    );
    setActiveTool("filter");
  }

  function setTool(tool: MapStudioTool) {
    setActiveTool(tool);
    setAssignmentMessage(undefined);
  }

  function toggleRoutes() {
    const routeLayerId = findLayerIdByType(mapProject, "routes");

    if (routeLayerId) {
      toggleLayer(routeLayerId);
    }

    setActiveTool("route");
    setAssignmentMessage("路线图层已切换。");
  }

  function toggleFoodCategory() {
    setActiveCategoryIds((current) =>
      current.includes("food")
        ? current.filter((category) => category !== "food")
        : [...current, "food"],
    );
    setActiveTool("filter");
    setAssignmentMessage("餐饮筛选已切换。");
  }

  function zoomIn() {
    setMapZoom((currentZoom) => clampZoom(currentZoom + 1));
    setAssignmentMessage("地图已放大。");
  }

  function zoomOut() {
    setMapZoom((currentZoom) => clampZoom(currentZoom - 1));
    setAssignmentMessage("地图已缩小。");
  }

  function setMapZoomFromMap(zoom: number) {
    setMapZoom((currentZoom) => {
      const nextZoom = clampZoom(zoom);

      return Object.is(currentZoom, nextZoom) ? currentZoom : nextZoom;
    });
  }

  function recenterMap() {
    setSelectedRegionId(undefined);
    setHoveredRegionId(undefined);
    setSelectedPlaceId(undefined);
    setMapCenter(mapProject.mapMode.center);
    setMapZoom(mapProject.mapMode.zoomLevel);
    setAssignmentMessage("已回到目标城市视图。");
  }

  function addPlaceToCandidates(placeId: string) {
    const place = project.places.find((candidate) => candidate.id === placeId);

    if (!place || place.sourceType === "plan") {
      return;
    }

    setCandidatePlaces((current) => {
      if (current.some((candidate) => candidate.placeId === placeId)) {
        return current;
      }

      return [...current, createCandidateFromPlace(place)];
    });
    setSelectedPlaceId(placeId);
    setAssignmentCandidateId(`candidate-${placeId}`);
    setAssignmentMessage(undefined);
    setActiveTool("candidate");
  }

  function selectAssignmentCandidate(candidateId: string) {
    setAssignmentCandidateId(candidateId);
    setAssignmentMessage(undefined);
  }

  function selectAssignmentDay(dayId: string) {
    setActiveDayId(dayId);
    setAssignmentMessage(undefined);
  }

  function selectAssignmentSlot(slot: TimeSlotKey) {
    setAssignmentSlot(slot);
    setAssignmentMessage(undefined);
  }

  function assignCandidateToSlot(candidateId: string, dayNumber: number, slot: TimeSlotKey) {
    const candidate = candidatePlaces.find((item) => item.id === candidateId);

    if (!candidate || !Number.isFinite(dayNumber)) {
      setAssignmentMessage("先选一个候选地点和目标 Day。");
      return false;
    }

    const result = onAssignCandidate?.({
      candidate,
      dayNumber,
      slot,
    });
    const assignedCandidate = result?.candidate ?? {
      ...candidate,
      targetDayId: String(dayNumber),
      targetSlot: slot,
      status: "assigned" as const,
      updatedAt: new Date().toISOString(),
      place: {
        ...candidate.place,
        isCandidate: true,
        assignedDayId: String(dayNumber),
      },
    };

    setCandidatePlaces((current) =>
      current.map((item) =>
        item.id === candidate.id ? assignedCandidate : item,
      ),
    );
    setAssignmentHistory((current) => [
      ...current,
      {
        candidate: assignedCandidate,
        dayNumber,
        slot,
      },
    ]);
    setAssignmentCandidateId(candidate.id);
    setSelectedPlaceId(candidate.placeId);
    setSelectedRegionId(candidate.regionId);
    setActiveTool("candidate");
    setAssignmentMessage(
      `${candidate.place.displayName} 已写入 Day ${dayNumber} 的${slotLabel(slot)}。`,
    );
    return true;
  }

  function confirmCandidateAssignment() {
    const candidate =
      candidatePlaces.find((item) => item.id === assignmentCandidateId) ??
      candidatePlaces[0];
    const dayNumber = Number(activeDayId);

    if (!candidate) {
      setAssignmentMessage("先选一个候选地点和目标 Day。");
      return;
    }

    assignCandidateToSlot(candidate.id, dayNumber, assignmentSlot);
  }

  function undoCandidateAssignment() {
    const latestAssignment = assignmentHistory[assignmentHistory.length - 1];

    if (!latestAssignment) {
      setAssignmentMessage("没有可撤销的写回。");
      return;
    }

    const result = onUndoCandidateAssignment?.(latestAssignment);

    if (result?.removed === false) {
      setAssignmentMessage("没有找到可撤销的行程项。");
      return;
    }

    const revertedCandidate = result?.candidate ?? {
      ...latestAssignment.candidate,
      targetDayId: undefined,
      targetSlot: undefined,
      status: "candidate" as const,
      updatedAt: new Date().toISOString(),
      place: {
        ...latestAssignment.candidate.place,
        assignedDayId: undefined,
        isCandidate: true,
      },
    };

    setCandidatePlaces((current) =>
      current.map((item) =>
        item.id === latestAssignment.candidate.id ? revertedCandidate : item,
      ),
    );
    setAssignmentHistory((current) => current.slice(0, -1));
    setAssignmentCandidateId(revertedCandidate.id);
    setSelectedPlaceId(revertedCandidate.placeId);
    setSelectedRegionId(revertedCandidate.regionId);
    setAssignmentSlot(latestAssignment.slot);
    setAssignmentMessage(
      `${revertedCandidate.place.displayName} 已从 Day ${latestAssignment.dayNumber} 撤销。`,
    );
  }

  function clearSelection() {
    setSelectedRegionId(undefined);
    setHoveredRegionId(undefined);
    setSelectedPlaceId(undefined);
    setAssignmentMessage("选择已清空。");
  }

  function resetMapView() {
    clearSelection();
    setActiveTool("region");
    setActiveLayerIdList(
      mapProject.layers
        .filter((layer) => layer.isVisible)
        .map((layer) => layer.id),
    );
    setActiveCategoryIds(DEFAULT_CATEGORY_FILTERS);
    setMapCenter(mapProject.mapMode.center);
    setMapZoom(mapProject.mapMode.zoomLevel);
    setAssignmentMessage("地图视图已重置。");
  }

  return {
    project,
    selectedRegionId,
    hoveredRegionId,
    selectedPlaceId,
    activeLayerIds: activeLayerIdList,
    layerState,
    layerAvailability,
    activeCategoryIds,
    activeTool,
    activeDayId,
    assignmentCandidateId,
    assignmentSlot,
    assignmentMessage,
    canUndoAssignment: assignmentHistory.length > 0,
    mapZoom,
    mapCenter,
    selectedRegion,
    hoveredRegion,
    selectedPlace,
    visibleRegionPlaces,
    selectRegion,
    hoverRegion,
    clearHoveredRegion,
    selectPlace,
    toggleLayer,
    setPrimaryView,
    setAdminPrecision,
    toggleExploreLayer,
    toggleEnvironmentLayer,
    toggleCategory,
    setTool,
    toggleRoutes,
    toggleFoodCategory,
    zoomIn,
    zoomOut,
    setMapZoom: setMapZoomFromMap,
    recenterMap,
    addPlaceToCandidates,
    selectAssignmentCandidate,
    selectAssignmentDay,
    selectAssignmentSlot,
    confirmCandidateAssignment,
    assignCandidateToSlot,
    undoCandidateAssignment,
    clearSelection,
    resetMapView,
  };
}

function slotLabel(slot: TimeSlotKey) {
  const labels: Record<TimeSlotKey, string> = {
    morning: "上午",
    afternoon: "下午",
    evening: "晚上",
  };

  return labels[slot];
}

