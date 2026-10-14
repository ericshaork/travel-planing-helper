const { existsSync, readFileSync } = require("node:fs");
const { resolve } = require("node:path");

type CliArgs = {
  input: string;
  province?: string;
  parent?: string;
  level?: string;
};

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
  };
}

function readAdminRegionInput(inputPath: string) {
  const absolutePath = resolve(process.cwd(), inputPath);

  if (!existsSync(absolutePath)) {
    throw new Error(`Admin region input not found: ${inputPath}`);
  }

  const parsed = JSON.parse(readFileSync(absolutePath, "utf8"));
  const records = Array.isArray(parsed) ? parsed : parsed.regions;

  if (!Array.isArray(records)) {
    throw new Error("Admin region input must be an array or an object with a regions array.");
  }

  return records;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { prepareAdminRegionImportRows } = await import("../src/server/data-hub/admin/importer.ts");
  const records = readAdminRegionInput(args.input);
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

  console.log(JSON.stringify({
    mode: "validate",
    input: args.input,
    province: args.province ?? null,
    parent: args.parent ?? null,
    level: args.level ?? null,
    valid: prepared.validation.valid,
    summary: prepared.validation.summary,
    issues: prepared.validation.issues,
  }, null, 2));

  if (!prepared.validation.valid) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(JSON.stringify({
    mode: "validate",
    status: "failed",
    error: {
      code: "admin_region_validation_failed",
      message: error instanceof Error ? error.message : "Admin region validation failed.",
    },
  }, null, 2));
  process.exitCode = 1;
});
