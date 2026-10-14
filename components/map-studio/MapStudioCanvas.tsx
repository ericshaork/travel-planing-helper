import { mapStudioMarkerIcons } from "@/lib/map-studio/assets";
import {
  DEFAULT_MAP_LAYER_STATE,
  type MapLayerState,
} from "@/lib/map-studio/layer-state";
import type { MapProject } from "@/lib/map-studio/types";
import type { AMapMapFeature } from "@/lib/map/amap-types";

import { AmapBaseMap } from "../map/AmapBaseMap";
import {
  isAdminPmtilesOnlyModeEnabled,
  isAdminPmtilesOverlayEnabled,
} from "../map/AdminPmtilesOverlay";
import type {
  AmapMarkerPoint,
  AmapPolygonRegion,
  AmapRegionLabel,
  AmapPolylineRoute,
} from "../map/map-utils";

interface MapStudioCanvasProps {
  mapProject: MapProject;
  hoveredRegionId?: string;
  selectedPlaceId?: string;
  layerState?: MapLayerState;
  onRegionClick?: (regionId: string) => void;
  onRegionMouseEnter?: (regionId: string) => void;
  onRegionMouseLeave?: (regionId: string) => void;
  onPlaceClick?: (placeId: string) => void;
  onZoomChange?: (zoom: number) => void;
}

const DETAIL_PLACE_MIN_ZOOM = 12;
const PLACE_MARKER_MIN_ZOOM = 11;
const RICH_PLACE_MARKER_MIN_ZOOM = 13;
const DEFAULT_MAP_STUDIO_AMAP_STYLE = "amap://styles/whitesmoke";
const DEFAULT_MAP_STUDIO_AMAP_FEATURES: AMapMapFeature[] = [
  "bg",
  "road",
  "building",
];
const ALLOWED_MAP_STUDIO_AMAP_FEATURES = new Set<AMapMapFeature>([
  "bg",
  "road",
  "building",
]);
const CITY_LABEL_MAX_COUNT = 5;
const FAR_CITY_LABEL_MAX_COUNT = 4;

export function resolveMapStudioAmapStyle() {
  const configuredStyle =
    process.env.NEXT_PUBLIC_MAP_STUDIO_AMAP_STYLE?.trim() ||
    process.env.NEXT_PUBLIC_MAP_STUDIO_AMAP_STYLE_ID?.trim();

  if (!configuredStyle) {
    return DEFAULT_MAP_STUDIO_AMAP_STYLE;
  }

  return configuredStyle.startsWith("amap://")
    ? configuredStyle
    : `amap://styles/${configuredStyle}`;
}

export function resolveMapStudioAmapFeatures(): AMapMapFeature[] {
  const configuredFeatures =
    process.env.NEXT_PUBLIC_MAP_STUDIO_AMAP_FEATURES?.trim();

  if (!configuredFeatures) {
    return DEFAULT_MAP_STUDIO_AMAP_FEATURES;
  }

  const features = configuredFeatures
    .split(",")
    .map((feature) => feature.trim())
    .filter((feature): feature is AMapMapFeature =>
      ALLOWED_MAP_STUDIO_AMAP_FEATURES.has(feature as AMapMapFeature),
    );

  return features.length > 0 ? features : DEFAULT_MAP_STUDIO_AMAP_FEATURES;
}

export function resolveMapStudioAmapShowLabel() {
  const configuredValue =
    process.env.NEXT_PUBLIC_MAP_STUDIO_AMAP_SHOW_LABEL?.trim().toLowerCase();

  if (!configuredValue) {
    return false;
  }

  return ["1", "true", "yes", "on"].includes(configuredValue);
}

function isLayerVisible(mapProject: MapProject, layerType: string) {
  return mapProject.layers.some(
    (layer) => layer.type === layerType && layer.isVisible,
  );
}

function getLayerOpacity(mapProject: MapProject, layerType: string, fallback = 1) {
  return (
    mapProject.layers.find((layer) => layer.type === layerType && layer.isVisible)
      ?.opacity ?? fallback
  );
}

function resolveAdminBoundaryFillOpacity(zoom: number) {
  return zoom >= 13 ? 0.22 : 0.28;
}

