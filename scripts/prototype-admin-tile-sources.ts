import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { wgs84ToGcj02 } from "../src/lib/map/coordinateTransform.ts";

type AdminLevel = "province" | "prefecture" | "county";
type Scope = "guangdong" | "china";
type DisplayMode = "wgs84" | "gcj02";
type QualityMode = "raw" | "clean";
type Position = [number, number];
type LinearRing = Position[];

type NormalizedAdminGeometry = {
  type: "Polygon" | "MultiPolygon";
  coordinates: Position[][] | Position[][][];
};

type NormalizedAdminRegion = {
  adcode: string;
  name: string;
  level: AdminLevel | string;
  adminType?: string;
  parentAdcode?: string | null;
  provinceAdcode?: string | null;
  prefectureAdcode?: string | null;
  center?: { lng: number; lat: number } | null;
  labelPoint?: { lng: number; lat: number } | null;
  geometry: NormalizedAdminGeometry;
};

type NormalizedAdminFile = {
  regions: NormalizedAdminRegion[];
};

type BoundaryFeature = {
  type: "Feature";
  properties: {
    layer: `${AdminLevel}_boundary`;
    level: AdminLevel;
    leftAdcode: string | null;
    rightAdcode: string | null;
    parentAdcode: string | null;
    source: "normalized_admin_geometry_2025";
    topologyVersion: "prototype-f3-segment-dedupe-v1";
    displayMode: DisplayMode;
    coordinateSystem: "WGS84" | "GCJ-02-preoffset";
    sourceCoordinateSystem: "WGS84";
    qualityMode: QualityMode;
    qualityAction?: "keep" | "filter";
    qualityClassification?: string;
    qualityReason?: string;
  };
  geometry: {
    type: "LineString";
    coordinates: Position[];
  };
};

type FeatureCollection = {
  type: "FeatureCollection";
  name: string;
  features: BoundaryFeature[];
};

type BoundaryAccumulator = {
  key: string;
  start: Position;
  end: Position;
  sources: Map<string, { name: string; parentAdcode: string | null }>;
};

type LayerResult = {
  level: AdminLevel;
  scope: Scope;
  inputRegionCount: number;
  rawSegmentCount: number;
  dedupedSegmentCount: number;
  outputPath: string;
  qualityMode: QualityMode;
  filteredSegmentCount: number;
};

type CleanDecision = {
  level: AdminLevel;
  featureIndex: number;
  leftAdcode: string;
  rightAdcode: string | null;
  parentAdcode: string;
  lengthMeters: number;
  coastalOrWaterBoundary: boolean;
  action: "keep" | "filter";
  classification: string;
  reason: string;
};

const ROOT = process.cwd();
const DEFAULT_OUTPUT_DIR = "temp/admin-tile-prototype";
const DEFAULT_GCJ02_OUTPUT_DIR = "temp/admin-tile-prototype/gcj02-source";
const DEFAULT_CLEAN_OUTPUT_DIR = "temp/admin-tile-prototype/clean-source";
const CHINA_OUTPUT_DIR = "temp/admin-tile-prototype/china-source";
const CHINA_GCJ02_OUTPUT_DIR = "temp/admin-tile-prototype/china-gcj02-source";
const CHINA_CLEAN_OUTPUT_DIR = "temp/admin-tile-prototype/china-clean-source";
const DEFAULT_PRECISION_BY_LEVEL: Record<AdminLevel, number> = {
  province: 6,
  prefecture: 6,
  county: 6,
};

