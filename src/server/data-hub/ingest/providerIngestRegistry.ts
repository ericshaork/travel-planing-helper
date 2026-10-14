import {
  clampDryRunLimit,
  envHasAllValues,
  envHasValue,
  error,
  missingConfigResult,
  result,
  stableHash,
  warning,
} from "./ingestLogger.ts";
import type {
  NormalizedProviderRecord,
  ProviderIngestAdapter,
  ProviderIngestContext,
  ProviderIngestEnv,
  ProviderIngestInput,
  ProviderIngestResult,
  ProviderIngestTarget,
} from "./ingestTypes.ts";
import type { JsonObject, ProviderRecordType, RouteMode } from "../types.ts";

const AMAP_ENV = ["AMAP_API_KEY"] as const;
const WIKIPEDIA_ENV = ["WIKIPEDIA_ZH_API_BASE", "WIKIPEDIA_EN_API_BASE", "WIKIPEDIA_API_URL"] as const;
const WIKIDATA_ENV = ["WIKIDATA_SPARQL_ENDPOINT", "WIKIDATA_SPARQL_URL"] as const;
const WIKIMEDIA_ENV = ["WIKIMEDIA_COMMONS_API_BASE", "WIKIMEDIA_COMMONS_API_URL"] as const;
const QWEATHER_ENV = ["QWEATHER_API_KEY", "QWEATHER_BASE_URL"] as const;
const GRAPHHOPPER_ENV = ["GRAPHHOPPER_API_KEY", "GRAPHHOPPER_BASE_URL"] as const;
const ORS_ENV = ["OPENROUTESERVICE_API_KEY", "OPENROUTESERVICE_BASE_URL"] as const;

function isoPlus(date: Date, milliseconds: number): string {
  return new Date(date.getTime() + milliseconds).toISOString();
}

function source(provider: string, fieldName: string, fetchedAt: string, expiresAt: string | null = null): JsonObject {
  return {
    provider,
    fieldName,
    confidence: 0.6,
    fetchedAt,
    expiresAt,
    notes: "dry-run normalized sample; no external request was sent",
  };
}

function coordinatesJson(value: { lat: number; lng: number } | undefined): JsonObject | null {
  return value ? { lat: value.lat, lng: value.lng } : null;
}

function sampleRecord(input: {
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
    rawSnapshotRedacted: { redacted: true, reason: "dry-run does not expose provider raw payload" },
    normalized: input.normalized,
  };
}

function isSupported(target: ProviderIngestTarget, supportedTargets: ProviderIngestTarget[]): boolean {
  return supportedTargets.includes(target);
}

function unsupported(provider: string, mode: ProviderIngestInput["mode"], targetType: ProviderIngestTarget): ProviderIngestResult {
  return result({
    provider,
    mode,
    status: "skipped",
    recordsSkipped: 1,
    warnings: [warning("unsupported_target", `${provider} 暂不支持 ${targetType} ingest dry-run。`, "targetType")],
  });
}

abstract class DryRunOnlyAdapter implements ProviderIngestAdapter {
  abstract provider: string;
  abstract supportedTargets: ProviderIngestTarget[];
  abstract requiredEnv: readonly string[];
  protected requiredEnvMode: "any" | "all" = "any";
  abstract buildSamples(input: ProviderIngestInput, context: ProviderIngestContext): NormalizedProviderRecord[];

  async dryRun(input: ProviderIngestInput, context: ProviderIngestContext): Promise<ProviderIngestResult> {
    if (!isSupported(input.targetType, this.supportedTargets)) {
      return unsupported(this.provider, input.mode, input.targetType);
    }
    const configured =
      this.requiredEnvMode === "all"
        ? envHasAllValues(context.env, this.requiredEnv)
        : envHasValue(context.env, this.requiredEnv);
    if (!configured) {
      return missingConfigResult(this.provider, input.mode, this.requiredEnv);
    }

    const samples = this.buildSamples({ ...input, limit: clampDryRunLimit(input.limit) }, context);
    return result({
      provider: this.provider,
      mode: input.mode,
      status: "success",
      recordsSeen: samples.length,
      recordsNormalized: samples.length,
      warnings: [warning("dry_run_only", "本轮只验证配置与 normalized 输出形状，没有请求外部 Provider，也没有写库。")],
      sampleRecords: samples,
    });
  }

  async ingest(input: ProviderIngestInput, context: ProviderIngestContext): Promise<ProviderIngestResult> {
    if (input.mode === "dry_run") return this.dryRun(input, context);
    return result({
      provider: this.provider,
      mode: input.mode,
      status: "skipped",
      recordsSkipped: 1,
      warnings: [warning("write_not_enabled", "Step2 只提供写入层接口骨架；真实写入必须在后续显式启用。")],
    });
  }
}

class AMapIngestAdapter extends DryRunOnlyAdapter {
  provider = "amap";
  supportedTargets: ProviderIngestTarget[] = ["place", "place_detail", "route", "route_estimate", "admin_area", "admin_boundary"];
  requiredEnv = AMAP_ENV;
  protected requiredEnvMode = "all" as const;

