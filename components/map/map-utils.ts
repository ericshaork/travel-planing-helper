import type {
  AMapGlobal,
  AMapLngLatTuple,
  AMapMapFeature,
  AMapMarkerLabel,
  AMapMarkerInstance,
  AMapMarkerOptions,
  AMapMapInstance,
  AMapMapOptions,
  AMapOverlayInstance,
  AMapPolygonInstance,
  AMapPolygonOptions,
  AMapPolylineInstance,
  AMapPolylineOptions,
  AMapTrafficLayerInstance,
  AMapDistrictSearchDistrict,
  AMapDistrictSearchResult,
  AMapBoundsInstance,
} from "../../lib/map/amap-types";
import type { AmapLoadErrorCode } from "../../lib/map/amap-types";
import {
  estimateCoordinateDeltaMeters,
  transformLngLatForAmap,
  type AmapCoordinateDisplayMode,
} from "../../src/lib/map/coordinateTransform";
import type { MapPoint } from "../../lib/trip/enrichment-types";
import {
  fetchAdminBoundaries,
  type AdminBoundaryApiLevel,
  type AdminBoundaryClientFeature,
  type AdminBoundaryClientResult,
} from "../../src/lib/data-hub/adminBoundaryClient";
import {
  clearMemoryAdminBoundaryCache,
  getAdminBoundaryCacheKey,
  getMemoryAdminBoundary,
  getPersistentAdminBoundary,
  hasMemoryAdminBoundary,
  isAdminBoundaryCacheEntryExpired,
  normalizeAdminBoundaryCacheLevel,
  setAdminBoundaryPersistentCacheAdapterForTests as setAdminBoundaryPersistentCacheAdapter,
  setMemoryAdminBoundary,
  setPersistentAdminBoundary,
  type AdminBoundaryCacheEntry,
  type AdminBoundaryCacheFeature,
  type AdminBoundaryPersistentCacheAdapter,
} from "../../src/lib/map-studio/adminBoundaryCache";
import {
  clearAdminLabelPlacementCache,
  getRepresentativeLabelPoint,
  type AdminLabelPlacementStrategy,
} from "../../src/lib/map-studio/adminLabelPlacement";

export type {
  AdminBoundaryCacheEntry,
  AdminBoundaryCacheFeature,
  AdminBoundaryPersistentCacheAdapter,
} from "../../src/lib/map-studio/adminBoundaryCache";

export interface MapCenter {
  lat: number;
  lng: number;
}

export interface MapBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface AmapBaseMapConfig {
  center?: MapCenter;
  zoom?: number;
  mapStyle?: string;
  features?: AMapMapFeature[];
  showLabel?: boolean;
}

export interface MapErrorCopy {
  title: string;
  description: string;
}

export interface AmapMarkerPoint {
  id: string;
  name: string;
  coordinates: MapCenter;
  order: number;
  status: "confirmed" | "unresolved";
  showLabel?: boolean;
  iconUrl?: string;
  iconAlt?: string;
  markerVariant?: "dot" | "pin";
  markerTone?: "attraction" | "food" | "hotel" | "transport" | "favorite";
  sourceType?: "plan" | "seed" | "candidate" | "mock";
  zIndex?: number;
}

export interface AmapMarkerLayerResult {
  markerPoints: AmapMarkerPoint[];
  unresolvedCount: number;
}

export interface CreateAmapMarkerLayerOptions {
  activePointId?: string | null;
  markerLabel?: boolean;
  onMarkerClick?: (pointId: string) => void;
}

export interface AmapPolygonRegion {
  id: string;
  name: string;
  paths: MapCenter[][];
  fillColor: string;
  strokeColor: string;
  fillOpacity?: number;
  strokeOpacity?: number;
  strokeWeight?: number;
  zIndex?: number;
  interactive?: boolean;
}

export interface AmapRegionLabel {
  id: string;
  name: string;
  shortName: string;
  coordinates: MapCenter;
  priority: number;
  active?: boolean;
  labelKind?: "city" | "province" | "district" | "hotspot";
  zIndex?: number;
}

export interface AmapPolylineRoute {
  id: string;
  name: string;
  path: MapCenter[];
  strokeColor?: string;
  strokeOpacity?: number;
  strokeWeight?: number;
  strokeStyle?: "solid" | "dashed";
  zIndex?: number;
}

export interface CreateAmapPolygonLayerOptions {
  onPolygonClick?: (regionId: string) => void;
  onPolygonMouseEnter?: (regionId: string) => void;
  onPolygonMouseLeave?: (regionId: string) => void;
}

export interface CreateAmapPolylineLayerOptions {
  onPolylineClick?: (routeId: string) => void;
}

export type AmapAdministrativeLevel = "province" | "city" | "district";
export type AmapAdminPrecision = "auto" | "province" | "prefecture" | "county";
export type AmapAdministrativeView =
  | "countryView"
  | "provinceView"
  | "cityView"
  | "districtView";

export type AmapAdministrativeReloadReason =
  | "layer_enabled"
  | "level_changed"
  | "parent_changed"
  | "manual_refresh"
  | "viewport_changed";

export interface AmapAdministrativeBoundaryQuery {
  keyword: string;
  adcode: string;
  parentAdcodes?: string[];
  parentNames?: string[];
  viewportBounds?: MapBounds | null;
  viewportTileKey?: string;
  targetLevel: AmapAdministrativeLevel;
  searchLevel: "country" | "province" | "city";
  subdistrict: number;
  center: MapCenter;
  zoom: number;
}

export function resolveAdminPrecisionTargetLevel(
  adminPrecision: AmapAdminPrecision | null | undefined,
  autoTargetLevel: AmapAdministrativeLevel,
): AmapAdministrativeLevel {
  if (adminPrecision === "province") {
    return "province";
  }

  if (adminPrecision === "prefecture") {
    return "city";
  }

  if (adminPrecision === "county") {
    return "district";
  }

  return autoTargetLevel;
}

export function getAdminPrecisionDebugValue(
  adminPrecision: AmapAdminPrecision | null | undefined,
) {
  return adminPrecision ?? "auto";
}

export interface LoadedAdministrativeBoundaryRegion {
  id: string;
  name: string;
  adcode?: string;
  level?: string;
  parentAdcode?: string;
  center: MapCenter | null;
  labelPosition?: MapCenter | null;
  labelPositionSource?: "polygon-centroid" | "district-center" | "fallback" | AdminLabelPlacementStrategy;
  labelPlacement?: {
    strategy: AdminLabelPlacementStrategy;
    originalLabelPoint: MapCenter | null;
    finalLabelPoint: MapCenter | null;
    transformedLabelPoint?: MapCenter | null;
    inViewport: boolean | null;
    inPolygon: boolean | null;
    isMultiPolygon: boolean;
  };
  bbox?: MapBounds | null;
  boundaries: MapCenter[][];
}

export interface LoadedAdministrativeBoundaries {
  query: AmapAdministrativeBoundaryQuery;
  regions: LoadedAdministrativeBoundaryRegion[];
  parentBoundaryRegions?: LoadedAdministrativeBoundaryRegion[];
  boundariesCount: number;
  fetchedAt: string;
  source: "amap_district_search" | "admin_boundary_cache";
  cacheSource?: "memory" | "indexeddb" | "datahub" | "amap" | "stale-cache";
  cacheHit?: boolean;
  isStale?: boolean;
}

export interface ResolvedAdminBoundaryLevel {
  view: AmapAdministrativeView;
  targetLevel: AmapAdministrativeLevel;
  viewportClass:
    | "countryWide"
    | "multiProvinceWide"
    | "singleProvinceWide"
    | "singleCityWide"
    | "neighborhood";
  boundsSpan?: {
    latitudeSpan: number;
    longitudeSpan: number;
  };
  expandedViewportBounds?: MapBounds;
  centerAdminGuess?: string;
  downgradeReason?:
    | "viewport_crosses_multiple_cities"
    | "viewport_crosses_multiple_provinces";
  classificationReason?:
    | "zoom_fallback"
    | "dominant_province"
    | "dominant_city"
    | "multi_province"
    | "multi_city";
  confidence?: number;
  parentAdcodes?: string[];
  parentNames?: string[];
  tooManyParentsFallback?: boolean;
  intersectingProvinces?: Array<{
    adcode: string;
    name: string;
    intersectionRatio: number;
    centerInside: boolean;
    included?: boolean;
  }>;
}

export interface AmapAdministrativeBoundaryLayerOptions {
  query?: AmapAdministrativeBoundaryQuery;
  requestId?: number;
  center?: MapCenter;
  bounds?: MapBounds | null;
  zoom?: number;
  mergeRegions?: LoadedAdministrativeBoundaryRegion[];
  adminGeometryDisplayMode?: AmapCoordinateDisplayMode;
  adminPrecision?: string | null;
  fillOpacity?: number;
  strokeOpacity?: number;
  strokeWeight?: number;
  labelVisible?: boolean;
  isStale?: () => boolean;
  onStale?: (requestId?: number) => void;
  onError?: (message: string) => void;
  onLoaded?: (
    result: LoadedAdministrativeBoundaries,
    meta?: {
      requestId?: number;
      polygonCount: number;
      labelCount: number;
      visibleFeatureCount?: number;
      polygonOverlayCount?: number;
      denseProtectionTriggered?: boolean;
      denseProtectionReason?: string | null;
      renderedAdcodes?: string[];
    },
  ) => void;
}

export interface AmapAdministrativeBoundaryLayerHandle {
  cancel: () => void;
  clear: () => void;
  clearLabels: () => number;
  getOverlayCounts: () => {
    polygons: number;
    boundaryLines: number;
    labels: number;
  };
}
export const DEFAULT_AMAP_CENTER: MapCenter = {
  lat: 35.8617,
  lng: 104.1954,
};

export const DEFAULT_AMAP_ZOOM = 4;
export const SINGLE_POINT_ZOOM = 13;
export const ACTIVE_POINT_ZOOM = 15;
const DEFAULT_MARKER_Z_INDEX = 110;
const ACTIVE_MARKER_Z_INDEX = 160;
const HOVER_MARKER_Z_INDEX = 170;
const DEFAULT_POLYGON_Z_INDEX = 40;
const DEFAULT_POLYLINE_Z_INDEX = 90;

const ADMIN_BOUNDARY_PALETTE = [
  { fill: "#d8c78e", stroke: "#9d7f46" },
  { fill: "#aebc8c", stroke: "#73815a" },
  { fill: "#9eb3bf", stroke: "#667d88" },
  { fill: "#c49a78", stroke: "#8f684c" },
  { fill: "#b9a282", stroke: "#826d50" },
  { fill: "#98b2ad", stroke: "#607d77" },
  { fill: "#d0a5a0", stroke: "#92706b" },
  { fill: "#8eaa92", stroke: "#617663" },
  { fill: "#c3b59a", stroke: "#887a60" },
  { fill: "#9aa9c1", stroke: "#65748c" },
];

const ADMIN_PARENT_FILL_PALETTE = [
  "#d8c78e",
  "#aebc8c",
  "#c3b59a",
  "#9eb3bf",
  "#d0a5a0",
  "#98b2ad",
  "#b9a282",
  "#c49a78",
];
const ADMIN_BOUNDARY_RENDER_CACHE_LIMIT = 320;
const MAX_ADMIN_CITY_PARENT_PROVINCES = 6;
const MAX_ADMIN_COUNTY_VIEWPORT_LONGITUDE_SPAN = 2.0;
const MAX_ADMIN_COUNTY_VIEWPORT_LATITUDE_SPAN = 1.25;
const MAX_ADMIN_COUNTY_VIEWPORT_AREA = 2.8;
const ADMIN_BOUNDARY_VIEWPORT_PADDING_RATIO = 0.2;
const ADMIN_BOUNDARY_COUNTY_VIEWPORT_PADDING_RATIO = 0.18;
const ADMIN_BOUNDARY_LOADED_BOUNDS_BUFFER_RATIO = 0.03;
export const ADMIN_BOUNDARY_MAX_COUNTY_RENDER_FEATURES = 120;

export type AdminBoundaryStyleMode = "soft" | "normal" | "debug";

export interface AdminBoundaryPolygonStyle {
  fillColor: string;
  fillOpacity: number;
  strokeColor: string;
  strokeOpacity: number;
  strokeWeight: number;
}

export interface AdminBoundaryLineSegment {
  key: string;
  path: [MapCenter, MapCenter];
  count: number;
}

export type AdminRenderOverlayAuditLevel = "province" | "prefecture" | "county";

export type AdminBoundaryOverlayAuditSource =
  | "boundaryLine"
  | "parentBoundary"
  | "childBoundary"
  | "retainedOldOverlay"
  | "fallback"
  | "debugBoundary";

export interface AdminBoundaryOverlayAuditRecord {
  overlayId: string;
  level: AdminRenderOverlayAuditLevel;
  source: AdminBoundaryOverlayAuditSource;
  parentAdcode: string | null;
  tileKey: string | null;
  viewportTileKey: string | null;
  requestId: number | null;
  regionAdcodes: string[];
  regionNames: string[];
  zIndex: number;
  strokeWeight: number;
  strokeOpacity: number;
  segmentKey: string;
  snappedSegmentKey: string;
}

export interface AdminRenderOverlayAuditDuplicateGroup {
  snappedSegmentKey: string;
  count: number;
  levels: AdminRenderOverlayAuditLevel[];
  sources: AdminBoundaryOverlayAuditSource[];
  overlayIds: string[];
  regionAdcodesSample: string[];
  regionNamesSample: string[];
  crossLevelDuplicate: boolean;
  retainedOldOverlayDuplicate: boolean;
  focusRegionDuplicate: boolean;
}

export interface AdminRenderOverlayAuditSnapshot {
  requestId: number | null;
  targetLevel: AdminRenderOverlayAuditLevel | null;
  viewportTileKey: string | null;
  boundaryOverlayCount: number;
  provinceBoundaryCount: number;
  prefectureBoundaryCount: number;
  countyBoundaryCount: number;
  retainedOldOverlayCount: number;
  parentBoundaryOverlayCount: number;
  childBoundaryOverlayCount: number;
  duplicateSegmentGroupCount: number;
  crossLevelDuplicateGroupCount: number;
  retainedOldOverlayDuplicateGroupCount: number;
  topDuplicateSegmentGroups: AdminRenderOverlayAuditDuplicateGroup[];
  focusRegionMatched: boolean;
  focusDuplicateSegmentGroups: AdminRenderOverlayAuditDuplicateGroup[];
  cleanupScheduled: boolean;
  cleanupExecuted: boolean;
  cleanupDelayMs: number | null;
  levelSwitch: boolean;
  retainedOldOverlayStableState: boolean;
}

export interface AdminBoundaryLineSegmentBuildStats {
  targetLevel?: AmapAdministrativeLevel;
  featureCount: number;
  polygonCount: number;
  ringCount: number;
  rawSegmentCount: number;
  dedupedSegmentCount: number;
  duplicateSegmentCount: number;
  snappedSegmentCount: number;
  unmatchedNearDuplicateSegmentCount: number;
  snappedSegmentRatio: number;
  dedupeRatio: number;
  skippedSegmentCount: number;
  tolerance: number;
}

export interface AdminBoundaryLineSegmentBuildResult {
  segments: AdminBoundaryLineSegment[];
  stats: AdminBoundaryLineSegmentBuildStats;
}

type AdminBoundaryLineRole = "child" | "parent" | "debug";

type AdminBoundaryLineStyle = Pick<
  AMapPolylineOptions,
  | "strokeColor"
  | "strokeOpacity"
  | "strokeWeight"
  | "zIndex"
  | "lineJoin"
  | "lineCap"
>;

export interface AdminOverlayDiff {
  keep: string[];
  add: string[];
  remove: string[];
}

const adminBoundaryRenderCache = new Map<string, MapCenter[][]>();
const adminBoundaryDisplayTransformCache = new Map<string, MapCenter>();
const adminBoundaryTopologyCache = new Map<string, AdminBoundaryLineSegmentBuildResult>();

const ADMIN_RENDER_OVERLAY_AUDIT_FOCUS_REGIONS = [
  { adcode: "440300", name: "深圳" },
  { adcode: "441900", name: "东莞" },
  { adcode: "440100", name: "广州" },
  { adcode: "440600", name: "佛山" },
  { adcode: "441300", name: "惠州" },
];

function toUniqueStrings<T extends string>(values: Iterable<T | null | undefined>): T[] {
  const filtered: T[] = [];
  for (const value of values) {
    if (value) {
      filtered.push(value);
    }
  }

  return Array.from(new Set(filtered));
}

export function toAdminRenderOverlayAuditLevel(
  level: AmapAdministrativeLevel | AdminRenderOverlayAuditLevel | null | undefined,
): AdminRenderOverlayAuditLevel | null {
  if (level === "province" || level === "prefecture" || level === "county") {
    return level;
  }

  if (level === "city") {
    return "prefecture";
  }

  if (level === "district") {
    return "county";
  }

  return null;
}

function hasAdminRenderOverlayAuditFocusRegion(record: AdminBoundaryOverlayAuditRecord) {
  return ADMIN_RENDER_OVERLAY_AUDIT_FOCUS_REGIONS.some((focus) => {
    return (
      record.regionAdcodes.includes(focus.adcode) ||
      record.parentAdcode === focus.adcode ||
      record.regionNames.some((name) => name.includes(focus.name))
    );
  });
}

export function createAdminBoundaryOverlayAuditRecord(input: {
  overlayId: string;
  level: AmapAdministrativeLevel | AdminRenderOverlayAuditLevel;
  source: AdminBoundaryOverlayAuditSource;
  segmentKey: string;
  zIndex: number;
  strokeWeight: number;
  strokeOpacity: number;
  parentAdcode?: string | null;
  tileKey?: string | null;
  viewportTileKey?: string | null;
  requestId?: number | null;
  regionAdcodes?: Iterable<string | null | undefined>;
  regionNames?: Iterable<string | null | undefined>;
}): AdminBoundaryOverlayAuditRecord {
  return {
    overlayId: input.overlayId,
    level: toAdminRenderOverlayAuditLevel(input.level) ?? "county",
    source: input.source,
    parentAdcode: input.parentAdcode ?? null,
    tileKey: input.tileKey ?? input.viewportTileKey ?? null,
    viewportTileKey: input.viewportTileKey ?? null,
    requestId: input.requestId ?? null,
    regionAdcodes: toUniqueStrings(input.regionAdcodes ?? []),
    regionNames: toUniqueStrings(input.regionNames ?? []),
    zIndex: input.zIndex,
    strokeWeight: input.strokeWeight,
    strokeOpacity: input.strokeOpacity,
    segmentKey: input.segmentKey,
    snappedSegmentKey: input.segmentKey,
  };
}

export function createAdminRenderOverlayAuditSnapshot(
  records: AdminBoundaryOverlayAuditRecord[],
  options: {
    requestId?: number | null;
    targetLevel?: AmapAdministrativeLevel | AdminRenderOverlayAuditLevel | null;
    viewportTileKey?: string | null;
    cleanupScheduled?: boolean;
    cleanupExecuted?: boolean;
    cleanupDelayMs?: number | null;
    levelSwitch?: boolean;
    topDuplicateLimit?: number;
  } = {},
): AdminRenderOverlayAuditSnapshot {
  const duplicateGroups = new Map<string, AdminBoundaryOverlayAuditRecord[]>();

  for (const record of records) {
    const group = duplicateGroups.get(record.snappedSegmentKey) ?? [];
    group.push(record);
    duplicateGroups.set(record.snappedSegmentKey, group);
  }

  const buildDuplicateGroup = (
    snappedSegmentKey: string,
    groupRecords: AdminBoundaryOverlayAuditRecord[],
  ): AdminRenderOverlayAuditDuplicateGroup => {
    const levels = toUniqueStrings(groupRecords.map((record) => record.level));
    const sources = toUniqueStrings(groupRecords.map((record) => record.source));
    const regionAdcodesSample = toUniqueStrings(
      groupRecords.flatMap((record) => record.regionAdcodes),
    ).slice(0, 8);
    const regionNamesSample = toUniqueStrings(
      groupRecords.flatMap((record) => record.regionNames),
    ).slice(0, 8);
    const focusRegionDuplicate = groupRecords.some(hasAdminRenderOverlayAuditFocusRegion);

    return {
      snappedSegmentKey,
      count: groupRecords.length,
      levels,
      sources,
      overlayIds: groupRecords.map((record) => record.overlayId).slice(0, 12),
      regionAdcodesSample,
      regionNamesSample,
      crossLevelDuplicate: levels.length > 1,
      retainedOldOverlayDuplicate: sources.includes("retainedOldOverlay"),
      focusRegionDuplicate,
    };
  };

  const allDuplicateSegmentGroups = Array.from(duplicateGroups.entries())
    .filter(([, groupRecords]) => groupRecords.length > 1)
    .map(([snappedSegmentKey, groupRecords]) =>
      buildDuplicateGroup(snappedSegmentKey, groupRecords),
    )
    .sort((left, right) => right.count - left.count);
  const retainedOldOverlayCount = records.filter(
    (record) => record.source === "retainedOldOverlay",
  ).length;
  const cleanupScheduled = Boolean(options.cleanupScheduled);
  const cleanupExecuted = Boolean(options.cleanupExecuted);
  const levelSwitch = Boolean(options.levelSwitch);

  return {
    requestId: options.requestId ?? null,
    targetLevel: toAdminRenderOverlayAuditLevel(options.targetLevel) ?? null,
    viewportTileKey: options.viewportTileKey ?? null,
    boundaryOverlayCount: records.length,
    provinceBoundaryCount: records.filter((record) => record.level === "province").length,
    prefectureBoundaryCount: records.filter((record) => record.level === "prefecture").length,
    countyBoundaryCount: records.filter((record) => record.level === "county").length,
    retainedOldOverlayCount,
    parentBoundaryOverlayCount: records.filter((record) => record.source === "parentBoundary").length,
    childBoundaryOverlayCount: records.filter((record) => record.source === "childBoundary").length,
    duplicateSegmentGroupCount: allDuplicateSegmentGroups.length,
    crossLevelDuplicateGroupCount: allDuplicateSegmentGroups.filter(
      (group) => group.crossLevelDuplicate,
    ).length,
    retainedOldOverlayDuplicateGroupCount: allDuplicateSegmentGroups.filter(
      (group) => group.retainedOldOverlayDuplicate,
    ).length,
    topDuplicateSegmentGroups: allDuplicateSegmentGroups.slice(
      0,
      options.topDuplicateLimit ?? 8,
    ),
    focusRegionMatched: records.some(hasAdminRenderOverlayAuditFocusRegion),
    focusDuplicateSegmentGroups: allDuplicateSegmentGroups
      .filter((group) => group.focusRegionDuplicate)
      .slice(0, options.topDuplicateLimit ?? 8),
    cleanupScheduled,
    cleanupExecuted,
    cleanupDelayMs: options.cleanupDelayMs ?? null,
    levelSwitch,
    retainedOldOverlayStableState:
      retainedOldOverlayCount > 0 && !levelSwitch && !cleanupScheduled && !cleanupExecuted,
  };
}

