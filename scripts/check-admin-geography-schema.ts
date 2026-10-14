const { existsSync, readFileSync } = require("node:fs");
const { basename, relative, resolve } = require("node:path");

const TEMPLATE_ENV_FILENAME = "WANDERLY_V2_FULL_ENV_TEMPLATE.env.local";

function parseEnvFile(envPath: string): Record<string, string> {
  const values: Record<string, string> = {};

  if (!existsSync(envPath)) {
    return values;
  }

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

function findDefaultEnvPath() {
  for (const candidate of [".env.local", ".env"]) {
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
  if (!rel) return ".";
  return rel.startsWith("..") ? envPath : rel;
}

function isTemplateEnvPath(envPath: string) {
  return basename(envPath).toLowerCase() === TEMPLATE_ENV_FILENAME.toLowerCase();
}

function requireSupabaseEnv(env: Record<string, string>) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim() || env.SUPABASE_URL?.trim();
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url) throw new Error("缺少 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_URL。");
  if (!serviceRoleKey) throw new Error("缺少 SUPABASE_SERVICE_ROLE_KEY。");

  return {
    url,
    serviceRoleKey,
    host: new URL(url).host,
  };
}

function safeError(error: unknown) {
  if (!error || typeof error !== "object") {
    return { code: "unknown", message: "Unknown error" };
  }

  const item = error as {
    code?: unknown;
    message?: unknown;
    details?: unknown;
    hint?: unknown;
  };

  return {
    code: typeof item.code === "string" ? item.code : "unknown",
    message: typeof item.message === "string" ? item.message : "Unknown error",
    hint: typeof item.hint === "string" ? item.hint : null,
    details: typeof item.details === "string" ? item.details : null,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (isTemplateEnvPath(args.envPath)) {
    throw new Error("当前读取的是模板 env，不能用于 admin geography schema check。");
  }

  const env = parseEnvFile(args.envPath);
  const { createClient } = await import("@supabase/supabase-js");
  const { url, serviceRoleKey, host } = requireSupabaseEnv(env);
  const client = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  const tableReadCheck = await client
    .from("admin_regions")
    .select("adcode")
    .limit(1);
  const tableCountCheck = await client
    .from("admin_regions")
    .select("adcode", { count: "exact" })
    .limit(1);
  const rpcCheck = await client.rpc("upsert_admin_regions_from_geojson", {
    regions: [],
  });
  const tableVisible = !tableReadCheck.error && !tableCountCheck.error;
  const rpcCallable = !rpcCheck.error;
  const ok = tableVisible && rpcCallable;
  const tablePermissionDenied =
    tableReadCheck.error?.code === "42501" || tableCountCheck.error?.code === "42501";

  console.log(JSON.stringify({
    envFile: envFileForOutput(args.envPath),
    supabaseHost: host,
    checks: {
      adminRegionsTableVisible: tableVisible,
      serviceRoleCanSelectAdminRegions: tableVisible,
      upsertRpcCallable: rpcCallable,
      serviceRoleCanExecuteRpc: rpcCallable,
      postgrestSchemaCacheReloadedLikely: ok,
    },
    errors: {
      adminRegions: tableReadCheck.error
        ? safeError(tableReadCheck.error)
        : tableCountCheck.error
          ? safeError(tableCountCheck.error)
          : null,
      upsertRpc: rpcCheck.error ? safeError(rpcCheck.error) : null,
    },
    nextSql: tablePermissionDenied
      ? [
          "Run supabase/migrations/017_admin_regions_service_role_grants.sql in Supabase SQL Editor.",
          "Then run: select pg_notify('pgrst', 'reload schema');",
        ]
      : rpcCallable
        ? null
        : [
            "Run supabase/migrations/016_admin_regions_import_rpc.sql in Supabase SQL Editor.",
            "Then run: select pg_notify('pgrst', 'reload schema');",
          ],
    ok,
    secretValuesPrinted: false,
  }, null, 2));

  if (!ok) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(JSON.stringify({
    status: "failed",
    error: error instanceof Error ? error.message : "Unknown admin geography schema check error.",
    secretValuesPrinted: false,
  }, null, 2));
  process.exitCode = 1;
});
