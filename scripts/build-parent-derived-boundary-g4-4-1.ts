import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

type Position = [number, number];
type LayerName = "province_boundary" | "prefecture_boundary" | "county_boundary";
type ParentRebuildMode = "baseline" | "derived_from_patched_county" | "partial_derived" | "reference_only";
type ToolName = "tippecanoe" | "pmtiles";

type ToolStatus = {
  name: ToolName;
  available: boolean;
  path: string | null;
  runner: "native" | "wsl" | null;
};

type GeoJsonGeometry = {
  type: string;
  coordinates?: unknown;
  geometries?: GeoJsonGeometry[];
};

type GeoJsonFeature = {
  type: "Feature";
  properties?: Record<string, unknown>;
  geometry?: GeoJsonGeometry | null;
};

type FeatureCollection = {
  type: "FeatureCollection";
  name?: string;
  properties?: Record<string, unknown>;
  features: GeoJsonFeature[];
};

type PatchCandidate = {
  patchId: string;
  region: string;
  source: string;
  targetLevel: string;
  targetAdcodes: string[];
  patchType: string;
  confidence: string;
  licenseRisk: string;
  productionApproved: false;
  outputPath: string | null;
  notes: string;
};

type SourceLayer = {
  name: LayerName;
  path: string;
  featureCount: number;
  sizeBytes: number;
  vertexCount: number;
  parentDerivedFeatureCount: number;
  countyPatchFeatureCount: number;
};

type PrefectureCoverage = {
  prefectureAdcode: string;
  name: string;
  region: string;
  patchIds: string[];
  expectedCountyCount: number;
  patchedCountyCount: number;
  directParentFeatureCount: number;
  coverageRatio: number;
  mode: ParentRebuildMode;
  confidence: "low" | "medium" | "high";
  notes: string;
};

type SegmentAccumulator = {
  key: string;
  start: Position;
  end: Position;
  sources: Set<string>;
  names: Set<string>;
};

type SegmentRecord = {
  layer: LayerName;
  source: string | null;
  parentRebuildMode: string | null;
  start: Position;
  end: Position;
};

const ROOT = process.cwd();
const G4_3_MANIFEST = "data/source-manifests/admin-patch-candidates.g4-3.json";
const CHINA_GCJ02_SOURCE_DIR = "temp/admin-tile-prototype/china-gcj02-source";
const OUT_SOURCE_DIR = "temp/admin-tile-prototype/parent-derived-patch-source";
const OUT_MBTILES = "temp/admin-tile-prototype/patch-regions-admin-boundaries-gcj02-parent-derived.mbtiles";
const OUT_PMTILES = "public/admin-tiles/experimental/patch-regions-admin-boundaries-gcj02-parent-derived.pmtiles";
const OUT_JSON = "data/source-manifests/admin-parent-derived-boundary.g4-4-1.json";
const OUT_DOC = "docs/WANDERLY_V2_ADMIN_PARENT_DERIVED_BOUNDARY_G4_4_1.md";
const ORIGINAL_GD_PATCH_PMTILES = "public/admin-tiles/experimental/guangdong-admin-boundaries-gcj02-datav-patch.pmtiles";
const LONG_SEGMENT_METERS = 20_000;

const TARGET_PREFECTURES: Array<{ adcode: string; name: string; region: string }> = [
  { adcode: "440300", name: "深圳", region: "shenzhen-dongguan-huizhou" },
  { adcode: "441900", name: "东莞", region: "shenzhen-dongguan-huizhou" },
  { adcode: "441300", name: "惠州", region: "shenzhen-dongguan-huizhou" },
  { adcode: "440100", name: "广州", region: "guangzhou-foshan" },
  { adcode: "440600", name: "佛山", region: "guangzhou-foshan" },
  { adcode: "350200", name: "厦门", region: "xiamen-coastal" },
  { adcode: "330900", name: "舟山", region: "zhoushan-islands" },
  { adcode: "310000", name: "上海", region: "shanghai-coastal" },
  { adcode: "330100", name: "杭州", region: "hangzhou-bay" },
  { adcode: "330200", name: "宁波", region: "hangzhou-bay" },
  { adcode: "330400", name: "嘉兴", region: "hangzhou-bay" },
];

const TILE_ATTRIBUTE_INCLUDES = [
  "layer",
  "level",
  "leftAdcode",
  "rightAdcode",
  "parentAdcode",
  "source",
  "parentRebuildMode",
  "patchIds",
  "confidence",
  "productionApproved",
  "region",
  "licenseRisk",
  "topologyVersion",
  "displayMode",
  "coordinateSystem",
  "sourceCoordinateSystem",
  "qualityMode",
];

