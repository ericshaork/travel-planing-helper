import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { open } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { VectorTile } from "@mapbox/vector-tile";
import { PbfReader } from "pbf";
import { PMTiles } from "pmtiles";
import { wgs84ToGcj02 } from "../src/lib/map/coordinateTransform.ts";

type Position = [number, number];
type AdminLevel = "province" | "prefecture" | "county";
type FallbackRole = "none" | "selfAsPrefecture" | "selfAsCounty" | "countyAsPrefecture";
type DisplaySubdivisionType =
  | "administrative"
  | "parish"
  | "statistical"
  | "fallbackSelf"
  | "reclaimed_or_display_subdivision";
type BuildMode = "g5" | "fallback" | "fallback-label" | "hkmo-fallback";
type LayerName =
  | "province_boundary"
  | "prefecture_boundary"
  | "county_boundary"
  | "parent_derived_prefecture_boundary"
  | "patch_debug_boundary"
  | "admin_label"
  | "metadata";
type ToolName = "tippecanoe" | "pmtiles";

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

type ToolStatus = {
  name: ToolName;
  available: boolean;
  path: string | null;
  runner: "native" | "wsl" | null;
};

type SourceLayerStats = {
  name: LayerName;
  path: string;
  featureCount: number;
  vertexCount: number;
  sizeBytes: number;
};

type G441Coverage = {
  prefectureAdcode: string;
  name: string;
  region: string;
  expectedCountyCount: number;
  patchedCountyCount: number;
  coverageRatio: number;
  mode: string;
};

type G441Manifest = {
  coverage: G441Coverage[];
};

type G442Manifest = {
  sourceLayers: Array<{
    name: "province_boundary" | "prefecture_boundary" | "county_boundary";
    cleanPath: string;
    debugPath: string;
  }>;
  metrics: {
    cleanCrossingCandidates: number;
    issueSummary: {
      filteredCounts: Record<string, number>;
    };
    sharedSegmentsBefore: {
      baselineParentSharedRatio: number;
      derivedParentSharedRatio: number;
    };
    sharedSegmentsAfter: {
      baselineParentSharedRatio: number;
      derivedParentSharedRatio: number;
    };
  };
};

type NormalizedRegion = {
  adcode: string;
  name: string;
  level: string;
  adminType?: string | null;
  parentAdcode?: string | null;
  provinceAdcode?: string | null;
  prefectureAdcode?: string | null;
  center?: { lng: number; lat: number } | null;
  labelPoint?: { lng: number; lat: number } | null;
};

type ParentGate = {
  prefectureAdcode: string;
  name: string;
  region: string;
  enabled: boolean;
  decision: "enabled_parent_derived" | "fallback_baseline";
  coverageRatio: number;
  patchedCountyCount: number;
  expectedCountyCount: number;
  mode: string;
  crossingCandidates: number;
  abnormalLongSegmentCount: number;
  parentChildSharedRatio: number;
  baselineSharedRatio: number;
  cleanDiagnosticsPassed: boolean;
  reasons: string[];
};

type HierarchyFallbackRule = {
  adcode: string;
  name: string;
  adminType: string | null;
  sourceLevel: AdminLevel;
  displayLevel: Exclude<AdminLevel, "province">;
  fallbackRole: Exclude<FallbackRole, "none">;
  sourceLayer: "province_boundary" | "county_boundary";
  targetLayer: "prefecture_boundary" | "county_boundary";
  childCount: number;
  reason: string;
};

type LabelFeature = {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: {
    type: "Point";
    coordinates: Position;
  };
};

type TileAuditRecord = {
  subject: string;
  adcode: string;
  z: number;
  x: number;
  y: number;
  layer: string;
  expectedDisplayLevel?: AdminLevel;
  expectedFallbackRole?: FallbackRole;
  expectedDisplaySubdivisionType?: DisplaySubdivisionType;
  featureCount: number;
  matchingCount: number;
  pmtilesTileBytes: number;
  sampleProperties: Record<string, unknown> | null;
  passed: boolean;
};

type SegmentRecord = {
  key: string;
  parentAdcode: string;
};

const ROOT = process.cwd();
const BASELINE_DIR = "temp/admin-tile-prototype/china-gcj02-source";
const G441_MANIFEST = "data/source-manifests/admin-parent-derived-boundary.g4-4-1.json";
const G442_MANIFEST = "data/source-manifests/admin-parent-derived-clean.g4-4-2.json";
const OUT_DIR = "temp/admin-tile-prototype/china-multilayer-g5";
const OUT_MBTILES = "temp/admin-tile-prototype/china-multilayer-g5/china-admin-boundaries-gcj02-multilayer-g5.mbtiles";
const OUT_PMTILES = "public/admin-tiles/experimental/china-admin-boundaries-gcj02-multilayer-g5.pmtiles";
const OUT_JSON = "data/source-manifests/admin-china-multilayer-pmtiles.g5.json";
const OUT_DOC = "docs/WANDERLY_V2_ADMIN_CHINA_MULTILAYER_PMTILES_G5.md";
const FALLBACK_OUT_DIR = "temp/admin-tile-prototype/china-multilayer-g5-fallback";
const FALLBACK_OUT_MBTILES = "temp/admin-tile-prototype/china-multilayer-g5-fallback/china-admin-boundaries-gcj02-multilayer-g5-fallback.mbtiles";
const FALLBACK_OUT_PMTILES = "public/admin-tiles/experimental/china-admin-boundaries-gcj02-multilayer-g5-fallback.pmtiles";
const FALLBACK_OUT_JSON = "data/source-manifests/admin-china-multilayer-pmtiles.g5-fallback.json";
const FALLBACK_OUT_DOC = "docs/WANDERLY_V2_ADMIN_CHINA_MULTILAYER_G5_FALLBACK.md";
const FALLBACK_LABEL_OUT_DIR = "temp/admin-tile-prototype/china-multilayer-g5-fallback-label";
const FALLBACK_LABEL_OUT_MBTILES = "temp/admin-tile-prototype/china-multilayer-g5-fallback-label/china-admin-boundaries-gcj02-multilayer-g5-fallback-label.mbtiles";
const FALLBACK_LABEL_OUT_PMTILES = "public/admin-tiles/experimental/china-admin-boundaries-gcj02-multilayer-g5-fallback-label.pmtiles";
const FALLBACK_LABEL_OUT_JSON = "data/source-manifests/admin-china-multilayer-pmtiles.g5-fallback-label.json";
const FALLBACK_LABEL_OUT_DOC = "docs/WANDERLY_V2_ADMIN_CHINA_MULTILAYER_G5_FALLBACK_LABEL.md";
const HKMO_FALLBACK_OUT_DIR = "temp/admin-tile-prototype/china-multilayer-g5-hkmo-fallback";
const HKMO_FALLBACK_OUT_MBTILES = "temp/admin-tile-prototype/china-multilayer-g5-hkmo-fallback/china-admin-boundaries-gcj02-multilayer-g5-hkmo-fallback.mbtiles";
const HKMO_FALLBACK_OUT_PMTILES = "public/admin-tiles/experimental/china-admin-boundaries-gcj02-multilayer-g5-hkmo-fallback.pmtiles";
const HKMO_FALLBACK_OUT_JSON = "data/source-manifests/admin-china-multilayer-pmtiles.g5-hkmo-fallback.json";
const HKMO_FALLBACK_OUT_DOC = "docs/WANDERLY_V2_ADMIN_CHINA_MULTILAYER_G5_HKMO_FALLBACK.md";
const MACAU_DATAV_SUBDIVISION_SOURCE = "temp/admin-source-comparison-g2/datav/zhuhai-macau-hengqin-820000.geojson";
const CURRENT_CHINA_PMTILES = "public/admin-tiles/china-admin-boundaries-gcj02.pmtiles";
const MACAU_DATAV_SUBDIVISION_ADCODES = [
  "820001",
  "820002",
  "820003",
  "820004",
  "820005",
  "820006",
  "820007",
  "820008",
] as const;

const GATE_THRESHOLDS = {
  childCoverageRatio: 1,
  maxCrossingCandidatesPerParent: 400,
  maxAbnormalLongSegmentsPerParent: 0,
  minParentChildSharedRatio: 0.85,
  requireSharedRatioAboveBaseline: true,
};

const LOD_RULES = {
  province_boundary: { minZoom: 3, maxZoom: 12, displayZoom: "z3-z12", primaryDisplayZoom: "z3-z5" },
  prefecture_boundary: { minZoom: 6, maxZoom: 12, displayZoom: "z6-z12", primaryDisplayZoom: "z6-z8" },
  county_boundary: { minZoom: 9, maxZoom: 12, displayZoom: "z9-z12", primaryDisplayZoom: "z9-z12" },
  parent_derived_prefecture_boundary: { minZoom: 6, maxZoom: 12, displayZoom: "z6-z12", primaryDisplayZoom: "z6-z12" },
  patch_debug_boundary: { minZoom: 9, maxZoom: 12, displayZoom: "debug z9-z12", primaryDisplayZoom: "debug only" },
  admin_label: { minZoom: 3, maxZoom: 12, displayZoom: "z3-z12 labels", primaryDisplayZoom: "z3-z12 by displayLevel" },
  metadata: { minZoom: 3, maxZoom: 12, displayZoom: "metadata", primaryDisplayZoom: "metadata" },
  planned: { highPrecisionCountyAndCoastalPatch: "z13-z14 planned only; not built in G5." },
};

