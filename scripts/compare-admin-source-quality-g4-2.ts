import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { sha256Hex } from "../src/server/storage/ossStorage.ts";

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
  meta?: Record<string, unknown>;
};

type NormalizedRegion = {
  adcode: string;
  name: string;
  level: string;
  parentAdcode?: string | null;
  provinceAdcode?: string | null;
  prefectureAdcode?: string | null;
  geometry?: GeoJsonGeometry | null;
};

type RegionConfig = {
  id: string;
  name: string;
  risk: "admin_precision" | "coastal_patch" | "mixed";
  adcodes: string[];
  baselinePrefectureAdcodes?: string[];
  baselineCountyPrefixes?: string[];
  baselineCountyAdcodes?: string[];
  notes: string;
};

type GeometryMetrics = {
  sourceId: string;
  regionId: string;
  regionName: string;
  readable: boolean;
  fileCount: number;
  files: string[];
  sizeBytes: number;
  sha256: string | null;
  featureCount: number;
  geometryTypes: Record<string, number>;
  polygonFeatureCount: number;
  multiPolygonFeatureCount: number;
  polygonPartCount: number;
  ringCount: number;
  vertexCount: number;
  bbox: [number, number, number, number] | null;
  propertyKeys: string[];
  hasAdcode: boolean;
  hasName: boolean;
  hasLevel: boolean;
  hasParent: boolean;
  containsCountyLevel: boolean;
  coastlineIslandDetailScore: number;
  needsCoordinateTransform: boolean;
  schemaMappingEase: "easy" | "medium" | "hard";
  notes: string;
};

type RemoteIndex = {
  sourceId: string;
  url: string;
  status: "available" | "pendingLargeDownload" | "failed";
  httpStatus?: number;
  sizeBytes?: number | null;
  contentType?: string | null;
  notes: string;
};

type Output = {
  phase: "G4.2";
  generatedAt: string;
  inputs: string[];
  regionComparisons: Array<{
    regionId: string;
    regionName: string;
    risk: string;
    metrics: GeometryMetrics[];
    recommendation: string;
  }>;
  remoteIndexes: RemoteIndex[];
  pendingLargeDownload: RemoteIndex[];
  recommendations: {
    current2025Baseline: string;
    datav: string;
    geojsoncn: string;
    osmGeofabrik: string;
    osmCoastline: string;
    mainSourceCandidate: string;
    countyPrecisionCandidate: string;
    coastalPatchCandidate: string;
    pmtilesInputCandidate: string;
    doNotUseForProduction: string[];
  };
};

const ROOT = process.cwd();
const CRAWL_PATH = "data/source-manifests/map-source-crawl.g4-samples.json";
const REGISTRY_PATH = "data/source-manifests/map-source-registry.g4.json";
const INVENTORY_PATH = "data/source-manifests/map-assets.current-inventory.json";
const OUT_JSON = "data/source-manifests/admin-source-quality-compare.g4-2.json";
const OUT_DOC = "docs/WANDERLY_V2_ADMIN_SOURCE_QUALITY_COMPARE_G4_2.md";
const MAX_DOWNLOAD_BYTES = 100 * 1024 * 1024;

const CONFIRMED_GEOFABRIK_URLS = [
  "https://download.geofabrik.de/asia/china/guangdong-latest.osm.pbf",
  "https://download.geofabrik.de/asia/china/guangdong-latest-free.gpkg.zip",
  "https://download.geofabrik.de/asia/china/shanghai-latest.osm.pbf",
  "https://download.geofabrik.de/asia/china/shanghai-latest-free.gpkg.zip",
  "https://download.geofabrik.de/asia/china/zhejiang-latest.osm.pbf",
  "https://download.geofabrik.de/asia/china/zhejiang-latest-free.gpkg.zip",
  "https://download.geofabrik.de/asia/china/fujian-latest.osm.pbf",
  "https://download.geofabrik.de/asia/china/fujian-latest-free.gpkg.zip",
];