export function resolveMapStudioAdminOverlayMode(
  primaryView: MapLayerState["primaryView"],
) {
  const adminViewVisible = primaryView === "admin";
  const enableAdminPmtilesOverlay =
    adminViewVisible && isAdminPmtilesOverlayEnabled();
  const enableHkMoSpecialRuntime = false;
  const pmtilesOverlayVisible = enableAdminPmtilesOverlay;
  const pmtilesOnlyMode =
    adminViewVisible && isAdminPmtilesOnlyModeEnabled();

  return {
    adminBoundaryVisible:
      adminViewVisible && !enableAdminPmtilesOverlay && !pmtilesOnlyMode,
    adminPmtilesOverlayVisible: pmtilesOverlayVisible,
    enableAdminPmtilesOverlay,
    enableHkMoSpecialRuntime,
    adminPmtilesOnlyMode: pmtilesOnlyMode,
  };
}

function isAdministrativeRegion(region: MapProject["regions"][number]) {
  return region.regionType === "administrative";
}

function getRegionPriority(region: MapProject["regions"][number]) {
  return region.priority ?? 99;
}

function isRegionWithinZoom(
  region: MapProject["regions"][number],
  zoom: number,
) {
  const minZoom = region.minZoom ?? 0;
  const maxZoom = region.maxZoom ?? 20;

  return zoom >= minZoom && zoom <= maxZoom;
}

function getLabelLimitForZoom(zoom: number) {
  if (zoom < 10) {
    return FAR_CITY_LABEL_MAX_COUNT;
  }

  if (zoom < DETAIL_PLACE_MIN_ZOOM) {
    return CITY_LABEL_MAX_COUNT;
  }

  return Number.POSITIVE_INFINITY;
}

function shouldShowHotspotAtZoom(
  region: MapProject["regions"][number],
  zoom: number,
) {
  if (region.state.isSelected || region.state.isHovered) {
    return true;
  }

  if (!region.priority && region.dataStatus !== "curated") {
    return true;
  }

  if (!isRegionWithinZoom(region, zoom)) {
    return false;
  }

  if (zoom < 10) {
    return getRegionPriority(region) <= FAR_CITY_LABEL_MAX_COUNT;
  }

  if (zoom < DETAIL_PLACE_MIN_ZOOM) {
    return getRegionPriority(region) <= CITY_LABEL_MAX_COUNT + 1;
  }

  return true;
}

function isHighPriorityPlace(place: MapProject["places"][number]) {
  return (place.priority ?? 99) <= 2;
}

function shouldShowPlaceMarker(
  place: MapProject["places"][number],
  zoom: number,
  selectedRegionId?: string,
) {
  if (
    place.ui.isSelected ||
    place.isCandidate ||
    place.assignedDayId ||
    place.sourceType === "plan"
  ) {
    return true;
  }

  if (selectedRegionId && place.regionId === selectedRegionId) {
    return zoom >= DETAIL_PLACE_MIN_ZOOM;
  }

  if (zoom < PLACE_MARKER_MIN_ZOOM) {
    return false;
  }

  if (zoom < RICH_PLACE_MARKER_MIN_ZOOM) {
    return isHighPriorityPlace(place);
  }

  return (place.minZoom ?? RICH_PLACE_MARKER_MIN_ZOOM) <= zoom;
}

function shouldShowPlaceLabel(
  place: MapProject["places"][number],
  zoom: number,
  selectedRegionId?: string,
) {
  if (place.ui.isSelected) {
    return true;
  }

  if (zoom >= RICH_PLACE_MARKER_MIN_ZOOM && (place.priority ?? 99) <= 1) {
    return true;
  }

  return Boolean(
    selectedRegionId &&
      place.regionId === selectedRegionId &&
      zoom >= RICH_PLACE_MARKER_MIN_ZOOM &&
      isHighPriorityPlace(place),
  );
}

function isFavoritePlace(place: MapProject["places"][number]) {
  return place.ui.markerIcon === "favorite" || place.ui.markerIcon === "saved";
}

function resolvePlaceMarkerIcon(place: MapProject["places"][number]) {
  if (place.sourceType === "plan" || place.assignedDayId) {
    return mapStudioMarkerIcons.planned;
  }

  if (place.isCandidate) {
    return mapStudioMarkerIcons.candidate;
  }

  if (isFavoritePlace(place)) {
    return mapStudioMarkerIcons.favorite;
  }

  return undefined;
}

