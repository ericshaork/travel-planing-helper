import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { wgs84ToGcj02 } from "../src/lib/map/coordinateTransform.ts";

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

type Position = [number, number];

const SOURCE_BOUNDARY_PATH =
  "temp/admin-tile-prototype/china-multilayer-g5-fallback-label/province-boundary.geojson";
const SOURCE_LABEL_PATH =
  "temp/admin-tile-prototype/china-multilayer-g5-fallback-label/admin-label.geojson";
const OUT_PATH =
  "public/admin-tiles/experimental/hk-mo-special-admin-gcj02.geojson";

const SPECIAL_ADMIN_NAMES: Record<string, string> = {
  "810000": "香港特别行政区",
  "820000": "澳门特别行政区",
};

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function specialAdminAdcode(feature: GeoJsonFeature) {
  const props = feature.properties ?? {};
  const adcode = String(props.adcode ?? props.leftAdcode ?? props.rightAdcode ?? "");

  return SPECIAL_ADMIN_NAMES[adcode] ? adcode : null;
}

function buildBoundaryFeature(feature: GeoJsonFeature, adcode: string): GeoJsonFeature {
  const props = feature.properties ?? {};

  return {
    type: "Feature",
    properties: {
      layer: "hk_mo_special_admin_boundary",
      adcode,
      name: SPECIAL_ADMIN_NAMES[adcode],
      labelText: SPECIAL_ADMIN_NAMES[adcode],
      displayLevel: "prefecture",
      sourceLevel: "province",
      fallbackRole: "selfAsPrefecture",
      displaySubdivisionType: "fallbackSelf",
      source: "baseline_2025_runtime_special_admin",
      coordinateSystem: "GCJ-02-preoffset",
      sourceCoordinateSystem: String(props.sourceCoordinateSystem ?? "WGS84"),
      coordinateTransform: "inherited_from_china_gcj02_source",
      productionApproved: false,
    },
    geometry: feature.geometry ?? null,
  };
}

function isPosition(value: unknown): value is Position {
  return (
    Array.isArray(value) &&
    typeof value[0] === "number" &&
    typeof value[1] === "number" &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  );
}

function transformPointGeometryToGcj02(geometry: GeoJsonGeometry | null | undefined): GeoJsonGeometry | null {
  if (!geometry || geometry.type !== "Point" || !isPosition(geometry.coordinates)) {
    return geometry ?? null;
  }

  return {
    ...geometry,
    coordinates: wgs84ToGcj02(geometry.coordinates[0], geometry.coordinates[1]),
  };
}

function buildLabelFeature(feature: GeoJsonFeature, adcode: string): GeoJsonFeature {
  return {
    type: "Feature",
    properties: {
      layer: "hk_mo_special_admin_label",
      adcode,
      name: SPECIAL_ADMIN_NAMES[adcode],
      labelText: SPECIAL_ADMIN_NAMES[adcode],
      displayLevel: "prefecture",
      sourceLevel: "province",
      fallbackRole: "selfAsPrefecture",
      displaySubdivisionType: "fallbackSelf",
      source: "baseline_2025_runtime_special_admin_label",
      coordinateSystem: "GCJ-02-preoffset",
      sourceCoordinateSystem: "WGS84",
      coordinateTransform: "wgs84ToGcj02_for_amap_runtime_without_special_region_skip",
      productionApproved: false,
    },
    geometry: transformPointGeometryToGcj02(feature.geometry),
  };
}

export function buildHkMoSpecialAdminRuntimeGeojson() {
  const boundarySource = readJson<FeatureCollection>(SOURCE_BOUNDARY_PATH);
  const labelSource = readJson<FeatureCollection>(SOURCE_LABEL_PATH);
  const labelByAdcode = new Map(
    labelSource.features
      .filter((feature) => {
        const props = feature.properties ?? {};
        const adcode = String(props.adcode ?? "");
        return SPECIAL_ADMIN_NAMES[adcode] && props.displayLevel === "prefecture";
      })
      .map((feature) => [String(feature.properties?.adcode), feature]),
  );

  const features: GeoJsonFeature[] = [];
  for (const feature of boundarySource.features) {
    const adcode = specialAdminAdcode(feature);
    if (!adcode) continue;
    features.push(buildBoundaryFeature(feature, adcode));
  }

  for (const adcode of Object.keys(SPECIAL_ADMIN_NAMES)) {
    const feature = labelByAdcode.get(adcode);
    if (!feature) {
      throw new Error(`Missing special admin label source feature: ${adcode}`);
    }
    features.push(buildLabelFeature(feature, adcode));
  }

  return {
    type: "FeatureCollection" as const,
    name: "hk_mo_special_admin_gcj02",
    properties: {
      generatedFor: "Wanderly v2.0 G5.0.5 runtime special admin overlay",
      source: `${SOURCE_BOUNDARY_PATH} + ${SOURCE_LABEL_PATH}`,
      coordinateSystem: "GCJ-02-preoffset",
      sourceCoordinateSystem: "WGS84",
      boundaryCoordinateTransform: "inherited_from_china_gcj02_source",
      labelCoordinateTransform: "wgs84ToGcj02_for_amap_runtime_without_special_region_skip",
      productionApproved: false,
    },
    features,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const collection = buildHkMoSpecialAdminRuntimeGeojson();
  mkdirSync("public/admin-tiles/experimental", { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(collection));
  console.log(JSON.stringify({
    outPath: OUT_PATH,
    features: collection.features.length,
    boundaryFeatures: collection.features.filter((feature) =>
      feature.properties?.layer === "hk_mo_special_admin_boundary").length,
    labelFeatures: collection.features.filter((feature) =>
      feature.properties?.layer === "hk_mo_special_admin_label").length,
    bytes: statSync(OUT_PATH).size,
  }, null, 2));
}
