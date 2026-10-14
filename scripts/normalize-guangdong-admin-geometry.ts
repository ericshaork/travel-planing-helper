const { existsSync, mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { dirname, resolve } = require("node:path");

type GeoJsonGeometry = {
  type: "Polygon" | "MultiPolygon";
  coordinates: unknown;
};

type GeoJsonFeature = {
  type: "Feature";
  properties: {
    name?: string;
    gb?: string;
  };
  geometry: GeoJsonGeometry | null;
};

type GeoJsonFeatureCollection = {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
};

const PROVINCE_RAW_PATH = "【001】2025年带审图号全国行政区划shp（省、市、县）/中国_省.geojson";
const PREFECTURE_RAW_PATH = "【001】2025年带审图号全国行政区划shp（省、市、县）/中国_市.geojson";
const DEFAULT_OUTPUT_PATH = "data/admin/normalized/guangdong-admin-regions.geometry.json";

const GUANGDONG_PREFECTURE_CENTERS: Record<string, { lng: number; lat: number }> = {
  "440100": { lng: 113.2644, lat: 23.1291 },
  "440200": { lng: 113.5975, lat: 24.8104 },
  "440300": { lng: 114.0579, lat: 22.5431 },
  "440400": { lng: 113.5767, lat: 22.2707 },
  "440500": { lng: 116.6819, lat: 23.3541 },
  "440600": { lng: 113.1214, lat: 23.0215 },
  "440700": { lng: 113.0819, lat: 22.5787 },
  "440800": { lng: 110.3594, lat: 21.2707 },
  "440900": { lng: 110.9255, lat: 21.6627 },
  "441200": { lng: 112.4651, lat: 23.0472 },
  "441300": { lng: 114.4168, lat: 23.1118 },
  "441400": { lng: 116.1226, lat: 24.2886 },
  "441500": { lng: 115.3753, lat: 22.7862 },
  "441600": { lng: 114.7002, lat: 23.7435 },
  "441700": { lng: 111.9822, lat: 21.8579 },
  "441800": { lng: 113.0560, lat: 23.6820 },
  "441900": { lng: 113.7518, lat: 23.0207 },
  "442000": { lng: 113.3926, lat: 22.5176 },
  "445100": { lng: 116.6226, lat: 23.6567 },
  "445200": { lng: 116.3727, lat: 23.5497 },
  "445300": { lng: 112.0445, lat: 22.9151 },
};

function parseArgs(argv: string[]) {
  const parsed: Record<string, string> = {};

  for (const item of argv) {
    const match = item.match(/^--([^=]+)=(.*)$/);
    if (match) parsed[match[1]] = match[2];
  }

  return {
    output: parsed.output ?? DEFAULT_OUTPUT_PATH,
    provinceRaw: parsed.provinceRaw ?? PROVINCE_RAW_PATH,
    prefectureRaw: parsed.prefectureRaw ?? PREFECTURE_RAW_PATH,
  };
}

function readFeatureCollection(filePath: string): GeoJsonFeatureCollection {
  const absolutePath = resolve(process.cwd(), filePath);

  if (!existsSync(absolutePath)) {
    throw new Error(`GeoJSON source not found: ${filePath}`);
  }

  return JSON.parse(readFileSync(absolutePath, "utf8")) as GeoJsonFeatureCollection;
}

function adcodeFromGb(gb: string | undefined) {
  if (!gb || !gb.startsWith("156") || gb.length !== 9) {
    return null;
  }

  return gb.slice(3);
}

function normalizeGeometry(geometry: GeoJsonGeometry | null) {
  if (!geometry) {
    return null;
  }

  if (geometry.type === "Polygon") {
    return {
      type: "MultiPolygon",
      coordinates: [geometry.coordinates],
    };
  }

  if (geometry.type === "MultiPolygon") {
    return geometry;
  }

  return null;
}

function collectGuangdongFeatures(input: {
  provinceCollection: GeoJsonFeatureCollection;
  prefectureCollection: GeoJsonFeatureCollection;
}) {
  const provinceFeature = input.provinceCollection.features.find(
    (feature) => adcodeFromGb(feature.properties.gb) === "440000",
  );
  const prefectureFeatures = input.prefectureCollection.features
    .filter((feature) => adcodeFromGb(feature.properties.gb)?.startsWith("44"))
    .sort((left, right) =>
      (adcodeFromGb(left.properties.gb) ?? "").localeCompare(adcodeFromGb(right.properties.gb) ?? ""),
    );

  if (!provinceFeature) {
    throw new Error("广东省 feature not found in province GeoJSON.");
  }

  if (prefectureFeatures.length !== 21) {
    throw new Error(`Expected 21 Guangdong prefecture features, got ${prefectureFeatures.length}.`);
  }

  return { provinceFeature, prefectureFeatures };
}

function buildRegion(feature: GeoJsonFeature, input: {
  level: "province" | "prefecture";
  parentAdcode: string | null;
}) {
  const adcode = adcodeFromGb(feature.properties.gb);

  if (!adcode) {
    throw new Error(`Invalid gb code for ${feature.properties.name ?? "unknown feature"}`);
  }

  const geometry = normalizeGeometry(feature.geometry);

  if (!geometry) {
    throw new Error(`Missing or invalid geometry for ${feature.properties.name ?? adcode}`);
  }

  const isProvince = input.level === "province";

  return {
    adcode,
    name: feature.properties.name ?? adcode,
    level: input.level,
    adminType: isProvince
      ? "province"
      : adcode === "441900" || adcode === "442000"
        ? "prefecture_city_direct_township"
        : "prefecture_city",
    parentAdcode: input.parentAdcode,
    provinceAdcode: "440000",
    prefectureAdcode: isProvince ? null : adcode,
    center: isProvince
      ? { lng: 113.2668, lat: 23.1333 }
      : GUANGDONG_PREFECTURE_CENTERS[adcode] ?? null,
    labelPoint: null,
    geometry,
    bbox: null,
    source: "reviewed_local_geojson_2025_admin_division",
    sourceId: feature.properties.gb ?? adcode,
    sourceUpdatedAt: null,
    metadata: {
      sourceFile: isProvince ? PROVINCE_RAW_PATH : PREFECTURE_RAW_PATH,
      sourceNameField: feature.properties.name ?? null,
      sourceGb: feature.properties.gb ?? null,
    },
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const provinceCollection = readFeatureCollection(args.provinceRaw);
  const prefectureCollection = readFeatureCollection(args.prefectureRaw);
  const { provinceFeature, prefectureFeatures } = collectGuangdongFeatures({
    provinceCollection,
    prefectureCollection,
  });
  const regions = [
    buildRegion(provinceFeature, {
      level: "province",
      parentAdcode: null,
    }),
    ...prefectureFeatures.map((feature) =>
      buildRegion(feature, {
        level: "prefecture",
        parentAdcode: "440000",
      }),
    ),
  ];
  const output = {
    schemaVersion: "admin-regions-normalized/v1",
    description: "Guangdong province + 21 prefecture-level real boundaries normalized from local 2025 reviewed admin division GeoJSON. County-level geometry is intentionally not included in this Phase 1.5.3 file.",
    generatedAt: new Date().toISOString(),
    sourceFiles: {
      province: args.provinceRaw,
      prefecture: args.prefectureRaw,
    },
    coverage: {
      provinceAdcode: "440000",
      province: "广东省",
      provinceCount: 1,
      prefectureCount: prefectureFeatures.length,
      countyCount: 0,
    },
    regions,
  };
  const outputPath = resolve(process.cwd(), args.output);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    output: args.output,
    total: regions.length,
    province: 1,
    prefecture: prefectureFeatures.length,
    county: 0,
    missingGeometry: regions.filter((region) => region.geometry === null).length,
  }, null, 2));
}

main();
