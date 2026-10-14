import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type AdminLevel = "province" | "prefecture" | "county";
type DisplayMode = "wgs84" | "gcj02";
type QualityMode = "raw" | "clean";
type Position = [number, number];
type GeometryType = "LineString" | "MultiLineString";

type BoundaryFeature = {
  type: "Feature";
  properties: {
    layer?: string;
    level?: AdminLevel;
    leftAdcode?: string | null;
    rightAdcode?: string | null;
    parentAdcode?: string | null;
    source?: string;
    topologyVersion?: string;
    displayMode?: DisplayMode;
    coordinateSystem?: string;
    sourceCoordinateSystem?: string;
    [key: string]: unknown;
  };
  geometry: {
    type: GeometryType;
    coordinates: Position[] | Position[][];
  };
};

type FeatureCollection = {
  type: "FeatureCollection";
  name?: string;
  features: BoundaryFeature[];
};

type SegmentRecord = {
  id: string;
  level: AdminLevel;
  displayMode: DisplayMode;
  sourceFile: string;
  featureIndex: number;
  segmentIndex: number;
  lineIndex: number;
  start: Position;
  end: Position;
  lengthMeters: number;
  bbox: Bounds;
  properties: BoundaryFeature["properties"];
};

type Bounds = {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
};

type LayerAudit = {
  level: AdminLevel;
  sourceFile: string;
  featureCount: number;
  lineStringCount: number;
  multiLineStringCount: number;
  segmentCount: number;
  maxSegmentLengthMeters: number;
  averageSegmentLengthMeters: number;
  suspiciousLongSegmentCount: number;
  selfCrossingCount: number;
  duplicateSegmentCount: number;
  bboxOutlierCount: number;
  geometryOutsideGuangdongBboxCount: number;
  suspectedRingBridgeCount: number;
};

type AuditResult = {
  generatedAt: string;
  displayMode: DisplayMode;
  qualityMode: QualityMode;
  levels: AdminLevel[];
  thresholds: {
    suspiciousSegmentMeters: number;
    suspectedRingBridgeMeters: number;
    bboxOutlierMeters: number;
    gridCellDegrees: number;
  };
  layers: LayerAudit[];
  totals: Omit<LayerAudit, "level" | "sourceFile">;
  comparison?: {
    comparedWith: {
      displayMode: DisplayMode;
      qualityMode: QualityMode;
    };
    suspiciousLongSegmentIdsInBoth: number;
    suspiciousLongSegmentIdsOnlyInSelected: number;
    suspiciousLongSegmentIdsOnlyInCounterpart: number;
    crossingSegmentPairIdsInBoth: number;
    crossingSegmentPairIdsOnlyInSelected: number;
    crossingSegmentPairIdsOnlyInCounterpart: number;
  };
};

type DebugFeature = {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry:
    | { type: "LineString"; coordinates: Position[] }
    | { type: "MultiLineString"; coordinates: Position[][] };
};

const ROOT = process.cwd();
const DEBUG_DIR = "temp/admin-tile-prototype/debug";
const LEVELS: AdminLevel[] = ["province", "prefecture", "county"];
const SOURCE_BY_MODE_AND_LEVEL: Record<DisplayMode, Record<AdminLevel, string>> = {
  wgs84: {
    province: "temp/admin-tile-prototype/guangdong-province-boundary-source.geojson",
    prefecture: "temp/admin-tile-prototype/guangdong-prefecture-boundary-source.geojson",
    county: "temp/admin-tile-prototype/guangdong-county-boundary-source.geojson",
  },
  gcj02: {
    province: "temp/admin-tile-prototype/gcj02-source/guangdong-province-boundary-source.geojson",
    prefecture: "temp/admin-tile-prototype/gcj02-source/guangdong-prefecture-boundary-source.geojson",
    county: "temp/admin-tile-prototype/gcj02-source/guangdong-county-boundary-source.geojson",
  },
};
const CLEAN_SOURCE_BY_LEVEL: Record<AdminLevel, string> = {
  province: "temp/admin-tile-prototype/clean-source/guangdong-province-boundary-source.geojson",
  prefecture: "temp/admin-tile-prototype/clean-source/guangdong-prefecture-boundary-source.geojson",
  county: "temp/admin-tile-prototype/clean-source/guangdong-county-boundary-source.geojson",
};