function absolute(path: string): string {
  return resolve(ROOT, path);
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(absolute(path), "utf8")) as T;
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(absolute(path)), { recursive: true });
  writeFileSync(absolute(path), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(path: string, value: string): void {
  mkdirSync(dirname(absolute(path)), { recursive: true });
  writeFileSync(absolute(path), value, "utf8");
}

function sha256(path: string): string | null {
  if (!existsSync(absolute(path))) return null;
  return createHash("sha256").update(readFileSync(absolute(path))).digest("hex");
}

function shellQuote(value: string): string {
  if (/^[a-zA-Z0-9_./:@=+-]+$/.test(value)) return value;
  return `"${value.replace(/"/g, '\\"')}"`;
}

function commandToText(command: string[]): string {
  return command.map(shellQuote).join(" ");
}

function findTool(name: ToolName): ToolStatus {
  const command = process.platform === "win32" ? "where" : "command";
  const args = process.platform === "win32" ? [name] : ["-v", name];
  const result = spawnSync(command, args, {
    encoding: "utf8",
    shell: process.platform !== "win32",
  });
  const output = result.stdout.trim().split(/\r?\n/).filter(Boolean)[0] ?? null;
  return {
    name,
    available: result.status === 0 && output !== null,
    path: output,
    runner: result.status === 0 && output !== null ? "native" : null,
  };
}

function findToolWithWslFallback(name: ToolName): ToolStatus {
  const nativeTool = findTool(name);
  if (nativeTool.available || process.platform !== "win32") return nativeTool;
  const result = spawnSync("wsl", ["bash", "-lc", `command -v ${name}`], { encoding: "utf8" });
  const output = result.stdout.trim().split(/\r?\n/).filter(Boolean)[0] ?? null;
  if (result.status === 0 && output) return { name, available: true, path: output, runner: "wsl" };
  return nativeTool;
}

function toWslPath(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const match = normalized.match(/^([a-zA-Z]):\/(.*)$/);
  if (!match) return normalized;
  return `/mnt/${match[1].toLowerCase()}/${match[2]}`;
}

function executeCommand(command: string[], runner: "native" | "wsl"): void {
  if (runner === "wsl") {
    const result = spawnSync(
      "wsl",
      ["bash", "-lc", `cd ${shellQuote(toWslPath(ROOT))} && ${commandToText(command)}`],
      { cwd: ROOT, encoding: "utf8", stdio: "inherit" },
    );
    if (result.status !== 0) throw new Error(`Command failed: ${commandToText(command)}`);
    return;
  }
  const [bin, ...args] = command;
  const result = spawnSync(bin, args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) throw new Error(`Command failed: ${commandToText(command)}`);
}

function targetPrefectureSet(): Set<string> {
  return new Set(TARGET_PREFECTURES.map((target) => target.adcode));
}

function targetProvinceSet(): Set<string> {
  return new Set(TARGET_PREFECTURES.map((target) => provinceOf(target.adcode)));
}

function provinceOf(adcode: string): string {
  if (adcode === "310000") return "310000";
  return `${adcode.slice(0, 2)}0000`;
}

function selectedCandidates(): PatchCandidate[] {
  const manifest = readJson<{ patchCandidates: PatchCandidate[] }>(G4_3_MANIFEST);
  return manifest.patchCandidates.filter((candidate) =>
    candidate.source === "datav" &&
    candidate.outputPath &&
    candidate.patchType !== "referenceOnly" &&
    existsSync(absolute(candidate.outputPath)),
  );
}

function patchCollections(candidates: PatchCandidate[]): Map<string, FeatureCollection> {
  return new Map(candidates.map((candidate) => [
    candidate.patchId,
    readJson<FeatureCollection>(candidate.outputPath as string),
  ]));
}

function toPosition(value: unknown): Position | null {
  if (!Array.isArray(value) || typeof value[0] !== "number" || typeof value[1] !== "number") return null;
  return [value[0], value[1]];
}

function positionKey(point: Position, precision = 6): string {
  return `${point[0].toFixed(precision)},${point[1].toFixed(precision)}`;
}

function edgeKey(start: Position, end: Position): string {
  const a = positionKey(start);
  const b = positionKey(end);
  return a <= b ? `${a}|${b}` : `${b}|${a}`;
}

function collectRings(geometry: GeoJsonGeometry | null | undefined): Position[][] {
  if (!geometry) return [];
  if (geometry.type === "GeometryCollection") {
    return (geometry.geometries ?? []).flatMap((child) => collectRings(child));
  }
  if (geometry.type === "Polygon" && Array.isArray(geometry.coordinates)) {
    return (geometry.coordinates as unknown[]).map((ring) =>
      Array.isArray(ring) ? ring.map(toPosition).filter(Boolean) as Position[] : [],
    ).filter((ring) => ring.length > 1);
  }
  if (geometry.type === "MultiPolygon" && Array.isArray(geometry.coordinates)) {
    return (geometry.coordinates as unknown[]).flatMap((polygon) =>
      Array.isArray(polygon)
        ? polygon.map((ring) => Array.isArray(ring) ? ring.map(toPosition).filter(Boolean) as Position[] : [])
        : [],
    ).filter((ring) => ring.length > 1);
  }
  return [];
}

function featureAdcode(feature: GeoJsonFeature): string {
  const props = feature.properties ?? {};
  return String(props.adcode ?? props.code ?? props.gb ?? "unknown");
}

function featureName(feature: GeoJsonFeature): string {
  return String(feature.properties?.name ?? featureAdcode(feature));
}

function featureParent(feature: GeoJsonFeature): string | null {
  const props = feature.properties ?? {};
  const parent = props.parent;
  if (parent && typeof parent === "object" && "adcode" in parent) {
    return String((parent as { adcode?: unknown }).adcode ?? "");
  }
  const acroutes = props.acroutes;
  if (Array.isArray(acroutes) && acroutes.length >= 2) return String(acroutes[acroutes.length - 2]);
  return props.parentAdcode === undefined ? null : String(props.parentAdcode);
}

function isCountyLike(feature: GeoJsonFeature): boolean {
  const adcode = featureAdcode(feature);
  const level = String(feature.properties?.level ?? "").toLowerCase();
  return adcode.length === 6 && !adcode.endsWith("00") && /district|county|区|县/.test(level);
}

function countyCountsByPrefecture(): Map<string, number> {
  const data = readJson<{ regions: Array<{ adcode: string; prefectureAdcode?: string | null; parentAdcode?: string | null }> }>(
    "data/admin/normalized/china-county-admin-regions.geometry.json",
  );
  const counts = new Map<string, Set<string>>();
  for (const region of data.regions) {
    const parent = String(region.prefectureAdcode ?? region.parentAdcode ?? "");
    if (!targetPrefectureSet().has(parent)) continue;
    const current = counts.get(parent) ?? new Set<string>();
    current.add(String(region.adcode));
    counts.set(parent, current);
  }
  return new Map(Array.from(counts.entries()).map(([key, value]) => [key, value.size]));
}

function candidateByRegion(candidates: PatchCandidate[]): Map<string, PatchCandidate[]> {
  const map = new Map<string, PatchCandidate[]>();
  for (const candidate of candidates) {
    const list = map.get(candidate.region) ?? [];
    list.push(candidate);
    map.set(candidate.region, list);
  }
  return map;
}

function featuresForPrefecture(
  prefecture: string,
  candidates: PatchCandidate[],
  collections: Map<string, FeatureCollection>,
) {
  const countyFeatures: Array<{ candidate: PatchCandidate; feature: GeoJsonFeature }> = [];
  const directParentFeatures: Array<{ candidate: PatchCandidate; feature: GeoJsonFeature }> = [];
  for (const candidate of candidates) {
    const collection = collections.get(candidate.patchId);
    if (!collection) continue;
    for (const feature of collection.features) {
      const adcode = featureAdcode(feature);
      const parent = featureParent(feature);
      if (isCountyLike(feature) && parent === prefecture) {
        countyFeatures.push({ candidate, feature });
      } else if (adcode === prefecture) {
        directParentFeatures.push({ candidate, feature });
      }
    }
  }
  return { countyFeatures, directParentFeatures };
}

function coverageRows(candidates: PatchCandidate[], collections: Map<string, FeatureCollection>): PrefectureCoverage[] {
  const expectedCounts = countyCountsByPrefecture();
  const byRegion = candidateByRegion(candidates);
  return TARGET_PREFECTURES.map((target) => {
    const regionCandidates = byRegion.get(target.region) ?? [];
    const { countyFeatures, directParentFeatures } = featuresForPrefecture(target.adcode, regionCandidates, collections);
    const patchedCountyCodes = new Set(countyFeatures.map(({ feature }) => featureAdcode(feature)));
    const expectedCountyCount = expectedCounts.get(target.adcode) ?? 0;
    const patchIds = Array.from(new Set([
      ...countyFeatures.map(({ candidate }) => candidate.patchId),
      ...directParentFeatures.map(({ candidate }) => candidate.patchId),
    ]));
    const coverageRatio = expectedCountyCount > 0 ? patchedCountyCodes.size / expectedCountyCount : 0;
    let mode: ParentRebuildMode = "reference_only";
    let confidence: "low" | "medium" | "high" = "low";
    let notes = "No patch sample; baseline retained as reference only.";
    if (expectedCountyCount > 0 && patchedCountyCodes.size >= expectedCountyCount) {
      mode = "derived_from_patched_county";
      confidence = "medium";
      notes = "All known county children have DataV patch geometry, so prefecture outer boundary can be dissolved from patched county polygons.";
    } else if (patchedCountyCodes.size > 0) {
      mode = "partial_derived";
      confidence = "low";
      notes = "Only part of the child counties have patch geometry; keep baseline fallback and use derived segments only as comparison.";
    } else if (directParentFeatures.length > 0) {
      mode = "partial_derived";
      confidence = "low";
      notes = "No county children exist or were patched; DataV direct parent geometry is kept as partial-derived reference.";
    }
    return {
      prefectureAdcode: target.adcode,
      name: target.name,
      region: target.region,
      patchIds,
      expectedCountyCount,
      patchedCountyCount: patchedCountyCodes.size,
      directParentFeatureCount: directParentFeatures.length,
      coverageRatio: Math.round(coverageRatio * 1000) / 1000,
      mode,
      confidence,
      notes,
    };
  });
}

function addBoundarySegments(
  feature: GeoJsonFeature,
  segments: Map<string, SegmentAccumulator>,
): void {
  const adcode = featureAdcode(feature);
  const name = featureName(feature);
  for (const ring of collectRings(feature.geometry)) {
    for (let index = 0; index < ring.length - 1; index += 1) {
      const start = ring[index];
      const end = ring[index + 1];
      if (positionKey(start) === positionKey(end)) continue;
      const key = edgeKey(start, end);
      const current = segments.get(key) ?? { key, start, end, sources: new Set<string>(), names: new Set<string>() };
      current.sources.add(adcode);
      current.names.add(name);
      segments.set(key, current);
    }
  }
}

function dissolveOuterSegments(features: GeoJsonFeature[]): SegmentAccumulator[] {
  const segments = new Map<string, SegmentAccumulator>();
  for (const feature of features) addBoundarySegments(feature, segments);
  return Array.from(segments.values()).filter((segment) => segment.sources.size === 1);
}

function patchCountyBoundaryFeatures(candidates: PatchCandidate[], collections: Map<string, FeatureCollection>): GeoJsonFeature[] {
  const segments = new Map<string, SegmentAccumulator>();
  const meta = new Map<string, { patchIds: Set<string>; region: Set<string>; confidence: Set<string>; licenseRisk: Set<string> }>();
  for (const candidate of candidates) {
    const collection = collections.get(candidate.patchId);
    if (!collection) continue;
    for (const feature of collection.features.filter(isCountyLike)) {
      for (const ring of collectRings(feature.geometry)) {
        for (let index = 0; index < ring.length - 1; index += 1) {
          const start = ring[index];
          const end = ring[index + 1];
          if (positionKey(start) === positionKey(end)) continue;
          const key = edgeKey(start, end);
          const current = segments.get(key) ?? { key, start, end, sources: new Set<string>(), names: new Set<string>() };
          current.sources.add(featureAdcode(feature));
          current.names.add(featureName(feature));
          segments.set(key, current);
          const currentMeta = meta.get(key) ?? {
            patchIds: new Set<string>(),
            region: new Set<string>(),
            confidence: new Set<string>(),
            licenseRisk: new Set<string>(),
          };
          currentMeta.patchIds.add(candidate.patchId);
          currentMeta.region.add(candidate.region);
          currentMeta.confidence.add(candidate.confidence);
          currentMeta.licenseRisk.add(candidate.licenseRisk);
          meta.set(key, currentMeta);
        }
      }
    }
  }
  return Array.from(segments.values()).map((segment) => {
    const codes = Array.from(segment.sources).sort();
    const itemMeta = meta.get(segment.key);
    return {
      type: "Feature",
      properties: {
        layer: "county_boundary",
        level: "county",
        leftAdcode: codes[0] ?? null,
        rightAdcode: codes[1] ?? null,
        parentAdcode: null,
        source: "datav_patch",
        parentRebuildMode: "partial_derived",
        patchIds: Array.from(itemMeta?.patchIds ?? []).join(","),
        confidence: Array.from(itemMeta?.confidence ?? []).includes("medium") ? "medium" : "low",
        productionApproved: false,
        region: Array.from(itemMeta?.region ?? []).join(","),
        licenseRisk: Array.from(itemMeta?.licenseRisk ?? ["high"]).join(","),
        topologyVersion: "g4-4-1-patch-county-segment-dedupe-v1",
        displayMode: "gcj02",
        coordinateSystem: "GCJ-02-preoffset",
        sourceCoordinateSystem: "DataV-lonlat-assumed-GCJ02",
        qualityMode: "experimental-parent-derived",
      },
      geometry: { type: "LineString", coordinates: [segment.start, segment.end] },
    };
  });
}

function derivedPrefectureBoundaryFeatures(
  candidates: PatchCandidate[],
  collections: Map<string, FeatureCollection>,
  coverage: PrefectureCoverage[],
): GeoJsonFeature[] {
  const byRegion = candidateByRegion(candidates);
  const features: GeoJsonFeature[] = [];
  for (const row of coverage.filter((item) => item.mode !== "reference_only")) {
    const regionCandidates = byRegion.get(row.region) ?? [];
    const { countyFeatures, directParentFeatures } = featuresForPrefecture(row.prefectureAdcode, regionCandidates, collections);
    const sourceFeatures = countyFeatures.length > 0
      ? countyFeatures.map(({ feature }) => feature)
      : directParentFeatures.map(({ feature }) => feature);
    const parentSource = countyFeatures.length > 0 ? "derived_from_patched_county" : "datav_parent_reference";
    const segments = dissolveOuterSegments(sourceFeatures);
    for (const segment of segments) {
      features.push({
        type: "Feature",
        properties: {
          layer: "prefecture_boundary",
          level: "prefecture",
          leftAdcode: row.prefectureAdcode,
          rightAdcode: null,
          parentAdcode: provinceOf(row.prefectureAdcode),
          source: parentSource,
          parentRebuildMode: row.mode,
          patchIds: row.patchIds.join(","),
          confidence: row.confidence,
          productionApproved: false,
          region: row.region,
          licenseRisk: "high",
          topologyVersion: "g4-4-1-parent-derived-dissolve-v1",
          displayMode: "gcj02",
          coordinateSystem: "GCJ-02-preoffset",
          sourceCoordinateSystem: "DataV-lonlat-assumed-GCJ02",
          qualityMode: "experimental-parent-derived",
        },
        geometry: { type: "LineString", coordinates: [segment.start, segment.end] },
      });
    }
  }
  return features;
}

function baselineLayer(layer: LayerName, coverage: PrefectureCoverage[]): FeatureCollection {
  const level = layer.replace("_boundary", "");
  const path = `${CHINA_GCJ02_SOURCE_DIR}/china-${level}-boundary-source.geojson`;
  const collection = readJson<FeatureCollection>(path);
  const prefectures = targetPrefectureSet();
  const provinces = targetProvinceSet();
  const referenceRegions = new Set(coverage.filter((row) => row.mode === "reference_only").map((row) => row.prefectureAdcode));
  return {
    type: "FeatureCollection",
    name: `patch_regions_${layer}_baseline_subset`,
    features: collection.features.filter((feature) => {
      const props = feature.properties ?? {};
      const left = props.leftAdcode === undefined ? null : String(props.leftAdcode);
      const right = props.rightAdcode === undefined ? null : String(props.rightAdcode);
      const parent = props.parentAdcode === undefined ? null : String(props.parentAdcode);
      if (layer === "province_boundary") return Boolean((left && provinces.has(left)) || (right && provinces.has(right)));
      if (layer === "prefecture_boundary") return Boolean((left && prefectures.has(left)) || (right && prefectures.has(right)));
      return Boolean(parent && prefectures.has(parent));
    }).map((feature) => {
      const props = feature.properties ?? {};
      const left = props.leftAdcode === undefined ? null : String(props.leftAdcode);
      const parent = props.parentAdcode === undefined ? null : String(props.parentAdcode);
      const referenceOnly = layer === "prefecture_boundary" && Boolean((left && referenceRegions.has(left)) || (parent && referenceRegions.has(parent)));
      return {
        ...feature,
        properties: {
          ...props,
          source: "baseline_2025",
          parentRebuildMode: referenceOnly ? "reference_only" : "baseline",
          patchIds: "",
          confidence: referenceOnly ? "low" : "fallback",
          productionApproved: false,
          region: regionForAdcode(left ?? parent ?? ""),
          licenseRisk: "high",
        },
      };
    }),
  };
}

function regionForAdcode(adcode: string): string {
  const target = TARGET_PREFECTURES.find((item) => item.adcode === adcode);
  return target?.region ?? "";
}

function countVertices(collection: FeatureCollection): number {
  return collection.features.reduce((sum, feature) => sum + countCoordinatePairs(feature.geometry?.coordinates), 0);
}

function countCoordinatePairs(value: unknown): number {
  if (!Array.isArray(value)) return 0;
  if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") return 1;
  return value.reduce((sum, child) => sum + countCoordinatePairs(child), 0);
}

function writeSources(
  candidates: PatchCandidate[],
  collections: Map<string, FeatureCollection>,
  coverage: PrefectureCoverage[],
): SourceLayer[] {
  const province = baselineLayer("province_boundary", coverage);
  const prefecture = baselineLayer("prefecture_boundary", coverage);
  const county = baselineLayer("county_boundary", coverage);
  const derivedPrefecture = derivedPrefectureBoundaryFeatures(candidates, collections, coverage);
  const patchCounty = patchCountyBoundaryFeatures(candidates, collections);
  prefecture.features.push(...derivedPrefecture);
  county.features.push(...patchCounty);

  const layers: Array<{ name: LayerName; collection: FeatureCollection }> = [
    { name: "province_boundary", collection: province },
    { name: "prefecture_boundary", collection: prefecture },
    { name: "county_boundary", collection: county },
  ];

  return layers.map(({ name, collection }) => {
    const level = name.replace("_boundary", "");
    const path = `${OUT_SOURCE_DIR}/patch-regions-${level}-boundary-source.geojson`;
    writeJson(path, {
      ...collection,
      properties: {
        phase: "G4.4.1",
        productionApproved: false,
        parentDerived: true,
      },
    });
    return {
      name,
      path,
      featureCount: collection.features.length,
      sizeBytes: statSync(absolute(path)).size,
      vertexCount: countVertices(collection),
      parentDerivedFeatureCount: collection.features.filter((feature) =>
        feature.properties?.source === "derived_from_patched_county" ||
        feature.properties?.source === "datav_parent_reference",
      ).length,
      countyPatchFeatureCount: collection.features.filter((feature) => feature.properties?.source === "datav_patch").length,
    };
  });
}

function layerStatsFromExisting(path: string, targetLayer: LayerName): { featureCount: number; vertexCount: number } {
  const collection = readJson<FeatureCollection>(path);
  const features = collection.features.filter((feature) => feature.properties?.layer === targetLayer);
  return {
    featureCount: features.length,
    vertexCount: features.reduce((sum, feature) => sum + countCoordinatePairs(feature.geometry?.coordinates), 0),
  };
}

function sourceSegments(layers: SourceLayer[]): SegmentRecord[] {
  return layers.flatMap((layer) => {
    const collection = readJson<FeatureCollection>(layer.path);
    return collection.features.flatMap((feature) => {
      if (feature.geometry?.type !== "LineString" || !Array.isArray(feature.geometry.coordinates)) return [];
      const points = feature.geometry.coordinates.map(toPosition).filter(Boolean) as Position[];
      const records: SegmentRecord[] = [];
      for (let index = 0; index < points.length - 1; index += 1) {
        records.push({
          layer: layer.name,
          source: feature.properties?.source === undefined ? null : String(feature.properties.source),
          parentRebuildMode: feature.properties?.parentRebuildMode === undefined ? null : String(feature.properties.parentRebuildMode),
          start: points[index],
          end: points[index + 1],
        });
      }
      return records;
    });
  });
}

function haversineMeters(a: Position, b: Position): number {
  const radius = 6_371_000;
  const toRad = (value: number) => value * Math.PI / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * radius * Math.asin(Math.min(1, Math.sqrt(h)));
}

function anomalyMetrics(layers: SourceLayer[]) {
  const segments = sourceSegments(layers);
  const seen = new Set<string>();
  const duplicate = new Set<string>();
  let longSegmentCount = 0;
  let maxSegmentMeters = 0;
  for (const segment of segments) {
    const length = haversineMeters(segment.start, segment.end);
    maxSegmentMeters = Math.max(maxSegmentMeters, length);
    if (length > LONG_SEGMENT_METERS) longSegmentCount += 1;
    const key = `${segment.layer}|${edgeKey(segment.start, segment.end)}`;
    if (seen.has(key)) duplicate.add(key);
    seen.add(key);
  }
  const derivedSegments = segments.filter((segment) => segment.source === "derived_from_patched_county" || segment.source === "datav_parent_reference");
  return {
    segmentCount: segments.length,
    derivedParentSegmentCount: derivedSegments.length,
    longSegmentThresholdMeters: LONG_SEGMENT_METERS,
    longSegmentCount,
    maxSegmentMeters: Math.round(maxSegmentMeters * 10) / 10,
    duplicateSegmentCount: duplicate.size,
    crossingCheck: crossingMetrics(derivedSegments),
  };
}

function crossingMetrics(segments: SegmentRecord[]) {
  const maxPairs = 2_000_000;
  let comparedPairs = 0;
  let crossingCount = 0;
  const grid = new Map<string, number[]>();
  const compared = new Set<string>();
  const cellSize = 0.05;
  const cellKeys = (segment: SegmentRecord) => {
    const minX = Math.min(segment.start[0], segment.end[0]);
    const maxX = Math.max(segment.start[0], segment.end[0]);
    const minY = Math.min(segment.start[1], segment.end[1]);
    const maxY = Math.max(segment.start[1], segment.end[1]);
    const keys: string[] = [];
    for (let x = Math.floor(minX / cellSize); x <= Math.floor(maxX / cellSize); x += 1) {
      for (let y = Math.floor(minY / cellSize); y <= Math.floor(maxY / cellSize); y += 1) keys.push(`${x}:${y}`);
    }
    return keys;
  };
  for (let index = 0; index < segments.length; index += 1) {
    for (const key of cellKeys(segments[index])) {
      const prior = grid.get(key) ?? [];
      for (const otherIndex of prior) {
        const pair = otherIndex < index ? `${otherIndex}:${index}` : `${index}:${otherIndex}`;
        if (compared.has(pair)) continue;
        compared.add(pair);
        comparedPairs += 1;
        if (comparedPairs > maxPairs) {
          return { status: "skipped_pair_limit", comparedPairs, crossingCount };
        }
        if (segmentsIntersect(segments[index], segments[otherIndex])) crossingCount += 1;
      }
      prior.push(index);
      grid.set(key, prior);
    }
  }
  return { status: "completed_derived_parent_segments_only", comparedPairs, crossingCount };
}

function segmentsIntersect(a: SegmentRecord, b: SegmentRecord): boolean {
  if (
    positionKey(a.start) === positionKey(b.start) ||
    positionKey(a.start) === positionKey(b.end) ||
    positionKey(a.end) === positionKey(b.start) ||
    positionKey(a.end) === positionKey(b.end)
  ) return false;
  const orient = (p: Position, q: Position, r: Position) =>
    Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  const o1 = orient(a.start, a.end, b.start);
  const o2 = orient(a.start, a.end, b.end);
  const o3 = orient(b.start, b.end, a.start);
  const o4 = orient(b.start, b.end, a.end);
  return o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0 && o1 !== o2 && o3 !== o4;
}

function sharedSegmentMetrics(layers: SourceLayer[]) {
  const segments = sourceSegments(layers);
  const countyPatchKeys = new Set(segments
    .filter((segment) => segment.layer === "county_boundary" && segment.source === "datav_patch")
    .map((segment) => edgeKey(segment.start, segment.end)));
  const derivedParent = segments.filter((segment) => segment.layer === "prefecture_boundary" &&
    (segment.source === "derived_from_patched_county" || segment.source === "datav_parent_reference"));
  const baselineParent = segments.filter((segment) => segment.layer === "prefecture_boundary" && segment.source === "baseline_2025");
  const derivedShared = derivedParent.filter((segment) => countyPatchKeys.has(edgeKey(segment.start, segment.end))).length;
  const baselineShared = baselineParent.filter((segment) => countyPatchKeys.has(edgeKey(segment.start, segment.end))).length;
  return {
    countyPatchSegmentCount: countyPatchKeys.size,
    derivedParentSegmentCount: derivedParent.length,
    derivedParentSharedWithCountyPatch: derivedShared,
    derivedParentSharedRatio: derivedParent.length > 0 ? Math.round((derivedShared / derivedParent.length) * 1000) / 1000 : 0,
    baselineParentSegmentCount: baselineParent.length,
    baselineParentSharedWithCountyPatch: baselineShared,
    baselineParentSharedRatio: baselineParent.length > 0 ? Math.round((baselineShared / baselineParent.length) * 1000) / 1000 : 0,
  };
}

function buildTippecanoeCommand(sourceLayers: SourceLayer[]): string[] {
  return [
    "tippecanoe",
    "--force",
    "--minimum-zoom=3",
    "--maximum-zoom=12",
    "--no-feature-limit",
    "--no-tile-size-limit",
    "--extend-zooms-if-still-dropping",
    "--name=patch-regions-admin-boundaries-gcj02-parent-derived",
    "--description=Experimental patch-region admin boundaries with prefecture boundaries derived from patched county polygons. productionApproved=false.",
    ...TILE_ATTRIBUTE_INCLUDES.map((attribute) => `--include=${attribute}`),
    "-o",
    OUT_MBTILES,
    "-L",
    `${sourceLayers[0].name}:${sourceLayers[0].path}`,
    "-L",
    `${sourceLayers[1].name}:${sourceLayers[1].path}`,
    "-L",
    `${sourceLayers[2].name}:${sourceLayers[2].path}`,
  ];
}

function buildPmtilesCommand(): string[] {
  return ["pmtiles", "convert", OUT_MBTILES, OUT_PMTILES];
}

function renderDoc(report: Record<string, unknown>): string {
  const metrics = report.metrics as Record<string, unknown>;
  const anomalies = metrics.anomalies as Record<string, unknown>;
  const shared = metrics.sharedSegments as Record<string, unknown>;
  const coverageRowsText = (report.coverage as PrefectureCoverage[]).map((row) =>
    `| ${row.name} | ${row.prefectureAdcode} | ${row.region} | ${row.mode} | ${row.patchedCountyCount}/${row.expectedCountyCount} | ${row.directParentFeatureCount} | ${row.confidence} |`,
  ).join("\n");
  const layerRows = (report.sourceLayers as SourceLayer[]).map((layer) =>
    `| ${layer.name} | ${layer.featureCount} | ${layer.parentDerivedFeatureCount} | ${layer.countyPatchFeatureCount} | ${layer.vertexCount} | ${layer.sizeBytes} |`,
  ).join("\n");

  return `# Wanderly v2.0 Admin Parent-Derived Boundary G4.4.1

Generated at: ${report.generatedAt}

## Scope

This is an experimental patch-region PMTiles artifact. It verifies whether prefecture boundaries should be rebuilt from DataV-patched county geometry instead of continuing to use coarse baseline parent boundaries. It does not replace production PMTiles, does not change Map Studio defaults, does not write Supabase, and does not upload OSS.

## Outputs

- Source directory: \`${OUT_SOURCE_DIR}/\`
- MBTiles: \`${OUT_MBTILES}\`
- PMTiles: \`${OUT_PMTILES}\`
- Machine manifest: \`${OUT_JSON}\`

## Method

- Baseline province/prefecture/county boundary sources are filtered to the selected patch regions and retained as fallback/reference.
- DataV county polygons from G4.3 are converted into county boundary segments.
- Prefecture boundaries are rebuilt by segment-dissolving patched county polygons: internal child-child edges are removed, and one-sided outer edges become \`source=derived_from_patched_county\`.
- If county coverage is incomplete, the output is marked \`partial_derived\`; if no sample exists, it remains \`reference_only\`.
- DataV coordinates are kept as DataV lon/lat assumed GCJ-compatible, matching the G4.4 acceptance artifact.

## Coverage

| prefecture | adcode | region | parentRebuildMode | county coverage | direct parent features | confidence |
| --- | --- | --- | --- | ---: | ---: | --- |
${coverageRowsText}

## Layer Metrics

| layer | featureCount | parentDerivedFeatureCount | countyPatchFeatureCount | vertexCount | sizeBytes |
| --- | ---: | ---: | ---: | ---: | ---: |
${layerRows}

## Comparison Metrics

- Patch-before prefecture source vertices: ${metrics.prefectureVertexCountBefore}
- Parent-derived prefecture source vertices: ${metrics.prefectureVertexCountAfter}
- Affected prefecture count: ${metrics.affectedPrefectureCount}
- Full parent-derived prefectures: ${(metrics.fullDerivedPrefectures as string[]).join(", ")}
- Partial-derived prefectures: ${(metrics.partialDerivedPrefectures as string[]).join(", ")}
- Reference-only prefectures: ${(metrics.referenceOnlyPrefectures as string[]).join(", ")}

## Shared Segment Check

- Derived parent segments: ${shared.derivedParentSegmentCount}
- Derived parent segments shared with DataV county patch: ${shared.derivedParentSharedWithCountyPatch}
- Derived shared ratio: ${shared.derivedParentSharedRatio}
- Baseline parent segments shared with DataV county patch: ${shared.baselineParentSharedWithCountyPatch}
- Baseline shared ratio: ${shared.baselineParentSharedRatio}

This strongly indicates that the old parent boundary is the source of the parent/child mismatch in patched regions: derived parent boundaries share their geometry with patched child boundaries by construction, while baseline parent boundaries rarely share exact segments with DataV county patch geometry.

## Anomaly Check

- Segment count: ${anomalies.segmentCount}
- Derived parent segment count: ${anomalies.derivedParentSegmentCount}
- Long segment threshold: ${anomalies.longSegmentThresholdMeters} meters
- Long segment count: ${anomalies.longSegmentCount}
- Max segment length: ${anomalies.maxSegmentMeters} meters
- Duplicate segment count: ${anomalies.duplicateSegmentCount}
- Crossing check: ${(anomalies.crossingCheck as Record<string, unknown>).status}, crossingCount=${(anomalies.crossingCheck as Record<string, unknown>).crossingCount}, comparedPairs=${(anomalies.crossingCheck as Record<string, unknown>).comparedPairs}

## Answers

- 市级粗糙是否主要来自 baseline parent boundary：是，本轮验收问题与 G4.4 指标一致，县级 patch 变细后，旧市级 baseline 仍保持粗糙口径，导致父子边界不一致。
- parent-derived 是否明显改善市级海岸线：对完整县区覆盖的厦门、舟山、上海、广州、佛山、深圳、惠州，理论上明显改善，因为市级外边界由 patch 后县区外轮廓直接生成；仍需 Map Studio 视觉验收确认坐标口径。
- 哪些区域适合全量 parent-derived：广州、佛山、深圳、惠州、厦门、舟山、上海。
- 哪些区域只能 partial-derived：东莞只能 partial/reference，因为本地 DataV 样本是市级直接 geometry，不是县区 child dissolve；杭州湾没有样本，只能 referenceOnly。
- 是否值得作为后续多精度瓦片默认生成规则：值得进入下一轮默认规则候选，但前提是每个 parent 的 child coverage 达到完整，并且 DataV/生产主源授权与坐标口径通过。

## Manual Acceptance URL

\`\`\`env
NEXT_PUBLIC_MAP_STUDIO_ADMIN_PMTILES_OVERLAY=1
NEXT_PUBLIC_MAP_STUDIO_ADMIN_PMTILES_ONLY=1
NEXT_PUBLIC_MAP_STUDIO_ADMIN_PMTILES_URL=/admin-tiles/experimental/patch-regions-admin-boundaries-gcj02-parent-derived.pmtiles
\`\`\`
`;
}

function main(): void {
  const execute = process.argv.includes("--execute");
  const candidates = selectedCandidates();
  const collections = patchCollections(candidates);
  const coverage = coverageRows(candidates, collections);
  const sourceLayers = writeSources(candidates, collections, coverage);
  const tippecanoe = findToolWithWslFallback("tippecanoe");
  const pmtiles = findToolWithWslFallback("pmtiles");
  const tippecanoeCommand = buildTippecanoeCommand(sourceLayers);
  const pmtilesCommand = buildPmtilesCommand();

  if (execute) {
    if (!tippecanoe.available || !pmtiles.available || !tippecanoe.runner || !pmtiles.runner) {
      throw new Error("tippecanoe and pmtiles CLI are required for --execute.");
    }
    if (tippecanoe.runner !== pmtiles.runner) {
      throw new Error("tippecanoe and pmtiles were found in different environments.");
    }
    mkdirSync(dirname(absolute(OUT_MBTILES)), { recursive: true });
    mkdirSync(dirname(absolute(OUT_PMTILES)), { recursive: true });
    executeCommand(tippecanoeCommand, tippecanoe.runner);
    executeCommand(pmtilesCommand, pmtiles.runner);
  }

  const previousPrefectureStats = existsSync(absolute("temp/admin-tile-prototype/guangdong-patch-source/guangdong-prefecture-boundary-source.geojson"))
    ? layerStatsFromExisting("temp/admin-tile-prototype/guangdong-patch-source/guangdong-prefecture-boundary-source.geojson", "prefecture_boundary")
    : { featureCount: 0, vertexCount: 0 };
  const currentPrefecture = sourceLayers.find((layer) => layer.name === "prefecture_boundary");
  const anomalies = anomalyMetrics(sourceLayers);
  const sharedSegments = sharedSegmentMetrics(sourceLayers);
  const report = {
    phase: "G4.4.1",
    generatedAt: new Date().toISOString(),
    dryRun: !execute,
    productionApproved: false,
    scope: "patch-regions",
    sourceLayers,
    coverage,
    patchCandidates: candidates.map((candidate) => ({
      patchId: candidate.patchId,
      region: candidate.region,
      patchType: candidate.patchType,
      outputPath: candidate.outputPath,
      productionApproved: false,
    })),
    outputs: {
      sourceDir: OUT_SOURCE_DIR,
      mbtiles: {
        path: OUT_MBTILES,
        exists: existsSync(absolute(OUT_MBTILES)),
        sizeBytes: existsSync(absolute(OUT_MBTILES)) ? statSync(absolute(OUT_MBTILES)).size : null,
        sha256: sha256(OUT_MBTILES),
      },
      pmtiles: {
        path: OUT_PMTILES,
        exists: existsSync(absolute(OUT_PMTILES)),
        sizeBytes: existsSync(absolute(OUT_PMTILES)) ? statSync(absolute(OUT_PMTILES)).size : null,
        sha256: sha256(OUT_PMTILES),
      },
      previousGuangdongPatchPmtiles: {
        path: ORIGINAL_GD_PATCH_PMTILES,
        exists: existsSync(absolute(ORIGINAL_GD_PATCH_PMTILES)),
        sizeBytes: existsSync(absolute(ORIGINAL_GD_PATCH_PMTILES)) ? statSync(absolute(ORIGINAL_GD_PATCH_PMTILES)).size : null,
        sha256: sha256(ORIGINAL_GD_PATCH_PMTILES),
      },
    },
    metrics: {
      prefectureVertexCountBefore: previousPrefectureStats.vertexCount,
      prefectureVertexCountAfter: currentPrefecture?.vertexCount ?? 0,
      affectedPrefectureCount: coverage.filter((row) => row.mode !== "reference_only").length,
      fullDerivedPrefectures: coverage.filter((row) => row.mode === "derived_from_patched_county").map((row) => `${row.name}(${row.prefectureAdcode})`),
      partialDerivedPrefectures: coverage.filter((row) => row.mode === "partial_derived").map((row) => `${row.name}(${row.prefectureAdcode})`),
      referenceOnlyPrefectures: coverage.filter((row) => row.mode === "reference_only").map((row) => `${row.name}(${row.prefectureAdcode})`),
      countyPatchCoveragePerPrefecture: coverage.map((row) => ({
        prefectureAdcode: row.prefectureAdcode,
        name: row.name,
        mode: row.mode,
        expectedCountyCount: row.expectedCountyCount,
        patchedCountyCount: row.patchedCountyCount,
        coverageRatio: row.coverageRatio,
      })),
      anomalies,
      sharedSegments,
    },
    coordinateHandling: {
      baseline: "Existing china-gcj02-source generated by WGS84-to-GCJ02 transform.",
      datavPatch: "Kept as DataV lon/lat assumed GCJ-compatible; no second offset applied.",
    },
    tools: [tippecanoe, pmtiles],
    commands: {
      tippecanoe: tippecanoeCommand,
      pmtiles: pmtilesCommand,
      tippecanoeText: commandToText(tippecanoeCommand),
      pmtilesText: commandToText(pmtilesCommand),
    },
    manualAcceptanceEnv: {
      NEXT_PUBLIC_MAP_STUDIO_ADMIN_PMTILES_OVERLAY: "1",
      NEXT_PUBLIC_MAP_STUDIO_ADMIN_PMTILES_ONLY: "1",
      NEXT_PUBLIC_MAP_STUDIO_ADMIN_PMTILES_URL: "/admin-tiles/experimental/patch-regions-admin-boundaries-gcj02-parent-derived.pmtiles",
    },
    recommendation: {
      shouldUseForProduction: false,
      shouldContinue: true,
      nextStep: "Run Map Studio visual QA for parent/child edge consistency; then decide whether parent-derived should become the default generator rule for complete child coverage regions.",
    },
  };

  writeJson(`${OUT_SOURCE_DIR}/manifest.json`, {
    phase: "G4.4.1",
    generatedAt: report.generatedAt,
    productionApproved: false,
    sourceLayers,
    coverage,
    coordinateHandling: report.coordinateHandling,
  });
  writeJson(OUT_JSON, report);
  writeText(OUT_DOC, renderDoc(report));
  console.log(JSON.stringify(report, null, 2));
}

main();
