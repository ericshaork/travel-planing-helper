import type {
  DataSourceSummary,
  MissingFieldNotice,
  NormalizedAdminAreaDetail,
  NormalizedDestinationDetail,
  NormalizedPlaceDetail,
  NormalizedRouteEstimate,
  NormalizedTravelRegionDetail,
  RouteMode,
} from "@/src/server/data-hub/types";
import type { BuildEvidencePackInput, EvidencePack } from "@/src/server/data-hub/evidencePackService";
import type { BasicRouteDraft, BasicRoutePlannerInput } from "@/src/lib/data-hub/planningTypes";

export interface DataHubApiResponse<T> {
  ok: boolean;
  detail?: NormalizedPlaceDetail | null;
  places?: NormalizedPlaceDetail["place"][];
  route?: NormalizedRouteEstimate | null;
  draft?: BasicRouteDraft;
  evidencePack?: EvidencePack;
  sources?: DataSourceSummary[];
  missingFields?: MissingFieldNotice[];
  error?: {
    code: string;
    message: string;
  };
}


export type AreaDetailTargetType = "destination" | "admin_area" | "travel_region";

export interface AreaDetailApiResponse<T> {
  ok: boolean;
  detail?: T;
  sources?: DataSourceSummary[];
  missingFields?: MissingFieldNotice[];
  error?: {
    code: string;
    message: string;
  };
}

export type EnrichAreaDetailInput =
  | {
      targetType: "destination";
      destinationId?: string | null;
      name: string;
      intro?: string | null;
      travelSummary?: string | null;
      bestSeason?: string | null;
      primaryThemes?: string[];
      sourceProvider?: string | null;
      sourceExternalId?: string | null;
    }
  | {
      targetType: "admin_area";
      adminAreaId?: string | null;
      name: string;
      intro?: string | null;
      travelSummary?: string | null;
      transportSummary?: string | null;
      suitableFor?: string[];
      sourceProvider?: string | null;
      sourceExternalId?: string | null;
    }
  | {
      targetType: "travel_region";
      travelRegionId?: string | null;
      name: string;
      intro?: string | null;
      playStyle?: string | null;
      suggestedRoute?: string | null;
      suitableFor?: string[];
      crowdLevel?: string | null;
      representativePlaceIds?: string[];
      sourceProvider?: string | null;
      sourceExternalId?: string | null;
    };
export interface EnrichPlaceInput {
  placeId?: string;
  name?: string;
  lat?: number;
  lng?: number;
  address?: string | null;
  category?: string | null;
  destinationId?: string | null;
  regionId?: string | null;
  sourceProvider?: string | null;
  sourceExternalId?: string | null;
}

export interface EstimateRouteInput {
  originPlaceId: string;
  destinationPlaceId: string;
  mode: RouteMode;
}

async function readDataHubResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T;
  if (!response.ok) {
    return data;
  }
  return data;
}

export async function searchPlaces(query: string, options: { city?: string; countryCode?: string; limit?: number } = {}) {
  const params = new URLSearchParams({ q: query });
  if (options.city) params.set("city", options.city);
  if (options.countryCode) params.set("countryCode", options.countryCode);
  if (options.limit) params.set("limit", String(options.limit));

  return readDataHubResponse<DataHubApiResponse<NormalizedPlaceDetail["place"][]>>(
    await fetch(`/api/data-hub/places/search?${params.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    }),
  );
}

export async function getPlaceDetail(placeId: string) {
  return readDataHubResponse<DataHubApiResponse<NormalizedPlaceDetail>>(
    await fetch(`/api/data-hub/places/${encodeURIComponent(placeId)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    }),
  );
}

export async function getPlaceProfile(placeId: string) {
  return readDataHubResponse<DataHubApiResponse<NormalizedPlaceDetail>>(
    await fetch(`/api/data-hub/places/${encodeURIComponent(placeId)}/profile`, {
      method: "GET",
      headers: { Accept: "application/json" },
    }),
  );
}

export async function buildEvidencePack(input: BuildEvidencePackInput) {
  return readDataHubResponse<DataHubApiResponse<EvidencePack>>(
    await fetch("/api/data-hub/evidence-pack", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    }),
  );
}

export async function enrichPlace(input: EnrichPlaceInput) {
  return readDataHubResponse<DataHubApiResponse<NormalizedPlaceDetail>>(
    await fetch("/api/data-hub/places/enrich", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    }),
  );
}

export async function estimateRoute(input: EstimateRouteInput) {
  return readDataHubResponse<DataHubApiResponse<NormalizedRouteEstimate>>(
    await fetch("/api/data-hub/routes/estimate", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    }),
  );
}

export async function planBasicRoute(input: BasicRoutePlannerInput) {
  return readDataHubResponse<DataHubApiResponse<BasicRouteDraft>>(
    await fetch("/api/data-hub/planning/basic-route", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    }),
  );
}

export async function getDestinationDetail(destinationId: string) {
  return readDataHubResponse<AreaDetailApiResponse<NormalizedDestinationDetail>>(
    await fetch(`/api/data-hub/destinations/${encodeURIComponent(destinationId)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    }),
  );
}

export async function getAdminAreaDetail(adminAreaId: string) {
  return readDataHubResponse<AreaDetailApiResponse<NormalizedAdminAreaDetail>>(
    await fetch(`/api/data-hub/admin-areas/${encodeURIComponent(adminAreaId)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    }),
  );
}

export async function getTravelRegionDetail(travelRegionId: string) {
  return readDataHubResponse<AreaDetailApiResponse<NormalizedTravelRegionDetail>>(
    await fetch(`/api/data-hub/travel-regions/${encodeURIComponent(travelRegionId)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    }),
  );
}

export async function enrichAreaDetail(input: EnrichAreaDetailInput) {
  return readDataHubResponse<
    AreaDetailApiResponse<
      NormalizedDestinationDetail | NormalizedAdminAreaDetail | NormalizedTravelRegionDetail
    >
  >(
    await fetch("/api/data-hub/area-details/enrich", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    }),
  );
}
