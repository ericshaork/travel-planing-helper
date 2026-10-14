const { existsSync, readFileSync } = require("node:fs");
const { basename, relative, resolve } = require("node:path");

const TEMPLATE_ENV_FILENAME = "WANDERLY_V2_FULL_ENV_TEMPLATE.env.local";
const DEFAULT_ENV_CANDIDATES = [".env.local", ".env"] as const;
const SAMPLE_PLACE_NAMES = ["深圳湾公园", "世界之窗", "福田站"];

function parseEnvFile(envPath: string): Record<string, string> {
  const values: Record<string, string> = {};
  if (!existsSync(envPath)) return values;
  const text = readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const name = match[1];
    let value = match[2].trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[name] = value;
  }
  return values;
}

function findDefaultEnvPath(): string {
  for (const candidate of DEFAULT_ENV_CANDIDATES) {
    const envPath = resolve(process.cwd(), candidate);
    if (existsSync(envPath)) return envPath;
  }
  return resolve(process.cwd(), ".env.local");
}

function parseArgs(argv: string[]) {
  const parsed: Record<string, string> = {};
  for (const item of argv) {
    const match = item.match(/^--([^=]+)=(.*)$/);
    if (match) parsed[match[1]] = match[2];
  }
  return {
    envPath: parsed.env ? resolve(process.cwd(), parsed.env) : findDefaultEnvPath(),
  };
}

function envFileForOutput(envPath: string) {
  const rel = relative(process.cwd(), envPath);
  if (!rel || rel === "") return ".";
  return rel.startsWith("..") ? envPath : `.${rel.startsWith("\\") || rel.startsWith("/") ? "" : "\\"}${rel}`;
}

function isTemplateEnvPath(envPath: string) {
  return basename(envPath).toLowerCase() === TEMPLATE_ENV_FILENAME.toLowerCase();
}

function requireSupabaseEnv(env: Record<string, string>) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim() || env.SUPABASE_URL?.trim();
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url) throw new Error("缺少 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_URL。");
  if (!serviceRoleKey) throw new Error("缺少 SUPABASE_SERVICE_ROLE_KEY。");
  return { url, serviceRoleKey };
}

function applyEnv(env: Record<string, string>) {
  for (const [key, value] of Object.entries(env)) {
    process.env[key] = value;
  }
}

async function readSamplePlaces(url: string, serviceRoleKey: string) {
  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
  const result = await client
    .from("places")
    .select("id,name,updated_at,source_provider,source_external_id")
    .in("name", SAMPLE_PLACE_NAMES)
    .order("updated_at", { ascending: false })
    .limit(3);

  if (result.error) {
    const code = result.error.code || "unknown";
    const message = result.error.message || "Supabase places read failed.";
    const details = result.error.details ? ` details=${result.error.details}` : "";
    throw new Error(`places read failed: code=${code} message=${message}${details}`);
  }

  return result.data ?? [];
}

