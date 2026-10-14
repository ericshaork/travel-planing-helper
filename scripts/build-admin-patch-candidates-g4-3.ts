import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { sha256Hex } from "../src/server/storage/ossStorage.ts";

type PatchType = "replaceBoundary" | "refineBoundary" | "coastlineMask" | "islandPatch" | "referenceOnly";
type TargetLevel = "province" | "prefecture" | "county" | "coastline";

type GeoJsonFeature = {
  type: "Feature";
  properties?: Record<string, unknown>;
  geometry?: GeoJsonGeometry | null;
};

type GeoJsonGeometry = {
  type: string;
  coordinates?: unknown;
  geometries?: GeoJsonGeometry[];
};

type FeatureCollection = {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
  properties?: Record<string, unknown>;
};

type PatchCandidate = {
  patchId: string;
  region: string;
  source: string;
  targetLevel: TargetLevel;
  targetAdcodes: string[];
  patchType: PatchType;
  confidence: "low" | "medium" | "high";
  licenseRisk: "medium" | "high" | "unknown";
  productionApproved: false;
  geometryStats: GeometryStats | null;
  baselineStats?: GeometryStats | null;
  sourcePath: string | null;
  outputPath: string | null;
  notes: string;
};

type GeometryStats = {
  featureCount: number;
  geometryTypes: Record<string, number>;
  vertexCount: number;
  polygonPartCount: number;
  bbox: [number, number, number, number] | null;
  hasAdcode: boolean;
  hasName: boolean;
  hasLevel: boolean;
  hasParent: boolean;
  countyFeatureCount: number;
  sizeBytes?: number;
  sha256?: string;
};

type RegionConfig = {
  id: string;
  name: string;
  risk: "admin_precision" | "coastal_patch" | "mixed";
  targetAdcodes: string[];
  baselinePrefixes: string[];
  baselineExact?: string[];
  notes: string;
};

type Output = {
  phase: "G4.3";
  generatedAt: string;
  outputDir: string;
  patchCandidates: PatchCandidate[];
  coastlinePlan: {
    requiredDownloads: Array<{
      sourceId: string;
      url: string;
      sizeBytes: number | null;
      contentType: string | null;
      downloadNow: false;
      reason: string;
    }>;
    clippingStrategy: string[];
    estimatedTempSize: string;
    archiveStrategy: string;
    licenseRisk: string;
    needsRegionalClippingScript: boolean;
  };
  recommendations: {
    datavImprovesCountyPrecision: string;
    datavPatchMode: string;
    priorityPatchRegions: string[];
    coastlineNeedsLargeDownload: boolean;
    coastlineArchiveStrategy: string;
    shouldBuildGuangdongPatchPmtiles: boolean;
    nextStep: string;
  };
};

const ROOT = process.cwd();
const QUALITY_PATH = "data/source-manifests/admin-source-quality-compare.g4-2.json";
const CRAWL_PATH = "data/source-manifests/map-source-crawl.g4-samples.json";
const OUT_DIR = "temp/admin-patch-g4-3";
const OUT_JSON = "data/source-manifests/admin-patch-candidates.g4-3.json";
const OUT_DOC = "docs/WANDERLY_V2_ADMIN_PATCH_CANDIDATE_G4_3.md";

const REGIONS: RegionConfig[] = [
  {
    id: "shenzhen-dongguan-huizhou",
    name: "深圳 / 东莞 / 惠州",
    risk: "admin_precision",
    targetAdcodes: ["440300", "441900", "441300"],
    baselinePrefixes: ["4403", "4419", "4413"],
    notes: "县区级边界补强优先样本。",
  },
  {
    id: "guangzhou-foshan",
    name: "广州 / 佛山",
    risk: "admin_precision",
    targetAdcodes: ["440100", "440600"],
    baselinePrefixes: ["4401", "4406"],
    notes: "广佛同城县区边界补强样本。",
  },
  {
    id: "xiamen-coastal",
    name: "厦门沿海",
    risk: "coastal_patch",
    targetAdcodes: ["350200"],
    baselinePrefixes: ["3502"],
    notes: "沿海、海岛和河口 patch 样本。",
  },
  {
    id: "zhoushan-islands",
    name: "舟山群岛",
    risk: "coastal_patch",
    targetAdcodes: ["330900"],
    baselinePrefixes: ["3309"],
    notes: "小岛和群岛 patch 高优先级样本。",
  },
  {
    id: "shanghai-coastal",
    name: "上海沿海 / 崇明",
    risk: "coastal_patch",
    targetAdcodes: ["310000", "310151"],
    baselinePrefixes: ["310"],
    baselineExact: ["310151"],
    notes: "长江口、崇明和沿海新成陆区域。",
  },
  {
    id: "hangzhou-bay",
    name: "杭州湾",
    risk: "coastal_patch",
    targetAdcodes: ["330100", "330200", "330400"],
    baselinePrefixes: ["3301", "3302", "3304"],
    notes: "G4.1 未下载外部样本，先做 pending/reference 记录。",
  },
];