function resolvePlaceMarkerTone(
  place: MapProject["places"][number],
): "attraction" | "food" | "hotel" | "transport" | "favorite" {
  if (isFavoritePlace(place)) {
    return "favorite";
  }

  if (place.category === "food") {
    return "food";
  }

  if (place.category === "transport") {
    return "transport";
  }

  return "attraction";
}

function resolvePlaceMarkerZIndex(place: MapProject["places"][number]) {
  if (place.ui.isSelected) {
    return 172;
  }

  if (place.sourceType === "plan" || place.assignedDayId) {
    return 158;
  }

  if (place.isCandidate) {
    return 152;
  }

  return 118 - Math.min(place.priority ?? 8, 8);
}

export function buildMapStudioMarkerPoints(
  mapProject: MapProject,
  layerState?: MapLayerState,
): AmapMarkerPoint[] {
  const showPlanPlaces = layerState
    ? layerState.explore.plannedPlaces
    : isLayerVisible(mapProject, "plan_places");
  const showRecommendationPlaces = layerState
    ? layerState.explore.recommendedPlaces
    : isLayerVisible(mapProject, "places");
  const showCandidates = layerState
    ? layerState.explore.candidatePlaces
    : isLayerVisible(mapProject, "candidates");
  const zoom = mapProject.mapMode.zoomLevel;
  const usesCuratedDensityRules = mapProject.places.some(
    (place) => place.dataStatus === "curated",
  );
  const selectedRegionId = mapProject.selectedRegionId;

  if (!showPlanPlaces && !showRecommendationPlaces && !showCandidates) {
    return [];
  }

  return mapProject.places
    .filter((place) => {
      if (!place.ui.isVisible) {
        return false;
      }

      if (place.sourceType === "plan") {
        return showPlanPlaces;
      }

      if (place.isCandidate || place.sourceType === "candidate") {
        return showCandidates;
      }

      if (!showRecommendationPlaces) {
        return false;
      }

      if (layerState) {
        if (place.category === "food") {
          return layerState.explore.food;
        }

        if (place.category === "transport") {
          return layerState.explore.transportHubs;
        }

        if (!layerState.explore.attractions) {
          return false;
        }
      }

      if (
        usesCuratedDensityRules &&
        !shouldShowPlaceMarker(place, zoom, selectedRegionId)
      ) {
        return false;
      }

      if (usesCuratedDensityRules && !selectedRegionId && zoom < PLACE_MARKER_MIN_ZOOM) {
        return false;
      }

      return true;
    })
    .map((place, index) => {
      const iconUrl = resolvePlaceMarkerIcon(place);

      return {
        id: place.id,
        name: place.displayName,
        coordinates: {
          lat: place.lat,
          lng: place.lng,
        },
        order: index + 1,
        showLabel: shouldShowPlaceLabel(place, zoom, selectedRegionId),
        iconUrl,
        iconAlt: `${place.displayName} marker`,
        markerVariant: iconUrl ? "pin" : "dot",
        markerTone: resolvePlaceMarkerTone(place),
        sourceType: place.sourceType,
        zIndex: resolvePlaceMarkerZIndex(place),
        status: "confirmed" as const,
      };
    });
}

export function buildMapStudioPolygonRegions(
  mapProject: MapProject,
  layerState?: MapLayerState,
): AmapPolygonRegion[] {
  const showLegacyRegions = layerState
    ? layerState.primaryView === "travel_region"
    : isLayerVisible(mapProject, "regions");
  const showHotspots = layerState
    ? layerState.primaryView === "travel_region"
    : showLegacyRegions || isLayerVisible(mapProject, "hotspots");
  const zoom = mapProject.mapMode.zoomLevel;

  if (!showHotspots) {
    return [];
  }

  return mapProject.regions
    .filter((region) => {
      if (!region.state.isVisible) {
        return false;
      }

      if (isAdministrativeRegion(region)) {
        return false;
      }

      return showHotspots && shouldShowHotspotAtZoom(region, zoom);
    })
    .map((region, index) => {
      const isSelected = region.state.isSelected;
      const isHovered = region.state.isHovered;
      const layerOpacity = getLayerOpacity(mapProject, "hotspots", 1);

      return {
        id: region.id,
        name: region.displayName,
        paths: region.boundary.coordinates,
        fillColor: "#c99142",
        strokeColor: isSelected
            ? "rgba(255,218,128,0.94)"
            : isHovered
              ? "rgba(232,188,98,0.82)"
              : "rgba(187,135,56,0.68)",
        fillOpacity: isSelected
            ? 0.4 * layerOpacity
            : isHovered
              ? 0.3 * layerOpacity
              : 0.18 * layerOpacity,
        strokeOpacity: isSelected
            ? 0.96 * layerOpacity
            : isHovered
              ? 0.78 * layerOpacity
              : 0.58 * layerOpacity,
        strokeWeight: isSelected ? 3 : isHovered ? 2 : 1,
        zIndex: (isSelected ? 90 : isHovered ? 78 : 34) + index,
        interactive: true,
      };
    });
}

