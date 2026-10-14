import { describe, expect, it } from "vitest";

import type { FactStore, PlaceExternalIdInput, PlaceFactInput, PlaceUpsertInput, RouteCacheInput, WeatherSnapshotInput } from "../../src/server/data-hub/ingest/factStore";
import { buildPlaceFactDedupeKey } from "../../src/server/data-hub/ingest/factStore";
import type { IngestRunStore } from "../../src/server/data-hub/ingest/ingestRunStore";
import { runSampleIngest } from "../../src/server/data-hub/ingest/sampleIngestService";
import type { StagingStore } from "../../src/server/data-hub/ingest/stagingStore";
import type { NormalizedProviderRecord, ProviderIngestInput, ProviderIngestResult } from "../../src/server/data-hub/ingest/ingestTypes";

class MemoryIngestRunStore implements IngestRunStore {
  created: ProviderIngestInput[] = [];
  finished: ProviderIngestResult[] = [];

  async createIngestRun(input: ProviderIngestInput): Promise<string | null> {
    this.created.push(input);
    return `run-${this.created.length}`;
  }

  async finishIngestRun(_ingestRunId: string | null, result: ProviderIngestResult): Promise<void> {
    this.finished.push(result);
  }
}

class MemoryStagingStore implements StagingStore {
  records: NormalizedProviderRecord[] = [];

  async stageProviderRecord(record: NormalizedProviderRecord): Promise<void> {
    this.records.push(record);
  }
}

class MemoryFactStore implements FactStore {
  places = new Map<string, { id: string; input: PlaceUpsertInput }>();
  externalIds = new Map<string, PlaceExternalIdInput>();
  facts = new Map<string, PlaceFactInput>();
  weather: WeatherSnapshotInput[] = [];
  routes = new Map<string, RouteCacheInput>();
  fail = false;

  async upsertPlace(input: PlaceUpsertInput): Promise<{ id: string }> {
    if (this.fail) throw new Error("forced failure");
    const id = `place-${input.sourceExternalId}`;
    this.places.set(input.sourceExternalId, { id, input });
    return { id };
  }

  async upsertPlaceExternalId(input: PlaceExternalIdInput): Promise<void> {
    this.externalIds.set(`${input.provider}:${input.externalId}`, input);
  }

  async upsertPlaceFact(input: PlaceFactInput): Promise<void> {
    this.facts.set(buildPlaceFactDedupeKey({
      placeId: input.placeId,
      factType: input.factType,
      sourceProvider: input.sourceProvider,
      sourceExternalId: input.sourceExternalId,
      language: input.language,
    }), input);
  }

  async upsertEventRecord(): Promise<void> {
    return;
  }

  async insertWeatherSnapshot(input: WeatherSnapshotInput): Promise<void> {
    this.weather.push(input);
  }

  async upsertRouteCache(input: RouteCacheInput): Promise<void> {
    this.routes.set(`${input.originPlaceId}:${input.destinationPlaceId}:${input.mode}`, input);
  }
}

function expectNoRawOrSecret(value: unknown) {
  const text = JSON.stringify(value);
  expect(text).not.toContain("raw_snapshot");
  expect(text).not.toContain("rawSnapshotRedacted");
  expect(text).not.toContain("secret");
  expect(text).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
}

