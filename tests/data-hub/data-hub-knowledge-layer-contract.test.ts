import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type {
  DataSourceSummary,
  EventRecord,
  MissingFieldNotice,
  NormalizedEvent,
  NormalizedPlaceExternalId,
  NormalizedPlaceFact,
  NormalizedTrafficSnapshot,
  NormalizedWeatherSnapshot,
  PlaceExternalIdRecord,
  PlaceFactRecord,
  ProviderIngestSummary,
  ProviderRecordStagingRecord,
  TrafficSnapshotRecord,
  WeatherSnapshotRecord,
} from "../../src/server/data-hub/types";

const migrationPath = path.resolve(process.cwd(), "supabase", "migrations", "010_data_hub_knowledge_layer.sql");
const migrationSql = readFileSync(migrationPath, "utf8");
const constraintsMigrationPath = path.resolve(process.cwd(), "supabase", "migrations", "011_data_hub_knowledge_layer_constraints.sql");
const constraintsMigrationSql = readFileSync(constraintsMigrationPath, "utf8");

function expectNoRawSnapshot(value: unknown) {
  expect(JSON.stringify(value)).not.toContain("raw_snapshot");
}

describe("data hub knowledge layer TypeScript contracts", () => {
  const source: DataSourceSummary = {
    provider: "wikimedia",
    fieldName: "intro",
    sourceUrl: "https://example.test/source",
    externalId: "Q123",
    confidence: 0.82,
    fetchedAt: "2026-10-05T00:00:00.000Z",
    expiresAt: "2026-11-05T00:00:00.000Z",
    lastVerifiedAt: "2026-10-05T00:00:00.000Z",
  };
  const missing: MissingFieldNotice = {
    fieldName: "opening_hours",
    reason: "not_returned",
    severity: "warning",
    message: "开放时间暂缺。",
    provider: "wikimedia",
  };

  it("provider staging record may contain raw_snapshot, but normalized DTOs never expose it", () => {
    const staging: ProviderRecordStagingRecord = {
      id: "staging-1",
      provider: "amap",
      external_id: "B000A",
      record_type: "place",
      source_url: null,
      source_name: "AMap",
      raw_hash: "hash-1",
      raw_snapshot: { secretShape: "raw provider payload" },
      normalized_status: "pending",
      confidence: 0.7,
      fetched_at: "2026-10-05T00:00:00.000Z",
      expires_at: null,
      ingest_run_id: null,
      created_at: "2026-10-05T00:00:00.000Z",
      updated_at: "2026-10-05T00:00:00.000Z",
    };
    const fact: NormalizedPlaceFact = {
      id: "fact-1",
      placeId: "place-1",
      factType: "intro",
      value: { text: "简介。" },
      text: "简介。",
      language: "zh-CN",
      source,
      confidence: 0.82,
      verificationStatus: "verified",
      fetchedAt: "2026-10-05T00:00:00.000Z",
      lastVerifiedAt: "2026-10-05T00:00:00.000Z",
      expiresAt: "2026-11-05T00:00:00.000Z",
      missingFields: [],
      metadata: {},
    };

    expect(JSON.stringify(staging)).toContain("raw_snapshot");
    expectNoRawSnapshot(fact);
  });

  it("place fact records and DTOs carry source, confidence, freshness, and verification status", () => {
    const record: PlaceFactRecord = {
      id: "fact-record-1",
      place_id: "place-1",
      fact_type: "opening_hours",
      value_json: { weeklyText: ["09:00-18:00"] },
      value_text: "09:00-18:00",
      language: "zh-CN",
      source_provider: "google_places",
      source_external_id: "place-ext-1",
      source_url: "https://example.test/place",
      source_name: "Google Places",
      confidence: 0.76,
      verification_status: "unverified",
      fetched_at: "2026-10-05T00:00:00.000Z",
      last_verified_at: null,
      expires_at: "2026-10-12T00:00:00.000Z",
      metadata: {},
      created_at: "2026-10-05T00:00:00.000Z",
      updated_at: "2026-10-05T00:00:00.000Z",
    };
    const normalized: NormalizedPlaceFact = {
      id: record.id,
      placeId: record.place_id,
      factType: record.fact_type,
      value: record.value_json,
      text: record.value_text,
      language: record.language,
      source: {
        provider: record.source_provider,
        fieldName: record.fact_type,
        sourceUrl: record.source_url,
        externalId: record.source_external_id,
        confidence: record.confidence,
        fetchedAt: record.fetched_at,
        expiresAt: record.expires_at,
        lastVerifiedAt: record.last_verified_at,
      },
      confidence: record.confidence,
      verificationStatus: record.verification_status,
      fetchedAt: record.fetched_at,
      lastVerifiedAt: record.last_verified_at,
      expiresAt: record.expires_at,
      missingFields: [missing],
      metadata: record.metadata,
    };

    expect(normalized.source.provider).toBe("google_places");
    expect(normalized.confidence).toBeGreaterThan(0);
    expect(normalized.fetchedAt).toBeTruthy();
    expect(normalized.expiresAt).toBeTruthy();
    expect(normalized.verificationStatus).toBe("unverified");
    expect(normalized.missingFields[0]?.fieldName).toBe("opening_hours");
    expectNoRawSnapshot(normalized);
  });

  it("event, weather, and traffic DTOs support source evidence and temporal fields", () => {
    const eventRecord: EventRecord = {
      id: "event-1",
      provider: "lcsd",
      external_id: "event-ext-1",
      title: "城市展览",
      description: "展览简介。",
      event_type: "exhibition",
      destination_id: "destination-1",
      admin_area_id: null,
      place_id: "place-1",
      venue_name: "展览馆",
      address: "城市中心",
      latitude: 22.3,
      longitude: 114.2,
      starts_at: "2026-10-06T01:00:00.000Z",
      ends_at: "2026-10-06T09:00:00.000Z",
      timezone: "Asia/Hong_Kong",
      ticket_url: null,
      official_url: "https://example.test/event",
      image_url: null,
      price_text: null,
      source_url: "https://example.test/event",
      source_name: "LCSD",
      confidence: 0.8,
      fetched_at: "2026-10-05T00:00:00.000Z",
      expires_at: "2026-10-07T00:00:00.000Z",
      metadata: {},
      created_at: "2026-10-05T00:00:00.000Z",
      updated_at: "2026-10-05T00:00:00.000Z",
    };
    const event: NormalizedEvent = {
      id: eventRecord.id,
      provider: eventRecord.provider,
      externalId: eventRecord.external_id,
      title: eventRecord.title,
      description: eventRecord.description,
      eventType: eventRecord.event_type,
      destinationId: eventRecord.destination_id,
      adminAreaId: eventRecord.admin_area_id,
      placeId: eventRecord.place_id,
      place: { id: "place-1", name: "展览馆" },
      venueName: eventRecord.venue_name,
      address: eventRecord.address,
      lat: eventRecord.latitude,
      lng: eventRecord.longitude,
      startsAt: eventRecord.starts_at,
      endsAt: eventRecord.ends_at,
      timezone: eventRecord.timezone,
      ticketUrl: eventRecord.ticket_url,
      officialUrl: eventRecord.official_url,
      imageUrl: eventRecord.image_url,
      priceText: eventRecord.price_text,
      source,
      confidence: eventRecord.confidence,
      fetchedAt: eventRecord.fetched_at,
      expiresAt: eventRecord.expires_at,
      missingFields: [],
    };
    const weatherRecord: WeatherSnapshotRecord = {
      id: "weather-1",
      provider: "qweather",
      destination_id: "destination-1",
      admin_area_id: null,
      place_id: null,
      latitude: 22.3,
      longitude: 114.2,
      snapshot_type: "warning",
      observed_at: null,
      forecast_start_at: "2026-10-06T00:00:00.000Z",
      forecast_end_at: "2026-10-07T00:00:00.000Z",
      temperature_c: null,
      feels_like_c: null,
      condition_text: null,
      precipitation_probability: null,
      wind_text: null,
      humidity: null,
      aqi: null,
      uv_index: null,
      warning_level: "yellow",
      warning_title: "大雨提示",
      value_json: { warning: "大雨" },
      source_url: "https://example.test/weather",
      source_name: "QWeather",
      confidence: 0.9,
      fetched_at: "2026-10-05T00:00:00.000Z",
      expires_at: "2026-10-06T00:00:00.000Z",
      metadata: {},
      created_at: "2026-10-05T00:00:00.000Z",
    };
    const weather: NormalizedWeatherSnapshot = {
      id: weatherRecord.id,
      provider: weatherRecord.provider,
      destinationId: weatherRecord.destination_id,
      adminAreaId: weatherRecord.admin_area_id,
      placeId: weatherRecord.place_id,
      lat: weatherRecord.latitude,
      lng: weatherRecord.longitude,
      snapshotType: weatherRecord.snapshot_type,
      observedAt: weatherRecord.observed_at,
      forecastStartAt: weatherRecord.forecast_start_at,
      forecastEndAt: weatherRecord.forecast_end_at,
      temperatureC: weatherRecord.temperature_c,
      feelsLikeC: weatherRecord.feels_like_c,
      conditionText: weatherRecord.condition_text,
      precipitationProbability: weatherRecord.precipitation_probability,
      windText: weatherRecord.wind_text,
      humidity: weatherRecord.humidity,
      airQuality: { aqi: weatherRecord.aqi },
      uv: { index: weatherRecord.uv_index },
      warning: { level: weatherRecord.warning_level, title: weatherRecord.warning_title },
      value: weatherRecord.value_json,
      source,
      confidence: weatherRecord.confidence,
      fetchedAt: weatherRecord.fetched_at,
      expiresAt: weatherRecord.expires_at,
      missingFields: [],
    };
    const trafficRecord: TrafficSnapshotRecord = {
      id: "traffic-1",
      provider: "amap",
      destination_id: "destination-1",
      admin_area_id: null,
      place_id: null,
      route_cache_id: "route-1",
      latitude: null,
      longitude: null,
      traffic_type: "driving",
      status: "moderate",
      summary: "主干道略慢。",
      delay_minutes: 8,
      value_json: { status: "moderate" },
      source_url: null,
      source_name: "AMap",
      confidence: 0.7,
      observed_at: "2026-10-05T08:00:00.000Z",
      fetched_at: "2026-10-05T08:01:00.000Z",
      expires_at: "2026-10-05T08:16:00.000Z",
      metadata: {},
      created_at: "2026-10-05T08:01:00.000Z",
    };
    const traffic: NormalizedTrafficSnapshot = {
      id: trafficRecord.id,
      provider: trafficRecord.provider,
      destinationId: trafficRecord.destination_id,
      adminAreaId: trafficRecord.admin_area_id,
      placeId: trafficRecord.place_id,
      routeCacheId: trafficRecord.route_cache_id,
      lat: trafficRecord.latitude,
      lng: trafficRecord.longitude,
      trafficType: trafficRecord.traffic_type,
      status: trafficRecord.status,
      summary: trafficRecord.summary,
      delayMinutes: trafficRecord.delay_minutes,
      value: trafficRecord.value_json,
      source,
      confidence: trafficRecord.confidence,
      observedAt: trafficRecord.observed_at,
      fetchedAt: trafficRecord.fetched_at,
      expiresAt: trafficRecord.expires_at,
      missingFields: [],
    };

    expect(event.place?.id).toBe("place-1");
    expect(event.destinationId).toBe("destination-1");
    expect(weather.warning?.level).toBe("yellow");
    expect(weather.airQuality?.aqi).toBeNull();
    expect(traffic.status).toBe("moderate");
    expect(traffic.delayMinutes).toBe(8);
    expectNoRawSnapshot([event, weather, traffic]);
  });

  it("provider ingest summary and place external IDs support cross-provider mapping without raw payloads", () => {
    const summary: ProviderIngestSummary = {
      id: "run-1",
      provider: "wikidata",
      runType: "enrich",
      targetType: "place",
      targetId: "place-1",
      status: "success",
      startedAt: "2026-10-05T00:00:00.000Z",
      finishedAt: "2026-10-05T00:01:00.000Z",
      recordsSeen: 3,
      recordsInserted: 1,
      recordsUpdated: 1,
      recordsSkipped: 1,
      errorCode: null,
      errorMessage: null,
      createdAt: "2026-10-05T00:00:00.000Z",
    };
    const record: PlaceExternalIdRecord = {
      id: "external-id-1",
      place_id: "place-1",
      provider: "wikidata",
      external_id: "Q8686",
      external_url: "https://www.wikidata.org/wiki/Q8686",
      provider_place_type: "wikidata_qid",
      match_method: "wikidata_qid",
      confidence: 0.96,
      verified_status: "verified",
      last_verified_at: "2026-10-05T00:00:00.000Z",
      metadata: {},
      created_at: "2026-10-05T00:00:00.000Z",
      updated_at: "2026-10-05T00:00:00.000Z",
    };
    const normalized: NormalizedPlaceExternalId = {
      id: record.id,
      placeId: record.place_id,
      provider: record.provider,
      externalId: record.external_id,
      externalUrl: record.external_url,
      providerPlaceType: record.provider_place_type,
      matchMethod: record.match_method,
      confidence: record.confidence,
      verifiedStatus: record.verified_status,
      lastVerifiedAt: record.last_verified_at,
      metadata: record.metadata,
    };

    expect(summary.recordsSeen).toBe(3);
    expect(normalized.provider).toBe("wikidata");
    expect(normalized.externalId).toBe("Q8686");
    expect(normalized.matchMethod).toBe("wikidata_qid");
    expect(normalized.verifiedStatus).toBe("verified");
    expectNoRawSnapshot([summary, normalized]);
  });
});