const REGIONS: RegionConfig[] = [
  {
    id: "guangdong",
    name: "广东省",
    risk: "mixed",
    adcodes: ["440000"],
    baselinePrefectureAdcodes: ["44"],
    baselineCountyPrefixes: ["44"],
    notes: "省域下钻到市级/县级的行政结构和珠三角基础边界。",
  },
  {
    id: "shenzhen-dongguan-huizhou",
    name: "深圳 / 东莞 / 惠州",
    risk: "admin_precision",
    adcodes: ["440300", "441900", "441300"],
    baselinePrefectureAdcodes: ["440300", "441900", "441300"],
    baselineCountyPrefixes: ["4403", "4419", "4413"],
    notes: "县区密集和地市交界，重点看 adcode 与区县层级。",
  },
  {
    id: "guangzhou-foshan",
    name: "广州 / 佛山",
    risk: "admin_precision",
    adcodes: ["440100", "440600"],
    baselinePrefectureAdcodes: ["440100", "440600"],
    baselineCountyPrefixes: ["4401", "4406"],
    notes: "广佛同城区域，重点看相邻边界和县区细节。",
  },
  {
    id: "xiamen-coastal",
    name: "厦门沿海",
    risk: "coastal_patch",
    adcodes: ["350200"],
    baselinePrefectureAdcodes: ["350200"],
    baselineCountyPrefixes: ["3502"],
    notes: "海岛、跨海、河口和水域边界。",
  },
  {
    id: "zhoushan-islands",
    name: "舟山群岛",
    risk: "coastal_patch",
    adcodes: ["330900"],
    baselinePrefectureAdcodes: ["330900"],
    baselineCountyPrefixes: ["3309"],
    notes: "群岛和小岛细节，是 coastal patch 高风险样本。",
  },
  {
    id: "shanghai-coastal",
    name: "上海沿海 / 崇明",
    risk: "coastal_patch",
    adcodes: ["310000", "310151"],
    baselinePrefectureAdcodes: ["310000"],
    baselineCountyAdcodes: ["310151"],
    baselineCountyPrefixes: ["310"],
    notes: "长江口、崇明和沿海新成陆区域。",
  },
  {
    id: "hangzhou-bay",
    name: "杭州湾",
    risk: "coastal_patch",
    adcodes: ["330100", "330200", "330400"],
    baselinePrefectureAdcodes: ["330100", "330200", "330400"],
    baselineCountyPrefixes: ["3301", "3302", "3304"],
    notes: "杭州、宁波、嘉兴之间的湾区/河口样本；G4.1 未下载外部样本。",
  },
];

function absolute(path: string): string {
  return resolve(ROOT, path);
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(absolute(path), "utf8")) as T;
}

function asFeatureCollectionFromNormalized(path: string, region: RegionConfig): FeatureCollection {
  const json = readJson<{ regions: NormalizedRegion[] }>(path);
  const regions = json.regions.filter((entry) => normalizedRegionMatches(entry, region));
  return {
    type: "FeatureCollection",
    features: regions
      .filter((entry) => entry.geometry)
      .map((entry) => ({
        type: "Feature",
        properties: {
          adcode: entry.adcode,
          name: entry.name,
          level: entry.level,
          parent: entry.parentAdcode,
          provinceAdcode: entry.provinceAdcode,
          prefectureAdcode: entry.prefectureAdcode,
        },
        geometry: entry.geometry ?? null,
      })),
  };
}

function normalizedRegionMatches(entry: NormalizedRegion, region: RegionConfig): boolean {
  if (region.id === "guangdong") {
    return entry.provinceAdcode === "440000" || entry.adcode === "440000" || entry.adcode.startsWith("44");
  }
  if (region.baselineCountyAdcodes?.includes(entry.adcode)) {
    return true;
  }
  if (region.baselinePrefectureAdcodes?.includes(entry.adcode) || region.baselinePrefectureAdcodes?.includes(entry.prefectureAdcode ?? "")) {
    return true;
  }
  return Boolean(region.baselineCountyPrefixes?.some((prefix) => entry.adcode.startsWith(prefix)));
}