const CLEAN_LONG_SEGMENT_DECISIONS: CleanDecision[] = [
  {
    level: "province",
    featureIndex: 354,
    leftAdcode: "440000",
    rightAdcode: null,
    parentAdcode: "440000",
    lengthMeters: 11057.7,
    coastalOrWaterBoundary: false,
    action: "keep",
    classification: "one-sided-land-province-edge",
    reason: "粤北内陆省界候选，不属于本轮 coastal/water 清理范围。",
  },
  {
    level: "province",
    featureIndex: 1125,
    leftAdcode: "440000",
    rightAdcode: null,
    parentAdcode: "440000",
    lengthMeters: 10790.6,
    coastalOrWaterBoundary: true,
    action: "filter",
    classification: "one-sided-coastal-or-water-boundary",
    reason: "粤西沿海/水域口径候选，one-sided 且超过 10km，clean 对照版过滤。",
  },
  {
    level: "province",
    featureIndex: 1223,
    leftAdcode: "440000",
    rightAdcode: null,
    parentAdcode: "440000",
    lengthMeters: 10380.4,
    coastalOrWaterBoundary: true,
    action: "filter",
    classification: "one-sided-coastal-or-water-boundary",
    reason: "雷州半岛附近沿海/水域口径候选，one-sided 且超过 10km，clean 对照版过滤。",
  },
  {
    level: "province",
    featureIndex: 1316,
    leftAdcode: "440000",
    rightAdcode: null,
    parentAdcode: "440000",
    lengthMeters: 13347.6,
    coastalOrWaterBoundary: true,
    action: "filter",
    classification: "one-sided-coastal-or-water-boundary",
    reason: "湛江沿海/水域口径候选，为本轮最长 one-sided 长段，clean 对照版过滤。",
  },
  {
    level: "prefecture",
    featureIndex: 107,
    leftAdcode: "440100",
    rightAdcode: "441900",
    parentAdcode: "440000",
    lengthMeters: 11499.9,
    coastalOrWaterBoundary: false,
    action: "keep",
    classification: "shared-real-admin-boundary",
    reason: "广州/东莞真实共享行政边界，不能为降低长段数而删除。",
  },
  {
    level: "prefecture",
    featureIndex: 362,
    leftAdcode: "440200",
    rightAdcode: null,
    parentAdcode: "440000",
    lengthMeters: 11057.7,
    coastalOrWaterBoundary: false,
    action: "keep",
    classification: "one-sided-land-province-edge",
    reason: "韶关方向内陆省界候选，不属于 coastal/water 清理范围。",
  },
  {
    level: "prefecture",
    featureIndex: 2058,
    leftAdcode: "440800",
    rightAdcode: null,
    parentAdcode: "440000",
    lengthMeters: 10380.4,
    coastalOrWaterBoundary: true,
    action: "filter",
    classification: "one-sided-coastal-or-water-boundary",
    reason: "湛江沿海/水域口径候选，clean 对照版过滤。",
  },
  {
    level: "prefecture",
    featureIndex: 2151,
    leftAdcode: "440800",
    rightAdcode: null,
    parentAdcode: "440000",
    lengthMeters: 13347.6,
    coastalOrWaterBoundary: true,
    action: "filter",
    classification: "one-sided-coastal-or-water-boundary",
    reason: "湛江沿海/水域口径候选，clean 对照版过滤。",
  },
  {
    level: "prefecture",
    featureIndex: 2378,
    leftAdcode: "440900",
    rightAdcode: null,
    parentAdcode: "440000",
    lengthMeters: 10790.6,
    coastalOrWaterBoundary: true,
    action: "filter",
    classification: "one-sided-coastal-or-water-boundary",
    reason: "茂名沿海/水域口径候选，clean 对照版过滤。",
  },
  {
    level: "county",
    featureIndex: 194,
    leftAdcode: "440113",
    rightAdcode: null,
    parentAdcode: "440100",
    lengthMeters: 11499.9,
    coastalOrWaterBoundary: false,
    action: "keep",
    classification: "county-edge-aligned-with-prefecture-boundary",
    reason: "番禺/东莞附近边界与上级广州/东莞边界重合，按真实行政边界保留。",
  },
  {
    level: "county",
    featureIndex: 1392,
    leftAdcode: "440282",
    rightAdcode: null,
    parentAdcode: "440200",
    lengthMeters: 11057.7,
    coastalOrWaterBoundary: false,
    action: "keep",
    classification: "one-sided-land-province-edge",
    reason: "南雄方向内陆省界候选，不属于 coastal/water 清理范围。",
  },
  {
    level: "county",
    featureIndex: 1948,
    leftAdcode: "440507",
    rightAdcode: "440515",
    parentAdcode: "440500",
    lengthMeters: 10428.4,
    coastalOrWaterBoundary: false,
    action: "keep",
    classification: "shared-real-admin-boundary",
    reason: "汕头龙湖/澄海共享行政边界，不能删除。",
  },
  {
    level: "county",
    featureIndex: 3255,
    leftAdcode: "440823",
    rightAdcode: null,
    parentAdcode: "440800",
    lengthMeters: 13347.6,
    coastalOrWaterBoundary: true,
    action: "filter",
    classification: "one-sided-coastal-or-water-boundary",
    reason: "湛江沿海/水域口径候选，clean 对照版过滤。",
  },
  {
    level: "county",
    featureIndex: 3556,
    leftAdcode: "440882",
    rightAdcode: null,
    parentAdcode: "440800",
    lengthMeters: 10380.4,
    coastalOrWaterBoundary: true,
    action: "filter",
    classification: "one-sided-coastal-or-water-boundary",
    reason: "雷州沿海/水域口径候选，clean 对照版过滤。",
  },
  {
    level: "county",
    featureIndex: 3779,
    leftAdcode: "440904",
    rightAdcode: null,
    parentAdcode: "440900",
    lengthMeters: 10790.6,
    coastalOrWaterBoundary: true,
    action: "filter",
    classification: "one-sided-coastal-or-water-boundary",
    reason: "茂名沿海/水域口径候选，clean 对照版过滤。",
  },
];

