import { redactSensitiveText, result, stableHash, warning } from "./ingestLogger.ts";
import type { FactStore, PlaceUpsertInput } from "./factStore.ts";
import { DryRunFactStore } from "./factStore.ts";
import type { IngestRunStore } from "./ingestRunStore.ts";
import { DryRunIngestRunStore } from "./ingestRunStore.ts";
import type { StagingStore } from "./stagingStore.ts";
import { DryRunStagingStore } from "./stagingStore.ts";
import type {
  NormalizedProviderRecord,
  ProviderIngestInput,
  ProviderIngestMode,
  ProviderIngestResult,
  ProviderIngestTarget,
} from "./ingestTypes.ts";
import type { JsonObject, ProviderRecordType, RouteMode } from "../types.ts";

export type SampleIngestName = "v2-core";

export interface SampleIngestTask {
  provider: string;
  targetType: ProviderIngestTarget;
  query?: string;
  routeMode?: RouteMode;
}

export interface SampleIngestStoreBundle {
  ingestRuns?: IngestRunStore;
  staging?: StagingStore;
  facts?: FactStore;
}

export interface SampleIngestSummary {
  sample: SampleIngestName | "single";
  mode: ProviderIngestMode;
  results: ProviderIngestResult[];
  totals: {
    recordsSeen: number;
    recordsStaged: number;
    recordsNormalized: number;
    recordsSkipped: number;
    success: number;
    partial: number;
    failed: number;
    skipped: number;
  };
  normalizedWrites: {
    places: number;
    providerRecordsStaging: number;
    placeExternalIds: number;
    placeFacts: number;
    weatherSnapshots: number;
    routeCache: number;
  };
  failedBreakdown: SampleIngestFailureBreakdown[];
}

export interface SampleIngestFailureBreakdown {
  provider: string;
  target: ProviderIngestTarget;
  query: string | null;
  sampleId: string;
  failureStage: "create_ingest_run" | "stage_provider_record" | "write_normalized" | "provider_fetch" | "unsupported_sample" | "unknown";
  errorCode: string;
  reason: string;
  blockingV205DataHub: boolean;
}

const MAX_SAMPLE_LIMIT = 5;
const SAMPLE_PLACES = [
  {
    name: "深圳湾公园",
    externalId: "amap:shenzhen-bay-park",
    lat: 22.5096,
    lng: 113.9442,
    address: "深圳市南山区滨海大道",
    category: "park",
    tags: ["海边", "公园", "城市漫步"],
  },
  {
    name: "世界之窗",
    externalId: "amap:window-of-the-world-shenzhen",
    lat: 22.5331,
    lng: 113.9736,
    address: "深圳市南山区深南大道9037号",
    category: "theme_park",
    tags: ["主题公园", "亲子", "地标"],
  },
  {
    name: "福田站",
    externalId: "amap:futian-station",
    lat: 22.539,
    lng: 114.0579,
    address: "深圳市福田区益田路",
    category: "transport",
    tags: ["交通", "高铁站"],
  },
] as const;

const WIKI_PLACES = SAMPLE_PLACES.slice(0, 2);

function isoPlus(date: Date, milliseconds: number): string {
  return new Date(date.getTime() + milliseconds).toISOString();
}

function makeRecord(input: {
  provider: string;
  externalId?: string;
  recordType: ProviderRecordType;
  sourceName: string;
  normalized: JsonObject;
}): NormalizedProviderRecord {
  return {
    provider: input.provider,
    externalId: input.externalId,
    recordType: input.recordType,
    sourceUrl: null,
    sourceName: input.sourceName,
    rawHash: stableHash({ provider: input.provider, externalId: input.externalId ?? null, normalized: input.normalized }),
    rawSnapshotRedacted: {
      redacted: true,
      sample: true,
      reason: "Step3 sample ingest stores redacted provider-shaped snapshots only",
    },
    normalized: input.normalized,
  };
}

function placeForQuery(query: string | undefined) {
  if (!query) return SAMPLE_PLACES;
  return SAMPLE_PLACES.filter((place) => place.name === query);
}

