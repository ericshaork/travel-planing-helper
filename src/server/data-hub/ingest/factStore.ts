import type { SupabaseWriteClientLike } from "./ingestRunStore.ts";
import { summarizeSupabaseError } from "./ingestLogger.ts";
import type { JsonObject, JsonValue, RouteMode } from "../types.ts";

export interface PlaceUpsertInput {
  name: string;
  nameEn?: string | null;
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  category?: string | null;
  tags?: string[];
  destinationId?: string | null;
  regionId?: string | null;
  sourceProvider: string;
  sourceExternalId: string;
  status?: "active" | "inactive" | "unresolved" | "duplicate" | "archived";
}

export interface PlaceExternalIdInput {
  placeId: string;
  provider: string;
  externalId: string;
  externalUrl?: string | null;
  providerPlaceType?: string | null;
  matchMethod?: "exact_provider" | "name_address" | "name_coordinate" | "wikidata_qid" | "manual" | "imported";
  confidence?: number;
  verifiedStatus?: "unverified" | "verified" | "conflicted" | "rejected";
  lastVerifiedAt?: string | null;
  metadata?: JsonObject;
}

export interface PlaceFactInput {
  placeId: string;
  factType: string;
  value: JsonValue;
  text?: string | null;
  language?: string | null;
  sourceProvider: string;
  sourceExternalId?: string | null;
  sourceUrl?: string | null;
  sourceName?: string | null;
  confidence?: number | null;
  fetchedAt?: string;
  expiresAt?: string | null;
  metadata?: JsonObject;
}

export interface EventRecordInput {
  provider: string;
  externalId?: string | null;
  title: string;
  startsAt?: string | null;
  endsAt?: string | null;
  destinationId?: string | null;
  adminAreaId?: string | null;
  placeId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  sourceUrl?: string | null;
  sourceName?: string | null;
  metadata?: JsonObject;
}

export interface WeatherSnapshotInput {
  provider: string;
  snapshotType: string;
  destinationId?: string | null;
  adminAreaId?: string | null;
  placeId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  observedAt?: string | null;
  forecastStartAt?: string | null;
  forecastEndAt?: string | null;
  temperatureC?: number | null;
  conditionText?: string | null;
  precipitationProbability?: number | null;
  humidity?: number | null;
  aqi?: number | null;
  warningLevel?: string | null;
  warningTitle?: string | null;
  value: JsonObject;
  sourceUrl?: string | null;
  sourceName?: string | null;
  confidence?: number | null;
  fetchedAt?: string;
  expiresAt?: string | null;
}

export interface RouteCacheInput {
  originPlaceId: string | null;
  destinationPlaceId: string | null;
  mode: RouteMode;
  distanceMeters: number | null;
  durationSeconds: number | null;
  provider: string;
  rawJson?: JsonObject | null;
  fetchedAt?: string;
  expiresAt?: string | null;
}

export interface FactStore {
  upsertPlace(input: PlaceUpsertInput): Promise<{ id: string }>;
  upsertPlaceExternalId(input: PlaceExternalIdInput): Promise<void>;
  upsertPlaceFact(input: PlaceFactInput): Promise<void>;
  upsertEventRecord(input: EventRecordInput): Promise<void>;
  insertWeatherSnapshot(input: WeatherSnapshotInput): Promise<void>;
  upsertRouteCache(input: RouteCacheInput): Promise<void>;
}

export class DryRunFactStore implements FactStore {
  async upsertPlace(input: PlaceUpsertInput): Promise<{ id: string }> {
    return { id: `${input.sourceProvider}:${input.sourceExternalId}` };
  }

  async upsertPlaceExternalId(): Promise<void> {
    return;
  }

  async upsertPlaceFact(): Promise<void> {
    return;
  }

  async upsertEventRecord(): Promise<void> {
    return;
  }

  async insertWeatherSnapshot(): Promise<void> {
    return;
  }

  async upsertRouteCache(): Promise<void> {
    return;
  }
}

export function buildPlaceFactDedupeKey(input: {
  placeId: string;
  factType: string;
  sourceProvider: string;
  sourceExternalId?: string | null;
  language?: string | null;
}): string {
  return [
    input.placeId,
    input.factType,
    input.sourceProvider,
    input.sourceExternalId ?? "",
    input.language ?? "",
  ].join("|");
}

export class SupabaseFactStore implements FactStore {
  private readonly client: SupabaseWriteClientLike;

  constructor(client: SupabaseWriteClientLike) {
    this.client = client;
  }

  async upsertPlace(input: PlaceUpsertInput): Promise<{ id: string }> {
    const payload = {
        name: input.name,
        name_en: input.nameEn ?? null,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
        address: input.address ?? null,
        category: input.category ?? null,
        tags: input.tags ?? [],
        destination_id: input.destinationId ?? null,
        region_id: input.regionId ?? null,
        source_provider: input.sourceProvider,
        source_external_id: input.sourceExternalId,
        status: input.status ?? "active",
      };
    const existing = await this.client
      .from<{ id: string }>("places")
      .select("id")
      .eq("source_provider", input.sourceProvider)
      .eq("source_external_id", input.sourceExternalId)
      .maybeSingle();

    if (!existing.error && existing.data?.id) {
      const updated = await this.client
        .from<{ id: string }>("places")
        .update(payload)
        .eq("id", existing.data.id)
        .select("id")
        .single();
      if (updated.error || !updated.data?.id) {
        throw new Error(`UPDATE_PLACE_FAILED: ${summarizeSupabaseError(updated.error)}`);
      }
      return { id: updated.data.id };
    }

    const result = await this.client
      .from<{ id: string }>("places")
      .insert(payload)
      .select("id")
      .single();

    if (result.error || !result.data?.id) {
      throw new Error(`UPSERT_PLACE_FAILED: ${summarizeSupabaseError(result.error)}`);
    }
    return { id: result.data.id };
  }