const TILE_ATTRIBUTE_INCLUDES = [
  "layer",
  "level",
  "displayLevel",
  "sourceLevel",
  "fallbackRole",
  "fallbackType",
  "displaySubdivisionType",
  "experimental",
  "adcode",
  "name",
  "leftAdcode",
  "rightAdcode",
  "parentAdcode",
  "displayParentAdcode",
  "provinceAdcode",
  "adminType",
  "fallbackReason",
  "labelRank",
  "labelText",
  "labelLng",
  "labelLat",
  "source",
  "sourceAdcode",
  "sourceName",
  "sourceMix",
  "ruleDecision",
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
  "lodMinZoom",
  "lodMaxZoom",
  "lodPrimary",
  "phase",
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

function baselinePath(level: "province" | "prefecture" | "county"): string {
  return `${BASELINE_DIR}/china-${level}-boundary-source.geojson`;
}

function outputConfig(mode: BuildMode) {
  if (mode === "hkmo-fallback") {
    return {
      phase: "G5.0.8",
      outputLabel: "G5 HK/MO fallback",
      outDir: HKMO_FALLBACK_OUT_DIR,
      outMbtiles: HKMO_FALLBACK_OUT_MBTILES,
      outPmtiles: HKMO_FALLBACK_OUT_PMTILES,
      outJson: HKMO_FALLBACK_OUT_JSON,
      outDoc: HKMO_FALLBACK_OUT_DOC,
      pmtilesName: "china-admin-boundaries-gcj02-multilayer-g5-hkmo-fallback",
      pmtilesDescription: "Experimental China admin boundaries multilayer G5.0.8 with Hong Kong/Macau PMTiles-only display fallback and Macau DataV display subdivisions. productionApproved=false.",
      publicOssPath: "admin-tiles/cn/experimental/china-admin-boundaries-gcj02-multilayer-g5-hkmo-fallback.pmtiles",
      acceptanceUrl: "/admin-tiles/experimental/china-admin-boundaries-gcj02-multilayer-g5-hkmo-fallback.pmtiles",
    };
  }

  if (mode === "fallback-label") {
    return {
      phase: "G5.0.2",
      outputLabel: "G5 fallback label",
      outDir: FALLBACK_LABEL_OUT_DIR,
      outMbtiles: FALLBACK_LABEL_OUT_MBTILES,
      outPmtiles: FALLBACK_LABEL_OUT_PMTILES,
      outJson: FALLBACK_LABEL_OUT_JSON,
      outDoc: FALLBACK_LABEL_OUT_DOC,
      pmtilesName: "china-admin-boundaries-gcj02-multilayer-g5-fallback-label",
      pmtilesDescription: "Experimental China admin boundaries multilayer G5 with special admin hierarchy display fallback and admin label layer. productionApproved=false.",
      publicOssPath: "admin-tiles/cn/experimental/china-admin-boundaries-gcj02-multilayer-g5-fallback-label.pmtiles",
      acceptanceUrl: "/admin-tiles/experimental/china-admin-boundaries-gcj02-multilayer-g5-fallback-label.pmtiles",
    };
  }

  return mode === "fallback"
    ? {
      phase: "G5.0.1",
      outputLabel: "G5 fallback",
      outDir: FALLBACK_OUT_DIR,
      outMbtiles: FALLBACK_OUT_MBTILES,
      outPmtiles: FALLBACK_OUT_PMTILES,
      outJson: FALLBACK_OUT_JSON,
      outDoc: FALLBACK_OUT_DOC,
      pmtilesName: "china-admin-boundaries-gcj02-multilayer-g5-fallback",
      pmtilesDescription: "Experimental China admin boundaries multilayer G5 with special admin hierarchy display fallback. productionApproved=false.",
      publicOssPath: "admin-tiles/cn/experimental/china-admin-boundaries-gcj02-multilayer-g5-fallback.pmtiles",
      acceptanceUrl: "/admin-tiles/experimental/china-admin-boundaries-gcj02-multilayer-g5-fallback.pmtiles",
    }
    : {
      phase: "G5",
      outputLabel: "G5 multilayer",
      outDir: OUT_DIR,
      outMbtiles: OUT_MBTILES,
      outPmtiles: OUT_PMTILES,
      outJson: OUT_JSON,
      outDoc: OUT_DOC,
      pmtilesName: "china-admin-boundaries-gcj02-multilayer-g5",
      pmtilesDescription: "Experimental China admin boundaries multilayer G5 with gated parent-derived rules. productionApproved=false.",
      publicOssPath: "admin-tiles/cn/experimental/china-admin-boundaries-gcj02-multilayer-g5.pmtiles",
      acceptanceUrl: "/admin-tiles/experimental/china-admin-boundaries-gcj02-multilayer-g5.pmtiles",
    };
}

function g442LayerPath(manifest: G442Manifest, name: "prefecture_boundary" | "county_boundary", mode: "clean" | "debug"): string {
  const layer = manifest.sourceLayers.find((item) => item.name === name);
  if (!layer) throw new Error(`Missing G4.4.2 layer ${name}`);
  return mode === "clean" ? layer.cleanPath : layer.debugPath;
}

function toPosition(value: unknown): Position | null {
  if (!Array.isArray(value) || typeof value[0] !== "number" || typeof value[1] !== "number") return null;
  return [value[0], value[1]];
}

function countCoordinatePairs(value: unknown): number {
  if (!Array.isArray(value)) return 0;
  if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") return 1;
  return value.reduce((sum, child) => sum + countCoordinatePairs(child), 0);
}

function countVertices(collection: FeatureCollection): number {
  return collection.features.reduce((sum, feature) => sum + countCoordinatePairs(feature.geometry?.coordinates), 0);
}

function positionKey(point: Position, precision = 6): string {
  return `${point[0].toFixed(precision)},${point[1].toFixed(precision)}`;
}

function edgeKey(start: Position, end: Position): string {
  const a = positionKey(start);
  const b = positionKey(end);
  return a <= b ? `${a}|${b}` : `${b}|${a}`;
}

function lineEdgeKey(feature: GeoJsonFeature): string | null {
  if (feature.geometry?.type !== "LineString" || !Array.isArray(feature.geometry.coordinates)) return null;
  const points = feature.geometry.coordinates.map(toPosition).filter(Boolean) as Position[];
  if (points.length < 2) return null;
  return edgeKey(points[0], points[points.length - 1]);
}

function properties(feature: GeoJsonFeature): Record<string, unknown> {
  return feature.properties ?? {};
}

function isFeatureForParent(feature: GeoJsonFeature, parents: Set<string>): boolean {
  const props = properties(feature);
  const left = props.leftAdcode === undefined ? null : String(props.leftAdcode);
  const right = props.rightAdcode === undefined ? null : String(props.rightAdcode);
  const parent = props.parentAdcode === undefined ? null : String(props.parentAdcode);
  return Boolean((left && parents.has(left)) || (right && parents.has(right)) || (parent && parents.has(parent)));
}

function buildCountyParentMap(): Map<string, string> {
  const data = readJson<{ regions: Array<{ adcode: string; prefectureAdcode?: string | null; parentAdcode?: string | null }> }>(
    "data/admin/normalized/china-county-admin-regions.geometry.json",
  );
  return new Map(data.regions.map((region) => [
    String(region.adcode),
    String(region.prefectureAdcode ?? region.parentAdcode ?? ""),
  ]));
}

function readNormalizedRegions(level: AdminLevel): NormalizedRegion[] {
  const data = readJson<{ regions: NormalizedRegion[] }>(`data/admin/normalized/china-${level}-admin-regions.geometry.json`);
  return data.regions;
}

function parentForBoundaryFeature(feature: GeoJsonFeature, countyParent: Map<string, string>): string | null {
  const props = properties(feature);
  const parent = props.parentAdcode === undefined ? null : String(props.parentAdcode);
  if (parent && parent !== "null") return parent;
  const left = props.leftAdcode === undefined ? null : String(props.leftAdcode);
  const right = props.rightAdcode === undefined ? null : String(props.rightAdcode);
  return (left && countyParent.get(left)) || (right && countyParent.get(right)) || null;
}

function withLod(feature: GeoJsonFeature, layer: LayerName, extra: Record<string, unknown>): GeoJsonFeature {
  const lod = LOD_RULES[layer];
  return {
    ...feature,
    properties: {
      ...properties(feature),
      ...extra,
      layer,
      lodMinZoom: lod.minZoom,
      lodMaxZoom: lod.maxZoom,
      lodPrimary: lod.primaryDisplayZoom,
      phase: extra.phase ?? "G5",
      productionApproved: false,
    },
  };
}

function mapCoordinates(value: unknown, mapper: (point: Position) => Position): unknown {
  if (!Array.isArray(value)) return value;
  if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") {
    const [lng, lat] = mapper([value[0], value[1]]);
    return value.length > 2 ? [lng, lat, ...value.slice(2)] : [lng, lat];
  }

  return value.map((child) => mapCoordinates(child, mapper));
}

function transformPositionToGcj02(point: Position): Position {
  return wgs84ToGcj02(point[0], point[1]);
}

function transformGeometryToGcj02(geometry: GeoJsonGeometry | null | undefined): GeoJsonGeometry | null {
  if (!geometry) return null;
  if (geometry.type === "GeometryCollection") {
    return {
      ...geometry,
      geometries: geometry.geometries?.map(transformGeometryToGcj02).filter(Boolean) as GeoJsonGeometry[] | undefined,
    };
  }

  return {
    ...geometry,
    coordinates: mapCoordinates(geometry.coordinates, transformPositionToGcj02),
  };
}

function parentDerivedFeatures(manifest: G442Manifest): GeoJsonFeature[] {
  const collection = readJson<FeatureCollection>(g442LayerPath(manifest, "prefecture_boundary", "clean"));
  return collection.features.filter((feature) => {
    const source = String(properties(feature).source ?? "");
    return source === "derived_from_patched_county" || source === "datav_parent_reference";
  });
}

