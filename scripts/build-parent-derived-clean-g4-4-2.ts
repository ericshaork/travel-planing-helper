import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

type Position = [number, number];
type LayerName = "province_boundary" | "prefecture_boundary" | "county_boundary";
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
  patchType: string;
  outputPath: string | null;
  productionApproved: false;
};

type G441Manifest = {
  sourceLayers: Array<{ name: LayerName; path: string; vertexCount: number }>;
  coverage: Array<{ prefectureAdcode: string; name: string; region: string; mode: string }>;
  patchCandidates: PatchCandidate[];
  metrics: {
    anomalies: { crossingCheck: { crossingCount: number } };
    sharedSegments: { derivedParentSharedRatio: number; baselineParentSharedRatio: number };
  };
};

type FeatureRecord = {
  id: number;
  layer: LayerName;
  featureIndex: number;
  feature: GeoJsonFeature;
  start: Position;
  end: Position;
  lengthMeters: number;
  source: string;
  parentRebuildMode: string;
  region: string;
};

type Diagnostics = {
  featureKey: string;
  cleanDecision: "keep" | "filter";
  cleanReasons: string[];
  crossingCount: number;
  lengthMeters: number;
  duplicateCount: number;
  nearDuplicateCount: number;
  bboxOutlier: boolean;
  selfIntersection: boolean;
  tinySliverBoundary: boolean;
  islandToMainlandStraightSegment: boolean;
};

type SourceLayerStats = {
  name: LayerName;
  cleanPath: string;
  debugPath: string;
  cleanFeatureCount: number;
  debugFeatureCount: number;
  filteredFeatureCount: number;
  cleanSizeBytes: number;
  debugSizeBytes: number;
  cleanVertexCount: number;
  debugVertexCount: number;
};

const ROOT = process.cwd();
const G441_MANIFEST = "data/source-manifests/admin-parent-derived-boundary.g4-4-1.json";
const G43_MANIFEST = "data/source-manifests/admin-patch-candidates.g4-3.json";
const CLEAN_SOURCE_DIR = "temp/admin-tile-prototype/parent-derived-patch-clean-source";
const DEBUG_SOURCE_DIR = "temp/admin-tile-prototype/parent-derived-patch-debug-source";
const OUT_MBTILES = "temp/admin-tile-prototype/patch-regions-admin-boundaries-gcj02-parent-derived-clean.mbtiles";
const OUT_PMTILES = "public/admin-tiles/experimental/patch-regions-admin-boundaries-gcj02-parent-derived-clean.pmtiles";
const OUT_JSON = "data/source-manifests/admin-parent-derived-clean.g4-4-2.json";
const OUT_DOC = "docs/WANDERLY_V2_ADMIN_PARENT_DERIVED_CLEAN_G4_4_2.md";
const PREVIOUS_PMTILES = "public/admin-tiles/experimental/patch-regions-admin-boundaries-gcj02-parent-derived.pmtiles";
const LONG_SEGMENT_METERS = 20_000;
const TINY_SEGMENT_METERS = 2;
const ISLAND_STRAIGHT_SEGMENT_METERS = 8_000;
const BBOX_BUFFER_DEGREES = 0.08;

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
  "cleanDecision",
  "cleanReasons",
  "crossingCount",
  "lengthMeters",
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
  const result = spawnSync(command, args, { encoding: "utf8", shell: process.platform !== "win32" });
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

function toPosition(value: unknown): Position | null {
  if (!Array.isArray(value) || typeof value[0] !== "number" || typeof value[1] !== "number") return null;
  return [value[0], value[1]];
}

function positionKey(point: Position, precision = 6): string {
  return `${point[0].toFixed(precision)},${point[1].toFixed(precision)}`;
}

function nearPositionKey(point: Position): string {
  return positionKey(point, 4);
}

function edgeKey(start: Position, end: Position, precision = 6): string {
  const a = positionKey(start, precision);
  const b = positionKey(end, precision);
  return a <= b ? `${a}|${b}` : `${b}|${a}`;
}

function nearEdgeKey(start: Position, end: Position): string {
  const a = nearPositionKey(start);
  const b = nearPositionKey(end);
  return a <= b ? `${a}|${b}` : `${b}|${a}`;
}

