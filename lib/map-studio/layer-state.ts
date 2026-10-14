export type MapPrimaryView = "admin" | "travel_region" | "clean";

export type AdminPrecision = "auto" | "province" | "prefecture" | "county";

export type MapExploreLayerKey =
  | "attractions"
  | "food"
  | "hotels"
  | "transportHubs"
  | "recommendedPlaces"
  | "candidatePlaces"
  | "plannedPlaces";

export type MapEnvironmentLayerKey = "traffic" | "weather" | "events";

export interface MapLayerState {
  primaryView: MapPrimaryView;
  adminPrecision: AdminPrecision;
  explore: Record<MapExploreLayerKey, boolean>;
  environment: Record<MapEnvironmentLayerKey, boolean>;
}

export interface MapLayerAvailability {
  explore: Record<MapExploreLayerKey, boolean>;
  environment: Record<MapEnvironmentLayerKey, boolean>;
}

export const DEFAULT_MAP_LAYER_STATE: MapLayerState = {
  primaryView: "admin",
  adminPrecision: "auto",
  explore: {
    attractions: true,
    food: false,
    hotels: false,
    transportHubs: false,
    recommendedPlaces: true,
    candidatePlaces: true,
    plannedPlaces: true,
  },
  environment: {
    traffic: false,
    weather: false,
    events: false,
  },
};

export const DEFAULT_MAP_LAYER_AVAILABILITY: MapLayerAvailability = {
  explore: {
    attractions: true,
    food: false,
    hotels: false,
    transportHubs: false,
    recommendedPlaces: true,
    candidatePlaces: true,
    plannedPlaces: true,
  },
  environment: {
    traffic: false,
    weather: false,
    events: false,
  },
};

export function createDefaultMapLayerState(): MapLayerState {
  return {
    primaryView: DEFAULT_MAP_LAYER_STATE.primaryView,
    adminPrecision: DEFAULT_MAP_LAYER_STATE.adminPrecision,
    explore: { ...DEFAULT_MAP_LAYER_STATE.explore },
    environment: { ...DEFAULT_MAP_LAYER_STATE.environment },
  };
}

export function createDefaultMapLayerAvailability(): MapLayerAvailability {
  return {
    explore: { ...DEFAULT_MAP_LAYER_AVAILABILITY.explore },
    environment: { ...DEFAULT_MAP_LAYER_AVAILABILITY.environment },
  };
}

