const { existsSync, readFileSync } = require("node:fs");
const { basename, relative, resolve } = require("node:path");

type CliArgs = {
  input: string;
  province?: string;
  parent?: string;
  level?: string;
  dryRun: boolean;
  envPath: string;
};

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

function envFileForOutput(envPath: string) {
  const rel = relative(process.cwd(), envPath);
  if (!rel) return ".";
  return rel.startsWith("..") ? envPath : rel;
}

function isTemplateEnvPath(envPath: string) {
  return basename(envPath).toLowerCase() === TEMPLATE_ENV_FILENAME.toLowerCase();
}

function parseArgs(argv: string[]): CliArgs {
  const parsed: Record<string, string | boolean> = {};

  for (const item of argv) {
    if (item.startsWith("--") && item.includes("=")) {
      const [key, ...value] = item.slice(2).split("=");
      parsed[key] = value.join("=");
      continue;
    }

    if (item.startsWith("--")) {
      parsed[item.slice(2)] = true;
    }
  }

  return {
    input: typeof parsed.input === "string"
      ? parsed.input
      : "data/admin/samples/guangdong-admin-regions.sample.json",
    province: typeof parsed.province === "string" ? parsed.province : undefined,
    parent: typeof parsed.parent === "string" ? parsed.parent : undefined,
    level: typeof parsed.level === "string" ? parsed.level : undefined,
    dryRun: parsed["dry-run"] !== false && parsed.write !== true,
    envPath: typeof parsed.env === "string"
      ? resolve(process.cwd(), parsed.env)
      : findDefaultEnvPath(),
  };
}

function readAdminRegionPayload(inputPath: string) {
  const absolutePath = resolve(process.cwd(), inputPath);

  if (!existsSync(absolutePath)) {
    throw new Error(`Admin region input not found: ${inputPath}`);
  }

  const parsed = JSON.parse(readFileSync(absolutePath, "utf8"));
  const records = Array.isArray(parsed) ? parsed : parsed.regions;

  if (!Array.isArray(records)) {
    throw new Error("Admin region input must be an array or an object with a regions array.");
  }

  return { parsed, records };
}

function requireSupabaseEnv(env: Record<string, string>) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    throw new Error("缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY，不能写入 admin_regions。");
  }

  return { url, serviceRoleKey };
}

async function writeAdminRegions(rows: unknown[], env: Record<string, string>) {
  const { createClient } = await import("@supabase/supabase-js");
  const { url, serviceRoleKey } = requireSupabaseEnv(env);
  const client = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
  const chunkSize = 50;
  const results = [];

  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const { data, error } = await client.rpc("upsert_admin_regions_from_geojson", {
      regions: chunk,
    });

    if (error) {
      throw new Error(error.message);
    }

    results.push({
      chunk: results.length + 1,
      rows: chunk.length,
      result: summarizeRpcResult(data),
    });
  }

  return {
    chunks: results.length,
    rows: rows.length,
    results,
  };
}

function summarizeRpcResult(data: unknown) {
  if (Array.isArray(data)) {
    return {
      type: "array",
      length: data.length,
    };
  }

  if (data && typeof data === "object") {
    const value = data as Record<string, unknown>;

    return {
      type: "object",
      keys: Object.keys(value).slice(0, 8),
      count: typeof value.count === "number" ? value.count : undefined,
      upserted: typeof value.upserted === "number" ? value.upserted : undefined,
    };
  }

  return {
    type: typeof data,
    value: typeof data === "number" || typeof data === "string" || typeof data === "boolean"
      ? data
      : null,
  };
}

function buildExtraSummary(records: Array<{ metadata?: Record<string, unknown> }>, parsed: unknown) {
  const coverage = typeof parsed === "object" && parsed !== null && "coverage" in parsed
    ? (parsed as { coverage?: Record<string, unknown> }).coverage
    : undefined;

  return {
    directCountyUnderProvince: records.filter(
      (record) => record.metadata?.directCountyUnderProvince === true,
    ).length,
    skippedTownshipLike: typeof coverage?.skippedTownshipLike === "number"
      ? coverage.skippedTownshipLike
      : 0,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { prepareAdminRegionImportRows } = await import("../src/server/data-hub/admin/importer.ts");
  const { parsed, records } = readAdminRegionPayload(args.input);
  const scoped = args.province
    ? records.filter((record: { adcode?: string; provinceAdcode?: string }) =>
        record.adcode === args.province ||
        record.provinceAdcode === args.province)
    : args.parent
      ? records.filter((record: { adcode?: string; parentAdcode?: string }) =>
          record.adcode === args.parent || record.parentAdcode === args.parent)
    : records;
  const filtered = args.level
    ? scoped.filter((record: { level?: string }) => record.level === args.level)
    : scoped;
  const externalAdcodes = [
    args.parent,
    args.province,
    ...filtered.map((record: { adcode?: string | null }) => record.adcode),
    ...filtered.flatMap((record: {
      parentAdcode?: string | null;
      provinceAdcode?: string | null;
      prefectureAdcode?: string | null;
    }) => [record.parentAdcode, record.provinceAdcode, record.prefectureAdcode]),
  ];
  const prepared = prepareAdminRegionImportRows(filtered, { externalAdcodes });
  const summary = {
    ...prepared.validation.summary,
    ...buildExtraSummary(filtered, parsed),
    upserted: prepared.rows.length,
  };

  if (!prepared.validation.valid) {
    console.log(JSON.stringify({
      mode: args.dryRun ? "dry-run" : "write",
      status: "invalid",
      input: args.input,
      province: args.province ?? null,
      parent: args.parent ?? null,
      level: args.level ?? null,
      summary,
      issues: prepared.validation.issues,
    }, null, 2));
    process.exitCode = 1;
    return;
  }

  if (args.dryRun) {
    console.log(JSON.stringify({
      mode: "dry-run",
      status: "ok",
      input: args.input,
      province: args.province ?? null,
      parent: args.parent ?? null,
      level: args.level ?? null,
      summary,
      issues: prepared.validation.issues,
      write: {
        executed: false,
        reason: "--dry-run is enabled",
      },
    }, null, 2));
    return;
  }

  if (isTemplateEnvPath(args.envPath)) {
    throw new Error("当前读取的是模板 env，不能用于 admin_regions 写入。请使用 --env=.env.local。");
  }

  const env = parseEnvFile(args.envPath);
  const writeResult = await writeAdminRegions(prepared.rows, env);

  console.log(JSON.stringify({
    mode: "write",
    status: "ok",
    input: args.input,
    province: args.province ?? null,
    parent: args.parent ?? null,
    level: args.level ?? null,
    envFile: envFileForOutput(args.envPath),
    summary,
    writeResult,
  }, null, 2));
}

main().catch((error: unknown) => {
  const cause = error instanceof Error && "cause" in error
    ? (error as Error & { cause?: unknown }).cause
    : undefined;

  console.error(JSON.stringify({
    mode: "import",
    status: "failed",
    error: {
      code: "admin_region_import_failed",
      message: error instanceof Error ? error.message : "Admin region import failed.",
      cause: cause instanceof Error ? cause.message : cause ? String(cause) : undefined,
    },
  }, null, 2));
  process.exitCode = 1;
});