function absolute(path: string): string {
  return resolve(ROOT, path);
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(absolute(path), "utf8")) as T;
}

function ensureDir(path: string): void {
  mkdirSync(absolute(path), { recursive: true });
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(absolute(path)), { recursive: true });
  writeFileSync(absolute(path), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function listFiles(dir: string): string[] {
  const root = absolute(dir);
  if (!existsSync(root)) return [];
  const files: string[] = [];
  const visit = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) visit(path);
      if (entry.isFile()) files.push(relative(ROOT, path).replace(/\\/g, "/"));
    }
  };
  visit(root);
  return files.sort();
}

function geoJson(path: string): FeatureCollection {
  const json = readJson<Record<string, unknown>>(path);
  if (json.type === "FeatureCollection" && Array.isArray(json.features)) {
    return json as FeatureCollection;
  }
  if (json.type === "Feature" && json.geometry) {
    return { type: "FeatureCollection", features: [json as GeoJsonFeature] };
  }
  return { type: "FeatureCollection", features: [] };
}

function geometryStats(collection: FeatureCollection, sourcePath?: string): GeometryStats {
  const geometryTypes: Record<string, number> = {};
  let vertexCount = 0;
  let polygonPartCount = 0;
  let minLng = Number.POSITIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  const keys = new Set<string>();
  let countyFeatureCount = 0;

  for (const feature of collection.features) {
    const type = feature.geometry?.type ?? "null";
    geometryTypes[type] = (geometryTypes[type] ?? 0) + 1;
    vertexCount += countCoordinatePairs(feature.geometry?.coordinates);
    polygonPartCount += countPolygonParts(feature.geometry);
    collectCoordinates(feature.geometry, (lng, lat) => {
      minLng = Math.min(minLng, lng);
      minLat = Math.min(minLat, lat);
      maxLng = Math.max(maxLng, lng);
      maxLat = Math.max(maxLat, lat);
    });
    const props = feature.properties ?? {};
    for (const key of Object.keys(props)) keys.add(key);
    const level = String(props.level ?? "");
    const adcode = String(props.adcode ?? props.code ?? props.gb ?? "");
    if (/district|county|区|县/.test(level) || (adcode.length === 6 && !adcode.endsWith("00"))) {
      countyFeatureCount += 1;
    }
  }

  const lowerKeys = Array.from(keys).map((key) => key.toLowerCase());
  const stat: GeometryStats = {
    featureCount: collection.features.length,
    geometryTypes,
    vertexCount,
    polygonPartCount,
    bbox: Number.isFinite(minLng) ? [minLng, minLat, maxLng, maxLat] : null,
    hasAdcode: lowerKeys.some((key) => ["adcode", "code", "gb"].includes(key)),
    hasName: lowerKeys.some((key) => ["name", "fullname"].includes(key)),
    hasLevel: lowerKeys.includes("level"),
    hasParent: lowerKeys.includes("parent") || lowerKeys.includes("parentadcode") || lowerKeys.includes("parent_adcode"),
    countyFeatureCount,
  };

  if (sourcePath && existsSync(absolute(sourcePath))) {
    const bytes = readFileSync(absolute(sourcePath));
    stat.sizeBytes = bytes.byteLength;
    stat.sha256 = sha256Hex(bytes);
  }
  return stat;
}

function countCoordinatePairs(value: unknown): number {
  if (!Array.isArray(value)) return 0;
  if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") return 1;
  return value.reduce((sum, child) => sum + countCoordinatePairs(child), 0);
}

function countPolygonParts(geometry: GeoJsonGeometry | null | undefined): number {
  if (!geometry) return 0;
  if (geometry.type === "Polygon") return 1;
  if (geometry.type === "MultiPolygon" && Array.isArray(geometry.coordinates)) return geometry.coordinates.length;
  if (geometry.type === "GeometryCollection") return (geometry.geometries ?? []).reduce((sum, child) => sum + countPolygonParts(child), 0);
  return 0;
}