function uniqueSources(sources: unknown[]) {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const item = source as { provider?: unknown; fieldName?: unknown; externalId?: unknown; sourceUrl?: unknown };
    const key = [item.provider ?? "", item.fieldName ?? "", item.externalId ?? "", item.sourceUrl ?? ""].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueStrings(values: Array<string | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function assertSafe(value: unknown) {
  const text = JSON.stringify(value);
  const forbidden = [
    "raw_snapshot",
    "raw_payload",
    "raw_json",
    "SUPABASE_SERVICE_ROLE_KEY",
    "service_role",
    "Authorization",
    "Bearer ",
  ];
  const hit = forbidden.find((item) => text.includes(item));
  if (hit) {
    throw new Error(`unsafe output contains ${hit}`);
  }
}

function buildEvidencePackFromPlacePacks(placePacks: unknown[]) {
  const places = placePacks.map((pack) => {
    const item = pack as {
      place: unknown;
      detail: unknown;
      sources: unknown[];
      missingFields: unknown[];
      confidence: number | null;
      freshness: { lastVerifiedAt: string | null; fetchedAt: Array<string | null | undefined> };
    };
    return {
      place: item.place,
      detail: item.detail,
      sources: item.sources,
      missingFields: item.missingFields,
      confidence: item.confidence,
      freshness: item.freshness,
    };
  });
  const weatherContext = placePacks.flatMap((pack) => (pack as { weatherContext?: unknown[] }).weatherContext ?? []);
  const routeEstimates = placePacks.flatMap((pack) => (pack as { routeContext?: unknown[] }).routeContext ?? []);
  const sourceList = uniqueSources([
    ...places.flatMap((place) => place.sources),
    ...weatherContext.map((weather) => (weather as { source?: unknown }).source).filter(Boolean),
    ...routeEstimates.map((route) => (route as { source?: unknown }).source).filter(Boolean),
  ]);
  const missingFields = places.flatMap((place) => place.missingFields);
  const lastVerifiedAt = sourceList
    .map((source) => {
      const item = source as { lastVerifiedAt?: string | null; fetchedAt?: string | null };
      return item.lastVerifiedAt ?? item.fetchedAt ?? null;
    })
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;
  const confidenceValues = [
    ...places.map((place) => place.confidence),
    ...weatherContext.map((weather) => (weather as { confidence?: number | null }).confidence),
    ...routeEstimates.map((route) => (route as { confidence?: number | null }).confidence),
  ].filter((value): value is number => typeof value === "number");

  return {
    destination: "深圳",
    city: "深圳",
    travelDates: null,
    userPreferences: ["轻松", "城市文化", "一天"],
    places,
    weatherContext,
    routeEstimates,
    sourceList,
    missingFields,
    freshness: {
      lastVerifiedAt,
      fetchedAt: sourceList.map((source) => (source as { fetchedAt?: string | null }).fetchedAt),
    },
    confidence: confidenceValues.length
      ? Number((confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length).toFixed(2))
      : null,
  };
}

function createDryRunPlan(evidenceAwareInput: {
  evidenceWarnings: string[];
  evidenceMetadata: unknown;
}) {
  return {
    tripPlan: {
      tripTitle: "深圳 1 天 evidence dry-run",
      summary: "使用 Data Hub evidence dry-run 验证，不调用真实 AI。",
      destination: "深圳",
      days: 1,
      travelStyleSummary: "轻松、城市文化，一天内少折返。",
      weatherSummary: {
        available: false,
        overview: "天气按 Data Hub / WeatherProvider 结果待确认。",
        dailyForecast: [],
        alerts: [],
        reminders: ["出发前再次确认天气和开放信息。"],
        dataNote: "本次为 dry-run，不编造实时天气。",
      },
      budgetSummary: {
        totalEstimate: "约 600 元",
        transport: "约 100 元",
        hotel: "约 0 元",
        food: "约 200 元",
        tickets: "待确认",
        localTransport: "约 100 元",
        flexibleSpending: "约 200 元",
        note: "票价和开放时间待确认。",
      },
      hotelAreaAdvice: [],
      transportAdvice: {
        summary: "地点间交通耗时待确认。",
        options: [],
        suggestedPlatforms: [],
        note: "不编造实时交通。",
      },
      dailyItinerary: [],
      generalTips: ["开放时间和门票以官方信息为准。"],
      warnings: evidenceAwareInput.evidenceWarnings,
    },
    warnings: evidenceAwareInput.evidenceWarnings,
    evidenceMetadata: evidenceAwareInput.evidenceMetadata,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (isTemplateEnvPath(args.envPath)) {
    throw new Error("当前读取的是模板 env，不能用于 Data Hub e2e smoke。");
  }

  const env = parseEnvFile(args.envPath);
  const { url, serviceRoleKey } = requireSupabaseEnv(env);
  applyEnv(env);

  const { createProductDataHubService } = await import("../src/server/data-hub/productDataHubService.ts");
  const { buildEvidenceAwarePlanInput } = await import("../src/server/planning/evidenceAwarePlanInput.ts");
  const { buildAiPlanEvidenceRows } = await import("../src/server/planning/aiEvidenceRecorder.ts");

  const productService = createProductDataHubService();
  const places = await readSamplePlaces(url, serviceRoleKey);
  if (places.length === 0) {
    throw new Error("未找到深圳湾公园 / 世界之窗 / 福田站 Data Hub places，无法执行 e2e smoke。");
  }

  const placePacks = [];
  const profileSummaries = [];
  for (const place of places) {
    const profile = await productService.getPlaceProfile(place.id);
    const placePack = await productService.buildPlaceEvidencePack(place.id);
    if (!profile || !placePack) continue;
    placePacks.push(placePack);
    profileSummaries.push({
      placeName: profile.detail.place.name,
      factsCount: profile.facts.length,
      sourcesCount: profile.sourceSummary.length,
      missingFields: uniqueStrings(profile.missingFields.map((field: { fieldName?: string }) => field.fieldName)),
      confidence: profile.detail.confidence,
      lastVerifiedAt: profile.detail.lastVerifiedAt,
      weatherExists: profile.weatherContext.length > 0,
      routeExists: profile.routeContext.length > 0,
    });
  }

  const evidencePack = buildEvidencePackFromPlacePacks(placePacks);
  const evidenceAwareInput = buildEvidenceAwarePlanInput({
    tripRequest: {
      departureCity: "深圳",
      destinationCity: "深圳",
      days: 1,
      budget: 600,
      currency: "CNY",
      interests: ["城市文化"],
      travelStyles: ["轻松"],
      mustVisitPlaces: ["深圳湾公园", "世界之窗", "福田站"],
      avoidPlaces: [],
    },
    evidencePack,
  });
  const dryRunPlan = createDryRunPlan(evidenceAwareInput);
  const evidenceRows = buildAiPlanEvidenceRows({
    tripId: "00000000-0000-4000-8000-000000000001",
    evidencePack,
    reason: "e2e_smoke_dry_run",
  });

  assertSafe(profileSummaries);
  assertSafe(evidenceAwareInput);
  assertSafe(dryRunPlan);
  assertSafe(evidenceRows);

  console.log(JSON.stringify({
    envFile: envFileForOutput(args.envPath),
    samplePlacesRequested: SAMPLE_PLACE_NAMES,
    checkedPlaces: profileSummaries.length,
    profiles: profileSummaries,
    evidencePack: {
      placesCount: evidencePack.places.length,
      sourcesCount: evidencePack.sourceList.length,
      missingFields: uniqueStrings(evidencePack.missingFields.map((field: { fieldName?: string }) => field.fieldName)),
      confidence: evidencePack.confidence,
      lastVerifiedAt: evidencePack.freshness.lastVerifiedAt,
      weatherExists: evidencePack.weatherContext.length > 0,
      routeExists: evidencePack.routeEstimates.length > 0,
    },
    evidenceAwareInput: {
      promptSectionExists: evidenceAwareInput.evidencePromptSection.length > 0,
      warnings: evidenceAwareInput.evidenceWarnings,
      evidenceMetadataExists: Boolean(evidenceAwareInput.evidenceMetadata),
      evidenceMetadataMissingFields: evidenceAwareInput.evidenceMetadata.missingFields,
    },
    dryRunPlan: {
      planGenerated: true,
      evidenceMetadataExists: Boolean(dryRunPlan.evidenceMetadata),
      warnings: dryRunPlan.warnings,
      doesNotInventOpeningHoursOrTicketPrice: true,
    },
    aiPlanEvidence: {
      writeRowsDryRun: evidenceRows.length,
      fields: ["trip_id", "place_id", "source_type", "source_id", "reason"],
      remoteWritePerformed: false,
      currentSchemaLimitation: "confidence / missingFields / source summary are returned in GenerateTripResponse.evidenceMetadata; ai_plan_evidence currently stores references only.",
    },
    secretValuesPrinted: false,
  }, null, 2));
}

main().catch((err: unknown) => {
  console.error(JSON.stringify({
    status: "failed",
    error: err instanceof Error ? err.message : "Unknown Data Hub e2e smoke error.",
    secretValuesPrinted: false,
  }, null, 2));
  process.exitCode = 1;
});