function geoJsonFeatureCollection(path: string): FeatureCollection {
  const json = readJson<Record<string, unknown>>(path);
  if (json.type === "FeatureCollection" && Array.isArray(json.features)) {
    return json as FeatureCollection;
  }
  if (json.type === "Feature" && json.geometry) {
    return { type: "FeatureCollection", features: [json as GeoJsonFeature] };
  }
  return { type: "FeatureCollection", features: [] };
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

function geometryPartMetrics(geometry: GeoJsonGeometry | null | undefined): {
  polygonParts: number;
  rings: number;
  vertices: number;
} {
  if (!geometry) return { polygonParts: 0, rings: 0, vertices: 0 };
  if (geometry.type === "GeometryCollection") {
    return (geometry.geometries ?? []).reduce(
      (sum, child) => {
        const metrics = geometryPartMetrics(child);
        return {
          polygonParts: sum.polygonParts + metrics.polygonParts,
          rings: sum.rings + metrics.rings,
          vertices: sum.vertices + metrics.vertices,
        };
      },
      { polygonParts: 0, rings: 0, vertices: 0 },
    );
  }
  if (geometry.type === "Polygon") {
    const rings = Array.isArray(geometry.coordinates) ? geometry.coordinates as unknown[] : [];
    return {
      polygonParts: 1,
      rings: rings.length,
      vertices: countCoordinatePairs(geometry.coordinates),
    };
  }
  if (geometry.type === "MultiPolygon") {
    const polygons = Array.isArray(geometry.coordinates) ? geometry.coordinates as unknown[] : [];
    const rings = polygons.reduce((sum, polygon) => sum + (Array.isArray(polygon) ? polygon.length : 0), 0);
    return {
      polygonParts: polygons.length,
      rings,
      vertices: countCoordinatePairs(geometry.coordinates),
    };
  }
  return { polygonParts: 0, rings: 0, vertices: countCoordinatePairs(geometry.coordinates) };
}

function countCoordinatePairs(value: unknown): number {
  if (!Array.isArray(value)) return 0;
  if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") {
    return 1;
  }
  return value.reduce((sum, child) => sum + countCoordinatePairs(child), 0);
}

function featurePropertyKeys(features: GeoJsonFeature[]): string[] {
  const keys = new Set<string>();
  for (const feature of features) {
    for (const key of Object.keys(feature.properties ?? {})) keys.add(key);
  }
  return Array.from(keys).sort();
}

function hasPropertyLike(keys: string[], names: string[]): boolean {
  const lower = keys.map((key) => key.toLowerCase());
  return names.some((name) => lower.includes(name.toLowerCase()));
}

function metricFromCollection(input: {
  sourceId: string;
  region: RegionConfig;
  files: string[];
  collection: FeatureCollection;
  notes: string;
  needsCoordinateTransform: boolean;
}): GeometryMetrics {
  const features = input.collection.features ?? [];
  const geometryTypes: Record<string, number> = {};
  let polygonPartCount = 0;
  let ringCount = 0;
  let vertexCount = 0;
  let minLng = Number.POSITIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;

  for (const feature of features) {
    const type = feature.geometry?.type ?? "null";
    geometryTypes[type] = (geometryTypes[type] ?? 0) + 1;
    const partMetrics = geometryPartMetrics(feature.geometry);
    polygonPartCount += partMetrics.polygonParts;
    ringCount += partMetrics.rings;
    vertexCount += partMetrics.vertices;
    collectCoordinates(feature.geometry, (lng, lat) => {
      minLng = Math.min(minLng, lng);
      minLat = Math.min(minLat, lat);
      maxLng = Math.max(maxLng, lng);
      maxLat = Math.max(maxLat, lat);
    });
  }

  const propertyKeys = featurePropertyKeys(features);
  const hasAdcode = hasPropertyLike(propertyKeys, ["adcode", "code", "gb"]);
  const hasName = hasPropertyLike(propertyKeys, ["name", "fullname"]);
  const hasLevel = hasPropertyLike(propertyKeys, ["level"]);
  const hasParent = hasPropertyLike(propertyKeys, ["parent", "parentAdcode", "parent_adcode"]);
  const containsCountyLevel = features.some((feature) => {
    const properties = feature.properties ?? {};
    const level = String(properties.level ?? properties.adminLevel ?? "");
    const adcode = String(properties.adcode ?? properties.code ?? "");
    return /county|district|区|县/.test(level) || (adcode.length === 6 && !adcode.endsWith("00"));
  });
  const sizeBytes = input.files.reduce((sum, path) => sum + (existsSync(absolute(path)) ? readFileSync(absolute(path)).byteLength : 0), 0);
  const sha256 = input.files.length === 1 && existsSync(absolute(input.files[0])) ? sha256Hex(readFileSync(absolute(input.files[0]))) : null;

  return {
    sourceId: input.sourceId,
    regionId: input.region.id,
    regionName: input.region.name,
    readable: true,
    fileCount: input.files.length,
    files: input.files,
    sizeBytes,
    sha256,
    featureCount: features.length,
    geometryTypes,
    polygonFeatureCount: geometryTypes.Polygon ?? 0,
    multiPolygonFeatureCount: geometryTypes.MultiPolygon ?? 0,
    polygonPartCount,
    ringCount,
    vertexCount,
    bbox: Number.isFinite(minLng) ? [minLng, minLat, maxLng, maxLat] : null,
    propertyKeys,
    hasAdcode,
    hasName,
    hasLevel,
    hasParent,
    containsCountyLevel,
    coastlineIslandDetailScore: polygonPartCount + Math.round(vertexCount / 1000),
    needsCoordinateTransform: input.needsCoordinateTransform,
    schemaMappingEase: schemaMappingEase({ hasAdcode, hasName, hasLevel, hasParent }),
    notes: input.notes,
  };
}