function collectCoordinates(geometry: GeoJsonGeometry | null | undefined, visit: (lng: number, lat: number) => void): void {
  if (!geometry) return;
  if (geometry.type === "GeometryCollection") {
    for (const child of geometry.geometries ?? []) collectCoordinates(child, visit);
    return;
  }
  const walk = (value: unknown): void => {
    if (!Array.isArray(value)) return;
    if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") {
      visit(value[0], value[1]);
      return;
    }
    for (const child of value) walk(child);
  };
  walk(geometry.coordinates);
}

function baselineCollection(region: RegionConfig): FeatureCollection {
  const county = readJson<{ regions: Array<Record<string, unknown>> }>("data/admin/normalized/china-county-admin-regions.geometry.json");
  const prefecture = readJson<{ regions: Array<Record<string, unknown>> }>("data/admin/normalized/china-prefecture-admin-regions.geometry.json");
  const regions = [...prefecture.regions, ...county.regions].filter((entry) => {
    const adcode = String(entry.adcode ?? "");
    const prefectureAdcode = String(entry.prefectureAdcode ?? "");
    return Boolean(region.baselineExact?.includes(adcode)) ||
      region.baselinePrefixes.some((prefix) => adcode.startsWith(prefix) || prefectureAdcode.startsWith(prefix));
  });
  return {
    type: "FeatureCollection",
    features: regions.map((entry) => ({
      type: "Feature",
      properties: {
        adcode: entry.adcode,
        name: entry.name,
        level: entry.level,
        parent: entry.parentAdcode,
        provinceAdcode: entry.provinceAdcode,
        prefectureAdcode: entry.prefectureAdcode,
      },
      geometry: entry.geometry as GeoJsonGeometry,
    })),
  };
}

function datavFiles(region: RegionConfig): string[] {
  return listFiles(`temp/map-source-samples-g4/datav/2026-10-12/${region.id}`).filter((path) => path.endsWith(".geojson"));
}

function geojsoncnFiles(region: RegionConfig): string[] {
  return listFiles(`temp/map-source-samples-g4/geojsoncn/2026-10-12/${region.id}`).filter((path) => path.endsWith(".geojson"));
}

function mergeFeatureCollections(files: string[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: files.flatMap((file) => geoJson(file).features),
  };
}

function patchTypeFor(region: RegionConfig, source: string, stats: GeometryStats, baseline: GeometryStats): PatchType {
  if (source === "geojsoncn") return "referenceOnly";
  if (region.risk === "admin_precision" && stats.countyFeatureCount > 0 && stats.vertexCount > baseline.vertexCount * 1.2) return "refineBoundary";
  if (region.risk === "coastal_patch" && stats.polygonPartCount > baseline.polygonPartCount && stats.vertexCount > baseline.vertexCount) return "islandPatch";
  return "referenceOnly";
}

function confidenceFor(type: PatchType, stats: GeometryStats, baseline: GeometryStats): "low" | "medium" | "high" {
  if (type === "referenceOnly") return "low";
  if (stats.hasAdcode && stats.hasName && stats.hasLevel && stats.vertexCount > baseline.vertexCount * 2) return "medium";
  return "low";
}

function targetLevelFor(region: RegionConfig, type: PatchType): TargetLevel {
  if (type === "coastlineMask" || region.risk === "coastal_patch") return type === "referenceOnly" ? "county" : "coastline";
  return "county";
}

function writeCandidateGeoJson(region: RegionConfig, source: string, collection: FeatureCollection): string {
  const out = `${OUT_DIR}/${source}/${region.id}.patch-candidate.geojson`;
  writeJson(out, {
    type: "FeatureCollection",
    properties: {
      phase: "G4.3",
      region: region.id,
      source,
      productionApproved: false,
      notes: "Patch candidate only; does not replace baseline.",
    },
    features: collection.features,
  });
  return out;
}

function candidateFromCollection(region: RegionConfig, source: string, files: string[], baselineStats: GeometryStats): PatchCandidate {
  const collection = mergeFeatureCollections(files);
  const stats = geometryStats(collection, files.length === 1 ? files[0] : undefined);
  const patchType = patchTypeFor(region, source, stats, baselineStats);
  const outputPath = writeCandidateGeoJson(region, source, collection);
  return {
    patchId: `g4-3-${source}-${region.id}`,
    region: region.id,
    source,
    targetLevel: targetLevelFor(region, patchType),
    targetAdcodes: region.targetAdcodes,
    patchType,
    confidence: confidenceFor(patchType, stats, baselineStats),
    licenseRisk: "high",
    productionApproved: false,
    geometryStats: stats,
    baselineStats,
    sourcePath: files.join(";"),
    outputPath,
    notes: patchType === "referenceOnly"
      ? `${source} sample is useful as reference, but field coverage, level match, or license risk prevents replacement/refinement.`
      : `${source} has higher structural detail than baseline for this region; candidate for manual visual patch review.`,
  };
}