function isFiniteCoordinate(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isValidMapCenter(center: Partial<MapCenter> | undefined): center is MapCenter {
  return Boolean(
    center &&
      isFiniteCoordinate(center.lat) &&
      isFiniteCoordinate(center.lng) &&
      Math.abs(center.lat) <= 90 &&
      Math.abs(center.lng) <= 180,
  );
}

export function toAmapLngLatTuple(
  center: MapCenter = DEFAULT_AMAP_CENTER,
): AMapLngLatTuple {
  return [center.lng, center.lat];
}

export function buildAmapMapOptions(
  config: AmapBaseMapConfig = {},
): AMapMapOptions {
  return {
    center: toAmapLngLatTuple(
      isValidMapCenter(config.center) ? config.center : DEFAULT_AMAP_CENTER,
    ),
    zoom: config.zoom ?? DEFAULT_AMAP_ZOOM,
    ...(config.mapStyle ? { mapStyle: config.mapStyle } : {}),
    ...(config.features ? { features: config.features } : {}),
    ...(typeof config.showLabel === "boolean" ? { showLabel: config.showLabel } : {}),
  };
}

export function buildAmapMarkerLayer(
  points: MapPoint[],
): AmapMarkerLayerResult {
  let unresolvedCount = 0;
  const markerPoints: AmapMarkerPoint[] = [];

  points.forEach((point, index) => {
    const coordinates = point.coordinates;
    const resolvedCoordinates = isValidMapCenter(coordinates)
      ? coordinates
      : undefined;

    if (!point.resolved || !resolvedCoordinates) {
      unresolvedCount += 1;
      return;
    }

    markerPoints.push({
      id: point.id,
      name: point.name,
      coordinates: resolvedCoordinates,
      order: index + 1,
      status: "confirmed",
    });
  });

  return {
    markerPoints,
    unresolvedCount,
  };
}

export function buildAmapMarkerOptions(
  point: AmapMarkerPoint,
  markerLabel = true,
  active = false,
): AMapMarkerOptions {
  const shouldShowLabel = markerLabel && point.showLabel !== false;
  const label = buildAmapMarkerLabelOption(point, active);
  const zIndex = point.zIndex ?? (active ? ACTIVE_MARKER_Z_INDEX : DEFAULT_MARKER_Z_INDEX);
  const customContent = point.iconUrl
    ? buildAmapMarkerIconContent(point, active)
    : point.markerVariant === "dot"
      ? buildAmapDotMarkerContent(point, active)
      : undefined;

  return {
    position: toAmapLngLatTuple(point.coordinates),
    title: `${point.order}. ${point.name}`,
    zIndex,
    ...(customContent
      ? {
          content: customContent,
          anchor: point.iconUrl ? ("bottom-center" as const) : ("center" as const),
          offset: [0, 0] as [number, number],
        }
      : {}),
    ...(shouldShowLabel
        ? {
          label,
        }
      : {}),
  };
}

export function buildAmapRegionLabelContent(label: AmapRegionLabel): string {
  const name = escapeMarkerLabelText(truncateMarkerName(label.shortName, 9));
  const isDistrict = label.labelKind === "district";
  const isProvince = label.labelKind === "province";
  const isCity = label.labelKind === "city";
  const color = label.active
    ? "#30261c"
    : isDistrict
      ? "rgba(55,48,38,0.86)"
      : isCity
        ? "rgba(57,48,38,0.88)"
        : "#3f3529";
  const fontSize = isProvince ? 14 : isCity ? 13 : 12.5;
  const fontWeight = isProvince ? 700 : isCity ? 600 : 600;
  const shadow = label.active
    ? "0 1px 2px rgba(255,250,232,0.92),0 0 5px rgba(255,250,232,0.42)"
    : isDistrict
      ? "0 1px 2px rgba(245,238,220,0.85),0 0 4px rgba(245,238,220,0.48)"
      : "0 1px 2px rgba(255,250,232,0.82),0 0 4px rgba(255,250,232,0.34)";

  return `<span class="wanderly-admin-label-plain" style="display:inline-block;max-width:104px;transform:translate(-50%,-50%);transform-origin:center center;padding:0;color:${color};font-size:${fontSize}px;font-weight:${fontWeight};line-height:1;text-align:center;letter-spacing:0;text-shadow:${shadow};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none;">${name}</span>`;
}

export function buildAmapRegionLabelOptions(
  label: AmapRegionLabel,
): AMapMarkerOptions {
  return {
    position: toAmapLngLatTuple(label.coordinates),
    title: label.name,
    content: buildAmapRegionLabelContent(label),
    anchor: "top-left",
    offset: [0, 0],
    zIndex: label.zIndex ?? 130,
  };
}

export function buildAmapPolygonOptions(
  region: AmapPolygonRegion,
  path: MapCenter[],
): AMapPolygonOptions {
  return {
    path: path.map((point) => toAmapLngLatTuple(point)),
    fillColor: region.fillColor,
    fillOpacity: region.fillOpacity ?? 0.44,
    strokeColor: region.strokeColor,
    strokeOpacity: region.strokeOpacity ?? 0.78,
    strokeWeight: region.strokeWeight ?? 2,
    zIndex: region.zIndex ?? DEFAULT_POLYGON_Z_INDEX,
    extData: {
      id: region.id,
      name: region.name,
      overlayType: "region",
    },
  };
}

export function buildAmapPolylineOptions(
  route: AmapPolylineRoute,
): AMapPolylineOptions {
  return {
    path: route.path.map((point) => toAmapLngLatTuple(point)),
    strokeColor: route.strokeColor ?? "#F2CF70",
    strokeOpacity: route.strokeOpacity ?? 0.9,
    strokeWeight: route.strokeWeight ?? 5,
    strokeStyle: route.strokeStyle ?? "solid",
    zIndex: route.zIndex ?? DEFAULT_POLYLINE_Z_INDEX,
    extData: {
      id: route.id,
      name: route.name,
      overlayType: "route",
    },
  };
}

function escapeMarkerLabelText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function truncateMarkerName(value: string, maxLength = 6) {
  const normalized = value.trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}...`;
}

function getStableHash(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function getAdminParentFillColor(parentAdcode: string | undefined, index: number) {
  const paletteIndex = parentAdcode
    ? getStableHash(parentAdcode) % ADMIN_PARENT_FILL_PALETTE.length
    : index % ADMIN_PARENT_FILL_PALETTE.length;

  return ADMIN_PARENT_FILL_PALETTE[paletteIndex]!;
}

export function buildAmapMarkerLabelContent(
  point: Pick<AmapMarkerPoint, "order" | "name">,
  active: boolean,
): string {
  const background = active ? "#2F3E34" : "rgba(255,253,247,0.96)";
  const color = active ? "#FFFDF7" : "#3D3127";
  const border = active ? "#2F3E34" : "#C9B6A7";
  const shadow = active ? "rgba(157,124,98,0.28)" : "rgba(201,182,167,0.38)";
  const badgeBackground = active ? "rgba(255,253,247,0.2)" : "#7A3F31";
  const badgeColor = "#FFFDF7";
  const label = escapeMarkerLabelText(truncateMarkerName(point.name));
  const scale = active ? "1.04" : "1";

  return `<span style="display:inline-flex;align-items:center;gap:6px;max-width:148px;padding:6px 10px;border-radius:999px;border:1px solid ${border};background:${background};color:${color};font-size:12px;font-weight:700;line-height:1;box-shadow:0 10px 20px ${shadow};transform:scale(${scale});transform-origin:center;white-space:nowrap;"><span style="display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;padding:0 6px;border-radius:999px;background:${badgeBackground};color:${badgeColor};font-size:11px;font-weight:800;">${point.order}</span><span style="overflow:hidden;text-overflow:ellipsis;">${label}</span></span>`;
}

export function buildAmapPlaceLabelContent(
  point: Pick<AmapMarkerPoint, "name">,
  active: boolean,
): string {
  const label = escapeMarkerLabelText(truncateMarkerName(point.name, active ? 10 : 7));
  const background = active ? "rgba(18,17,14,0.9)" : "rgba(18,17,14,0.82)";
  const border = active ? "rgba(230,185,105,0.76)" : "rgba(210,165,83,0.55)";
  const shadow = active
    ? "0 0 16px rgba(230,185,105,0.28),0 5px 12px rgba(0,0,0,0.34)"
    : "0 4px 10px rgba(0,0,0,0.28)";

  return `<span style="display:inline-flex;align-items:center;max-width:128px;padding:4px 8px;border-radius:999px;border:1px solid ${border};background:${background};color:#fff4d6;font-size:12px;font-weight:700;line-height:1.1;letter-spacing:0;box-shadow:${shadow};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none;backdrop-filter:blur(4px);">${label}</span>`;
}

export function buildAmapMarkerIconContent(
  point: Pick<AmapMarkerPoint, "iconUrl" | "iconAlt" | "name">,
  active: boolean,
): string {
  const iconUrl = escapeMarkerLabelText(point.iconUrl ?? "");
  const alt = escapeMarkerLabelText(point.iconAlt ?? point.name);
  const scale = active ? 1.12 : 1;
  const glow = active
    ? "0 0 14px rgba(230,185,105,0.45)"
    : "0 5px 10px rgba(0,0,0,0.32)";

  return `<span style="display:flex;align-items:center;justify-content:center;width:34px;height:42px;transform:scale(${scale});transform-origin:50% 100%;filter:drop-shadow(${glow});pointer-events:auto;"><img src="${iconUrl}" alt="${alt}" style="display:block;width:34px;height:42px;object-fit:contain;user-select:none;pointer-events:none;" /></span>`;
}

export function buildAmapDotMarkerContent(
  point: Pick<AmapMarkerPoint, "markerTone" | "name">,
  active: boolean,
): string {
  const tone = point.markerTone ?? "attraction";
  const palette: Record<NonNullable<AmapMarkerPoint["markerTone"]>, {
    fill: string;
    border: string;
    glow: string;
  }> = {
    attraction: {
      fill: "rgba(28,25,18,0.92)",
      border: "rgba(210,165,83,0.82)",
      glow: "rgba(210,165,83,0.24)",
    },
    food: {
      fill: "rgba(46,31,22,0.92)",
      border: "rgba(218,132,69,0.82)",
      glow: "rgba(218,132,69,0.24)",
    },
    hotel: {
      fill: "rgba(25,30,34,0.92)",
      border: "rgba(132,168,190,0.82)",
      glow: "rgba(132,168,190,0.2)",
    },
    transport: {
      fill: "rgba(24,31,30,0.92)",
      border: "rgba(126,184,154,0.82)",
      glow: "rgba(126,184,154,0.2)",
    },
    favorite: {
      fill: "rgba(42,31,17,0.94)",
      border: "rgba(230,185,105,0.9)",
      glow: "rgba(230,185,105,0.32)",
    },
  };
  const colors = palette[tone];
  const size = active ? 14 : 10;
  const innerSize = active ? 6 : 4;
  const label = escapeMarkerLabelText(point.name);

  return `<span aria-label="${label}" style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:999px;border:1px solid ${colors.border};background:${colors.fill};box-shadow:0 0 0 2px rgba(10,8,4,0.32),0 0 ${active ? 14 : 8}px ${colors.glow};transform:translateY(-1px);pointer-events:auto;"><span style="display:block;width:${innerSize}px;height:${innerSize}px;border-radius:999px;background:${colors.border};box-shadow:0 0 5px ${colors.glow};"></span></span>`;
}

function buildAmapMarkerLabelOption(
  point: AmapMarkerPoint,
  active: boolean,
): AMapMarkerLabel {
  return {
    content: point.iconUrl || point.markerVariant === "dot"
      ? buildAmapPlaceLabelContent(point, active)
      : buildAmapMarkerLabelContent(point, active),
    direction: "top",
    offset: point.iconUrl || point.markerVariant === "dot" ? [0, -6] : [0, -2],
  };
}

export function createAmapMapInstance(
  amap: AMapGlobal,
  container: HTMLElement,
  config: AmapBaseMapConfig = {},
): AMapMapInstance | null {
  if (typeof amap.Map !== "function") {
    return null;
  }

  return new amap.Map(container, buildAmapMapOptions(config));
}

export function createAmapMarkerInstances(
  amap: AMapGlobal,
  map: AMapMapInstance,
  points: AmapMarkerPoint[],
  options: CreateAmapMarkerLayerOptions = {},
): AMapMarkerInstance[] {
  if (typeof amap.Marker !== "function") {
    return [];
  }

  const markers: AMapMarkerInstance[] = [];
  const markerLabel = options.markerLabel ?? true;

  for (const point of points) {
    try {
      const active = options.activePointId === point.id;
      const marker = new amap.Marker(
        buildAmapMarkerOptions(point, markerLabel, active),
      );
      marker.setMap(map);
      marker.setzIndex?.(point.zIndex ?? (active ? ACTIVE_MARKER_Z_INDEX : DEFAULT_MARKER_Z_INDEX));
      if (markerLabel && point.showLabel === false) {
        marker.on?.("mouseover", () => {
          marker.setzIndex?.(HOVER_MARKER_Z_INDEX);
          if (point.iconUrl) {
            marker.setContent?.(buildAmapMarkerIconContent(point, true));
          } else if (point.markerVariant === "dot") {
            marker.setContent?.(buildAmapDotMarkerContent(point, true));
          }
          marker.setLabel?.(buildAmapMarkerLabelOption(point, active));
        });
        marker.on?.("mouseout", () => {
          marker.setzIndex?.(point.zIndex ?? (active ? ACTIVE_MARKER_Z_INDEX : DEFAULT_MARKER_Z_INDEX));
          if (point.iconUrl) {
            marker.setContent?.(buildAmapMarkerIconContent(point, active));
          } else if (point.markerVariant === "dot") {
            marker.setContent?.(buildAmapDotMarkerContent(point, active));
          }
          marker.setLabel?.({
            content: "",
            direction: "top",
            offset: [0, 0],
          });
        });
      }
      marker.on?.("click", () => {
        options.onMarkerClick?.(point.id);
      });
      markers.push(marker);
    } catch {
      continue;
    }
  }

  return markers;
}

export function createAmapRegionLabelInstances(
  amap: AMapGlobal,
  map: AMapMapInstance,
  labels: AmapRegionLabel[],
): AMapMarkerInstance[] {
  if (typeof amap.Marker !== "function") {
    return [];
  }

  const markers: AMapMarkerInstance[] = [];

  for (const label of labels) {
    try {
      const marker = new amap.Marker(buildAmapRegionLabelOptions(label));
      marker.setMap(map);
      marker.setzIndex?.(label.zIndex ?? 130);
      markers.push(marker);
    } catch {
      continue;
    }
  }

  return markers;
}

export function createAmapPolygonInstances(
  amap: AMapGlobal,
  map: AMapMapInstance,
  regions: AmapPolygonRegion[],
  options: CreateAmapPolygonLayerOptions = {},
): AMapPolygonInstance[] {
  if (typeof amap.Polygon !== "function") {
    return [];
  }

  const polygons: AMapPolygonInstance[] = [];

  for (const region of regions) {
    for (const path of region.paths) {
      if (path.length < 3) {
        continue;
      }

      try {
        const polygon = new amap.Polygon(buildAmapPolygonOptions(region, path));
        polygon.setMap(map);
        if (region.interactive !== false) {
          polygon.on?.("click", () => {
            options.onPolygonClick?.(region.id);
          });
          polygon.on?.("mouseover", () => {
            options.onPolygonMouseEnter?.(region.id);
          });
          polygon.on?.("mouseout", () => {
            options.onPolygonMouseLeave?.(region.id);
          });
        }
        polygons.push(polygon);
      } catch {
        continue;
      }
    }
  }

  return polygons;
}

export function createAmapPolylineInstances(
  amap: AMapGlobal,
  map: AMapMapInstance,
  routes: AmapPolylineRoute[],
  options: CreateAmapPolylineLayerOptions = {},
): AMapPolylineInstance[] {
  if (typeof amap.Polyline !== "function") {
    return [];
  }

  const polylines: AMapPolylineInstance[] = [];

  for (const route of routes) {
    if (route.path.length < 2) {
      continue;
    }

    try {
      const polyline = new amap.Polyline(buildAmapPolylineOptions(route));
      polyline.setMap(map);
      polyline.on?.("click", () => {
        options.onPolylineClick?.(route.id);
      });
      polylines.push(polyline);
    } catch {
      continue;
    }
  }

  return polylines;
}

export function createAmapTrafficLayer(
  amap: AMapGlobal,
  map: AMapMapInstance,
  opacity = 0.45,
): AMapTrafficLayerInstance | null {
  const TrafficLayer = amap.TileLayer?.Traffic ?? amap.TrafficLayer;

  if (typeof TrafficLayer !== "function") {
    return null;
  }

  try {
    const trafficLayer = new TrafficLayer({
      zIndex: 65,
      opacity,
      autoRefresh: true,
    });
    trafficLayer.setOpacity?.(opacity);
    trafficLayer.setMap(map);
    return trafficLayer;
  } catch {
    return null;
  }
}

function parseBoundaryPoint(
  point: AMapDistrictSearchDistrict["center"] | undefined,
): MapCenter | null {
  if (!point) {
    return null;
  }

  if (typeof point === "string") {
    const [lngText, latText] = point.split(",");
    const lng = Number(lngText);
    const lat = Number(latText);
    return isValidMapCenter({ lat, lng }) ? { lat, lng } : null;
  }

  if (Array.isArray(point)) {
    const [lng, lat] = point;
    const center = { lat, lng };
    return isValidMapCenter(center) ? center : null;
  }

  const lng = typeof point.getLng === "function" ? point.getLng() : point.lng;
  const lat = typeof point.getLat === "function" ? point.getLat() : point.lat;
  const center = { lat, lng };
  return isValidMapCenter(center) ? center : null;
}

export function parseAmapMapCenter(
  point: ReturnType<NonNullable<AMapMapInstance["getCenter"]>> | undefined,
): MapCenter | null {
  return parseBoundaryPoint(point);
}

export function parseAmapMapBounds(
  bounds: AMapBoundsInstance | MapBounds | undefined,
): MapBounds | null {
  if (!bounds) {
    return null;
  }

  if (
    "minLat" in bounds &&
    "maxLat" in bounds &&
    "minLng" in bounds &&
    "maxLng" in bounds
  ) {
    const parsed = {
      minLat: Number(bounds.minLat),
      maxLat: Number(bounds.maxLat),
      minLng: Number(bounds.minLng),
      maxLng: Number(bounds.maxLng),
    };
    return isValidMapBounds(parsed) ? normalizeMapBounds(parsed) : null;
  }

  const southWest = parseBoundaryPoint(bounds.getSouthWest?.());
  const northEast = parseBoundaryPoint(bounds.getNorthEast?.());

  if (!southWest || !northEast) {
    return null;
  }

  return normalizeMapBounds({
    minLat: southWest.lat,
    maxLat: northEast.lat,
    minLng: southWest.lng,
    maxLng: northEast.lng,
  });
}

function parseBoundaryPath(
  path: NonNullable<AMapDistrictSearchDistrict["boundaries"]>[number],
): MapCenter[] {
  return path
    .map((point) => parseBoundaryPoint(point))
    .filter((point): point is MapCenter => Boolean(point));
}

function getDistrictCandidates(
  result: AMapDistrictSearchResult | string,
): AMapDistrictSearchDistrict[] {
  if (typeof result === "string") {
    return [];
  }

  const roots = result.districtList ?? [];

  return roots.flatMap((district) => {
    const children = district.districtList ?? [];
    return children.length > 0 ? children : [district];
  });
}

function findMatchingDistrictCandidate(
  candidates: AMapDistrictSearchDistrict[],
  child: AMapDistrictSearchDistrict,
) {
  return (
    candidates.find(
      (candidate) =>
        Boolean(child.adcode) && candidate.adcode === child.adcode,
    ) ??
    candidates.find(
      (candidate) => Boolean(child.name) && candidate.name === child.name,
    ) ??
    candidates[0]
  );
}

function getParentDistrictChildren(
  result: AMapDistrictSearchResult | string,
): AMapDistrictSearchDistrict[] {
  if (typeof result === "string") {
    return [];
  }

  return (result.districtList ?? []).flatMap((district) =>
    district.districtList ?? [],
  );
}

export function getAdministrativeBoundaryCacheKey(
  query: Pick<AmapAdministrativeBoundaryQuery, "adcode" | "targetLevel" | "parentAdcodes" | "viewportTileKey">,
) {
  const viewportQuery = query as Pick<
    AmapAdministrativeBoundaryQuery,
    "targetLevel" | "viewportTileKey"
  >;

  if (viewportQuery.viewportTileKey) {
    return `admin:${normalizeAdminBoundaryCacheLevel(query.targetLevel)}:${viewportQuery.viewportTileKey}`;
  }

  const parentAdcodes = query.parentAdcodes
    ?.filter((adcode) => /^\d{6}$/.test(adcode))
    .filter((adcode, index, list) => list.indexOf(adcode) === index)
    .sort();

  if (!query.viewportTileKey && parentAdcodes && parentAdcodes.length > 1) {
    return `admin:multi:${normalizeAdminBoundaryCacheLevel(query.targetLevel)}:${parentAdcodes.join(",")}`;
  }

  return getAdminBoundaryCacheKey(query.adcode, query.targetLevel);
}

export function getAdministrativeBoundaryDisplayCacheKey(
  query: Pick<AmapAdministrativeBoundaryQuery, "adcode" | "targetLevel" | "parentAdcodes" | "viewportTileKey">,
  displayMode: AmapCoordinateDisplayMode,
) {
  return `${getAdministrativeBoundaryCacheKey(query)}:${displayMode}`;
}

const inflightAdministrativeBoundaryRequests = new Map<
  string,
  Promise<AdminBoundaryCacheEntry>
>();
const administrativeRegionLookup = new Map<
  string,
  LoadedAdministrativeBoundaryRegion
>();

export function clearAdministrativeBoundaryRuntimeCache() {
  clearMemoryAdminBoundaryCache();
  inflightAdministrativeBoundaryRequests.clear();
  administrativeRegionLookup.clear();
  adminBoundaryRenderCache.clear();
  adminBoundaryDisplayTransformCache.clear();
  adminBoundaryTopologyCache.clear();
  clearAdminLabelPlacementCache();
}

export function setAdministrativeBoundaryPersistentCacheAdapterForTests(
  adapter: AdminBoundaryPersistentCacheAdapter | null,
) {
  setAdminBoundaryPersistentCacheAdapter(adapter);
}

export function hasAdministrativeBoundaryCache(
  query: Pick<AmapAdministrativeBoundaryQuery, "adcode" | "targetLevel" | "parentAdcodes" | "viewportTileKey">,
) {
  if ((query as AmapAdministrativeBoundaryQuery).viewportTileKey) {
    return hasMemoryAdminBoundary(getAdministrativeBoundaryCacheKey(query));
  }

  if (query.parentAdcodes && query.parentAdcodes.length > 1) {
    return query.parentAdcodes.every((adcode) =>
      hasMemoryAdminBoundary(getAdminBoundaryCacheKey(adcode, query.targetLevel)),
    );
  }

  return hasMemoryAdminBoundary(getAdministrativeBoundaryCacheKey(query));
}

function hasAdministrativeBoundaryCacheOrInflight(
  query: Pick<AmapAdministrativeBoundaryQuery, "adcode" | "targetLevel" | "parentAdcodes" | "viewportTileKey">,
) {
  if ((query as AmapAdministrativeBoundaryQuery).viewportTileKey) {
    const cacheKey = getAdministrativeBoundaryCacheKey(query);

    return (
      hasMemoryAdminBoundary(cacheKey) ||
      inflightAdministrativeBoundaryRequests.has(cacheKey)
    );
  }

  if (query.parentAdcodes && query.parentAdcodes.length > 1) {
    return query.parentAdcodes.every((adcode) => {
      const parentCacheKey = getAdminBoundaryCacheKey(adcode, query.targetLevel);

      return (
        hasMemoryAdminBoundary(parentCacheKey) ||
        inflightAdministrativeBoundaryRequests.has(parentCacheKey)
      );
    });
  }

  const cacheKey = getAdministrativeBoundaryCacheKey(query);

  return (
    hasMemoryAdminBoundary(cacheKey) ||
    inflightAdministrativeBoundaryRequests.has(cacheKey)
  );
}

function getFeatureBbox(boundaries: MapCenter[][]): MapBounds | null {
  const points = boundaries.flat();

  if (points.length === 0) {
    return null;
  }

  return normalizeMapBounds(
    points.reduce<MapBounds>(
      (bounds, point) => ({
        minLat: Math.min(bounds.minLat, point.lat),
        maxLat: Math.max(bounds.maxLat, point.lat),
        minLng: Math.min(bounds.minLng, point.lng),
        maxLng: Math.max(bounds.maxLng, point.lng),
      }),
      {
        minLat: points[0]!.lat,
        maxLat: points[0]!.lat,
        minLng: points[0]!.lng,
        maxLng: points[0]!.lng,
      },
    ),
  );
}

interface AdminBoundaryRenderStats {
  rawFeatureCount: number;
  viewportFilteredFeatureCount: number;
  rawRingCount: number;
  filteredRingCount: number;
  rawPointCount: number;
  simplifiedPointCount: number;
}

interface PreparedAdminBoundaryRenderRegions {
  regions: LoadedAdministrativeBoundaryRegion[];
  stats: AdminBoundaryRenderStats;
}

function getAdminBoundaryRenderZoomBucket(zoom: number | undefined) {
  if (!Number.isFinite(zoom)) {
    return 0;
  }

  return Math.max(0, Math.min(18, Math.round(Number(zoom) * 2) / 2));
}

function getAdminBoundaryRenderCacheKey(input: {
  regionId: string;
  parentAdcode: string;
  targetLevel: AmapAdministrativeLevel;
  zoomBucket: number;
  displayMode?: AmapCoordinateDisplayMode;
}) {
  return `admin:${input.parentAdcode}:${normalizeAdminBoundaryCacheLevel(input.targetLevel)}:${input.displayMode ?? "raw"}:z${input.zoomBucket}:${input.regionId}`;
}

function rememberAdminBoundaryRenderCache(cacheKey: string, boundaries: MapCenter[][]) {
  if (adminBoundaryRenderCache.has(cacheKey)) {
    adminBoundaryRenderCache.delete(cacheKey);
  }

  adminBoundaryRenderCache.set(cacheKey, boundaries);

  while (adminBoundaryRenderCache.size > ADMIN_BOUNDARY_RENDER_CACHE_LIMIT) {
    const oldestKey = adminBoundaryRenderCache.keys().next().value as string | undefined;

    if (!oldestKey) {
      break;
    }

    adminBoundaryRenderCache.delete(oldestKey);
  }
}

function countAdminBoundaryPathPoints(boundaries: MapCenter[][]) {
  return boundaries.reduce((count, path) => count + path.length, 0);
}

function getAdminBoundaryRegionBbox(region: LoadedAdministrativeBoundaryRegion) {
  return region.bbox ?? getFeatureBbox(region.boundaries);
}

function shouldRenderAdminBoundaryRegionInViewport(
  region: LoadedAdministrativeBoundaryRegion,
  viewportBounds: MapBounds | null,
) {
  if (!viewportBounds) {
    return true;
  }

  const bbox = getAdminBoundaryRegionBbox(region);

  if (!bbox) {
    return true;
  }

  return getBoundsOverlapArea(viewportBounds, bbox) > 0;
}

function getAdminBoundarySimplifyTolerance(
  level: AmapAdministrativeLevel,
  zoom: number | undefined,
) {
  const safeZoom = Number.isFinite(zoom) ? Number(zoom) : 8;

  if (level === "province") {
    if (safeZoom <= 4.8) return 0.026;
    if (safeZoom <= 6.4) return 0.013;
    return 0.006;
  }

  if (level === "city") {
    if (safeZoom <= 6.8) return 0.008;
    if (safeZoom <= 8.8) return 0.004;
    return 0.0018;
  }

  if (safeZoom <= 9.4) return 0.0026;
  if (safeZoom <= 11.2) return 0.0011;
  return 0.00045;
}

function getMinimumAdminBoundaryRingArea(
  level: AmapAdministrativeLevel,
  zoom: number | undefined,
) {
  const safeZoom = Number.isFinite(zoom) ? Number(zoom) : 8;

  if (level === "province") {
    return safeZoom <= 5.2 ? 0.0035 : 0.00075;
  }

  if (level === "city") {
    return safeZoom <= 7.2 ? 0.001 : 0.00016;
  }

  if (safeZoom <= 9.4) return 0.00006;
  if (safeZoom <= 11.2) return 0.000018;
  return 0.000003;
}

function getPointSegmentDistanceSquared(
  point: MapCenter,
  start: MapCenter,
  end: MapCenter,
) {
  const dx = end.lng - start.lng;
  const dy = end.lat - start.lat;

  if (dx === 0 && dy === 0) {
    const pointDx = point.lng - start.lng;
    const pointDy = point.lat - start.lat;
    return pointDx * pointDx + pointDy * pointDy;
  }

  const t = Math.max(
    0,
    Math.min(1, ((point.lng - start.lng) * dx + (point.lat - start.lat) * dy) / (dx * dx + dy * dy)),
  );
  const projectedLng = start.lng + t * dx;
  const projectedLat = start.lat + t * dy;
  const pointDx = point.lng - projectedLng;
  const pointDy = point.lat - projectedLat;

  return pointDx * pointDx + pointDy * pointDy;
}

function simplifyAdminBoundaryPath(
  path: MapCenter[],
  tolerance: number,
): MapCenter[] {
  if (path.length <= 4 || tolerance <= 0) {
    return path;
  }

  const first = path[0]!;
  const last = path[path.length - 1]!;
  const isClosed = first.lat === last.lat && first.lng === last.lng;
  const source = isClosed ? path.slice(0, -1) : path;

  if (source.length <= 3) {
    return path;
  }

  const keep = new Array<boolean>(source.length).fill(false);
  keep[0] = true;
  keep[source.length - 1] = true;
  const toleranceSquared = tolerance * tolerance;
  const stack: Array<[number, number]> = [[0, source.length - 1]];

  while (stack.length > 0) {
    const [startIndex, endIndex] = stack.pop()!;
    let maxDistanceSquared = 0;
    let splitIndex = startIndex;

    for (let index = startIndex + 1; index < endIndex; index += 1) {
      const distanceSquared = getPointSegmentDistanceSquared(
        source[index]!,
        source[startIndex]!,
        source[endIndex]!,
      );

      if (distanceSquared > maxDistanceSquared) {
        maxDistanceSquared = distanceSquared;
        splitIndex = index;
      }
    }

    if (maxDistanceSquared > toleranceSquared) {
      keep[splitIndex] = true;
      stack.push([startIndex, splitIndex], [splitIndex, endIndex]);
    }
  }

  const simplified = source.filter((_point, index) => keep[index]);

  if (simplified.length < 3) {
    return path;
  }

  return isClosed ? [...simplified, simplified[0]!] : simplified;
}

function prepareAdminBoundaryRegionBoundariesForRender(
  region: LoadedAdministrativeBoundaryRegion,
  level: AmapAdministrativeLevel,
  zoom: number | undefined,
  parentAdcode: string,
  displayMode: AmapCoordinateDisplayMode = "raw",
) {
  const zoomBucket = getAdminBoundaryRenderZoomBucket(zoom);
  const cacheKey = getAdminBoundaryRenderCacheKey({
    regionId: region.adcode ?? region.id,
    parentAdcode,
    targetLevel: level,
    zoomBucket,
    displayMode,
  });
  const cached = adminBoundaryRenderCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const minRingArea = getMinimumAdminBoundaryRingArea(level, zoom);
  const largestRing = getLargestBoundaryRing(region.boundaries);
  const tolerance = getAdminBoundarySimplifyTolerance(level, zoom);
  const filtered = region.boundaries
    .filter((path) => {
      if (path.length < 3) {
        return false;
      }

      if (path === largestRing) {
        return true;
      }

      return Math.abs(getPolygonSignedArea(path)) >= minRingArea;
    })
    .map((path) => simplifyAdminBoundaryPath(path, tolerance))
    .filter((path) => path.length >= 3);

  const boundaries = filtered.length > 0
    ? filtered
    : largestRing
      ? [simplifyAdminBoundaryPath(largestRing, tolerance)]
      : [];

  rememberAdminBoundaryRenderCache(cacheKey, boundaries);
  return boundaries;
}