const GUANGDONG_BBOX_BY_MODE: Record<DisplayMode, Bounds> = {
  wgs84: {
    minLng: 109.3,
    minLat: 19.9,
    maxLng: 117.5,
    maxLat: 25.8,
  },
  gcj02: {
    minLng: 109.3,
    minLat: 19.9,
    maxLng: 117.6,
    maxLat: 25.8,
  },
};

const SUSPICIOUS_SEGMENT_METERS = 10_000;
const SUSPECTED_RING_BRIDGE_METERS = 10_000;
const BBOX_OUTLIER_METERS = 10_000;
const GRID_CELL_DEGREES = 0.1;
const COORDINATE_KEY_PRECISION = 6;

function parseArgs(argv: string[]) {
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
    displayMode: parseDisplayMode(parsed["display-mode"]),
    qualityMode: parseQualityMode(parsed["quality-mode"]),
    levels: parseLevels(parsed.level),
    writeReport: parsed["write-report"] === true,
  };
}

function parseDisplayMode(value: string | boolean | undefined): DisplayMode {
  if (typeof value !== "string") {
    return "wgs84";
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "gcj02" || normalized === "gcj-02") {
    return "gcj02";
  }

  if (normalized === "wgs84" || normalized === "raw") {
    return "wgs84";
  }

  throw new Error(`Unsupported --display-mode=${value}. Expected wgs84, raw, or gcj02.`);
}

function parseQualityMode(value: string | boolean | undefined): QualityMode {
  if (typeof value !== "string") {
    return "raw";
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "raw" || normalized === "default") {
    return "raw";
  }

  if (normalized === "clean") {
    return "clean";
  }

  throw new Error(`Unsupported --quality-mode=${value}. Expected raw or clean.`);
}

function parseLevels(value: string | boolean | undefined): AdminLevel[] {
  if (value === undefined || value === true || value === "all") {
    return LEVELS;
  }

  if (typeof value !== "string") {
    throw new Error("Unsupported --level value. Expected province, prefecture, county, or all.");
  }

  const levels = value.split(",").map((item) => item.trim()).filter(Boolean);

  for (const level of levels) {
    if (!LEVELS.includes(level as AdminLevel)) {
      throw new Error(`Unsupported --level=${level}. Expected province, prefecture, county, or all.`);
    }
  }

  return levels as AdminLevel[];
}

function readFeatureCollection(path: string): FeatureCollection {
  const absolutePath = resolve(ROOT, path);

  if (!existsSync(absolutePath)) {
    throw new Error(`Missing source GeoJSON: ${path}`);
  }

  const payload = JSON.parse(readFileSync(absolutePath, "utf8")) as FeatureCollection;

  if (!Array.isArray(payload.features)) {
    throw new Error(`Expected GeoJSON FeatureCollection with features[]: ${path}`);
  }

  return payload;
}

function getFeatureLines(feature: BoundaryFeature): Position[][] {
  if (feature.geometry.type === "LineString") {
    return [feature.geometry.coordinates as Position[]];
  }

  if (feature.geometry.type === "MultiLineString") {
    return feature.geometry.coordinates as Position[][];
  }

  return [];
}

function isValidPosition(position: unknown): position is Position {
  return (
    Array.isArray(position) &&
    position.length >= 2 &&
    Number.isFinite(position[0]) &&
    Number.isFinite(position[1])
  );
}