function debugFeatures(manifest: G442Manifest): GeoJsonFeature[] {
  const collection = readJson<FeatureCollection>(g442LayerPath(manifest, "prefecture_boundary", "debug"));
  return collection.features.filter((feature) => properties(feature).cleanDecision === "filter");
}

function patchCountyFeatures(manifest: G442Manifest, enabledParents: Set<string>, countyParent: Map<string, string>): GeoJsonFeature[] {
  const collection = readJson<FeatureCollection>(g442LayerPath(manifest, "county_boundary", "clean"));
  return collection.features.filter((feature) => {
    if (String(properties(feature).source ?? "") !== "datav_patch") return false;
    const parent = parentForBoundaryFeature(feature, countyParent);
    return Boolean(parent && enabledParents.has(parent));
  });
}

function segmentRecordsForCountyPatch(features: GeoJsonFeature[], countyParent: Map<string, string>): SegmentRecord[] {
  return features.flatMap((feature) => {
    const key = lineEdgeKey(feature);
    const parent = parentForBoundaryFeature(feature, countyParent);
    return key && parent ? [{ key, parentAdcode: parent }] : [];
  });
}

function computeGateRows(
  g441: G441Manifest,
  g442: G442Manifest,
  countyParent: Map<string, string>,
): ParentGate[] {
  const derived = parentDerivedFeatures(g442);
  const patchCounty = patchCountyFeatures(g442, new Set(g441.coverage.map((item) => item.prefectureAdcode)), countyParent);
  const countyKeysByParent = new Map<string, Set<string>>();
  for (const record of segmentRecordsForCountyPatch(patchCounty, countyParent)) {
    const set = countyKeysByParent.get(record.parentAdcode) ?? new Set<string>();
    set.add(record.key);
    countyKeysByParent.set(record.parentAdcode, set);
  }

  return g441.coverage.map((coverage) => {
    const parentFeatures = derived.filter((feature) => String(properties(feature).leftAdcode ?? "") === coverage.prefectureAdcode);
    const crossingCandidates = parentFeatures.reduce((sum, feature) => sum + Number(properties(feature).crossingCount ?? 0), 0);
    const abnormalLongSegmentCount = parentFeatures.filter((feature) => Number(properties(feature).lengthMeters ?? 0) > 20_000).length;
    const derivedKeys = parentFeatures.map(lineEdgeKey).filter(Boolean) as string[];
    const countyKeys = countyKeysByParent.get(coverage.prefectureAdcode) ?? new Set<string>();
    const shared = derivedKeys.filter((key) => countyKeys.has(key)).length;
    const parentChildSharedRatio = derivedKeys.length > 0 ? round3(shared / derivedKeys.length) : 0;
    const baselineSharedRatio = g442.metrics.sharedSegmentsAfter.baselineParentSharedRatio;
    const reasons: string[] = [];

    if (coverage.mode !== "derived_from_patched_county") reasons.push("mode_not_derived_from_patched_county");
    if (coverage.coverageRatio < GATE_THRESHOLDS.childCoverageRatio) reasons.push("child_coverage_below_threshold");
    if (crossingCandidates > GATE_THRESHOLDS.maxCrossingCandidatesPerParent) reasons.push("crossing_candidates_above_threshold");
    if (abnormalLongSegmentCount > GATE_THRESHOLDS.maxAbnormalLongSegmentsPerParent) reasons.push("abnormal_long_segments_above_threshold");
    if (parentChildSharedRatio < GATE_THRESHOLDS.minParentChildSharedRatio) reasons.push("parent_child_shared_ratio_below_threshold");
    if (GATE_THRESHOLDS.requireSharedRatioAboveBaseline && parentChildSharedRatio <= baselineSharedRatio) reasons.push("shared_ratio_not_above_baseline");

    const enabled = reasons.length === 0;
    return {
      prefectureAdcode: coverage.prefectureAdcode,
      name: coverage.name,
      region: coverage.region,
      enabled,
      decision: enabled ? "enabled_parent_derived" : "fallback_baseline",
      coverageRatio: coverage.coverageRatio,
      patchedCountyCount: coverage.patchedCountyCount,
      expectedCountyCount: coverage.expectedCountyCount,
      mode: coverage.mode,
      crossingCandidates,
      abnormalLongSegmentCount,
      parentChildSharedRatio,
      baselineSharedRatio,
      cleanDiagnosticsPassed: crossingCandidates <= GATE_THRESHOLDS.maxCrossingCandidatesPerParent &&
        abnormalLongSegmentCount <= GATE_THRESHOLDS.maxAbnormalLongSegmentsPerParent,
      reasons,
    };
  });
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function adcodeOfFeature(feature: GeoJsonFeature): string | null {
  const props = properties(feature);
  const adcode = props.adcode ?? props.leftAdcode ?? props.rightAdcode ?? props.parentAdcode;
  return adcode === undefined || adcode === null ? null : String(adcode);
}

function adcodeMatchesFeature(feature: GeoJsonFeature, adcode: string): boolean {
  const props = properties(feature);
  return [props.adcode, props.leftAdcode, props.rightAdcode, props.parentAdcode]
    .filter((value) => value !== undefined && value !== null)
    .map(String)
    .includes(adcode);
}

function featuresForAdcode(collection: FeatureCollection, adcode: string): GeoJsonFeature[] {
  return collection.features.filter((feature) => adcodeMatchesFeature(feature, adcode));
}

function normalizeLayerFeature(
  feature: GeoJsonFeature,
  layer: LayerName,
  displayLevel: AdminLevel,
  sourceLevel: AdminLevel,
  fallbackRole: FallbackRole,
  extra: Record<string, unknown>,
): GeoJsonFeature {
  const props = properties(feature);
  return withLod(feature, layer, {
    displayLevel,
    sourceLevel,
    fallbackRole,
    adcode: props.adcode ?? props.leftAdcode ?? props.rightAdcode ?? props.parentAdcode ?? null,
    name: props.name ?? props.leftName ?? props.rightName ?? null,
    ...extra,
  });
}

function sourceLevelForLayer(layer: "province_boundary" | "prefecture_boundary" | "county_boundary"): AdminLevel {
  if (layer === "province_boundary") return "province";
  if (layer === "prefecture_boundary") return "prefecture";
  return "county";
}

export function buildHierarchyFallbackRules(input: {
  provinces: NormalizedRegion[];
  prefectures: NormalizedRegion[];
  counties: NormalizedRegion[];
  macauDisplaySubdivisionCount?: number;
}): HierarchyFallbackRule[] {
  const realProvinces = input.provinces.filter((region) => region.level === "province");
  const prefectureCountByProvince = new Map<string, number>();
  const countyCountByProvince = new Map<string, number>();

  for (const region of input.prefectures) {
    const provinceAdcode = String(region.provinceAdcode ?? region.parentAdcode ?? "");
    if (!provinceAdcode) continue;
    prefectureCountByProvince.set(provinceAdcode, (prefectureCountByProvince.get(provinceAdcode) ?? 0) + 1);
  }
  for (const region of input.counties) {
    const provinceAdcode = String(region.provinceAdcode ?? region.parentAdcode ?? "");
    if (!provinceAdcode) continue;
    countyCountByProvince.set(provinceAdcode, (countyCountByProvince.get(provinceAdcode) ?? 0) + 1);
  }

  const rules: HierarchyFallbackRule[] = [];
  for (const province of realProvinces) {
    const adcode = String(province.adcode);
    const adminType = province.adminType ?? null;
    const prefectureChildren = prefectureCountByProvince.get(adcode) ?? 0;
    const countyChildren = countyCountByProvince.get(adcode) ?? 0;
    const effectiveCountyChildren = adcode === "820000" && input.macauDisplaySubdivisionCount
      ? input.macauDisplaySubdivisionCount
      : countyChildren;
    const isMunicipality = adminType === "municipality";
    const isSpecialAdminRegion = adminType === "special_administrative_region";
    const isTaiwan = adcode === "710000";

    if (prefectureChildren === 0 && (isMunicipality || isSpecialAdminRegion)) {
      rules.push({
        adcode,
        name: province.name,
        adminType,
        sourceLevel: "province",
        displayLevel: "prefecture",
        fallbackRole: "selfAsPrefecture",
        sourceLayer: "province_boundary",
        targetLayer: "prefecture_boundary",
        childCount: prefectureChildren,
        reason: "no_prefecture_children_self_boundary_display_fallback",
      });
    } else if (prefectureChildren === 0 && isTaiwan && effectiveCountyChildren > 0) {
      rules.push({
        adcode,
        name: province.name,
        adminType,
        sourceLevel: "county",
        displayLevel: "prefecture",
        fallbackRole: "countyAsPrefecture",
        sourceLayer: "county_boundary",
        targetLayer: "prefecture_boundary",
        childCount: effectiveCountyChildren,
        reason: "taiwan_has_county_level_city_county_data_but_no_prefecture_source",
      });
    }

    if (effectiveCountyChildren === 0 && isSpecialAdminRegion) {
      rules.push({
        adcode,
        name: province.name,
        adminType,
        sourceLevel: "province",
        displayLevel: "county",
        fallbackRole: "selfAsCounty",
        sourceLayer: "province_boundary",
        targetLayer: "county_boundary",
        childCount: effectiveCountyChildren,
        reason: "no_county_children_self_boundary_display_fallback",
      });
    }
  }

  return rules;
}

function buildHierarchyFallbackFeature(
  feature: GeoJsonFeature,
  rule: HierarchyFallbackRule,
  targetLayer: "prefecture_boundary" | "county_boundary",
  phase: string,
): GeoJsonFeature {
  return normalizeLayerFeature(feature, targetLayer, rule.displayLevel, rule.sourceLevel, rule.fallbackRole, {
    phase,
    source: "baseline_2025_display_fallback",
    sourceMix: "hierarchy_display_fallback",
    ruleDecision: "display_fallback",
    parentRebuildMode: "hierarchy_display_fallback",
    adcode: rule.adcode,
    name: rule.name,
    parentAdcode: rule.sourceLevel === "province" ? "100000" : rule.adcode,
    displayParentAdcode: rule.displayLevel === "prefecture" ? "100000" : rule.adcode,
    adminType: rule.adminType,
    fallbackReason: rule.reason,
    displaySubdivisionType: displaySubdivisionTypeForFallbackRole(rule.fallbackRole),
    topologyVersion: `${properties(feature).topologyVersion ?? "prototype-f3-segment-dedupe-v1"}+g5-fallback`,
  });
}

export function displaySubdivisionTypeForFallbackRole(
  fallbackRole: FallbackRole,
): DisplaySubdivisionType {
  return fallbackRole === "selfAsCounty" || fallbackRole === "selfAsPrefecture"
    ? "fallbackSelf"
    : "administrative";
}

export function assertMacauDisplaySubdivisionType(
  props: Record<string, unknown>,
) {
  const adcode = String(props.adcode ?? "");
  const source = String(props.source ?? "");
  const displaySubdivisionType = props.displaySubdivisionType;

  if (adcode !== "820000" && !adcode.startsWith("82")) {
    return;
  }

  if (props.fallbackRole === "selfAsCounty") {
    if (displaySubdivisionType !== "fallbackSelf") {
      throw new Error("Macau selfAsCounty fallback must use displaySubdivisionType=fallbackSelf.");
    }
    return;
  }

  if (/parish|freguesia|堂区/i.test(source) && displaySubdivisionType !== "parish") {
    throw new Error("Macau parish subdivision data must use displaySubdivisionType=parish.");
  }
}

function macauDisplaySubdivisionTypeForAdcode(adcode: string): DisplaySubdivisionType {
  return adcode === "820007" ? "reclaimed_or_display_subdivision" : "parish";
}

function getFeatureAdcode(feature: GeoJsonFeature): string {
  return String(properties(feature).adcode ?? "");
}

function getFeatureName(feature: GeoJsonFeature): string {
  return String(properties(feature).name ?? "");
}

function getFeatureLabelPoint(feature: GeoJsonFeature): Position | null {
  const props = properties(feature);
  const center = toPosition(props.centroid) ?? toPosition(props.center);
  return center ? transformPositionToGcj02(center) : null;
}

export function buildMacauDatavDisplaySubdivisionFeatures(phase = "G5.0.8"): {
  boundaryFeatures: GeoJsonFeature[];
  labelFeatures: LabelFeature[];
  sourceFeatureCount: number;
  adcodes: string[];
} {
  const collection = readJson<FeatureCollection>(MACAU_DATAV_SUBDIVISION_SOURCE);
  const allowedAdcodes = new Set<string>(MACAU_DATAV_SUBDIVISION_ADCODES);
  const sourceFeatures = collection.features.filter((feature) => allowedAdcodes.has(getFeatureAdcode(feature)));
  const boundaryFeatures: GeoJsonFeature[] = [];
  const labelFeatures: LabelFeature[] = [];

  for (const feature of sourceFeatures) {
    const adcode = getFeatureAdcode(feature);
    const name = getFeatureName(feature);
    const displaySubdivisionType = macauDisplaySubdivisionTypeForAdcode(adcode);
    const commonProperties = {
      phase,
      source: "datav_geoatlas",
      sourceMix: "macau_datav_display_subdivision",
      ruleDecision: "experimental_display_subdivision",
      parentRebuildMode: "not_parent_rebuild",
      adcode,
      sourceAdcode: adcode,
      name,
      sourceName: name,
      labelText: name,
      parentAdcode: "820000",
      displayParentAdcode: "820000",
      provinceAdcode: "820000",
      adminType: "display_subdivision",
      fallbackReason: "macau_datav_geoatlas_820000_full_display_subdivision",
      displaySubdivisionType,
      fallbackType: "displaySubdivision",
      experimental: true,
      productionApproved: false,
      topologyVersion: "g5-hkmo-fallback-v1",
      coordinateSystem: "GCJ-02",
      sourceCoordinateSystem: "WGS84",
    };

    const boundary = withLod(
      {
        type: "Feature",
        properties: {},
        geometry: transformGeometryToGcj02(feature.geometry),
      },
      "county_boundary",
      {
        ...commonProperties,
        level: "county",
        displayLevel: "county",
        sourceLevel: "datav_display_subdivision",
        fallbackRole: "none",
      },
    );
    assertMacauDisplaySubdivisionType(boundary.properties ?? {});
    boundaryFeatures.push(boundary);

    const labelPoint = getFeatureLabelPoint(feature);
    if (!labelPoint) continue;
    const label: LabelFeature = {
      type: "Feature",
      properties: {
        layer: "admin_label",
        ...commonProperties,
        level: "county",
        displayLevel: "county",
        sourceLevel: "datav_display_subdivision",
        fallbackRole: "none",
        labelRank: 30,
        labelLng: labelPoint[0],
        labelLat: labelPoint[1],
      },
      geometry: {
        type: "Point",
        coordinates: labelPoint,
      },
    };
    assertMacauDisplaySubdivisionType(label.properties);
    labelFeatures.push(label);
  }

  return {
    boundaryFeatures,
    labelFeatures,
    sourceFeatureCount: sourceFeatures.length,
    adcodes: sourceFeatures.map(getFeatureAdcode),
  };
}

function buildHierarchyFallbackSources(
  provinceBaseline: FeatureCollection,
  countyBaseline: FeatureCollection,
  phase: string,
  options: { macauDisplaySubdivisionCount?: number } = {},
): { rules: HierarchyFallbackRule[]; prefectureFeatures: GeoJsonFeature[]; countyFeatures: GeoJsonFeature[] } {
  const rules = buildHierarchyFallbackRules({
    provinces: readNormalizedRegions("province"),
    prefectures: readNormalizedRegions("prefecture"),
    counties: readNormalizedRegions("county"),
    macauDisplaySubdivisionCount: options.macauDisplaySubdivisionCount,
  });
  const prefectureFeatures: GeoJsonFeature[] = [];
  const countyFeatures: GeoJsonFeature[] = [];

  for (const rule of rules) {
    const source = rule.sourceLayer === "province_boundary" ? provinceBaseline : countyBaseline;
    const target = rule.targetLayer === "prefecture_boundary" ? prefectureFeatures : countyFeatures;
    target.push(...featuresForAdcode(source, rule.adcode).map((feature) =>
      buildHierarchyFallbackFeature(feature, rule, rule.targetLayer, phase),
    ));
  }

  return { rules, prefectureFeatures, countyFeatures };
}

function regionLabelPoint(region: NormalizedRegion): Position | null {
  const point = region.labelPoint ?? region.center;
  if (!point || !Number.isFinite(point.lng) || !Number.isFinite(point.lat)) return null;
  return [point.lng, point.lat];
}

function displayLabelText(region: NormalizedRegion): string {
  return region.name;
}

function toGcjLabelPoint(region: NormalizedRegion): Position | null {
  const point = regionLabelPoint(region);
  if (!point) return null;
  if (/^(81|82)\d{4}$/.test(region.adcode)) {
    return wgs84ToGcj02(point[0], point[1]);
  }
  return wgs84ToGcj02(point[0], point[1], {
    adcode: region.adcode,
    parentAdcode: region.parentAdcode,
  });
}

function buildLabelFeature(input: {
  region: NormalizedRegion;
  displayLevel: AdminLevel;
  sourceLevel: AdminLevel;
  fallbackRole: FallbackRole;
  labelRank: number;
  source: string;
  fallbackReason?: string;
  phase: string;
}): LabelFeature | null {
  const coordinates = toGcjLabelPoint(input.region);
  if (!coordinates) return null;

  return {
    type: "Feature",
    properties: {
      layer: "admin_label",
      adcode: input.region.adcode,
      name: input.region.name,
      labelText: displayLabelText(input.region),
      parentAdcode: input.region.parentAdcode ?? null,
      provinceAdcode: input.region.provinceAdcode ?? null,
      displayLevel: input.displayLevel,
      sourceLevel: input.sourceLevel,
      fallbackRole: input.fallbackRole,
      fallbackType: input.fallbackRole,
      displaySubdivisionType: displaySubdivisionTypeForFallbackRole(input.fallbackRole),
      labelRank: input.labelRank,
      labelLng: coordinates[0],
      labelLat: coordinates[1],
      adminType: input.region.adminType ?? null,
      source: input.source,
      experimental: false,
      fallbackReason: input.fallbackReason ?? null,
      topologyVersion: "g5-fallback-label-v1",
      coordinateSystem: "GCJ-02",
      sourceCoordinateSystem: "WGS84",
      phase: input.phase,
      productionApproved: false,
    },
    geometry: {
      type: "Point",
      coordinates,
    },
  };
}

export function buildAdminLabelFeatures(input: {
  provinces: NormalizedRegion[];
  prefectures: NormalizedRegion[];
  counties: NormalizedRegion[];
  fallbackRules: HierarchyFallbackRule[];
  phase?: string;
  extraLabels?: LabelFeature[];
}): LabelFeature[] {
  const phase = input.phase ?? "G5.0.2";
  const features: LabelFeature[] = [];
  const seen = new Set<string>();
  const add = (feature: LabelFeature | null) => {
    if (!feature) return;
    const key = [
      feature.properties.displayLevel,
      feature.properties.adcode,
      feature.properties.fallbackRole,
      feature.properties.sourceLevel,
    ].join(":");
    if (seen.has(key)) return;
    seen.add(key);
    features.push(feature);
  };

  for (const region of input.provinces.filter((region) => region.level === "province")) {
    add(buildLabelFeature({
      region,
      displayLevel: "province",
      sourceLevel: "province",
      fallbackRole: "none",
      labelRank: 10,
      source: "baseline_2025_label",
      phase,
    }));
  }

  for (const region of input.prefectures.filter((region) => region.level === "prefecture")) {
    add(buildLabelFeature({
      region,
      displayLevel: "prefecture",
      sourceLevel: "prefecture",
      fallbackRole: "none",
      labelRank: 20,
      source: "baseline_2025_label",
      phase,
    }));
  }

  for (const region of input.counties.filter((region) => region.level === "county")) {
    add(buildLabelFeature({
      region,
      displayLevel: "county",
      sourceLevel: "county",
      fallbackRole: "none",
      labelRank: 30,
      source: "baseline_2025_label",
      phase,
    }));
  }

  const provincesByAdcode = new Map(input.provinces.map((region) => [region.adcode, region]));
  const countiesByProvince = new Map<string, NormalizedRegion[]>();
  for (const region of input.counties) {
    const provinceAdcode = String(region.provinceAdcode ?? region.parentAdcode ?? "");
    if (!provinceAdcode) continue;
    const rows = countiesByProvince.get(provinceAdcode) ?? [];
    rows.push(region);
    countiesByProvince.set(provinceAdcode, rows);
  }

  for (const rule of input.fallbackRules) {
    if (rule.fallbackRole === "countyAsPrefecture") {
      for (const region of countiesByProvince.get(rule.adcode) ?? []) {
        add(buildLabelFeature({
          region,
          displayLevel: "prefecture",
          sourceLevel: "county",
          fallbackRole: "countyAsPrefecture",
          labelRank: 20,
          source: "baseline_2025_display_fallback_label",
          fallbackReason: rule.reason,
          phase,
        }));
      }
      continue;
    }

    const region = provincesByAdcode.get(rule.adcode);
    if (!region) continue;
    add(buildLabelFeature({
      region,
      displayLevel: rule.displayLevel,
      sourceLevel: rule.sourceLevel,
      fallbackRole: rule.fallbackRole,
      labelRank: rule.displayLevel === "prefecture" ? 20 : 30,
      source: "baseline_2025_display_fallback_label",
      fallbackReason: rule.reason,
      phase,
    }));
  }

  for (const label of input.extraLabels ?? []) {
    add(label);
  }

  return features;
}

function writeSource(path: string, collection: FeatureCollection): SourceLayerStats {
  writeJson(path, collection);
  return {
    name: collection.name as LayerName,
    path,
    featureCount: collection.features.length,
    vertexCount: countVertices(collection),
    sizeBytes: statSync(absolute(path)).size,
  };
}

function buildSources(g441: G441Manifest, g442: G442Manifest, mode: BuildMode) {
  const config = outputConfig(mode);
  const fallbackMode = mode !== "g5";
  const labelMode = mode === "fallback-label" || mode === "hkmo-fallback";
  const hkMoFallbackMode = mode === "hkmo-fallback";
  const countyParent = buildCountyParentMap();
  const gateRows = computeGateRows(g441, g442, countyParent);
  const enabledParents = new Set(gateRows.filter((row) => row.enabled).map((row) => row.prefectureAdcode));
  const fallbackParents = gateRows.filter((row) => !row.enabled).map((row) => row.prefectureAdcode);
  const derivedAll = parentDerivedFeatures(g442);
  const hierarchySpecialParents = new Set(["110000", "120000", "310000", "500000", "810000", "820000", "710000"]);
  const derivedEnabled = derivedAll.filter((feature) => {
    const adcode = String(properties(feature).leftAdcode ?? "");
    return enabledParents.has(adcode) && !(fallbackMode && hierarchySpecialParents.has(adcode));
  });
  const patchCountyEnabled = patchCountyFeatures(g442, enabledParents, countyParent);
  const debug = debugFeatures(g442);

  const provinceBaseline = readJson<FeatureCollection>(baselinePath("province"));
  const prefectureBaseline = readJson<FeatureCollection>(baselinePath("prefecture"));
  const countyBaseline = readJson<FeatureCollection>(baselinePath("county"));
  const macauDisplaySubdivisions = hkMoFallbackMode
    ? buildMacauDatavDisplaySubdivisionFeatures(config.phase)
    : { boundaryFeatures: [] as GeoJsonFeature[], labelFeatures: [] as LabelFeature[], sourceFeatureCount: 0, adcodes: [] as string[] };
  const hierarchyFallback = fallbackMode
    ? buildHierarchyFallbackSources(provinceBaseline, countyBaseline, config.phase, {
      macauDisplaySubdivisionCount: macauDisplaySubdivisions.boundaryFeatures.length,
    })
    : { rules: [] as HierarchyFallbackRule[], prefectureFeatures: [] as GeoJsonFeature[], countyFeatures: [] as GeoJsonFeature[] };

  const province = {
    type: "FeatureCollection" as const,
    name: "province_boundary",
    features: provinceBaseline.features.map((feature) => normalizeLayerFeature(feature, "province_boundary", "province", "province", "none", {
      phase: config.phase,
      source: "baseline_2025",
      sourceMix: "baseline",
      ruleDecision: "baseline",
    })),
  };
  const prefecture = {
    type: "FeatureCollection" as const,
    name: "prefecture_boundary",
    features: [
      ...prefectureBaseline.features
        .filter((feature) => !isFeatureForParent(feature, enabledParents))
        .map((feature) => normalizeLayerFeature(feature, "prefecture_boundary", "prefecture", "prefecture", "none", {
          phase: config.phase,
          source: "baseline_2025",
          sourceMix: "baseline_fallback",
          ruleDecision: "fallback_baseline",
          parentRebuildMode: "baseline",
        })),
      ...derivedEnabled.map((feature) => normalizeLayerFeature(feature, "prefecture_boundary", "prefecture", "prefecture", "none", {
        phase: config.phase,
        sourceMix: "datav_parent_derived_clean",
        ruleDecision: "enabled_parent_derived",
      })),
      ...hierarchyFallback.prefectureFeatures,
    ],
  };
  const county = {
    type: "FeatureCollection" as const,
    name: "county_boundary",
    features: [
      ...countyBaseline.features
        .filter((feature) => {
          const parent = parentForBoundaryFeature(feature, countyParent);
          return !parent || !enabledParents.has(parent) || (fallbackMode && hierarchySpecialParents.has(parent));
        })
        .map((feature) => normalizeLayerFeature(feature, "county_boundary", "county", "county", "none", {
          phase: config.phase,
          source: "baseline_2025",
          sourceMix: "baseline_fallback",
          ruleDecision: "fallback_baseline",
        })),
      ...patchCountyEnabled
        .filter((feature) => {
          const parent = parentForBoundaryFeature(feature, countyParent);
          return !(fallbackMode && parent && hierarchySpecialParents.has(parent));
        })
        .map((feature) => normalizeLayerFeature(feature, "county_boundary", "county", "county", "none", {
        phase: config.phase,
        sourceMix: "datav_patch_clean",
        ruleDecision: "enabled_patch_county",
      })),
      ...hierarchyFallback.countyFeatures,
      ...macauDisplaySubdivisions.boundaryFeatures,
    ],
  };
  const parentDerived = {
    type: "FeatureCollection" as const,
    name: "parent_derived_prefecture_boundary",
    features: derivedEnabled.map((feature) => normalizeLayerFeature(feature, "parent_derived_prefecture_boundary", "prefecture", "prefecture", "none", {
      phase: config.phase,
      sourceMix: "datav_parent_derived_clean",
      ruleDecision: "enabled_parent_derived",
    })),
  };
  const patchDebug = {
    type: "FeatureCollection" as const,
    name: "patch_debug_boundary",
    features: debug.map((feature) => normalizeLayerFeature(feature, "patch_debug_boundary", sourceLevelForLayer(String(properties(feature).layer ?? "prefecture_boundary") as "province_boundary" | "prefecture_boundary" | "county_boundary"), sourceLevelForLayer(String(properties(feature).layer ?? "prefecture_boundary") as "province_boundary" | "prefecture_boundary" | "county_boundary"), "none", {
      phase: config.phase,
      sourceMix: "datav_parent_derived_debug",
      ruleDecision: "debug_filtered_out",
    })),
  };
  const metadata = {
    type: "FeatureCollection" as const,
    name: "metadata",
    features: [{
      type: "Feature" as const,
      properties: {
        layer: "metadata",
        phase: config.phase,
        productionApproved: false,
        sourceMix: fallbackMode
          ? `baseline_2025 + datav_parent_derived_clean + datav_patch_clean + hierarchy_display_fallback${labelMode ? " + admin_label" : ""}`
          : "baseline_2025 + datav_parent_derived_clean + datav_patch_clean",
        enabledParents: Array.from(enabledParents).join(","),
        fallbackParents: fallbackParents.join(","),
        hierarchyFallbackAdcodes: hierarchyFallback.rules.map((rule) => `${rule.adcode}:${rule.fallbackRole}`).join(","),
        lodRule: "z3-z5 province; z6-z8 province+prefecture; z9-z12 prefecture+county; z13-z14 planned only",
      },
      geometry: { type: "Point", coordinates: [104, 35] },
    }],
  };
  const adminLabel = {
    type: "FeatureCollection" as const,
    name: "admin_label",
    features: labelMode
      ? buildAdminLabelFeatures({
        provinces: readNormalizedRegions("province"),
        prefectures: readNormalizedRegions("prefecture"),
        counties: readNormalizedRegions("county"),
        fallbackRules: hierarchyFallback.rules,
        phase: config.phase,
        extraLabels: macauDisplaySubdivisions.labelFeatures,
      })
      : [],
  };

  mkdirSync(absolute(config.outDir), { recursive: true });
  const sourceLayers = [
    writeSource(`${config.outDir}/province-boundary.geojson`, province),
    writeSource(`${config.outDir}/prefecture-boundary-effective.geojson`, prefecture),
    writeSource(`${config.outDir}/county-boundary-effective.geojson`, county),
    writeSource(`${config.outDir}/parent-derived-prefecture-boundary.geojson`, parentDerived),
    writeSource(`${config.outDir}/patch-debug-boundary.geojson`, patchDebug),
    ...(labelMode ? [writeSource(`${config.outDir}/admin-label.geojson`, adminLabel)] : []),
    writeSource(`${config.outDir}/metadata.geojson`, metadata),
  ];

  return {
    sourceLayers,
    gateRows,
    enabledParents: Array.from(enabledParents),
    fallbackParents,
    hierarchyFallbackRules: hierarchyFallback.rules,
    hierarchyFallbackFeatureCounts: {
      prefecture: hierarchyFallback.prefectureFeatures.length,
      county: hierarchyFallback.countyFeatures.length,
    },
    macauDisplaySubdivisionFeatureCounts: {
      source: macauDisplaySubdivisions.sourceFeatureCount,
      boundary: macauDisplaySubdivisions.boundaryFeatures.length,
      label: macauDisplaySubdivisions.labelFeatures.length,
      adcodes: macauDisplaySubdivisions.adcodes,
    },
  };
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

function buildTippecanoeCommand(sourceLayers: SourceLayerStats[], mode: BuildMode): string[] {
  const config = outputConfig(mode);
  const layer = (name: LayerName) => {
    const found = sourceLayers.find((item) => item.name === name);
    if (!found) throw new Error(`Missing source layer ${name}`);
    return found;
  };
  return [
    "tippecanoe",
    "--force",
    "--minimum-zoom=3",
    "--maximum-zoom=12",
    "--no-feature-limit",
    "--no-tile-size-limit",
    "--drop-rate=1",
    "--extend-zooms-if-still-dropping",
    `--name=${config.pmtilesName}`,
    `--description=${config.pmtilesDescription}`,
    ...TILE_ATTRIBUTE_INCLUDES.map((attribute) => `--include=${attribute}`),
    "-o",
    config.outMbtiles,
    "-L",
    `${layer("province_boundary").name}:${layer("province_boundary").path}`,
    "-L",
    `${layer("prefecture_boundary").name}:${layer("prefecture_boundary").path}`,
    "-L",
    `${layer("county_boundary").name}:${layer("county_boundary").path}`,
    "-L",
    `${layer("parent_derived_prefecture_boundary").name}:${layer("parent_derived_prefecture_boundary").path}`,
    "-L",
    `${layer("patch_debug_boundary").name}:${layer("patch_debug_boundary").path}`,
    ...(mode === "fallback-label" || mode === "hkmo-fallback"
      ? [
        "-L",
        `${layer("admin_label").name}:${layer("admin_label").path}`,
      ]
      : []),
    "-L",
    `${layer("metadata").name}:${layer("metadata").path}`,
  ];
}

function buildPmtilesCommand(mode: BuildMode): string[] {
  const config = outputConfig(mode);
  return ["pmtiles", "convert", config.outMbtiles, config.outPmtiles];
}

class LocalPmtilesSource {
  private readonly path: string;

  constructor(path: string) {
    this.path = path;
  }

  getKey(): string {
    return this.path;
  }

  async getBytes(offset: number, length: number): Promise<{ data: ArrayBuffer }> {
    const file = await open(absolute(this.path), "r");
    try {
      const buffer = Buffer.alloc(length);
      await file.read(buffer, 0, length, offset);
      return {
        data: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
      };
    } finally {
      await file.close();
    }
  }
}

async function auditVectorTile(input: {
  pmtilesPath: string;
  subject: string;
  adcode: string;
  z: number;
  x: number;
  y: number;
  layer: string;
  expectedDisplayLevel?: AdminLevel;
  expectedFallbackRole?: FallbackRole;
  expectedDisplaySubdivisionType?: DisplaySubdivisionType;
}): Promise<TileAuditRecord> {
  if (!existsSync(absolute(input.pmtilesPath))) {
    return {
      subject: input.subject,
      adcode: input.adcode,
      z: input.z,
      x: input.x,
      y: input.y,
      layer: input.layer,
      expectedDisplayLevel: input.expectedDisplayLevel,
      expectedFallbackRole: input.expectedFallbackRole,
      expectedDisplaySubdivisionType: input.expectedDisplaySubdivisionType,
      featureCount: 0,
      matchingCount: 0,
      pmtilesTileBytes: 0,
      sampleProperties: null,
      passed: false,
    };
  }

  const pmtiles = new PMTiles(new LocalPmtilesSource(input.pmtilesPath));
  const tile = await pmtiles.getZxy(input.z, input.x, input.y);
  if (!tile) {
    return {
      subject: input.subject,
      adcode: input.adcode,
      z: input.z,
      x: input.x,
      y: input.y,
      layer: input.layer,
      expectedDisplayLevel: input.expectedDisplayLevel,
      expectedFallbackRole: input.expectedFallbackRole,
      expectedDisplaySubdivisionType: input.expectedDisplaySubdivisionType,
      featureCount: 0,
      matchingCount: 0,
      pmtilesTileBytes: 0,
      sampleProperties: null,
      passed: false,
    };
  }

  const vectorTile = new VectorTile(new PbfReader(new Uint8Array(tile.data)));
  const layer = vectorTile.layers[input.layer];
  if (!layer) {
    return {
      subject: input.subject,
      adcode: input.adcode,
      z: input.z,
      x: input.x,
      y: input.y,
      layer: input.layer,
      expectedDisplayLevel: input.expectedDisplayLevel,
      expectedFallbackRole: input.expectedFallbackRole,
      expectedDisplaySubdivisionType: input.expectedDisplaySubdivisionType,
      featureCount: 0,
      matchingCount: 0,
      pmtilesTileBytes: tile.data.byteLength,
      sampleProperties: null,
      passed: false,
    };
  }

  let matchingCount = 0;
  let sampleProperties: Record<string, unknown> | null = null;
  for (let index = 0; index < layer.length; index += 1) {
    const feature = layer.feature(index);
    const props = feature.properties;
    const adcodeMatches = [props.adcode, props.leftAdcode, props.rightAdcode, props.parentAdcode]
      .filter((value) => value !== undefined && value !== null)
      .map(String)
      .includes(input.adcode);
    const displayLevelMatches = !input.expectedDisplayLevel || props.displayLevel === input.expectedDisplayLevel;
    const fallbackRoleMatches = !input.expectedFallbackRole || props.fallbackRole === input.expectedFallbackRole;
    const displaySubdivisionTypeMatches = !input.expectedDisplaySubdivisionType || props.displaySubdivisionType === input.expectedDisplaySubdivisionType;
    if (adcodeMatches && displayLevelMatches && fallbackRoleMatches && displaySubdivisionTypeMatches) {
      matchingCount += 1;
      sampleProperties ??= { ...props };
    }
  }

  return {
    subject: input.subject,
    adcode: input.adcode,
    z: input.z,
    x: input.x,
    y: input.y,
    layer: input.layer,
    expectedDisplayLevel: input.expectedDisplayLevel,
    expectedFallbackRole: input.expectedFallbackRole,
    expectedDisplaySubdivisionType: input.expectedDisplaySubdivisionType,
    featureCount: layer.length,
    matchingCount,
    pmtilesTileBytes: tile.data.byteLength,
    sampleProperties,
    passed: matchingCount > 0,
  };
}

async function auditFallbackPmtiles(pmtilesPath: string, mode: BuildMode): Promise<TileAuditRecord[]> {
  const checks: Array<Omit<Parameters<typeof auditVectorTile>[0], "pmtilesPath">> = [
    { subject: "Hong Kong prefecture fallback boundary", adcode: "810000", z: 8, x: 209, y: 111, layer: "prefecture_boundary", expectedDisplayLevel: "prefecture" as const, expectedFallbackRole: "selfAsPrefecture" as const },
    { subject: "Macau prefecture fallback boundary", adcode: "820000", z: 8, x: 208, y: 111, layer: "prefecture_boundary", expectedDisplayLevel: "prefecture" as const, expectedFallbackRole: "selfAsPrefecture" as const },
    { subject: "Beijing prefecture fallback boundary", adcode: "110000", z: 8, x: 210, y: 97, layer: "prefecture_boundary", expectedDisplayLevel: "prefecture" as const, expectedFallbackRole: "selfAsPrefecture" as const },
    { subject: "Shanghai prefecture fallback boundary", adcode: "310000", z: 8, x: 214, y: 104, layer: "prefecture_boundary", expectedDisplayLevel: "prefecture" as const, expectedFallbackRole: "selfAsPrefecture" as const },
    { subject: "Tianjin prefecture fallback boundary", adcode: "120000", z: 8, x: 211, y: 97, layer: "prefecture_boundary", expectedDisplayLevel: "prefecture" as const, expectedFallbackRole: "selfAsPrefecture" as const },
    { subject: "Chongqing prefecture fallback boundary", adcode: "500000", z: 8, x: 203, y: 105, layer: "prefecture_boundary", expectedDisplayLevel: "prefecture" as const, expectedFallbackRole: "selfAsPrefecture" as const },
  ];

  if (mode === "hkmo-fallback") {
    checks.push(
      { subject: "Hong Kong prefecture fallback label", adcode: "810000", z: 8, x: 209, y: 111, layer: "admin_label", expectedDisplayLevel: "prefecture" as const, expectedFallbackRole: "selfAsPrefecture" as const },
      { subject: "Macau prefecture fallback label", adcode: "820000", z: 8, x: 208, y: 111, layer: "admin_label", expectedDisplayLevel: "prefecture" as const, expectedFallbackRole: "selfAsPrefecture" as const },
      { subject: "Macau DataV parish boundary", adcode: "820001", z: 10, x: 834, y: 447, layer: "county_boundary", expectedDisplayLevel: "county" as const, expectedDisplaySubdivisionType: "parish" as const },
      { subject: "Macau DataV reclaimed display boundary", adcode: "820007", z: 10, x: 834, y: 447, layer: "county_boundary", expectedDisplayLevel: "county" as const, expectedDisplaySubdivisionType: "reclaimed_or_display_subdivision" as const },
      { subject: "Macau DataV parish label", adcode: "820008", z: 10, x: 834, y: 447, layer: "admin_label", expectedDisplayLevel: "county" as const, expectedDisplaySubdivisionType: "parish" as const },
    );
  } else {
    checks.push(
      { subject: "Macau county fallback boundary", adcode: "820000", z: 10, x: 834, y: 447, layer: "county_boundary", expectedDisplayLevel: "county" as const, expectedFallbackRole: "selfAsCounty" as const },
    );
  }

  return Promise.all(checks.map((check) => auditVectorTile({ pmtilesPath, ...check })));
}

function renderDoc(report: Record<string, unknown>): string {
  const mode: BuildMode = report.phase === "G5.0.8"
    ? "hkmo-fallback"
    : report.phase === "G5.0.2"
    ? "fallback-label"
    : report.phase === "G5.0.1"
      ? "fallback"
      : "g5";
  const fallbackMode = mode !== "g5";
  const labelMode = mode === "fallback-label" || mode === "hkmo-fallback";
  const hkMoFallbackMode = mode === "hkmo-fallback";
  const config = outputConfig(mode);
  const sourceRows = (report.sourceLayers as SourceLayerStats[]).map((layer) =>
    `| ${layer.name} | ${layer.featureCount} | ${layer.vertexCount} | ${layer.sizeBytes} |`,
  ).join("\n");
  const gateRows = (report.parentGates as ParentGate[]).map((gate) =>
    `| ${gate.name} | ${gate.prefectureAdcode} | ${gate.decision} | ${gate.coverageRatio} | ${gate.crossingCandidates} | ${gate.parentChildSharedRatio} | ${gate.reasons.join(", ") || "pass"} |`,
  ).join("\n");
  const outputs = report.outputs as Record<string, { path: string; sizeBytes: number | null }>;
  const hierarchyFallbackRules = (report.hierarchyFallbackRules as HierarchyFallbackRule[] | undefined) ?? [];
  const fallbackRows = hierarchyFallbackRules.length
    ? hierarchyFallbackRules.map((rule) =>
      `| ${rule.name} | ${rule.adcode} | ${rule.sourceLevel} | ${rule.displayLevel} | ${rule.fallbackRole} | ${rule.childCount} | ${rule.reason} |`,
    ).join("\n")
    : "| none | - | - | - | - | - | - |";
  const tileAudit = ((report.g501TileAudit as TileAuditRecord[] | undefined) ?? []);
  const tileAuditRows = tileAudit.length
    ? (tileAudit.map((row) =>
      `| ${row.subject} | ${row.adcode} | z${row.z}/${row.x}/${row.y} | ${row.layer} | ${row.matchingCount} | ${row.pmtilesTileBytes} | ${row.passed ? "pass" : "fail"} |`,
    ).join("\n"))
    : "| not run | - | - | - | - | - | - |";
  const macauCounts = (report.macauDisplaySubdivisionFeatureCounts as Record<string, unknown> | undefined) ?? {};
  const title = hkMoFallbackMode
    ? "Wanderly v2.0 Admin China Multilayer PMTiles G5.0.8 HK/MO Fallback"
    : labelMode
    ? "Wanderly v2.0 Admin China Multilayer PMTiles G5.0.2 Fallback Label"
    : fallbackMode
      ? "Wanderly v2.0 Admin China Multilayer PMTiles G5.0.1 Fallback"
      : "Wanderly v2.0 Admin China Multilayer PMTiles G5";

  return `# ${title}

Generated at: ${report.generatedAt}

## Scope

This is an experimental nationwide multilayer PMTiles build${fallbackMode ? " with special admin hierarchy display fallback" : ""}${labelMode ? " and a Wanderly-owned admin label point layer" : ""}. It does not replace production PMTiles, does not change Map Studio defaults, does not write Supabase, does not upload OSS, and does not download new data.

${hkMoFallbackMode ? `## G5.0.8 Contract

G5.0.8 deliberately returns to a single PMTiles path. It does not use \`hk_mo_special_admin_source\`, \`hk_mo_special_admin_boundary\`, \`hk_mo_special_admin_label\`, Macau runtime GeoJSON, a second MapLibre map, or a second overlay canvas.

- 香港 810000: \`selfAsPrefecture\` boundary and full \`香港特别行政区\` label are written into \`prefecture_boundary\` and \`admin_label\`.
- 香港 county view: real 18 county/district records remain the county source; no \`selfAsCounty\` fallback is generated for Hong Kong.
- 澳门 820000: \`selfAsPrefecture\` boundary and full \`澳门特别行政区\` label are written into \`prefecture_boundary\` and \`admin_label\`.
- 澳门 county view: DataV/GeoAtlas 820000_full provides 8 display subdivisions, so G5.0.8 does not generate \`820000 selfAsCounty\` in this experimental output.
- 澳门下级: the 8 features are marked \`displayLevel=county\`, \`source=datav_geoatlas\`, \`productionApproved=false\`, \`experimental=true\`, and \`displaySubdivisionType=parish\` except \`820007 路凼填海区\`, which is \`reclaimed_or_display_subdivision\`.

Macau display subdivision counts:

- source features: ${macauCounts.source ?? 0}
- county boundary features: ${macauCounts.boundary ?? 0}
- admin label features: ${macauCounts.label ?? 0}
- adcodes: ${Array.isArray(macauCounts.adcodes) ? macauCounts.adcodes.join(", ") : "-"}

This output is suitable for manual experimental Map Studio validation only. It is not production-approved because DataV/GeoAtlas licensing and nationwide visual QA are still unresolved.
` : ""}

${labelMode ? `## G5.0.1 Acceptance Failure Diagnosis

G5.0.1 did write Hong Kong / Macau / municipality fallback boundary features into the PMTiles, but Map Studio still relied on boundary-only rendering and did not own an administrative label source. The practical failure mode was:

- fallback boundary features carry \`sourceLevel=province\` and \`displayLevel=prefecture\`;
- a style path that filters by \`level\` or \`sourceLevel\` can hide these prefecture-display fallbacks;
- visible names such as 深圳市 / 中山市 / 珠海市 came from the base map label layer, not from Wanderly PMTiles;
- Hong Kong / Macau therefore had no reliable Wanderly-owned prefecture labels even when the fallback boundary was present.

G5.0.2 fixes this by rendering boundary display using \`displayLevel\` and adding a new \`admin_label\` vector layer.
` : ""}

## Output

- Source directory: \`${config.outDir}/\`
- PMTiles: \`${config.outPmtiles}\`
- Manifest: \`${config.outJson}\`
- Current single China PMTiles size: ${outputs.currentChinaPmtiles.sizeBytes} bytes
- ${config.outputLabel} PMTiles size: ${outputs.pmtiles.sizeBytes} bytes

## Layers

| layer | feature count | vertex count | sizeBytes |
| --- | ---: | ---: | ---: |
${sourceRows}

${labelMode ? `## Tile Content Audit

This audit decodes real vector tiles from \`${config.outPmtiles}\`; it is not based only on build-time source statistics.

| subject | adcode | tile | layer | matching features | tile bytes | status |
| --- | --- | --- | --- | ---: | ---: | --- |
${tileAuditRows}

Conclusion: fallback boundary content exists in G5.0.1 PMTiles; the remaining failure is display/filter/label coverage, not missing source generation.
` : ""}

## Parent-Derived Gate

| parent | adcode | decision | coverage | crossings | shared ratio | reason |
| --- | --- | --- | ---: | ---: | ---: | --- |
${gateRows}

${fallbackMode ? `## Hierarchy Display Fallback

These rows are display fallbacks only. They are not new administrative records and must not be interpreted as real prefecture/county entities.

| name | adcode | sourceLevel | displayLevel | fallbackRole | childCount | reason |
| --- | --- | --- | --- | --- | ---: | --- |
${fallbackRows}

## Special Region Behavior

- 香港 810000: province view uses the province boundary; prefecture view uses the same body boundary as \`selfAsPrefecture\`; county view uses real county/district children because they exist.
- 澳门 820000: province view uses the province boundary; prefecture view uses \`selfAsPrefecture\`; county view uses \`selfAsCounty\` because current normalized data has no county children.
- 北京 110000 / 天津 120000 / 上海 310000 / 重庆 500000: province view uses the municipality boundary; prefecture view uses \`selfAsPrefecture\`; county view uses real district/county children.
- 台湾 710000: province view uses Taiwan boundary; prefecture view uses current county-level city/county boundaries as \`countyAsPrefecture\`; county view uses the same available county layer.
- 普通省份: province/prefecture/county views still follow real children. 广东 remains on real prefecture children; 深圳、珠海、中山、东莞周边 are not converted to self fallback.
` : ""}

${labelMode ? `## Admin Label Layer

G5.0.2 adds one vector source layer:

- \`admin_label\`: point features for province / prefecture / county display levels.

Runtime style layers:

- \`admin-pmtiles-province-label\`: z3-z5, \`displayLevel=province\`.
- \`admin-pmtiles-prefecture-label\`: z6-z8, \`displayLevel=prefecture\`, including Hong Kong / Macau / municipalities fallback labels.
- \`admin-pmtiles-county-label\`: z9-z12, \`displayLevel=county\`, including \`selfAsCounty\` fallback where no county children exist.

Label points are stored as GCJ-02 coordinates for the PMTiles display path. Hong Kong / Macau prefecture labels use the full names \`香港特别行政区\` and \`澳门特别行政区\`.

## Hong Kong / Macau / Municipality Display Contract

| area | province view | prefecture view | county view |
| --- | --- | --- | --- |
| 香港 810000 | self boundary + province label | self boundary \`selfAsPrefecture\` + 香港特别行政区 label | real district/county children + county labels |
| 澳门 820000 | self boundary + province label | self boundary \`selfAsPrefecture\` + 澳门特别行政区 label | ${hkMoFallbackMode ? "DataV 8 display subdivisions + county labels; no selfAsCounty in this experimental output" : "self boundary `selfAsCounty` + 澳门特别行政区 label because no county children exist"} |
| 北京/天津/上海/重庆 | municipality boundary + province label | self boundary \`selfAsPrefecture\` + municipality label | real district/county children + county labels |
| 普通省份 | province boundary + province label | real prefecture children + prefecture labels | real county children + county labels |

Fallback features are display fallbacks only; they are not new administrative rows and must not be stored back as real prefecture/county data.
` : ""}

## LOD Rules

- z3-z5: province boundary.
- z6-z8: province + prefecture boundary.
- z9-z12: prefecture + county boundary.
- z13-z14: planned for high-precision county/coastal patch, not built in G5.

The G5 PMTiles stores LOD metadata on features and in the manifest. Runtime styling should use these fields for experimental rendering; Map Studio defaults were not changed in this phase.

## Answers

- 哪些区域启用了 parent-derived：${(report.parentDerivedEnabledParents as string[]).join(", ")}
- 哪些区域 fallback baseline：${(report.parentDerivedFallbackParents as string[]).join(", ")}
- 多层瓦片相比现有全国 PMTiles 的变化：G5 separates effective baseline layers, gated parent-derived prefecture layer, patch debug layer, and metadata. Prefecture/county layers use DataV patch only where gates pass; all other parents remain baseline fallback.
- 特殊行政层级 fallback：${fallbackMode ? "enabled; fallback features are explicitly marked with displayLevel, sourceLevel, fallbackRole, adcode, name, parentAdcode, source, and topologyVersion." : "not enabled in this output."}
- 行政地名 label layer：${labelMode ? "enabled via admin_label and MapLibre symbol layers; no longer relies on base map labels." : "not enabled in this output."}
- 澳门 DataV 8 下级：${hkMoFallbackMode ? "included as experimental displaySubdivision features inside PMTiles; not normalized county records and not production-approved." : "not included in this output."}
- 是否恢复 runtime 港澳层：No. G5.0.8 keeps one MapLibre vector source and writes the fallback content into PMTiles.
- 是否适合进入 Map Studio experimental flag 验收：适合。Use the URL below under an experimental PMTiles flag only.
- 是否仍需要 coastline patch：需要。Parent-derived improves parent-child consistency, but coastal land/water correctness still needs coastline/land-water patch before production.
- 是否可以作为后续生产候选：可以作为生产候选 pipeline 的工程基础，但 not production-approved until source licensing, coastline patch, and nationwide visual QA are resolved.

## G5.1 Upload Plan

If manual acceptance passes, upload in G5.1 only:

- public OSS path: \`${config.publicOssPath}\`
- object ACL: \`public-read\`

No OSS upload was performed in ${config.phase}.

## Manual Acceptance URL

\`\`\`env
NEXT_PUBLIC_MAP_STUDIO_ADMIN_PMTILES_OVERLAY=1
NEXT_PUBLIC_MAP_STUDIO_ADMIN_PMTILES_ONLY=1
NEXT_PUBLIC_MAP_STUDIO_ADMIN_PMTILES_URL=${config.acceptanceUrl}
\`\`\`
`;
}

