import { z } from "zod";

import type {
  CandidatePlace,
  MapAction,
  MapBoundary,
  MapLayer,
  MapPlace,
  MapProject,
  MapRegion,
  MapRoute,
  MapStudioState,
  MapTooltip,
  PlanMapPlaceMeta,
  UnresolvedMapPlace,
} from "./types";

export const mapDataStatusSchema = z.enum(["mock", "placeholder", "curated", "api"]);

export const mapCoordinateSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
});

export const mapBoundarySchema: z.ZodType<MapBoundary> = z.object({
  type: z.enum(["polygon", "multi_polygon"]),
  coordinates: z.array(z.array(mapCoordinateSchema).min(3)).min(1),
  source: z.enum(["mock", "placeholder", "curated", "api", "custom"]),
});

export const mapRegionStateSchema = z.object({
  isVisible: z.boolean(),
  isHovered: z.boolean(),
  isSelected: z.boolean(),
  isHighlighted: z.boolean(),
});

export const mapRegionSchema: z.ZodType<MapRegion> = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  displayName: z.string().min(1),
  city: z.string().min(1),
  parentRegionId: z.string().min(1).optional(),
  regionType: z.enum(["administrative", "travel_area", "scenic_zone", "custom"]),
  boundary: mapBoundarySchema,
  fallbackCenter: mapCoordinateSchema,
  fillColor: z.string().min(1),
  borderColor: z.string().min(1),
  hoverColor: z.string().min(1),
  selectedColor: z.string().min(1),
  labelPosition: mapCoordinateSchema,
  labelAnchor: mapCoordinateSchema.optional(),
  shortName: z.string().min(1).optional(),
  priority: z.number().int().positive().optional(),
  minZoom: z.number().finite().optional(),
  maxZoom: z.number().finite().optional(),
  suggestedDuration: z.string().min(1).optional(),
  summary: z.string(),
  tags: z.array(z.string()),
  bestFor: z.array(z.string()),
  representativePlaceIds: z.array(z.string()),
  routeIds: z.array(z.string()),
  state: mapRegionStateSchema,
  dataStatus: mapDataStatusSchema,
});

export const mapPlaceUiStateSchema = z.object({
  markerIcon: z.string().min(1),
  markerColor: z.string().min(1),
  isVisible: z.boolean(),
  isHovered: z.boolean(),
  isSelected: z.boolean(),
  isHighlighted: z.boolean(),
});

export const mapPlaceSourceTypeSchema = z.enum(["plan", "seed", "candidate", "mock"]);

export const planMapPlaceMetaSchema: z.ZodType<PlanMapPlaceMeta> = z.object({
  day: z.number().int().positive(),
  slot: z.enum(["morning", "afternoon", "evening"]),
  itemIndex: z.number().int().nonnegative(),
  placeName: z.string().min(1),
  type: z.enum([
    "attraction",
    "food",
    "transport",
    "hotel",
    "free_time",
    "shopping",
    "other",
  ]),
  reason: z.string(),
  suggestedDuration: z.string().min(1).optional(),
  timeLabel: z.string().min(1).optional(),
  editorId: z.string().min(1).optional(),
  editorSlotId: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  provider: z.string().min(1).optional(),
  resolved: z.boolean(),
  warning: z.string().min(1).optional(),
});

export const unresolvedMapPlaceSchema: z.ZodType<UnresolvedMapPlace> = z.object({
  id: z.string().min(1),
  placeName: z.string().min(1),
  day: z.number().int().positive(),
  slot: z.enum(["morning", "afternoon", "evening"]),
  itemIndex: z.number().int().nonnegative(),
  type: z.enum([
    "attraction",
    "food",
    "transport",
    "hotel",
    "free_time",
    "shopping",
    "other",
  ]),
  reason: z.string(),
  suggestedDuration: z.string().min(1).optional(),
  timeLabel: z.string().min(1).optional(),
  editorId: z.string().min(1).optional(),
  editorSlotId: z.string().min(1).optional(),
  status: z.literal("missing_coordinates"),
  warning: z.string().min(1).optional(),
});

export const mapPlaceSchema: z.ZodType<MapPlace> = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  displayName: z.string().min(1),
  city: z.string().min(1),
  regionId: z.string().min(1),
  regionIds: z.array(z.string().min(1)).optional(),
  hotspotId: z.string().min(1).optional(),
  districtId: z.string().min(1).optional(),
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
  category: z.enum([
    "attraction",
    "food",
    "museum",
    "shopping",
    "nature",
    "neighborhood",
    "transport",
    "experience",
  ]),
  priority: z.number().int().positive().optional(),
  minZoom: z.number().finite().optional(),
  tags: z.array(z.string()),
  shortDescription: z.string(),
  longDescription: z.string(),
  suggestedDuration: z.string(),
  bestFor: z.array(z.string()),
  openingHours: z.string(),
  ticketInfo: z.string(),
  crowdLevel: z.string(),
  image: z.string().optional(),
  imagePlaceholder: z.string(),
  source: z.object({
    label: z.string(),
    url: z.string().optional(),
  }),
  sourceType: mapPlaceSourceTypeSchema,
  sourceStatus: z.enum(["unknown", "mock", "placeholder", "curated", "api"]),
  dataStatus: mapDataStatusSchema,
  isCandidate: z.boolean(),
  assignedDayId: z.string().optional(),
  relationshipToPlan: z.string(),
  planMeta: planMapPlaceMetaSchema.optional(),
  ui: mapPlaceUiStateSchema,
});