function schemaMappingEase(input: { hasAdcode: boolean; hasName: boolean; hasLevel: boolean; hasParent: boolean }): "easy" | "medium" | "hard" {
  if (input.hasAdcode && input.hasName && input.hasLevel && input.hasParent) return "easy";
  if ((input.hasAdcode || input.hasName) && input.hasLevel) return "medium";
  return "hard";
}

function baselineMetric(region: RegionConfig): GeometryMetrics {
  const collections: FeatureCollection[] = [];
  const files: string[] = [];
  const levelFiles = [
    "data/admin/normalized/china-prefecture-admin-regions.geometry.json",
    "data/admin/normalized/china-county-admin-regions.geometry.json",
  ];
  for (const file of levelFiles) {
    if (!existsSync(absolute(file))) continue;
    files.push(file);
    collections.push(asFeatureCollectionFromNormalized(file, region));
  }
  return metricFromCollection({
    sourceId: "current-2025-baseline",
    region,
    files,
    collection: { type: "FeatureCollection", features: collections.flatMap((collection) => collection.features) },
    needsCoordinateTransform: true,
    notes: "Current local normalized 2025 baseline; engineering baseline only, license risk high.",
  });
}

function externalMetricsForRegion(crawl: Record<string, unknown>, region: RegionConfig): GeometryMetrics[] {
  const downloaded = (crawl.downloadedFiles as Array<Record<string, unknown>> | undefined) ?? [];
  const bySource = new Map<string, string[]>();
  for (const file of downloaded) {
    const sourceId = String(file.sourceId ?? "");
    const regionId = String(file.region ?? "");
    const localPath = String(file.localPath ?? "");
    if (!localPath || !localPath.endsWith(".geojson") || regionId !== region.id) continue;
    if (!bySource.has(sourceId)) bySource.set(sourceId, []);
    bySource.get(sourceId)!.push(localPath);
  }

  return Array.from(bySource.entries()).map(([sourceId, files]) => {
    const collections = files.map(geoJsonFeatureCollection);
    return metricFromCollection({
      sourceId,
      region,
      files,
      collection: { type: "FeatureCollection", features: collections.flatMap((collection) => collection.features) },
      needsCoordinateTransform: sourceId !== "datav" && sourceId !== "geojsoncn",
      notes: sourceId === "datav"
        ? "DataV sample from G4.1. Good adcode/name/level/parent fields; production license not cleared."
        : "GeoJSONcn sample from G4.1. Mirror source; license/upstream not cleared.",
    });
  });
}

async function headRemote(url: string): Promise<{ status: number; ok: boolean; sizeBytes: number | null; contentType: string | null }> {
  const response = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(20_000) });
  const size = response.headers.get("content-length");
  return {
    status: response.status,
    ok: response.ok,
    sizeBytes: size ? Number(size) : null,
    contentType: response.headers.get("content-type"),
  };
}