export function prepareAdminBoundaryRegionsForRender(
  regions: LoadedAdministrativeBoundaryRegion[],
  input: {
    targetLevel: AmapAdministrativeLevel;
    parentAdcode: string;
    zoom?: number;
    bounds?: MapBounds | null;
    viewportPaddingRatio?: number;
    viewportTileKey?: string | null;
    displayMode?: AmapCoordinateDisplayMode;
  },
): PreparedAdminBoundaryRenderRegions {
  const renderBounds = input.bounds
    ? expandMapBounds(input.bounds, input.viewportPaddingRatio ?? 0.2)
    : null;
  const labelBounds = input.bounds ? normalizeMapBounds(input.bounds) : renderBounds;
  const stats: AdminBoundaryRenderStats = {
    rawFeatureCount: regions.length,
    viewportFilteredFeatureCount: 0,
    rawRingCount: 0,
    filteredRingCount: 0,
    rawPointCount: 0,
    simplifiedPointCount: 0,
  };
  const preparedRegions: LoadedAdministrativeBoundaryRegion[] = [];

  for (const region of regions) {
    stats.rawRingCount += region.boundaries.length;
    stats.rawPointCount += countAdminBoundaryPathPoints(region.boundaries);

    if (!shouldRenderAdminBoundaryRegionInViewport(region, renderBounds)) {
      continue;
    }

    const boundaries = prepareAdminBoundaryRegionBoundariesForRender(
      region,
      input.targetLevel,
      input.zoom,
      region.parentAdcode ?? input.parentAdcode,
      "raw",
    );

    if (boundaries.length === 0) {
      continue;
    }

    stats.viewportFilteredFeatureCount += 1;
    stats.filteredRingCount += boundaries.length;
    stats.simplifiedPointCount += countAdminBoundaryPathPoints(boundaries);
    const bbox = region.bbox ?? getFeatureBbox(boundaries);
    const labelPlacement = getRepresentativeLabelPoint(
      {
        adcode: region.adcode ?? region.id,
        name: region.name,
        level: region.level ?? input.targetLevel,
        center: region.center,
        labelPosition: region.labelPosition ?? null,
        bbox,
        boundaries,
      },
      labelBounds,
      {
        viewportTileKey: input.viewportTileKey,
        displayMode: input.displayMode ?? "raw",
      },
    );
    const labelPosition = labelPlacement.point;

    preparedRegions.push({
      ...region,
      boundaries,
      bbox,
      labelPosition,
      labelPositionSource: labelPlacement.strategy,
      labelPlacement: {
        strategy: labelPlacement.strategy,
        originalLabelPoint: labelPlacement.diagnostics.originalLabelPoint,
        finalLabelPoint: labelPlacement.diagnostics.finalLabelPoint,
        inViewport: labelPlacement.diagnostics.inViewport,
        inPolygon: labelPlacement.diagnostics.inPolygon,
        isMultiPolygon: labelPlacement.diagnostics.isMultiPolygon,
      },
    });
  }

  return {
    regions: preparedRegions,
    stats,
  };
}

function createAdministrativeCacheEntry(
  result: LoadedAdministrativeBoundaries,
): AdminBoundaryCacheEntry {
  return {
    parentAdcode: result.query.adcode,
    parentName: result.query.keyword,
    targetLevel: result.query.targetLevel,
    source: "amap_district_search",
    fetchedAt: result.fetchedAt,
    features: result.regions.map((region) => ({
      adcode: region.adcode,
      name: region.name,
      level: region.level,
      parentAdcode: result.query.adcode,
      center: region.center,
      labelPosition: region.labelPosition,
      labelPositionSource: region.labelPositionSource,
      boundaries: region.boundaries,
      bbox: getFeatureBbox(region.boundaries),
    })),
  };
}

function getAdminBoundaryApiLevel(targetLevel: AmapAdministrativeLevel): AdminBoundaryApiLevel {
  return normalizeAdminBoundaryCacheLevel(targetLevel);
}

function mapDataHubLevelToAdministrativeLevel(
  level: AdminBoundaryClientFeature["level"],
): AmapAdministrativeLevel {
  if (level === "prefecture") return "city";
  if (level === "county") return "district";
  return "province";
}

function tupleToMapCenter(tuple: [number, number] | null | undefined): MapCenter | null {
  if (!tuple) return null;
  const [lng, lat] = tuple;
  return Number.isFinite(lng) && Number.isFinite(lat) ? { lat, lng } : null;
}

function bboxTupleToMapBounds(
  bbox: [number, number, number, number] | null | undefined,
): MapBounds | null {
  if (!bbox) return null;
  const [minLng, minLat, maxLng, maxLat] = bbox;
  return normalizeMapBounds({ minLat, maxLat, minLng, maxLng });
}

function parseGeoJsonPosition(value: unknown): MapCenter | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const [lng, lat] = value;
  return typeof lng === "number" && typeof lat === "number" && Number.isFinite(lng) && Number.isFinite(lat)
    ? { lat, lng }
    : null;
}

function parseGeoJsonLinearRing(value: unknown): MapCenter[] {
  if (!Array.isArray(value)) return [];
  const path = value
    .map(parseGeoJsonPosition)
    .filter((point): point is MapCenter => point !== null);

  if (path.length < 3) {
    return [];
  }

  const first = path[0]!;
  const last = path[path.length - 1]!;

  return first.lat === last.lat && first.lng === last.lng
    ? path
    : [...path, first];
}

function parseGeoJsonOuterRing(value: unknown): MapCenter[] {
  if (!Array.isArray(value) || value.length === 0) {
    return [];
  }

  return parseGeoJsonLinearRing(value[0]);
}

function geoJsonGeometryToBoundaryPaths(
  geometry: AdminBoundaryClientFeature["geometry"],
): MapCenter[][] {
  if (!geometry) return [];

  if (geometry.type === "Polygon") {
    const coordinates = (geometry as { coordinates?: unknown }).coordinates;
    if (!Array.isArray(coordinates)) return [];
    return [parseGeoJsonOuterRing(coordinates)]
      .filter((path) => path.length >= 3);
  }

  if (geometry.type === "MultiPolygon") {
    const coordinates = (geometry as { coordinates?: unknown }).coordinates;
    if (!Array.isArray(coordinates)) return [];
    return coordinates
      .map(parseGeoJsonOuterRing)
      .filter((path) => path.length >= 3);
  }

  return [];
}

function dataHubFeatureToCacheFeature(
  query: AmapAdministrativeBoundaryQuery,
  feature: AdminBoundaryClientFeature,
): AdminBoundaryCacheFeature | null {
  const boundaries = geoJsonGeometryToBoundaryPaths(feature.geometry);

  if (boundaries.length === 0) {
    return null;
  }

  const center = tupleToMapCenter(feature.center);
  const dataHubLabelPoint = tupleToMapCenter(feature.labelPoint);
  const resolvedLabel = dataHubLabelPoint
    ? { position: dataHubLabelPoint, source: "district-center" as const }
    : resolveBoundaryLabelPosition(boundaries, center);

  return {
    adcode: feature.adcode,
    name: feature.name,
    level: mapDataHubLevelToAdministrativeLevel(feature.level),
    parentAdcode: feature.parentAdcode ?? query.adcode,
    center,
    labelPosition: resolvedLabel.position,
    labelPositionSource: dataHubLabelPoint ? "district-center" : resolvedLabel.source,
    boundaries,
    bbox: bboxTupleToMapBounds(feature.bbox) ?? getFeatureBbox(boundaries),
  };
}

function createAdministrativeCacheEntryFromDataHub(
  query: AmapAdministrativeBoundaryQuery,
  result: AdminBoundaryClientResult,
): AdminBoundaryCacheEntry | null {
  const features = result.features
    .map((feature) => dataHubFeatureToCacheFeature(query, feature))
    .filter((feature): feature is AdminBoundaryCacheFeature => feature !== null);

  if (result.count === 0 || features.length === 0) {
    return null;
  }

  return {
    parentAdcode: query.adcode,
    parentName: query.keyword,
    targetLevel: query.targetLevel,
    source: "datahub",
    fetchedAt: result.sourceSummary.generatedAt || new Date().toISOString(),
    features,
  };
}

function createLoadedAdministrativeBoundariesFromCache(
  query: AmapAdministrativeBoundaryQuery,
  entry: AdminBoundaryCacheEntry,
  cacheSource: NonNullable<LoadedAdministrativeBoundaries["cacheSource"]>,
  isStale = false,
): LoadedAdministrativeBoundaries {
  const regions: LoadedAdministrativeBoundaryRegion[] = entry.features.map(
    (feature, index) => ({
      id: `admin-${feature.adcode ?? `${entry.parentAdcode}-${index}`}`,
      name: feature.name,
      adcode: feature.adcode,
      level: feature.level ?? entry.targetLevel,
      parentAdcode: feature.parentAdcode ?? entry.parentAdcode,
      center: feature.center,
      labelPosition: feature.labelPosition,
      labelPositionSource: feature.labelPositionSource,
      bbox: feature.bbox,
      boundaries: feature.boundaries,
    }),
  );

  rememberAdministrativeRegions(regions);

  return {
    query,
    regions,
    boundariesCount: regions.reduce(
      (count, region) => count + region.boundaries.length,
      0,
    ),
    fetchedAt: entry.fetchedAt,
    source: "admin_boundary_cache",
    cacheSource,
    cacheHit: true,
    isStale,
  };
}

async function readAdministrativeBoundaryPersistentCache(cacheKey: string) {
  return getPersistentAdminBoundary(cacheKey);
}

async function writeAdministrativeBoundaryPersistentCache(
  cacheKey: string,
  entry: AdminBoundaryCacheEntry,
) {
  await setPersistentAdminBoundary(cacheKey, entry);
}

function logAdminCache(input: {
  cacheKey: string;
  source: NonNullable<LoadedAdministrativeBoundaries["cacheSource"]>;
  hit: boolean;
  requestId?: number;
  targetLevel: AmapAdministrativeLevel;
  apiLevel?: AdminBoundaryApiLevel;
  parentAdcode: string;
  featureCount?: number;
  hasGeometryCount?: number;
  renderDelayMs?: number;
  ignoredStaleRequest?: boolean;
}) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.info("[MapStudio][AdminCache]", input);
}

function logAdminRender(input: {
  targetLevel: AmapAdministrativeLevel;
  parentAdcodes: string[];
  totalFeatures: number;
  childFeatureCount?: number;
  parentBoundaryOverlayCount?: number;
  grandparentBoundaryOverlayCount?: number;
  renderedPolygons?: number;
  renderedParentBoundaries?: number;
  renderedLabels?: number;
  polygonOverlayCount?: number;
  multiPolygonSplitCount?: number;
  ignoredInteriorRingCount?: number;
  staleOverlayCleared?: boolean;
  bboxQuery?: MapBounds | null;
}) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.info("[MapStudio][AdminRender]", input);
}

function logAdminRenderPerf(input: {
  targetLevel: AmapAdministrativeLevel;
  parentAdcodes: string[];
  rawFeatureCount: number;
  viewportFilteredFeatureCount: number;
  rawRingCount: number;
  filteredRingCount: number;
  simplifiedPointCount: number;
  renderedPolygonCount: number;
  renderedLabelCount: number;
  renderTimeMs: number;
  sourceBreakdown: Record<string, number>;
}) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.info("[MapStudio][AdminRenderPerf]", input);
}

function logAdminData(input: {
  targetLevel: AmapAdministrativeLevel;
  parentAdcode: string;
  apiLevel: AdminBoundaryApiLevel;
  requestedUrl?: string;
  count?: number;
  hasGeometryCount?: number;
  source: "datahub" | "amap";
}) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.info("[MapStudio][AdminData]", input);
}

function logAdminOverlayCleanup(input: {
  removedChildPolygons: number;
  removedParentBoundaries: number;
  removedGrandparentBoundaries: number;
  removedLabels: number;
  removedAdminPolygonCount?: number;
  removedAdminBoundaryLineCount?: number;
  removedAdminLabelCount?: number;
  staleRequestIgnored: boolean;
}) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.info("[MapStudio][AdminOverlayCleanup]", input);
}

export function createAdminLabelLifecycleDebug(input: {
  renderPassId?: number | null;
  targetLevel?: AmapAdministrativeLevel | null;
  labelKeys?: string[];
  labelCreatedCount?: number;
  labelRemovedCount?: number;
  labelRetainedCount?: number;
  pmtilesOnly?: boolean;
  skippedByPmtilesOnly?: boolean;
  staleLabelCleanupCount?: number;
}) {
  const labelKeys = input.labelKeys ?? [];
  const seen = new Set<string>();
  const duplicateLabelKeys = new Set<string>();

  for (const key of labelKeys) {
    if (seen.has(key)) {
      duplicateLabelKeys.add(key);
      continue;
    }

    seen.add(key);
  }

  return {
    renderPassId: input.renderPassId ?? null,
    targetLevel: input.targetLevel ?? null,
    labelCreatedCount: input.labelCreatedCount ?? labelKeys.length,
    labelRemovedCount: input.labelRemovedCount ?? 0,
    labelRetainedCount: input.labelRetainedCount ?? 0,
    duplicateLabelKeys: Array.from(duplicateLabelKeys),
    pmtilesOnly: Boolean(input.pmtilesOnly),
    skippedByPmtilesOnly: Boolean(input.skippedByPmtilesOnly),
    staleLabelCleanupCount: input.staleLabelCleanupCount ?? 0,
  };
}

export function logAdminLabelLifecycle(
  input: ReturnType<typeof createAdminLabelLifecycleDebug>,
) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.info("[AdminLabelLifecycle]", input);
}

const GUANGDONG_BOUNDS = {
  minLat: 20.0,
  maxLat: 25.6,
  minLng: 109.6,
  maxLng: 117.4,
};

const SHENZHEN_BOUNDS = {
  minLat: 22.38,
  maxLat: 22.88,
  minLng: 113.72,
  maxLng: 114.65,
};

const GUANGZHOU_BOUNDS = {
  minLat: 22.45,
  maxLat: 23.95,
  minLng: 112.9,
  maxLng: 114.1,
};

interface KnownAdminScope {
  keyword: string;
  adcode: string;
  level: "province" | "city";
  bounds: MapBounds;
}

const KNOWN_PROVINCE_SCOPES: KnownAdminScope[] = [
  {
    keyword: "北京市",
    adcode: "110000",
    level: "province",
    bounds: { minLat: 39.443493, maxLat: 41.058609, minLng: 115.413811, maxLng: 117.506111 },
  },
  {
    keyword: "天津市",
    adcode: "120000",
    level: "province",
    bounds: { minLat: 38.554333, maxLat: 40.244442, minLng: 116.700958, maxLng: 118.057182 },
  },
  {
    keyword: "河北省",
    adcode: "130000",
    level: "province",
    bounds: { minLat: 36.046318, maxLat: 42.614769, minLng: 113.458702, maxLng: 119.846687 },
  },
  {
    keyword: "山西省",
    adcode: "140000",
    level: "province",
    bounds: { minLat: 34.58395, maxLat: 40.743649, minLng: 110.229546, maxLng: 114.560417 },
  },
  {
    keyword: "内蒙古自治区",
    adcode: "150000",
    level: "province",
    bounds: { minLat: 37.4062, maxLat: 53.331169, minLng: 97.171951, maxLng: 126.076195 },
  },
  {
    keyword: "辽宁省",
    adcode: "210000",
    level: "province",
    bounds: { minLat: 38.723612, maxLat: 43.487659, minLng: 118.837997, maxLng: 125.783707 },
  },
  {
    keyword: "吉林省",
    adcode: "220000",
    level: "province",
    bounds: { minLat: 40.856209, maxLat: 46.301369, minLng: 121.636314, maxLng: 131.31076 },
  },
  {
    keyword: "黑龙江省",
    adcode: "230000",
    level: "province",
    bounds: { minLat: 43.422745, maxLat: 53.558498, minLng: 121.184319, maxLng: 135.087387 },
  },
  {
    keyword: "上海市",
    adcode: "310000",
    level: "province",
    bounds: { minLat: 30.694376, maxLat: 31.866154, minLng: 120.858162, maxLng: 122.113366 },
  },
  {
    keyword: "江苏省",
    adcode: "320000",
    level: "province",
    bounds: { minLat: 30.767185, maxLat: 35.141629, minLng: 116.353805, maxLng: 121.953827 },
  },
  {
    keyword: "浙江省",
    adcode: "330000",
    level: "province",
    bounds: { minLat: 27.167389, maxLat: 31.182732, minLng: 118.028267, maxLng: 122.833454 },
  },
  {
    keyword: "安徽省",
    adcode: "340000",
    level: "province",
    bounds: { minLat: 29.395222, maxLat: 34.654308, minLng: 114.875145, maxLng: 119.64444 },
  },
  {
    keyword: "福建省",
    adcode: "350000",
    level: "province",
    bounds: { minLat: 23.5732, maxLat: 28.31238, minLng: 115.848282, maxLng: 120.510591 },
  },
  {
    keyword: "江西省",
    adcode: "360000",
    level: "province",
    bounds: { minLat: 24.487042, maxLat: 30.080643, minLng: 113.573402, maxLng: 118.48101 },
  },
  {
    keyword: "山东省",
    adcode: "370000",
    level: "province",
    bounds: { minLat: 34.386589, maxLat: 38.400033, minLng: 114.804321, maxLng: 122.697691 },
  },
  {
    keyword: "河南省",
    adcode: "410000",
    level: "province",
    bounds: { minLat: 31.384459, maxLat: 36.374184, minLng: 110.353676, maxLng: 116.647011 },
  },
  {
    keyword: "湖北省",
    adcode: "420000",
    level: "province",
    bounds: { minLat: 29.036144, maxLat: 33.277546, minLng: 108.369858, maxLng: 116.129623 },
  },
  {
    keyword: "湖南省",
    adcode: "430000",
    level: "province",
    bounds: { minLat: 24.634426, maxLat: 30.128006, minLng: 108.783112, maxLng: 114.254105 },
  },
  {
    keyword: "广东省",
    adcode: "440000",
    level: "province",
    bounds: { minLat: 20.217582, maxLat: 25.520277, minLng: 109.664716, maxLng: 117.190669 },
  },
  {
    keyword: "广西壮族自治区",
    adcode: "450000",
    level: "province",
    bounds: { minLat: 21.018748, maxLat: 26.386391, minLng: 104.446538, maxLng: 112.0569 },
  },
  {
    keyword: "海南省",
    adcode: "460000",
    level: "province",
    bounds: { minLat: 3.832541, maxLat: 20.159826, minLng: 108.614708, maxLng: 117.861654 },
  },
  {
    keyword: "重庆市",
    adcode: "500000",
    level: "province",
    bounds: { minLat: 28.164127, maxLat: 32.212044, minLng: 105.287216, maxLng: 110.19043 },
  },
  {
    keyword: "四川省",
    adcode: "510000",
    level: "province",
    bounds: { minLat: 26.049925, maxLat: 34.316605, minLng: 97.357364, maxLng: 108.533817 },
  },
  {
    keyword: "贵州省",
    adcode: "520000",
    level: "province",
    bounds: { minLat: 24.623579, maxLat: 29.219164, minLng: 103.60009, maxLng: 109.592377 },
  },
  {
    keyword: "云南省",
    adcode: "530000",
    level: "province",
    bounds: { minLat: 21.144354, maxLat: 29.25112, minLng: 97.529114, maxLng: 106.194214 },
  },
  {
    keyword: "西藏自治区",
    adcode: "540000",
    level: "province",
    bounds: { minLat: 26.858273, maxLat: 36.483509, minLng: 78.39325, maxLng: 99.112312 },
  },
  {
    keyword: "陕西省",
    adcode: "610000",
    level: "province",
    bounds: { minLat: 31.712748, maxLat: 39.582336, minLng: 105.489327, maxLng: 111.245239 },
  },
  {
    keyword: "甘肃省",
    adcode: "620000",
    level: "province",
    bounds: { minLat: 32.593971, maxLat: 42.793419, minLng: 92.338059, maxLng: 108.707626 },
  },
  {
    keyword: "青海省",
    adcode: "630000",
    level: "province",
    bounds: { minLat: 31.600601, maxLat: 39.211571, minLng: 89.401306, maxLng: 103.071754 },
  },
  {
    keyword: "宁夏回族自治区",
    adcode: "640000",
    level: "province",
    bounds: { minLat: 35.235372, maxLat: 39.384422, minLng: 104.28405, maxLng: 107.660355 },
  },
  {
    keyword: "新疆维吾尔自治区",
    adcode: "650000",
    level: "province",
    bounds: { minLat: 34.336266, maxLat: 49.181408, minLng: 73.498962, maxLng: 96.386902 },
  },
  {
    keyword: "台湾省",
    adcode: "710000",
    level: "province",
    bounds: { minLat: 21.900952, maxLat: 25.960175, minLng: 119.418536, maxLng: 124.593807 },
  },
  {
    keyword: "香港特别行政区",
    adcode: "810000",
    level: "province",
    bounds: { minLat: 22.161088, maxLat: 22.562447, minLng: 113.841942, maxLng: 114.397203 },
  },
  {
    keyword: "澳门特别行政区",
    adcode: "820000",
    level: "province",
    bounds: { minLat: 22.112289, maxLat: 22.215623, minLng: 113.533296, maxLng: 113.589531 },
  },
];

const KNOWN_CITY_SCOPES: KnownAdminScope[] = [
  {
    keyword: "广州市",
    adcode: "440100",
    level: "city",
    bounds: GUANGZHOU_BOUNDS,
  },
  {
    keyword: "深圳市",
    adcode: "440300",
    level: "city",
    bounds: SHENZHEN_BOUNDS,
  },
  {
    keyword: "佛山市",
    adcode: "440600",
    level: "city",
    bounds: { minLat: 22.63, maxLat: 23.57, minLng: 112.38, maxLng: 113.43 },
  },
  {
    keyword: "东莞市",
    adcode: "441900",
    level: "city",
    bounds: { minLat: 22.65, maxLat: 23.15, minLng: 113.51, maxLng: 114.26 },
  },
  {
    keyword: "惠州市",
    adcode: "441300",
    level: "city",
    bounds: { minLat: 22.40, maxLat: 24.38, minLng: 113.82, maxLng: 115.47 },
  },
  {
    keyword: "珠海市",
    adcode: "440400",
    level: "city",
    bounds: { minLat: 21.79, maxLat: 22.46, minLng: 113.03, maxLng: 114.31 },
  },
  {
    keyword: "中山市",
    adcode: "442000",
    level: "city",
    bounds: { minLat: 22.17, maxLat: 22.78, minLng: 113.15, maxLng: 113.80 },
  },
  {
    keyword: "江门市",
    adcode: "440700",
    level: "city",
    bounds: { minLat: 21.45, maxLat: 22.85, minLng: 111.98, maxLng: 113.27 },
  },
  {
    keyword: "肇庆市",
    adcode: "441200",
    level: "city",
    bounds: { minLat: 22.75, maxLat: 24.40, minLng: 111.35, maxLng: 113.88 },
  },
  {
    keyword: "厦门市",
    adcode: "350200",
    level: "city",
    bounds: { minLat: 24.25, maxLat: 24.95, minLng: 117.80, maxLng: 118.50 },
  },
  {
    keyword: "泉州市",
    adcode: "350500",
    level: "city",
    bounds: { minLat: 24.40, maxLat: 25.95, minLng: 117.55, maxLng: 119.05 },
  },
  {
    keyword: "漳州市",
    adcode: "350600",
    level: "city",
    bounds: { minLat: 23.55, maxLat: 25.25, minLng: 116.90, maxLng: 118.25 },
  },
  {
    keyword: "杭州市",
    adcode: "330100",
    level: "city",
    bounds: { minLat: 29.15, maxLat: 30.65, minLng: 118.35, maxLng: 120.75 },
  },
  {
    keyword: "成都市",
    adcode: "510100",
    level: "city",
    bounds: { minLat: 30.05, maxLat: 31.45, minLng: 102.90, maxLng: 104.90 },
  },
  {
    keyword: "南京市",
    adcode: "320100",
    level: "city",
    bounds: { minLat: 31.20, maxLat: 32.65, minLng: 118.35, maxLng: 119.25 },
  },
  {
    keyword: "北京市",
    adcode: "110000",
    level: "city",
    bounds: { minLat: 39.443493, maxLat: 41.058609, minLng: 115.413811, maxLng: 117.506111 },
  },
  {
    keyword: "上海市",
    adcode: "310000",
    level: "city",
    bounds: { minLat: 30.694376, maxLat: 31.866154, minLng: 120.858162, maxLng: 122.113366 },
  },
];

const DIRECT_PROVINCE_COUNTY_PARENT_ADCODES = new Set([
  "110000",
  "120000",
  "310000",
  "500000",
  "710000",
  "810000",
  "820000",
]);

function normalizeMapBounds(bounds: MapBounds): MapBounds {
  return {
    minLat: Math.min(bounds.minLat, bounds.maxLat),
    maxLat: Math.max(bounds.minLat, bounds.maxLat),
    minLng: Math.min(bounds.minLng, bounds.maxLng),
    maxLng: Math.max(bounds.minLng, bounds.maxLng),
  };
}

function isValidMapBounds(bounds: MapBounds) {
  return (
    isFiniteCoordinate(bounds.minLat) &&
    isFiniteCoordinate(bounds.maxLat) &&
    isFiniteCoordinate(bounds.minLng) &&
    isFiniteCoordinate(bounds.maxLng) &&
    bounds.minLat >= -90 &&
    bounds.maxLat <= 90 &&
    bounds.minLng >= -180 &&
    bounds.maxLng <= 180 &&
    bounds.maxLat > bounds.minLat &&
    bounds.maxLng > bounds.minLng
  );
}

function getBoundsSpan(bounds: MapBounds | null | undefined) {
  if (!bounds) {
    return undefined;
  }

  return {
    latitudeSpan: Math.max(0, bounds.maxLat - bounds.minLat),
    longitudeSpan: Math.max(0, bounds.maxLng - bounds.minLng),
  };
}

function getBoundsArea(bounds: MapBounds) {
  const span = getBoundsSpan(bounds);
  return (span?.latitudeSpan ?? 0) * (span?.longitudeSpan ?? 0);
}

export function getAdminViewportTileKey(
  bounds: MapBounds | null | undefined,
  level: AmapAdministrativeLevel,
) {
  if (!bounds) {
    return null;
  }

  const normalized = normalizeMapBounds(bounds);
  const span = getBoundsSpan(normalized);
  const gridSize = level === "province" ? 4 : level === "city" ? 1 : 0.35;
  const center = getBoundsCenter(normalized);
  const tileLng = Math.floor(center.lng / gridSize);
  const tileLat = Math.floor(center.lat / gridSize);
  const spanLngBucket = Math.max(1, Math.ceil((span?.longitudeSpan ?? 0) / gridSize));
  const spanLatBucket = Math.max(1, Math.ceil((span?.latitudeSpan ?? 0) / gridSize));

  return `z${level}:${tileLng},${tileLat}:s${spanLngBucket}x${spanLatBucket}`;
}

function getAdminViewportTileGridSize(level: AmapAdministrativeLevel) {
  return level === "province" ? 4 : level === "city" ? 1 : 0.35;
}

function getAdminViewportTileCoordinate(value: number, gridSize: number) {
  return Math.floor(value / gridSize);
}

export function computeAdminRequiredTiles(input: {
  bounds: MapBounds | null | undefined;
  level: AmapAdministrativeLevel;
}) {
  if (!input.bounds) {
    return [];
  }

  const normalized = normalizeMapBounds(input.bounds);
  const gridSize = getAdminViewportTileGridSize(input.level);
  const minTileLng = getAdminViewportTileCoordinate(normalized.minLng, gridSize);
  const maxTileLng = getAdminViewportTileCoordinate(normalized.maxLng, gridSize);
  const minTileLat = getAdminViewportTileCoordinate(normalized.minLat, gridSize);
  const maxTileLat = getAdminViewportTileCoordinate(normalized.maxLat, gridSize);
  const tileKeys: string[] = [];

  for (let tileLng = minTileLng; tileLng <= maxTileLng; tileLng += 1) {
    for (let tileLat = minTileLat; tileLat <= maxTileLat; tileLat += 1) {
      tileKeys.push(`z${input.level}:${tileLng},${tileLat}`);
    }
  }

  return tileKeys.sort();
}