export const mapRoutePathSchema = z.object({
  type: z.enum(["polyline", "none"]),
  coordinates: z.array(mapCoordinateSchema),
  source: z.enum(["mock", "placeholder", "curated", "api", "none"]),
});

export const mapRouteSchema: z.ZodType<MapRoute> = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  routeType: z.enum([
    "day_route",
    "candidate_route",
    "imported_route",
    "suggested_route",
  ]),
  dayId: z.string().optional(),
  placeIds: z.array(z.string()),
  path: mapRoutePathSchema,
  estimatedDuration: z.string(),
  estimatedDistance: z.string(),
  transportMode: z.enum(["walk", "transit", "drive", "mixed"]),
  warnings: z.array(z.string()),
  suggestions: z.array(z.string()),
  animationState: z.enum(["idle", "preview", "playing"]),
  dataStatus: mapDataStatusSchema,
});

export const mapLayerSchema: z.ZodType<MapLayer> = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum([
    "regions",
    "hotspots",
    "districts",
    "labels",
    "plan_places",
    "places",
    "routes",
    "candidates",
    "transport",
    "traffic",
    "terrain",
    "custom",
  ]),
  isVisible: z.boolean(),
  opacity: z.number().finite().min(0).max(1),
  zIndex: z.number().int(),
  stylePreset: z.string(),
  controls: z.object({
    canToggle: z.boolean(),
    canAdjustOpacity: z.boolean(),
  }),
});

export const candidatePlaceSchema: z.ZodType<CandidatePlace> = z.object({
  id: z.string().min(1),
  placeId: z.string().min(1),
  place: mapPlaceSchema,
  regionId: z.string().min(1),
  targetDayId: z.string().optional(),
  targetSlot: z.enum(["morning", "afternoon", "evening"]).optional(),
  suggestedDuration: z.string(),
  status: z.enum(["candidate", "assigned", "conflict"]),
  conflictHints: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const mapTooltipSchema: z.ZodType<MapTooltip> = z.object({
  id: z.string().min(1),
  targetType: z.enum(["region", "place", "route", "layer"]),
  targetId: z.string().min(1),
  title: z.string(),
  shortInfo: z.string(),
  status: z.string(),
  position: mapCoordinateSchema.optional(),
});

export const mapActionSchema: z.ZodType<MapAction> = z.object({
  id: z.string().min(1),
  type: z.enum([
    "select_region",
    "select_place",
    "toggle_layer",
    "add_candidate",
    "assign_candidate",
    "clear_selection",
  ]),
  targetId: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
});

export const mapModeStateSchema = z.object({
  currentLayer: z.string().min(1),
  zoomLevel: z.number().finite().min(1).max(20),
  center: mapCoordinateSchema,
  activeTool: z.enum([
    "pan",
    "region",
    "place",
    "filter",
    "layer",
    "candidate",
    "route",
  ]),
});

export const mapProjectSchema: z.ZodType<MapProject> = z.object({
  id: z.string().min(1),
  projectId: z.string().optional(),
  title: z.string().min(1),
  city: z.string().min(1),
  country: z.string().min(1),
  mapMode: mapModeStateSchema,
  regions: z.array(mapRegionSchema),
  places: z.array(mapPlaceSchema),
  routes: z.array(mapRouteSchema),
  layers: z.array(mapLayerSchema),
  selectedRegionId: z.string().optional(),
  selectedPlaceId: z.string().optional(),
  candidatePlaceIds: z.array(z.string()),
  candidatePlaces: z.array(candidatePlaceSchema),
  unresolvedPlaces: z.array(unresolvedMapPlaceSchema),
  activeDayId: z.string().optional(),
  tooltips: z.array(mapTooltipSchema),
  actions: z.array(mapActionSchema),
  updatedAt: z.string(),
});

export const mapStudioStateSchema: z.ZodType<MapStudioState> = z.object({
  project: mapProjectSchema,
  hoveredRegionId: z.string().optional(),
  hoveredPlaceId: z.string().optional(),
  activeLayerIds: z.array(z.string()),
  activeTool: z.enum([
    "pan",
    "region",
    "place",
    "filter",
    "layer",
    "candidate",
    "route",
  ]),
  activeDayId: z.string().optional(),
  mapZoom: z.number().finite().min(1).max(20),
  mapCenter: mapCoordinateSchema,
});