function haversineMeters(left: Position, right: Position) {
  const toRadians = (value: number) => value * Math.PI / 180;
  const earthRadiusMeters = 6371008.8;
  const lat1 = toRadians(left[1]);
  const lat2 = toRadians(right[1]);
  const dLat = toRadians(right[1] - left[1]);
  const dLng = toRadians(right[0] - left[0]);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getSegmentBounds(start: Position, end: Position): Bounds {
  return {
    minLng: Math.min(start[0], end[0]),
    minLat: Math.min(start[1], end[1]),
    maxLng: Math.max(start[0], end[0]),
    maxLat: Math.max(start[1], end[1]),
  };
}

function isBoundsOutside(bounds: Bounds, outer: Bounds) {
  return (
    bounds.minLng < outer.minLng ||
    bounds.maxLng > outer.maxLng ||
    bounds.minLat < outer.minLat ||
    bounds.maxLat > outer.maxLat
  );
}

function boundsOverlap(left: Bounds, right: Bounds) {
  return !(
    left.maxLng < right.minLng ||
    left.minLng > right.maxLng ||
    left.maxLat < right.minLat ||
    left.minLat > right.maxLat
  );
}

function coordinateKey(position: Position) {
  return `${position[0].toFixed(COORDINATE_KEY_PRECISION)},${position[1].toFixed(COORDINATE_KEY_PRECISION)}`;
}

function segmentKey(start: Position, end: Position) {
  const left = coordinateKey(start);
  const right = coordinateKey(end);

  return left < right ? `${left}|${right}` : `${right}|${left}`;
}

function featureAuditProperties(segment: SegmentRecord, reason: string) {
  return {
    level: segment.level,
    sourceFile: segment.sourceFile,
    featureIndex: segment.featureIndex,
    segmentIndex: segment.segmentIndex,
    lineIndex: segment.lineIndex,
    leftAdcode: segment.properties.leftAdcode ?? null,
    rightAdcode: segment.properties.rightAdcode ?? null,
    parentAdcode: segment.properties.parentAdcode ?? null,
    lengthMeters: Math.round(segment.lengthMeters * 10) / 10,
    reason,
    displayMode: segment.displayMode,
    topologyVersion: segment.properties.topologyVersion ?? null,
  };
}

function makeLineFeature(segment: SegmentRecord, reason: string): DebugFeature {
  return {
    type: "Feature",
    properties: featureAuditProperties(segment, reason),
    geometry: {
      type: "LineString",
      coordinates: [segment.start, segment.end],
    },
  };
}

function makeCrossingFeature(left: SegmentRecord, right: SegmentRecord): DebugFeature {
  return {
    type: "Feature",
    properties: {
      ...featureAuditProperties(left, "same-level-segment-crossing"),
      otherFeatureIndex: right.featureIndex,
      otherSegmentIndex: right.segmentIndex,
      otherLeftAdcode: right.properties.leftAdcode ?? null,
      otherRightAdcode: right.properties.rightAdcode ?? null,
      otherParentAdcode: right.properties.parentAdcode ?? null,
      otherLengthMeters: Math.round(right.lengthMeters * 10) / 10,
    },
    geometry: {
      type: "MultiLineString",
      coordinates: [
        [left.start, left.end],
        [right.start, right.end],
      ],
    },
  };
}

function extractSegments(
  displayMode: DisplayMode,
  qualityMode: QualityMode,
  level: AdminLevel,
): {
  sourceFile: string;
  features: BoundaryFeature[];
  segments: SegmentRecord[];
  lineStringCount: number;
  multiLineStringCount: number;
  selfCrossingCount: number;
} {
  const sourceFile = qualityMode === "clean"
    ? CLEAN_SOURCE_BY_LEVEL[level]
    : SOURCE_BY_MODE_AND_LEVEL[displayMode][level];
  const collection = readFeatureCollection(sourceFile);
  const segments: SegmentRecord[] = [];
  let lineStringCount = 0;
  let multiLineStringCount = 0;
  let selfCrossingCount = 0;

  collection.features.forEach((feature, featureIndex) => {
    if (feature.geometry.type === "LineString") {
      lineStringCount += 1;
    }

    if (feature.geometry.type === "MultiLineString") {
      multiLineStringCount += 1;
    }

    const lines = getFeatureLines(feature);
    selfCrossingCount += countSelfCrossings(lines);

    lines.forEach((line, lineIndex) => {
      for (let index = 0; index < line.length - 1; index += 1) {
        const start = line[index];
        const end = line[index + 1];

        if (!isValidPosition(start) || !isValidPosition(end)) {
          continue;
        }

        const lengthMeters = haversineMeters(start, end);

        segments.push({
          id: `${level}:${featureIndex}:${lineIndex}:${index}`,
          level,
          displayMode,
          sourceFile,
          featureIndex,
          segmentIndex: index,
          lineIndex,
          start,
          end,
          lengthMeters,
          bbox: getSegmentBounds(start, end),
          properties: feature.properties ?? {},
        });
      }
    });
  });

  return {
    sourceFile,
    features: collection.features,
    segments,
    lineStringCount,
    multiLineStringCount,
    selfCrossingCount,
  };
}

function countSelfCrossings(lines: Position[][]) {
  let count = 0;

  for (const line of lines) {
    const segments = [];

    for (let index = 0; index < line.length - 1; index += 1) {
      const start = line[index];
      const end = line[index + 1];

      if (isValidPosition(start) && isValidPosition(end)) {
        segments.push({ start, end, index, bbox: getSegmentBounds(start, end) });
      }
    }

    for (let leftIndex = 0; leftIndex < segments.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < segments.length; rightIndex += 1) {
        const left = segments[leftIndex];
        const right = segments[rightIndex];

        if (Math.abs(left.index - right.index) <= 1) {
          continue;
        }

        if (!boundsOverlap(left.bbox, right.bbox)) {
          continue;
        }

        if (segmentsCross(left.start, left.end, right.start, right.end)) {
          count += 1;
        }
      }
    }
  }

  return count;
}