export function diffAdminTileCoverage(input: {
  requiredTileKeys: string[];
  cachedTileKeys: Iterable<string | null | undefined>;
}) {
  const cached = new Set(
    Array.from(input.cachedTileKeys).filter(
      (tileKey): tileKey is string => Boolean(tileKey),
    ),
  );
  const required = Array.from(new Set(input.requiredTileKeys)).sort();
  const missingTileKeys = required.filter((tileKey) => !cached.has(tileKey));
  const cachedTileKeys = Array.from(cached).sort();

  return {
    requiredTileKeys: required,
    cachedTileKeys,
    missingTileKeys,
    coverageDecision:
      required.length === 0
        ? "no_viewport"
        : missingTileKeys.length > 0
          ? "missing_tiles"
          : "covered",
  } as const;
}

export interface AdminLoadedTileScope {
  targetLevel: AmapAdministrativeLevel;
  displayMode?: AmapCoordinateDisplayMode | string | null;
  adminPrecision?: string | null;
}

export type AdminLoadedTileSet = Map<string, Set<string>>;

export function getAdminLoadedTileScopeKey(scope: AdminLoadedTileScope) {
  return [
    scope.targetLevel,
    scope.displayMode ?? "gcj02",
    scope.adminPrecision ?? scope.targetLevel,
  ].join(":");
}

export function getAdminLoadedTileKeys(
  tileSet: AdminLoadedTileSet,
  scope: AdminLoadedTileScope,
) {
  return Array.from(tileSet.get(getAdminLoadedTileScopeKey(scope)) ?? []).sort();
}

export function markAdminLoadedTiles(
  tileSet: AdminLoadedTileSet,
  scope: AdminLoadedTileScope,
  tileKeys: Iterable<string | null | undefined>,
) {
  const scopeKey = getAdminLoadedTileScopeKey(scope);
  const scopedTiles = tileSet.get(scopeKey) ?? new Set<string>();

  for (const tileKey of tileKeys) {
    if (tileKey) {
      scopedTiles.add(tileKey);
    }
  }

  tileSet.set(scopeKey, scopedTiles);

  return getAdminLoadedTileKeys(tileSet, scope);
}

function getAdminRegionMergeKey(region: LoadedAdministrativeBoundaryRegion) {
  return region.adcode ?? region.id;
}

export function mergeAdministrativeBoundaryRegions(
  existingRegions: Iterable<LoadedAdministrativeBoundaryRegion | null | undefined>,
  incomingRegions: Iterable<LoadedAdministrativeBoundaryRegion | null | undefined>,
) {
  const merged = new Map<string, LoadedAdministrativeBoundaryRegion>();

  for (const region of existingRegions) {
    if (!region) {
      continue;
    }
    merged.set(getAdminRegionMergeKey(region), region);
  }

  for (const region of incomingRegions) {
    if (!region) {
      continue;
    }
    merged.set(getAdminRegionMergeKey(region), region);
  }

  return Array.from(merged.values());
}

export function shouldFetchAdminForViewport(input: {
  currentViewport: MapBounds | null | undefined;
  loadedBounds: MapBounds | Array<MapBounds | null | undefined> | null | undefined;
  targetLevel: AmapAdministrativeLevel;
  requiredTileKeys: string[];
  cachedTileKeys: Iterable<string | null | undefined>;
  reloadReason?: AmapAdministrativeReloadReason | null;
}) {
  const tileCoverage = diffAdminTileCoverage({
    requiredTileKeys: input.requiredTileKeys,
    cachedTileKeys: input.cachedTileKeys,
  });
  const missingBoundsCoverage = shouldFetchAdminBounds(
    input.currentViewport,
    input.loadedBounds,
    input.targetLevel,
    { bufferRatio: 0 },
  );
  const shouldFetch =
    Boolean(input.reloadReason) ||
    missingBoundsCoverage ||
    tileCoverage.missingTileKeys.length > 0;
  const fetchReason = input.reloadReason
    ?? (tileCoverage.missingTileKeys.length > 0
      ? "missing_tile"
      : missingBoundsCoverage
        ? "viewport_changed"
        : null);

  return {
    shouldFetch,
    fetchReason,
    skippedReason: shouldFetch ? null : "covered",
    missingBoundsCoverage,
    ...tileCoverage,
  };
}

export function createAdminDenseProtectionDebug(input: {
  targetLevel: AmapAdministrativeLevel;
  rawFeatureCount: number;
  visibleFeatureCount: number;
  maxCount?: number;
}) {
  const maxCount = input.maxCount ?? ADMIN_BOUNDARY_MAX_COUNTY_RENDER_FEATURES;
  const rawTooDense = isAdminCountyRenderTooDense(
    input.targetLevel,
    input.rawFeatureCount,
    maxCount,
  );
  const visibleTooDense = isAdminCountyRenderTooDense(
    input.targetLevel,
    input.visibleFeatureCount,
    maxCount,
  );

  return {
    denseProtectionTriggered: rawTooDense,
    denseProtectionReason: rawTooDense
      ? visibleTooDense
        ? "visible_viewport_too_dense_cap_count"
        : "expanded_viewport_too_dense_render_visible_only"
      : null,
    maxCount,
  };
}

export function createAdminRenderDebugSnapshot(input: {
  requestId?: number;
  currentRequestId?: number;
  stale?: boolean;
  targetLevel?: AmapAdministrativeLevel;
  renderLevel?: AmapAdministrativeLevel | "mixed" | "unknown";
  featureLevels?: string[];
  rawFeatureCount: number;
  visibleFeatureCount: number;
  polygonOverlayCount: number;
  labelCount: number;
  denseProtectionTriggered?: boolean;
  denseProtectionReason?: string | null;
}) {
  const staleDropped =
    Boolean(input.stale) ||
    (typeof input.requestId === "number" &&
      typeof input.currentRequestId === "number" &&
      input.requestId !== input.currentRequestId);

  return {
    requestId: input.requestId,
    accepted: !staleDropped,
    staleDropped,
    targetLevel: input.targetLevel,
    renderLevel: input.renderLevel,
    featureLevels: input.featureLevels ?? [],
    rawFeatureCount: input.rawFeatureCount,
    visibleFeatureCount: input.visibleFeatureCount,
    polygonOverlayCount: input.polygonOverlayCount,
    labelCount: input.labelCount,
    denseProtectionTriggered: Boolean(input.denseProtectionTriggered),
    denseProtectionReason: input.denseProtectionReason ?? null,
  };
}

function normalizeAdminFeatureLevelForRender(
  level: string | null | undefined,
): AmapAdministrativeLevel | "unknown" {
  if (level === "province" || level === "city" || level === "district") {
    return level;
  }

  if (level === "prefecture") {
    return "city";
  }

  if (level === "county") {
    return "district";
  }

  return "unknown";
}

export function createAdminRenderLevelDebug(input: {
  targetLevel: AmapAdministrativeLevel;
  regions: Iterable<LoadedAdministrativeBoundaryRegion | null | undefined>;
}): {
  targetLevel: AmapAdministrativeLevel;
  renderLevel: AmapAdministrativeLevel | "mixed" | "unknown";
  featureLevels: string[];
  mismatched: boolean;
} {
  const featureLevels = Array.from(
    new Set(
      Array.from(input.regions)
        .map((region) => region?.level)
        .filter((level): level is string => Boolean(level)),
    ),
  ).sort();
  const normalizedLevels: AmapAdministrativeLevel[] = Array.from(
    new Set(
      featureLevels.map((level) =>
        normalizeAdminFeatureLevelForRender(level),
      ),
    ),
  ).filter((level): level is AmapAdministrativeLevel => level !== "unknown");
  const renderLevel =
    normalizedLevels.length === 1
      ? normalizedLevels[0]!
      : normalizedLevels.length > 1
        ? "mixed"
        : "unknown";

  return {
    targetLevel: input.targetLevel,
    renderLevel,
    featureLevels: featureLevels.slice(0, 8),
    mismatched:
      renderLevel !== "unknown" &&
      renderLevel !== "mixed" &&
      renderLevel !== input.targetLevel,
  };
}

export function createAdminLevelSwitchDebug(input: {
  previousLevel?: AmapAdministrativeLevel | null;
  nextLevel: AmapAdministrativeLevel;
  switchReason?: string | null;
  pendingRequestCancelled?: boolean;
}) {
  return {
    previousLevel: input.previousLevel ?? null,
    nextLevel: input.nextLevel,
    switched: input.previousLevel !== input.nextLevel,
    switchReason:
      input.previousLevel !== input.nextLevel
        ? input.switchReason ?? "level_changed"
        : input.switchReason ?? null,
    pendingRequestCancelled: Boolean(input.pendingRequestCancelled),
  };
}

export function createAdminPanStabilityDebug(input: {
  targetLevel: AmapAdministrativeLevel;
  requiredTileKeys: string[];
  cachedTileKeys: Iterable<string | null | undefined>;
  missingTileKeys?: string[];
  shouldFetch: boolean;
  fetchReason?: string | null;
  skippedReason?: string | null;
}) {
  const coverage = diffAdminTileCoverage({
    requiredTileKeys: input.requiredTileKeys,
    cachedTileKeys: input.cachedTileKeys,
  });
  const missingTileKeys = input.missingTileKeys ?? coverage.missingTileKeys;

  return {
    targetLevel: input.targetLevel,
    requiredTileKeys: coverage.requiredTileKeys,
    cachedTileKeys: coverage.cachedTileKeys,
    missingTileKeys,
    shouldFetch: missingTileKeys.length > 0 ? true : input.shouldFetch,
    fetchReason:
      missingTileKeys.length > 0
        ? input.fetchReason ?? "missing_tile"
        : input.fetchReason ?? null,
    skippedReason:
      missingTileKeys.length > 0
        ? null
        : input.shouldFetch
          ? null
          : input.skippedReason ?? "covered",
  };
}

export function createAdminZoomSwitchDebug(input: {
  previousLevel?: AmapAdministrativeLevel | null;
  nextLevel: AmapAdministrativeLevel;
  cacheHit?: boolean;
  requestId?: number;
  currentRequestId?: number;
  requestLevel?: AmapAdministrativeLevel;
  desiredLevel?: AmapAdministrativeLevel;
  requestScopeKey?: string | null;
  desiredScopeKey?: string | null;
  pendingRequestCancelled?: boolean;
}) {
  const switched = input.previousLevel !== input.nextLevel;
  const staleDropped =
    (typeof input.requestId === "number" &&
      typeof input.currentRequestId === "number" &&
      input.requestId !== input.currentRequestId) ||
    (input.requestLevel !== undefined &&
      input.desiredLevel !== undefined &&
      input.requestLevel !== input.desiredLevel) ||
    (Boolean(input.requestScopeKey) &&
      Boolean(input.desiredScopeKey) &&
      input.requestScopeKey !== input.desiredScopeKey);

  return {
    previousLevel: input.previousLevel ?? null,
    nextLevel: input.nextLevel,
    switched,
    cacheHit: Boolean(input.cacheHit),
    immediateCacheRender: switched && Boolean(input.cacheHit),
    staleDropped,
    pendingRequestCancelled: Boolean(input.pendingRequestCancelled),
    oldOverlayRetentionMs: switched ? 0 : 750,
  };
}

export function getAdminViewportReloadDelayMs(input: {
  levelChanged: boolean;
  cacheHit?: boolean;
  missingTileCount?: number;
}) {
  if (input.levelChanged && input.cacheHit) {
    return 0;
  }

  if (input.levelChanged) {
    return 40;
  }

  if ((input.missingTileCount ?? 0) > 0) {
    return 120;
  }

  return 260;
}

function expandMapBounds(bounds: MapBounds, ratio: number): MapBounds {
  const span = getBoundsSpan(bounds);
  const latPadding = (span?.latitudeSpan ?? 0) * ratio;
  const lngPadding = (span?.longitudeSpan ?? 0) * ratio;

  return normalizeMapBounds({
    minLat: Math.max(-90, bounds.minLat - latPadding),
    maxLat: Math.min(90, bounds.maxLat + latPadding),
    minLng: Math.max(-180, bounds.minLng - lngPadding),
    maxLng: Math.min(180, bounds.maxLng + lngPadding),
  });
}

function getBoundsOverlapArea(left: MapBounds, right: MapBounds) {
  const minLat = Math.max(left.minLat, right.minLat);
  const maxLat = Math.min(left.maxLat, right.maxLat);
  const minLng = Math.max(left.minLng, right.minLng);
  const maxLng = Math.min(left.maxLng, right.maxLng);

  if (maxLat <= minLat || maxLng <= minLng) {
    return 0;
  }

  return (maxLat - minLat) * (maxLng - minLng);
}

function isBoundsContained(inner: MapBounds, outer: MapBounds) {
  const normalizedInner = normalizeMapBounds(inner);
  const normalizedOuter = normalizeMapBounds(outer);
  return (
    normalizedInner.minLat >= normalizedOuter.minLat &&
    normalizedInner.maxLat <= normalizedOuter.maxLat &&
    normalizedInner.minLng >= normalizedOuter.minLng &&
    normalizedInner.maxLng <= normalizedOuter.maxLng
  );
}

export function getMapBoundsUnion(boundsList: Array<MapBounds | null | undefined>) {
  const validBounds = boundsList
    .filter((bounds): bounds is MapBounds => Boolean(bounds))
    .map(normalizeMapBounds);

  if (validBounds.length === 0) {
    return null;
  }

  return validBounds.reduce<MapBounds>(
    (union, bounds) => ({
      minLat: Math.min(union.minLat, bounds.minLat),
      maxLat: Math.max(union.maxLat, bounds.maxLat),
      minLng: Math.min(union.minLng, bounds.minLng),
      maxLng: Math.max(union.maxLng, bounds.maxLng),
    }),
    validBounds[0]!,
  );
}

export function shouldFetchAdminBounds(
  currentViewport: MapBounds | null | undefined,
  loadedBounds: MapBounds | Array<MapBounds | null | undefined> | null | undefined,
  targetLevel: AmapAdministrativeLevel,
  options: {
    bufferRatio?: number;
  } = {},
) {
  if (!currentViewport) {
    return false;
  }

  const loadedBoundsList = Array.isArray(loadedBounds)
    ? loadedBounds.filter((bounds): bounds is MapBounds => Boolean(bounds))
    : loadedBounds
      ? [loadedBounds]
      : [];

  if (loadedBoundsList.length === 0) {
    return true;
  }

  const bufferRatio =
    options.bufferRatio ??
    (targetLevel === "district"
      ? ADMIN_BOUNDARY_LOADED_BOUNDS_BUFFER_RATIO
      : ADMIN_BOUNDARY_LOADED_BOUNDS_BUFFER_RATIO * 1.5);
  return !loadedBoundsList.some((bounds) => {
    const bufferedLoadedBounds = expandMapBounds(bounds, bufferRatio);
    return isBoundsContained(currentViewport, bufferedLoadedBounds);
  });
}

export function diffAdminOverlayAdcodes(
  currentAdcodes: Iterable<string>,
  nextAdcodes: Iterable<string>,
): AdminOverlayDiff {
  const current = new Set(currentAdcodes);
  const next = new Set(nextAdcodes);
  const keep = Array.from(next).filter((adcode) => current.has(adcode)).sort();
  const add = Array.from(next).filter((adcode) => !current.has(adcode)).sort();
  const remove = Array.from(current).filter((adcode) => !next.has(adcode)).sort();

  return { keep, add, remove };
}

export function isAdminCountyRenderTooDense(
  targetLevel: AmapAdministrativeLevel,
  featureCount: number,
  maxCount = ADMIN_BOUNDARY_MAX_COUNTY_RENDER_FEATURES,
) {
  return targetLevel === "district" && featureCount > maxCount;
}

function getBoundsIntersection(left: MapBounds, right: MapBounds): MapBounds | null {
  const minLat = Math.max(left.minLat, right.minLat);
  const maxLat = Math.min(left.maxLat, right.maxLat);
  const minLng = Math.max(left.minLng, right.minLng);
  const maxLng = Math.min(left.maxLng, right.maxLng);

  if (maxLat <= minLat || maxLng <= minLng) {
    return null;
  }

  return { minLat, maxLat, minLng, maxLng };
}

function getScopeOverlapRatio(bounds: MapBounds, scope: KnownAdminScope) {
  const area = getBoundsArea(bounds);
  return area > 0 ? getBoundsOverlapArea(bounds, scope.bounds) / area : 0;
}

function scoreKnownScopeIntersections(
  bounds: MapBounds,
  center: MapCenter,
  scopes: KnownAdminScope[],
) {
  return scopes
    .map((scope) => ({
      scope,
      intersectionRatio: getScopeOverlapRatio(bounds, scope),
      centerInside: isCenterInBounds(center, scope.bounds),
    }))
    .filter((item) => item.intersectionRatio > 0)
    .sort((left, right) => right.intersectionRatio - left.intersectionRatio);
}

function getBoundsCorners(bounds: MapBounds): MapCenter[] {
  return [
    { lat: bounds.minLat, lng: bounds.minLng },
    { lat: bounds.minLat, lng: bounds.maxLng },
    { lat: bounds.maxLat, lng: bounds.minLng },
    { lat: bounds.maxLat, lng: bounds.maxLng },
  ];
}

function isProvinceIncludedByViewport(
  bounds: MapBounds,
  center: MapCenter,
  item: {
    scope: KnownAdminScope;
    intersectionRatio: number;
    centerInside: boolean;
  },
) {
  if (item.intersectionRatio >= 0.01 || item.centerInside) {
    return true;
  }

  const corners = getBoundsCorners(bounds);

  if (corners.some((corner) => isCenterInBounds(corner, item.scope.bounds))) {
    return true;
  }

  const scopeCenter = getBoundsCenter(item.scope.bounds);
  return isCenterInBounds(scopeCenter, bounds) && item.intersectionRatio >= 0.005;
}

function getViewportProvinceCoverage(bounds: MapBounds, center: MapCenter) {
  const expandedBounds = expandMapBounds(bounds, 0.15);
  const intersections = scoreKnownScopeIntersections(
    expandedBounds,
    center,
    KNOWN_PROVINCE_SCOPES,
  );
  const included = intersections.filter((item) =>
    isProvinceIncludedByViewport(expandedBounds, center, item),
  );

  return {
    expandedBounds,
    intersections,
    included,
  };
}

function findDominantProvinceByViewportCoverage(
  bounds: MapBounds,
  center: MapCenter,
) {
  const intersections = scoreKnownScopeIntersections(
    bounds,
    center,
    KNOWN_PROVINCE_SCOPES,
  );
  const top = intersections[0];
  const second = intersections[1];
  const centerScope = findKnownScopeByCenter(center, KNOWN_PROVINCE_SCOPES);

  if (!top) {
    return {
      provinceScope: null,
      confidence: 0,
      reason: "multi_province" as const,
      intersections,
    };
  }

  if (
    top.intersectionRatio >= 0.55 &&
    (!second ||
      top.intersectionRatio - second.intersectionRatio >= 0.18 ||
      (top.intersectionRatio >= 0.82 &&
        top.intersectionRatio - second.intersectionRatio >= 0.1))
  ) {
    return {
      provinceScope: top.scope,
      confidence: top.intersectionRatio,
      reason: "dominant_province" as const,
      intersections,
    };
  }

  if (
    centerScope &&
    top.scope.adcode === centerScope.adcode &&
    top.intersectionRatio >= 0.42 &&
    (!second || top.intersectionRatio - second.intersectionRatio >= 0.18)
  ) {
    return {
      provinceScope: top.scope,
      confidence: top.intersectionRatio,
      reason: "dominant_province" as const,
      intersections,
    };
  }

  return {
    provinceScope: null,
    confidence: top.intersectionRatio,
    reason: "multi_province" as const,
    intersections,
  };
}

function findKnownScopeByCenter(
  center: MapCenter,
  scopes: KnownAdminScope[],
) {
  return scopes
    .filter((scope) => isCenterInBounds(center, scope.bounds))
    .sort(
      (left, right) =>
        getBoundsArea(left.bounds) - getBoundsArea(right.bounds),
    )[0] ?? null;
}

function isProvinceLevelAdcode(adcode: string | undefined) {
  return Boolean(adcode && KNOWN_PROVINCE_SCOPES.some((scope) => scope.adcode === adcode));
}

function isValidDistrictParentAdcode(adcode: string | undefined) {
  if (!adcode || !/^\d{6}$/.test(adcode)) {
    return false;
  }

  return !isProvinceLevelAdcode(adcode) ||
    DIRECT_PROVINCE_COUNTY_PARENT_ADCODES.has(adcode);
}

function findDominantKnownScope(
  bounds: MapBounds | null,
  center: MapCenter,
  scopes: KnownAdminScope[],
  minimumOverlapRatio: number,
) {
  const centerScope = findKnownScopeByCenter(center, scopes);

  if (!bounds) {
    return centerScope;
  }

  const scoredScopes = scopes
    .map((scope) => ({
      scope,
      overlapRatio: getScopeOverlapRatio(bounds, scope),
    }))
    .sort((left, right) => right.overlapRatio - left.overlapRatio);
  const dominant = scoredScopes[0];

  if (dominant && dominant.overlapRatio >= minimumOverlapRatio) {
    return dominant.scope;
  }

  if (
    centerScope &&
    getScopeOverlapRatio(bounds, centerScope) >= minimumOverlapRatio * 0.72
  ) {
    return centerScope;
  }

  return null;
}

function getSignificantKnownScopes(
  bounds: MapBounds | null,
  scopes: KnownAdminScope[],
  minimumOverlapRatio: number,
) {
  if (!bounds) {
    return [];
  }

  return scopes.filter(
    (scope) => getScopeOverlapRatio(bounds, scope) >= minimumOverlapRatio,
  );
}

function isCenterInBounds(
  center: MapCenter,
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  },
) {
  return (
    center.lat >= bounds.minLat &&
    center.lat <= bounds.maxLat &&
    center.lng >= bounds.minLng &&
    center.lng <= bounds.maxLng
  );
}