  buildSamples(input: ProviderIngestInput, context: ProviderIngestContext): NormalizedProviderRecord[] {
    const now = context.now().toISOString();
    const query = input.query?.trim() || "深圳湾公园";
    if (input.targetType === "route" || input.targetType === "route_estimate") {
      return [
        sampleRecord({
          provider: this.provider,
          externalId: "amap-route-dry-run",
          recordType: "route",
          sourceName: "AMap Web Service",
          normalized: {
            routeEstimate: {
              origin: coordinatesJson(input.origin),
              destination: coordinatesJson(input.destination),
              mode: input.routeMode ?? "walking",
              distanceMeters: 2400,
              durationSeconds: 2100,
              source: source(this.provider, "routeEstimate", now, isoPlus(context.now(), 1000 * 60 * 60 * 24 * 7)),
            },
          },
        }),
      ];
    }
    if (input.targetType === "admin_area" || input.targetType === "admin_boundary") {
      return [
        sampleRecord({
          provider: this.provider,
          externalId: "440300",
          recordType: "admin_area",
          sourceName: "AMap District",
          normalized: {
            adminArea: {
              name: input.query?.trim() || "深圳市",
              adcode: "440300",
              level: "city",
              polygonAvailable: true,
              source: source(this.provider, "adminBoundary", now),
            },
          },
        }),
      ];
    }
    return Array.from({ length: clampDryRunLimit(input.limit) }, (_, index) =>
      sampleRecord({
        provider: this.provider,
        externalId: `amap-poi-dry-run-${index + 1}`,
        recordType: input.targetType === "place_detail" ? "place_detail" : "place",
        sourceName: "AMap Web Service",
        normalized: {
          place: {
            name: index === 0 ? query : `${query} 候选 ${index + 1}`,
            category: "attraction",
            address: input.region ?? null,
            lat: 22.52 + index / 100,
            lng: 113.94 + index / 100,
            source: source(this.provider, "poiSearch", now, isoPlus(context.now(), 1000 * 60 * 60 * 24 * 30)),
          },
        },
      }),
    );
  }
}

class WikipediaIngestAdapter extends DryRunOnlyAdapter {
  provider = "wikipedia";
  supportedTargets: ProviderIngestTarget[] = ["place", "place_detail"];
  requiredEnv = WIKIPEDIA_ENV;

  buildSamples(input: ProviderIngestInput, context: ProviderIngestContext): NormalizedProviderRecord[] {
    const now = context.now().toISOString();
    const title = input.query?.trim() || "深圳湾公园";
    return [
      sampleRecord({
        provider: this.provider,
        externalId: `wikipedia:${title}`,
        recordType: "place_detail",
        sourceName: "Wikipedia",
        normalized: {
          fact: {
            factType: "intro",
            language: input.locale ?? "zh-CN",
            valueText: `${title} 的百科简介候选，进入事实表前需要保留 source 和 fetchedAt。`,
            source: source(this.provider, "encyclopediaIntro", now, isoPlus(context.now(), 1000 * 60 * 60 * 24 * 180)),
          },
        },
      }),
    ];
  }
}

class WikidataIngestAdapter extends DryRunOnlyAdapter {
  provider = "wikidata";
  supportedTargets: ProviderIngestTarget[] = ["place", "place_detail"];
  requiredEnv = WIKIDATA_ENV;

  buildSamples(input: ProviderIngestInput, context: ProviderIngestContext): NormalizedProviderRecord[] {
    const now = context.now().toISOString();
    return [
      sampleRecord({
        provider: this.provider,
        externalId: "Q-dry-run",
        recordType: "place_detail",
        sourceName: "Wikidata SPARQL",
        normalized: {
          externalId: {
            provider: this.provider,
            externalId: "Q-dry-run",
            matchMethod: "wikidata_qid",
            confidence: 0.7,
          },
          source: source(this.provider, "sourceEvidence", now, isoPlus(context.now(), 1000 * 60 * 60 * 24 * 180)),
        },
      }),
    ];
  }
}

class WikimediaCommonsIngestAdapter extends DryRunOnlyAdapter {
  provider = "wikimedia_commons";
  supportedTargets: ProviderIngestTarget[] = ["image", "place", "place_detail"];
  requiredEnv = WIKIMEDIA_ENV;

  buildSamples(input: ProviderIngestInput, context: ProviderIngestContext): NormalizedProviderRecord[] {
    const now = context.now().toISOString();
    const title = input.query?.trim() || "Shenzhen Bay Park";
    return [
      sampleRecord({
        provider: this.provider,
        externalId: `commons:${title}`,
        recordType: "image",
        sourceName: "Wikimedia Commons",
        normalized: {
          image: {
            title,
            imageUrl: null,
            license: "license-required-from-provider",
            author: "author-required-from-provider",
            attribution: "attribution-required-before-public-display",
            source: source(this.provider, "images", now, isoPlus(context.now(), 1000 * 60 * 60 * 24 * 180)),
          },
        },
      }),
    ];
  }
}