export function buildMapStudioRegionLabels(
  mapProject: MapProject,
  layerState?: MapLayerState,
): AmapRegionLabel[] {
  if (!isLayerVisible(mapProject, "labels")) {
    return [];
  }

  if (layerState && layerState.primaryView !== "travel_region") {
    return [];
  }

  const showLegacyRegions = layerState
    ? layerState.primaryView === "travel_region"
    : isLayerVisible(mapProject, "regions");
  const showHotspots = layerState
    ? layerState.primaryView === "travel_region"
    : showLegacyRegions || isLayerVisible(mapProject, "hotspots");

  const zoom = mapProject.mapMode.zoomLevel;
  const labelLimit = getLabelLimitForZoom(zoom);
  const hotspotLabels = mapProject.regions
    .filter((region) => {
      if (!showHotspots || !region.state.isVisible || isAdministrativeRegion(region)) {
        return false;
      }

      return shouldShowHotspotAtZoom(region, zoom);
    })
    .sort((left, right) => getRegionPriority(left) - getRegionPriority(right))
    .filter((region, index) => {
      if (region.state.isSelected || region.state.isHovered) {
        return true;
      }

      return index < labelLimit;
    })
    .map((region, index) => ({
      id: `${region.id}-label`,
      name: region.displayName,
      shortName: region.shortName ?? region.displayName,
      coordinates: region.labelAnchor ?? region.labelPosition,
      priority: getRegionPriority(region),
      active: region.state.isSelected || region.state.isHovered,
      labelKind: "hotspot" as const,
      zIndex:
        (region.state.isSelected ? 190 : region.state.isHovered ? 180 : 130) -
        index,
    }));
  const cityLabel: AmapRegionLabel = {
    id: `${mapProject.city}-city-label`,
    name: mapProject.city,
    shortName: mapProject.city,
    coordinates: mapProject.mapMode.center,
    priority: 0,
    active: false,
    labelKind: "city",
    zIndex: 170,
  };

  return [cityLabel, ...hotspotLabels];
}

export function buildMapStudioPolylineRoutes(
  mapProject: MapProject,
): AmapPolylineRoute[] {
  if (!isLayerVisible(mapProject, "routes")) {
    return [];
  }

  return mapProject.routes
    .filter((route) => route.path.type === "polyline")
    .map((route, index) => ({
      id: route.id,
      name: route.name,
      path: route.path.coordinates,
      strokeColor: "#F2CF70",
      strokeOpacity: route.path.source === "mock" ? 0.82 : 0.94,
      strokeWeight: 5,
      strokeStyle: route.path.source === "mock" ? ("dashed" as const) : "solid",
      zIndex: 80 + index,
    }));
}