function layerSourcePath(manifest: G441Manifest, layer: LayerName): string {
  const source = manifest.sourceLayers.find((item) => item.name === layer);
  if (!source) throw new Error(`Missing G4.4.1 source layer ${layer}`);
  return source.path;
}

function recordsFromCollection(layer: LayerName, collection: FeatureCollection): FeatureRecord[] {
  return collection.features.flatMap((feature, featureIndex) => {
    if (feature.geometry?.type !== "LineString" || !Array.isArray(feature.geometry.coordinates)) return [];
    const points = feature.geometry.coordinates.map(toPosition).filter(Boolean) as Position[];
    if (points.length < 2) return [];
    const props = feature.properties ?? {};
    return [{
      id: featureIndex,
      layer,
      featureIndex,
      feature,
      start: points[0],
      end: points[points.length - 1],
      lengthMeters: haversineMeters(points[0], points[points.length - 1]),
      source: String(props.source ?? ""),
      parentRebuildMode: String(props.parentRebuildMode ?? ""),
      region: String(props.region ?? ""),
    }];
  });
}

function isDerivedParent(record: FeatureRecord): boolean {
  return record.layer === "prefecture_boundary" &&
    (record.source === "derived_from_patched_county" || record.source === "datav_parent_reference");
}

function collectCoordinates(geometry: GeoJsonGeometry | null | undefined, visit: (point: Position) => void): void {
  if (!geometry) return;
  if (geometry.type === "GeometryCollection") {
    for (const child of geometry.geometries ?? []) collectCoordinates(child, visit);
    return;
  }
  const walk = (value: unknown): void => {
    const point = toPosition(value);
    if (point) {
      visit(point);
      return;
    }
    if (Array.isArray(value)) {
      for (const child of value) walk(child);
    }
  };
  walk(geometry.coordinates);
}

function patchRegionBboxes(): Map<string, [number, number, number, number]> {
  const g43 = readJson<{ patchCandidates: Array<PatchCandidate & { source?: string }> }>(G43_MANIFEST);
  const result = new Map<string, [number, number, number, number]>();
  for (const candidate of g43.patchCandidates) {
    if (candidate.source !== "datav" || !candidate.outputPath || !existsSync(absolute(candidate.outputPath))) continue;
    const collection = readJson<FeatureCollection>(candidate.outputPath);
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const feature of collection.features) {
      collectCoordinates(feature.geometry, (point) => {
        minX = Math.min(minX, point[0]);
        minY = Math.min(minY, point[1]);
        maxX = Math.max(maxX, point[0]);
        maxY = Math.max(maxY, point[1]);
      });
    }
    if (Number.isFinite(minX)) {
      result.set(candidate.region, [
        minX - BBOX_BUFFER_DEGREES,
        minY - BBOX_BUFFER_DEGREES,
        maxX + BBOX_BUFFER_DEGREES,
        maxY + BBOX_BUFFER_DEGREES,
      ]);
    }
  }
  return result;
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

function bboxContains(bbox: [number, number, number, number] | undefined, point: Position): boolean {
  if (!bbox) return true;
  return point[0] >= bbox[0] && point[0] <= bbox[2] && point[1] >= bbox[1] && point[1] <= bbox[3];
}