function normalizeLimit(limit: number | undefined): number {
  if (!Number.isFinite(limit)) return MAX_SAMPLE_LIMIT;
  return Math.max(1, Math.min(Math.trunc(limit ?? MAX_SAMPLE_LIMIT), MAX_SAMPLE_LIMIT));
}

function sampleIdForTask(task: SampleIngestTask): string {
  return [
    task.provider,
    task.targetType,
    task.query ?? task.routeMode ?? "all",
  ].join(":");
}

function classifyFailureStage(message: string): SampleIngestFailureBreakdown["failureStage"] {
  if (message.startsWith("CREATE_INGEST_RUN_FAILED")) return "create_ingest_run";
  if (message.startsWith("STAGE_PROVIDER_RECORD_FAILED")) return "stage_provider_record";
  if (message.includes("UPSERT_") || message.includes("INSERT_") || message.includes("UPDATE_")) return "write_normalized";
  if (message.includes("missing_config") || message.includes("Provider") || message.includes("fetch")) return "provider_fetch";
  return "unknown";
}

function humanReasonForFailure(message: string): string {
  if (message.includes("23505") && message.includes("provider_records_staging")) {
    return "provider_records_staging 已有相同 provider / record_type / external_id，小样本重跑需要幂等 upsert。";
  }
  if (message.includes("23514") && message.includes("provider_ingest_runs_target_type_check")) {
    return "provider_ingest_runs.target_type 不接受当前 sample target，需要映射到数据库允许的目标类型。";
  }
  if (message.includes("42501") || message.includes("permission denied")) {
    return "Supabase role 对目标表权限不足，需要检查 grants / RLS。";
  }
  if (message.includes("missing_config")) {
    return "Provider 配置缺失，本轮样本可跳过。";
  }
  if (message.includes("sample_not_allowed")) {
    return "该 provider / query 不在 Step3 小样本白名单内。";
  }
  return redactSensitiveText(message);
}

function isBlockingFailure(message: string): boolean {
  if (message.includes("missing_config") || message.includes("sample_not_allowed")) return false;
  if (message.includes("unsupported") || message.includes("external api unavailable")) return false;
  return true;
}

function buildFailureBreakdown(task: SampleIngestTask, taskResult: ProviderIngestResult): SampleIngestFailureBreakdown | null {
  if (taskResult.status !== "failed") return null;
  const firstError = taskResult.errors[0];
  const message = firstError?.message ?? "未知失败。";
  return {
    provider: task.provider,
    target: task.targetType,
    query: task.query ?? null,
    sampleId: sampleIdForTask(task),
    failureStage: classifyFailureStage(message),
    errorCode: firstError?.code ?? "unknown",
    reason: humanReasonForFailure(message),
    blockingV205DataHub: isBlockingFailure(message),
  };
}

export function createV2CoreSampleTasks(): SampleIngestTask[] {
  return [
    ...SAMPLE_PLACES.map((place) => ({ provider: "amap", targetType: "place" as const, query: place.name })),
    ...WIKI_PLACES.flatMap((place) => [
      { provider: "wikipedia", targetType: "place_detail" as const, query: place.name },
      { provider: "wikidata", targetType: "place_detail" as const, query: place.name },
      { provider: "wikimedia_commons", targetType: "image" as const, query: place.name },
    ]),
    { provider: "qweather", targetType: "weather", query: "深圳" },
    { provider: "graphhopper", targetType: "route", query: "深圳湾公园 -> 世界之窗", routeMode: "walking" },
  ];
}