function orientation(a: Position, b: Position, c: Position) {
  const value = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

  if (Math.abs(value) < 1e-12) {
    return 0;
  }

  return value > 0 ? 1 : -1;
}

function samePoint(left: Position, right: Position) {
  return (
    Math.abs(left[0] - right[0]) < 1e-9 &&
    Math.abs(left[1] - right[1]) < 1e-9
  );
}

function shareEndpoint(left: SegmentRecord, right: SegmentRecord) {
  return (
    samePoint(left.start, right.start) ||
    samePoint(left.start, right.end) ||
    samePoint(left.end, right.start) ||
    samePoint(left.end, right.end)
  );
}

function segmentsCross(a: Position, b: Position, c: Position, d: Position) {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);

  return o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0 && o1 !== o2 && o3 !== o4;
}

function countDuplicateSegments(segments: SegmentRecord[]) {
  const counts = new Map<string, number>();

  for (const segment of segments) {
    const key = segmentKey(segment.start, segment.end);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  let duplicateCount = 0;

  for (const count of counts.values()) {
    if (count > 1) {
      duplicateCount += count - 1;
    }
  }

  return duplicateCount;
}

function getGridCells(bounds: Bounds) {
  const minX = Math.floor(bounds.minLng / GRID_CELL_DEGREES);
  const maxX = Math.floor(bounds.maxLng / GRID_CELL_DEGREES);
  const minY = Math.floor(bounds.minLat / GRID_CELL_DEGREES);
  const maxY = Math.floor(bounds.maxLat / GRID_CELL_DEGREES);
  const cells: string[] = [];

  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      cells.push(`${x}:${y}`);
    }
  }

  return cells;
}

