export type AdminBoundaryApiLevel = "province" | "prefecture" | "county";

export interface AdminBoundaryGeoJsonGeometry {
  type: string;
  coordinates?: unknown;
  geometries?: AdminBoundaryGeoJsonGeometry[];
}

export interface AdminBoundaryClientInput {
  parentAdcode?: string;
  level: AdminBoundaryApiLevel;
  includeGeometry?: boolean;
  bbox?: [number, number, number, number];
}

export interface AdminBoundaryClientFeature {
  adcode: string;
  name: string;
  level: "country" | "province" | "prefecture" | "county";
  adminType: string | null;
  parentAdcode: string | null;
  provinceAdcode: string | null;
  prefectureAdcode: string | null;
  center: [number, number] | null;
  labelPoint: [number, number] | null;
  bbox: [number, number, number, number] | null;
  geometry?: AdminBoundaryGeoJsonGeometry | null;
  source: string | null;
  sourceUpdatedAt: string | null;
  confidence: number | null;
}

export interface AdminBoundaryClientResult {
  parentAdcode: string | null;
  level: AdminBoundaryApiLevel;
  bbox?: [number, number, number, number] | null;
  count: number;
  features: AdminBoundaryClientFeature[];
  sourceSummary: {
    sources: string[];
    missingGeometry: number;
    generatedAt: string;
  };
}

interface AdminBoundaryApiResponse extends Partial<AdminBoundaryClientResult> {
  ok?: boolean;
  error?: {
    code?: string;
    message?: string;
  };
}

export class AdminBoundaryClientError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, input: { code?: string; status?: number } = {}) {
    super(message);
    this.name = "AdminBoundaryClientError";
    this.code = input.code ?? "ADMIN_BOUNDARY_CLIENT_ERROR";
    this.status = input.status ?? 0;
  }
}

function assertSafeAdminBoundaryResponse(value: AdminBoundaryClientResult) {
  const text = JSON.stringify(value);
  if (/raw_snapshot|raw_payload|raw_json|rawJson|service_role|SUPABASE_SERVICE_ROLE_KEY|authorization/i.test(text)) {
    throw new AdminBoundaryClientError("Admin boundary response contains unsafe fields.", {
      code: "UNSAFE_ADMIN_BOUNDARY_RESPONSE",
    });
  }
}

function normalizeAdminBoundaryResponse(value: AdminBoundaryApiResponse): AdminBoundaryClientResult {
  if (value.ok !== true) {
    throw new AdminBoundaryClientError(value.error?.message ?? "行政区边界读取失败。", {
      code: value.error?.code ?? "ADMIN_BOUNDARY_API_ERROR",
    });
  }

  const result: AdminBoundaryClientResult = {
    parentAdcode: value.parentAdcode === null || typeof value.parentAdcode === "undefined"
      ? null
      : String(value.parentAdcode),
    level: value.level as AdminBoundaryApiLevel,
    bbox: Array.isArray(value.bbox) ? value.bbox as [number, number, number, number] : null,
    count: Number(value.count ?? 0),
    features: Array.isArray(value.features) ? value.features : [],
    sourceSummary: {
      sources: Array.isArray(value.sourceSummary?.sources) ? value.sourceSummary.sources : [],
      missingGeometry: Number(value.sourceSummary?.missingGeometry ?? 0),
      generatedAt: String(value.sourceSummary?.generatedAt ?? new Date().toISOString()),
    },
  };

  assertSafeAdminBoundaryResponse(result);
  return result;
}

export async function fetchAdminBoundaries(
  input: AdminBoundaryClientInput,
  fetchImpl: typeof fetch = fetch,
): Promise<AdminBoundaryClientResult> {
  const params = new URLSearchParams();

  if (input.parentAdcode) {
    params.set("parentAdcode", input.parentAdcode);
  }

  params.set("level", input.level);

  if (input.bbox) {
    params.set("bbox", input.bbox.join(","));
  }

  params.set("includeGeometry", String(input.includeGeometry !== false));

  const response = await fetchImpl(`/api/data-hub/admin-boundaries?${params.toString()}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
  const payload = await response.json().catch(() => null) as AdminBoundaryApiResponse | null;

  if (!response.ok) {
    throw new AdminBoundaryClientError(
      payload?.error?.message ?? "行政区边界读取失败。",
      {
        code: payload?.error?.code ?? "ADMIN_BOUNDARY_API_ERROR",
        status: response.status,
      },
    );
  }

  return normalizeAdminBoundaryResponse(payload ?? {});
}
