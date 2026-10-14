import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

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
  features: GeoJsonFeature[];
};

type DisplaySubdivisionType = "parish" | "reclaimed_or_display_subdivision";

const SOURCE_PATH = resolve(
  "temp/admin-source-comparison-g2/datav/zhuhai-macau-hengqin-820000.geojson",
);
const OUTPUT_PATH = resolve(
  "public/admin-tiles/experimental/macau-datav-display-subdivisions-gcj02.geojson",
);
const EXPECTED_ADCODES = [
  "820001",
  "820002",
  "820003",
  "820004",
  "820005",
  "820006",
  "820007",
  "820008",
] as const;

function readFeatureCollection(path: string): FeatureCollection {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as FeatureCollection;

  if (parsed.type !== "FeatureCollection" || !Array.isArray(parsed.features)) {
    throw new Error(`Expected FeatureCollection at ${path}`);
  }

  return parsed;
}

function getAdcode(feature: GeoJsonFeature) {
  return String(feature.properties?.adcode ?? "");
}

function getName(feature: GeoJsonFeature) {
  const name = feature.properties?.name;

  if (typeof name !== "string" || name.trim() === "") {
    throw new Error(`Missing Macau DataV subdivision name for ${getAdcode(feature)}`);
  }

  return name;
}

function getLabelPoint(feature: GeoJsonFeature): [number, number] {
  const centroid = feature.properties?.centroid;
  const center = feature.properties?.center;
  const point = Array.isArray(centroid) ? centroid : center;

  if (
    !Array.isArray(point) ||
    point.length < 2 ||
    !Number.isFinite(Number(point[0])) ||
    !Number.isFinite(Number(point[1]))
  ) {
    throw new Error(`Missing Macau DataV label point for ${getAdcode(feature)}`);
  }

  return [Number(point[0]), Number(point[1])];
}

function displaySubdivisionTypeFor(feature: GeoJsonFeature): DisplaySubdivisionType {
  return getAdcode(feature) === "820007"
    ? "reclaimed_or_display_subdivision"
    : "parish";
}

function buildProperties(feature: GeoJsonFeature, layer: string) {
  const adcode = getAdcode(feature);
  const name = getName(feature);

  return {
    layer,
    adcode,
    name,
    labelText: name,
    parentAdcode: "820000",
    displayParentAdcode: "820000",
    displayLevel: "county",
    sourceLevel: "datav_district",
    source: "datav_geoatlas",
    productionApproved: false,
    displaySubdivisionType: displaySubdivisionTypeFor(feature),
    sourceAdcode: adcode,
    sourceName: name,
  };
}

function buildRuntimeFeatureCollection(source: FeatureCollection): FeatureCollection {
  const features = source.features
    .filter((feature) => EXPECTED_ADCODES.includes(getAdcode(feature) as (typeof EXPECTED_ADCODES)[number]))
    .sort((a, b) => getAdcode(a).localeCompare(getAdcode(b)));
  const adcodes = features.map(getAdcode);

  if (features.length !== EXPECTED_ADCODES.length) {
    throw new Error(`Expected 8 Macau DataV subdivisions, got ${features.length}: ${adcodes.join(",")}`);
  }

  for (const expectedAdcode of EXPECTED_ADCODES) {
    if (!adcodes.includes(expectedAdcode)) {
      throw new Error(`Missing Macau DataV subdivision ${expectedAdcode}`);
    }
  }

  return {
    type: "FeatureCollection",
    features: features.flatMap((feature) => {
      if (!feature.geometry) {
        throw new Error(`Missing Macau DataV subdivision geometry for ${getAdcode(feature)}`);
      }

      return [
        {
          type: "Feature" as const,
          properties: buildProperties(
            feature,
            "macau_datav_display_subdivision_boundary",
          ),
          geometry: feature.geometry,
        },
        {
          type: "Feature" as const,
          properties: buildProperties(
            feature,
            "macau_datav_display_subdivision_label",
          ),
          geometry: {
            type: "Point",
            coordinates: getLabelPoint(feature),
          },
        },
      ];
    }),
  };
}

const output = buildRuntimeFeatureCollection(readFeatureCollection(SOURCE_PATH));
mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
writeFileSync(OUTPUT_PATH, `${JSON.stringify(output)}\n`);

console.info(
  JSON.stringify(
    {
      sourcePath: SOURCE_PATH,
      outputPath: OUTPUT_PATH,
      featureCount: output.features.length,
      boundaryCount: output.features.filter((feature) =>
        feature.properties?.layer === "macau_datav_display_subdivision_boundary",
      ).length,
      labelCount: output.features.filter((feature) =>
        feature.properties?.layer === "macau_datav_display_subdivision_label",
      ).length,
      adcodes: EXPECTED_ADCODES,
    },
    null,
    2,
  ),
);