function diagnose(records: FeatureRecord[]): Map<string, Diagnostics> {
  const diagnostics = new Map<string, Diagnostics>();
  const derived = records.filter(isDerivedParent);
  const bboxes = patchRegionBboxes();
  const duplicateCounts = countBy(records.map((record) => `${record.layer}|${edgeKey(record.start, record.end)}`));
  const nearDuplicateCounts = countBy(records.map((record) => `${record.layer}|${nearEdgeKey(record.start, record.end)}`));
  const crossingCounts = crossingCountsByFeature(derived);

  for (const record of records) {
    const key = featureKey(record);
    const duplicateCount = (duplicateCounts.get(`${record.layer}|${edgeKey(record.start, record.end)}`) ?? 1) - 1;
    const nearDuplicateCount = (nearDuplicateCounts.get(`${record.layer}|${nearEdgeKey(record.start, record.end)}`) ?? 1) - 1;
    const crossingCount = crossingCounts.get(key) ?? 0;
    const bbox = bboxes.get(record.region);
    const bboxOutlier = !bboxContains(bbox, record.start) || !bboxContains(bbox, record.end);
    const selfIntersection = hasSelfIntersection(record.feature);
    const tinySliverBoundary = record.lengthMeters > 0 && record.lengthMeters < TINY_SEGMENT_METERS;
    const coastalRegion = /xiamen|zhoushan|shanghai|hangzhou|coastal|islands/.test(record.region);
    const oneSided = record.feature.properties?.rightAdcode === null || record.feature.properties?.rightAdcode === undefined;
    const islandToMainlandStraightSegment = isDerivedParent(record) &&
      coastalRegion &&
      oneSided &&
      record.lengthMeters > ISLAND_STRAIGHT_SEGMENT_METERS &&
      crossingCount > 0;
    const reasons: string[] = [];

    if (isDerivedParent(record) && crossingCount > 0) reasons.push("crossing_candidate");
    if (record.lengthMeters > LONG_SEGMENT_METERS) reasons.push("abnormal_long_segment");
    if (selfIntersection) reasons.push("self_intersection");
    if (tinySliverBoundary) reasons.push("tiny_sliver_boundary");
    if (islandToMainlandStraightSegment) reasons.push("island_to_mainland_straight_segment");
    if (isDerivedParent(record) && bboxOutlier) reasons.push("bbox_outlier");
    if (duplicateCount > 0) reasons.push("duplicate_segment");
    if (nearDuplicateCount > 0 && duplicateCount === 0) reasons.push("near_duplicate_segment");

    const filter = shouldFilter({
      crossingCount,
      lengthMeters: record.lengthMeters,
      duplicateCount,
      nearDuplicateCount,
      bboxOutlier,
      selfIntersection,
      tinySliverBoundary,
      islandToMainlandStraightSegment,
      source: record.source,
      isDerivedParent: isDerivedParent(record),
    });

    diagnostics.set(key, {
      featureKey: key,
      cleanDecision: filter ? "filter" : "keep",
      cleanReasons: reasons,
      crossingCount,
      lengthMeters: Math.round(record.lengthMeters * 10) / 10,
      duplicateCount,
      nearDuplicateCount,
      bboxOutlier,
      selfIntersection,
      tinySliverBoundary,
      islandToMainlandStraightSegment,
    });
  }

  return diagnostics;
}

function shouldFilter(input: {
  crossingCount: number;
  lengthMeters: number;
  duplicateCount: number;
  nearDuplicateCount: number;
  bboxOutlier: boolean;
  selfIntersection: boolean;
  tinySliverBoundary: boolean;
  islandToMainlandStraightSegment: boolean;
  source: string;
  isDerivedParent: boolean;
}): boolean {
  if (input.duplicateCount > 0) return true;
  if (!input.isDerivedParent) return false;
  if (input.selfIntersection) return true;
  if (input.tinySliverBoundary) return true;
  if (input.bboxOutlier) return true;
  if (input.lengthMeters > LONG_SEGMENT_METERS) return true;
  if (input.islandToMainlandStraightSegment) return true;
  if (input.crossingCount >= 2) return true;
  if (input.crossingCount >= 1 && input.lengthMeters > 1_000) return true;
  return false;
}

