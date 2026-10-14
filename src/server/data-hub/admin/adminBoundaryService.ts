import { createSupabaseServiceRoleClient } from "../../../../lib/supabase/server.ts";
import type { AdminRegionLevel } from "./types.ts";

export type AdminBoundaryLevel = Extract<AdminRegionLevel, "province" | "prefecture" | "county">;

export interface GeoJsonGeometry {
  type: string;
  coordinates?: unknown;
  geometries?: GeoJsonGeometry[];
}

export interface AdminBoundaryFeature {
  adcode: string;
  name: string;
  level: AdminRegionLevel;
  adminType: string | null;
  parentAdcode: string | null;
  provinceAdcode: string | null;
  prefectureAdcode: string | null;
  center: [number, number] | null;
  labelPoint: [number, number] | null;
  bbox: [number, number, number, number] | null;
  geometry?: GeoJsonGeometry | null;
  source: string | null;
  sourceUpdatedAt: string | null;
  confidence: number | null;
}

export interface GetAdminBoundariesInput {
  parentAdcode?: string;
  level: AdminBoundaryLevel;
  includeGeometry?: boolean;
  bbox?: [number, number, number, number];
}

export interface AdminBoundariesResult {
  parentAdcode: string | null;
  level: AdminBoundaryLevel;
  bbox: [number, number, number, number] | null;
  count: number;
  features: AdminBoundaryFeature[];
  sourceSummary: {
    sources: string[];
    missingGeometry: number;
    generatedAt: string;
  };
}

export interface AdminRegionBoundaryRow {
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
  bbox_min_lng: number | null;
  bbox_min_lat: number | null;
  bbox_max_lng: number | null;
  bbox_max_lat: number | null;
  boundary?: unknown;
  source: string | null;
  source_updated_at: string | null;
  metadata: Record<string, unknown> | null;
}