export function buildSampleRecords(task: SampleIngestTask, fetchedAt = new Date()): NormalizedProviderRecord[] {
  const fetchedAtIso = fetchedAt.toISOString();
  const placeExpiresAt = isoPlus(fetchedAt, 1000 * 60 * 60 * 24 * 30);
  const longExpiresAt = isoPlus(fetchedAt, 1000 * 60 * 60 * 24 * 180);

  if (task.provider === "amap" && task.targetType === "place") {
    return placeForQuery(task.query).map((place) =>
      makeRecord({
        provider: "amap",
        externalId: place.externalId,
        recordType: "place",
        sourceName: "AMap Web Service",
        normalized: {
          place: {
            name: place.name,
            externalId: place.externalId,
            lat: place.lat,
            lng: place.lng,
            address: place.address,
            category: place.category,
            tags: [...place.tags],
            sourceProvider: "amap",
            sourceExternalId: place.externalId,
            fetchedAt: fetchedAtIso,
            expiresAt: placeExpiresAt,
          },
          externalIds: [
            {
              provider: "amap",
              externalId: place.externalId,
              providerPlaceType: place.category,
              matchMethod: "exact_provider",
              confidence: 0.78,
              verifiedStatus: "unverified",
            },
          ],
          facts: [
            {
              factType: "address",
              value: { address: place.address },
              text: place.address,
              sourceProvider: "amap",
              sourceExternalId: place.externalId,
              sourceName: "AMap Web Service",
              confidence: 0.78,
              verificationStatus: "unverified",
              fetchedAt: fetchedAtIso,
              expiresAt: placeExpiresAt,
            },
            {
              factType: "tags",
              value: { category: place.category, tags: [...place.tags] },
              text: place.tags.join(", "),
              sourceProvider: "amap",
              sourceExternalId: place.externalId,
              sourceName: "AMap Web Service",
              confidence: 0.72,
              verificationStatus: "unverified",
              fetchedAt: fetchedAtIso,
              expiresAt: placeExpiresAt,
            },
            {
              factType: "coordinate",
              value: { lat: place.lat, lng: place.lng },
              text: `${place.lat},${place.lng}`,
              sourceProvider: "amap",
              sourceExternalId: place.externalId,
              sourceName: "AMap Web Service",
              confidence: 0.78,
              verificationStatus: "unverified",
              fetchedAt: fetchedAtIso,
              expiresAt: placeExpiresAt,
            },
            {
              factType: "category",
              value: { category: place.category },
              text: place.category,
              sourceProvider: "amap",
              sourceExternalId: place.externalId,
              sourceName: "AMap Web Service",
              confidence: 0.72,
              verificationStatus: "unverified",
              fetchedAt: fetchedAtIso,
              expiresAt: placeExpiresAt,
            },
          ],
        },
      }),
    );
  }

  if (task.provider === "wikipedia") {
    return WIKI_PLACES.filter((place) => !task.query || place.name === task.query).map((place) =>
      makeRecord({
        provider: "wikipedia",
        externalId: `wikipedia:${place.name}`,
        recordType: "place_detail",
        sourceName: "Wikipedia",
        normalized: {
          targetPlaceExternalId: place.externalId,
          facts: [
            {
              factType: "intro",
              value: { text: `${place.name} 的百科简介小样本，后续真实 Provider 返回后覆盖。` },
              text: `${place.name} 的百科简介小样本，后续真实 Provider 返回后覆盖。`,
              language: "zh-CN",
              sourceProvider: "wikipedia",
              sourceExternalId: `wikipedia:${place.name}`,
              sourceName: "Wikipedia",
              sourceUrl: null,
              confidence: 0.55,
              verificationStatus: "unverified",
              fetchedAt: fetchedAtIso,
              expiresAt: longExpiresAt,
            },
          ],
        },
      }),
    );
  }

  if (task.provider === "wikidata") {
    return WIKI_PLACES.filter((place) => !task.query || place.name === task.query).map((place) =>
      makeRecord({
        provider: "wikidata",
        externalId: `wikidata:${place.name}`,
        recordType: "place_detail",
        sourceName: "Wikidata SPARQL",
        normalized: {
          targetPlaceExternalId: place.externalId,
          externalIds: [
            {
              provider: "wikidata",
              externalId: `wikidata:${place.name}`,
              externalUrl: null,
              providerPlaceType: "wikidata_qid",
              matchMethod: "wikidata_qid",
              confidence: 0.55,
              verifiedStatus: "unverified",
            },
          ],
        },
      }),
    );
  }

  if (task.provider === "wikimedia_commons") {
    return WIKI_PLACES.filter((place) => !task.query || place.name === task.query).map((place) =>
      makeRecord({
        provider: "wikimedia_commons",
        externalId: `commons:${place.name}`,
        recordType: "image",
        sourceName: "Wikimedia Commons",
        normalized: {
          targetPlaceExternalId: place.externalId,
          facts: [
            {
              factType: "image",
              value: {
                image_url: null,
                source_url: null,
                license: "license-required-from-provider",
                author: "author-required-from-provider",
                attribution: "attribution-required-before-public-display",
                provider: "wikimedia_commons",
              },
              text: null,
              sourceProvider: "wikimedia_commons",
              sourceExternalId: `commons:${place.name}`,
              sourceName: "Wikimedia Commons",
              sourceUrl: null,
              confidence: 0.45,
              verificationStatus: "unverified",
              fetchedAt: fetchedAtIso,
              expiresAt: longExpiresAt,
            },
          ],
        },
      }),
    );
  }

  if (task.provider === "qweather") {
    const expiresAt = isoPlus(fetchedAt, 1000 * 60 * 60 * 3);
    return [
      makeRecord({
        provider: "qweather",
        externalId: "qweather:shenzhen",
        recordType: "weather",
        sourceName: "QWeather",
        normalized: {
          weatherSnapshots: [
            {
              provider: "qweather",
              snapshotType: "forecast",
              latitude: 22.5431,
              longitude: 114.0579,
              forecastStartAt: fetchedAtIso,
              forecastEndAt: isoPlus(fetchedAt, 1000 * 60 * 60 * 24),
              temperatureC: null,
              conditionText: "sample-weather",
              precipitationProbability: null,
              humidity: null,
              aqi: null,
              warningLevel: null,
              warningTitle: null,
              value: { query: task.query ?? "深圳", sample: true },
              confidence: 0.55,
              fetchedAt: fetchedAtIso,
              expiresAt,
            },
          ],
        },
      }),
    ];
  }

  if ((task.provider === "graphhopper" || task.provider === "openrouteservice") && task.targetType === "route") {
    const expiresAt = isoPlus(fetchedAt, 1000 * 60 * 60 * 24 * 14);
    return [
      makeRecord({
        provider: task.provider,
        externalId: `${task.provider}:shenzhen-bay-park-window-of-the-world`,
        recordType: "route",
        sourceName: task.provider === "graphhopper" ? "GraphHopper" : "OpenRouteService",
        normalized: {
          routeCache: {
            originExternalId: "amap:shenzhen-bay-park",
            destinationExternalId: "amap:window-of-the-world-shenzhen",
            mode: task.routeMode ?? "walking",
            distanceMeters: 4200,
            durationSeconds: 3600,
            provider: task.provider,
            confidence: 0.55,
            fetchedAt: fetchedAtIso,
            expiresAt,
          },
        },
      }),
    ];
  }

  return [];
}

