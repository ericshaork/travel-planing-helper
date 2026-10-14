import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { parseDotEnvFile } from "../src/server/storage/ossStorage.ts";

type AssetCategory = "admin" | "poi" | "tile" | "manifest" | "doc" | "temp";
type AssetLocation = "local" | "supabase" | "oss" | "mixed";
type StorageTarget = "git" | "raw OSS" | "public OSS" | "Supabase" | "temp";
type LaterAction = "keep" | "archive" | "compare" | "replace" | "uploadPublic" | "uploadRaw";

type InventoryAsset = {
  assetId: string;
  category: AssetCategory;
  currentLocation: AssetLocation;
  currentPath: string;
  intendedStorageTarget: StorageTarget;
  productionApproved: boolean;
  licenseRisk: "low" | "medium" | "high" | "unknown";
  shouldMoveNow: false;
  laterAction: LaterAction;
  notes: string;
  sizeBytes?: number;
  fileCount?: number;
  sourceManifestId?: string;
  manifestSummary?: Record<string, unknown>;
};

type SupabaseSummary = {
  status: "checked" | "skipped";
  table: "admin_regions";
  totalCount: number | null;
  levelCounts: Record<string, number | null>;
  notes: string;
};

type InventoryOutput = {
  phase: "G3.5";
  generatedAt: string;
  scope: string[];
  assets: InventoryAsset[];
  sourceManifestSummary: Record<string, unknown>[];
  supabase: SupabaseSummary;
  conclusions: {
    baselineAssets: string[];
    experimentalAssets: string[];
    shouldMoveToOssLater: string[];
    leaveUntouched: string[];
  };
};

const ROOT = process.cwd();
const ENV_PATH = "WANDERLY_V2_FULL_ENV_TEMPLATE.env.local";
const JSON_OUT = "data/source-manifests/map-assets.current-inventory.json";
const DOC_OUT = "docs/WANDERLY_V2_MAP_ASSET_CURRENT_INVENTORY.md";

const MANIFEST_FILES = [
  "data/source-manifests/admin-cn-2025-reviewed-geojson.manifest.json",
  "data/source-manifests/admin-cn-pmtiles-gcj02-current.manifest.json",
  "data/source-manifests/poi-cn-attractions-2025.manifest.json",
  "data/source-manifests/storage-targets.json",
  "data/source-manifests/admin-source-comparison.g1.json",
  "data/source-manifests/admin-source-comparison.g2-samples.json",
];

function posixPath(path: string): string {
  return path.replace(/\\/g, "/");
}

function fileSize(path: string): number {
  return statSync(resolve(ROOT, path)).size;
}

function listFiles(dir: string): string[] {
  const absolute = resolve(ROOT, dir);
  if (!existsSync(absolute)) {
    return [];
  }

  const files: string[] = [];
  const visit = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const absoluteEntry = join(current, entry.name);
      if (entry.isDirectory()) {
        visit(absoluteEntry);
      } else if (entry.isFile()) {
        files.push(posixPath(relative(ROOT, absoluteEntry)));
      }
    }
  };
  visit(absolute);
  return files.sort();
}