function findCrossings(segments: SegmentRecord[]) {
  const grid = new Map<string, number[]>();

  segments.forEach((segment, index) => {
    for (const cell of getGridCells(segment.bbox)) {
      const bucket = grid.get(cell) ?? [];
      bucket.push(index);
      grid.set(cell, bucket);
    }
  });

  const checkedPairs = new Set<string>();
  const crossings: Array<[SegmentRecord, SegmentRecord]> = [];

  for (const bucket of grid.values()) {
    for (let leftBucketIndex = 0; leftBucketIndex < bucket.length; leftBucketIndex += 1) {
      for (let rightBucketIndex = leftBucketIndex + 1; rightBucketIndex < bucket.length; rightBucketIndex += 1) {
        const leftIndex = bucket[leftBucketIndex];
        const rightIndex = bucket[rightBucketIndex];
        const pairKey = leftIndex < rightIndex ? `${leftIndex}:${rightIndex}` : `${rightIndex}:${leftIndex}`;

        if (checkedPairs.has(pairKey)) {
          continue;
        }

        checkedPairs.add(pairKey);
        const left = segments[leftIndex];
        const right = segments[rightIndex];

        if (left.featureIndex === right.featureIndex) {
          continue;
        }

        if (!boundsOverlap(left.bbox, right.bbox) || shareEndpoint(left, right)) {
          continue;
        }

        if (segmentsCross(left.start, left.end, right.start, right.end)) {
          crossings.push([left, right]);
        }
      }
    }
  }

  return crossings;
}

function stableSegmentId(segment: SegmentRecord) {
  return `${segment.level}:${segment.featureIndex}:${segment.lineIndex}:${segment.segmentIndex}`;
}

function stableCrossingId(pair: [SegmentRecord, SegmentRecord]) {
  const left = stableSegmentId(pair[0]);
  const right = stableSegmentId(pair[1]);

  return left < right ? `${left}|${right}` : `${right}|${left}`;
}

function auditDisplayMode(displayMode: DisplayMode, qualityMode: QualityMode, levels: AdminLevel[]) {
  const layers: LayerAudit[] = [];
  const allLongSegments: SegmentRecord[] = [];
  const allBboxOutliers: SegmentRecord[] = [];
  const allRingBridgeCandidates: SegmentRecord[] = [];
  const allCrossings: Array<[SegmentRecord, SegmentRecord]> = [];

  for (const level of levels) {
    const extraction = extractSegments(displayMode, qualityMode, level);
    const duplicateSegmentCount = countDuplicateSegments(extraction.segments);
    const suspiciousLongSegments = extraction.segments.filter(
      (segment) => segment.lengthMeters > SUSPICIOUS_SEGMENT_METERS,
    );
    const bboxOutliers = extraction.segments.filter(
      (segment) =>
        segment.lengthMeters > BBOX_OUTLIER_METERS ||
        isBoundsOutside(segment.bbox, GUANGDONG_BBOX_BY_MODE[displayMode]),
    );
    const outsideGuangdong = extraction.segments.filter((segment) =>
      isBoundsOutside(segment.bbox, GUANGDONG_BBOX_BY_MODE[displayMode]),
    );
    const suspectedRingBridges = extraction.segments.filter(
      (segment) =>
        segment.lengthMeters > SUSPECTED_RING_BRIDGE_METERS &&
        (segment.properties.rightAdcode ?? null) === null,
    );
    const crossings = findCrossings(extraction.segments);
    const totalLength = extraction.segments.reduce(
      (sum, segment) => sum + segment.lengthMeters,
      0,
    );

    layers.push({
      level,
      sourceFile: extraction.sourceFile,
      featureCount: extraction.features.length,
      lineStringCount: extraction.lineStringCount,
      multiLineStringCount: extraction.multiLineStringCount,
      segmentCount: extraction.segments.length,
      maxSegmentLengthMeters: Math.max(0, ...extraction.segments.map((segment) => segment.lengthMeters)),
      averageSegmentLengthMeters: extraction.segments.length > 0 ? totalLength / extraction.segments.length : 0,
      suspiciousLongSegmentCount: suspiciousLongSegments.length,
      selfCrossingCount: extraction.selfCrossingCount,
      duplicateSegmentCount,
      bboxOutlierCount: bboxOutliers.length,
      geometryOutsideGuangdongBboxCount: outsideGuangdong.length,
      suspectedRingBridgeCount: suspectedRingBridges.length,
    });

    allLongSegments.push(...suspiciousLongSegments);
    allBboxOutliers.push(...bboxOutliers);
    allRingBridgeCandidates.push(...suspectedRingBridges);
    allCrossings.push(...crossings);
  }

  return {
    layers,
    longSegments: allLongSegments,
    bboxOutliers: allBboxOutliers,
    ringBridgeCandidates: allRingBridgeCandidates,
    crossings: allCrossings,
  };
}