async function stageRecords(records: NormalizedProviderRecord[], staging: StagingStore, ingestRunId: string | null) {
  for (const record of records) {
    await staging.stageProviderRecord(record, {
      ingestRunId,
      confidence: 0.55,
      fetchedAt: new Date().toISOString(),
    });
  }
}

async function finishIngestRunSafely(ingestRuns: IngestRunStore, ingestRunId: string | null, taskResult: ProviderIngestResult) {
  try {
    await ingestRuns.finishIngestRun(ingestRunId, taskResult);
  } catch {
    // Keep the original provider result stable; finish-run failures are visible
    // through the ingest run store and should not mask the provider write result.
  }
}

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

function estimateNormalizedWrites(records: NormalizedProviderRecord[]) {
  return records.reduce<SampleIngestSummary["normalizedWrites"]>((acc, record) => {
    const normalized = record.normalized;
    if (normalized.place) acc.places += 1;
    if (Array.isArray(normalized.externalIds)) acc.placeExternalIds += normalized.externalIds.length;
    if (Array.isArray(normalized.facts)) acc.placeFacts += normalized.facts.length;
    if (Array.isArray(normalized.weatherSnapshots)) acc.weatherSnapshots += normalized.weatherSnapshots.length;
    if (normalized.routeCache) acc.routeCache += 1;
    return acc;
  }, {
    places: 0,
    providerRecordsStaging: 0,
    placeExternalIds: 0,
    placeFacts: 0,
    weatherSnapshots: 0,
    routeCache: 0,
  });
}