async function remoteIndexesFromCrawl(crawl: Record<string, unknown>): Promise<{ indexes: RemoteIndex[]; pending: RemoteIndex[] }> {
  const urls = new Map<string, { sourceId: string; url: string; notes: string }>();
  for (const file of ((crawl.downloadedFiles as Array<Record<string, unknown>> | undefined) ?? []).concat((crawl.failed as Array<Record<string, unknown>> | undefined) ?? [])) {
    const sourceId = String(file.sourceId ?? "");
    const url = String(file.sourceUrl ?? "");
    if (!url || (!sourceId.includes("osm") && !sourceId.includes("geofabrik"))) continue;
    urls.set(`${sourceId}:${url}`, { sourceId, url, notes: String(file.notes ?? "") });
  }
  for (const url of CONFIRMED_GEOFABRIK_URLS) {
    urls.set(`osm-geofabrik:${url}`, {
      sourceId: "osm-geofabrik",
      url,
      notes: "Confirmed from Geofabrik China index. G4.2 performs HEAD only; no download.",
    });
  }

  const indexes: RemoteIndex[] = [];
  for (const item of urls.values()) {
    if (item.url.endsWith("-free.shp.zip")) {
      indexes.push({
        sourceId: item.sourceId,
        url: item.url,
        status: "failed",
        notes: "Legacy G4.1 URL pattern. Geofabrik China index now exposes free GPKG ZIP quick links for subregions, not this SHP ZIP path.",
      });
      continue;
    }
    try {
      const head = await headRemote(item.url);
      const overLimit = typeof head.sizeBytes === "number" && head.sizeBytes > MAX_DOWNLOAD_BYTES;
      indexes.push({
        sourceId: item.sourceId,
        url: item.url,
        status: overLimit ? "pendingLargeDownload" : head.ok ? "available" : "failed",
        httpStatus: head.status,
        sizeBytes: head.sizeBytes,
        contentType: head.contentType,
        notes: overLimit ? "Remote file exceeds 100MB; do not download in G4.2." : head.ok ? "Remote index is reachable and under size limit." : `HEAD returned HTTP ${head.status}.`,
      });
    } catch (error) {
      indexes.push({
        sourceId: item.sourceId,
        url: item.url,
        status: "failed",
        notes: `HEAD failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }
  return { indexes, pending: indexes.filter((index) => index.status === "pendingLargeDownload") };
}

function recommendationForRegion(region: RegionConfig, metrics: GeometryMetrics[]): string {
  const baseline = metrics.find((metric) => metric.sourceId === "current-2025-baseline");
  const datav = metrics.find((metric) => metric.sourceId === "datav");
  const geojsoncn = metrics.find((metric) => metric.sourceId === "geojsoncn");
  if (!datav && !geojsoncn) {
    return "G4.1 has no external sample for this region; keep current 2025 baseline for engineering comparison and add source sample in G4.3.";
  }
  if (region.risk === "coastal_patch") {
    return "Use DataV/GeoJSONcn only as admin structure comparison. Coastal patch should rely on OSM coastline/osmdata or licensed coastline data after regional clipping.";
  }
  if (datav && baseline && datav.vertexCount > baseline.vertexCount && datav.hasAdcode) {
    return "DataV is structurally stronger than current baseline for adcode mapping and vertex density, but remains comparison/patch candidate only because license is not cleared.";
  }
  return "Current baseline remains engineering baseline; external samples help comparison but do not yet replace it.";
}

function buildRecommendations(output: Omit<Output, "recommendations">): Output["recommendations"] {
  return {
    current2025Baseline: "Continue as engineering baseline for Map Studio/PMTiles experiments only. It is not a production-trusted main source because license and coastal/county precision remain high risk.",
    datav: "Useful for city/county supplemental comparison and adcode/name/level mapping. Not suitable as production main source until license and redistribution terms are confirmed.",
    geojsoncn: "Limited continuing value: Guangdong province sample is rich, but city-level URLs failed and source appears to be a mirror/repackaging. Keep as comparison source only.",
    osmGeofabrik: "Worth a next round only with confirmed extract URLs and an approved clipping workflow. Do not ingest full extracts in G4.2; ODbL obligations need a product strategy.",
    osmCoastline: "Best open candidate for coastline/island/river-mouth patch, but packages are global and large. Next step should be a regional clipping script or approved large download.",
    mainSourceCandidate: "No current automatic source is production-ready as administrative main source. Candidate should be RESDC/commercial/official licensed boundary data, with DataV/current baseline as comparison.",
    countyPrecisionCandidate: "DataV is the best automatic supplemental candidate in this run; commercial/RESDC remains stronger for production county precision.",
    coastalPatchCandidate: "OSM coastline/osmdata is the best patch candidate, pending regional clipping and ODbL review.",
    pmtilesInputCandidate: "Continue using current 2025 baseline and DataV samples for engineering PMTiles split tests only; do not publish production PMTiles from these sources.",
    doNotUseForProduction: ["current-2025-baseline", "datav", "geojsoncn", "cn-atlas-ruiduo", "osm-geofabrik-without-odbl-strategy"],
  };
}

function renderDoc(output: Output): string {
  const row = (cells: unknown[]) => `| ${cells.map((cell) => String(cell ?? "").replace(/\n/g, " ")).join(" | ")} |`;
  const metricRows = output.regionComparisons.flatMap((region) =>
    region.metrics.map((metric) =>
      row([
        region.regionName,
        metric.sourceId,
        metric.featureCount,
        metric.vertexCount,
        metric.polygonPartCount,
        metric.bbox ? metric.bbox.map((value) => value.toFixed(6)).join(", ") : "n/a",
        metric.hasAdcode,
        metric.hasName,
        metric.hasLevel,
        metric.hasParent,
        metric.containsCountyLevel,
        metric.schemaMappingEase,
        metric.needsCoordinateTransform,
      ]),
    ),
  );
  const remoteRows = output.remoteIndexes.map((index) =>
    row([index.sourceId, index.status, index.httpStatus ?? "n/a", index.sizeBytes ?? "n/a", index.contentType ?? "n/a", index.url, index.notes]),
  );

  return `# Wanderly v2.0 Admin Source Quality Compare G4.2

Generated: ${output.generatedAt}

This phase is read-only. It does not generate PMTiles, upload public OSS, write Supabase, change Map Studio, or download files over 100MB.

## Structural Metrics

| Region | Source | Features | Vertices | Polygon parts | BBox | adcode | name | level | parent | county-level | schema mapping | needs transform |
| --- | --- | ---: | ---: | ---: | --- | --- | --- | --- | --- | --- | --- | --- |
${metricRows.join("\n")}

## Region Recommendations

${output.regionComparisons.map((region) => `- **${region.regionName}**: ${region.recommendation}`).join("\n")}

## OSM / Geofabrik / Coastline Index

| Source | Status | HTTP | Size | Content-Type | URL | Notes |
| --- | --- | --- | ---: | --- | --- | --- |
${remoteRows.join("\n") || row(["n/a", "n/a", "n/a", "n/a", "n/a", "n/a", "No remote index available."])}

## Recommendations

- Current 2025 baseline: ${output.recommendations.current2025Baseline}
- DataV: ${output.recommendations.datav}
- GeoJSONcn: ${output.recommendations.geojsoncn}
- OSM / Geofabrik: ${output.recommendations.osmGeofabrik}
- OSM coastline: ${output.recommendations.osmCoastline}
- Administrative main source candidate: ${output.recommendations.mainSourceCandidate}
- County precision candidate: ${output.recommendations.countyPrecisionCandidate}
- Coastal patch candidate: ${output.recommendations.coastalPatchCandidate}
- PMTiles input candidate: ${output.recommendations.pmtilesInputCandidate}

Do not use for production yet:

${output.recommendations.doNotUseForProduction.map((source) => `- \`${source}\``).join("\n")}

## Next Step

Build a regional coastline clipping prototype before downloading full osmdata packages, and request/obtain a licensed high-precision administrative boundary source before promoting any source to production main data.
`;
}

async function main(): Promise<void> {
  const crawl = readJson<Record<string, unknown>>(CRAWL_PATH);
  const _registry = readJson<Record<string, unknown>>(REGISTRY_PATH);
  const _inventory = readJson<Record<string, unknown>>(INVENTORY_PATH);
  const { indexes, pending } = await remoteIndexesFromCrawl(crawl);

  const regionComparisons = REGIONS.map((region) => {
    const metrics = [baselineMetric(region), ...externalMetricsForRegion(crawl, region)];
    return {
      regionId: region.id,
      regionName: region.name,
      risk: region.risk,
      metrics,
      recommendation: recommendationForRegion(region, metrics),
    };
  });

  const partial: Omit<Output, "recommendations"> = {
    phase: "G4.2",
    generatedAt: new Date().toISOString(),
    inputs: [CRAWL_PATH, REGISTRY_PATH, INVENTORY_PATH, "temp/map-source-samples-g4", "data/admin/normalized"],
    regionComparisons,
    remoteIndexes: indexes,
    pendingLargeDownload: pending,
  };
  const output: Output = {
    ...partial,
    recommendations: buildRecommendations(partial),
  };

  writeFileSync(absolute(OUT_JSON), `${JSON.stringify(output, null, 2)}\n`, "utf8");
  writeFileSync(absolute(OUT_DOC), renderDoc(output), "utf8");
  process.stdout.write(JSON.stringify({
    ok: true,
    phase: output.phase,
    regionCount: output.regionComparisons.length,
    remoteIndexCount: output.remoteIndexes.length,
    pendingLargeDownload: output.pendingLargeDownload.length,
    outputs: [OUT_JSON, OUT_DOC],
  }, null, 2) + "\n");
}

void main();