  async upsertPlaceExternalId(input: PlaceExternalIdInput): Promise<void> {
    const result = await this.client
      .from("place_external_ids")
      .upsert({
        place_id: input.placeId,
        provider: input.provider,
        external_id: input.externalId,
        external_url: input.externalUrl ?? null,
        provider_place_type: input.providerPlaceType ?? null,
        match_method: input.matchMethod ?? "exact_provider",
        confidence: input.confidence ?? 0.7,
        verified_status: input.verifiedStatus ?? "unverified",
        last_verified_at: input.lastVerifiedAt ?? null,
        metadata: input.metadata ?? {},
      }, { onConflict: "provider,external_id", ignoreDuplicates: false })
      .select("id")
      .single();
    if (result.error) throw new Error(`UPSERT_PLACE_EXTERNAL_ID_FAILED: ${summarizeSupabaseError(result.error)}`);
  }

  async upsertPlaceFact(input: PlaceFactInput): Promise<void> {
    const result = await this.client
      .from("place_facts")
      .upsert({
        place_id: input.placeId,
        fact_type: input.factType,
        value_json: input.value,
        value_text: input.text ?? null,
        language: input.language ?? null,
        source_provider: input.sourceProvider,
        source_external_id: input.sourceExternalId ?? null,
        source_url: input.sourceUrl ?? null,
        source_name: input.sourceName ?? null,
        confidence: input.confidence ?? 0.5,
        fetched_at: input.fetchedAt ?? new Date().toISOString(),
        expires_at: input.expiresAt ?? null,
        metadata: input.metadata ?? {},
      }, {
        onConflict: "place_id,fact_type,source_provider,source_external_id,language",
        ignoreDuplicates: false,
      })
      .select("id")
      .single();
    if (result.error) throw new Error(`UPSERT_PLACE_FACT_FAILED: ${summarizeSupabaseError(result.error)}`);
  }

  async upsertEventRecord(input: EventRecordInput): Promise<void> {
    const result = await this.client
      .from("event_records")
      .upsert({
        provider: input.provider,
        external_id: input.externalId ?? null,
        title: input.title,
        starts_at: input.startsAt ?? null,
        ends_at: input.endsAt ?? null,
        destination_id: input.destinationId ?? null,
        admin_area_id: input.adminAreaId ?? null,
        place_id: input.placeId ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        source_url: input.sourceUrl ?? null,
        source_name: input.sourceName ?? null,
        metadata: input.metadata ?? {},
      }, { onConflict: "provider,external_id", ignoreDuplicates: false })
      .select("id")
      .single();
    if (result.error) throw new Error(`UPSERT_EVENT_RECORD_FAILED: ${summarizeSupabaseError(result.error)}`);
  }

  async insertWeatherSnapshot(input: WeatherSnapshotInput): Promise<void> {
    const result = await this.client.from("weather_snapshots").insert({
      provider: input.provider,
      destination_id: input.destinationId ?? null,
      admin_area_id: input.adminAreaId ?? null,
      place_id: input.placeId ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      snapshot_type: input.snapshotType,
      observed_at: input.observedAt ?? null,
      forecast_start_at: input.forecastStartAt ?? null,
      forecast_end_at: input.forecastEndAt ?? null,
      temperature_c: input.temperatureC ?? null,
      condition_text: input.conditionText ?? null,
      precipitation_probability: input.precipitationProbability ?? null,
      humidity: input.humidity ?? null,
      aqi: input.aqi ?? null,
      warning_level: input.warningLevel ?? null,
      warning_title: input.warningTitle ?? null,
      value_json: input.value,
      source_url: input.sourceUrl ?? null,
      source_name: input.sourceName ?? null,
      confidence: input.confidence ?? 0.5,
      fetched_at: input.fetchedAt ?? new Date().toISOString(),
      expires_at: input.expiresAt ?? null,
    }).select("id").single();
    if (result.error) throw new Error(`INSERT_WEATHER_SNAPSHOT_FAILED: ${summarizeSupabaseError(result.error)}`);
  }

  async upsertRouteCache(input: RouteCacheInput): Promise<void> {
    const result = await this.client.from("route_cache").upsert({
      origin_place_id: input.originPlaceId,
      destination_place_id: input.destinationPlaceId,
      mode: input.mode,
      distance_meters: input.distanceMeters,
      duration_seconds: input.durationSeconds,
      provider: input.provider,
      raw_json: input.rawJson ?? null,
      fetched_at: input.fetchedAt ?? new Date().toISOString(),
      expires_at: input.expiresAt ?? null,
    }, { onConflict: "origin_place_id,destination_place_id,mode", ignoreDuplicates: false }).select("id").single();
    if (result.error) throw new Error(`UPSERT_ROUTE_CACHE_FAILED: ${summarizeSupabaseError(result.error)}`);
  }
}