function isPointInPolygon(point: MapCenter, polygon: MapCenter[]) {
  let inside = false;

  for (
    let index = 0, previousIndex = polygon.length - 1;
    index < polygon.length;
    previousIndex = index, index += 1
  ) {
    const current = polygon[index]!;
    const previous = polygon[previousIndex]!;
    const intersects =
      current.lat > point.lat !== previous.lat > point.lat &&
      point.lng <
        ((previous.lng - current.lng) * (point.lat - current.lat)) /
          (previous.lat - current.lat || Number.EPSILON) +
          current.lng;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function getPolygonSignedArea(path: MapCenter[]) {
  let area = 0;

  for (let index = 0; index < path.length; index += 1) {
    const current = path[index]!;
    const next = path[(index + 1) % path.length]!;
    area += current.lng * next.lat - next.lng * current.lat;
  }

  return area / 2;
}

function getPolygonCentroid(path: MapCenter[]): MapCenter | null {
  const signedArea = getPolygonSignedArea(path);

  if (Math.abs(signedArea) < Number.EPSILON) {
    return null;
  }

  let lngSum = 0;
  let latSum = 0;

  for (let index = 0; index < path.length; index += 1) {
    const current = path[index]!;
    const next = path[(index + 1) % path.length]!;
    const cross = current.lng * next.lat - next.lng * current.lat;
    lngSum += (current.lng + next.lng) * cross;
    latSum += (current.lat + next.lat) * cross;
  }

  const center = {
    lng: lngSum / (6 * signedArea),
    lat: latSum / (6 * signedArea),
  };

  return isValidMapCenter(center) ? center : null;
}

function getPathBounds(path: MapCenter[]): MapBounds | null {
  if (path.length === 0) {
    return null;
  }

  return normalizeMapBounds(
    path.reduce<MapBounds>(
      (bounds, point) => ({
        minLat: Math.min(bounds.minLat, point.lat),
        maxLat: Math.max(bounds.maxLat, point.lat),
        minLng: Math.min(bounds.minLng, point.lng),
        maxLng: Math.max(bounds.maxLng, point.lng),
      }),
      {
        minLat: path[0]!.lat,
        maxLat: path[0]!.lat,
        minLng: path[0]!.lng,
        maxLng: path[0]!.lng,
      },
    ),
  );
}

function getBoundsCenter(bounds: MapBounds): MapCenter {
  return {
    lat: (bounds.minLat + bounds.maxLat) / 2,
    lng: (bounds.minLng + bounds.maxLng) / 2,
  };
}

function getLargestBoundaryRing(boundaries: MapCenter[][]) {
  return boundaries
    .filter((path) => path.length >= 3)
    .sort(
      (left, right) =>
        Math.abs(getPolygonSignedArea(right)) -
        Math.abs(getPolygonSignedArea(left)),
    )[0] ?? null;
}

function resolveBoundaryLabelPosition(
  boundaries: MapCenter[][],
  officialCenter: MapCenter | null,
): {
  position: MapCenter | null;
  source: "polygon-centroid" | "district-center" | "fallback";
} {
  const largestRing = getLargestBoundaryRing(boundaries);

  if (!largestRing) {
    return {
      position: officialCenter,
      source: officialCenter ? "district-center" : "fallback",
    };
  }

  const centroid = getPolygonCentroid(largestRing);

  if (centroid && isPointInPolygon(centroid, largestRing)) {
    return { position: centroid, source: "polygon-centroid" };
  }

  const ringBounds = getPathBounds(largestRing);
  const bboxCenter = ringBounds ? getBoundsCenter(ringBounds) : null;

  if (bboxCenter && isPointInPolygon(bboxCenter, largestRing)) {
    return { position: bboxCenter, source: "polygon-centroid" };
  }

  if (
    officialCenter &&
    boundaries.some((boundary) => isPointInPolygon(officialCenter, boundary))
  ) {
    return { position: officialCenter, source: "district-center" };
  }

  return {
    position: officialCenter ?? largestRing[0] ?? null,
    source: officialCenter ? "district-center" : "fallback",
  };
}

function findCachedAdministrativeRegion(
  center: MapCenter,
  level: "province" | "city",
) {
  for (const region of administrativeRegionLookup.values()) {
    if (region.level !== level) {
      continue;
    }

    if (region.boundaries.some((boundary) => isPointInPolygon(center, boundary))) {
      return region;
    }
  }

  return null;
}

function rememberAdministrativeRegions(
  regions: LoadedAdministrativeBoundaryRegion[],
) {
  for (const region of regions) {
    administrativeRegionLookup.set(region.id, region);
  }
}

function normalizeAdminViewport(
  viewport: unknown,
  fallbackCenter: MapCenter,
): {
  bounds: MapBounds | null;
  center: MapCenter;
} {
  if (!viewport || typeof viewport !== "object") {
    return { bounds: null, center: fallbackCenter };
  }

  const maybeBounds = parseAmapMapBounds(viewport as MapBounds);

  if (maybeBounds) {
    return { bounds: maybeBounds, center: fallbackCenter };
  }

  const input = viewport as {
    bounds?: MapBounds | AMapBoundsInstance;
    center?: MapCenter | null;
  };
  const inputCenter = input.center ?? undefined;

  return {
    bounds: parseAmapMapBounds(input.bounds),
    center: isValidMapCenter(inputCenter)
      ? inputCenter
      : fallbackCenter,
  };
}

function resolveAdminBoundaryLevelFromZoom(
  zoom: number,
  previousLevel?: AmapAdministrativeLevel | null,
): ResolvedAdminBoundaryLevel {
  const safeZoom = Number.isFinite(zoom) ? zoom : DEFAULT_AMAP_ZOOM;

  if (previousLevel === "province") {
    if (safeZoom > 8.8) {
      return {
        view: "cityView",
        targetLevel: "district",
        viewportClass: "singleCityWide",
      };
    }

    if (safeZoom > 6) {
      return {
        view: "provinceView",
        targetLevel: "city",
        viewportClass: "singleProvinceWide",
      };
    }

    return {
      view: "countryView",
      targetLevel: "province",
      viewportClass: "countryWide",
    };
  }

  if (previousLevel === "city") {
    if (safeZoom < 5.5) {
      return {
        view: "countryView",
        targetLevel: "province",
        viewportClass: "countryWide",
      };
    }

    if (safeZoom > 8.8) {
      return {
        view: "cityView",
        targetLevel: "district",
        viewportClass: "singleCityWide",
      };
    }

    return {
      view: "provinceView",
      targetLevel: "city",
      viewportClass: "singleProvinceWide",
    };
  }

  if (previousLevel === "district") {
    if (safeZoom < 5.5) {
      return {
        view: "countryView",
        targetLevel: "province",
        viewportClass: "countryWide",
      };
    }

    if (safeZoom < 8.2) {
      return {
        view: "provinceView",
        targetLevel: "city",
        viewportClass: "singleProvinceWide",
      };
    }

    return {
      view: "cityView",
      targetLevel: "district",
      viewportClass: "singleCityWide",
    };
  }

  if (safeZoom <= 5.8) {
    return {
      view: "countryView",
      targetLevel: "province",
      viewportClass: "countryWide",
    };
  }

  if (safeZoom <= 8.5) {
    return {
      view: "provinceView",
      targetLevel: "city",
      viewportClass: "singleProvinceWide",
    };
  }

  return {
    view: safeZoom > 11.5 ? "districtView" : "cityView",
    targetLevel: "district",
    viewportClass: safeZoom > 11.5 ? "neighborhood" : "singleCityWide",
  };
}

function resolveAdminBoundaryLevelWithViewport(input: {
  zoom: number;
  center: MapCenter;
  bounds: MapBounds | null;
  previousLevel?: AmapAdministrativeLevel | null;
}): ResolvedAdminBoundaryLevel & {
  provinceScope: KnownAdminScope | null;
  provinceScopes: KnownAdminScope[];
  cityScope: KnownAdminScope | null;
} {
  const safeZoom = Number.isFinite(input.zoom) ? input.zoom : DEFAULT_AMAP_ZOOM;
  const boundsSpan = getBoundsSpan(input.bounds);

  if (!input.bounds || !boundsSpan) {
    const fallback = resolveAdminBoundaryLevelFromZoom(
      safeZoom,
      input.previousLevel,
    );
    return {
      ...fallback,
      viewportClass:
        fallback.targetLevel === "province"
          ? "countryWide"
          : fallback.targetLevel === "city"
            ? "singleProvinceWide"
            : "singleCityWide",
      centerAdminGuess: findKnownScopeByCenter(input.center, [
        ...KNOWN_CITY_SCOPES,
        ...KNOWN_PROVINCE_SCOPES,
      ])?.adcode,
      classificationReason: "zoom_fallback",
      parentAdcodes:
        fallback.targetLevel === "province"
          ? ["100000"]
          : fallback.targetLevel === "city"
            ? [findKnownScopeByCenter(input.center, KNOWN_PROVINCE_SCOPES)?.adcode ?? "100000"]
            : [findKnownScopeByCenter(input.center, KNOWN_CITY_SCOPES)?.adcode ?? "440300"],
      parentNames:
        fallback.targetLevel === "province"
          ? ["中国"]
          : fallback.targetLevel === "city"
            ? [findKnownScopeByCenter(input.center, KNOWN_PROVINCE_SCOPES)?.keyword ?? "中国"]
            : [findKnownScopeByCenter(input.center, KNOWN_CITY_SCOPES)?.keyword ?? "深圳市"],
      provinceScope: findKnownScopeByCenter(input.center, KNOWN_PROVINCE_SCOPES),
      provinceScopes: findKnownScopeByCenter(input.center, KNOWN_PROVINCE_SCOPES)
        ? [findKnownScopeByCenter(input.center, KNOWN_PROVINCE_SCOPES)!]
        : [],
      cityScope: findKnownScopeByCenter(input.center, KNOWN_CITY_SCOPES),
    };
  }

  const provinceViewportCoverage = getViewportProvinceCoverage(
    input.bounds,
    input.center,
  );
  const provinceCoverage = findDominantProvinceByViewportCoverage(
    input.bounds,
    input.center,
  );
  const provinceScope = provinceCoverage.provinceScope;
  const rawIncludedProvinceScopes = provinceViewportCoverage.included.map((item) => item.scope);
  const centerCityScope = findKnownScopeByCenter(
    input.center,
    KNOWN_CITY_SCOPES,
  );
  const cityScope = findDominantKnownScope(
    input.bounds,
    input.center,
    KNOWN_CITY_SCOPES,
    0.58,
  );
  const significantCities = getSignificantKnownScopes(
    input.bounds,
    KNOWN_CITY_SCOPES,
    0.08,
  );
  const centerAdminGuess =
    findKnownScopeByCenter(input.center, KNOWN_CITY_SCOPES)?.adcode ??
    findKnownScopeByCenter(input.center, KNOWN_PROVINCE_SCOPES)?.adcode;
  const secondProvinceCoverageRatio =
    provinceCoverage.intersections[1]?.intersectionRatio ?? 0;
  const includedProvinceScopes = (() => {
    const viewportBounds = input.bounds;
    const hasExpandedCompanionProvince = provinceScope
      ? provinceViewportCoverage.included.some((item) => {
          if (item.scope.adcode === provinceScope.adcode) {
            return false;
          }

          const scopeCenter = getBoundsCenter(item.scope.bounds);

          return (
            item.intersectionRatio >= 0.025 ||
            item.centerInside ||
            isCenterInBounds(scopeCenter, viewportBounds)
          );
        })
      : false;

    if (
      provinceScope &&
      provinceCoverage.reason === "dominant_province" &&
      (
        provinceCoverage.confidence >= 0.85 ||
        (
          secondProvinceCoverageRatio < 0.08 &&
          !hasExpandedCompanionProvince
        )
      )
    ) {
      return [provinceScope];
    }

    if (rawIncludedProvinceScopes.length <= 8) {
      return rawIncludedProvinceScopes.slice(0, MAX_ADMIN_CITY_PARENT_PROVINCES);
    }

    const strongerScopes = provinceViewportCoverage.included
      .filter((item) => {
        const scopeCenter = getBoundsCenter(item.scope.bounds);

        return (
          item.intersectionRatio >= 0.025 ||
          isCenterInBounds(scopeCenter, viewportBounds)
        );
      })
      .map((item) => item.scope);

    if (strongerScopes.length > 0 && strongerScopes.length <= 8) {
      return strongerScopes.slice(0, MAX_ADMIN_CITY_PARENT_PROVINCES);
    }

    return rawIncludedProvinceScopes.slice(0, MAX_ADMIN_CITY_PARENT_PROVINCES);
  })();
  const includedProvinceAdcodes = new Set(
    includedProvinceScopes.map((scope) => scope.adcode),
  );
  const intersectingProvinces = provinceViewportCoverage.intersections.map((item) => ({
    adcode: item.scope.adcode,
    name: item.scope.keyword,
    intersectionRatio: Number(item.intersectionRatio.toFixed(4)),
    centerInside: item.centerInside,
    included: includedProvinceAdcodes.has(item.scope.adcode),
  }));
  const isStrongSingleProvinceViewport = Boolean(
    provinceScope &&
    provinceCoverage.reason === "dominant_province" &&
    provinceCoverage.confidence >= 0.85,
  );
  const tooManyProvinceParents =
    (rawIncludedProvinceScopes.length > 8 && !isStrongSingleProvinceViewport) ||
    boundsSpan.longitudeSpan >= 26 ||
    boundsSpan.latitudeSpan >= 18;

  if (!provinceScope) {
    if (
      includedProvinceScopes.length > 0 &&
      !tooManyProvinceParents &&
      boundsSpan.longitudeSpan < 26 &&
      boundsSpan.latitudeSpan < 18
    ) {
      return {
        view: "provinceView",
        targetLevel: "city",
        viewportClass:
          includedProvinceScopes.length > 1
            ? "multiProvinceWide"
            : "singleProvinceWide",
        boundsSpan,
        expandedViewportBounds: provinceViewportCoverage.expandedBounds,
        centerAdminGuess,
        downgradeReason:
          includedProvinceScopes.length > 1
            ? "viewport_crosses_multiple_provinces"
            : undefined,
        classificationReason:
          includedProvinceScopes.length > 1
            ? "multi_province"
            : "dominant_province",
        confidence: provinceCoverage.confidence,
        parentAdcodes: includedProvinceScopes.map((scope) => scope.adcode),
        parentNames: includedProvinceScopes.map((scope) => scope.keyword),
        intersectingProvinces,
        provinceScope: includedProvinceScopes[0] ?? null,
        provinceScopes: includedProvinceScopes,
        cityScope,
      };
    }

    return {
      view: "countryView",
      targetLevel: "province",
      viewportClass:
        intersectingProvinces.length > 1 ? "multiProvinceWide" : "countryWide",
      boundsSpan,
      expandedViewportBounds: provinceViewportCoverage.expandedBounds,
      centerAdminGuess,
      downgradeReason:
        intersectingProvinces.length > 1
          ? "viewport_crosses_multiple_provinces"
          : undefined,
      classificationReason: "multi_province",
      confidence: provinceCoverage.confidence,
      parentAdcodes: ["100000"],
      parentNames: ["中国"],
      tooManyParentsFallback:
        tooManyProvinceParents || includedProvinceScopes.length > 6,
      intersectingProvinces,
      provinceScope,
      provinceScopes: [],
      cityScope,
    };
  }

  if (tooManyProvinceParents) {
    return {
      view: "countryView",
      targetLevel: "province",
      viewportClass: "multiProvinceWide",
      boundsSpan,
      expandedViewportBounds: provinceViewportCoverage.expandedBounds,
      centerAdminGuess,
      downgradeReason: "viewport_crosses_multiple_provinces",
      classificationReason: "multi_province",
      confidence: provinceCoverage.confidence,
      parentAdcodes: ["100000"],
      parentNames: ["中国"],
      tooManyParentsFallback: true,
      intersectingProvinces,
      provinceScope: null,
      provinceScopes: [],
      cityScope,
    };
  }

  const cityOverlapRatio = cityScope
    ? getScopeOverlapRatio(input.bounds, cityScope)
    : 0;
  const centerCityOverlapRatio = centerCityScope
    ? getScopeOverlapRatio(input.bounds, centerCityScope)
    : 0;
  const isCityScaleAroundCenter =
    safeZoom >= 10 &&
    boundsSpan.longitudeSpan <= 2.1 &&
    boundsSpan.latitudeSpan <= 1.35 &&
    (!centerCityScope || centerCityOverlapRatio >= 0.12);
  const isCountyViewportProtected =
    boundsSpan.longitudeSpan > MAX_ADMIN_COUNTY_VIEWPORT_LONGITUDE_SPAN ||
    boundsSpan.latitudeSpan > MAX_ADMIN_COUNTY_VIEWPORT_LATITUDE_SPAN ||
    getBoundsArea(input.bounds) > MAX_ADMIN_COUNTY_VIEWPORT_AREA;
  const isCompactSingleCityView =
    !isCountyViewportProtected &&
    isCityScaleAroundCenter &&
    safeZoom >= 9.2 &&
    (isCityScaleAroundCenter ||
      (boundsSpan.longitudeSpan <= 1.45 &&
        boundsSpan.latitudeSpan <= 1.15 &&
        cityOverlapRatio >= 0.68)) &&
    (significantCities.length <= 1 ||
      isCityScaleAroundCenter ||
      (boundsSpan.longitudeSpan <= 0.95 && boundsSpan.latitudeSpan <= 0.78));

  if (isCompactSingleCityView) {
    const primaryCityScope = cityScope ?? centerCityScope;
    const districtParentScopes =
      primaryCityScope && isValidDistrictParentAdcode(primaryCityScope.adcode)
        ? [primaryCityScope]
        : [];

    return {
      view: "cityView",
      targetLevel: "district",
      viewportClass:
        boundsSpan.longitudeSpan <= 0.65 && boundsSpan.latitudeSpan <= 0.52
          ? "neighborhood"
          : "singleCityWide",
      boundsSpan,
      expandedViewportBounds: provinceViewportCoverage.expandedBounds,
      centerAdminGuess,
      classificationReason: "dominant_city",
      confidence: Math.max(cityOverlapRatio, centerCityOverlapRatio),
      parentAdcodes: districtParentScopes.map((scope) => scope.adcode),
      parentNames: districtParentScopes.map((scope) => scope.keyword),
      intersectingProvinces,
      provinceScope,
      provinceScopes: includedProvinceScopes.length > 0
        ? includedProvinceScopes
        : [provinceScope],
      cityScope: primaryCityScope,
    };
  }

  const cityParentScopes =
    includedProvinceScopes.length > 0 ? includedProvinceScopes : [provinceScope];

  return {
    view: "provinceView",
    targetLevel: "city",
    viewportClass:
      cityParentScopes.length > 1 ? "multiProvinceWide" : "singleProvinceWide",
    boundsSpan,
    expandedViewportBounds: provinceViewportCoverage.expandedBounds,
    centerAdminGuess,
    downgradeReason:
      cityParentScopes.length > 1
        ? "viewport_crosses_multiple_provinces"
        : significantCities.length > 1
        ? "viewport_crosses_multiple_cities"
        : undefined,
    classificationReason:
      cityParentScopes.length > 1 ? "multi_province" : "dominant_province",
    confidence: provinceCoverage.confidence,
    parentAdcodes: cityParentScopes.map((scope) => scope.adcode),
    parentNames: cityParentScopes.map((scope) => scope.keyword),
    intersectingProvinces,
    provinceScope,
    provinceScopes: cityParentScopes,
    cityScope,
  };
}

export function resolveAdminBoundaryLevel(
  zoom: number,
  viewport?: unknown,
  _destination?: unknown,
  previousLevel?: AmapAdministrativeLevel | null,
): ResolvedAdminBoundaryLevel {
  const normalizedViewport = normalizeAdminViewport(viewport, DEFAULT_AMAP_CENTER);
  const resolved = resolveAdminBoundaryLevelWithViewport({
    zoom,
    center: normalizedViewport.center,
    bounds: normalizedViewport.bounds,
    previousLevel,
  });

  return {
    view: resolved.view,
    targetLevel: resolved.targetLevel,
    viewportClass: resolved.viewportClass,
    boundsSpan: resolved.boundsSpan,
    expandedViewportBounds: resolved.expandedViewportBounds,
    centerAdminGuess: resolved.centerAdminGuess,
    downgradeReason: resolved.downgradeReason,
    classificationReason: resolved.classificationReason,
    confidence: resolved.confidence,
    parentAdcodes: resolved.parentAdcodes,
    parentNames: resolved.parentNames,
    tooManyParentsFallback: resolved.tooManyParentsFallback,
    intersectingProvinces: resolved.intersectingProvinces,
  };
}

export function getAdminLevelByZoom(
  zoom: number,
  previousLevel?: AmapAdministrativeLevel | null,
): AmapAdministrativeLevel {
  return resolveAdminBoundaryLevel(
    zoom,
    undefined,
    undefined,
    previousLevel,
  ).targetLevel;
}

export function resolveAdministrativeBoundaryReloadReason(input: {
  previousQuery?: AmapAdministrativeBoundaryQuery | null;
  nextQuery: AmapAdministrativeBoundaryQuery;
  manualRefresh?: boolean;
}): AmapAdministrativeReloadReason | null {
  if (input.manualRefresh) {
    return "manual_refresh";
  }

  const previousQuery = input.previousQuery;

  if (!previousQuery) {
    return "layer_enabled";
  }

  if (previousQuery.targetLevel !== input.nextQuery.targetLevel) {
    return "level_changed";
  }

  const previousParents =
    previousQuery.parentAdcodes?.[0] === previousQuery.adcode
      ? previousQuery.parentAdcodes
      : [previousQuery.adcode];
  const nextParents =
    input.nextQuery.parentAdcodes?.[0] === input.nextQuery.adcode
      ? input.nextQuery.parentAdcodes
      : [input.nextQuery.adcode];

  if (
    previousParents.length !== nextParents.length ||
    previousParents.some((adcode, index) => adcode !== nextParents[index])
  ) {
    return "parent_changed";
  }

  return null;
}

export function resolveAdministrativeBoundaryQuery(input: {
  zoom: number;
  center?: MapCenter | null;
  bounds?: MapBounds | null;
  previousLevel?: AmapAdministrativeLevel | null;
  adminPrecision?: AmapAdminPrecision | null;
}): AmapAdministrativeBoundaryQuery {
  const inputCenter = input.center ?? undefined;
  const center: MapCenter = isValidMapCenter(inputCenter)
    ? inputCenter
    : DEFAULT_AMAP_CENTER;
  const resolved = resolveAdminBoundaryLevelWithViewport({
    zoom: input.zoom,
    center,
    bounds: input.bounds ?? null,
    previousLevel: input.previousLevel,
  });
  const targetLevel = resolveAdminPrecisionTargetLevel(
    input.adminPrecision,
    resolved.targetLevel,
  );
  const viewportBounds = input.bounds
    ? expandMapBounds(
        input.bounds,
        targetLevel === "district"
          ? ADMIN_BOUNDARY_COUNTY_VIEWPORT_PADDING_RATIO
          : ADMIN_BOUNDARY_VIEWPORT_PADDING_RATIO,
      )
    : null;
  const viewportTileKey = getAdminViewportTileKey(viewportBounds, targetLevel);
  const withViewport = (
    query: Omit<AmapAdministrativeBoundaryQuery, "viewportBounds" | "viewportTileKey">,
  ): AmapAdministrativeBoundaryQuery => ({
    ...query,
    viewportBounds,
    ...(viewportTileKey ? { viewportTileKey } : {}),
  });

  if (targetLevel === "province") {
    return withViewport({
      keyword: "中国",
      adcode: "100000",
      parentAdcodes: ["100000"],
      parentNames: ["中国"],
      targetLevel,
      searchLevel: "country",
      subdistrict: 1,
      center,
      zoom: input.zoom,
    });
  }

  if (targetLevel === "city") {
    const cachedProvince = findCachedAdministrativeRegion(center, "province");
    const provinceScope = resolved.provinceScope;
    const provinceScopes = resolved.provinceScopes ?? [];

    if (provinceScopes.length > 1) {
      return withViewport({
        keyword: provinceScopes.map((scope) => scope.keyword).join("、"),
        adcode: provinceScopes[0]!.adcode,
        parentAdcodes: provinceScopes.map((scope) => scope.adcode),
        parentNames: provinceScopes.map((scope) => scope.keyword),
        targetLevel,
        searchLevel: "province",
        subdistrict: 1,
        center,
        zoom: input.zoom,
      });
    }

    if (!input.bounds && cachedProvince?.adcode) {
      return withViewport({
        keyword: cachedProvince.name,
        adcode: cachedProvince.adcode,
        parentAdcodes: [cachedProvince.adcode],
        parentNames: [cachedProvince.name],
        targetLevel,
        searchLevel: "province",
        subdistrict: 1,
        center,
        zoom: input.zoom,
      });
    }

    if (provinceScope) {
      return withViewport({
        keyword: provinceScope.keyword,
        adcode: provinceScope.adcode,
        parentAdcodes: [provinceScope.adcode],
        parentNames: [provinceScope.keyword],
        targetLevel,
        searchLevel: "province",
        subdistrict: 1,
        center,
        zoom: input.zoom,
      });
    }

    if (isCenterInBounds(center, GUANGDONG_BOUNDS)) {
      return withViewport({
        keyword: "广东省",
        adcode: "440000",
        parentAdcodes: ["440000"],
        parentNames: ["广东省"],
        targetLevel,
        searchLevel: "province",
        subdistrict: 1,
        center,
        zoom: input.zoom,
      });
    }

    return withViewport({
      keyword: "中国",
      adcode: "100000",
      parentAdcodes: ["100000"],
      parentNames: ["中国"],
      targetLevel,
      searchLevel: "country",
      subdistrict: 1,
      center,
      zoom: input.zoom,
    });
  }

  const cachedCity = findCachedAdministrativeRegion(center, "city");
  const cityScope = resolved.cityScope;
  const resolvedDistrictParents = (resolved.parentAdcodes ?? [])
    .map((adcode, index) => ({
      adcode,
      name: resolved.parentNames?.[index] ?? adcode,
    }))
    .filter((parent) => isValidDistrictParentAdcode(parent.adcode));

  if (resolvedDistrictParents.length > 0) {
    return withViewport({
      keyword: resolvedDistrictParents.map((parent) => parent.name).join("、"),
      adcode: resolvedDistrictParents[0]!.adcode,
      parentAdcodes: resolvedDistrictParents.map((parent) => parent.adcode),
      parentNames: resolvedDistrictParents.map((parent) => parent.name),
      targetLevel,
      searchLevel: "city",
      subdistrict: 1,
      center,
      zoom: input.zoom,
    });
  }

  if (input.bounds) {
    return withViewport({
      keyword: "当前图幅",
      adcode: "000000",
      parentAdcodes: [],
      parentNames: [],
      targetLevel,
      searchLevel: "city",
      subdistrict: 1,
      center,
      zoom: input.zoom,
    });
  }

  const fallbackProvinceScope = resolved.provinceScope ??
    findKnownScopeByCenter(center, KNOWN_PROVINCE_SCOPES);

  if (resolved.parentAdcodes?.some((adcode) => isProvinceLevelAdcode(adcode))) {
    return withViewport({
      keyword: fallbackProvinceScope?.keyword ?? "中国",
      adcode: fallbackProvinceScope?.adcode ?? "100000",
      parentAdcodes: [fallbackProvinceScope?.adcode ?? "100000"],
      parentNames: [fallbackProvinceScope?.keyword ?? "中国"],
      targetLevel: fallbackProvinceScope ? "city" : "province",
      searchLevel: fallbackProvinceScope ? "province" : "country",
      subdistrict: 1,
      center,
      zoom: input.zoom,
    });
  }

  if (!input.bounds && cachedCity?.adcode) {
    return withViewport({
      keyword: cachedCity.name,
      adcode: cachedCity.adcode,
      parentAdcodes: [cachedCity.adcode],
      parentNames: [cachedCity.name],
      targetLevel,
      searchLevel: "city",
      subdistrict: 1,
      center,
      zoom: input.zoom,
    });
  }

  if (cityScope) {
    return withViewport({
      keyword: cityScope.keyword,
      adcode: cityScope.adcode,
      parentAdcodes: [cityScope.adcode],
      parentNames: [cityScope.keyword],
      targetLevel,
      searchLevel: "city",
      subdistrict: 1,
      center,
      zoom: input.zoom,
    });
  }

  if (isCenterInBounds(center, SHENZHEN_BOUNDS)) {
    return withViewport({
      keyword: "深圳市",
      adcode: "440300",
      parentAdcodes: ["440300"],
      parentNames: ["深圳市"],
      targetLevel,
      searchLevel: "city",
      subdistrict: 1,
      center,
      zoom: input.zoom,
    });
  }

  if (isCenterInBounds(center, GUANGZHOU_BOUNDS)) {
    return withViewport({
      keyword: "广州市",
      adcode: "440100",
      parentAdcodes: ["440100"],
      parentNames: ["广州市"],
      targetLevel,
      searchLevel: "city",
      subdistrict: 1,
      center,
      zoom: input.zoom,
    });
  }

  return withViewport({
    keyword: "广东省",
    adcode: "440000",
    parentAdcodes: ["440000"],
    parentNames: ["广东省"],
    targetLevel: "city",
    searchLevel: "province",
    subdistrict: 1,
    center,
    zoom: input.zoom,
  });
}

function logAdministrativeBoundaryResult(
  result: LoadedAdministrativeBoundaries,
) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.info("[MapStudio][Admin] current zoom:", result.query.zoom);
  console.info(
    "[Admin] parent query keyword/adcode:",
    `${result.query.keyword}/${result.query.adcode}`,
  );
  console.info("[MapStudio][Admin] target level:", result.query.targetLevel);
  console.info("[MapStudio][Admin] query:", result.query.adcode);
  console.info(
    "[MapStudio][Admin] query keyword/adcode:",
    `${result.query.keyword}/${result.query.adcode}`,
  );
  console.info("[MapStudio][Admin] loaded regions count:", result.regions.length);
  console.info(
    "[MapStudio][Admin] region names:",
    result.regions.map((region) => region.name).join(", "),
  );
  console.info("[MapStudio][Admin] boundaries count:", result.boundariesCount);
  for (const region of result.regions) {
    console.info(
      "[Admin] child boundary count:",
      `${region.name}/${region.adcode ?? ""} ${region.boundaries.length}`.trim(),
    );
  }
  if (result.query.targetLevel === "province") {
    console.info("[MapStudio][Admin] province count:", result.regions.length);
    console.info(
      "[MapStudio][Admin] province names:",
      result.regions.map((region) => region.name).join(", "),
    );
    for (const region of result.regions) {
      console.info(
        `[MapStudio][Admin] ${region.name} boundaries count:`,
        region.boundaries.length,
      );
    }
  }
}

function logAdministrativeBoundaryFailure(
  query: AmapAdministrativeBoundaryQuery,
  message: string,
) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.info("[MapStudio][Admin] current zoom:", query.zoom);
  console.info("[MapStudio][Admin] target level:", query.targetLevel);
  console.info("[MapStudio][Admin] query:", query.adcode);
  console.info(
    "[MapStudio][Admin] query keyword/adcode:",
    `${query.keyword}/${query.adcode}`,
  );
  console.info("[MapStudio][Admin] loaded regions count:", 0);
  console.info("[MapStudio][Admin] region names:", "");
  console.info("[MapStudio][Admin] boundaries count:", 0);
  console.info("[MapStudio][Admin] error:", message);
}

function logParentAdministrativeQuery(input: {
  query: AmapAdministrativeBoundaryQuery;
  status: string;
  children: AMapDistrictSearchDistrict[];
}) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.info(
    "[Admin] parent query keyword/adcode:",
    `${input.query.keyword}/${input.query.adcode}`,
  );
  console.info("[Admin] parent status:", input.status);
  console.info("[Admin] child count:", input.children.length);
  console.info(
    "[Admin] child names/adcodes:",
    input.children
      .map((child) => `${child.name ?? "未知行政区"}/${child.adcode ?? ""}`)
      .join(", "),
  );
  console.info("[MapStudio][Admin] parent query:", input.query.adcode);
  console.info("[MapStudio][Admin] children count:", input.children.length);
  console.info(
    "[MapStudio][Admin] child names:",
    input.children.map((child) => child.name).filter(Boolean).join(", "),
  );
}

function logChildBoundaryQuery(child: AMapDistrictSearchDistrict) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.info(
    "[Admin] fetching child boundary:",
    `${child.name ?? "未知行政区"}/${child.adcode ?? ""}`.trim(),
  );
  console.info(
    "[MapStudio][Admin] querying child boundary:",
    `${child.name ?? "未知行政区"} ${child.adcode ?? ""}`.trim(),
  );
}

function logChildBoundaryFailure(child: AMapDistrictSearchDistrict) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.info(
    "[Admin] 行政区划 boundary 查询失败:",
    `${child.name ?? "未知行政区"}/${child.adcode ?? ""}`.trim(),
  );
  console.info(
    "[MapStudio][Admin] 行政区划 boundary 查询失败:",
    `${child.name ?? "未知行政区"} ${child.adcode ?? ""}`.trim(),
  );
}

