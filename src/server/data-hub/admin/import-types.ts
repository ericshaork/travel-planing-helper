import type { AdminRegionLevel } from "./types.ts";

export type AdminRegionAdminType =
  | "country"
  | "province"
  | "autonomous_region"
  | "municipality"
  | "special_administrative_region"
  | "prefecture_city"
  | "prefecture_city_direct_township"
  | "autonomous_prefecture"
  | "prefecture"
  | "league"
  | "district"
  | "county"
  | "autonomous_county"
  | "county_level_city"
  | "banner"
  | "autonomous_banner"
  | "province_direct_administered"
  | "unknown";

export type GeoJsonPosition = [number, number] | [number, number, number];
export type GeoJsonLinearRing = GeoJsonPosition[];
export type GeoJsonPolygonCoordinates = GeoJsonLinearRing[];
export type GeoJsonMultiPolygonCoordinates = GeoJsonPolygonCoordinates[];

export interface NormalizedPolygonGeometry {
  type: "Polygon";
  coordinates: GeoJsonPolygonCoordinates;
}

export interface NormalizedMultiPolygonGeometry {
  type: "MultiPolygon";
  coordinates: GeoJsonMultiPolygonCoordinates;
}

export type ImportableAdminGeometry =
  | NormalizedPolygonGeometry
  | NormalizedMultiPolygonGeometry;

export type AdminRegionBbox = [number, number, number, number];

export interface AdminRegionPoint {
  lng: number;
  lat: number;
}

export interface NormalizedAdminRegion {
  adcode: string;
  name: string;
  level: AdminRegionLevel;
  adminType: AdminRegionAdminType | string;
  parentAdcode: string | null;
  provinceAdcode: string | null;
  prefectureAdcode: string | null;
  center: AdminRegionPoint | null;
  labelPoint?: AdminRegionPoint | null;
  geometry: NormalizedMultiPolygonGeometry | null;
  bbox: AdminRegionBbox | null;
  source: string | null;
  sourceId: string | null;
  sourceUpdatedAt: string | null;
  metadata?: Record<string, unknown>;
}

export interface RawAdminRegionInput {
  adcode: string;
  name: string;
  level?: string | null;
  adminType?: string | null;
  parentAdcode?: string | null;
  provinceAdcode?: string | null;
  prefectureAdcode?: string | null;
  center?: AdminRegionPoint | null;
  labelPoint?: AdminRegionPoint | null;
  geometry?: ImportableAdminGeometry | null;
  bbox?: AdminRegionBbox | null;
  source?: string | null;
  sourceId?: string | null;
  sourceUpdatedAt?: string | null;
  metadata?: Record<string, unknown>;
}

export interface AdminRegionImportRow {
  adcode: string;
  name: string;
  level: AdminRegionLevel;
  admin_type: string | null;
  parent_adcode: string | null;
  province_adcode: string | null;
  prefecture_adcode: string | null;
  center_lng: number | null;
  center_lat: number | null;
  label_lng: number | null;
  label_lat: number | null;
  boundary_geojson: NormalizedMultiPolygonGeometry | null;
  bbox_min_lng: number | null;
  bbox_min_lat: number | null;
  bbox_max_lng: number | null;
  bbox_max_lat: number | null;
  source: string | null;
  source_id: string | null;
  source_updated_at: string | null;
  metadata: Record<string, unknown>;
}

export interface AdminRegionImportSummary {
  total: number;
  upserted: number;
  province: number;
  prefecture: number;
  county: number;
  country: number;
  missingGeometry: number;
  invalidParent: number;
  failed: number;
}