const INPUT_FILES_BY_SCOPE: Record<Scope, Record<AdminLevel, string>> = {
  guangdong: {
    province: "data/admin/normalized/guangdong-admin-regions.geometry.json",
    prefecture: "data/admin/normalized/guangdong-admin-regions.geometry.json",
    county: "data/admin/normalized/guangdong-county-admin-regions.geometry.json",
  },
  china: {
    province: "data/admin/normalized/china-province-admin-regions.geometry.json",
    prefecture: "data/admin/normalized/china-prefecture-admin-regions.geometry.json",
    county: "data/admin/normalized/china-county-admin-regions.geometry.json",
  },
};

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

  const scope = parseScope(parsed.scope);
  const displayMode = parseDisplayMode(parsed["display-mode"]);
  const qualityMode = parseQualityMode(parsed["quality-mode"]);

  return {
    outputDir: typeof parsed.output === "string"
      ? parsed.output
      : getDefaultOutputDir(scope, displayMode, qualityMode),
    precision: typeof parsed.precision === "string" ? Number(parsed.precision) : undefined,
    scope,
    displayMode,
    qualityMode,
  };
}

function getDefaultOutputDir(scope: Scope, displayMode: DisplayMode, qualityMode: QualityMode) {
  if (scope === "china") {
    if (qualityMode === "clean") {
      return CHINA_CLEAN_OUTPUT_DIR;
    }

    return displayMode === "gcj02" ? CHINA_GCJ02_OUTPUT_DIR : CHINA_OUTPUT_DIR;
  }

  if (qualityMode === "clean") {
    return DEFAULT_CLEAN_OUTPUT_DIR;
  }

  return displayMode === "gcj02" ? DEFAULT_GCJ02_OUTPUT_DIR : DEFAULT_OUTPUT_DIR;
}