function referenceCandidate(region: RegionConfig, source: string, notes: string, baselineStats?: GeometryStats): PatchCandidate {
  return {
    patchId: `g4-3-${source}-${region.id}-reference`,
    region: region.id,
    source,
    targetLevel: source === "osm-coastline" ? "coastline" : "county",
    targetAdcodes: region.targetAdcodes,
    patchType: source === "osm-coastline" ? "coastlineMask" : "referenceOnly",
    confidence: "low",
    licenseRisk: source === "osm-coastline" ? "medium" : "high",
    productionApproved: false,
    geometryStats: null,
    baselineStats,
    sourcePath: null,
    outputPath: null,
    notes,
  };
}

function buildCandidates(): PatchCandidate[] {
  const candidates: PatchCandidate[] = [];
  for (const region of REGIONS) {
    const baselineStats = geometryStats(baselineCollection(region));
    const dataFiles = datavFiles(region);
    if (dataFiles.length > 0) {
      candidates.push(candidateFromCollection(region, "datav", dataFiles, baselineStats));
    } else {
      candidates.push(referenceCandidate(region, "datav", "No DataV sample was downloaded in G4.1; keep as pending/reference only.", baselineStats));
    }

    const geoFiles = geojsoncnFiles(region);
    if (geoFiles.length > 0) {
      candidates.push(candidateFromCollection(region, "geojsoncn", geoFiles, baselineStats));
    }

    if (region.risk === "coastal_patch") {
      candidates.push(referenceCandidate(region, "osm-coastline", "No large OSM coastline package downloaded. Candidate requires regional clipping from osmdata coastline/land/water packages.", baselineStats));
    }
  }
  return candidates;
}

function coastlinePlan() {
  const quality = readJson<{ pendingLargeDownload: Array<{ sourceId: string; url: string; sizeBytes: number | null; contentType: string | null }> }>(QUALITY_PATH);
  const required = quality.pendingLargeDownload
    .filter((item) => item.sourceId === "osm-coastline")
    .map((item) => ({
      sourceId: item.sourceId,
      url: item.url,
      sizeBytes: item.sizeBytes,
      contentType: item.contentType,
      downloadNow: false as const,
      reason: "Over 100MB. Needs explicit approval and regional clipping workflow.",
    }));
  return {
    requiredDownloads: required,
    clippingStrategy: [
      "Download osmdata coastline/land/water ZIPs only after approval.",
      "Unpack to a temp working directory outside frontend/public paths.",
      "Use ogr2ogr or equivalent GDAL tooling to clip by buffered Guangdong/Fujian/Zhejiang/Shanghai coastal bbox.",
      "Convert clipped coastline/land/water features into coastline guide or mask GeoJSON.",
      "Compare clipped guide with DataV/baseline county polygons before any PMTiles experiment.",
    ],
    estimatedTempSize: "At least 2.7GB compressed source plus clipped intermediates; budget 5-8GB temp workspace for coastline, land, and water packages.",
    archiveStrategy: "Archive original package metadata and clipped samples to raw OSS under raw/coastline/osm-coastline/{date}/samples/; do not publish public OSS until ODbL strategy is approved.",
    licenseRisk: "medium: ODbL attribution/share-alike strategy required before production use.",
    needsRegionalClippingScript: true,
  };
}

function recommendations(candidates: PatchCandidate[]): Output["recommendations"] {
  const refine = candidates.filter((candidate) => candidate.source === "datav" && candidate.patchType !== "referenceOnly");
  return {
    datavImprovesCountyPrecision: refine.length > 0
      ? "Yes for selected samples: DataV has higher vertex counts and usable adcode/name/level/parent fields in Shenzhen-Dongguan-Huizhou, Guangzhou-Foshan, and several coastal samples."
      : "Not proven in this run.",
    datavPatchMode: "DataV should be used as refineBoundary/islandPatch candidate for manual comparison, not direct replaceBoundary, because license and visual alignment are not production-cleared.",
    priorityPatchRegions: refine.map((candidate) => candidate.region),
    coastlineNeedsLargeDownload: true,
    coastlineArchiveStrategy: "Keep only metadata now. After approval, download large osmdata packages into temp, clip regionally, and upload raw clipped samples/metadata to raw OSS.",
    shouldBuildGuangdongPatchPmtiles: true,
    nextStep: "Generate a Guangdong-only patch PMTiles comparison from baseline + DataV candidate layers as an experimental artifact, after adding visual diff checks and keeping productionApproved=false.",
  };
}