describe("data hub Step3 sample ingest write contract", () => {
  it("defaults to dry_run and does not write any store", async () => {
    const runs = new MemoryIngestRunStore();
    const staging = new MemoryStagingStore();
    const facts = new MemoryFactStore();

    const summary = await runSampleIngest({
      provider: "amap",
      targetType: "place",
      query: "深圳湾公园",
      limit: 3,
    }, { ingestRuns: runs, staging, facts });

    expect(summary.mode).toBe("dry_run");
    expect(summary.totals.recordsSeen).toBe(1);
    expect(runs.created).toHaveLength(0);
    expect(staging.records).toHaveLength(0);
    expect(facts.places.size).toBe(0);
    expectNoRawOrSecret(summary);
  });

  it("write_staging writes only provider_records_staging and ingest runs", async () => {
    const runs = new MemoryIngestRunStore();
    const staging = new MemoryStagingStore();
    const facts = new MemoryFactStore();

    const summary = await runSampleIngest({
      provider: "amap",
      targetType: "place",
      query: "深圳湾公园",
      mode: "write_staging",
      limit: 3,
    }, { ingestRuns: runs, staging, facts });

    expect(summary.totals.recordsStaged).toBe(1);
    expect(summary.totals.recordsNormalized).toBe(0);
    expect(runs.created).toHaveLength(1);
    expect(runs.finished[0]?.status).toBe("success");
    expect(staging.records).toHaveLength(1);
    expect(facts.places.size).toBe(0);
    expectNoRawOrSecret(summary);
  });

  it("write_normalized stages and upserts places, external IDs, facts, weather, and route cache", async () => {
    const runs = new MemoryIngestRunStore();
    const staging = new MemoryStagingStore();
    const facts = new MemoryFactStore();

    const summary = await runSampleIngest({
      sample: "v2-core",
      mode: "write_normalized",
      limit: 5,
    }, { ingestRuns: runs, staging, facts });

    expect(summary.totals.failed).toBe(0);
    expect(summary.totals.recordsStaged).toBeGreaterThan(0);
    expect(summary.totals.recordsNormalized).toBeGreaterThan(0);
    expect(facts.places.size).toBe(3);
    expect(facts.externalIds.size).toBeGreaterThanOrEqual(3);
    expect(facts.facts.size).toBeGreaterThan(3);
    expect(facts.weather[0]?.expiresAt).toBeTruthy();
    expect([...facts.routes.values()][0]).toMatchObject({
      provider: "graphhopper",
      mode: "walking",
      distanceMeters: expect.any(Number),
      durationSeconds: expect.any(Number),
    });
    expectNoRawOrSecret(summary);
  });

  it("upsertPlaceFact follows the Step1.1 dedupe dimensions", async () => {
    const facts = new MemoryFactStore();
    await facts.upsertPlaceFact({
      placeId: "place-1",
      factType: "intro",
      value: { text: "old" },
      text: "old",
      language: "zh-CN",
      sourceProvider: "wikipedia",
      sourceExternalId: "wiki-1",
    });
    await facts.upsertPlaceFact({
      placeId: "place-1",
      factType: "intro",
      value: { text: "new" },
      text: "new",
      language: "zh-CN",
      sourceProvider: "wikipedia",
      sourceExternalId: "wiki-1",
    });

    expect(facts.facts.size).toBe(1);
    expect([...facts.facts.values()][0]?.text).toBe("new");
  });

  it("failed provider task does not crash the whole sample run", async () => {
    const facts = new MemoryFactStore();
    facts.fail = true;
    const summary = await runSampleIngest({
      provider: "amap",
      targetType: "place",
      query: "深圳湾公园",
      mode: "write_normalized",
    }, {
      ingestRuns: new MemoryIngestRunStore(),
      staging: new MemoryStagingStore(),
      facts,
    });

    expect(summary.totals.failed).toBe(1);
    expect(summary.results[0]?.errors[0]?.code).toBe("sample_ingest_failed");
    expectNoRawOrSecret(summary);
  });

  it("limit greater than 5 is clamped", async () => {
    const summary = await runSampleIngest({
      provider: "amap",
      targetType: "place",
      mode: "dry_run",
      limit: 99,
    });

    expect(summary.totals.recordsSeen).toBeLessThanOrEqual(5);
  });

  it("normalized read-facing output never returns raw provider payload", async () => {
    const summary = await runSampleIngest({
      sample: "v2-core",
      mode: "dry_run",
    });

    expectNoRawOrSecret({
      totals: summary.totals,
      results: summary.results.map((item) => ({
        provider: item.provider,
        status: item.status,
        sampleRecords: item.sampleRecords,
      })),
    });
  });
});