async function applyNormalizedRecord(record: NormalizedProviderRecord, facts: FactStore, placeIdByExternalId: Map<string, string>) {
  const normalized = record.normalized;
  const place = asObject(normalized.place) as Partial<PlaceUpsertInput> & { sourceExternalId?: string; sourceProvider?: string };
  let placeId: string | null = null;
  if (place.name && place.sourceProvider && place.sourceExternalId) {
    const saved = await facts.upsertPlace({
      name: String(place.name),
      nameEn: place.nameEn ? String(place.nameEn) : null,
      lat: typeof place.lat === "number" ? place.lat : null,
      lng: typeof place.lng === "number" ? place.lng : null,
      address: place.address ? String(place.address) : null,
      category: place.category ? String(place.category) : null,
      tags: Array.isArray(place.tags) ? place.tags.map(String) : [],
      sourceProvider: String(place.sourceProvider),
      sourceExternalId: String(place.sourceExternalId),
      status: "active",
    });
    placeId = saved.id;
    placeIdByExternalId.set(String(place.sourceExternalId), saved.id);
  }

  const targetExternalId = typeof normalized.targetPlaceExternalId === "string" ? normalized.targetPlaceExternalId : null;
  if (!placeId && record.externalId && placeIdByExternalId.has(record.externalId)) {
    placeId = placeIdByExternalId.get(record.externalId) ?? null;
  }
  if (!placeId && targetExternalId) {
    placeId = placeIdByExternalId.get(targetExternalId) ?? null;
  }

  const externalIds = Array.isArray(normalized.externalIds) ? normalized.externalIds : [];
  if (placeId) {
    for (const item of externalIds) {
      const externalId = asObject(item);
      if (typeof externalId.provider !== "string" || typeof externalId.externalId !== "string") continue;
      await facts.upsertPlaceExternalId({
        placeId,
        provider: externalId.provider,
        externalId: externalId.externalId,
        externalUrl: typeof externalId.externalUrl === "string" ? externalId.externalUrl : null,
        providerPlaceType: typeof externalId.providerPlaceType === "string" ? externalId.providerPlaceType : null,
        matchMethod: externalId.matchMethod === "wikidata_qid" ? "wikidata_qid" : "exact_provider",
        confidence: typeof externalId.confidence === "number" ? externalId.confidence : 0.55,
        verifiedStatus: "unverified",
      });
    }

    const factItems = Array.isArray(normalized.facts) ? normalized.facts : [];
    for (const item of factItems) {
      const fact = asObject(item);
      if (typeof fact.factType !== "string" || typeof fact.sourceProvider !== "string") continue;
      await facts.upsertPlaceFact({
        placeId,
        factType: fact.factType,
        value: fact.value ?? {},
        text: typeof fact.text === "string" ? fact.text : null,
        language: typeof fact.language === "string" ? fact.language : null,
        sourceProvider: fact.sourceProvider,
        sourceExternalId: typeof fact.sourceExternalId === "string" ? fact.sourceExternalId : null,
        sourceUrl: typeof fact.sourceUrl === "string" ? fact.sourceUrl : null,
        sourceName: typeof fact.sourceName === "string" ? fact.sourceName : null,
        confidence: typeof fact.confidence === "number" ? fact.confidence : 0.5,
        fetchedAt: typeof fact.fetchedAt === "string" ? fact.fetchedAt : undefined,
        expiresAt: typeof fact.expiresAt === "string" ? fact.expiresAt : null,
        metadata: {
          verificationStatus: typeof fact.verificationStatus === "string" ? fact.verificationStatus : "unverified",
          sample: true,
        },
      });
    }
  }

  const snapshots = Array.isArray(normalized.weatherSnapshots) ? normalized.weatherSnapshots : [];
  for (const item of snapshots) {
    const snapshot = asObject(item);
    if (typeof snapshot.provider !== "string" || typeof snapshot.snapshotType !== "string") continue;
    await facts.insertWeatherSnapshot({
      provider: snapshot.provider,
      snapshotType: snapshot.snapshotType,
      latitude: typeof snapshot.latitude === "number" ? snapshot.latitude : null,
      longitude: typeof snapshot.longitude === "number" ? snapshot.longitude : null,
      forecastStartAt: typeof snapshot.forecastStartAt === "string" ? snapshot.forecastStartAt : undefined,
      forecastEndAt: typeof snapshot.forecastEndAt === "string" ? snapshot.forecastEndAt : undefined,
      temperatureC: typeof snapshot.temperatureC === "number" ? snapshot.temperatureC : null,
      conditionText: typeof snapshot.conditionText === "string" ? snapshot.conditionText : null,
      precipitationProbability: typeof snapshot.precipitationProbability === "number" ? snapshot.precipitationProbability : null,
      humidity: typeof snapshot.humidity === "number" ? snapshot.humidity : null,
      aqi: typeof snapshot.aqi === "number" ? snapshot.aqi : null,
      warningLevel: typeof snapshot.warningLevel === "string" ? snapshot.warningLevel : null,
      warningTitle: typeof snapshot.warningTitle === "string" ? snapshot.warningTitle : null,
      value: asObject(snapshot.value),
      sourceName: "QWeather",
      confidence: typeof snapshot.confidence === "number" ? snapshot.confidence : 0.5,
      fetchedAt: typeof snapshot.fetchedAt === "string" ? snapshot.fetchedAt : undefined,
      expiresAt: typeof snapshot.expiresAt === "string" ? snapshot.expiresAt : null,
    });
  }

  const route = asObject(normalized.routeCache);
  if (route.provider && route.originExternalId && route.destinationExternalId) {
    await facts.upsertRouteCache({
      originPlaceId: placeIdByExternalId.get(String(route.originExternalId)) ?? null,
      destinationPlaceId: placeIdByExternalId.get(String(route.destinationExternalId)) ?? null,
      mode: route.mode === "driving" ? "driving" : "walking",
      distanceMeters: typeof route.distanceMeters === "number" ? route.distanceMeters : null,
      durationSeconds: typeof route.durationSeconds === "number" ? route.durationSeconds : null,
      provider: String(route.provider),
      rawJson: { redacted: true, sample: true },
      fetchedAt: typeof route.fetchedAt === "string" ? route.fetchedAt : undefined,
      expiresAt: typeof route.expiresAt === "string" ? route.expiresAt : null,
    });
  }
}

