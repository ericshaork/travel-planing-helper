import type {
  AmapPlaceSearchResponse,
  AmapPoiRecord,
  AmapRouteStepRecord,
  AmapWalkingPathRecord,
} from "../integrations/maps/amapClient.js";
import type { MapPOIAsset, RouteFact, RouteMode, SearchMapPoiParams, SearchRouteParams } from "./types.js";

const DEFAULT_AMAP_BASE_URL = "https://restapi.amap.com";

interface AmapApiResponseBase {
  status?: string;
  info?: string;
  infocode?: string;
}

interface AmapRoutePathRecord extends AmapWalkingPathRecord {}

interface AmapRouteResponse extends AmapApiResponseBase {
  route?: {
    paths?: AmapRoutePathRecord[];
  };
}

export class AmapMapAssetClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(options?: { apiKey?: string; baseUrl?: string }) {
    this.apiKey = options?.apiKey ?? process.env.AMAP_API_KEY ?? "";
    this.baseUrl = options?.baseUrl ?? process.env.AMAP_API_BASE_URL ?? DEFAULT_AMAP_BASE_URL;

    if (!this.apiKey) {
      throw new Error("Missing AMAP_API_KEY environment variable.");
    }
  }

  async searchPoi(params: SearchMapPoiParams): Promise<MapPOIAsset[]> {
    const response = await this.request<AmapPlaceSearchResponse>("/v3/place/text", {
      keywords: params.name,
      city: params.city,
      citylimit: params.city ? "true" : undefined,
      offset: String(params.limit ?? 5),
      page: "1",
      extensions: "base",
    });

    return (response.pois ?? []).map((record) => this.normalizePoi(record, params));
  }

  async searchRoute(params: SearchRouteParams): Promise<RouteFact> {
    const endpoint = getRouteEndpoint(params.mode);
    const response = await this.request<AmapRouteResponse>(endpoint, {
      origin: formatCoordinate(params.from.longitude, params.from.latitude),
      destination: formatCoordinate(params.to.longitude, params.to.latitude),
    });

    const firstPath = response.route?.paths?.[0];
    if (!firstPath) {
      throw new Error(`Amap route search returned no path for ${params.from.name} -> ${params.to.name}.`);
    }

    return normalizeRouteFact({
      from: params.from,
      to: params.to,
      mode: params.mode,
      path: firstPath,
    });
  }

  private async request<T extends AmapApiResponseBase>(
    pathname: string,
    query: Record<string, string | undefined>,
  ): Promise<T> {
    const url = new URL(pathname, this.baseUrl);
    url.searchParams.set("key", this.apiKey);

    for (const [name, value] of Object.entries(query)) {
      if (value) {
        url.searchParams.set(name, value);
      }
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const bodyText = await response.text();
      throw new Error(`Amap request failed with status ${response.status}: ${bodyText}`);
    }

    const payload = (await response.json()) as T;
    if (payload.status !== "1") {
      throw new Error(`Amap request failed: ${payload.info ?? "Unknown error"} (${payload.infocode ?? "no infocode"})`);
    }

    return payload;
  }

  private normalizePoi(record: AmapPoiRecord, params: SearchMapPoiParams): MapPOIAsset {
    const name = record.name?.trim();
    const location = record.location?.split(",");
    const longitude = Number(location?.[0]);
    const latitude = Number(location?.[1]);

    if (!name || !Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      throw new Error("Invalid Amap POI payload: missing name or location.");
    }

    return {
      id: record.id?.trim() || buildPoiAssetId(params.city, name),
      name,
      city: record.cityname?.trim() || params.city,
      latitude,
      longitude,
      address: record.address?.trim() || "",
      asset_type: params.asset_type ?? "anchor_poi",
      source_provider: "amap",
      confidence: "verified",
    };
  }
}

export function normalizeRouteFact(params: {
  from: Pick<MapPOIAsset, "id" | "name">;
  to: Pick<MapPOIAsset, "id" | "name">;
  mode: RouteMode;
  path: AmapRoutePathRecord;
}): RouteFact {
  return {
    id: buildRouteFactId(params.from.id, params.to.id, params.mode),
    from: params.from.name,
    to: params.to.name,
    mode: params.mode,
    distance_m: parseRequiredInteger(params.path.distance, "route distance"),
    duration_min: secondsToRoundedMinutes(parseRequiredInteger(params.path.duration, "route duration")),
    source_provider: "amap",
    confidence: "verified",
  };
}

export function normalizeRouteStep(step: AmapRouteStepRecord): {
  instruction_summary: string;
  distance_m: number;
  duration_min: number;
} {
  return {
    instruction_summary: step.instruction?.trim() || step.road?.trim() || "Proceed to the next step.",
    distance_m: parseRequiredInteger(step.distance, "route step distance"),
    duration_min: secondsToRoundedMinutes(parseRequiredInteger(step.duration, "route step duration")),
  };
}

function getRouteEndpoint(mode: RouteMode): string {
  switch (mode) {
    case "walking":
      return "/v3/direction/walking";
    case "driving":
      return "/v3/direction/driving";
    case "transit":
      return "/v3/direction/transit/integrated";
    default:
      return assertNever(mode);
  }
}

function formatCoordinate(longitude: number, latitude: number): string {
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    throw new Error("Invalid coordinates for route search.");
  }

  return `${longitude},${latitude}`;
}

function buildPoiAssetId(city: string, name: string): string {
  return `amap:${slugify(city)}:${slugify(name)}`;
}

function buildRouteFactId(fromId: string, toId: string, mode: RouteMode): string {
  return `amap:${mode}:${fromId}->${toId}`;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u4e00-\u9fa5_-]/g, "");
}

function parseRequiredInteger(value: string | undefined, label: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid Amap payload: missing ${label}.`);
  }

  return Math.max(0, Math.round(parsed));
}

function secondsToRoundedMinutes(seconds: number): number {
  return Math.max(1, Math.round(seconds / 60));
}

function assertNever(value: never): never {
  throw new Error(`Unsupported route mode: ${String(value)}`);
}
