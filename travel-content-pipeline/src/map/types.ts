export type MapAssetType = "anchor_poi" | "experience_poi";

export type MapSourceProvider = "amap" | "selector_estimate";

export type MapConfidence = "verified" | "estimated" | "partial";

export type RouteMode = "walking" | "driving" | "transit";

export interface MapPOIAsset {
  id: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  address: string;
  asset_type: MapAssetType;
  source_provider: MapSourceProvider;
  confidence: MapConfidence;
}

export interface RouteFact {
  id: string;
  from: string;
  to: string;
  mode: RouteMode;
  distance_m: number;
  duration_min: number;
  source_provider: MapSourceProvider;
  confidence: MapConfidence;
}

export interface SearchMapPoiParams {
  name: string;
  city: string;
  asset_type?: MapAssetType;
  limit?: number;
}

export interface SearchRouteParams {
  from: Pick<MapPOIAsset, "id" | "name" | "latitude" | "longitude">;
  to: Pick<MapPOIAsset, "id" | "name" | "latitude" | "longitude">;
  mode: RouteMode;
}
