import type {
  ItineraryItem,
  ItineraryItemType,
  TimeSlotKey,
  TripPlan,
  TripRequest,
} from "../trip/types";
import type { MapPoint } from "../trip/enrichment-types";
import type {
  DataSourceSummary,
  MissingFieldNotice,
  NormalizedPlaceDetail,
} from "@/src/server/data-hub/types";

export type MapDataStatus = "mock" | "placeholder" | "curated" | "api";

export interface MapCoordinate {
  lat: number;
  lng: number;
}

export type MapBoundaryType = "polygon" | "multi_polygon";

export interface MapBoundary {
  type: MapBoundaryType;
  coordinates: MapCoordinate[][];
  source: MapDataStatus | "custom";
}

export type MapRegionType =
  | "administrative"
  | "travel_area"
  | "scenic_zone"
  | "custom";

export interface MapRegionState {
  isVisible: boolean;
  isHovered: boolean;
  isSelected: boolean;
  isHighlighted: boolean;
}

export interface MapRegion {
  id: string;
  name: string;
  displayName: string;
  city: string;
  parentRegionId?: string;
  regionType: MapRegionType;
  boundary: MapBoundary;
  fallbackCenter: MapCoordinate;
  fillColor: string;
  borderColor: string;
  hoverColor: string;
  selectedColor: string;
  labelPosition: MapCoordinate;
  labelAnchor?: MapCoordinate;
  shortName?: string;
  priority?: number;
  minZoom?: number;
  maxZoom?: number;
  suggestedDuration?: string;
  summary: string;
  tags: string[];
  bestFor: string[];
  representativePlaceIds: string[];
  routeIds: string[];
  state: MapRegionState;
  dataStatus: MapDataStatus;
}

export type MapPlaceCategory =
  | "attraction"
  | "food"
  | "museum"
  | "shopping"
  | "nature"
  | "neighborhood"
  | "transport"
  | "experience";

export type MapSourceStatus = "unknown" | "mock" | "placeholder" | "curated" | "api";

export type MapPlaceSourceType = "plan" | "seed" | "candidate" | "mock";

export interface MapPlaceSource {
  label: string;
  url?: string;
}

export interface MapPlaceUiState {
  markerIcon: string;
  markerColor: string;
  isVisible: boolean;
  isHovered: boolean;
  isSelected: boolean;
  isHighlighted: boolean;
}

export interface MapPlace {
  id: string;
  name: string;
  displayName: string;
  city: string;
  regionId: string;
  regionIds?: string[];
  hotspotId?: string;
  districtId?: string;
  lat: number;
  lng: number;
  category: MapPlaceCategory;
  priority?: number;
  minZoom?: number;
  tags: string[];
  shortDescription: string;
  longDescription: string;
  suggestedDuration: string;
  bestFor: string[];
  openingHours: string;
  ticketInfo: string;
  crowdLevel: string;
  image?: string;
  imagePlaceholder: string;
  source: MapPlaceSource;
  sourceType: MapPlaceSourceType;
  dataHubPlaceId?: string;
  sourceProvider?: string;
  sourceExternalId?: string;
  dataHubDetail?: NormalizedPlaceDetail;
  dataHubSources?: DataSourceSummary[];
  missingFields?: MissingFieldNotice[];
  lastVerifiedAt?: string | null;
  confidence?: number | null;
  sourceStatus: MapSourceStatus;
  dataStatus: MapDataStatus;
  isCandidate: boolean;
  assignedDayId?: string;
  relationshipToPlan: string;
  planMeta?: PlanMapPlaceMeta;
  ui: MapPlaceUiState;
}

export interface PlanMapPlaceMeta {
  day: number;
  slot: TimeSlotKey;
  itemIndex: number;
  placeName: string;
  type: ItineraryItemType;
  reason: string;
  suggestedDuration?: string;
  timeLabel?: string;
  editorId?: string;
  editorSlotId?: string;
  address?: string;
  provider?: string;
  resolved: boolean;
  warning?: string;
}

export interface UnresolvedMapPlace {
  id: string;
  placeName: string;
  day: number;
  slot: TimeSlotKey;
  itemIndex: number;
  type: ItineraryItemType;
  reason: string;
  suggestedDuration?: string;
  timeLabel?: string;
  editorId?: string;
  editorSlotId?: string;
  status: "missing_coordinates";
  warning?: string;
}

export type MapRouteType =
  | "day_route"
  | "candidate_route"
  | "imported_route"
  | "suggested_route";

export type MapTransportMode = "walk" | "transit" | "drive" | "mixed";

export interface MapRoutePath {
  type: "polyline" | "none";
  coordinates: MapCoordinate[];
  source: MapDataStatus | "none";
}