interface SupabaseQuery<T> {
  eq(column: string, value: unknown): SupabaseQuery<T>;
  is(column: string, value: null): SupabaseQuery<T>;
  lte(column: string, value: unknown): SupabaseQuery<T>;
  gte(column: string, value: unknown): SupabaseQuery<T>;
  order(column: string, options?: { ascending?: boolean }): SupabaseQuery<T>;
  limit(count: number): SupabaseQuery<T>;
  then<TResult1 = { data: T[] | null; error: unknown }, TResult2 = never>(
    onfulfilled?: ((value: { data: T[] | null; error: unknown; count?: number | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2>;
}

interface AdminBoundaryReadClient {
  from<T = unknown>(table: string): {
    select(columns: string, options?: { count?: "exact" }): SupabaseQuery<T>;
  };
}

export interface AdminBoundaryRepository {
  listChildren(input: GetAdminBoundariesInput & { includeGeometry: boolean }): Promise<AdminRegionBoundaryRow[]>;
  countMissingGeometry(input: Pick<GetAdminBoundariesInput, "parentAdcode" | "level" | "bbox">): Promise<number>;
}

const BASE_COLUMNS = [
  "adcode",
  "name",
  "level",
  "admin_type",
  "parent_adcode",
  "province_adcode",
  "prefecture_adcode",
  "center_lng",
  "center_lat",
  "label_lng",
  "label_lat",
  "bbox_min_lng",
  "bbox_min_lat",
  "bbox_max_lng",
  "bbox_max_lat",
  "source",
  "source_updated_at",
  "metadata",
].join(",");

function hasDatabaseError(error: unknown): boolean {
  return Boolean(error);
}

export class SupabaseAdminBoundaryRepository implements AdminBoundaryRepository {
  private readonly client: AdminBoundaryReadClient;

  constructor(
    client: AdminBoundaryReadClient = createSupabaseServiceRoleClient() as unknown as AdminBoundaryReadClient,
  ) {
    this.client = client;
  }

  async listChildren(input: GetAdminBoundariesInput & { includeGeometry: boolean }): Promise<AdminRegionBoundaryRow[]> {
    const columns = input.includeGeometry ? `${BASE_COLUMNS},boundary` : BASE_COLUMNS;
    let query = this.client
      .from<AdminRegionBoundaryRow>("admin_regions")
      .select(columns)
      .eq("level", input.level);

    if (input.parentAdcode) {
      query = query.eq("parent_adcode", input.parentAdcode);
    }

    if (input.bbox) {
      const [minLng, minLat, maxLng, maxLat] = input.bbox;
      query = query
        .lte("bbox_min_lng", maxLng)
        .gte("bbox_max_lng", minLng)
        .lte("bbox_min_lat", maxLat)
        .gte("bbox_max_lat", minLat);
    }

    const result = await query.order("adcode", { ascending: true });

    if (hasDatabaseError(result.error)) {
      throw new Error("database_error: admin_regions boundary lookup failed");
    }

    return result.data ?? [];
  }

  async countMissingGeometry(input: Pick<GetAdminBoundariesInput, "parentAdcode" | "level" | "bbox">): Promise<number> {
    let query = this.client
      .from<Pick<AdminRegionBoundaryRow, "adcode">>("admin_regions")
      .select("adcode", { count: "exact" })
      .eq("level", input.level)
      .is("boundary", null);

    if (input.parentAdcode) {
      query = query.eq("parent_adcode", input.parentAdcode);
    }

    if (input.bbox) {
      const [minLng, minLat, maxLng, maxLat] = input.bbox;
      query = query
        .lte("bbox_min_lng", maxLng)
        .gte("bbox_max_lng", minLng)
        .lte("bbox_min_lat", maxLat)
        .gte("bbox_max_lat", minLat);
    }

    const result = await query.limit(1);

    if (hasDatabaseError(result.error)) {
      throw new Error("database_error: admin_regions missing geometry count failed");
    }

    return result.count ?? 0;
  }
}

function tuplePoint(lng: number | null, lat: number | null): [number, number] | null {
  return typeof lng === "number" && typeof lat === "number" ? [lng, lat] : null;
}

function tupleBbox(row: AdminRegionBoundaryRow): [number, number, number, number] | null {
  return (
    typeof row.bbox_min_lng === "number" &&
    typeof row.bbox_min_lat === "number" &&
    typeof row.bbox_max_lng === "number" &&
    typeof row.bbox_max_lat === "number"
  )
    ? [row.bbox_min_lng, row.bbox_min_lat, row.bbox_max_lng, row.bbox_max_lat]
    : null;
}

function normalizeGeometry(value: unknown): GeoJsonGeometry | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const geometry = value as { type?: unknown; coordinates?: unknown; geometries?: unknown };
  if (typeof geometry.type !== "string") {
    return null;
  }

  if ("coordinates" in geometry) {
    return { type: geometry.type, coordinates: geometry.coordinates };
  }

  if (Array.isArray(geometry.geometries)) {
    return {
      type: geometry.type,
      geometries: geometry.geometries
        .map(normalizeGeometry)
        .filter((item): item is GeoJsonGeometry => item !== null),
    };
  }

  return { type: geometry.type };
}

function confidenceFromMetadata(metadata: Record<string, unknown> | null): number | null {
  const confidence = metadata?.confidence;
  return typeof confidence === "number" && Number.isFinite(confidence) ? confidence : null;
}

function mapRowToFeature(row: AdminRegionBoundaryRow, includeGeometry: boolean): AdminBoundaryFeature {
  const feature: AdminBoundaryFeature = {
    adcode: row.adcode,
    name: row.name,
    level: row.level,
    adminType: row.admin_type,
    parentAdcode: row.parent_adcode,
    provinceAdcode: row.province_adcode,
    prefectureAdcode: row.prefecture_adcode,
    center: tuplePoint(row.center_lng, row.center_lat),
    labelPoint: tuplePoint(row.label_lng, row.label_lat),
    bbox: tupleBbox(row),
    source: row.source,
    sourceUpdatedAt: row.source_updated_at,
    confidence: confidenceFromMetadata(row.metadata),
  };

  if (includeGeometry) {
    feature.geometry = normalizeGeometry(row.boundary);
  }

  return feature;
}

export class AdminBoundaryService {
  private readonly repository: AdminBoundaryRepository;

  constructor(repository: AdminBoundaryRepository = new SupabaseAdminBoundaryRepository()) {
    this.repository = repository;
  }

  async getAdminBoundaries(input: GetAdminBoundariesInput): Promise<AdminBoundariesResult> {
    const includeGeometry = input.includeGeometry !== false;
    const [rows, missingGeometry] = await Promise.all([
      this.repository.listChildren({ ...input, includeGeometry }),
      this.repository.countMissingGeometry({
        parentAdcode: input.parentAdcode,
        level: input.level,
        bbox: input.bbox,
      }),
    ]);
    const features = rows.map((row) => mapRowToFeature(row, includeGeometry));
    const sources = [...new Set(features.map((feature) => feature.source).filter((source): source is string => Boolean(source)))];

    const result: AdminBoundariesResult = {
      parentAdcode: input.parentAdcode ?? null,
      level: input.level,
      bbox: input.bbox ?? null,
      count: features.length,
      features,
      sourceSummary: {
        sources,
        missingGeometry,
        generatedAt: new Date().toISOString(),
      },
    };

    return stripUnsafeAdminBoundaryData(result);
  }
}

export function createAdminBoundaryService(repository?: AdminBoundaryRepository) {
  return new AdminBoundaryService(repository);
}

export function stripUnsafeAdminBoundaryData<T>(value: T): T {
  const text = JSON.stringify(value);
  if (/raw_snapshot|raw_payload|raw_json|rawJson|metadata|service_role|SUPABASE_SERVICE_ROLE_KEY|authorization/i.test(text)) {
    throw new Error("Admin boundary output contains unsafe provider payload, metadata, or secret fields.");
  }

  return value;
}
