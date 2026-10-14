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
type BoundaryAccumulator = {
  key: string;
  start: Position;
  end: Position;
  sources: Map<string, { name: string | null; parentAdcode: string | null }>;
};
type SourceLayer = {
  name: LayerName;
  path: string;
  featureCount: number;
  sizeBytes: number;
  vertexCount: number;
  patchFeatureCount: number;
};
type SegmentRecord = {
  layer: LayerName;
  source: string | null;
  start: Position;
  end: Position;
};

const ROOT = process.cwd();
const BASELINE_SOURCE_DIR = "temp/admin-tile-prototype/gcj02-source";
const PATCH_SOURCE_DIR = "temp/admin-tile-prototype/guangdong-patch-source";
const OUT_MBTILES = "temp/admin-tile-prototype/guangdong-admin-boundaries-gcj02-datav-patch.mbtiles";
const OUT_PMTILES = "public/admin-tiles/experimental/guangdong-admin-boundaries-gcj02-datav-patch.pmtiles";
const OUT_JSON = "data/source-manifests/admin-guangdong-datav-patch-pmtiles.g4-4.json";
const OUT_DOC = "docs/WANDERLY_V2_ADMIN_GUANGDONG_DATAV_PATCH_PMTILES_RESULT.md";
const G4_3_MANIFEST = "data/source-manifests/admin-patch-candidates.g4-3.json";
const ORIGINAL_GD_PMTILES = "public/admin-tiles/guangdong-admin-boundaries-gcj02.pmtiles";
const LONG_SEGMENT_METERS = 20_000;
const GUANGDONG_DATAV_REGIONS = new Set(["shenzhen-dongguan-huizhou", "guangzhou-foshan"]);
const TILE_ATTRIBUTE_INCLUDES = [
  "layer",
  "level",
  "leftAdcode",
  "rightAdcode",
  "parentAdcode",
  "source",
  "topologyVersion",
  "displayMode",
  "coordinateSystem",
  "sourceCoordinateSystem",
  "qualityMode",
  "patchId",
  "patchType",
  "confidence",
  "productionApproved",
  "licenseRisk",
  "region",
  "leftName",
  "rightName",
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

  const result = spawnSync("wsl", ["bash", "-lc", `command -v ${name}`], {
    encoding: "utf8",
  });
  const output = result.stdout.trim().split(/\r?\n/).filter(Boolean)[0] ?? null;
  if (result.status === 0 && output) {
    return { name, available: true, path: output, runner: "wsl" };
  }
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

function normalizeBaselineSource(layer: LayerName): FeatureCollection {
  const path = `${BASELINE_SOURCE_DIR}/guangdong-${layer.replace("_boundary", "")}-boundary-source.geojson`;
  const collection = readJson<FeatureCollection>(path);
  return {
    ...collection,
    name: `guangdong_${layer}_baseline_2025`,
    features: collection.features.map((feature) => ({
      ...feature,
      properties: {
        ...(feature.properties ?? {}),
        source: "baseline_2025",
        productionApproved: false,
      },
    })),
  };
}

function positionKey(point: Position, precision = 6): string {
  return `${point[0].toFixed(precision)},${point[1].toFixed(precision)}`;
}

function edgeKey(start: Position, end: Position): string {
  const a = positionKey(start);
  const b = positionKey(end);
  return a <= b ? `${a}|${b}` : `${b}|${a}`;
}

function toPosition(value: unknown): Position | null {
  if (!Array.isArray(value) || typeof value[0] !== "number" || typeof value[1] !== "number") return null;
  return [value[0], value[1]];
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

function getFeatureAdcode(feature: GeoJsonFeature): string {
  const props = feature.properties ?? {};
  return String(props.adcode ?? props.code ?? props.gb ?? "unknown");
}

function getParentAdcode(feature: GeoJsonFeature): string | null {
  const props = feature.properties ?? {};
  const parent = props.parent;
  if (parent && typeof parent === "object" && "adcode" in parent) {
    return String((parent as { adcode?: unknown }).adcode ?? "");
  }
  const acroutes = props.acroutes;
  if (Array.isArray(acroutes) && acroutes.length >= 2) {
    return String(acroutes[acroutes.length - 2]);
  }
  return props.parentAdcode === undefined ? null : String(props.parentAdcode);
}

function boundaryFeaturesFromPatch(candidate: PatchCandidate): GeoJsonFeature[] {
  if (!candidate.outputPath) return [];
  const collection = readJson<FeatureCollection>(candidate.outputPath);
  const accumulators = new Map<string, BoundaryAccumulator>();

  for (const feature of collection.features) {
    const adcode = getFeatureAdcode(feature);
    const name = feature.properties?.name === undefined ? null : String(feature.properties.name);
    const parentAdcode = getParentAdcode(feature);
    for (const ring of collectRings(feature.geometry)) {
      for (let index = 0; index < ring.length - 1; index += 1) {
        const start = ring[index];
        const end = ring[index + 1];
        if (positionKey(start) === positionKey(end)) continue;
        const key = edgeKey(start, end);
        const accumulator = accumulators.get(key) ?? {
          key,
          start,
          end,
          sources: new Map<string, { name: string | null; parentAdcode: string | null }>(),
        };
        accumulator.sources.set(adcode, { name, parentAdcode });
        accumulators.set(key, accumulator);
      }
    }
  }

  return Array.from(accumulators.values()).map((accumulator) => {
    const sourceEntries = Array.from(accumulator.sources.entries()).sort(([a], [b]) => a.localeCompare(b));
    const [leftAdcode, leftMeta] = sourceEntries[0] ?? [null, { name: null, parentAdcode: null }];
    const [rightAdcode, rightMeta] = sourceEntries[1] ?? [null, { name: null, parentAdcode: null }];
    const parentAdcode = leftMeta.parentAdcode ?? rightMeta.parentAdcode ?? candidate.targetAdcodes[0] ?? null;
    return {
      type: "Feature",
      properties: {
        layer: "county_boundary",
        level: "county",
        leftAdcode,
        rightAdcode,
        parentAdcode,
        source: "datav_patch",
        topologyVersion: "g4-4-datav-patch-segment-dedupe-v1",
        displayMode: "gcj02",
        coordinateSystem: "GCJ-02-preoffset",
        sourceCoordinateSystem: "DataV-lonlat-assumed-GCJ02",
        qualityMode: "experimental-datav-patch",
        patchId: candidate.patchId,
        patchType: candidate.patchType,
        confidence: candidate.confidence,
        productionApproved: false,
        licenseRisk: candidate.licenseRisk,
        region: candidate.region,
        leftName: leftMeta.name,
        rightName: rightMeta.name,
      },
      geometry: {
        type: "LineString",
        coordinates: [accumulator.start, accumulator.end],
      },
    };
  });
}

function selectedPatchCandidates(): PatchCandidate[] {
  const manifest = readJson<{ patchCandidates: PatchCandidate[] }>(G4_3_MANIFEST);
  return manifest.patchCandidates.filter((candidate) =>
    candidate.source === "datav" &&
    candidate.patchType === "refineBoundary" &&
    candidate.outputPath &&
    GUANGDONG_DATAV_REGIONS.has(candidate.region) &&
    existsSync(absolute(candidate.outputPath)),
  );
}

function writePatchSources(candidates: PatchCandidate[]): SourceLayer[] {
  const province = normalizeBaselineSource("province_boundary");
  const prefecture = normalizeBaselineSource("prefecture_boundary");
  const county = normalizeBaselineSource("county_boundary");
  const patchFeatures = candidates.flatMap(boundaryFeaturesFromPatch);
  county.features.push(...patchFeatures);

  const outputs: Array<{ name: LayerName; collection: FeatureCollection }> = [
    { name: "province_boundary", collection: province },
    { name: "prefecture_boundary", collection: prefecture },
    {
      name: "county_boundary",
      collection: {
        ...county,
        name: "guangdong_county_boundary_baseline_2025_plus_datav_patch_g4_4",
        properties: {
          phase: "G4.4",
          source: "baseline_2025_plus_datav_patch",
          productionApproved: false,
        },
      },
    },
  ];

  return outputs.map(({ name, collection }) => {
    const level = name.replace("_boundary", "");
    const path = `${PATCH_SOURCE_DIR}/guangdong-${level}-boundary-source.geojson`;
    writeJson(path, collection);
    return {
      name,
      path,
      featureCount: collection.features.length,
      sizeBytes: statSync(absolute(path)).size,
      vertexCount: countVertices(collection),
      patchFeatureCount: collection.features.filter((feature) => feature.properties?.source === "datav_patch").length,
    };
  });
}

function countVertices(collection: FeatureCollection): number {
  return collection.features.reduce((sum, feature) => sum + countCoordinatePairs(feature.geometry?.coordinates), 0);
}

function countCoordinatePairs(value: unknown): number {
  if (!Array.isArray(value)) return 0;
  if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") return 1;
  return value.reduce((sum, child) => sum + countCoordinatePairs(child), 0);
}

function getBbox(collection: FeatureCollection): [number, number, number, number] | null {
  let minLng = Number.POSITIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  for (const feature of collection.features) {
    collectPositions(feature.geometry, (point) => {
      minLng = Math.min(minLng, point[0]);
      minLat = Math.min(minLat, point[1]);
      maxLng = Math.max(maxLng, point[0]);
      maxLat = Math.max(maxLat, point[1]);
    });
  }
  return Number.isFinite(minLng) ? [minLng, minLat, maxLng, maxLat] : null;
}

function collectPositions(geometry: GeoJsonGeometry | null | undefined, visit: (point: Position) => void): void {
  if (!geometry) return;
  if (geometry.type === "GeometryCollection") {
    for (const child of geometry.geometries ?? []) collectPositions(child, visit);
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

function layerPath(layer: LayerName, sourceDir: string): string {
  return `${sourceDir}/guangdong-${layer.replace("_boundary", "")}-boundary-source.geojson`;
}

function layerStats(layer: LayerName, sourceDir: string): SourceLayer {
  const path = layerPath(layer, sourceDir);
  const collection = readJson<FeatureCollection>(path);
  return {
    name: layer,
    path,
    featureCount: collection.features.length,
    sizeBytes: statSync(absolute(path)).size,
    vertexCount: countVertices(collection),
    patchFeatureCount: collection.features.filter((feature) => feature.properties?.source === "datav_patch").length,
  };
}

function sourceSegments(layers: SourceLayer[]): SegmentRecord[] {
  return layers.flatMap((layer) => {
    const collection = readJson<FeatureCollection>(layer.path);
    return collection.features.flatMap((feature) => {
      const coordinates = feature.geometry?.coordinates;
      if (feature.geometry?.type !== "LineString" || !Array.isArray(coordinates)) return [];
      const points = coordinates.map(toPosition).filter(Boolean) as Position[];
      const records: SegmentRecord[] = [];
      for (let index = 0; index < points.length - 1; index += 1) {
        records.push({
          layer: layer.name,
          source: feature.properties?.source === undefined ? null : String(feature.properties.source),
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
  const duplicateKeys = new Set<string>();
  const seenKeys = new Set<string>();
  let longSegmentCount = 0;
  let maxSegmentMeters = 0;
  for (const segment of segments) {
    const length = haversineMeters(segment.start, segment.end);
    maxSegmentMeters = Math.max(maxSegmentMeters, length);
    if (length > LONG_SEGMENT_METERS) longSegmentCount += 1;
    const key = `${segment.layer}|${edgeKey(segment.start, segment.end)}`;
    if (seenKeys.has(key)) duplicateKeys.add(key);
    seenKeys.add(key);
  }
  const patchSegments = segments.filter((segment) => segment.source === "datav_patch");
  return {
    segmentCount: segments.length,
    patchSegmentCount: patchSegments.length,
    longSegmentThresholdMeters: LONG_SEGMENT_METERS,
    longSegmentCount,
    maxSegmentMeters: Math.round(maxSegmentMeters * 10) / 10,
    duplicateSegmentCount: duplicateKeys.size,
    crossingCheck: crossingMetrics(patchSegments),
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
    const minCellX = Math.floor(minX / cellSize);
    const maxCellX = Math.floor(maxX / cellSize);
    const minCellY = Math.floor(minY / cellSize);
    const maxCellY = Math.floor(maxY / cellSize);
    const keys: string[] = [];
    for (let x = minCellX; x <= maxCellX; x += 1) {
      for (let y = minCellY; y <= maxCellY; y += 1) keys.push(`${x}:${y}`);
    }
    return keys;
  };

  for (let index = 0; index < segments.length; index += 1) {
    for (const key of cellKeys(segments[index])) {
      const prior = grid.get(key) ?? [];
      for (const otherIndex of prior) {
        const pairKey = otherIndex < index ? `${otherIndex}:${index}` : `${index}:${otherIndex}`;
        if (compared.has(pairKey)) continue;
        compared.add(pairKey);
        comparedPairs += 1;
        if (comparedPairs > maxPairs) {
          return {
            status: "skipped_pair_limit",
            comparedPairs,
            crossingCount,
            note: "Patch-only crossing check stopped at pair limit; use GIS topology validation for final acceptance.",
          };
        }
        if (segmentsIntersect(segments[index], segments[otherIndex])) crossingCount += 1;
      }
      prior.push(index);
      grid.set(key, prior);
    }
  }

  return {
    status: "completed_patch_segments_only",
    comparedPairs,
    crossingCount,
    note: "Crossing check covers DataV patch segments only and ignores shared endpoints.",
  };
}

function segmentsIntersect(a: SegmentRecord, b: SegmentRecord): boolean {
  if (
    positionKey(a.start) === positionKey(b.start) ||
    positionKey(a.start) === positionKey(b.end) ||
    positionKey(a.end) === positionKey(b.start) ||
    positionKey(a.end) === positionKey(b.end)
  ) {
    return false;
  }
  const orient = (p: Position, q: Position, r: Position) =>
    Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  const o1 = orient(a.start, a.end, b.start);
  const o2 = orient(a.start, a.end, b.end);
  const o3 = orient(b.start, b.end, a.start);
  const o4 = orient(b.start, b.end, a.end);
  return o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0 && o1 !== o2 && o3 !== o4;
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
    "--name=guangdong-admin-boundaries-gcj02-datav-patch",
    "--description=Experimental Guangdong admin boundaries, baseline 2025 plus DataV patch candidates. productionApproved=false.",
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
  const crossing = anomalies.crossingCheck as Record<string, unknown>;
  const sourceLayers = report.sourceLayers as SourceLayer[];
  const candidateRows = (report.patchCandidates as PatchCandidate[]).map((candidate) =>
    `| ${candidate.patchId} | ${candidate.region} | ${candidate.patchType} | ${candidate.confidence} | ${candidate.targetAdcodes.join(", ")} | ${candidate.licenseRisk} |`,
  ).join("\n");
  const layerRows = sourceLayers.map((layer) =>
    `| ${layer.name} | ${layer.featureCount} | ${layer.patchFeatureCount} | ${layer.vertexCount} | ${layer.sizeBytes} |`,
  ).join("\n");

  return `# Wanderly v2.0 Admin G4.4 Guangdong DataV Patch PMTiles Result

Generated at: ${report.generatedAt}

## Scope

This is an experimental Guangdong-only PMTiles comparison artifact. It does not replace the current production or baseline PMTiles, does not write Supabase, does not upload public OSS, and keeps every generated artifact marked \`productionApproved=false\`.

## Outputs

- Patch source directory: \`${PATCH_SOURCE_DIR}/\`
- MBTiles: \`${OUT_MBTILES}\`
- PMTiles: \`${OUT_PMTILES}\`
- Machine manifest: \`${OUT_JSON}\`

## Source Strategy

- Baseline Guangdong GCJ-02 boundary source remains the structural base.
- DataV G4.3 patch candidates are appended as \`source=datav_patch\` county-boundary refinement features.
- DataV coordinates are kept as DataV lon/lat assumed GCJ-compatible for this acceptance artifact; they are not additionally WGS84-to-GCJ transformed, to avoid a possible double offset against AMap/DataV-derived geometry.
- DataV remains high license risk and is not production-approved.

## Patch Candidates

| patchId | region | patchType | confidence | targetAdcodes | licenseRisk |
| --- | --- | --- | --- | --- | --- |
${candidateRows}

## Layer Metrics

| layer | featureCount | patchFeatureCount | vertexCount | sizeBytes |
| --- | ---: | ---: | ---: | ---: |
${layerRows}

## PMTiles Metrics

- Original Guangdong GCJ-02 PMTiles: ${metrics.originalPmtilesSizeBytes} bytes
- Patch experimental PMTiles: ${metrics.patchPmtilesSizeBytes} bytes
- Baseline source vertices before: ${metrics.baselineVertexCount}
- Patch source vertices after: ${metrics.patchVertexCount}
- Patch feature count: ${metrics.patchFeatureCount}
- Affected regions: ${(metrics.affectedRegions as string[]).join(", ")}

## Anomaly Check

- Segment count: ${anomalies.segmentCount}
- DataV patch segment count: ${anomalies.patchSegmentCount}
- Long segment threshold: ${anomalies.longSegmentThresholdMeters} meters
- Long segment count: ${anomalies.longSegmentCount}
- Max segment length: ${anomalies.maxSegmentMeters} meters
- Duplicate segment count: ${anomalies.duplicateSegmentCount}
- Crossing check: ${crossing.status}, crossingCount=${crossing.crossingCount}, comparedPairs=${crossing.comparedPairs}

The crossing check is intentionally lightweight and patch-segment focused. Final production acceptance still needs visual QA and GIS topology validation.

## Manual Acceptance URL

Use these variables for a manual Map Studio overlay session only:

\`\`\`env
NEXT_PUBLIC_MAP_STUDIO_ADMIN_PMTILES_OVERLAY=1
NEXT_PUBLIC_MAP_STUDIO_ADMIN_PMTILES_ONLY=1
NEXT_PUBLIC_MAP_STUDIO_ADMIN_PMTILES_URL=/admin-tiles/experimental/guangdong-admin-boundaries-gcj02-datav-patch.pmtiles
\`\`\`

## Recommendation

Generate and inspect this Guangdong patch PMTiles in Map Studio before any wider split or production path. If DataV visually improves Shenzhen/Dongguan/Huizhou and Guangzhou/Foshan without offset artifacts, the next step is a Guangdong patch PMTiles visual acceptance pass. If offset artifacts appear, pause DataV patching and validate the DataV coordinate assumption before doing more administrative-boundary styling.
`;
}

function main(): void {
  const execute = process.argv.includes("--execute");
  const candidates = selectedPatchCandidates();
  const sourceLayers = writePatchSources(candidates);
  const baselineLayers: SourceLayer[] = [
    layerStats("province_boundary", BASELINE_SOURCE_DIR),
    layerStats("prefecture_boundary", BASELINE_SOURCE_DIR),
    layerStats("county_boundary", BASELINE_SOURCE_DIR),
  ];
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

  const sourceCollections = sourceLayers.map((layer) => readJson<FeatureCollection>(layer.path));
  const report = {
    phase: "G4.4",
    generatedAt: new Date().toISOString(),
    dryRun: !execute,
    productionApproved: false,
    sourceLayers,
    baselineLayers,
    patchCandidates: candidates,
    outputs: {
      sourceDir: PATCH_SOURCE_DIR,
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
      originalGuangdongGcj02Pmtiles: {
        path: ORIGINAL_GD_PMTILES,
        sizeBytes: existsSync(absolute(ORIGINAL_GD_PMTILES)) ? statSync(absolute(ORIGINAL_GD_PMTILES)).size : null,
        sha256: sha256(ORIGINAL_GD_PMTILES),
      },
    },
    metrics: {
      originalPmtilesSizeBytes: existsSync(absolute(ORIGINAL_GD_PMTILES)) ? statSync(absolute(ORIGINAL_GD_PMTILES)).size : null,
      patchPmtilesSizeBytes: existsSync(absolute(OUT_PMTILES)) ? statSync(absolute(OUT_PMTILES)).size : null,
      provinceFeatureCount: sourceLayers.find((layer) => layer.name === "province_boundary")?.featureCount ?? 0,
      prefectureFeatureCount: sourceLayers.find((layer) => layer.name === "prefecture_boundary")?.featureCount ?? 0,
      countyFeatureCount: sourceLayers.find((layer) => layer.name === "county_boundary")?.featureCount ?? 0,
      patchFeatureCount: sourceLayers.reduce((sum, layer) => sum + layer.patchFeatureCount, 0),
      baselineVertexCount: baselineLayers.reduce((sum, layer) => sum + layer.vertexCount, 0),
      patchVertexCount: sourceLayers.reduce((sum, layer) => sum + layer.vertexCount, 0),
      affectedRegions: candidates.map((candidate) => candidate.region),
      bbox: sourceCollections.map(getBbox),
      anomalies: anomalyMetrics(sourceLayers),
    },
    coordinateHandling: {
      baseline: "Existing gcj02-source generated by WGS84-to-GCJ02 transform.",
      datavPatch: "Kept as DataV lon/lat assumed GCJ-compatible; no second offset applied.",
      risk: "If manual QA shows offset, rerun with an explicit coordinate assumption test before expanding.",
    },
    commands: {
      tippecanoe: tippecanoeCommand,
      pmtiles: pmtilesCommand,
      tippecanoeText: commandToText(tippecanoeCommand),
      pmtilesText: commandToText(pmtilesCommand),
    },
    tools: [tippecanoe, pmtiles],
    manualAcceptanceEnv: {
      NEXT_PUBLIC_MAP_STUDIO_ADMIN_PMTILES_OVERLAY: "1",
      NEXT_PUBLIC_MAP_STUDIO_ADMIN_PMTILES_ONLY: "1",
      NEXT_PUBLIC_MAP_STUDIO_ADMIN_PMTILES_URL: "/admin-tiles/experimental/guangdong-admin-boundaries-gcj02-datav-patch.pmtiles",
    },
    recommendation: {
      shouldUseForProduction: false,
      nextStep: "Manual Map Studio QA for Shenzhen/Dongguan/Huizhou and Guangzhou/Foshan. Do not promote until DataV coordinate alignment and license risk are resolved.",
    },
  };

  writeJson(`${PATCH_SOURCE_DIR}/manifest.json`, {
    phase: "G4.4",
    generatedAt: report.generatedAt,
    productionApproved: false,
    sourceLayers,
    patchCandidates: candidates.map((candidate) => candidate.patchId),
    coordinateHandling: report.coordinateHandling,
  });
  writeJson(OUT_JSON, report);
  writeText(OUT_DOC, renderDoc(report));
  console.log(JSON.stringify(report, null, 2));
}

main();