function sumLayerAudits(layers: LayerAudit[]): Omit<LayerAudit, "level" | "sourceFile"> {
  const segmentCount = layers.reduce((sum, layer) => sum + layer.segmentCount, 0);
  const totalLength = layers.reduce(
    (sum, layer) => sum + layer.averageSegmentLengthMeters * layer.segmentCount,
    0,
  );

  return {
    featureCount: layers.reduce((sum, layer) => sum + layer.featureCount, 0),
    lineStringCount: layers.reduce((sum, layer) => sum + layer.lineStringCount, 0),
    multiLineStringCount: layers.reduce((sum, layer) => sum + layer.multiLineStringCount, 0),
    segmentCount,
    maxSegmentLengthMeters: Math.max(0, ...layers.map((layer) => layer.maxSegmentLengthMeters)),
    averageSegmentLengthMeters: segmentCount > 0 ? totalLength / segmentCount : 0,
    suspiciousLongSegmentCount: layers.reduce((sum, layer) => sum + layer.suspiciousLongSegmentCount, 0),
    selfCrossingCount: layers.reduce((sum, layer) => sum + layer.selfCrossingCount, 0),
    duplicateSegmentCount: layers.reduce((sum, layer) => sum + layer.duplicateSegmentCount, 0),
    bboxOutlierCount: layers.reduce((sum, layer) => sum + layer.bboxOutlierCount, 0),
    geometryOutsideGuangdongBboxCount: layers.reduce((sum, layer) => sum + layer.geometryOutsideGuangdongBboxCount, 0),
    suspectedRingBridgeCount: layers.reduce((sum, layer) => sum + layer.suspectedRingBridgeCount, 0),
  };
}

function compareAudit(
  selected: ReturnType<typeof auditDisplayMode>,
  counterpart: ReturnType<typeof auditDisplayMode>,
  counterpartMode: DisplayMode,
  counterpartQualityMode: QualityMode,
) {
  const selectedLongIds = new Set(selected.longSegments.map(stableSegmentId));
  const counterpartLongIds = new Set(counterpart.longSegments.map(stableSegmentId));
  const selectedCrossingIds = new Set(selected.crossings.map(stableCrossingId));
  const counterpartCrossingIds = new Set(counterpart.crossings.map(stableCrossingId));

  return {
    comparedWith: {
      displayMode: counterpartMode,
      qualityMode: counterpartQualityMode,
    },
    suspiciousLongSegmentIdsInBoth: countSetIntersection(selectedLongIds, counterpartLongIds),
    suspiciousLongSegmentIdsOnlyInSelected: countSetDifference(selectedLongIds, counterpartLongIds),
    suspiciousLongSegmentIdsOnlyInCounterpart: countSetDifference(counterpartLongIds, selectedLongIds),
    crossingSegmentPairIdsInBoth: countSetIntersection(selectedCrossingIds, counterpartCrossingIds),
    crossingSegmentPairIdsOnlyInSelected: countSetDifference(selectedCrossingIds, counterpartCrossingIds),
    crossingSegmentPairIdsOnlyInCounterpart: countSetDifference(counterpartCrossingIds, selectedCrossingIds),
  };
}

function countSetIntersection(left: Set<string>, right: Set<string>) {
  let count = 0;

  for (const item of left) {
    if (right.has(item)) {
      count += 1;
    }
  }

  return count;
}

function countSetDifference(left: Set<string>, right: Set<string>) {
  let count = 0;

  for (const item of left) {
    if (!right.has(item)) {
      count += 1;
    }
  }

  return count;
}