function ensureDistrictSearch(amap: AMapGlobal) {
  if (typeof amap.DistrictSearch === "function") {
    if (process.env.NODE_ENV !== "production") {
      console.info("[MapStudio][Admin] DistrictSearch plugin loaded:", true);
    }
    return Promise.resolve(true);
  }

  if (typeof amap.plugin !== "function") {
    if (process.env.NODE_ENV !== "production") {
      console.info("[MapStudio][Admin] DistrictSearch plugin loaded:", false);
    }
    return Promise.resolve(false);
  }

  return new Promise<boolean>((resolve) => {
    try {
      amap.plugin?.(["AMap.DistrictSearch"], () => {
        const loaded = typeof amap.DistrictSearch === "function";
        if (process.env.NODE_ENV !== "production") {
          console.info(
            "[MapStudio][Admin] DistrictSearch plugin loaded:",
            loaded,
          );
        }
        resolve(loaded);
      });
    } catch {
      if (process.env.NODE_ENV !== "production") {
        console.info("[MapStudio][Admin] DistrictSearch plugin loaded:", false);
      }
      resolve(false);
    }
  });
}

async function fetchAdministrativeBoundariesFromAmap(
  amap: AMapGlobal,
  query: AmapAdministrativeBoundaryQuery,
): Promise<LoadedAdministrativeBoundaries> {
  const hasDistrictSearch = await ensureDistrictSearch(amap);

  if (!hasDistrictSearch || typeof amap.DistrictSearch !== "function") {
    const message = "AMap.DistrictSearch 不可用";
    logAdministrativeBoundaryFailure(query, message);
    throw new Error(message);
  }

  const DistrictSearch = amap.DistrictSearch;

  function summarizeDistrictSearchResult(result: AMapDistrictSearchResult | string) {
    if (typeof result === "string") {
      return result;
    }

    const roots = result.districtList ?? [];
    return `districtList=${roots.length}; roots=${roots
      .slice(0, 3)
      .map((district) => district.name ?? district.adcode ?? "未知")
      .join(", ")}`;
  }

  function hasDistrictSearchPayload(result: AMapDistrictSearchResult | string) {
    return typeof result !== "string" && (result.districtList?.length ?? 0) > 0;
  }

  function searchDistrictOnce(input: {
    keyword: string;
    level: "country" | "province" | "city" | "district";
    subdistrict: number;
    extensions: "all" | "base";
    timeoutMs?: number;
  }) {
    return new Promise<{
      status: string;
      result: AMapDistrictSearchResult | string;
      keyword: string;
    }>((resolve, reject) => {
      const search = new DistrictSearch({
        extensions: input.extensions,
        subdistrict: input.subdistrict,
        level: input.level,
        showbiz: false,
      });
      let settled = false;
      const timeoutMs = input.timeoutMs ?? 20000;
      const timeoutId = globalThis.setTimeout(() => {
        if (settled) {
          return;
        }

        settled = true;
        if (process.env.NODE_ENV !== "production") {
          console.info(
            "[AdminRuntime] DistrictSearch timeout:",
            input.keyword,
            `${timeoutMs}ms`,
          );
        }
        reject(new Error(`行政区划查询超时：${input.keyword}`));
      }, timeoutMs);

      search.search(input.keyword, (status, result) => {
        if (settled) {
          return;
        }

        settled = true;
        globalThis.clearTimeout(timeoutId);
        if (process.env.NODE_ENV !== "production") {
          console.info(
            "[AdminRuntime] DistrictSearch callback:",
            input.keyword,
            status,
            summarizeDistrictSearchResult(result),
          );
        }

        if (status !== "complete" || !hasDistrictSearchPayload(result)) {
          reject(
            new Error(
              `行政区划查询无结果：${input.keyword} / ${status} / ${summarizeDistrictSearchResult(result)}`,
            ),
          );
          return;
        }

        resolve({ status, result, keyword: input.keyword });
      });
    });
  }

  async function searchDistrict(input: {
    keywords: string[];
    level: "country" | "province" | "city" | "district";
    subdistrict: number;
    extensions: "all" | "base";
  }) {
    const uniqueKeywords = Array.from(
      new Set(input.keywords.map((keyword) => keyword.trim()).filter(Boolean)),
    );
    const errors: string[] = [];

    for (const keyword of uniqueKeywords) {
      try {
        return await searchDistrictOnce({ ...input, keyword });
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }

    throw new Error(errors[0] ?? "行政区划加载失败");
  }

  async function fetchChildBoundaries(
    children: AMapDistrictSearchDistrict[],
    concurrency = 2,
  ) {
    const results: Array<
      PromiseSettledResult<LoadedAdministrativeBoundaryRegion>
    > = [];
    let nextIndex = 0;

    async function worker() {
      while (nextIndex < children.length) {
        const index = nextIndex;
        nextIndex += 1;
        const child = children[index]!;

        try {
          logChildBoundaryQuery(child);
          const childSearch = await searchDistrict({
            keywords: [child.adcode ?? "", child.name ?? ""],
            level: query.targetLevel,
            subdistrict: 0,
            extensions: "all",
          });
          const district = findMatchingDistrictCandidate(
            getDistrictCandidates(childSearch.result),
            child,
          );
          const boundaries = (district?.boundaries ?? [])
            .map(parseBoundaryPath)
            .filter((path) => path.length >= 3);

          if (boundaries.length === 0) {
            logChildBoundaryFailure(child);
            throw new Error(
              `行政区划 boundary 查询失败：${child.name ?? child.adcode ?? index}`,
            );
          }

          const center =
            parseBoundaryPoint(district?.center) ??
            parseBoundaryPoint(child.center);
          const labelPosition = resolveBoundaryLabelPosition(boundaries, center);

          results[index] = {
            status: "fulfilled",
            value: {
              id: `admin-${child.adcode ?? `${query.adcode}-${index}`}`,
              name: child.name ?? district?.name ?? `行政区 ${index + 1}`,
              adcode: child.adcode ?? district?.adcode,
              level: query.targetLevel,
              parentAdcode: query.adcode,
              center,
              labelPosition: labelPosition.position,
              labelPositionSource: labelPosition.source,
              boundaries,
            },
          };
        } catch (error) {
          results[index] = {
            status: "rejected",
            reason: error,
          };
        }
      }
    }

    await Promise.all(
      Array.from(
        { length: Math.min(concurrency, children.length) },
        () => worker(),
      ),
    );

    return results;
  }

  if (process.env.NODE_ENV !== "production") {
    console.info("[MapStudio][Admin] query:", query.adcode);
    console.info("[MapStudio][Admin] target level:", query.targetLevel);
  }

  try {
    const parentSearch = await searchDistrict({
      keywords: [query.adcode, query.keyword],
      level: query.searchLevel,
      subdistrict: 1,
      extensions: "base",
    });
    const children = getParentDistrictChildren(parentSearch.result);
    logParentAdministrativeQuery({ query, status: parentSearch.status, children });

    if (children.length === 0) {
      const message = "行政区划 children 查询失败";
      logAdministrativeBoundaryFailure(query, message);
      throw new Error(message);
    }

    const childResults = await fetchChildBoundaries(children);
    const regions = childResults
      .filter(
        (result): result is PromiseFulfilledResult<LoadedAdministrativeBoundaryRegion> =>
          result.status === "fulfilled",
      )
      .map((result) => result.value);

    for (const result of childResults) {
      if (result.status === "rejected" && process.env.NODE_ENV !== "production") {
        console.info("[MapStudio][Admin]", result.reason);
      }
    }

    const loaded: LoadedAdministrativeBoundaries = {
      query,
      regions,
      boundariesCount: regions.reduce(
        (count, region) => count + region.boundaries.length,
        0,
      ),
      fetchedAt: new Date().toISOString(),
      source: "amap_district_search",
    };

    if (loaded.regions.length === 0 || loaded.boundariesCount === 0) {
      const message = "行政区子级边界未返回，请检查是否对 child adcode 单独查询。";
      logAdministrativeBoundaryFailure(query, message);
      throw new Error(message);
    }

    rememberAdministrativeRegions(loaded.regions);
    logAdministrativeBoundaryResult(loaded);
    logAdminData({
      targetLevel: query.targetLevel,
      parentAdcode: query.adcode,
      apiLevel: getAdminBoundaryApiLevel(query.targetLevel),
      count: loaded.regions.length,
      hasGeometryCount: loaded.regions.filter((region) => region.boundaries.length > 0).length,
      source: "amap",
    });
    return attachParentBoundaryRegions(amap, loaded);
  } catch (error) {
    const message = error instanceof Error ? error.message : "行政区划加载失败";
    logAdministrativeBoundaryFailure(query, message);
    throw error;
  }
}

async function fetchAdministrativeBoundaryEntryFromDataHub(
  query: AmapAdministrativeBoundaryQuery,
): Promise<AdminBoundaryCacheEntry | null> {
  const apiLevel = getAdminBoundaryApiLevel(query.targetLevel);
  const bboxTuple = query.viewportBounds
    ? [
        query.viewportBounds.minLng,
        query.viewportBounds.minLat,
        query.viewportBounds.maxLng,
        query.viewportBounds.maxLat,
      ] as [number, number, number, number]
    : undefined;
  const requestedUrl = bboxTuple
    ? `/api/data-hub/admin-boundaries?level=${encodeURIComponent(apiLevel)}` +
      `&bbox=${bboxTuple.join(",")}&includeGeometry=true`
    : `/api/data-hub/admin-boundaries?parentAdcode=${encodeURIComponent(query.adcode)}` +
      `&level=${encodeURIComponent(apiLevel)}&includeGeometry=true`;
  const result = await fetchAdminBoundaries({
    parentAdcode: bboxTuple ? undefined : query.adcode,
    level: apiLevel,
    bbox: bboxTuple,
    includeGeometry: true,
  });
  const hasGeometryCount = result.features.filter((feature) => Boolean(feature.geometry)).length;

  logAdminData({
    targetLevel: query.targetLevel,
    parentAdcode: query.adcode,
    apiLevel,
    requestedUrl,
    count: result.count,
    hasGeometryCount,
    source: "datahub",
  });

  if (
    apiLevel === "county" &&
    result.count === 0 &&
    process.env.NODE_ENV !== "production"
  ) {
    console.info(
      `[MapStudio][AdminData] county data missing for parentAdcode=${query.adcode}`,
    );
  }

  return createAdministrativeCacheEntryFromDataHub(query, result);
}

async function fetchAdministrativeBoundaryEntryFromProviders(
  amap: AMapGlobal,
  query: AmapAdministrativeBoundaryQuery,
) {
  try {
    const dataHubEntry = await fetchAdministrativeBoundaryEntryFromDataHub(query);

    if (dataHubEntry) {
      return {
        entry: dataHubEntry,
        source: "datahub" as const,
      };
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        "[MapStudio][AdminCache] Data Hub miss/failure:",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  const amapResult = await fetchAdministrativeBoundariesFromAmap(amap, query);
  return {
    entry: createAdministrativeCacheEntry(amapResult),
    source: "amap" as const,
  };
}

async function refreshAdministrativeBoundaryCacheInBackground(
  amap: AMapGlobal,
  query: AmapAdministrativeBoundaryQuery,
  cacheKey: string,
) {
  if (inflightAdministrativeBoundaryRequests.has(cacheKey)) {
    return;
  }

  const providerRequest = fetchAdministrativeBoundaryEntryFromProviders(amap, query)
    .then(async ({ entry }) => {
      setMemoryAdminBoundary(cacheKey, entry);
      await writeAdministrativeBoundaryPersistentCache(cacheKey, entry);
      return entry;
    })
    .finally(() => {
      inflightAdministrativeBoundaryRequests.delete(cacheKey);
    });

  inflightAdministrativeBoundaryRequests.set(cacheKey, providerRequest);

  try {
    await providerRequest;
  } catch {
    return;
  }
}

async function loadAdministrativeParentBoundaryRegions(
  amap: AMapGlobal,
  query: AmapAdministrativeBoundaryQuery,
  requestId?: number,
): Promise<LoadedAdministrativeBoundaryRegion[]> {
  const parentAdcodes = query.parentAdcodes ?? [query.adcode];

  if (query.targetLevel === "city") {
    const parentCodeSet = new Set(parentAdcodes);
    const provinceResult = await loadAdministrativeBoundaries(amap, {
      query: {
        keyword: "中国",
        adcode: "100000",
        parentAdcodes: ["100000"],
        parentNames: ["中国"],
        targetLevel: "province",
        searchLevel: "country",
        subdistrict: 1,
        center: query.center,
        zoom: query.zoom,
      },
      requestId,
    });

    return provinceResult.regions.filter((region) =>
      Boolean(region.adcode && parentCodeSet.has(region.adcode)),
    );
  }

  if (query.targetLevel === "district") {
    const parentCodeSet = new Set(parentAdcodes);
    return Array.from(administrativeRegionLookup.values()).filter((region) =>
      Boolean(region.adcode && parentCodeSet.has(region.adcode)),
    );
  }

  return [];
}

async function attachParentBoundaryRegions(
  amap: AMapGlobal,
  result: LoadedAdministrativeBoundaries,
  requestId?: number,
): Promise<LoadedAdministrativeBoundaries> {
  if (result.query.targetLevel === "province") {
    return result;
  }

  try {
    const parentBoundaryRegions = await loadAdministrativeParentBoundaryRegions(
      amap,
      result.query,
      requestId,
    );

    return {
      ...result,
      parentBoundaryRegions,
    };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        "[MapStudio][AdminRender] parent boundary overlay unavailable:",
        error instanceof Error ? error.message : String(error),
      );
    }

    return result;
  }
}

export function prefetchAdjacentAdministrativeBoundaries(
  amap: AMapGlobal,
  result: LoadedAdministrativeBoundaries,
) {
  const query = result.query;
  let prefetchQuery: AmapAdministrativeBoundaryQuery | null = null;

  if (query.targetLevel === "province") {
    const nextQuery = resolveAdministrativeBoundaryQuery({
      zoom: 7,
      center: query.center,
      previousLevel: "province",
    });

    if (nextQuery.targetLevel === "city" && nextQuery.adcode !== query.adcode) {
      prefetchQuery = nextQuery;
    }
  }

  if (query.targetLevel === "city") {
    const nextQuery = resolveAdministrativeBoundaryQuery({
      zoom: 10.2,
      center: query.center,
      previousLevel: "city",
    });

    if (nextQuery.targetLevel === "district" && nextQuery.adcode !== query.adcode) {
      prefetchQuery = nextQuery;
    }
  }

  if (!prefetchQuery || hasAdministrativeBoundaryCacheOrInflight(prefetchQuery)) {
    return;
  }

  void loadAdministrativeBoundaries(amap, {
    query: prefetchQuery,
  }).catch(() => undefined);
}

export async function loadAdministrativeBoundaries(
  amap: AMapGlobal,
  input: {
    query?: AmapAdministrativeBoundaryQuery;
    keyword?: string;
    adcode?: string;
    level?: AmapAdministrativeLevel;
    zoom?: number;
    center?: MapCenter | null;
    bounds?: MapBounds | null;
    requestId?: number;
    skipParentBoundaryOverlay?: boolean;
  },
): Promise<LoadedAdministrativeBoundaries> {
  const inputCenter = input.center ?? undefined;
  const center: MapCenter = isValidMapCenter(inputCenter)
    ? inputCenter
    : DEFAULT_AMAP_CENTER;
  const query = input.query ?? (input.keyword && input.adcode && input.level
    ? {
        keyword: input.keyword,
        adcode: input.adcode,
        targetLevel: input.level,
        searchLevel: input.level === "province"
          ? "country"
          : input.level === "city"
            ? "province"
            : "city",
        subdistrict: 1,
        center,
        zoom: input.zoom ?? DEFAULT_AMAP_ZOOM,
      } satisfies AmapAdministrativeBoundaryQuery
    : resolveAdministrativeBoundaryQuery({
        zoom: input.zoom ?? DEFAULT_AMAP_ZOOM,
        center: input.center,
        bounds: input.bounds,
      }));
  const parentAdcodes = query.parentAdcodes
    ?.filter((adcode) => /^\d{6}$/.test(adcode))
    .filter((adcode, index, list) => list.indexOf(adcode) === index);
  const finalizeLoaded = (loaded: LoadedAdministrativeBoundaries) =>
    input.skipParentBoundaryOverlay
      ? loaded
      : attachParentBoundaryRegions(amap, loaded, input.requestId);

  if (parentAdcodes && parentAdcodes.length > 1) {
    const childQueries = parentAdcodes.map((adcode, index) => ({
      ...query,
      keyword: query.parentNames?.[index] ?? adcode,
      adcode,
      parentAdcodes: undefined,
      parentNames: undefined,
      searchLevel: query.targetLevel === "city"
        ? "province" as const
        : query.targetLevel === "district"
          ? "city" as const
          : "country" as const,
    }));
    const settledResults = await Promise.allSettled(
      childQueries.map((childQuery) =>
        loadAdministrativeBoundaries(amap, {
          query: childQuery,
          requestId: input.requestId,
          skipParentBoundaryOverlay: true,
        }),
      ),
    );
    const successfulResults = settledResults
      .filter(
        (result): result is PromiseFulfilledResult<LoadedAdministrativeBoundaries> =>
          result.status === "fulfilled",
      )
      .map((result) => result.value);

    if (successfulResults.length === 0) {
      const firstFailure = settledResults.find(
        (result): result is PromiseRejectedResult => result.status === "rejected",
      );
      throw firstFailure?.reason instanceof Error
        ? firstFailure.reason
        : new Error("行政区划多父级加载失败");
    }

    const dedupedRegions = new Map<string, LoadedAdministrativeBoundaryRegion>();

    for (const result of successfulResults) {
      for (const region of result.regions) {
        dedupedRegions.set(region.adcode ?? region.id, region);
      }
    }

    const regions = Array.from(dedupedRegions.values()).sort((left, right) =>
      (left.adcode ?? left.id).localeCompare(right.adcode ?? right.id),
    );
    rememberAdministrativeRegions(regions);
    const cacheSources = Array.from(
      new Set(
        successfulResults
          .map((result) => result.cacheSource)
          .filter(
            (source): source is NonNullable<LoadedAdministrativeBoundaries["cacheSource"]> =>
              Boolean(source),
          ),
      ),
    );
    const cacheSource = cacheSources.length === 1 ? cacheSources[0] : "datahub";
    const loaded: LoadedAdministrativeBoundaries = {
      query,
      regions,
      boundariesCount: regions.reduce(
        (count, region) => count + region.boundaries.length,
        0,
      ),
      fetchedAt: new Date().toISOString(),
      source: "admin_boundary_cache",
      cacheSource,
      cacheHit: successfulResults.every((result) => result.cacheHit),
      isStale: successfulResults.some((result) => result.isStale),
    };

    logAdminRender({
      targetLevel: query.targetLevel,
      parentAdcodes,
      totalFeatures: regions.length,
    });

    return finalizeLoaded(loaded);
  }

  const cacheKey = getAdministrativeBoundaryCacheKey(query);
  const apiLevel = getAdminBoundaryApiLevel(query.targetLevel);
  const startMs = Date.now();
  const memoryEntry = getMemoryAdminBoundary(cacheKey);

  if (memoryEntry) {
    const isStale = isAdminBoundaryCacheEntryExpired(memoryEntry);

    logAdminCache({
      cacheKey,
      source: isStale ? "stale-cache" : "memory",
      hit: true,
      requestId: input.requestId,
      targetLevel: query.targetLevel,
      apiLevel,
      parentAdcode: query.adcode,
      featureCount: memoryEntry.features.length,
      hasGeometryCount: memoryEntry.features.filter((feature) => feature.boundaries.length > 0).length,
      renderDelayMs: Date.now() - startMs,
      ignoredStaleRequest: false,
    });

    if (isStale) {
      void refreshAdministrativeBoundaryCacheInBackground(amap, query, cacheKey);
    }

    return finalizeLoaded(createLoadedAdministrativeBoundariesFromCache(
      query,
      memoryEntry,
      isStale ? "stale-cache" : "memory",
      isStale,
    ));
  }

  const persistentEntry = await readAdministrativeBoundaryPersistentCache(cacheKey);

  if (persistentEntry) {
    setMemoryAdminBoundary(cacheKey, persistentEntry);
    const isStale = isAdminBoundaryCacheEntryExpired(persistentEntry);

    logAdminCache({
      cacheKey,
      source: isStale ? "stale-cache" : "indexeddb",
      hit: true,
      requestId: input.requestId,
      targetLevel: query.targetLevel,
      apiLevel,
      parentAdcode: query.adcode,
      featureCount: persistentEntry.features.length,
      hasGeometryCount: persistentEntry.features.filter((feature) => feature.boundaries.length > 0).length,
      renderDelayMs: Date.now() - startMs,
      ignoredStaleRequest: false,
    });

    if (isStale) {
      void refreshAdministrativeBoundaryCacheInBackground(amap, query, cacheKey);
    }

    return finalizeLoaded(createLoadedAdministrativeBoundariesFromCache(
      query,
      persistentEntry,
      isStale ? "stale-cache" : "indexeddb",
      isStale,
    ));
  }

  const inflightRequest = inflightAdministrativeBoundaryRequests.get(cacheKey);

  if (inflightRequest) {
    const entry = await inflightRequest;
    logAdminCache({
      cacheKey,
      source: entry.source === "datahub" ? "datahub" : "amap",
      hit: false,
      requestId: input.requestId,
      targetLevel: query.targetLevel,
      apiLevel,
      parentAdcode: query.adcode,
      featureCount: entry.features.length,
      hasGeometryCount: entry.features.filter((feature) => feature.boundaries.length > 0).length,
      renderDelayMs: Date.now() - startMs,
      ignoredStaleRequest: false,
    });
    return finalizeLoaded(createLoadedAdministrativeBoundariesFromCache(
      query,
      entry,
      entry.source === "datahub" ? "datahub" : "amap",
    ));
  }

  const providerRequest = fetchAdministrativeBoundaryEntryFromProviders(amap, query)
    .then(async ({ entry }) => {
      setMemoryAdminBoundary(cacheKey, entry);
      await writeAdministrativeBoundaryPersistentCache(cacheKey, entry);
      return entry;
    })
    .finally(() => {
      inflightAdministrativeBoundaryRequests.delete(cacheKey);
    });

  inflightAdministrativeBoundaryRequests.set(cacheKey, providerRequest);

  const entry = await providerRequest;
  logAdminCache({
    cacheKey,
    source: entry.source === "datahub" ? "datahub" : "amap",
    hit: false,
    requestId: input.requestId,
    targetLevel: query.targetLevel,
    apiLevel,
    parentAdcode: query.adcode,
    featureCount: entry.features.length,
    hasGeometryCount: entry.features.filter((feature) => feature.boundaries.length > 0).length,
    renderDelayMs: Date.now() - startMs,
    ignoredStaleRequest: false,
  });

  return finalizeLoaded(createLoadedAdministrativeBoundariesFromCache(
    query,
    entry,
    entry.source === "datahub" ? "datahub" : "amap",
  ));
}

function createAdminBoundaryLabel(
  amap: AMapGlobal,
  map: AMapMapInstance,
  region: LoadedAdministrativeBoundaryRegion,
  index: number,
  level: AmapAdministrativeLevel,
) {
  const center = region.labelPosition ?? region.center;

  if (!center || typeof amap.Marker !== "function") {
    return null;
  }

  try {
    const marker = new amap.Marker(
      buildAmapRegionLabelOptions({
        id: `${region.id}-label`,
        name: region.name,
        shortName: region.name,
        coordinates: center,
        priority: index + 1,
        labelKind: level,
        zIndex: 205 - index,
      }),
    );
    marker.setMap(map);
    return marker;
  } catch {
    return null;
  }
}

function getAdminLabelDistanceSquared(left: MapCenter, right: MapCenter) {
  const lngDx = left.lng - right.lng;
  const latDy = left.lat - right.lat;
  return lngDx * lngDx + latDy * latDy;
}

function getAdminLabelMinimumDistanceDegrees(
  level: AmapAdministrativeLevel,
  zoom: number | undefined,
) {
  const safeZoom = Number.isFinite(zoom) ? Number(zoom) : 8;

  if (level === "province") {
    return 0;
  }

  if (level === "city") {
    return Math.max(0.18, 0.85 / Math.max(1, safeZoom - 4));
  }

  return Math.max(0.035, 0.3 / Math.max(1, safeZoom - 7));
}

function getAdminLabelLimit(level: AmapAdministrativeLevel, zoom: number | undefined) {
  const safeZoom = Number.isFinite(zoom) ? Number(zoom) : 8;

  if (level === "province") {
    return Number.POSITIVE_INFINITY;
  }

  if (level === "city") {
    return safeZoom < 7.2 ? 48 : 80;
  }

  if (safeZoom < 10) return 26;
  if (safeZoom < 11.2) return 42;
  return 72;
}

export function selectAdminBoundaryLabelRegionsForRender(
  regions: LoadedAdministrativeBoundaryRegion[],
  input: {
    targetLevel: AmapAdministrativeLevel;
    center?: MapCenter | null;
    zoom?: number;
  },
) {
  if (input.targetLevel === "province") {
    return regions;
  }

  const fallbackCenter = input.center ?? DEFAULT_AMAP_CENTER;
  const minDistance = getAdminLabelMinimumDistanceDegrees(
    input.targetLevel,
    input.zoom,
  );
  const minDistanceSquared = minDistance * minDistance;
  const labelLimit = getAdminLabelLimit(input.targetLevel, input.zoom);
  const accepted: LoadedAdministrativeBoundaryRegion[] = [];
  const candidates = [...regions]
    .filter((region) => region.labelPosition ?? region.center)
    .sort((left, right) => {
      const leftPoint = left.labelPosition ?? left.center ?? fallbackCenter;
      const rightPoint = right.labelPosition ?? right.center ?? fallbackCenter;
      return (
        getAdminLabelDistanceSquared(leftPoint, fallbackCenter) -
        getAdminLabelDistanceSquared(rightPoint, fallbackCenter)
      );
    });

  for (const region of candidates) {
    const point = region.labelPosition ?? region.center;

    if (!point) {
      continue;
    }

    if (
      accepted.every((acceptedRegion) => {
        const acceptedPoint = acceptedRegion.labelPosition ?? acceptedRegion.center;
        return acceptedPoint
          ? getAdminLabelDistanceSquared(point, acceptedPoint) >= minDistanceSquared
          : true;
      })
    ) {
      accepted.push(region);
    }

    if (accepted.length >= labelLimit) {
      break;
    }
  }

  return accepted.sort((left, right) => regions.indexOf(left) - regions.indexOf(right));
}

function getAdminBoundaryStyleMode(): AdminBoundaryStyleMode {
  const value = process.env.NEXT_PUBLIC_MAP_STUDIO_ADMIN_BOUNDARY_STYLE_MODE;

  return value === "normal" || value === "debug" ? value : "soft";
}

export function resolveAdminBoundaryPolygonStyle(input: {
  level: AmapAdministrativeLevel;
  index?: number;
  parentAdcode?: string;
  fillOpacity?: number;
  strokeOpacity?: number;
  strokeWeight?: number;
  styleMode?: AdminBoundaryStyleMode;
}): AdminBoundaryPolygonStyle {
  const level = input.level;
  const index = input.index ?? 0;
  const mode = input.styleMode ?? getAdminBoundaryStyleMode();
  const color = ADMIN_BOUNDARY_PALETTE[index % ADMIN_BOUNDARY_PALETTE.length]!;
  const fillColor = level === "province"
    ? color.fill
    : getAdminParentFillColor(input.parentAdcode, index);
  const strokeColor = level === "province"
    ? "rgba(109,88,52,0.58)"
    : level === "city"
      ? "rgba(62,56,45,0.44)"
      : "rgba(82,74,62,0.3)";
  const defaults = level === "province"
    ? {
        fillOpacity: 0.07,
        maxFillOpacity: 0.09,
        strokeOpacity: 0.62,
        strokeWeight: 1.9,
        maxStrokeWeight: 2.15,
      }
    : level === "city"
      ? {
          fillOpacity: 0.05,
          maxFillOpacity: 0.065,
          strokeOpacity: 0.48,
          strokeWeight: 1.25,
          maxStrokeWeight: 1.45,
        }
      : {
          fillOpacity: 0.032,
          maxFillOpacity: 0.045,
          strokeOpacity: 0.34,
          strokeWeight: 0.68,
          maxStrokeWeight: 0.85,
        };
  const modeBoost = mode === "debug"
    ? { fill: 1.35, strokeOpacity: 1.28, strokeWeight: 1.18 }
    : mode === "normal"
      ? { fill: 1.16, strokeOpacity: 1.12, strokeWeight: 1.08 }
      : { fill: 1, strokeOpacity: 1, strokeWeight: 1 };
  const requestedFillOpacity =
    typeof input.fillOpacity === "number" ? input.fillOpacity : defaults.fillOpacity;
  const requestedStrokeOpacity =
    typeof input.strokeOpacity === "number" ? input.strokeOpacity : defaults.strokeOpacity;
  const requestedStrokeWeight =
    typeof input.strokeWeight === "number" ? input.strokeWeight : defaults.strokeWeight;

  return {
    fillColor,
    fillOpacity: Math.min(
      requestedFillOpacity * modeBoost.fill,
      defaults.maxFillOpacity,
    ),
    strokeColor,
    strokeOpacity: Math.min(requestedStrokeOpacity * modeBoost.strokeOpacity, 0.78),
    strokeWeight: Math.min(
      requestedStrokeWeight * modeBoost.strokeWeight,
      defaults.maxStrokeWeight,
    ),
  };
}

function quantizeAdminBoundarySegmentCoordinate(value: number, precision: number) {
  return value.toFixed(precision);
}

const ADMIN_BOUNDARY_TOPOLOGY_CACHE_LIMIT = 160;
const ADMIN_BOUNDARY_TOPOLOGY_CACHE_VERSION = "topology-v2";

export function getAdminBoundarySnapTolerance(level: AmapAdministrativeLevel) {
  if (level === "province") {
    return 0.001;
  }

  if (level === "city") {
    return 0.0005;
  }

  return 0.00015;
}

function snapAdminBoundaryCoordinate(value: number, tolerance: number) {
  if (!Number.isFinite(value) || tolerance <= 0) {
    return value;
  }

  return Math.round(value / tolerance) * tolerance;
}

function snapAdminBoundaryPoint(point: MapCenter, tolerance: number): MapCenter {
  if (tolerance <= 0) {
    return point;
  }

  return {
    lat: snapAdminBoundaryCoordinate(point.lat, tolerance),
    lng: snapAdminBoundaryCoordinate(point.lng, tolerance),
  };
}

function getAdminBoundarySegmentKey(
  start: MapCenter,
  end: MapCenter,
  precision: number,
  tolerance = 0,
) {
  const normalizedStart = snapAdminBoundaryPoint(start, tolerance);
  const normalizedEnd = snapAdminBoundaryPoint(end, tolerance);
  const left = [
    quantizeAdminBoundarySegmentCoordinate(normalizedStart.lng, precision),
    quantizeAdminBoundarySegmentCoordinate(normalizedStart.lat, precision),
  ].join(",");
  const right = [
    quantizeAdminBoundarySegmentCoordinate(normalizedEnd.lng, precision),
    quantizeAdminBoundarySegmentCoordinate(normalizedEnd.lat, precision),
  ].join(",");

  return left < right ? `${left}|${right}` : `${right}|${left}`;
}

export function getAdminBoundaryTopologyCacheKey(input: {
  targetLevel: AmapAdministrativeLevel;
  displayMode?: string | null;
  adminPrecision?: string | null;
  regionIds: Iterable<string | null | undefined>;
  viewportTileKey?: string | null;
  tolerance: number;
}) {
  const regionKey = Array.from(input.regionIds)
    .filter((id): id is string => Boolean(id))
    .sort()
    .join(",");

  return [
    ADMIN_BOUNDARY_TOPOLOGY_CACHE_VERSION,
    input.targetLevel,
    input.displayMode ?? "gcj02",
    input.adminPrecision ?? "auto",
    input.viewportTileKey ?? "viewport",
    input.tolerance.toFixed(8),
    regionKey,
  ].join(":");
}

function rememberAdminBoundaryTopologyCache(
  cacheKey: string | null | undefined,
  result: AdminBoundaryLineSegmentBuildResult,
) {
  if (!cacheKey) {
    return;
  }

  if (adminBoundaryTopologyCache.has(cacheKey)) {
    adminBoundaryTopologyCache.delete(cacheKey);
  }

  adminBoundaryTopologyCache.set(cacheKey, result);
  while (adminBoundaryTopologyCache.size > ADMIN_BOUNDARY_TOPOLOGY_CACHE_LIMIT) {
    const oldestKey = adminBoundaryTopologyCache.keys().next().value as string | undefined;
    if (!oldestKey) {
      break;
    }
    adminBoundaryTopologyCache.delete(oldestKey);
  }
}

function isFiniteAdminBoundaryPoint(point: MapCenter | null | undefined) {
  return Boolean(
    point &&
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng),
  );
}