export async function runSampleIngestTask(
  input: ProviderIngestInput,
  stores: SampleIngestStoreBundle = {},
  placeIdByExternalId = new Map<string, string>(),
): Promise<ProviderIngestResult> {
  const mode = input.mode ?? "dry_run";
  const records = buildSampleRecords({
    provider: input.provider,
    targetType: input.targetType,
    query: input.query,
    routeMode: input.routeMode,
  }).slice(0, normalizeLimit(input.limit));

  if (!records.length) {
    return result({
      provider: input.provider,
      mode,
      status: "skipped",
      recordsSkipped: 1,
      warnings: [warning("sample_not_allowed", "该 Provider 或 query 不在 Step3 小样本白名单内。")],
    });
  }

  const ingestRuns = stores.ingestRuns ?? new DryRunIngestRunStore();
  const staging = stores.staging ?? new DryRunStagingStore();
  const facts = stores.facts ?? new DryRunFactStore();
  let ingestRunId: string | null = null;
  let stagedCount = 0;

  try {
    ingestRunId = mode === "dry_run" ? null : await ingestRuns.createIngestRun(input);
    if (mode === "write_staging" || mode === "write_normalized") {
      await stageRecords(records, staging, ingestRunId);
      stagedCount = records.length;
    }
    if (mode === "write_normalized") {
      for (const record of records) {
        await applyNormalizedRecord(record, facts, placeIdByExternalId);
      }
    }

    const taskResult = result({
      provider: input.provider,
      mode,
      status: "success",
      recordsSeen: records.length,
      recordsStaged: stagedCount,
      recordsNormalized: mode === "write_normalized" ? records.length : 0,
      sampleRecords: records,
      ingestRunId: ingestRunId ?? undefined,
      warnings: [warning("small_sample_only", "Step3 仅运行白名单小样本，不做批量抓取。")],
    });
    await finishIngestRunSafely(ingestRuns, ingestRunId, taskResult);
    return taskResult;
  } catch (err) {
    const taskResult = result({
      provider: input.provider,
      mode,
      status: "failed",
      recordsSeen: records.length,
      recordsStaged: stagedCount,
      recordsSkipped: records.length,
      errors: [
        {
          code: "sample_ingest_failed",
          message: err instanceof Error ? err.message : "小样本写入失败。",
          retryable: true,
        },
      ],
      sampleRecords: records,
      ingestRunId: ingestRunId ?? undefined,
    });
    await finishIngestRunSafely(ingestRuns, ingestRunId, taskResult);
    return taskResult;
  }
}

