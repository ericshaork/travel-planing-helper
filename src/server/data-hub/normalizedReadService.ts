import { createSupabaseServiceRoleClient } from "../../../lib/supabase/server.ts";

import type {
  EventRecord,
  JsonObject,
  NormalizedEvent,
  NormalizedPlaceFact,
  NormalizedRouteEstimate,
  NormalizedWeatherSnapshot,
  PlaceFactRecord,
  RouteCacheRecord,
  WeatherSnapshotRecord,
} from "./types";

interface ReadQueryBuilder<T> {
  select(columns?: string): ReadQueryBuilder<T>;
  eq(column: string, value: unknown): ReadQueryBuilder<T>;
  order(column: string, options?: { ascending?: boolean }): ReadQueryBuilder<T>;
  limit(count: number): ReadQueryBuilder<T>;
}

interface ReadClientLike {
  from<T = unknown>(table: string): ReadQueryBuilder<T>;
}

export interface PlaceFactsQuery {
  placeId?: string;
  provider?: string;
  factType?: string;
  limit?: number;
}

export interface EventsQuery {
  destinationId?: string;
  adminAreaId?: string;
  placeId?: string;
  provider?: string;
  limit?: number;
}

export interface WeatherQuery {
  destinationId?: string;
  adminAreaId?: string;
  placeId?: string;
  provider?: string;
  snapshotType?: string;
  limit?: number;
}

export interface RouteCacheQuery {
  originPlaceId?: string;
  destinationPlaceId?: string;
  provider?: string;
  mode?: string;
  limit?: number;
}

function clampLimit(limit: number | undefined): number {
  return Math.max(1, Math.min(limit ?? 20, 50));
}

function source(record: {
  source_provider?: string | null;
  provider?: string | null;
  source_url?: string | null;
  source_name?: string | null;
  source_external_id?: string | null;
  external_id?: string | null;
  confidence?: number | null;
  fetched_at?: string | null;
  expires_at?: string | null;
  last_verified_at?: string | null;
}, fieldName?: string) {
  return {
    provider: record.source_provider ?? record.provider ?? "unknown",
    fieldName,
    sourceUrl: record.source_url ?? null,
    externalId: record.source_external_id ?? record.external_id ?? null,
    confidence: record.confidence ?? null,
    fetchedAt: record.fetched_at ?? null,
    expiresAt: record.expires_at ?? null,
    lastVerifiedAt: record.last_verified_at ?? record.fetched_at ?? null,
    notes: record.source_name ?? undefined,
  };
}

function applyFilters<T>(query: ReadQueryBuilder<T>, filters: Record<string, unknown>, limit: number) {
  let current = query;
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") {
      current = current.eq(key, value);
    }
  }
  return current.limit(limit);
}

async function readList<T>(query: ReadQueryBuilder<T[]>): Promise<T[]> {
  const result = await query as unknown as { data: T[] | null; error: unknown };
  return result.error ? [] : result.data ?? [];
}

function mapFact(record: PlaceFactRecord): NormalizedPlaceFact {
  return {
    id: record.id,
    placeId: record.place_id,
    factType: record.fact_type,
    value: record.value_json,
    text: record.value_text,
    language: record.language,
    source: source(record, record.fact_type),
    confidence: record.confidence,
    verificationStatus: record.verification_status,
    fetchedAt: record.fetched_at,
    lastVerifiedAt: record.last_verified_at,
    expiresAt: record.expires_at,
    missingFields: [],
    metadata: record.metadata,
  };
}

function mapEvent(record: EventRecord): NormalizedEvent {
  return {
    id: record.id,
    provider: record.provider,
    externalId: record.external_id,
    title: record.title,
    description: record.description,
    eventType: record.event_type,
    destinationId: record.destination_id,
    adminAreaId: record.admin_area_id,
    placeId: record.place_id,
    venueName: record.venue_name,
    address: record.address,
    lat: record.latitude,
    lng: record.longitude,
    startsAt: record.starts_at,
    endsAt: record.ends_at,
    timezone: record.timezone,
    ticketUrl: record.ticket_url,
    officialUrl: record.official_url,
    imageUrl: record.image_url,
    priceText: record.price_text,
    source: source(record, "event"),
    confidence: record.confidence,
    fetchedAt: record.fetched_at,
    expiresAt: record.expires_at,
    missingFields: [],
  };
}