export function buildAdminBoundaryLineSegments(
  regions: LoadedAdministrativeBoundaryRegion[],
  options: {
    precision?: number;
    tolerance?: number;
    mode?: "all" | "shared";
    targetLevel?: AmapAdministrativeLevel;
    cacheKey?: string | null;
  } = {},
): AdminBoundaryLineSegmentBuildResult {
  const precision = options.precision ?? 5;
  const tolerance =
    options.tolerance ??
    (options.targetLevel ? getAdminBoundarySnapTolerance(options.targetLevel) : 0);
  const cached = options.cacheKey
    ? adminBoundaryTopologyCache.get(options.cacheKey)
    : null;

  if (cached) {
    return cached;
  }

  const segments = new Map<string, AdminBoundaryLineSegment & { exactKeys: Set<string> }>();
  const nearDuplicateBuckets = new Map<string, Set<string>>();
  const stats: AdminBoundaryLineSegmentBuildStats = {
    targetLevel: options.targetLevel,
    featureCount: regions.length,
    polygonCount: 0,
    ringCount: 0,
    rawSegmentCount: 0,
    dedupedSegmentCount: 0,
    duplicateSegmentCount: 0,
    snappedSegmentCount: 0,
    unmatchedNearDuplicateSegmentCount: 0,
    snappedSegmentRatio: 0,
    dedupeRatio: 0,
    skippedSegmentCount: 0,
    tolerance,
  };

  for (const region of regions) {
    for (const ring of region.boundaries) {
      stats.ringCount += 1;
      if (ring.length < 3) {
        stats.skippedSegmentCount += 1;
        continue;
      }
      stats.polygonCount += 1;

      const lastIndex = ring.length - 1;
      const isClosed =
        ring[0]!.lat === ring[lastIndex]!.lat &&
        ring[0]!.lng === ring[lastIndex]!.lng;
      const segmentCount = isClosed ? lastIndex : ring.length;

      for (let index = 0; index < segmentCount; index += 1) {
        const start = ring[index]!;
        const end = ring[(index + 1) % ring.length]!;

        if (
          !isFiniteAdminBoundaryPoint(start) ||
          !isFiniteAdminBoundaryPoint(end) ||
          (start.lat === end.lat && start.lng === end.lng)
        ) {
          stats.skippedSegmentCount += 1;
          continue;
        }

        stats.rawSegmentCount += 1;
        const exactKey = getAdminBoundarySegmentKey(start, end, 8, 0);
        const key = getAdminBoundarySegmentKey(start, end, precision, tolerance);
        const nearDuplicateKey = getAdminBoundarySegmentKey(
          start,
          end,
          precision,
          tolerance > 0 ? tolerance * 2 : 0,
        );
        const nearDuplicateBucket =
          nearDuplicateBuckets.get(nearDuplicateKey) ?? new Set<string>();
        nearDuplicateBucket.add(key);
        nearDuplicateBuckets.set(nearDuplicateKey, nearDuplicateBucket);
        const existing = segments.get(key);

        if (existing) {
          if (!existing.exactKeys.has(exactKey)) {
            stats.snappedSegmentCount += 1;
            existing.exactKeys.add(exactKey);
          }
          existing.count += 1;
        } else {
          segments.set(key, {
            key,
            path: [start, end],
            count: 1,
            exactKeys: new Set([exactKey]),
          });
        }
      }
    }
  }

  const dedupedSegments = Array.from(segments.values())
    .map((segment) => ({
      key: segment.key,
      path: segment.path,
      count: segment.count,
    }))
    .sort((left, right) => left.key.localeCompare(right.key));
  stats.dedupedSegmentCount = dedupedSegments.length;
  stats.duplicateSegmentCount = Math.max(
    0,
    stats.rawSegmentCount - stats.dedupedSegmentCount,
  );
  stats.unmatchedNearDuplicateSegmentCount = Array.from(nearDuplicateBuckets.values())
    .reduce((count, bucket) => count + Math.max(0, bucket.size - 1), 0);
  stats.snappedSegmentRatio =
    stats.rawSegmentCount > 0
      ? stats.snappedSegmentCount / stats.rawSegmentCount
      : 0;
  stats.dedupeRatio =
    stats.rawSegmentCount > 0
      ? stats.duplicateSegmentCount / stats.rawSegmentCount
      : 0;

  const result = {
    segments: dedupedSegments,
    stats,
  };
  rememberAdminBoundaryTopologyCache(options.cacheKey, result);

  return result;
}

export function createDedupedAdminBoundaryLineSegments(
  regions: LoadedAdministrativeBoundaryRegion[],
  options: {
    precision?: number;
    tolerance?: number;
    mode?: "all" | "shared";
    targetLevel?: AmapAdministrativeLevel;
    cacheKey?: string | null;
  } = {},
): AdminBoundaryLineSegment[] {
  return buildAdminBoundaryLineSegments(regions, options).segments;
}

export function resolveAdminGeometryDisplayMode(
  mode?: AmapCoordinateDisplayMode,
): AmapCoordinateDisplayMode {
  const configured =
    mode ??
    (process.env.NEXT_PUBLIC_MAP_STUDIO_ADMIN_GEOMETRY_DISPLAY_MODE as
      | AmapCoordinateDisplayMode
      | undefined);

  if (configured === "raw") return "raw";
  if (configured === "debug_both" && process.env.NODE_ENV !== "production") {
    return "debug_both";
  }

  // Supabase admin geometry is stored as EPSG:4326. AMap renders against GCJ-02,
  // so the display path defaults to a render-only GCJ-02 transform.
  return "gcj02";
}

function transformAdminPointForAmapDisplay(
  point: MapCenter,
  input: {
    displayMode: AmapCoordinateDisplayMode;
    adcode?: string;
    parentAdcode?: string;
    metrics?: AdminCoordinateTransformMetrics;
  },
): MapCenter {
  if (input.displayMode === "raw") {
    return point;
  }

  const cacheKey = [
    input.displayMode,
    input.adcode ?? "",
    input.parentAdcode ?? "",
    point.lng.toFixed(6),
    point.lat.toFixed(6),
  ].join(":");
  const cached = adminBoundaryDisplayTransformCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const [lng, lat] = transformLngLatForAmap(point.lng, point.lat, {
    displayMode: input.displayMode,
    adcode: input.adcode,
    parentAdcode: input.parentAdcode,
  });
  const transformed = { lng, lat };
  const deltaMeters = estimateCoordinateDeltaMeters(
    [point.lng, point.lat],
    [transformed.lng, transformed.lat],
  );

  if (input.metrics) {
    input.metrics.pointCount += 1;
    if (deltaMeters < 0.01) {
      input.metrics.skippedOutOfChinaCount += 1;
    } else {
      input.metrics.transformedPointCount += 1;
      input.metrics.totalDeltaMeters += deltaMeters;
      input.metrics.maxDeltaMeters = Math.max(input.metrics.maxDeltaMeters, deltaMeters);
      input.metrics.sampleBeforeAfter ??= {
        before: point,
        after: transformed,
      };
    }
  }

  adminBoundaryDisplayTransformCache.set(cacheKey, transformed);
  return transformed;
}

interface AdminCoordinateTransformMetrics {
  pointCount: number;
  transformedPointCount: number;
  transformedFeatureCount: number;
  skippedOutOfChinaCount: number;
  totalDeltaMeters: number;
  maxDeltaMeters: number;
  sampleBeforeAfter?: {
    before: MapCenter;
    after: MapCenter;
  };
}

function transformAdminRegionForAmapDisplay(
  region: LoadedAdministrativeBoundaryRegion,
  displayMode: AmapCoordinateDisplayMode,
  metrics: AdminCoordinateTransformMetrics,
): LoadedAdministrativeBoundaryRegion {
  if (displayMode === "raw") {
    return region;
  }

  const beforePointCount = metrics.pointCount;
  const boundaries = region.boundaries.map((path) =>
    path.map((point) =>
      transformAdminPointForAmapDisplay(point, {
        displayMode,
        adcode: region.adcode,
        parentAdcode: region.parentAdcode,
        metrics,
      }),
    ),
  );
  const center = region.center
    ? transformAdminPointForAmapDisplay(region.center, {
        displayMode,
        adcode: region.adcode,
        parentAdcode: region.parentAdcode,
        metrics,
      })
    : region.center;
  const labelPosition = region.labelPosition
    ? transformAdminPointForAmapDisplay(region.labelPosition, {
        displayMode,
        adcode: region.adcode,
        parentAdcode: region.parentAdcode,
        metrics,
      })
    : region.labelPosition;

  if (metrics.pointCount > beforePointCount) {
    metrics.transformedFeatureCount += 1;
  }

  return {
    ...region,
    boundaries,
    center,
    labelPosition,
    labelPlacement: region.labelPlacement
      ? {
          ...region.labelPlacement,
          transformedLabelPoint: labelPosition,
        }
      : region.labelPlacement,
    bbox: getFeatureBbox(boundaries) ?? region.bbox,
  };
}

function transformAdminRegionsForAmapDisplay(
  regions: LoadedAdministrativeBoundaryRegion[],
  displayMode: AmapCoordinateDisplayMode,
): {
  regions: LoadedAdministrativeBoundaryRegion[];
  metrics: AdminCoordinateTransformMetrics;
} {
  const metrics: AdminCoordinateTransformMetrics = {
    pointCount: 0,
    transformedPointCount: 0,
    transformedFeatureCount: 0,
    skippedOutOfChinaCount: 0,
    totalDeltaMeters: 0,
    maxDeltaMeters: 0,
  };

  return {
    regions: regions.map((region) =>
      transformAdminRegionForAmapDisplay(region, displayMode, metrics),
    ),
    metrics,
  };
}

function logAdminCoordinateTransform(input: {
  displayMode: AmapCoordinateDisplayMode;
  featureCount: number;
  metrics: AdminCoordinateTransformMetrics;
}) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.info("[AdminCoordTransform]", {
    displayMode: input.displayMode,
    featureCount: input.featureCount,
    transformedFeatureCount: input.metrics.transformedFeatureCount,
    skippedOutOfChinaCount: input.metrics.skippedOutOfChinaCount,
    sampleBeforeAfter: input.metrics.sampleBeforeAfter ?? null,
    averageDeltaMetersEstimate: input.metrics.transformedPointCount > 0
      ? Math.round(input.metrics.totalDeltaMeters / input.metrics.transformedPointCount)
      : 0,
    maxDeltaMetersEstimate: Math.round(input.metrics.maxDeltaMeters),
  });
}

function logAdminPerf(input: {
  targetLevel: AmapAdministrativeLevel;
  viewportTileKey?: string | null;
  loadedBounds?: MapBounds | null;
  shouldFetch?: boolean;
  cacheHitMemory?: boolean;
  cacheHitIndexedDb?: boolean;
  requestedFeatureCount?: number;
  renderedFeatureCount?: number;
  keptOverlayCount?: number;
  addedOverlayCount?: number;
  removedOverlayCount?: number;
  transformCacheHitCount?: number;
  labelCacheHitCount?: number;
  requestDurationMs?: number;
  renderDurationMs?: number;
  staleRequestIgnored?: boolean;
}) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.info("[AdminPerf]", input);
}

function logAdminDebug(channel: string, snapshot: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.info(`[AdminDebug:${channel}]`, snapshot);
}

const ADMIN_LABEL_DEBUG_ADCODES = new Set([
  "810000",
  "820000",
  "440300",
  "440400",
  "350200",
  "330900",
  "310000",
  "440100",
]);

function logAdminLabelPlacement(
  regions: LoadedAdministrativeBoundaryRegion[],
  displayMode: AmapCoordinateDisplayMode,
) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  let logged = 0;
  for (const region of regions) {
    const placement = region.labelPlacement;
    if (!placement) continue;

    const shouldLog =
      ADMIN_LABEL_DEBUG_ADCODES.has(region.adcode ?? "") ||
      placement.strategy !== "existing_label_point";

    if (!shouldLog || logged >= 16) {
      continue;
    }

    logged += 1;
    console.info("[AdminLabelPlacement]", {
      adcode: region.adcode ?? null,
      name: region.name,
      level: region.level ?? null,
      strategy: placement.strategy,
      originalLabelPoint: placement.originalLabelPoint,
      finalLabelPoint: placement.finalLabelPoint,
      transformedLabelPoint: placement.transformedLabelPoint ?? region.labelPosition ?? null,
      inViewport: placement.inViewport,
      inPolygon: placement.inPolygon,
      isMultiPolygon: placement.isMultiPolygon,
      displayMode,
    });
  }
}

function createAdminBoundaryFillPolygons(
  amap: AMapGlobal,
  map: AMapMapInstance,
  region: LoadedAdministrativeBoundaryRegion,
  index: number,
  options: AmapAdministrativeBoundaryLayerOptions,
  level: AmapAdministrativeLevel,
) {
  if (typeof amap.Polygon !== "function") {
    return [];
  }

  const polygons = [];
  const style = resolveAdminBoundaryPolygonStyle({
    level,
    index,
    parentAdcode: region.parentAdcode,
    fillOpacity: options.fillOpacity,
    strokeOpacity: options.strokeOpacity,
    strokeWeight: options.strokeWeight,
  });

  for (const path of region.boundaries) {
    try {
      const polygon = new amap.Polygon({
        path: path.map((point) => toAmapLngLatTuple(point)),
        fillColor: style.fillColor,
        fillOpacity: style.fillOpacity,
        strokeColor: "rgba(0,0,0,0)",
        strokeOpacity: 0,
        strokeWeight: 0,
        zIndex: 28 + index,
        extData: {
          id: region.id,
          name: region.name,
          adcode: region.adcode,
          level,
          overlayType: "administrative-boundary",
        },
      });
      if (process.env.NODE_ENV !== "production" && index === 0) {
        console.info(
          "[AdminRuntime] first boundary sample:",
          path.slice(0, 3).map((point) => toAmapLngLatTuple(point)),
        );
      }
      polygon.setMap(map);
      polygon.on?.("mouseover", () => {
        polygon.setOptions?.({
          fillOpacity: Math.min(style.fillOpacity + 0.025, 0.11),
        });
      });
      polygon.on?.("mouseout", () => {
        polygon.setOptions?.({
          fillOpacity: style.fillOpacity,
        });
      });
      polygon.on?.("click", () => {
        if (!region.center) {
          return;
        }

        if (level === "province") {
          syncAmapViewport(map, { center: region.center, zoom: 7 });
          return;
        }

        if (level === "city") {
          syncAmapViewport(map, { center: region.center, zoom: 10 });
        }
      });
      polygons.push(polygon);
    } catch {
      continue;
    }
  }

  return polygons;
}

const ADMIN_BOUNDARY_LINE_STYLE_ROUNDING = {
  lineJoin: "round",
  lineCap: "round",
} satisfies Pick<AMapPolylineOptions, "lineJoin" | "lineCap">;

const ADMIN_BOUNDARY_LINE_STYLE_RULES: Record<
  AmapAdministrativeLevel,
  Record<AmapAdministrativeLevel, AdminBoundaryLineStyle>
> = {
  province: {
    province: {
      strokeColor: "rgba(76,64,46,0.6)",
      strokeOpacity: 0.62,
      strokeWeight: 1.68,
      zIndex: 560,
      ...ADMIN_BOUNDARY_LINE_STYLE_ROUNDING,
    },
    city: {
      strokeColor: "rgba(91,78,58,0.42)",
      strokeOpacity: 0.38,
      strokeWeight: 0.95,
      zIndex: 510,
      ...ADMIN_BOUNDARY_LINE_STYLE_ROUNDING,
    },
    district: {
      strokeColor: "rgba(104,92,72,0.34)",
      strokeOpacity: 0.28,
      strokeWeight: 0.52,
      zIndex: 470,
      ...ADMIN_BOUNDARY_LINE_STYLE_ROUNDING,
    },
  },
  city: {
    province: {
      strokeColor: "rgba(86,72,52,0.48)",
      strokeOpacity: 0.44,
      strokeWeight: 1.22,
      zIndex: 550,
      ...ADMIN_BOUNDARY_LINE_STYLE_ROUNDING,
    },
    city: {
      strokeColor: "rgba(79,68,50,0.56)",
      strokeOpacity: 0.56,
      strokeWeight: 1.18,
      zIndex: 520,
      ...ADMIN_BOUNDARY_LINE_STYLE_ROUNDING,
    },
    district: {
      strokeColor: "rgba(105,92,70,0.36)",
      strokeOpacity: 0.3,
      strokeWeight: 0.54,
      zIndex: 475,
      ...ADMIN_BOUNDARY_LINE_STYLE_ROUNDING,
    },
  },
  district: {
    province: {
      strokeColor: "rgba(82,68,48,0.46)",
      strokeOpacity: 0.46,
      strokeWeight: 1.22,
      zIndex: 550,
      ...ADMIN_BOUNDARY_LINE_STYLE_ROUNDING,
    },
    city: {
      strokeColor: "rgba(84,72,54,0.5)",
      strokeOpacity: 0.48,
      strokeWeight: 0.98,
      zIndex: 520,
      ...ADMIN_BOUNDARY_LINE_STYLE_ROUNDING,
    },
    district: {
      strokeColor: "rgba(104,91,70,0.46)",
      strokeOpacity: 0.34,
      strokeWeight: 0.58,
      zIndex: 480,
      ...ADMIN_BOUNDARY_LINE_STYLE_ROUNDING,
    },
  },
};

const ADMIN_BOUNDARY_DEBUG_LINE_STYLE: AdminBoundaryLineStyle = {
  strokeColor: "rgba(170,72,62,0.3)",
  strokeOpacity: 0.3,
  strokeWeight: 0.66,
  zIndex: 430,
  ...ADMIN_BOUNDARY_LINE_STYLE_ROUNDING,
};

export function resolveAdminBoundaryLineStyle(
  level: AmapAdministrativeLevel,
  role: AdminBoundaryLineRole,
  targetLevel: AmapAdministrativeLevel = level,
): AdminBoundaryLineStyle {
  if (role === "debug") {
    return ADMIN_BOUNDARY_DEBUG_LINE_STYLE;
  }

  const baseStyle =
    ADMIN_BOUNDARY_LINE_STYLE_RULES[targetLevel]?.[level] ??
    ADMIN_BOUNDARY_LINE_STYLE_RULES[level][level];

  if (role !== "parent") {
    return baseStyle;
  }

  return {
    ...baseStyle,
    strokeOpacity: Math.min((baseStyle.strokeOpacity ?? 0) + 0.03, 0.54),
    strokeWeight: Math.min((baseStyle.strokeWeight ?? 0) + 0.08, 1.28),
  };
}

function createAdminBoundaryLinePolylines(
  amap: AMapGlobal,
  map: AMapMapInstance,
  segments: AdminBoundaryLineSegment[],
  level: AmapAdministrativeLevel,
  role: AdminBoundaryLineRole,
  idPrefix: string,
  audit?: {
    targetLevel?: AmapAdministrativeLevel | null;
    source?: AdminBoundaryOverlayAuditSource;
    parentAdcode?: string | null;
    tileKey?: string | null;
    viewportTileKey?: string | null;
    requestId?: number | null;
    regionAdcodes?: Iterable<string | null | undefined>;
    regionNames?: Iterable<string | null | undefined>;
    records?: AdminBoundaryOverlayAuditRecord[];
  },
) {
  if (typeof amap.Polyline !== "function") {
    return [];
  }

  const style = resolveAdminBoundaryLineStyle(
    level,
    role,
    audit?.targetLevel ?? level,
  );
  const polylines: AMapPolylineInstance[] = [];
  const auditSource =
    audit?.source ??
    (role === "parent"
      ? "parentBoundary"
      : role === "debug"
        ? "debugBoundary"
        : "childBoundary");

  for (const [index, segment] of segments.entries()) {
    try {
      const overlayId = `${idPrefix}-${index}`;
      const zIndex = Number(style.zIndex ?? 0) + index / 10000;
      const auditRecord = createAdminBoundaryOverlayAuditRecord({
        overlayId,
        level,
        source: auditSource,
        segmentKey: segment.key,
        parentAdcode: audit?.parentAdcode,
        tileKey: audit?.tileKey,
        viewportTileKey: audit?.viewportTileKey,
        requestId: audit?.requestId,
        regionAdcodes: audit?.regionAdcodes,
        regionNames: audit?.regionNames,
        zIndex,
        strokeWeight: Number(style.strokeWeight ?? 0),
        strokeOpacity: Number(style.strokeOpacity ?? 0),
      });
      audit?.records?.push(auditRecord);
      const polyline = new amap.Polyline({
        path: segment.path.map((point) => toAmapLngLatTuple(point)),
        strokeColor: style.strokeColor,
        strokeOpacity: style.strokeOpacity,
        strokeWeight: style.strokeWeight,
        strokeStyle: "solid",
        lineJoin: style.lineJoin,
        lineCap: style.lineCap,
        zIndex,
        extData: {
          id: overlayId,
          level,
          overlayType:
            role === "parent"
              ? "administrative-parent-boundary"
              : "administrative-boundary-line",
          segmentKey: segment.key,
          ...(process.env.NODE_ENV !== "production"
            ? { adminBoundaryAudit: auditRecord }
            : {}),
        },
      });
      polyline.setMap(map);
      polylines.push(polyline);
    } catch {
      continue;
    }
  }

  return polylines;
}

