const { existsSync, readFileSync } = require("node:fs");
const { basename, relative, resolve } = require("node:path");

const TEMPLATE_ENV_FILENAME = "WANDERLY_V2_FULL_ENV_TEMPLATE.env.local";
const DEFAULT_ENV_CANDIDATES = [".env.local", ".env"] as const;

const REQUIRED_TABLES = [
  "destinations",
  "admin_areas",
  "travel_regions",
  "places",
  "place_details",
  "place_sources",
  "route_cache",
  "ai_plan_evidence",
  "provider_ingest_runs",
  "provider_records_staging",
  "place_external_ids",
  "place_facts",
  "event_records",
  "weather_snapshots",
  "traffic_snapshots",
] as const;

type RequiredTable = typeof REQUIRED_TABLES[number];
type ActiveKeyType = "service_role" | "anon" | "missing";

interface SchemaCheckArgs {
  envPath: string;
  reloadCache: boolean;
  explicitEnv: boolean;
}

interface SupabaseConfig {
  url: string;
  key: string;
  keyType: ActiveKeyType;
  host: string | null;
}

interface SafeCheckError {
  code: string;
  reason: string;
  message: string;
  hint?: string;
  httpStatus?: number;
}

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

function parseArgs(argv: string[]): SchemaCheckArgs {
  const parsed: Record<string, string | boolean> = {};
  for (const item of argv) {
    const match = item.match(/^--([^=]+)=(.*)$/);
    if (match) {
      parsed[match[1]] = match[2];
    } else if (item.startsWith("--")) {
      parsed[item.slice(2)] = true;
    }
  }
  const explicitEnv = typeof parsed.env === "string";
  return {
    envPath: explicitEnv ? resolve(process.cwd(), parsed.env as string) : findDefaultEnvPath(),
    reloadCache: parsed["reload-cache"] === true || parsed.reloadCache === true,
    explicitEnv,
  };
}

function firstEnvValue(env: Record<string, string>, names: readonly string[]): string | null {
  for (const name of names) {
    const value = env[name]?.trim();
    if (value) return value;
  }
  return null;
}

function envFileForOutput(envPath: string) {
  const rel = relative(process.cwd(), envPath);
  if (!rel || rel === "") return ".";
  return rel.startsWith("..") ? envPath : `.${rel.startsWith("\\") || rel.startsWith("/") ? "" : "\\"}${rel}`;
}

function isTemplateEnvPath(envPath: string) {
  return basename(envPath).toLowerCase() === TEMPLATE_ENV_FILENAME.toLowerCase();
}