async function main(): Promise<void> {
  const execute = process.argv.includes("--execute");
  const mode: BuildMode = process.argv.includes("--hkmo-fallback")
    ? "hkmo-fallback"
    : process.argv.includes("--fallback-label")
    ? "fallback-label"
    : process.argv.includes("--fallback")
      ? "fallback"
      : "g5";
  const fallbackMode = mode !== "g5";
  const labelMode = mode === "fallback-label" || mode === "hkmo-fallback";
  const config = outputConfig(mode);
  const g441 = readJson<G441Manifest>(G441_MANIFEST);
  const g442 = readJson<G442Manifest>(G442_MANIFEST);
  const { sourceLayers, gateRows, enabledParents, fallbackParents, hierarchyFallbackRules, hierarchyFallbackFeatureCounts, macauDisplaySubdivisionFeatureCounts } = buildSources(g441, g442, mode);
  const tippecanoe = findToolWithWslFallback("tippecanoe");
  const pmtiles = findToolWithWslFallback("pmtiles");
  const tippecanoeCommand = buildTippecanoeCommand(sourceLayers, mode);
  const pmtilesCommand = buildPmtilesCommand(mode);

  if (execute) {
    if (!tippecanoe.available || !pmtiles.available || !tippecanoe.runner || !pmtiles.runner) {
      throw new Error("tippecanoe and pmtiles CLI are required for --execute.");
    }
    if (tippecanoe.runner !== pmtiles.runner) {
      throw new Error("tippecanoe and pmtiles were found in different environments.");
    }
    mkdirSync(dirname(absolute(config.outMbtiles)), { recursive: true });
    mkdirSync(dirname(absolute(config.outPmtiles)), { recursive: true });
    executeCommand(tippecanoeCommand, tippecanoe.runner);
    executeCommand(pmtilesCommand, pmtiles.runner);
  }
  const g501TileAudit = labelMode ? await auditG501FallbackPmtiles() : [];

  const report = {
    phase: config.phase,
    mode,
    generatedAt: new Date().toISOString(),
    dryRun: !execute,
    productionApproved: false,
    sourceMix: {
      baselineSource: BASELINE_DIR,
      patchSource: g442.sourceLayers.map((layer) => ({ name: layer.name, cleanPath: layer.cleanPath, debugPath: layer.debugPath })),
      sourcePolicy: fallbackMode
        ? "baseline nationwide, DataV parent-derived/county patch only when gates pass, hierarchy display fallback for special admin units, baseline fallback otherwise."
        : "baseline nationwide, DataV parent-derived/county patch only when gates pass, baseline fallback otherwise.",
      labelPolicy: labelMode
        ? "admin_label stores GCJ-02 display label points by displayLevel; fallback labels are display-only and do not create real admin records."
        : "not built in this mode.",
    },
    gateThresholds: GATE_THRESHOLDS,
    lodRules: LOD_RULES,
    parentGates: gateRows,
    parentDerivedEnabledParents: enabledParents,
    parentDerivedFallbackParents: fallbackParents,
    hierarchyFallbackRules,
    hierarchyFallbackFeatureCounts,
    macauDisplaySubdivisionFeatureCounts,
    g501TileAudit,
    sourceLayers,
    outputs: {
      sourceDir: { path: config.outDir, sizeBytes: null },
      mbtiles: {
        path: config.outMbtiles,
        exists: existsSync(absolute(config.outMbtiles)),
        sizeBytes: existsSync(absolute(config.outMbtiles)) ? statSync(absolute(config.outMbtiles)).size : null,
        sha256: sha256(config.outMbtiles),
      },
      pmtiles: {
        path: config.outPmtiles,
        exists: existsSync(absolute(config.outPmtiles)),
        sizeBytes: existsSync(absolute(config.outPmtiles)) ? statSync(absolute(config.outPmtiles)).size : null,
        sha256: sha256(config.outPmtiles),
      },
      currentChinaPmtiles: {
        path: CURRENT_CHINA_PMTILES,
        exists: existsSync(absolute(CURRENT_CHINA_PMTILES)),
        sizeBytes: existsSync(absolute(CURRENT_CHINA_PMTILES)) ? statSync(absolute(CURRENT_CHINA_PMTILES)).size : null,
        sha256: sha256(CURRENT_CHINA_PMTILES),
      },
    },
    knownLimitations: [
      "DataV and current baseline remain productionApproved=false and licenseRisk=high.",
      "LOD is recorded as metadata/feature attributes; Map Studio default runtime was not changed in G5.",
      "Coastline/land-water patch is still required before production use.",
      "G5 does not build z13-z14 high precision coastal tiles; those are planned only.",
      "Gate thresholds are empirical and must be hardened with nationwide visual QA.",
      ...(fallbackMode ? ["Hierarchy fallback is display-only and must not be treated as real prefecture/county source data."] : []),
      ...(labelMode ? ["admin_label is an experimental display layer and must be checked visually before public OSS release."] : []),
    ],
    g51UploadPlan: {
      uploadNow: false,
      publicOssPath: config.publicOssPath,
      objectAcl: "public-read",
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
      NEXT_PUBLIC_MAP_STUDIO_ADMIN_PMTILES_URL: config.acceptanceUrl,
    },
  };

  writeJson(`${config.outDir}/manifest.json`, report);
  writeJson(config.outJson, report);
  writeText(config.outDoc, renderDoc(report));
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