function writeJson(path: string, value: unknown) {
  const absolutePath = resolve(ROOT, path);
  const parent = dirname(absolutePath);

  if (!existsSync(parent)) {
    mkdirSync(parent, { recursive: true });
  }

  writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeFeatureCollection(path: string, features: DebugFeature[]) {
  writeJson(path, {
    type: "FeatureCollection",
    features,
  });
}

function roundAuditNumbers(result: AuditResult): AuditResult {
  return {
    ...result,
    layers: result.layers.map(roundLayerAudit),
    totals: roundTotals(result.totals),
  };
}

function roundLayerAudit(layer: LayerAudit): LayerAudit {
  return {
    ...layer,
    maxSegmentLengthMeters: Math.round(layer.maxSegmentLengthMeters * 10) / 10,
    averageSegmentLengthMeters: Math.round(layer.averageSegmentLengthMeters * 10) / 10,
  };
}

function roundTotals(totals: AuditResult["totals"]): AuditResult["totals"] {
  return {
    ...totals,
    maxSegmentLengthMeters: Math.round(totals.maxSegmentLengthMeters * 10) / 10,
    averageSegmentLengthMeters: Math.round(totals.averageSegmentLengthMeters * 10) / 10,
  };
}

function writeMarkdownReport(path: string, result: AuditResult) {
  const lines = [
    "# Guangdong Admin Tile Source Quality Audit",
    "",
    `Generated at: ${result.generatedAt}`,
    `Display mode: ${result.displayMode}`,
    `Quality mode: ${result.qualityMode}`,
    `Levels: ${result.levels.join(", ")}`,
    "",
    "## Thresholds",
    "",
    `- suspicious segment: > ${result.thresholds.suspiciousSegmentMeters} m`,
    `- suspected ring bridge: > ${result.thresholds.suspectedRingBridgeMeters} m and one-sided boundary`,
    `- bbox outlier: > ${result.thresholds.bboxOutlierMeters} m or outside Guangdong bbox`,
    "",
    "## Layer Summary",
    "",
    "| level | features | LineString | MultiLineString | segments | max m | avg m | long | self crossing | duplicate | bbox outlier | outside bbox | ring bridge |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...result.layers.map((layer) => (
      `| ${layer.level} | ${layer.featureCount} | ${layer.lineStringCount} | ${layer.multiLineStringCount} | ${layer.segmentCount} | ${layer.maxSegmentLengthMeters} | ${layer.averageSegmentLengthMeters} | ${layer.suspiciousLongSegmentCount} | ${layer.selfCrossingCount} | ${layer.duplicateSegmentCount} | ${layer.bboxOutlierCount} | ${layer.geometryOutsideGuangdongBboxCount} | ${layer.suspectedRingBridgeCount} |`
    )),
    "",
    "## Totals",
    "",
    `- feature count: ${result.totals.featureCount}`,
    `- segment count: ${result.totals.segmentCount}`,
    `- max segment length: ${result.totals.maxSegmentLengthMeters} m`,
    `- average segment length: ${result.totals.averageSegmentLengthMeters} m`,
    `- suspicious long segments: ${result.totals.suspiciousLongSegmentCount}`,
    `- self crossings: ${result.totals.selfCrossingCount}`,
    `- duplicate segments: ${result.totals.duplicateSegmentCount}`,
    `- bbox outliers: ${result.totals.bboxOutlierCount}`,
    `- outside Guangdong bbox: ${result.totals.geometryOutsideGuangdongBboxCount}`,
    `- suspected ring bridges: ${result.totals.suspectedRingBridgeCount}`,
    "",
  ];

  if (result.comparison) {
    lines.push(
      "## WGS84 / GCJ-02 Comparison",
      "",
      `Compared with: ${result.comparison.comparedWith.displayMode} / ${result.comparison.comparedWith.qualityMode}`,
      `- suspicious long segment ids in both: ${result.comparison.suspiciousLongSegmentIdsInBoth}`,
      `- suspicious long segment ids only in selected: ${result.comparison.suspiciousLongSegmentIdsOnlyInSelected}`,
      `- suspicious long segment ids only in counterpart: ${result.comparison.suspiciousLongSegmentIdsOnlyInCounterpart}`,
      `- crossing pair ids in both: ${result.comparison.crossingSegmentPairIdsInBoth}`,
      `- crossing pair ids only in selected: ${result.comparison.crossingSegmentPairIdsOnlyInSelected}`,
      `- crossing pair ids only in counterpart: ${result.comparison.crossingSegmentPairIdsOnlyInCounterpart}`,
      "",
    );
  }

  writeFileSync(resolve(ROOT, path), `${lines.join("\n")}\n`, "utf8");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const selectedAudit = auditDisplayMode(args.displayMode, args.qualityMode, args.levels);
  const counterpartMode: DisplayMode = args.qualityMode === "clean"
    ? args.displayMode
    : args.displayMode === "gcj02"
      ? "wgs84"
      : "gcj02";
  const counterpartQualityMode: QualityMode = args.qualityMode === "clean" ? "raw" : "raw";
  const counterpartAudit = auditDisplayMode(counterpartMode, counterpartQualityMode, args.levels);
  const result = roundAuditNumbers({
    generatedAt: new Date().toISOString(),
    displayMode: args.displayMode,
    qualityMode: args.qualityMode,
    levels: args.levels,
    thresholds: {
      suspiciousSegmentMeters: SUSPICIOUS_SEGMENT_METERS,
      suspectedRingBridgeMeters: SUSPECTED_RING_BRIDGE_METERS,
      bboxOutlierMeters: BBOX_OUTLIER_METERS,
      gridCellDegrees: GRID_CELL_DEGREES,
    },
    layers: selectedAudit.layers,
    totals: sumLayerAudits(selectedAudit.layers),
    comparison: compareAudit(selectedAudit, counterpartAudit, counterpartMode, counterpartQualityMode),
  });

  if (args.writeReport) {
    const reportSuffix = args.qualityMode === "clean"
      ? `${args.displayMode}-clean`
      : args.displayMode;
    writeFeatureCollection(
      args.qualityMode === "clean"
        ? `${DEBUG_DIR}/suspicious-long-segments-clean.geojson`
        : `${DEBUG_DIR}/suspicious-long-segments.geojson`,
      selectedAudit.longSegments.map((segment) =>
        makeLineFeature(segment, "segment-length-over-threshold"),
      ),
    );
    writeFeatureCollection(
      args.qualityMode === "clean"
        ? `${DEBUG_DIR}/crossing-segments-clean.geojson`
        : `${DEBUG_DIR}/crossing-segments.geojson`,
      selectedAudit.crossings.map(([left, right]) =>
        makeCrossingFeature(left, right),
      ),
    );
    writeFeatureCollection(
      args.qualityMode === "clean"
        ? `${DEBUG_DIR}/bbox-outliers-clean.geojson`
        : `${DEBUG_DIR}/bbox-outliers.geojson`,
      selectedAudit.bboxOutliers.map((segment) =>
        makeLineFeature(segment, "bbox-outlier-or-outside-guangdong-bbox"),
      ),
    );
    writeFeatureCollection(
      args.qualityMode === "clean"
        ? `${DEBUG_DIR}/suspected-ring-bridges-clean.geojson`
        : `${DEBUG_DIR}/suspected-ring-bridges.geojson`,
      selectedAudit.ringBridgeCandidates.map((segment) =>
        makeLineFeature(segment, "long-one-sided-segment-possible-ring-bridge"),
      ),
    );
    writeJson(
      `${DEBUG_DIR}/admin-tile-source-quality-${reportSuffix}.json`,
      result,
    );
    writeMarkdownReport(
      `${DEBUG_DIR}/admin-tile-source-quality-${reportSuffix}.md`,
      result,
    );
  }

  console.log(JSON.stringify(result, null, 2));
}

main();