export function MapStudioCanvas({
  mapProject,
  hoveredRegionId,
  selectedPlaceId,
  layerState = DEFAULT_MAP_LAYER_STATE,
  onRegionClick,
  onRegionMouseEnter,
  onRegionMouseLeave,
  onPlaceClick,
  onZoomChange,
}: MapStudioCanvasProps) {
  const markerPoints = buildMapStudioMarkerPoints(mapProject, layerState);
  const polygonRegions = buildMapStudioPolygonRegions(mapProject, layerState);
  const regionLabels = buildMapStudioRegionLabels(mapProject, layerState);
  const polylineRoutes = buildMapStudioPolylineRoutes(mapProject);
  const trafficLayerVisible =
    layerState.environment.traffic && isLayerVisible(mapProject, "traffic");
  const trafficLayerOpacity = getLayerOpacity(mapProject, "traffic", 0.45);
  const {
    adminBoundaryVisible: amapAdminBoundaryVisible,
    adminPmtilesOverlayVisible,
    enableAdminPmtilesOverlay,
    enableHkMoSpecialRuntime,
    adminPmtilesOnlyMode,
  } = resolveMapStudioAdminOverlayMode(layerState.primaryView);
  const adminBoundaryLabelVisible =
    amapAdminBoundaryVisible && isLayerVisible(mapProject, "labels");
  const adminBoundaryFillOpacity = resolveAdminBoundaryFillOpacity(
    mapProject.mapMode.zoomLevel,
  );
  const mapStyle = resolveMapStudioAmapStyle();
  const mapFeatures = resolveMapStudioAmapFeatures();
  const showAmapLabels = resolveMapStudioAmapShowLabel();
  const hoveredRegion = hoveredRegionId
    ? mapProject.regions.find((region) => region.id === hoveredRegionId)
    : undefined;

  return (
    <main className="relative z-0 h-full min-h-0 overflow-hidden bg-[#071012]">
      <AmapBaseMap
        ariaLabel={`${mapProject.title}地图操作台`}
        center={mapProject.mapMode.center}
        zoom={mapProject.mapMode.zoomLevel}
        mapStyle={mapStyle}
        features={mapFeatures}
        showLabel={showAmapLabels}
        markerPoints={markerPoints}
        polygonRegions={polygonRegions}
        regionLabels={regionLabels}
        polylineRoutes={polylineRoutes}
        trafficLayerVisible={trafficLayerVisible}
        trafficLayerOpacity={trafficLayerOpacity}
        adminBoundaryVisible={amapAdminBoundaryVisible}
        adminBoundaryLabelVisible={adminBoundaryLabelVisible}
        adminBoundaryFillOpacity={adminBoundaryFillOpacity}
        adminBoundaryPrecision={layerState.adminPrecision}
        adminBoundaryDestination={`${mapProject.country}/${mapProject.city}`}
        adminPmtilesOverlayVisible={adminPmtilesOverlayVisible}
        enableAdminPmtilesOverlay={enableAdminPmtilesOverlay}
        enableHkMoSpecialRuntime={enableHkMoSpecialRuntime}
        adminPmtilesOnlyMode={adminPmtilesOnlyMode}
        activePointId={selectedPlaceId}
        onPolygonClick={onRegionClick}
        onPolygonMouseEnter={onRegionMouseEnter}
        onPolygonMouseLeave={onRegionMouseLeave}
        onMarkerClick={onPlaceClick}
        onZoomChange={onZoomChange}
        fitToMarkers={false}
        markerLabel
        showEmptyStateOverlay={false}
        className="relative z-0 h-full min-h-0 w-full border-0 bg-[#14110d] brightness-[0.9] saturate-[0.28] contrast-[0.72] sepia-[0.18]"
        surfaceClassName="relative z-0 h-full min-h-0 w-full"
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-8 top-0 z-[5] bg-[linear-gradient(180deg,rgba(64,50,34,0.15),rgba(236,220,181,0.11)),radial-gradient(circle_at_42%_38%,rgba(215,176,106,0.1),transparent_38%)]" />
      <div className="pointer-events-none absolute inset-x-8 bottom-12 top-8 z-[6] rounded-[12px] border border-[rgba(255,236,190,0.07)]" />
      {hoveredRegion ? (
        <div className="pointer-events-none absolute left-5 top-20 z-10 max-w-[18rem] rounded-[6px] border border-[rgba(255,236,190,0.18)] bg-[rgba(7,12,12,0.72)] px-3 py-2 text-xs shadow-[0_10px_24px_rgba(0,0,0,0.28)] backdrop-blur-[4px]">
          <p className="font-semibold text-[#fff2c2]">
            {hoveredRegion.displayName}
          </p>
          <p className="mt-1 line-clamp-2 leading-5 text-[rgba(255,250,235,0.62)]">
            {hoveredRegion.summary}
          </p>
        </div>
      ) : null}
      <p className="pointer-events-none absolute bottom-5 left-5 z-10 rounded-[6px] bg-[rgba(0,0,0,0.34)] px-3 py-2 text-xs font-semibold text-[rgba(255,250,235,0.72)] backdrop-blur-[3px]">
        点击区域查看详情
      </p>
    </main>
  );
}