function parseScope(value: string | boolean | undefined): Scope {
  if (typeof value !== "string") {
    return "guangdong";
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "guangdong" || normalized === "gd") {
    return "guangdong";
  }

  if (normalized === "china" || normalized === "national") {
    return "china";
  }

  throw new Error(`Unsupported --scope=${value}. Expected guangdong or china.`);
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

function readRegions(path: string): NormalizedAdminRegion[] {
  const absolutePath = resolve(ROOT, path);
  const payload = JSON.parse(readFileSync(absolutePath, "utf8")) as NormalizedAdminFile;

  if (!Array.isArray(payload.regions)) {
    throw new Error(`Expected normalized admin file with regions[]: ${path}`);
  }

  return payload.regions;
}

function selectRegions(scope: Scope, level: AdminLevel): NormalizedAdminRegion[] {
  return readRegions(INPUT_FILES_BY_SCOPE[scope][level]).filter((region) => {
    if (scope === "china") {
      return region.level === level;
    }

    if (level === "province") {
      return region.adcode === "440000" || region.level === "province";
    }

    if (level === "prefecture") {
      return region.provinceAdcode === "440000" && region.level === "prefecture";
    }

    return region.provinceAdcode === "440000" && region.level === "county";
  });
}

function getExteriorRings(geometry: NormalizedAdminGeometry): LinearRing[] {
  if (geometry.type === "Polygon") {
    const polygon = geometry.coordinates as Position[][];
    return polygon[0]?.length ? [polygon[0]] : [];
  }

  if (geometry.type === "MultiPolygon") {
    const multiPolygon = geometry.coordinates as Position[][][];
    return multiPolygon
      .map((polygon) => polygon[0])
      .filter((ring): ring is LinearRing => Array.isArray(ring) && ring.length > 0);
  }

  return [];
}

function quantizeCoordinate(position: Position, precision: number): Position {
  const factor = 10 ** precision;
  return [
    Math.round(position[0] * factor) / factor,
    Math.round(position[1] * factor) / factor,
  ];
}

function transformCoordinate(position: Position, displayMode: DisplayMode): Position {
  if (displayMode === "gcj02") {
    return wgs84ToGcj02(position[0], position[1]);
  }

  return position;
}

function coordinateKey(position: Position, precision: number): string {
  const [lng, lat] = quantizeCoordinate(position, precision);
  return `${lng.toFixed(precision)},${lat.toFixed(precision)}`;
}

function segmentKey(start: Position, end: Position, precision: number): string {
  const startKey = coordinateKey(start, precision);
  const endKey = coordinateKey(end, precision);
  return startKey < endKey ? `${startKey}|${endKey}` : `${endKey}|${startKey}`;
}

function isValidPosition(position: unknown): position is Position {
  return (
    Array.isArray(position) &&
    position.length >= 2 &&
    Number.isFinite(position[0]) &&
    Number.isFinite(position[1])
  );
}

function collectBoundarySegments(
  regions: NormalizedAdminRegion[],
  level: AdminLevel,
  precision: number,
  displayMode: DisplayMode,
): { rawSegmentCount: number; features: BoundaryFeature[] } {
  const segments = new Map<string, BoundaryAccumulator>();
  let rawSegmentCount = 0;

  for (const region of regions) {
    for (const ring of getExteriorRings(region.geometry)) {
      if (ring.length < 2) {
        continue;
      }

      for (let index = 0; index < ring.length - 1; index += 1) {
        const start = ring[index];
        const end = ring[index + 1];

        if (!isValidPosition(start) || !isValidPosition(end)) {
          continue;
        }

        const transformedStart = transformCoordinate(start, displayMode);
        const transformedEnd = transformCoordinate(end, displayMode);
        const snappedStart = quantizeCoordinate(transformedStart, precision);
        const snappedEnd = quantizeCoordinate(transformedEnd, precision);

        if (snappedStart[0] === snappedEnd[0] && snappedStart[1] === snappedEnd[1]) {
          continue;
        }

        rawSegmentCount += 1;
        const key = segmentKey(snappedStart, snappedEnd, precision);
        const existing = segments.get(key);

        if (existing) {
          existing.sources.set(region.adcode, {
            name: region.name,
            parentAdcode: region.parentAdcode ?? region.prefectureAdcode ?? region.provinceAdcode ?? null,
          });
          continue;
        }

        segments.set(key, {
          key,
          start: snappedStart,
          end: snappedEnd,
          sources: new Map([
            [
              region.adcode,
              {
                name: region.name,
                parentAdcode: region.parentAdcode ?? region.prefectureAdcode ?? region.provinceAdcode ?? null,
              },
            ],
          ]),
        });
      }
    }
  }

  const features = Array.from(segments.values()).map((segment): BoundaryFeature => {
    const sources = Array.from(segment.sources.entries()).sort(([left], [right]) => (
      left.localeCompare(right)
    ));
    const [leftAdcode, leftSource] = sources[0] ?? [null, null];
    const [rightAdcode] = sources[1] ?? [null, null];

    return {
      type: "Feature",
      properties: {
        layer: `${level}_boundary`,
        level,
        leftAdcode,
        rightAdcode,
        parentAdcode: leftSource?.parentAdcode ?? null,
        source: "normalized_admin_geometry_2025",
        topologyVersion: "prototype-f3-segment-dedupe-v1",
        displayMode,
        coordinateSystem: displayMode === "gcj02" ? "GCJ-02-preoffset" : "WGS84",
        sourceCoordinateSystem: "WGS84",
        qualityMode: "raw",
      },
      geometry: {
        type: "LineString",
        coordinates: [segment.start, segment.end],
      },
    };
  });

  return { rawSegmentCount, features };
}

function getCleanDecision(level: AdminLevel, featureIndex: number) {
  return CLEAN_LONG_SEGMENT_DECISIONS.find((decision) =>
    decision.level === level && decision.featureIndex === featureIndex
  );
}

function applyQualityMode(
  features: BoundaryFeature[],
  scope: Scope,
  level: AdminLevel,
  qualityMode: QualityMode,
) {
  const filtered: Array<{ featureIndex: number; feature: BoundaryFeature; decision: CleanDecision }> = [];
  const retained: BoundaryFeature[] = [];

  features.forEach((feature, featureIndex) => {
    const decision = scope === "guangdong" && qualityMode === "clean"
      ? getCleanDecision(level, featureIndex)
      : undefined;
    const properties: BoundaryFeature["properties"] = {
      ...feature.properties,
      qualityMode,
      ...(decision
        ? {
          qualityAction: decision.action,
          qualityClassification: decision.classification,
          qualityReason: decision.reason,
        }
        : {}),
    };
    const nextFeature: BoundaryFeature = {
      ...feature,
      properties,
    };

    if (qualityMode === "clean" && decision?.action === "filter") {
      filtered.push({ featureIndex, feature: nextFeature, decision });
      return;
    }

    retained.push(nextFeature);
  });

  return { features: retained, filtered };
}

function writeJson(path: string, value: unknown) {
  const absolutePath = resolve(ROOT, path);
  const parent = dirname(absolutePath);

  if (!existsSync(parent)) {
    mkdirSync(parent, { recursive: true });
  }

  writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function buildLayer(
  scope: Scope,
  level: AdminLevel,
  outputDir: string,
  precision: number,
  displayMode: DisplayMode,
  qualityMode: QualityMode,
): LayerResult {
  const regions = selectRegions(scope, level);
  const { rawSegmentCount, features: rawFeatures } = collectBoundarySegments(
    regions,
    level,
    precision,
    displayMode,
  );
  const { features, filtered } = applyQualityMode(rawFeatures, scope, level, qualityMode);
  const outputPath = `${outputDir}/${scope}-${level}-boundary-source.geojson`;
  const collection: FeatureCollection = {
    type: "FeatureCollection",
    name: `guangdong_${level}_boundary_source`,
    features,
  };

  writeJson(outputPath, collection);

  return {
    level,
    scope,
    inputRegionCount: regions.length,
    rawSegmentCount,
    dedupedSegmentCount: features.length,
    outputPath,
    qualityMode,
    filteredSegmentCount: filtered.length,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const levels: AdminLevel[] = ["province", "prefecture", "county"];
  const results = levels.map((level) => buildLayer(
    args.scope,
    level,
    args.outputDir,
    args.precision ?? DEFAULT_PRECISION_BY_LEVEL[level],
    args.displayMode,
    args.qualityMode,
  ));

  const manifest = {
    generatedAt: new Date().toISOString(),
    description:
      `Experimental ${args.scope} admin boundary line GeoJSON sources for PMTiles rendering. These files are not used by production Map Studio by default.`,
    scope: args.scope,
    displayMode: args.displayMode,
    qualityMode: args.qualityMode,
    coordinateSystem: args.displayMode === "gcj02" ? "GCJ-02-preoffset" : "WGS84",
    sourceCoordinateSystem: "WGS84",
    coordinateTransform:
      args.displayMode === "gcj02"
        ? "WGS84 coordinates are transformed with src/lib/map/coordinateTransform.ts wgs84ToGcj02() before source GeoJSON is written."
        : "No coordinate transform is applied before source GeoJSON is written.",
    inputFiles: INPUT_FILES_BY_SCOPE[args.scope],
    outputLayers: results,
    cleanLongSegmentDecisions:
      args.scope === "guangdong" && args.qualityMode === "clean"
        ? CLEAN_LONG_SEGMENT_DECISIONS
        : [],
    nextStep:
      "Convert these boundary source GeoJSON files to MVT/PMTiles with tippecanoe or an equivalent vector tile pipeline.",
  };

  writeJson(`${args.outputDir}/manifest.json`, manifest);
  console.log(JSON.stringify(manifest, null, 2));
}

main();