function mapWeather(record: WeatherSnapshotRecord): NormalizedWeatherSnapshot {
  return {
    id: record.id,
    provider: record.provider,
    destinationId: record.destination_id,
    adminAreaId: record.admin_area_id,
    placeId: record.place_id,
    lat: record.latitude,
    lng: record.longitude,
    snapshotType: record.snapshot_type,
    observedAt: record.observed_at,
    forecastStartAt: record.forecast_start_at,
    forecastEndAt: record.forecast_end_at,
    temperatureC: record.temperature_c,
    feelsLikeC: record.feels_like_c,
    conditionText: record.condition_text,
    precipitationProbability: record.precipitation_probability,
    windText: record.wind_text,
    humidity: record.humidity,
    airQuality: { aqi: record.aqi },
    uv: { index: record.uv_index },
    warning: { level: record.warning_level, title: record.warning_title },
    value: record.value_json,
    source: source(record, "weather"),
    confidence: record.confidence,
    fetchedAt: record.fetched_at,
    expiresAt: record.expires_at,
    missingFields: [],
  };
}

function mapRoute(record: RouteCacheRecord): NormalizedRouteEstimate {
  return {
    originPlaceId: record.origin_place_id ?? "",
    destinationPlaceId: record.destination_place_id ?? "",
    mode: record.mode,
    distanceMeters: record.distance_meters,
    durationSeconds: record.duration_seconds,
    provider: record.provider ?? "unknown",
    source: {
      provider: record.provider ?? "unknown",
      fieldName: "routeEstimate",
      sourceUrl: null,
      externalId: record.id,
      confidence: null,
      fetchedAt: record.fetched_at,
      expiresAt: record.expires_at,
      lastVerifiedAt: record.fetched_at,
    },
    confidence: null,
    lastVerifiedAt: record.fetched_at,
    expiresAt: record.expires_at,
    missingFields: [],
  };
}

export class DataHubNormalizedReadService {
  private readonly client: ReadClientLike;

  constructor(client: ReadClientLike = createSupabaseServiceRoleClient() as unknown as ReadClientLike) {
    this.client = client;
  }

  async getPlaceFacts(query: PlaceFactsQuery): Promise<NormalizedPlaceFact[]> {
    const request = applyFilters(
      this.client.from<PlaceFactRecord[]>("place_facts").select("*").order("fetched_at", { ascending: false }),
      {
        place_id: query.placeId,
        source_provider: query.provider,
        fact_type: query.factType,
      },
      clampLimit(query.limit),
    );
    return (await readList<PlaceFactRecord>(request)).map(mapFact);
  }

  async getEvents(query: EventsQuery): Promise<NormalizedEvent[]> {
    const request = applyFilters(
      this.client.from<EventRecord[]>("event_records").select("*").order("starts_at", { ascending: true }),
      {
        destination_id: query.destinationId,
        admin_area_id: query.adminAreaId,
        place_id: query.placeId,
        provider: query.provider,
      },
      clampLimit(query.limit),
    );
    return (await readList<EventRecord>(request)).map(mapEvent);
  }

  async getWeather(query: WeatherQuery): Promise<NormalizedWeatherSnapshot[]> {
    const request = applyFilters(
      this.client.from<WeatherSnapshotRecord[]>("weather_snapshots").select("*").order("fetched_at", { ascending: false }),
      {
        destination_id: query.destinationId,
        admin_area_id: query.adminAreaId,
        place_id: query.placeId,
        provider: query.provider,
        snapshot_type: query.snapshotType,
      },
      clampLimit(query.limit),
    );
    return (await readList<WeatherSnapshotRecord>(request)).map(mapWeather);
  }

  async getRouteCache(query: RouteCacheQuery): Promise<NormalizedRouteEstimate[]> {
    const request = applyFilters(
      this.client.from<RouteCacheRecord[]>("route_cache").select("*").order("fetched_at", { ascending: false }),
      {
        origin_place_id: query.originPlaceId,
        destination_place_id: query.destinationPlaceId,
        provider: query.provider,
        mode: query.mode,
      },
      clampLimit(query.limit),
    );
    return (await readList<RouteCacheRecord>(request)).map(mapRoute);
  }
}

export function stripRawProviderPayload(value: unknown): unknown {
  const text = JSON.stringify(value);
  if (text.includes("raw_snapshot") || text.includes("rawSnapshot")) {
    throw new Error("Normalized read output must not contain raw provider payload.");
  }
  return value;
}