function renderDoc(output: Output): string {
  const row = (cells: unknown[]) => `| ${cells.map((cell) => String(cell ?? "").replace(/\n/g, " ")).join(" | ")} |`;
  const rows = output.patchCandidates.map((candidate) =>
    row([
      candidate.patchId,
      candidate.region,
      candidate.source,
      candidate.targetLevel,
      candidate.patchType,
      candidate.confidence,
      candidate.geometryStats?.featureCount ?? "n/a",
      candidate.geometryStats?.vertexCount ?? "n/a",
      candidate.baselineStats?.vertexCount ?? "n/a",
      candidate.outputPath ? `\`${candidate.outputPath}\`` : "n/a",
      candidate.notes,
    ]),
  );
  const coastRows = output.coastlinePlan.requiredDownloads.map((item) =>
    row([item.sourceId, item.sizeBytes ?? "n/a", item.contentType ?? "n/a", item.downloadNow, item.url, item.reason]),
  );

  return `# Wanderly v2.0 Admin Patch Candidate G4.3

Generated: ${output.generatedAt}

This phase creates patch candidates only. It does not replace PMTiles, upload public OSS, write Supabase, change Map Studio, or download files over 100MB.

## Patch Candidates

| patchId | region | source | targetLevel | patchType | confidence | features | source vertices | baseline vertices | output | notes |
| --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | --- | --- |
${rows.join("\n")}

## Coastline Plan

| source | sizeBytes | contentType | downloadNow | url | reason |
| --- | ---: | --- | --- | --- | --- |
${coastRows.join("\n")}

Clipping strategy:

${output.coastlinePlan.clippingStrategy.map((step) => `- ${step}`).join("\n")}

Estimated temp size: ${output.coastlinePlan.estimatedTempSize}

Archive strategy: ${output.coastlinePlan.archiveStrategy}

License risk: ${output.coastlinePlan.licenseRisk}

## Answers

- DataV 是否能改善县区边界精度：${output.recommendations.datavImprovesCountyPrecision}
- DataV 适合 replace 还是 reference：${output.recommendations.datavPatchMode}
- 优先 patch 区域：${output.recommendations.priorityPatchRegions.join(", ") || "none"}
- coastline patch 是否需要 OSM 大文件下载：${output.recommendations.coastlineNeedsLargeDownload ? "需要。当前 osmdata coastline/land/water 包均超过 100MB，本轮只记录 metadata。" : "不需要"}
- coastline patch 授权风险和归档策略：${output.recommendations.coastlineArchiveStrategy}
- 下一步是否值得生成广东 patch PMTiles 对照版：${output.recommendations.shouldBuildGuangdongPatchPmtiles ? "值得，但只能作为 experimental / productionApproved=false 对照版。" : "暂不建议"}

## Next Step

${output.recommendations.nextStep}
`;
}

function main(): void {
  ensureDir(OUT_DIR);
  readJson<Record<string, unknown>>(CRAWL_PATH);
  readJson<Record<string, unknown>>(QUALITY_PATH);
  const patchCandidates = buildCandidates();
  const output: Output = {
    phase: "G4.3",
    generatedAt: new Date().toISOString(),
    outputDir: OUT_DIR,
    patchCandidates,
    coastlinePlan: coastlinePlan(),
    recommendations: recommendations(patchCandidates),
  };
  writeJson(OUT_JSON, output);
  writeFileSync(absolute(OUT_DOC), renderDoc(output), "utf8");
  process.stdout.write(JSON.stringify({
    ok: true,
    phase: output.phase,
    patchCandidateCount: output.patchCandidates.length,
    writtenGeoJson: output.patchCandidates.filter((candidate) => candidate.outputPath).length,
    coastlineDownloadsDeferred: output.coastlinePlan.requiredDownloads.length,
    outputs: [OUT_JSON, OUT_DOC, OUT_DIR],
  }, null, 2) + "\n");
}

main();
