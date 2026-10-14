const { existsSync, readFileSync } = require("node:fs");
const { basename, relative, resolve } = require("node:path");

const TEMPLATE_ENV_FILENAME = "WANDERLY_V2_FULL_ENV_TEMPLATE.env.local";
const DEFAULT_ENV_CANDIDATES = [".env.local", ".env"] as const;

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
    limit: Math.max(1, Math.min(parsed.limit ? Number(parsed.limit) : 3, 3)),
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

async function readRecentPlaces(url: string, serviceRoleKey: string, limit: number) {
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
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (result.error) {
    const code = result.error.code || "unknown";
    const message = result.error.message || "Supabase places read failed.";
    const details = result.error.details ? ` details=${result.error.details}` : "";
    throw new Error(`places read failed: code=${code} message=${message}${details}`);
  }

  return result.data ?? [];
}

function summarizeMissingFields(fields: Array<{ fieldName?: string }>) {
  return [...new Set(fields.map((field) => field.fieldName).filter(Boolean))];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (isTemplateEnvPath(args.envPath)) {
    throw new Error("当前读取的是模板 env，不能用于 product read smoke。");
  }

  const env = parseEnvFile(args.envPath);
  const { url, serviceRoleKey } = requireSupabaseEnv(env);
  applyEnv(env);

  const { createProductDataHubService } = await import("../src/server/data-hub/productDataHubService.ts");
  const productService = createProductDataHubService();
  const places = await readRecentPlaces(url, serviceRoleKey, args.limit);
  const summaries = [];

  for (const place of places) {
    const profile = await productService.getPlaceProfile(place.id);
    const evidence = await productService.buildPlaceEvidencePack(place.id);

    summaries.push({
      placeName: profile?.detail.place.name ?? place.name,
      factsCount: profile?.facts.length ?? 0,
      sourcesCount: profile?.sourceSummary.length ?? 0,
      missingFields: summarizeMissingFields(profile?.missingFields ?? []),
      confidence: profile?.detail.confidence ?? evidence?.confidence ?? null,
      lastVerifiedAt: profile?.detail.lastVerifiedAt ?? evidence?.freshness.lastVerifiedAt ?? null,
      weatherExists: Boolean(profile?.weatherContext.length),
      routeExists: Boolean(profile?.routeContext.length),
    });
  }

  console.log(JSON.stringify({
    envFile: envFileForOutput(args.envPath),
    checkedPlaces: summaries.length,
    places: summaries,
    secretValuesPrinted: false,
  }, null, 2));
}

main().catch((err: unknown) => {
  console.error(JSON.stringify({
    status: "failed",
    error: err instanceof Error ? err.message : "Unknown product read smoke error.",
    secretValuesPrinted: false,
  }, null, 2));
  process.exitCode = 1;
});
