const { existsSync, readFileSync } = require("node:fs");
const { basename, relative, resolve } = require("node:path");

type CliMode = "dry_run" | "write_staging" | "write_normalized";

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

function envFileForOutput(envPath: string) {
  const rel = relative(process.cwd(), envPath);
  if (!rel || rel === "") return ".";
  return rel.startsWith("..") ? envPath : `.${rel.startsWith("\\") || rel.startsWith("/") ? "" : "\\"}${rel}`;
}

function isTemplateEnvPath(envPath: string) {
  return basename(envPath).toLowerCase() === TEMPLATE_ENV_FILENAME.toLowerCase();
}

function parseArgs(argv: string[]) {
  const parsed: Record<string, string> = {};
  for (const item of argv) {
    const match = item.match(/^--([^=]+)=(.*)$/);
    if (match) parsed[match[1]] = match[2];
  }
  const mode = ["dry_run", "write_staging", "write_normalized"].includes(parsed.mode) ? parsed.mode as CliMode : "dry_run";
  return {
    provider: parsed.provider,
    targetType: parsed.target ?? parsed.targetType,
    query: parsed.query,
    limit: parsed.limit ? Number(parsed.limit) : undefined,
    routeMode: parsed.routeMode ?? parsed.modeName,
    sample: parsed.sample,
    mode,
    envPath: parsed.env ? resolve(process.cwd(), parsed.env) : findDefaultEnvPath(),
  };
}

function requireSupabaseEnv(env: Record<string, string>) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) {
    throw new Error("缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY，不能执行写入模式。");
  }
  return { url, serviceRoleKey };
}

async function createStores(mode: CliMode, env: Record<string, string>) {
  if (mode === "dry_run") return {};
  const { createClient } = await import("@supabase/supabase-js");
  const { SupabaseIngestRunStore } = await import("../src/server/data-hub/ingest/ingestRunStore.ts");
  const { SupabaseStagingStore } = await import("../src/server/data-hub/ingest/stagingStore.ts");
  const { SupabaseFactStore } = await import("../src/server/data-hub/ingest/factStore.ts");
  const { url, serviceRoleKey } = requireSupabaseEnv(env);
  const client = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
  return {
    ingestRuns: new SupabaseIngestRunStore(client),
    staging: new SupabaseStagingStore(client),
    facts: new SupabaseFactStore(client),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = parseEnvFile(args.envPath);
  if (args.mode !== "dry_run" && isTemplateEnvPath(args.envPath)) {
    throw new Error("当前读取的是模板 env，不能用于远端 sample ingest 写入。请使用 --env=.env.local。");
  }
  const { runSampleIngest } = await import("../src/server/data-hub/ingest/sampleIngestService.ts");
  const stores = await createStores(args.mode, env);
  const summary = await runSampleIngest({
    sample: args.sample === "v2-core" ? "v2-core" : undefined,
    mode: args.mode,
    provider: args.provider,
    targetType: args.targetType,
    query: args.query,
    limit: args.limit,
    routeMode: args.routeMode,
  }, stores);

  console.log(JSON.stringify({
    envFile: envFileForOutput(args.envPath),
    sample: summary.sample,
    mode: summary.mode,
    totals: summary.totals,
    normalizedWrites: summary.normalizedWrites,
    failedBreakdown: summary.failedBreakdown,
    results: summary.results,
  }, null, 2));
}

main().catch((err: unknown) => {
  console.error(JSON.stringify({
    mode: "sample",
    status: "failed",
    error: {
      code: "sample_cli_failed",
      message: err instanceof Error ? err.message : "小样本 ingest 脚本执行失败。",
    },
  }, null, 2));
  process.exitCode = 1;
});