describe("data hub knowledge layer migration", () => {
  it("creates all Step1 knowledge layer tables", () => {
    for (const tableName of [
      "provider_ingest_runs",
      "provider_records_staging",
      "place_external_ids",
      "place_facts",
      "event_records",
      "weather_snapshots",
      "traffic_snapshots",
    ]) {
      expect(migrationSql).toMatch(new RegExp(`create table if not exists public\\.${tableName}`, "i"));
      expect(migrationSql).toMatch(new RegExp(`alter table public\\.${tableName} enable row level security`, "i"));
    }
  });

  it("keeps raw staging and ingest runs server-only while exposing product-ready normalized read tables", () => {
    expect(migrationSql).not.toMatch(/provider_records_staging_select_public/i);
    expect(migrationSql).not.toMatch(/provider_ingest_runs_select_public/i);
    expect(constraintsMigrationSql).toMatch(/drop policy if exists "place_external_ids_select_public"/i);
    expect(migrationSql).toMatch(/place_facts_select_public/i);
    expect(migrationSql).toMatch(/event_records_select_public/i);
    expect(migrationSql).toMatch(/weather_snapshots_select_public/i);
    expect(migrationSql).not.toMatch(/traffic_snapshots_select_public/i);
    expect(migrationSql).not.toMatch(/for insert\s+to anon/i);
    expect(migrationSql).not.toMatch(/for update\s+to anon/i);
    expect(migrationSql).not.toMatch(/for delete\s+to anon/i);
  });

  it("adds required constraints, indexes, and freshness fields", () => {
    expect(migrationSql).toMatch(/provider_records_staging_provider_type_external_id_idx/i);
    expect(migrationSql).toMatch(/provider_records_staging_provider_type_raw_hash_idx/i);
    expect(migrationSql).toMatch(/unique index if not exists place_external_ids_provider_external_id_idx/i);
    expect(migrationSql).toMatch(/fact_type text not null/i);
    expect(migrationSql).toMatch(/verification_status text not null default 'unverified'/i);
    expect(migrationSql).toMatch(/confidence numeric not null default 0\.5/i);
    expect(migrationSql).toMatch(/expires_at timestamptz/i);
    expect(migrationSql).toMatch(/last_verified_at timestamptz/i);
    expect(migrationSql).toMatch(/event_records_provider_external_id_idx/i);
    expect(migrationSql).toMatch(/weather_snapshots_snapshot_type_idx/i);
    expect(migrationSql).toMatch(/traffic_snapshots_route_cache_id_idx/i);
  });

  it("adds Step1.1 dedupe, coordinate, and freshness constraints", () => {
    expect(constraintsMigrationSql).toMatch(/event_records_provider_external_id_unique_idx/i);
    expect(constraintsMigrationSql).toMatch(/place_facts_dedupe_idx/i);
    expect(constraintsMigrationSql).toMatch(/coalesce\(source_external_id, ''\)/i);
    expect(constraintsMigrationSql).toMatch(/coalesce\(language, ''\)/i);
    expect(constraintsMigrationSql).toMatch(/event_records_latitude_range_check/i);
    expect(constraintsMigrationSql).toMatch(/weather_snapshots_forecast_time_order_check/i);
    expect(constraintsMigrationSql).toMatch(/traffic_snapshots_expires_after_fetched_check/i);
    expect(constraintsMigrationSql).toMatch(/provider_ingest_runs_time_order_check/i);
    expect(constraintsMigrationSql).toMatch(/provider_records_staging_expires_after_fetched_check/i);
    expect(constraintsMigrationSql).toMatch(/place_facts_expires_after_fetched_check/i);
  });
});