export function createAmapAdministrativeBoundaryLayer(
  amap: AMapGlobal,
  map: AMapMapInstance,
  options: AmapAdministrativeBoundaryLayerOptions,
): AmapAdministrativeBoundaryLayerHandle {
  let cancelled = false;
  const polygons: AMapPolygonInstance[] = [];
  const boundaryLines: AMapPolylineInstance[] = [];
  const parentBoundaryLines: AMapPolylineInstance[] = [];
  const debugBoundaryLines: AMapPolylineInstance[] = [];
  const labels: AMapMarkerInstance[] = [];

  const getOverlayCounts = () => ({
    polygons: polygons.length,
    boundaryLines:
      boundaryLines.length +
      parentBoundaryLines.length +
      debugBoundaryLines.length,
    labels: labels.length,
  });

  const clearLabels = () => {
    const removedLabels = labels.length;
    clearAmapMarkerInstances(labels);
    labels.length = 0;
    return removedLabels;
  };

  const clear = (staleRequestIgnored = false) => {
    const removedAdminPolygonCount = polygons.length;
    const removedAdminBoundaryLineCount =
      boundaryLines.length +
      parentBoundaryLines.length +
      debugBoundaryLines.length;
    const removedAdminLabelCount = labels.length;

    clearAmapPolygonInstances(polygons);
    clearAmapPolylineInstances(boundaryLines);
    clearAmapPolylineInstances(parentBoundaryLines);
    clearAmapPolylineInstances(debugBoundaryLines);
    clearLabels();
    polygons.length = 0;
    boundaryLines.length = 0;
    parentBoundaryLines.length = 0;
    debugBoundaryLines.length = 0;
    logAdminOverlayCleanup({
      removedChildPolygons: removedAdminPolygonCount,
      removedParentBoundaries: removedAdminBoundaryLineCount,
      removedGrandparentBoundaries: 0,
      removedLabels: removedAdminLabelCount,
      removedAdminPolygonCount,
      removedAdminBoundaryLineCount,
      removedAdminLabelCount,
      staleRequestIgnored,
    });
  };
  void loadAdministrativeBoundaries(amap, {
    query: options.query,
    center: options.center,
    zoom: options.zoom,
    bounds: options.bounds,
    requestId: options.requestId,
  })
    .then((result) => {
      if (cancelled) {
        return;
      }

      logAdminDebug("Fetch", {
        shouldFetch: true,
        fetchReason: "load_administrative_boundaries",
        skippedReason: null,
        requestId: options.requestId,
        requestLevel: result.query.targetLevel,
        requestBbox: result.query.viewportBounds ?? null,
        responseCount: result.regions.length,
      });

      if (options.isStale?.()) {
        logAdminCache({
          cacheKey: getAdministrativeBoundaryCacheKey(result.query),
          source: result.cacheSource ?? "amap",
          hit: Boolean(result.cacheHit),
          requestId: options.requestId,
          targetLevel: result.query.targetLevel,
          apiLevel: getAdminBoundaryApiLevel(result.query.targetLevel),
          parentAdcode: result.query.adcode,
          featureCount: result.regions.length,
          hasGeometryCount: result.regions.filter((region) => region.boundaries.length > 0).length,
          ignoredStaleRequest: true,
        });
        logAdminDebug("Render", createAdminRenderDebugSnapshot({
          requestId: options.requestId,
          stale: true,
          rawFeatureCount: result.regions.length,
          visibleFeatureCount: 0,
          polygonOverlayCount: 0,
          labelCount: 0,
        }));
        clear(true);
        options.onStale?.(options.requestId);
        return;
      }

      const renderStartMs = Date.now();
      const displayMode = resolveAdminGeometryDisplayMode(options.adminGeometryDisplayMode);
      const renderRegions = mergeAdministrativeBoundaryRegions(
        options.mergeRegions ?? [],
        result.regions,
      );
      const renderLevelDebug = createAdminRenderLevelDebug({
        targetLevel: result.query.targetLevel,
        regions: renderRegions,
      });
      if (
        process.env.NODE_ENV !== "production" &&
        renderLevelDebug.mismatched
      ) {
        console.warn("[AdminDebug:RenderLevelMismatch]", renderLevelDebug);
      }
      let childRender = prepareAdminBoundaryRegionsForRender(
        renderRegions,
        {
          targetLevel: result.query.targetLevel,
          parentAdcode: result.query.adcode,
          zoom: options.zoom ?? result.query.zoom,
          bounds: options.bounds ?? null,
          viewportTileKey: result.query.viewportTileKey,
          displayMode,
        },
      );
      let denseProtectionDebug = createAdminDenseProtectionDebug({
        targetLevel: result.query.targetLevel,
        rawFeatureCount: renderRegions.length,
        visibleFeatureCount: childRender.regions.length,
      });
      if (
        isAdminCountyRenderTooDense(
          result.query.targetLevel,
          childRender.regions.length,
        )
      ) {
        const visibleOnlyRender = prepareAdminBoundaryRegionsForRender(
          renderRegions,
          {
            targetLevel: result.query.targetLevel,
            parentAdcode: result.query.adcode,
            zoom: options.zoom ?? result.query.zoom,
            bounds: options.bounds ?? null,
            viewportPaddingRatio: 0,
            viewportTileKey: result.query.viewportTileKey,
            displayMode,
          },
        );
        denseProtectionDebug = createAdminDenseProtectionDebug({
          targetLevel: result.query.targetLevel,
          rawFeatureCount: renderRegions.length,
          visibleFeatureCount: visibleOnlyRender.regions.length,
        });
        const denseProtectionReason =
          denseProtectionDebug.denseProtectionReason ??
          "visible_viewport_too_dense_cap_count";
        childRender = {
          ...visibleOnlyRender,
          regions: visibleOnlyRender.regions.slice(
            0,
            ADMIN_BOUNDARY_MAX_COUNTY_RENDER_FEATURES,
          ),
          stats: {
            ...visibleOnlyRender.stats,
            viewportFilteredFeatureCount: Math.min(
              visibleOnlyRender.stats.viewportFilteredFeatureCount,
              ADMIN_BOUNDARY_MAX_COUNTY_RENDER_FEATURES,
            ),
          },
        };
        logAdminPerf({
          targetLevel: result.query.targetLevel,
          viewportTileKey: result.query.viewportTileKey,
          requestedFeatureCount: renderRegions.length,
          renderedFeatureCount: childRender.regions.length,
          renderDurationMs: Date.now() - renderStartMs,
          staleRequestIgnored: false,
        });
        if (process.env.NODE_ENV !== "production") {
          console.info("[AdminCoverage]", {
            targetLevel: result.query.targetLevel,
            viewport: options.bounds ?? null,
            expandedViewport: result.query.viewportBounds ?? null,
            loadedBoundsUnion: null,
            missingCoverage: false,
            shouldFetch: false,
            fetchReason: "dense_protection",
            denseProtectionReason,
          });
          console.info("[AdminDebug:Render]", createAdminRenderDebugSnapshot({
            requestId: options.requestId,
            targetLevel: result.query.targetLevel,
            renderLevel: renderLevelDebug.renderLevel,
            featureLevels: renderLevelDebug.featureLevels,
            rawFeatureCount: renderRegions.length,
            visibleFeatureCount: childRender.regions.length,
            polygonOverlayCount: 0,
            labelCount: 0,
            denseProtectionTriggered: denseProtectionDebug.denseProtectionTriggered,
            denseProtectionReason: denseProtectionDebug.denseProtectionReason,
          }));
        }
      }
      const parentBoundaryTargetLevel =
        result.query.targetLevel === "district"
          ? "city"
          : result.query.targetLevel === "city"
            ? "province"
            : "province";
      const parentBoundaryRender = prepareAdminBoundaryRegionsForRender(
        result.parentBoundaryRegions ?? [],
        {
          targetLevel: parentBoundaryTargetLevel,
          parentAdcode: result.query.targetLevel === "district" ? result.query.adcode : "100000",
          zoom: options.zoom ?? result.query.zoom,
          bounds: options.bounds ?? null,
          viewportPaddingRatio: 0.25,
          viewportTileKey: result.query.viewportTileKey,
          displayMode,
        },
      );
      const childDisplay = transformAdminRegionsForAmapDisplay(
        childRender.regions,
        displayMode,
      );
      const parentBoundaryDisplay = transformAdminRegionsForAmapDisplay(
        parentBoundaryRender.regions,
        displayMode,
      );
      logAdminCoordinateTransform({
        displayMode,
        featureCount: childRender.regions.length + parentBoundaryRender.regions.length,
        metrics: {
          pointCount:
            childDisplay.metrics.pointCount +
            parentBoundaryDisplay.metrics.pointCount,
          transformedPointCount:
            childDisplay.metrics.transformedPointCount +
            parentBoundaryDisplay.metrics.transformedPointCount,
          transformedFeatureCount:
            childDisplay.metrics.transformedFeatureCount +
            parentBoundaryDisplay.metrics.transformedFeatureCount,
          skippedOutOfChinaCount:
            childDisplay.metrics.skippedOutOfChinaCount +
            parentBoundaryDisplay.metrics.skippedOutOfChinaCount,
          totalDeltaMeters:
            childDisplay.metrics.totalDeltaMeters +
            parentBoundaryDisplay.metrics.totalDeltaMeters,
          maxDeltaMeters: Math.max(
            childDisplay.metrics.maxDeltaMeters,
            parentBoundaryDisplay.metrics.maxDeltaMeters,
          ),
          sampleBeforeAfter:
            childDisplay.metrics.sampleBeforeAfter ??
            parentBoundaryDisplay.metrics.sampleBeforeAfter,
        },
      });
      logAdminLabelPlacement(childDisplay.regions, displayMode);
      const labelRegions = options.labelVisible === false
        ? []
        : selectAdminBoundaryLabelRegionsForRender(childDisplay.regions, {
            targetLevel: result.query.targetLevel,
            center: options.center ?? result.query.center,
            zoom: options.zoom ?? result.query.zoom,
          });
      const overlayAuditRecords: AdminBoundaryOverlayAuditRecord[] = [];

      clear();
      for (const [index, region] of childDisplay.regions.entries()) {
        polygons.push(
          ...createAdminBoundaryFillPolygons(
            amap,
            map,
            region,
            index,
            options,
            result.query.targetLevel,
          ),
        );
      }
      const childBoundaryTolerance = getAdminBoundarySnapTolerance(result.query.targetLevel);
      const childBoundaryBuild = buildAdminBoundaryLineSegments(
        childDisplay.regions,
        {
          mode: "all",
          targetLevel: result.query.targetLevel,
          tolerance: childBoundaryTolerance,
          cacheKey: getAdminBoundaryTopologyCacheKey({
            targetLevel: result.query.targetLevel,
            displayMode,
            adminPrecision: options.adminPrecision,
            viewportTileKey: result.query.viewportTileKey,
            tolerance: childBoundaryTolerance,
            regionIds: childDisplay.regions.map((region) => region.adcode ?? region.id),
          }),
        },
      );
      if (process.env.NODE_ENV !== "production") {
        console.info("[AdminBoundaryDebug:Build]", childBoundaryBuild.stats);
      }
      const nextChildBoundaryLines = createAdminBoundaryLinePolylines(
        amap,
        map,
        childBoundaryBuild.segments,
        result.query.targetLevel,
        "child",
        `${result.query.targetLevel}-boundary`,
        {
          targetLevel: result.query.targetLevel,
          source: "childBoundary",
          parentAdcode: result.query.adcode,
          tileKey: result.query.viewportTileKey,
          viewportTileKey: result.query.viewportTileKey,
          requestId: options.requestId,
          regionAdcodes: childDisplay.regions.map((region) => region.adcode ?? region.id),
          regionNames: childDisplay.regions.map((region) => region.name),
          records: overlayAuditRecords,
        },
      );
      boundaryLines.push(...nextChildBoundaryLines);
      if (process.env.NODE_ENV !== "production") {
        console.info("[AdminBoundaryTopology]", {
          level: result.query.targetLevel,
          tolerance: childBoundaryBuild.stats.tolerance,
          inputPolygonCount: childBoundaryBuild.stats.polygonCount,
          rawSegmentCount: childBoundaryBuild.stats.rawSegmentCount,
          dedupedSegmentCount: childBoundaryBuild.stats.dedupedSegmentCount,
          snappedSegmentCount: childBoundaryBuild.stats.snappedSegmentCount,
          unmatchedNearDuplicateSegmentCount:
            childBoundaryBuild.stats.unmatchedNearDuplicateSegmentCount,
          snappedSegmentRatio: childBoundaryBuild.stats.snappedSegmentRatio,
          dedupeRatio: childBoundaryBuild.stats.dedupeRatio,
          renderedBoundaryOverlayCount: nextChildBoundaryLines.length,
        });
      }
      if (displayMode === "debug_both" && process.env.NODE_ENV !== "production") {
        debugBoundaryLines.push(
          ...createAdminBoundaryLinePolylines(
            amap,
            map,
            buildAdminBoundaryLineSegments(childRender.regions, {
              mode: "all",
              targetLevel: result.query.targetLevel,
            }).segments,
            result.query.targetLevel,
            "debug",
            `${result.query.targetLevel}-raw-debug-boundary`,
            {
              targetLevel: result.query.targetLevel,
              source: "boundaryLine",
              parentAdcode: result.query.adcode,
              tileKey: result.query.viewportTileKey,
              viewportTileKey: result.query.viewportTileKey,
              requestId: options.requestId,
              regionAdcodes: childRender.regions.map((region) => region.adcode ?? region.id),
              regionNames: childRender.regions.map((region) => region.name),
              records: overlayAuditRecords,
            },
          ),
        );
      }

      for (const [index, region] of labelRegions.entries()) {
        const label = createAdminBoundaryLabel(
          amap,
          map,
          region,
          index,
          result.query.targetLevel,
        );
        if (label) {
          labels.push(label);
        }
      }
      logAdminLabelLifecycle(createAdminLabelLifecycleDebug({
        renderPassId: options.requestId,
        targetLevel: result.query.targetLevel,
        labelKeys: labelRegions.map((region) => [
          result.query.targetLevel,
          result.query.viewportTileKey ?? "viewport",
          region.adcode ?? region.id,
        ].join(":")),
        labelCreatedCount: labels.length,
      }));

      const parentBoundaryTolerance = getAdminBoundarySnapTolerance(parentBoundaryTargetLevel);
      const parentBoundaryBuild = buildAdminBoundaryLineSegments(
        parentBoundaryDisplay.regions,
        {
          mode: "all",
          targetLevel: parentBoundaryTargetLevel,
          tolerance: parentBoundaryTolerance,
          cacheKey: getAdminBoundaryTopologyCacheKey({
            targetLevel: parentBoundaryTargetLevel,
            displayMode,
            adminPrecision: options.adminPrecision,
            viewportTileKey: result.query.viewportTileKey,
            tolerance: parentBoundaryTolerance,
            regionIds: parentBoundaryDisplay.regions.map((region) => region.adcode ?? region.id),
          }),
        },
      );
      if (process.env.NODE_ENV !== "production") {
        console.info("[AdminBoundaryDebug:Build]", parentBoundaryBuild.stats);
      }
      const nextParentBoundaryLines = createAdminBoundaryLinePolylines(
        amap,
        map,
        parentBoundaryBuild.segments,
        parentBoundaryTargetLevel,
        "parent",
        `${parentBoundaryTargetLevel}-parent-boundary`,
        {
          targetLevel: result.query.targetLevel,
          source: "parentBoundary",
          parentAdcode: result.query.targetLevel === "district" ? result.query.adcode : "100000",
          tileKey: result.query.viewportTileKey,
          viewportTileKey: result.query.viewportTileKey,
          requestId: options.requestId,
          regionAdcodes: parentBoundaryDisplay.regions.map((region) => region.adcode ?? region.id),
          regionNames: parentBoundaryDisplay.regions.map((region) => region.name),
          records: overlayAuditRecords,
        },
      );
      parentBoundaryLines.push(...nextParentBoundaryLines);
      if (process.env.NODE_ENV !== "production") {
        console.info("[AdminBoundaryTopology]", {
          level: parentBoundaryTargetLevel,
          tolerance: parentBoundaryBuild.stats.tolerance,
          inputPolygonCount: parentBoundaryBuild.stats.polygonCount,
          rawSegmentCount: parentBoundaryBuild.stats.rawSegmentCount,
          dedupedSegmentCount: parentBoundaryBuild.stats.dedupedSegmentCount,
          snappedSegmentCount: parentBoundaryBuild.stats.snappedSegmentCount,
          unmatchedNearDuplicateSegmentCount:
            parentBoundaryBuild.stats.unmatchedNearDuplicateSegmentCount,
          snappedSegmentRatio: parentBoundaryBuild.stats.snappedSegmentRatio,
          dedupeRatio: parentBoundaryBuild.stats.dedupeRatio,
          renderedBoundaryOverlayCount: nextParentBoundaryLines.length,
        });
      }
      const boundaryCounts = {
        province:
          (result.query.targetLevel === "province" ? childBoundaryBuild.segments.length : 0) +
          (parentBoundaryTargetLevel === "province" ? parentBoundaryBuild.segments.length : 0),
        city:
          (result.query.targetLevel === "city" ? childBoundaryBuild.segments.length : 0) +
          (parentBoundaryTargetLevel === "city" ? parentBoundaryBuild.segments.length : 0),
        district:
          result.query.targetLevel === "district" ? childBoundaryBuild.segments.length : 0,
      };
      if (process.env.NODE_ENV !== "production") {
        console.info("[AdminBoundaryDebug:Render]", {
          targetLevel: result.query.targetLevel,
          provinceBoundaryCount: boundaryCounts.province,
          prefectureBoundaryCount: boundaryCounts.city,
          countyBoundaryCount: boundaryCounts.district,
          polygonOverlayCount: polygons.length + boundaryLines.length + parentBoundaryLines.length,
          labelCount: labels.length,
        });
        console.info("[AdminRenderOverlayAudit]", createAdminRenderOverlayAuditSnapshot(
          overlayAuditRecords,
          {
            requestId: options.requestId,
            targetLevel: result.query.targetLevel,
            viewportTileKey: result.query.viewportTileKey,
            cleanupScheduled: false,
            cleanupExecuted: false,
            cleanupDelayMs: 0,
            levelSwitch: false,
          },
        ));
      }

      if (process.env.NODE_ENV !== "production") {
        const childBoundarySuccessCount = childRender.regions.filter(
          (region) => region.boundaries.length > 0,
        ).length;
        console.info("[AdminRuntime] child count:", childRender.regions.length);
        console.info(
          "[AdminRuntime] child boundary success count:",
          childBoundarySuccessCount,
        );
        console.info("[AdminRuntime] polygon objects created:", polygons.length);
        console.info(
          "[AdminRuntime] parent boundary objects created:",
          parentBoundaryLines.length,
        );
        console.info(
          "[AdminRuntime] polygon objects attached to map:",
          polygons.length,
        );
        if (polygons.length === 0) {
          console.info(
            "[AdminRuntime] rendered count is 0: no child boundary polygon was created or attached",
          );
        }
      }
      const previousAdcodes = new Set<string>();
      const nextAdcodes = childDisplay.regions
        .map((region) => region.adcode ?? region.id)
        .filter(Boolean);
      const overlayDiff = diffAdminOverlayAdcodes(previousAdcodes, nextAdcodes);
      options.onLoaded?.(result, {
        requestId: options.requestId,
        polygonCount: polygons.length,
        labelCount: labels.length,
        visibleFeatureCount: childDisplay.regions.length,
        polygonOverlayCount: polygons.length + boundaryLines.length + parentBoundaryLines.length,
        denseProtectionTriggered: denseProtectionDebug.denseProtectionTriggered,
        denseProtectionReason: denseProtectionDebug.denseProtectionReason,
        renderedAdcodes: nextAdcodes,
      });
      logAdminDebug("Render", createAdminRenderDebugSnapshot({
        requestId: options.requestId,
        targetLevel: result.query.targetLevel,
        renderLevel: renderLevelDebug.renderLevel,
        featureLevels: renderLevelDebug.featureLevels,
        rawFeatureCount: renderRegions.length,
        visibleFeatureCount: childDisplay.regions.length,
        polygonOverlayCount: polygons.length + boundaryLines.length + parentBoundaryLines.length,
        labelCount: labels.length,
        denseProtectionTriggered: denseProtectionDebug.denseProtectionTriggered,
        denseProtectionReason: denseProtectionDebug.denseProtectionReason,
      }));
      logAdminPerf({
        targetLevel: result.query.targetLevel,
        viewportTileKey: result.query.viewportTileKey,
        loadedBounds: result.query.viewportBounds ?? null,
        shouldFetch: true,
        requestedFeatureCount: renderRegions.length,
        renderedFeatureCount: childDisplay.regions.length,
        keptOverlayCount: overlayDiff.keep.length,
        addedOverlayCount: overlayDiff.add.length,
        removedOverlayCount: overlayDiff.remove.length,
        transformCacheHitCount: 0,
        labelCacheHitCount: 0,
        renderDurationMs: Date.now() - renderStartMs,
        staleRequestIgnored: false,
      });
      logAdminRender({
        targetLevel: result.query.targetLevel,
        parentAdcodes: result.query.parentAdcodes ?? [result.query.adcode],
        totalFeatures: renderRegions.length,
        childFeatureCount: childRender.regions.length,
        parentBoundaryOverlayCount: parentBoundaryRender.regions.length,
        grandparentBoundaryOverlayCount: 0,
        renderedPolygons: polygons.length,
        renderedParentBoundaries: parentBoundaryLines.length,
        renderedLabels: labels.length,
        polygonOverlayCount: polygons.length + boundaryLines.length + parentBoundaryLines.length,
        multiPolygonSplitCount: Math.max(0, polygons.length - childRender.regions.length),
        ignoredInteriorRingCount: Math.max(
          0,
          renderRegions.reduce((count, region) => count + region.boundaries.length, 0) -
            childRender.stats.filteredRingCount,
        ),
        staleOverlayCleared: false,
        bboxQuery: result.query.viewportBounds ?? null,
      });
      logAdminRenderPerf({
        targetLevel: result.query.targetLevel,
        parentAdcodes: result.query.parentAdcodes ?? [result.query.adcode],
        rawFeatureCount:
          childRender.stats.rawFeatureCount +
          parentBoundaryRender.stats.rawFeatureCount,
        viewportFilteredFeatureCount:
          childRender.stats.viewportFilteredFeatureCount +
          parentBoundaryRender.stats.viewportFilteredFeatureCount,
        rawRingCount:
          childRender.stats.rawRingCount +
          parentBoundaryRender.stats.rawRingCount,
        filteredRingCount:
          childRender.stats.filteredRingCount +
          parentBoundaryRender.stats.filteredRingCount,
        simplifiedPointCount:
          childRender.stats.simplifiedPointCount +
          parentBoundaryRender.stats.simplifiedPointCount,
        renderedPolygonCount: polygons.length + boundaryLines.length + parentBoundaryLines.length,
        renderedLabelCount: labels.length,
        renderTimeMs: Date.now() - renderStartMs,
        sourceBreakdown: {
          [result.cacheSource ?? result.source]: renderRegions.length,
        },
      });
      if (process.env.NODE_ENV !== "production") {
        console.info(
          "[MapStudio][Admin] rendered admin polygons count:",
          polygons.length,
        );
      }
      prefetchAdjacentAdministrativeBoundaries(amap, result);
    })
    .catch((error: unknown) => {
      if (cancelled) {
        return;
      }

      if (options.isStale?.()) {
        const staleQuery = options.query;
        if (staleQuery) {
          logAdminCache({
            cacheKey: getAdministrativeBoundaryCacheKey(staleQuery),
            source: "amap",
            hit: false,
            requestId: options.requestId,
            targetLevel: staleQuery.targetLevel,
            apiLevel: getAdminBoundaryApiLevel(staleQuery.targetLevel),
            parentAdcode: staleQuery.adcode,
            ignoredStaleRequest: true,
          });
        }
        logAdminDebug("Render", createAdminRenderDebugSnapshot({
          requestId: options.requestId,
          stale: true,
          rawFeatureCount: 0,
          visibleFeatureCount: 0,
          polygonOverlayCount: 0,
          labelCount: 0,
        }));
        clear(true);
        options.onStale?.(options.requestId);
        return;
      }

      options.onError?.(
        error instanceof Error ? error.message : "行政区划加载失败",
      );
    });

  return {
    cancel: () => {
      cancelled = true;
      clear();
    },
    clear,
    clearLabels,
    getOverlayCounts,
  };
}

export function clearAmapTrafficLayer(
  trafficLayer: AMapTrafficLayerInstance | null | undefined,
) {
  try {
    trafficLayer?.setMap(null);
  } catch {
    return;
  }
}

function clearAmapOverlayInstances(overlays: AMapOverlayInstance[]) {
  for (const overlay of overlays) {
    try {
      overlay.setMap(null);
    } catch {
      continue;
    }
  }
}

export function clearAmapMarkerInstances(markers: AMapMarkerInstance[]) {
  clearAmapOverlayInstances(markers);
}

export function clearAmapPolygonInstances(polygons: AMapPolygonInstance[]) {
  clearAmapOverlayInstances(polygons);
}

export function clearAmapPolylineInstances(polylines: AMapPolylineInstance[]) {
  clearAmapOverlayInstances(polylines);
}

export function isResolvedMapPoint(point: MapPoint): boolean {
  return point.resolved && isValidMapCenter(point.coordinates);
}

export function getMarkerViewportCenter(points: AmapMarkerPoint[]): MapCenter | null {
  if (points.length === 0) {
    return null;
  }

  const totals = points.reduce(
    (accumulator, point) => {
      accumulator.lat += point.coordinates.lat;
      accumulator.lng += point.coordinates.lng;
      return accumulator;
    },
    { lat: 0, lng: 0 },
  );

  return {
    lat: totals.lat / points.length,
    lng: totals.lng / points.length,
  };
}

export function syncAmapViewport(
  map: AMapMapInstance,
  config: AmapBaseMapConfig = {},
) {
  const center = toAmapLngLatTuple(config.center ?? DEFAULT_AMAP_CENTER);
  const zoom = config.zoom ?? DEFAULT_AMAP_ZOOM;

  if (typeof map.setZoomAndCenter === "function") {
    map.setZoomAndCenter(zoom, center);
    return;
  }

  if (typeof map.setCenter === "function") {
    map.setCenter(center);
  }

  if (typeof map.setZoom === "function") {
    map.setZoom(zoom);
  }
}

export function syncAmapViewportForMarkerPoints(
  map: AMapMapInstance,
  points: AmapMarkerPoint[],
  markers: AMapMarkerInstance[],
  fallbackConfig: AmapBaseMapConfig = {},
  fitToMarkers = true,
) {
  if (!fitToMarkers) {
    return;
  }

  if (points.length === 0) {
    syncAmapViewport(map, fallbackConfig);
    return;
  }

  if (points.length === 1) {
    syncAmapViewport(map, {
      center: points[0]?.coordinates,
      zoom: fallbackConfig.zoom ?? SINGLE_POINT_ZOOM,
    });
    return;
  }

  if (fitToMarkers && typeof map.setFitView === "function" && markers.length > 1) {
    map.setFitView(markers);
    return;
  }

  const averageCenter = getMarkerViewportCenter(points);
  syncAmapViewport(map, {
    center: averageCenter ?? fallbackConfig.center,
    zoom: fallbackConfig.zoom,
  });
}

export function syncAmapViewportForActivePoint(
  map: AMapMapInstance,
  points: AmapMarkerPoint[],
  activePointId: string | null | undefined,
) {
  if (!activePointId) {
    return;
  }

  const activePoint = points.find((point) => point.id === activePointId);

  if (!activePoint) {
    return;
  }

  syncAmapViewport(map, {
    center: activePoint.coordinates,
    zoom: ACTIVE_POINT_ZOOM,
  });
}

export function destroyAmapMapInstance(map: AMapMapInstance | null | undefined) {
  map?.destroy();
}

export function getMapErrorCopy(code: AmapLoadErrorCode): MapErrorCopy {
  switch (code) {
    case "missing_js_key":
      return {
        title: "前端地图 Key 还没配好",
        description: "这台设备暂时没法把地图加载出来，但行程内容还是可以正常看。",
      };
    case "ssr_unavailable":
      return {
        title: "地图需要在浏览器里打开",
        description: "当前环境还不能直接显示地图，换到浏览器里就能继续加载。",
      };
    case "script_load_failed":
      return {
        title: "地图脚本这次没接上",
        description: "先保留这个占位，行程仍可正常查看，稍后再刷新试一次。",
      };
    case "amap_not_available":
      return {
        title: "地图没有完成初始化",
        description: "这次地图没有顺利准备好，但不会影响你继续看行程和路线信息。",
      };
    default:
      return {
        title: "地图暂时不可用",
        description: "先看文字版行程，地图恢复后再补上。",
      };
  }
}