class QWeatherIngestAdapter extends DryRunOnlyAdapter {
  provider = "qweather";
  supportedTargets: ProviderIngestTarget[] = ["weather"];
  requiredEnv = QWEATHER_ENV;
  protected requiredEnvMode = "all" as const;

  buildSamples(input: ProviderIngestInput, context: ProviderIngestContext): NormalizedProviderRecord[] {
    const now = context.now();
    const fetchedAt = now.toISOString();
    const expiresAt = isoPlus(now, 1000 * 60 * 60 * 3);
    return [
      sampleRecord({
        provider: this.provider,
        externalId: `qweather:${input.destinationId ?? input.adminAreaId ?? input.placeId ?? input.query ?? "dry-run"}`,
        recordType: "weather",
        sourceName: "QWeather",
        normalized: {
          weatherSnapshot: {
            snapshotType: "forecast",
            location: input.query ?? input.region ?? null,
            forecastStartAt: fetchedAt,
            forecastEndAt: isoPlus(now, 1000 * 60 * 60 * 24),
            conditionText: "dry-run sample",
            weatherAlertAvailable: true,
            airQualityAvailable: true,
            fetchedAt,
            expiresAt,
            source: source(this.provider, "weather", fetchedAt, expiresAt),
          },
        },
      }),
    ];
  }
}

class RouteProviderIngestAdapter extends DryRunOnlyAdapter {
  supportedTargets: ProviderIngestTarget[] = ["route", "route_estimate"];
  provider: "graphhopper" | "openrouteservice";
  requiredEnv: readonly string[];
  private sourceName: string;

  constructor(
    provider: "graphhopper" | "openrouteservice",
    requiredEnv: readonly string[],
    sourceName: string,
  ) {
    super();
    this.provider = provider;
    this.requiredEnv = requiredEnv;
    this.sourceName = sourceName;
    this.requiredEnvMode = "all";
  }

  buildSamples(input: ProviderIngestInput, context: ProviderIngestContext): NormalizedProviderRecord[] {
    const now = context.now();
    const mode: RouteMode = input.routeMode ?? "walking";
    return [
      sampleRecord({
        provider: this.provider,
        externalId: `${this.provider}:route-dry-run`,
        recordType: "route",
        sourceName: this.sourceName,
        normalized: {
          routeEstimate: {
            origin: coordinatesJson(input.origin),
            destination: coordinatesJson(input.destination),
            mode,
            distanceMeters: mode === "walking" ? 1800 : 4200,
            durationSeconds: mode === "walking" ? 1600 : 900,
            source: source(this.provider, "routeEstimate", now.toISOString(), isoPlus(now, 1000 * 60 * 60 * 24 * 14)),
          },
        },
      }),
    ];
  }
}

class UnregisteredProviderAdapter implements ProviderIngestAdapter {
  provider: string;
  supportedTargets: ProviderIngestTarget[] = [];

  constructor(provider: string) {
    this.provider = provider;
  }

  async dryRun(input: ProviderIngestInput): Promise<ProviderIngestResult> {
    return result({
      provider: this.provider,
      mode: input.mode,
      status: "failed",
      recordsSkipped: 1,
      errors: [error("unsupported_provider", `${this.provider} 尚未注册 Step2 ingest adapter。`)],
    });
  }

  async ingest(input: ProviderIngestInput): Promise<ProviderIngestResult> {
    return this.dryRun(input);
  }
}

export interface ProviderIngestRegistry {
  adapters: ProviderIngestAdapter[];
  byProvider(provider: string): ProviderIngestAdapter;
}

export function createProviderIngestRegistry(env: ProviderIngestEnv = process.env): ProviderIngestRegistry {
  const adapters: ProviderIngestAdapter[] = [
    new AMapIngestAdapter(),
    new WikipediaIngestAdapter(),
    new WikidataIngestAdapter(),
    new WikimediaCommonsIngestAdapter(),
    new QWeatherIngestAdapter(),
  ];

  if (envHasAllValues(env, GRAPHHOPPER_ENV) || !envHasAllValues(env, ORS_ENV)) {
    adapters.push(new RouteProviderIngestAdapter("graphhopper", GRAPHHOPPER_ENV, "GraphHopper"));
  } else {
    adapters.push(new RouteProviderIngestAdapter("openrouteservice", ORS_ENV, "OpenRouteService"));
  }

  if (envHasAllValues(env, ORS_ENV)) {
    adapters.push(new RouteProviderIngestAdapter("openrouteservice", ORS_ENV, "OpenRouteService"));
  }

  const byId = new Map(adapters.map((adapter) => [adapter.provider, adapter]));
  return {
    adapters,
    byProvider(provider: string) {
      return byId.get(provider) ?? new UnregisteredProviderAdapter(provider);
    },
  };
}

export async function runProviderIngest(input: ProviderIngestInput, env: ProviderIngestEnv = process.env): Promise<ProviderIngestResult> {
  const registry = createProviderIngestRegistry(env);
  const adapter = registry.byProvider(input.provider);
  const context: ProviderIngestContext = {
    env,
    now: () => new Date(),
  };
  return input.mode === "dry_run" ? adapter.dryRun(input, context) : adapter.ingest(input, context);
}