function countBy(values: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

function featureKey(record: FeatureRecord): string {
  return `${record.layer}:${record.featureIndex}`;
}

function crossingCountsByFeature(records: FeatureRecord[]): Map<string, number> {
  const counts = new Map<string, number>();
  const maxPairs = 3_000_000;
  let comparedPairs = 0;
  const grid = new Map<string, number[]>();
  const compared = new Set<string>();
  const cellSize = 0.05;

  const cellKeys = (record: FeatureRecord) => {
    const minX = Math.min(record.start[0], record.end[0]);
    const maxX = Math.max(record.start[0], record.end[0]);
    const minY = Math.min(record.start[1], record.end[1]);
    const maxY = Math.max(record.start[1], record.end[1]);
    const keys: string[] = [];
    for (let x = Math.floor(minX / cellSize); x <= Math.floor(maxX / cellSize); x += 1) {
      for (let y = Math.floor(minY / cellSize); y <= Math.floor(maxY / cellSize); y += 1) keys.push(`${x}:${y}`);
    }
    return keys;
  };

  for (let index = 0; index < records.length; index += 1) {
    for (const key of cellKeys(records[index])) {
      const prior = grid.get(key) ?? [];
      for (const otherIndex of prior) {
        const pair = otherIndex < index ? `${otherIndex}:${index}` : `${index}:${otherIndex}`;
        if (compared.has(pair)) continue;
        compared.add(pair);
        comparedPairs += 1;
        if (comparedPairs > maxPairs) return counts;
        if (segmentsIntersect(records[index], records[otherIndex])) {
          counts.set(featureKey(records[index]), (counts.get(featureKey(records[index])) ?? 0) + 1);
          counts.set(featureKey(records[otherIndex]), (counts.get(featureKey(records[otherIndex])) ?? 0) + 1);
        }
      }
      prior.push(index);
      grid.set(key, prior);
    }
  }

  return counts;
}

function segmentsIntersect(a: Pick<FeatureRecord, "start" | "end">, b: Pick<FeatureRecord, "start" | "end">): boolean {
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

function hasSelfIntersection(feature: GeoJsonFeature): boolean {
  if (feature.geometry?.type !== "LineString" || !Array.isArray(feature.geometry.coordinates)) return false;
  const points = feature.geometry.coordinates.map(toPosition).filter(Boolean) as Position[];
  if (points.length < 4) return false;
  for (let i = 0; i < points.length - 1; i += 1) {
    for (let j = i + 2; j < points.length - 1; j += 1) {
      if (i === 0 && j === points.length - 2 && positionKey(points[0]) === positionKey(points[points.length - 1])) continue;
      if (segmentsIntersect({ start: points[i], end: points[i + 1] }, { start: points[j], end: points[j + 1] })) return true;
    }
  }
  return false;
}

function withCleanProperties(feature: GeoJsonFeature, diagnostic: Diagnostics | undefined, defaultDecision: "keep" | "filter"): GeoJsonFeature {
  const decision = diagnostic?.cleanDecision ?? defaultDecision;
  const reasons = diagnostic?.cleanReasons ?? [];
  return {
    ...feature,
    properties: {
      ...(feature.properties ?? {}),
      cleanDecision: decision,
      cleanReasons: reasons.join(","),
      crossingCount: diagnostic?.crossingCount ?? 0,
      lengthMeters: diagnostic?.lengthMeters ?? 0,
      productionApproved: false,
      qualityMode: decision === "filter" ? "experimental-parent-derived-debug" : "experimental-parent-derived-clean",
    },
  };
}

function cleanCollections(manifest: G441Manifest) {
  const layers: Array<{ name: LayerName; collection: FeatureCollection }> = [
    { name: "province_boundary", collection: readJson<FeatureCollection>(layerSourcePath(manifest, "province_boundary")) },
    { name: "prefecture_boundary", collection: readJson<FeatureCollection>(layerSourcePath(manifest, "prefecture_boundary")) },
    { name: "county_boundary", collection: readJson<FeatureCollection>(layerSourcePath(manifest, "county_boundary")) },
  ];
  const records = layers.flatMap((layer) => recordsFromCollection(layer.name, layer.collection));
  const diagnostics = diagnose(records);
  const stats: SourceLayerStats[] = [];

  for (const layer of layers) {
    const level = layer.name.replace("_boundary", "");
    const cleanPath = `${CLEAN_SOURCE_DIR}/patch-regions-${level}-boundary-source.geojson`;
    const debugPath = `${DEBUG_SOURCE_DIR}/patch-regions-${level}-boundary-debug-source.geojson`;
    const cleanFeatures: GeoJsonFeature[] = [];
    const debugFeatures: GeoJsonFeature[] = [];
    let filteredFeatureCount = 0;

    for (let index = 0; index < layer.collection.features.length; index += 1) {
      const key = `${layer.name}:${index}`;
      const diagnostic = diagnostics.get(key);
      const debugFeature = withCleanProperties(layer.collection.features[index], diagnostic, "keep");
      debugFeatures.push(debugFeature);
      if (diagnostic?.cleanDecision === "filter") {
        filteredFeatureCount += 1;
        continue;
      }
      cleanFeatures.push(withCleanProperties(layer.collection.features[index], diagnostic, "keep"));
    }

    const cleanCollection = {
      ...layer.collection,
      name: `g4_4_2_clean_${layer.name}`,
      properties: {
        ...(layer.collection.properties ?? {}),
        phase: "G4.4.2",
        sourceMode: "clean",
        productionApproved: false,
      },
      features: cleanFeatures,
    };
    const debugCollection = {
      ...layer.collection,
      name: `g4_4_2_debug_${layer.name}`,
      properties: {
        ...(layer.collection.properties ?? {}),
        phase: "G4.4.2",
        sourceMode: "debug",
        productionApproved: false,
      },
      features: debugFeatures,
    };

    writeJson(cleanPath, cleanCollection);
    writeJson(debugPath, debugCollection);
    stats.push({
      name: layer.name,
      cleanPath,
      debugPath,
      cleanFeatureCount: cleanFeatures.length,
      debugFeatureCount: debugFeatures.length,
      filteredFeatureCount,
      cleanSizeBytes: statSync(absolute(cleanPath)).size,
      debugSizeBytes: statSync(absolute(debugPath)).size,
      cleanVertexCount: countVertices(cleanCollection),
      debugVertexCount: countVertices(debugCollection),
    });
  }

  return { stats, diagnostics, originalRecords: records };
}

function countVertices(collection: FeatureCollection): number {
  return collection.features.reduce((sum, feature) => sum + countCoordinatePairs(feature.geometry?.coordinates), 0);
}

function countCoordinatePairs(value: unknown): number {
  if (!Array.isArray(value)) return 0;
  if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") return 1;
  return value.reduce((sum, child) => sum + countCoordinatePairs(child), 0);
}

function sourceRecordsFromStats(stats: SourceLayerStats[], clean = true): FeatureRecord[] {
  return stats.flatMap((stat) => {
    const collection = readJson<FeatureCollection>(clean ? stat.cleanPath : stat.debugPath);
    return recordsFromCollection(stat.name, collection);
  });
}

function crossingPairCount(records: FeatureRecord[]): number {
  const derived = records.filter(isDerivedParent);
  let count = 0;
  const grid = new Map<string, number[]>();
  const compared = new Set<string>();
  const cellSize = 0.05;
  const cellKeys = (record: FeatureRecord) => {
    const minX = Math.min(record.start[0], record.end[0]);
    const maxX = Math.max(record.start[0], record.end[0]);
    const minY = Math.min(record.start[1], record.end[1]);
    const maxY = Math.max(record.start[1], record.end[1]);
    const keys: string[] = [];
    for (let x = Math.floor(minX / cellSize); x <= Math.floor(maxX / cellSize); x += 1) {
      for (let y = Math.floor(minY / cellSize); y <= Math.floor(maxY / cellSize); y += 1) keys.push(`${x}:${y}`);
    }
    return keys;
  };
  for (let index = 0; index < derived.length; index += 1) {
    for (const key of cellKeys(derived[index])) {
      const prior = grid.get(key) ?? [];
      for (const otherIndex of prior) {
        const pair = otherIndex < index ? `${otherIndex}:${index}` : `${index}:${otherIndex}`;
        if (compared.has(pair)) continue;
        compared.add(pair);
        if (segmentsIntersect(derived[index], derived[otherIndex])) count += 1;
      }
      prior.push(index);
      grid.set(key, prior);
    }
  }
  return count;
}

function sharedSegmentMetrics(records: FeatureRecord[]) {
  const countyPatchKeys = new Set(records
    .filter((record) => record.layer === "county_boundary" && record.source === "datav_patch")
    .map((record) => edgeKey(record.start, record.end)));
  const derivedParent = records.filter((record) => record.layer === "prefecture_boundary" &&
    (record.source === "derived_from_patched_county" || record.source === "datav_parent_reference"));
  const baselineParent = records.filter((record) => record.layer === "prefecture_boundary" && record.source === "baseline_2025");
  const derivedShared = derivedParent.filter((record) => countyPatchKeys.has(edgeKey(record.start, record.end))).length;
  const baselineShared = baselineParent.filter((record) => countyPatchKeys.has(edgeKey(record.start, record.end))).length;
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

function issueSummary(diagnostics: Map<string, Diagnostics>) {
  const counts: Record<string, number> = {};
  const filteredCounts: Record<string, number> = {};
  for (const diagnostic of diagnostics.values()) {
    for (const reason of diagnostic.cleanReasons) {
      counts[reason] = (counts[reason] ?? 0) + 1;
      if (diagnostic.cleanDecision === "filter") filteredCounts[reason] = (filteredCounts[reason] ?? 0) + 1;
    }
  }
  return { counts, filteredCounts };
}

function filteredByRegion(records: FeatureRecord[], diagnostics: Map<string, Diagnostics>) {
  const summary: Record<string, number> = {};
  for (const record of records) {
    const diagnostic = diagnostics.get(featureKey(record));
    if (diagnostic?.cleanDecision !== "filter") continue;
    const region = record.region || "unknown";
    summary[region] = (summary[region] ?? 0) + 1;
  }
  return summary;
}

function buildTippecanoeCommand(stats: SourceLayerStats[]): string[] {
  return [
    "tippecanoe",
    "--force",
    "--minimum-zoom=3",
    "--maximum-zoom=12",
    "--no-feature-limit",
    "--no-tile-size-limit",
    "--extend-zooms-if-still-dropping",
    "--name=patch-regions-admin-boundaries-gcj02-parent-derived-clean",
    "--description=Experimental cleaned parent-derived patch-region admin boundaries. productionApproved=false.",
    ...TILE_ATTRIBUTE_INCLUDES.map((attribute) => `--include=${attribute}`),
    "-o",
    OUT_MBTILES,
    "-L",
    `${stats[0].name}:${stats[0].cleanPath}`,
    "-L",
    `${stats[1].name}:${stats[1].cleanPath}`,
    "-L",
    `${stats[2].name}:${stats[2].cleanPath}`,
  ];
}

function buildPmtilesCommand(): string[] {
  return ["pmtiles", "convert", OUT_MBTILES, OUT_PMTILES];
}

function renderDoc(report: Record<string, unknown>): string {
  const metrics = report.metrics as Record<string, unknown>;
  const sharedBefore = metrics.sharedSegmentsBefore as Record<string, unknown>;
  const sharedAfter = metrics.sharedSegmentsAfter as Record<string, unknown>;
  const issueSummaryValue = metrics.issueSummary as { counts: Record<string, number>; filteredCounts: Record<string, number> };
  const statsRows = (report.sourceLayers as SourceLayerStats[]).map((layer) =>
    `| ${layer.name} | ${layer.debugFeatureCount} | ${layer.cleanFeatureCount} | ${layer.filteredFeatureCount} | ${layer.cleanVertexCount} | ${layer.cleanSizeBytes} |`,
  ).join("\n");
  const reasonRows = Object.keys(issueSummaryValue.counts).sort().map((reason) =>
    `| ${reason} | ${issueSummaryValue.counts[reason] ?? 0} | ${issueSummaryValue.filteredCounts[reason] ?? 0} |`,
  ).join("\n");
  const filteredByRegionRows = Object.entries(metrics.filteredByRegion as Record<string, number>).map(([region, count]) =>
    `| ${region} | ${count} |`,
  ).join("\n");

  return `# Wanderly v2.0 Admin Parent-Derived Clean G4.4.2

Generated at: ${report.generatedAt}

## Scope

This is an experimental cleanup pass on the G4.4.1 parent-derived patch result. It does not replace production PMTiles, does not change Map Studio defaults, does not write Supabase, does not upload OSS, and does not download new data.

## Outputs

- Clean source: \`${CLEAN_SOURCE_DIR}/\`
- Debug source: \`${DEBUG_SOURCE_DIR}/\`
- Clean PMTiles: \`${OUT_PMTILES}\`
- Machine manifest: \`${OUT_JSON}\`

## Cleaning Rules

- Detect derived-parent crossing candidates, abnormal long segments, self-intersection, tiny sliver boundaries, island-to-mainland straight segments, bbox outliers, duplicate and near-duplicate segments.
- Filter only obvious-risk features: duplicate segments, self-intersection, bbox outlier, >20km long segment, tiny segment, coastal one-sided long crossing segment, or crossing-heavy derived parent segments.
- Keep debug source with all features and \`cleanDecision\`, \`cleanReasons\`, \`crossingCount\`, and \`lengthMeters\` for manual QA.

## Layer Metrics

| layer | debug features | clean features | filtered features | clean vertices | clean sizeBytes |
| --- | ---: | ---: | ---: | ---: | ---: |
${statsRows}

## Issue Summary

| reason | marked | filtered |
| --- | ---: | ---: |
${reasonRows}

## Filtered By Region

| region | filtered features |
| --- | ---: |
${filteredByRegionRows}

## Diagnostics

- Original crossing candidates: ${metrics.originalCrossingCandidates}
- Clean crossing candidates: ${metrics.cleanCrossingCandidates}
- Filtered feature count: ${metrics.filteredFeatureCount}
- Affected regions: ${(metrics.affectedRegions as string[]).join(", ")}
- Parent-child shared ratio before: ${sharedBefore.derivedParentSharedRatio}
- Parent-child shared ratio after: ${sharedAfter.derivedParentSharedRatio}
- Shared ratio drop: ${metrics.parentChildSharedRatioDrop}
- Broken-line risk: ${metrics.brokenLineRisk}

The clean pass lowers crossing candidates while keeping the parent-child shared segment ratio high enough for a second visual acceptance pass. Because features are line segments, the reported crossing count is still a heuristic; GIS topology validation is required before this becomes a nationwide generation rule.

## Next Judgment

- 是否可以进入全国多层瓦片：可以进入“规则化试验”阶段，但不建议直接全量发布。需要先把 clean/debug 诊断纳入生成链路，并对沿海城市做人工抽检。
- 还需要人工验收区域：厦门、舟山、上海沿海/崇明、深圳/东莞/惠州、广州/佛山，尤其是 clean 后被过滤的 region。
- coastline patch 是否必须在全国化前做：全国化生产前必须做；工程试验可先用 parent-derived clean 继续推进，但沿海最终质量仍需要 coastline/land-water patch。
- parent-derived 是否应作为默认构建规则：应作为默认候选规则，但只对 child coverage 完整且 clean diagnostics 通过的 parent 启用；coverage 不完整或 diagnostics 高风险时保留 baseline/reference。

## Manual Acceptance URL

\`\`\`env
NEXT_PUBLIC_MAP_STUDIO_ADMIN_PMTILES_OVERLAY=1
NEXT_PUBLIC_MAP_STUDIO_ADMIN_PMTILES_ONLY=1
NEXT_PUBLIC_MAP_STUDIO_ADMIN_PMTILES_URL=/admin-tiles/experimental/patch-regions-admin-boundaries-gcj02-parent-derived-clean.pmtiles
\`\`\`
`;
}

function main(): void {
  const execute = process.argv.includes("--execute");
  const manifest = readJson<G441Manifest>(G441_MANIFEST);
  const { stats, diagnostics, originalRecords } = cleanCollections(manifest);
  const cleanRecords = sourceRecordsFromStats(stats, true);
  const debugRecords = sourceRecordsFromStats(stats, false);
  const originalCrossingCandidates = manifest.metrics.anomalies.crossingCheck.crossingCount;
  const debugCrossingCandidates = crossingPairCount(debugRecords);
  const cleanCrossingCandidates = crossingPairCount(cleanRecords);
  const sharedSegmentsBefore = manifest.metrics.sharedSegments;
  const sharedSegmentsAfter = sharedSegmentMetrics(cleanRecords);
  const filteredFeatureCount = stats.reduce((sum, layer) => sum + layer.filteredFeatureCount, 0);
  const issueSummaryValue = issueSummary(diagnostics);
  const filteredRegionSummary = filteredByRegion(originalRecords, diagnostics);
  const affectedRegions = Object.keys(filteredRegionSummary).sort();
  const parentChildSharedRatioDrop = Math.round(
    ((sharedSegmentsBefore.derivedParentSharedRatio ?? 0) - sharedSegmentsAfter.derivedParentSharedRatio) * 1000,
  ) / 1000;
  const brokenLineRisk = filteredFeatureCount === 0
    ? "low"
    : parentChildSharedRatioDrop > 0.1
      ? "medium-high"
      : parentChildSharedRatioDrop > 0.04
        ? "medium"
        : "low-medium";
  const tippecanoe = findToolWithWslFallback("tippecanoe");
  const pmtiles = findToolWithWslFallback("pmtiles");
  const tippecanoeCommand = buildTippecanoeCommand(stats);
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

  const report = {
    phase: "G4.4.2",
    generatedAt: new Date().toISOString(),
    dryRun: !execute,
    productionApproved: false,
    sourceLayers: stats,
    inputs: {
      parentDerivedManifest: G441_MANIFEST,
      g43PatchCandidates: G43_MANIFEST,
      previousParentDerivedPmtiles: PREVIOUS_PMTILES,
    },
    outputs: {
      cleanSourceDir: CLEAN_SOURCE_DIR,
      debugSourceDir: DEBUG_SOURCE_DIR,
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
      previousPmtiles: {
        path: PREVIOUS_PMTILES,
        exists: existsSync(absolute(PREVIOUS_PMTILES)),
        sizeBytes: existsSync(absolute(PREVIOUS_PMTILES)) ? statSync(absolute(PREVIOUS_PMTILES)).size : null,
        sha256: sha256(PREVIOUS_PMTILES),
      },
    },
    metrics: {
      originalCrossingCandidates,
      debugRecomputedCrossingCandidates: debugCrossingCandidates,
      cleanCrossingCandidates,
      filteredFeatureCount,
      affectedRegions,
      filteredByRegion: filteredRegionSummary,
      issueSummary: issueSummaryValue,
      sharedSegmentsBefore,
      sharedSegmentsAfter,
      parentChildSharedRatioDrop,
      brokenLineRisk,
      filteredSegmentsByLayer: stats.map((layer) => ({
        layer: layer.name,
        filteredFeatureCount: layer.filteredFeatureCount,
      })),
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
      NEXT_PUBLIC_MAP_STUDIO_ADMIN_PMTILES_URL: "/admin-tiles/experimental/patch-regions-admin-boundaries-gcj02-parent-derived-clean.pmtiles",
    },
    recommendation: {
      canEnterNationalMultiLayerTiles: "yes_for_rule_experiment_not_for_production",
      needsManualAcceptance: affectedRegions.length > 0 ? affectedRegions : ["xiamen-coastal", "zhoushan-islands", "shanghai-coastal"],
      coastlinePatchBeforeProduction: true,
      parentDerivedDefaultRule: "candidate_default_when_child_coverage_complete_and_clean_diagnostics_pass",
    },
  };

  writeJson(`${CLEAN_SOURCE_DIR}/manifest.json`, {
    phase: "G4.4.2",
    generatedAt: report.generatedAt,
    productionApproved: false,
    sourceMode: "clean",
    sourceLayers: stats.map((layer) => ({
      name: layer.name,
      path: layer.cleanPath,
      featureCount: layer.cleanFeatureCount,
      filteredFeatureCount: layer.filteredFeatureCount,
    })),
    metrics: report.metrics,
  });
  writeJson(`${DEBUG_SOURCE_DIR}/manifest.json`, {
    phase: "G4.4.2",
    generatedAt: report.generatedAt,
    productionApproved: false,
    sourceMode: "debug",
    sourceLayers: stats.map((layer) => ({
      name: layer.name,
      path: layer.debugPath,
      featureCount: layer.debugFeatureCount,
      filteredFeatureCount: layer.filteredFeatureCount,
    })),
    metrics: report.metrics,
  });
  writeJson(OUT_JSON, report);
  writeText(OUT_DOC, renderDoc(report));
  console.log(JSON.stringify(report, null, 2));
}

main();