export async function runSampleIngest(input: {
  sample?: SampleIngestName;
  mode?: ProviderIngestMode;
  provider?: string;
  targetType?: ProviderIngestTarget;
  query?: string;
  limit?: number;
  routeMode?: RouteMode;
}, stores: SampleIngestStoreBundle = {}): Promise<SampleIngestSummary> {
  const mode = input.mode ?? "dry_run";
  const tasks = input.sample === "v2-core"
    ? createV2CoreSampleTasks()
    : [{
        provider: input.provider ?? "amap",
        targetType: input.targetType ?? "place",
        query: input.query,
        routeMode: input.routeMode,
      }];
  const placeIdByExternalId = new Map<string, string>();
  const results: ProviderIngestResult[] = [];
  const normalizedWrites: SampleIngestSummary["normalizedWrites"] = {
    places: 0,
    providerRecordsStaging: 0,
    placeExternalIds: 0,
    placeFacts: 0,
    weatherSnapshots: 0,
    routeCache: 0,
  };
  const failedBreakdown: SampleIngestFailureBreakdown[] = [];
  for (const task of tasks) {
    const taskInput = {
      provider: task.provider,
      mode,
      targetType: task.targetType,
      query: task.query,
      limit: input.limit,
      routeMode: task.routeMode ?? input.routeMode,
    };
    const taskResult = await runSampleIngestTask(taskInput, stores, placeIdByExternalId);
    results.push(taskResult);
    const failure = buildFailureBreakdown(task, taskResult);
    if (failure) failedBreakdown.push(failure);
    if (mode === "write_normalized" && taskResult.status === "success") {
      const writeEstimate = estimateNormalizedWrites(buildSampleRecords(taskInput).slice(0, normalizeLimit(input.limit)));
      normalizedWrites.places += writeEstimate.places;
      normalizedWrites.placeExternalIds += writeEstimate.placeExternalIds;
      normalizedWrites.placeFacts += writeEstimate.placeFacts;
      normalizedWrites.weatherSnapshots += writeEstimate.weatherSnapshots;
      normalizedWrites.routeCache += writeEstimate.routeCache;
    }
    if ((mode === "write_staging" || mode === "write_normalized") && taskResult.status === "success") {
      normalizedWrites.providerRecordsStaging += taskResult.recordsStaged;
    }
  }

  const totals = results.reduce<SampleIngestSummary["totals"]>((acc, item) => {
    acc.recordsSeen += item.recordsSeen;
    acc.recordsStaged += item.recordsStaged;
    acc.recordsNormalized += item.recordsNormalized;
    acc.recordsSkipped += item.recordsSkipped;
    acc[item.status] += 1;
    return acc;
  }, {
    recordsSeen: 0,
    recordsStaged: 0,
    recordsNormalized: 0,
    recordsSkipped: 0,
    success: 0,
    partial: 0,
    failed: 0,
    skipped: 0,
  });

  return {
    sample: input.sample ?? "single",
    mode,
    results,
    totals,
    normalizedWrites,
    failedBreakdown,
  };
}