function safeJson(path: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(resolve(ROOT, path), "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function manifestId(path: string, json: Record<string, unknown> | null): string {
  const explicit =
    json?.datasetId ??
    json?.assetId ??
    json?.id ??
    json?.name ??
    json?.sourceId ??
    json?.phase ??
    path.replace(/^data\/source-manifests\//, "").replace(/\.json$/, "");
  return String(explicit);
}

function nestedRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function manifestLicenseRisk(json: Record<string, unknown> | null): string {
  const license = nestedRecord(json?.license);
  return String(json?.licenseRisk ?? license?.riskLevel ?? json?.riskLevel ?? "unknown");
}

function summarizeManifest(path: string): Record<string, unknown> {
  const json = safeJson(path);
  const source = nestedRecord(json?.source);
  return {
    path,
    exists: existsSync(resolve(ROOT, path)),
    sizeBytes: existsSync(resolve(ROOT, path)) ? fileSize(path) : null,
    manifestId: manifestId(path, json),
    productionApproved: Boolean(json?.productionApproved),
    licenseRisk: manifestLicenseRisk(json),
    sourceName: source?.sourceName ?? json?.sourceName ?? json?.name ?? json?.phase ?? null,
  };
}

function makeAsset(input: Omit<InventoryAsset, "shouldMoveNow">): InventoryAsset {
  return { ...input, shouldMoveNow: false };
}

function adminAsset(path: string): InventoryAsset {
  const ext = extname(path).toLowerCase();
  const isReadme = ext === ".md";
  return makeAsset({
    assetId: `local-admin-${path.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase()}`,
    category: "admin",
    currentLocation: "local",
    currentPath: path,
    intendedStorageTarget: isReadme ? "git" : "raw OSS",
    productionApproved: false,
    licenseRisk: isReadme ? "low" : "high",
    laterAction: isReadme ? "keep" : "uploadRaw",
    notes: isReadme
      ? "Local documentation for admin data staging; keep in git."
      : "Local administrative geometry artifact. Current source is still a candidate/baseline, not a production-trusted source.",
    sizeBytes: fileSize(path),
  });
}

function tileAsset(path: string): InventoryAsset {
  const isChinaCurrent = path.endsWith("china-admin-boundaries-gcj02.pmtiles");
  return makeAsset({
    assetId: `public-tile-${path.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase()}`,
    category: "tile",
    currentLocation: "local",
    currentPath: path,
    intendedStorageTarget: "public OSS",
    productionApproved: false,
    licenseRisk: "high",
    laterAction: isChinaCurrent ? "uploadPublic" : "archive",
    notes: isChinaCurrent
      ? "Current nationwide GCJ-02 PMTiles baseline for performance and LOD validation; not production-approved."
      : "Experimental Guangdong/admin PMTiles variant; keep as local experiment until G4/G5 cleanup.",
    sizeBytes: fileSize(path),
  });
}

function manifestAsset(path: string): InventoryAsset {
  const summary = summarizeManifest(path);
  const licenseRisk = String(summary.licenseRisk);
  return makeAsset({
    assetId: `manifest-${path.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase()}`,
    category: "manifest",
    currentLocation: "local",
    currentPath: path,
    intendedStorageTarget: "git",
    productionApproved: Boolean(summary.productionApproved),
    licenseRisk: licenseRisk === "low" || licenseRisk === "medium" || licenseRisk === "high" ? licenseRisk : "unknown",
    laterAction: "keep",
    notes: "Source or storage manifest used to track provenance, risk, and target storage policy.",
    sizeBytes: summary.sizeBytes as number | undefined,
    sourceManifestId: String(summary.manifestId),
    manifestSummary: summary,
  });
}

function docAsset(path: string): InventoryAsset {
  return makeAsset({
    assetId: `doc-${path.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase()}`,
    category: "doc",
    currentLocation: "local",
    currentPath: path,
    intendedStorageTarget: "git",
    productionApproved: true,
    licenseRisk: "low",
    laterAction: "keep",
    notes: "Project documentation for map data, admin boundaries, PMTiles, or data hub decisions.",
    sizeBytes: fileSize(path),
  });
}

function tempSummaryAsset(dir: string): InventoryAsset {
  const files = listFiles(dir);
  const sizeBytes = files.reduce((sum, path) => sum + fileSize(path), 0);
  const pmtilesLike = files.filter((path) => [".mbtiles", ".pmtiles"].includes(extname(path).toLowerCase())).length;
  const geojsonLike = files.filter((path) => extname(path).toLowerCase() === ".geojson").length;
  return makeAsset({
    assetId: "temp-admin-tile-prototype-summary",
    category: "temp",
    currentLocation: "local",
    currentPath: dir,
    intendedStorageTarget: "temp",
    productionApproved: false,
    licenseRisk: "high",
    laterAction: "archive",
    notes: `Temporary admin tile prototype outputs only. Contains ${files.length} files, including ${pmtilesLike} tile-package files and ${geojsonLike} GeoJSON files. Do not copy or publish as-is.`,
    sizeBytes,
    fileCount: files.length,
  });
}

function discoverDocFiles(): string[] {
  return listFiles("docs").filter((path) => {
    const name = path.split("/").pop() ?? "";
    return /(MAP|ADMIN|PMTILES|DATA)/i.test(name);
  });
}

async function countSupabaseLevel(url: string, apiKey: string, level?: string): Promise<number | null> {
  const endpoint = new URL("/rest/v1/admin_regions", url);
  endpoint.searchParams.set("select", "id");
  if (level) {
    endpoint.searchParams.set("level", `eq.${level}`);
  }

  const response = await fetch(endpoint, {
    method: "HEAD",
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      Prefer: "count=exact",
      Range: "0-0",
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase count failed with HTTP ${response.status}`);
  }

  const range = response.headers.get("content-range");
  const total = range?.match(/\/(\d+)$/)?.[1];
  return total ? Number(total) : null;
}

async function readSupabaseSummary(): Promise<SupabaseSummary> {
  try {
    const env = existsSync(resolve(ROOT, ENV_PATH)) ? parseDotEnvFile(ENV_PATH) : {};
    const url = env.NEXT_PUBLIC_SUPABASE_URL;
    const apiKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !apiKey) {
      return {
        status: "skipped",
        table: "admin_regions",
        totalCount: null,
        levelCounts: { province: null, prefecture: null, county: null },
        notes: `Skipped because ${ENV_PATH} does not provide Supabase URL and API key.`,
      };
    }

    const [totalCount, province, prefecture, county] = await Promise.all([
      countSupabaseLevel(url, apiKey),
      countSupabaseLevel(url, apiKey, "province"),
      countSupabaseLevel(url, apiKey, "prefecture"),
      countSupabaseLevel(url, apiKey, "county"),
    ]);

    return {
      status: "checked",
      table: "admin_regions",
      totalCount,
      levelCounts: { province, prefecture, county },
      notes: "Read-only REST HEAD count check. Geometry was not selected.",
    };
  } catch (error) {
    return {
      status: "skipped",
      table: "admin_regions",
      totalCount: null,
      levelCounts: { province: null, prefecture: null, county: null },
      notes: `Skipped because remote count check failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function buildConclusions(assets: InventoryAsset[]): InventoryOutput["conclusions"] {
  return {
    baselineAssets: assets
      .filter((asset) => asset.currentPath.includes("china-admin-boundaries-gcj02.pmtiles") || asset.currentPath.includes("admin-cn-2025-reviewed-geojson"))
      .map((asset) => asset.assetId),
    experimentalAssets: assets
      .filter((asset) => asset.category === "temp" || asset.currentPath.includes("guangdong-admin-boundaries"))
      .map((asset) => asset.assetId),
    shouldMoveToOssLater: assets
      .filter((asset) => asset.laterAction === "uploadRaw" || asset.laterAction === "uploadPublic")
      .map((asset) => asset.assetId),
    leaveUntouched: assets
      .filter((asset) => asset.laterAction === "keep" || asset.laterAction === "archive" || asset.laterAction === "compare")
      .map((asset) => asset.assetId),
  };
}

function supabaseAsset(summary: SupabaseSummary): InventoryAsset {
  const levelText =
    summary.status === "checked"
      ? `total=${summary.totalCount}, province=${summary.levelCounts.province}, prefecture=${summary.levelCounts.prefecture}, county=${summary.levelCounts.county}`
      : summary.notes;

  return makeAsset({
    assetId: "supabase-admin-regions",
    category: "admin",
    currentLocation: "supabase",
    currentPath: "public.admin_regions",
    intendedStorageTarget: "Supabase",
    productionApproved: false,
    licenseRisk: "high",
    laterAction: "keep",
    notes: `Read-only inventory of imported admin regions. ${levelText}. Geometry was not selected during G3.5.`,
  });
}

function renderDoc(output: InventoryOutput): string {
  const rows = output.assets
    .map(
      (asset) =>
        `| \`${asset.assetId}\` | ${asset.category} | ${asset.currentLocation} | \`${asset.currentPath}\` | ${asset.intendedStorageTarget} | ${asset.productionApproved} | ${asset.licenseRisk} | ${asset.laterAction} | ${asset.shouldMoveNow} |`,
    )
    .join("\n");

  const manifestRows = output.sourceManifestSummary
    .map(
      (manifest) =>
        `| \`${manifest.manifestId}\` | \`${manifest.path}\` | ${manifest.productionApproved} | ${manifest.licenseRisk} | ${manifest.sizeBytes ?? "n/a"} |`,
    )
    .join("\n");

  return `# Wanderly v2.0 Map Asset Current Inventory

Phase: G3.5 Existing Map Asset Inventory  
Generated: ${output.generatedAt}

This inventory is read-only. It does not move, delete, rename, upload, download, re-import Supabase data, replace PMTiles, or change Map Studio UI.

## Supabase Read-Only Check

| Table | Status | Total | Province | Prefecture | County | Notes |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| \`${output.supabase.table}\` | ${output.supabase.status} | ${output.supabase.totalCount ?? "n/a"} | ${output.supabase.levelCounts.province ?? "n/a"} | ${output.supabase.levelCounts.prefecture ?? "n/a"} | ${output.supabase.levelCounts.county ?? "n/a"} | ${output.supabase.notes} |

## Source Manifest Summary

| Manifest | Path | productionApproved | licenseRisk | Size |
| --- | --- | --- | --- | ---: |
${manifestRows}

## Unified Asset Index

| assetId | category | location | path | target | productionApproved | licenseRisk | laterAction | shouldMoveNow |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
${rows}

## Before G4 Conclusions

Baseline assets to keep using for engineering comparison:

${output.conclusions.baselineAssets.map((id) => `- \`${id}\``).join("\n") || "- None"}

Experimental assets only:

${output.conclusions.experimentalAssets.map((id) => `- \`${id}\``).join("\n") || "- None"}

Assets that should move to OSS later:

${output.conclusions.shouldMoveToOssLater.map((id) => `- \`${id}\``).join("\n") || "- None"}

Assets to leave untouched now:

${output.conclusions.leaveUntouched.map((id) => `- \`${id}\``).join("\n") || "- None"}

## G4 Entry Notes

- Current 2025 administrative GeoJSON/SHP remains a baseline engineering source, not a production-trusted source.
- Current nationwide GCJ-02 PMTiles remains the runtime and performance baseline, with \`productionApproved=false\`.
- Guangdong PMTiles variants and \`temp/admin-tile-prototype/\` outputs are experiments; keep them for comparison, but do not publish or replace current PMTiles.
- Raw and normalized administrative assets are candidates for raw OSS storage after G4 source acquisition and license review.
- Public PMTiles and browser-readable manifests should move to public OSS only through a publish step that writes source manifests, sha256, and explicit object ACL/public policy.
`;
}

async function main(): Promise<void> {
  const assets: InventoryAsset[] = [];

  assets.push(...listFiles("data/admin").map(adminAsset));
  assets.push(...listFiles("public/admin-tiles").map(tileAsset));
  assets.push(tempSummaryAsset("temp/admin-tile-prototype"));
  assets.push(...MANIFEST_FILES.filter((path) => existsSync(resolve(ROOT, path))).map(manifestAsset));
  assets.push(...discoverDocFiles().map(docAsset));

  const sourceManifestSummary = MANIFEST_FILES.map(summarizeManifest);
  const supabase = await readSupabaseSummary();
  assets.push(supabaseAsset(supabase));
  const output: InventoryOutput = {
    phase: "G3.5",
    generatedAt: new Date().toISOString(),
    scope: ["data/admin", "data/source-manifests", "public/admin-tiles", "temp/admin-tile-prototype", "docs map/admin/pmtiles/data docs", "supabase admin_regions counts"],
    assets,
    sourceManifestSummary,
    supabase,
    conclusions: buildConclusions(assets),
  };

  mkdirSync(resolve(ROOT, "data/source-manifests"), { recursive: true });
  mkdirSync(resolve(ROOT, "docs"), { recursive: true });
  writeFileSync(resolve(ROOT, JSON_OUT), `${JSON.stringify(output, null, 2)}\n`, "utf8");
  writeFileSync(resolve(ROOT, DOC_OUT), renderDoc(output), "utf8");

  process.stdout.write(
    JSON.stringify(
      {
        ok: true,
        phase: output.phase,
        assetCount: assets.length,
        sourceManifestCount: sourceManifestSummary.length,
        supabase: output.supabase,
        outputs: [JSON_OUT, DOC_OUT],
      },
      null,
      2,
    ) + "\n",
  );
}

void main();