function supabaseHost(url: string | null) {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

function selectSupabaseKey(env: Record<string, string>): { key: string | null; keyType: ActiveKeyType } {
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (serviceRoleKey) {
    return { key: serviceRoleKey, keyType: "service_role" };
  }

  const anonKey = firstEnvValue(env, ["SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]);
  if (anonKey) {
    return { key: anonKey, keyType: "anon" };
  }

  return { key: null, keyType: "missing" };
}

function envSummary(env: Record<string, string>, envPath: string) {
  const url = firstEnvValue(env, ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"]);
  const selectedKey = selectSupabaseKey(env);
  return {
    envFile: envFileForOutput(envPath),
    envFileExists: existsSync(envPath),
    envSourcePriority: [".env.local", ".env"],
    supabaseEnvPresence: {
      NEXT_PUBLIC_SUPABASE_URL: Boolean(env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
      SUPABASE_URL: Boolean(env.SUPABASE_URL?.trim()),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
      SUPABASE_ANON_KEY: Boolean(env.SUPABASE_ANON_KEY?.trim()),
    },
    supabaseHost: supabaseHost(url),
    activeKeyType: selectedKey.keyType,
  };
}

function requireSupabaseEnv(env: Record<string, string>): SupabaseConfig {
  const url = firstEnvValue(env, ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"]);
  const selectedKey = selectSupabaseKey(env);
  const host = supabaseHost(url);
  if (!url) {
    throw new Error("URL 缺失：需要 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_URL。");
  }
  if (!host) {
    throw new Error("URL 无效：Supabase URL 不是合法 URL。");
  }
  if (!selectedKey.key) {
    throw new Error("key 缺失：需要 SUPABASE_SERVICE_ROLE_KEY，或 fallback 使用 SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY。");
  }
  return { url: url.replace(/\/+$/, ""), key: selectedKey.key, keyType: selectedKey.keyType, host };
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function safePostgrestError(status: number, text: string): SafeCheckError {
  const parsed = safeJsonParse(text);
  if (parsed && typeof parsed === "object") {
    const item = parsed as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown };
    const code = typeof item.code === "string" ? item.code : `HTTP_${status}`;
    const message = typeof item.message === "string" ? item.message : `Supabase REST returned HTTP ${status}.`;
    const hint = typeof item.hint === "string" ? item.hint : undefined;
    let reason = "supabase_rest_error";
    if (status === 401 || status === 403) reason = "auth_failed";
    if (code === "PGRST205") reason = "pgrst205_table_not_found_or_schema_cache";
    return { code, reason, message, hint, httpStatus: status };
  }
  return {
    code: `HTTP_${status}`,
    reason: status === 401 || status === 403 ? "auth_failed" : "supabase_rest_error",
    message: status === 401 || status === 403
      ? `Supabase 返回 ${status}，请检查当前 key 是否有权限。`
      : `Supabase REST returned HTTP ${status}.`,
    httpStatus: status,
  };
}

function safeNetworkError(error: unknown): SafeCheckError {
  if (!error || typeof error !== "object") {
    return { code: "NETWORK_ERROR", reason: "network_or_dns_failed", message: "网络请求失败。" };
  }
  const item = error as { code?: unknown; message?: unknown; cause?: unknown };
  const cause = item.cause && typeof item.cause === "object"
    ? item.cause as { code?: unknown; message?: unknown }
    : null;
  const causeCode = typeof cause?.code === "string" ? cause.code : undefined;
  const message = typeof item.message === "string" ? item.message : "fetch failed";
  const causeMessage = typeof cause?.message === "string" ? cause.message : undefined;
  return {
    code: causeCode || "FETCH_FAILED",
    reason: "network_or_dns_failed",
    message: causeMessage ? `${message}: ${causeMessage}` : message,
  };
}

function classifyRisk(
  missingTables: RequiredTable[],
  errors: Array<{ table: string; code: string; reason: string }>,
  activeKeyType: ActiveKeyType,
) {
  const pgrstMissing = errors.some((item) => item.code === "PGRST205" || item.code === "PGRST204");
  const networkFailed = errors.length > 0 && errors.every((item) => item.reason === "network_or_dns_failed");
  const authFailed = errors.some((item) => item.reason === "auth_failed");
  if (networkFailed) return "unknown_network_or_dns_failed";
  if (authFailed && activeKeyType === "service_role") return "unknown_service_role_grant_failed";
  if (authFailed && activeKeyType === "anon") return "unknown_anon_key_used_or_public_grant_denied";
  if (authFailed) return "unknown_auth_failed";
  if (missingTables.length === 0) return "low";
  const coreMissing = missingTables.some((table) => ["places", "place_facts", "route_cache"].includes(table));
  if (coreMissing && pgrstMissing) return "high_schema_cache_or_missing_migration";
  if (coreMissing) return "high_missing_core_tables";
  return "medium_missing_extension_tables";
}

function nextAction(
  missingTables: RequiredTable[],
  reloadCache: boolean,
  errors: Array<{ table: string; code: string; reason: string }>,
  activeKeyType: ActiveKeyType,
) {
  const networkFailed = errors.length > 0 && errors.every((item) => item.reason === "network_or_dns_failed");
  if (networkFailed) {
    return "当前无法访问 Supabase REST endpoint，原因是 DNS/network 失败。请检查本机网络、代理或沙箱网络权限后重试。";
  }
  const authFailed = errors.some((item) => item.reason === "auth_failed");
  if (authFailed) {
    if (activeKeyType === "service_role") {
      return "Supabase REST 返回 401/403 权限错误，且 schema check 当前使用的是 service_role。表已能被 PostgREST 定位，但 service_role 对 Data Hub 表缺少 SELECT 权限；请应用 014_data_hub_service_role_grants.sql，并确认没有用自定义角色覆盖 service_role 行为。";
    }
    if (activeKeyType === "anon") {
      return "Supabase REST 返回 401/403 权限错误，且 schema check 当前使用的是 anon fallback。请确认 .env.local 是否存在有效的 SUPABASE_SERVICE_ROLE_KEY；真实远端健康检查应使用 service_role。";
    }
    return "Supabase REST 返回 401/403 权限错误，且没有可用 key。请检查 .env.local 中的 SUPABASE_SERVICE_ROLE_KEY。";
  }
  if (missingTables.length === 0) {
    return reloadCache
      ? "REST schema cache 已可见全部必需表；如果刚执行过 DDL，请通过 SQL 执行 select pg_notify('pgrst', 'reload schema') 后再跑 normalized smoke test。"
      : "全部必需表在 REST schema cache 中可见；可以运行 write_normalized smoke test。";
  }
  if (missingTables.includes("places")) {
    return "远端 REST schema cache 看不到 public.places。请先按顺序应用 008-013 Data Hub migrations；若确认表已存在，则执行 select pg_notify('pgrst', 'reload schema') 刷新 PostgREST schema cache。";
  }
  return "存在缺失表。请按 migration 顺序补齐远端 schema，然后刷新 PostgREST schema cache。";
}

async function checkTable(config: SupabaseConfig, table: RequiredTable) {
  const endpoint = `${config.url}/rest/v1/${encodeURIComponent(table)}?select=id&limit=1`;
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "GET",
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        Accept: "application/json",
      },
    });
  } catch (error) {
    return {
      table,
      existsInRestSchema: false as const,
      error: safeNetworkError(error),
    };
  }

  if (response.ok) return { table, existsInRestSchema: true as const };
  const text = await response.text();
  return {
    table,
    existsInRestSchema: false as const,
    error: safePostgrestError(response.status, text),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = parseEnvFile(args.envPath);

  if (isTemplateEnvPath(args.envPath)) {
    console.error(JSON.stringify({
      status: "failed",
      checkMode: "supabase_rest_schema_cache_read_only",
      env: envSummary(env, args.envPath),
      error: {
        code: "template_env_not_allowed",
        reason: "template_env_selected",
        message: "当前读取的是模板 env，不能用于远端 schema 检查。",
      },
      suggestedNextAction: "请使用项目根目录 .env.local，或显式运行 npm run datahub:schema:check -- --env=.env.local。",
      secretValuesPrinted: false,
    }, null, 2));
    process.exitCode = 1;
    return;
  }

  const config = requireSupabaseEnv(env);

  const checks = [];
  for (const table of REQUIRED_TABLES) {
    checks.push(await checkTable(config, table));
  }

  const existingTables = checks.filter((item) => item.existsInRestSchema).map((item) => item.table);
  const errors = checks
    .filter((item): item is { table: RequiredTable; existsInRestSchema: false; error: SafeCheckError } => !item.existsInRestSchema)
    .map((item) => ({
      table: item.table,
      code: item.error.code,
      reason: item.error.reason,
      httpStatus: item.error.httpStatus,
      message: item.error.message,
      hint: item.error.hint,
    }));
  const missingTables = errors
    .filter((item) => item.code === "PGRST205" || item.code === "PGRST204")
    .map((item) => item.table);
  const permissionDeniedTables = errors
    .filter((item) => item.reason === "auth_failed")
    .map((item) => item.table);
  const networkFailedTables = errors
    .filter((item) => item.reason === "network_or_dns_failed")
    .map((item) => item.table);
  const inconclusiveTables = errors
    .filter((item) => item.reason !== "auth_failed" && item.reason !== "network_or_dns_failed" && item.code !== "PGRST205" && item.code !== "PGRST204")
    .map((item) => item.table);

  console.log(JSON.stringify({
    env: envSummary(env, args.envPath),
    checkMode: "supabase_rest_schema_cache_read_only",
    reloadCacheRequested: args.reloadCache,
    reloadCachePerformed: false,
    reloadCacheNote: args.reloadCache
      ? "本脚本默认不执行 DDL/NOTIFY。请在 Supabase SQL Editor 或直连 Postgres 执行 select pg_notify('pgrst', 'reload schema')。"
      : undefined,
    existingTables,
    missingTables,
    permissionDeniedTables,
    networkFailedTables,
    inconclusiveTables,
    migrationRisk: classifyRisk(missingTables, errors, config.keyType),
    suggestedNextAction: nextAction(missingTables, args.reloadCache, errors, config.keyType),
    errors,
    secretValuesPrinted: false,
  }, null, 2));
}

main().catch((err: unknown) => {
  const args = parseArgs(process.argv.slice(2));
  const env = parseEnvFile(args.envPath);
  console.error(JSON.stringify({
    status: "failed",
    checkMode: "supabase_rest_schema_cache_read_only",
    env: envSummary(env, args.envPath),
    error: {
      code: "schema_check_failed",
      message: err instanceof Error ? err.message : "远端 schema 检查失败。",
    },
    secretValuesPrinted: false,
  }, null, 2));
  process.exitCode = 1;
});
