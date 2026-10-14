const { existsSync, readFileSync } = require("node:fs");
const { resolve } = require("node:path");

type CliArgs = {
  provider: string;
  targetType: string;
  query?: string;
  limit?: number;
  locale?: string;
  region?: string;
  routeMode?: string;
};

const DEFAULT_ENV_PATH = resolve(process.cwd(), "WANDERLY_V2_FULL_ENV_TEMPLATE.env.local");

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

function parseArgs(argv: string[]): CliArgs & { envPath: string } {
  const parsed: Record<string, string> = {};
  for (const item of argv) {
    const match = item.match(/^--([^=]+)=(.*)$/);
    if (match) parsed[match[1]] = match[2];
  }

  return {
    provider: parsed.provider ?? "amap",
    targetType: parsed.target ?? parsed.targetType ?? "place",
    query: parsed.query,
    limit: parsed.limit ? Number(parsed.limit) : undefined,
    locale: parsed.locale,
    region: parsed.region,
    routeMode: parsed.mode,
    envPath: parsed.env ? resolve(process.cwd(), parsed.env) : DEFAULT_ENV_PATH,
  };
}

async function main() {
  const { runProviderIngest } = await import("../src/server/data-hub/ingest/providerIngestRegistry.ts");
  const args = parseArgs(process.argv.slice(2));
  const env = parseEnvFile(args.envPath);
  const result = await runProviderIngest(
    {
      provider: args.provider,
      mode: "dry_run",
      targetType: args.targetType,
      query: args.query,
      limit: args.limit,
      locale: args.locale,
      region: args.region,
      routeMode: args.routeMode,
    },
    env,
  );

  console.log(JSON.stringify({
    envFile: args.envPath.replace(process.cwd(), "."),
    ...result,
  }, null, 2));
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : "Unknown datahub ingest dry-run error.";
  console.error(JSON.stringify({
    provider: "unknown",
    mode: "dry_run",
    status: "failed",
    error: {
      code: "cli_failed",
      message,
    },
  }, null, 2));
  process.exitCode = 1;
});
