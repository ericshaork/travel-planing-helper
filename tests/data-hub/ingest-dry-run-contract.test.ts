import { describe, expect, it } from "vitest";

import { buildPlaceFactDedupeKey } from "../../src/server/data-hub/ingest/factStore";
import { runProviderIngest } from "../../src/server/data-hub/ingest/providerIngestRegistry";
import { toStagingPayload } from "../../src/server/data-hub/ingest/stagingStore";
import type { NormalizedProviderRecord, ProviderIngestEnv } from "../../src/server/data-hub/ingest/ingestTypes";

const configuredEnv: ProviderIngestEnv = {
  AMAP_API_KEY: "secret-amap-key",
  WIKIPEDIA_ZH_API_BASE: "https://zh.wikipedia.org/api/rest_v1",
  WIKIDATA_SPARQL_ENDPOINT: "https://query.wikidata.org/sparql",
  WIKIMEDIA_COMMONS_API_BASE: "https://commons.wikimedia.org/w/api.php",
  QWEATHER_API_KEY: "secret-qweather-key",
  QWEATHER_BASE_URL: "https://devapi.qweather.com",
  GRAPHHOPPER_API_KEY: "secret-graphhopper-key",
  GRAPHHOPPER_BASE_URL: "https://graphhopper.com/api/1",
};

function expectNoSecretLeak(value: unknown) {
  const text = JSON.stringify(value);
  expect(text).not.toContain("secret-amap-key");
  expect(text).not.toContain("secret-qweather-key");
  expect(text).not.toContain("secret-graphhopper-key");
  expect(text).not.toContain("rawSnapshotRedacted");
}

describe("data hub ingest dry-run contract", () => {
  it("returns redacted AMap normalized place samples without raw snapshots", async () => {
    const result = await runProviderIngest(
      {
        provider: "amap",
        mode: "dry_run",
        targetType: "place",
        query: "深圳湾公园",
        limit: 10,
      },
      configuredEnv,
    );

    expect(result.status).toBe("success");
    expect(result.dryRun).toBe(true);
    expect(result.recordsSeen).toBe(5);
    expect(result.sampleRecords).toHaveLength(5);
    expect(result.sampleRecords[0]?.provider).toBe("amap");
    expect(result.sampleRecords[0]?.recordType).toBe("place");
    expect(result.sampleRecords[0]?.normalized.place).toMatchObject({
      name: "深圳湾公园",
      source: expect.objectContaining({
        provider: "amap",
        fieldName: "poiSearch",
      }),
    });
    expectNoSecretLeak(result);
  });

  it("reports missing config without making writes", async () => {
    const result = await runProviderIngest(
      {
        provider: "qweather",
        mode: "dry_run",
        targetType: "weather",
        query: "深圳",
      },
      { QWEATHER_API_KEY: "secret-qweather-key" },
    );

    expect(result.status).toBe("skipped");
    expect(result.recordsSkipped).toBe(1);
    expect(result.warnings[0]?.code).toBe("missing_config");
    expect(result.recordsStaged).toBe(0);
    expectNoSecretLeak(result);
  });

  it("reports unsupported provider and unsupported target explicitly", async () => {
    const unsupportedProvider = await runProviderIngest(
      {
        provider: "ticketmaster",
        mode: "dry_run",
        targetType: "event",
      },
      configuredEnv,
    );
    const unsupportedTarget = await runProviderIngest(
      {
        provider: "wikipedia",
        mode: "dry_run",
        targetType: "weather",
      },
      configuredEnv,
    );

    expect(unsupportedProvider.status).toBe("failed");
    expect(unsupportedProvider.errors[0]?.code).toBe("unsupported_provider");
    expect(unsupportedTarget.status).toBe("skipped");
    expect(unsupportedTarget.warnings[0]?.code).toBe("unsupported_target");
  });

  it("returns QWeather snapshot samples with freshness fields", async () => {
    const result = await runProviderIngest(
      {
        provider: "qweather",
        mode: "dry_run",
        targetType: "weather",
        query: "深圳",
      },
      configuredEnv,
    );

    const weather = result.sampleRecords[0]?.normalized.weatherSnapshot;
    expect(result.status).toBe("success");
    expect(weather).toMatchObject({
      snapshotType: "forecast",
      weatherAlertAvailable: true,
      airQualityAvailable: true,
    });
    expect(typeof weather?.fetchedAt).toBe("string");
    expect(typeof weather?.expiresAt).toBe("string");
    expect(Date.parse(String(weather?.expiresAt))).toBeGreaterThan(Date.parse(String(weather?.fetchedAt)));
    expectNoSecretLeak(result);
  });

  it("returns GraphHopper route estimate samples with distance, duration, and source", async () => {
    const result = await runProviderIngest(
      {
        provider: "graphhopper",
        mode: "dry_run",
        targetType: "route",
        routeMode: "walking",
      },
      configuredEnv,
    );

    const route = result.sampleRecords[0]?.normalized.routeEstimate;
    expect(result.status).toBe("success");
    expect(route).toMatchObject({
      mode: "walking",
      distanceMeters: expect.any(Number),
      durationSeconds: expect.any(Number),
      source: expect.objectContaining({
        provider: "graphhopper",
        fieldName: "routeEstimate",
      }),
    });
    expectNoSecretLeak(result);
  });

  it("keeps raw snapshot only in staging payloads, not dry-run samples", () => {
    const record: NormalizedProviderRecord = {
      provider: "amap",
      externalId: "poi-1",
      recordType: "place",
      rawHash: "hash-1",
      rawSnapshotRedacted: {
        apiKey: "secret-amap-key",
        name: "深圳湾公园",
      },
      normalized: {
        place: {
          name: "深圳湾公园",
        },
      },
    };

    const payload = toStagingPayload(record, { ingestRunId: "run-1", confidence: 0.7 });
    expect(payload.raw_snapshot).toMatchObject({
      apiKey: "<redacted>",
      name: "深圳湾公园",
    });
    expect(JSON.stringify(payload)).not.toContain("secret-amap-key");
  });

  it("uses the same place_facts dedupe dimensions as the Step1.1 unique index", () => {
    expect(
      buildPlaceFactDedupeKey({
        placeId: "place-1",
        factType: "intro",
        sourceProvider: "wikipedia",
        sourceExternalId: null,
        language: "zh-CN",
      }),
    ).toBe("place-1|intro|wikipedia||zh-CN");
  });
});