export interface MapRoute {
  id: string;
  name: string;
  routeType: MapRouteType;
  dayId?: string;
  placeIds: string[];
  path: MapRoutePath;
  estimatedDuration: string;
  estimatedDistance: string;
  transportMode: MapTransportMode;
  warnings: string[];
  suggestions: string[];
  animationState: "idle" | "preview" | "playing";
  dataStatus: MapDataStatus;
}

export type MapLayerType =
  | "regions"
  | "hotspots"
  | "districts"
  | "labels"
  | "plan_places"
  | "places"
  | "routes"
  | "candidates"
  | "transport"
  | "traffic"
  | "terrain"
  | "custom";

export interface MapLayerControls {
  canToggle: boolean;
  canAdjustOpacity: boolean;
}

export interface MapLayer {
  id: string;
  name: string;
  type: MapLayerType;
  isVisible: boolean;
  opacity: number;
  zIndex: number;
  stylePreset: string;
  controls: MapLayerControls;
}

export type CandidatePlaceStatus = "candidate" | "assigned" | "conflict";

export interface CandidatePlace {
  id: string;
  placeId: string;
  place: MapPlace;
  regionId: string;
  targetDayId?: string;
  targetSlot?: TimeSlotKey;
  suggestedDuration: string;
  status: CandidatePlaceStatus;
  conflictHints: string[];
  dataHubPlaceId?: string;
  sourceProvider?: string;
  sourceExternalId?: string;
  missingFields?: MissingFieldNotice[];
  lastVerifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MapTooltip {
  id: string;
  targetType: "region" | "place" | "route" | "layer";
  targetId: string;
  title: string;
  shortInfo: string;
  status: string;
  position?: MapCoordinate;
}

export type MapActionType =
  | "select_region"
  | "select_place"
  | "toggle_layer"
  | "add_candidate"
  | "assign_candidate"
  | "clear_selection";

export interface MapAction {
  id: string;
  type: MapActionType;
  targetId?: string;
  payload?: Record<string, unknown>;
  createdAt: string;
}

export type MapStudioTool =
  | "pan"
  | "region"
  | "place"
  | "filter"
  | "layer"
  | "candidate"
  | "route";

export interface MapModeState {
  currentLayer: string;
  zoomLevel: number;
  center: MapCoordinate;
  activeTool: MapStudioTool;
}

export interface MapProject {
  id: string;
  projectId?: string;
  title: string;
  city: string;
  country: string;
  mapMode: MapModeState;
  regions: MapRegion[];
  places: MapPlace[];
  routes: MapRoute[];
  layers: MapLayer[];
  selectedRegionId?: string;
  selectedPlaceId?: string;
  candidatePlaceIds: string[];
  candidatePlaces: CandidatePlace[];
  unresolvedPlaces: UnresolvedMapPlace[];
  activeDayId?: string;
  tooltips: MapTooltip[];
  actions: MapAction[];
  updatedAt: string;
}

export interface MapStudioState {
  project: MapProject;
  hoveredRegionId?: string;
  hoveredPlaceId?: string;
  activeLayerIds: string[];
  activeTool: MapStudioTool;
  activeDayId?: string;
  mapZoom: number;
  mapCenter: MapCoordinate;
}

export interface BuildMapProjectInput {
  tripPlan: TripPlan;
  tripRequest?: TripRequest | null;
  mapPoints?: MapPoint[];
  projectId?: string;
  versionId?: string;
  now?: string;
}

export interface ApplyCandidateInput {
  tripPlan: TripPlan;
  candidate: CandidatePlace;
  dayNumber: number;
  slot: TimeSlotKey;
  now?: string;
}

export interface ApplyCandidateResult {
  tripPlan: TripPlan;
  candidate: CandidatePlace;
  item: ItineraryItem;
}

export interface RevertCandidateInput {
  tripPlan: TripPlan;
  candidate: CandidatePlace;
  dayNumber: number;
  slot: TimeSlotKey;
}

export interface RevertCandidateResult {
  tripPlan: TripPlan;
  candidate: CandidatePlace;
  removed: boolean;
}

export interface MapPlaceToItineraryItemInput {
  place: MapPlace;
  slot?: TimeSlotKey;
}

export const MAP_PLACE_CATEGORY_TO_ITINERARY_TYPE: Record<
  MapPlaceCategory,
  ItineraryItemType
> = {
  attraction: "attraction",
  food: "food",
  museum: "attraction",
  shopping: "shopping",
  nature: "attraction",
  neighborhood: "attraction",
  transport: "transport",
  experience: "other",
};
