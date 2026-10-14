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

type NormalizedGeometry = {
  type: "MultiPolygon";
  coordinates: unknown[];
};

type Bbox = [number, number, number, number];

const PROVINCE_RAW_PATH = "【001】2025年带审图号全国行政区划shp（省、市、县）/中国_省.geojson";
const PREFECTURE_RAW_PATH = "【001】2025年带审图号全国行政区划shp（省、市、县）/中国_市.geojson";
const COUNTY_RAW_PATH = "【001】2025年带审图号全国行政区划shp（省、市、县）/中国_县.geojson";
const CHINA_PROVINCE_OUTPUT_PATH = "data/admin/normalized/china-province-admin-regions.geometry.json";
const CHINA_PREFECTURE_OUTPUT_PATH = "data/admin/normalized/china-prefecture-admin-regions.geometry.json";
const GUANGDONG_COUNTY_OUTPUT_PATH = "data/admin/normalized/guangdong-county-admin-regions.geometry.json";
const CHINA_COUNTY_OUTPUT_PATH = "data/admin/normalized/china-county-admin-regions.geometry.json";
const SOURCE_NAME = "reviewed_local_geojson_2025_admin_division";
const MUNICIPALITY_ADCODES = new Set(["110000", "120000", "310000", "500000"]);
const SPECIAL_DIRECT_COUNTY_PROVINCE_ADCODES = new Set(["710000", "810000"]);

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

  const mode = typeof parsed.level === "string"
      ? parsed.level
      : typeof parsed.mode === "string"
        ? parsed.mode
        : "all";
  const inputPath = typeof parsed.input === "string" ? parsed.input : undefined;
  const outputPath = typeof parsed.output === "string" ? parsed.output : undefined;

  return {
    mode,
    provinceRaw: typeof parsed.provinceRaw === "string" ? parsed.provinceRaw : PROVINCE_RAW_PATH,
    prefectureRaw: inputPath && mode === "prefecture"
      ? inputPath
      : typeof parsed.prefectureRaw === "string"
        ? parsed.prefectureRaw
        : PREFECTURE_RAW_PATH,
    countyRaw: inputPath && mode === "county"
      ? inputPath
      : typeof parsed.countyRaw === "string"
        ? parsed.countyRaw
        : COUNTY_RAW_PATH,
    provinceOutput: outputPath && mode === "province"
      ? outputPath
      : typeof parsed.provinceOutput === "string"
        ? parsed.provinceOutput
        : CHINA_PROVINCE_OUTPUT_PATH,
    prefectureOutput: outputPath && mode === "prefecture"
      ? outputPath
      : typeof parsed.prefectureOutput === "string"
        ? parsed.prefectureOutput
        : CHINA_PREFECTURE_OUTPUT_PATH,
    countyOutput: outputPath && mode === "county"
      ? outputPath
      : typeof parsed.countyOutput === "string"
        ? parsed.countyOutput
        : mode === "all"
          ? GUANGDONG_COUNTY_OUTPUT_PATH
          : CHINA_COUNTY_OUTPUT_PATH,
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

function normalizeGeometry(geometry: GeoJsonGeometry | null): NormalizedGeometry | null {
  if (!geometry) return null;

  if (geometry.type === "Polygon") {
    return {
      type: "MultiPolygon",
      coordinates: [geometry.coordinates],
    };
  }

  if (geometry.type === "MultiPolygon" && Array.isArray(geometry.coordinates)) {
    return {
      type: "MultiPolygon",
      coordinates: geometry.coordinates,
    };
  }

  return null;
}

function flattenPositions(value: unknown): Array<[number, number]> {
  if (!Array.isArray(value)) return [];
  if (
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  ) {
    return [[value[0], value[1]]];
  }

  return value.flatMap(flattenPositions);
}

function computeBbox(geometry: NormalizedGeometry): Bbox {
  const positions = flattenPositions(geometry.coordinates);

  if (positions.length === 0) {
    throw new Error("Cannot compute bbox for empty geometry.");
  }

  let minLng = Number.POSITIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;

  for (const [lng, lat] of positions) {
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  }

  return [minLng, minLat, maxLng, maxLat];
}

function centerFromBbox(bbox: Bbox) {
  return {
    lng: (bbox[0] + bbox[2]) / 2,
    lat: (bbox[1] + bbox[3]) / 2,
  };
}

function provinceAdminType(adcode: string, name: string) {
  if (name.endsWith("特别行政区")) return "special_administrative_region";
  if (name.endsWith("自治区")) return "autonomous_region";
  if (["110000", "120000", "310000", "500000"].includes(adcode)) return "municipality";
  return "province";
}

function prefectureParentAdcode(adcode: string) {
  return `${adcode.slice(0, 2)}0000`;
}

function prefectureAdminType(adcode: string, name: string) {
  if (["441900", "442000"].includes(adcode)) return "prefecture_city_direct_township";
  if (name.endsWith("自治州")) return "autonomous_prefecture";
  if (name.endsWith("地区")) return "prefecture";
  if (name.endsWith("盟")) return "league";
  return "prefecture_city";
}

function countyParentCandidateAdcode(adcode: string) {
  return `${adcode.slice(0, 4)}00`;
}

function provinceAdcode(adcode: string) {
  return `${adcode.slice(0, 2)}0000`;
}

function countyAdminType(name: string) {
  if (name.endsWith("自治县")) return "autonomous_county";
  if (name.endsWith("区")) return "district";
  if (name.endsWith("市")) return "county_level_city";
  if (name.endsWith("县")) return "county";
  return "unknown";
}

function buildRegion(feature: GeoJsonFeature, input: {
  level: "country" | "province" | "prefecture" | "county";
  adcode?: string;
  name?: string;
  adminType?: string;
  parentAdcode: string | null;
  provinceAdcode: string | null;
  prefectureAdcode: string | null;
  sourceFile: string;
  geometryOverride?: NormalizedGeometry;
  metadata?: Record<string, unknown>;
}) {
  const adcode = input.adcode ?? adcodeFromGb(feature.properties.gb);

  if (!adcode) {
    throw new Error(`Invalid gb code for ${feature.properties.name ?? "unknown feature"}`);
  }

  const geometry = input.geometryOverride ?? normalizeGeometry(feature.geometry);

  if (!geometry) {
    throw new Error(`Missing or invalid geometry for ${feature.properties.name ?? adcode}`);
  }

  const bbox = computeBbox(geometry);
  const center = centerFromBbox(bbox);

  return {
    adcode,
    name: input.name ?? feature.properties.name ?? adcode,
    level: input.level,
    adminType: input.adminType ?? (input.level === "province"
      ? provinceAdminType(adcode, feature.properties.name ?? adcode)
      : input.level === "prefecture"
        ? prefectureAdminType(adcode, feature.properties.name ?? adcode)
      : input.level === "county"
        ? countyAdminType(feature.properties.name ?? adcode)
        : "country"),
    parentAdcode: input.parentAdcode,
    provinceAdcode: input.provinceAdcode,
    prefectureAdcode: input.prefectureAdcode,
    center,
    labelPoint: center,
    geometry,
    bbox,
    source: SOURCE_NAME,
    sourceId: feature.properties.gb ?? adcode,
    sourceUpdatedAt: null,
    metadata: {
      sourceFile: input.sourceFile,
      sourceNameField: feature.properties.name ?? null,
      sourceGb: feature.properties.gb ?? null,
      ...(input.metadata ?? {}),
    },
  };
}

function buildChinaPrefectureRegions(input: {
  prefectureCollection: GeoJsonFeatureCollection;
  prefectureRaw: string;
}) {
  const skippedMunicipalityDuplicates: string[] = [];
  const skippedInvalidAdcodes: string[] = [];
  const prefectureFeatures = input.prefectureCollection.features
    .map((feature) => ({ feature, adcode: adcodeFromGb(feature.properties.gb) }))
    .filter((item): item is { feature: GeoJsonFeature; adcode: string } => {
      if (!item.adcode) {
        skippedInvalidAdcodes.push(item.feature.properties.name ?? "unknown");
        return false;
      }

      if (!/^\d{4}00$/.test(item.adcode)) {
        skippedInvalidAdcodes.push(`${item.adcode}:${item.feature.properties.name ?? item.adcode}`);
        return false;
      }

      if (/^\d{2}0000$/.test(item.adcode)) {
        skippedMunicipalityDuplicates.push(`${item.adcode}:${item.feature.properties.name ?? item.adcode}`);
        return false;
      }

      return true;
    })
    .sort((left, right) => left.adcode.localeCompare(right.adcode));
  const regions = prefectureFeatures.map(({ feature, adcode }) => {
    const parentAdcode = prefectureParentAdcode(adcode);

    return buildRegion(feature, {
      level: "prefecture",
      parentAdcode,
      provinceAdcode: parentAdcode,
      prefectureAdcode: adcode,
      sourceFile: input.prefectureRaw,
    });
  });

  return {
    regions,
    warnings: [
      ...skippedMunicipalityDuplicates.map(
        (item) => `Skipped province-level duplicate from prefecture source because adcode already belongs to an existing province-level region: ${item}`,
      ),
      ...skippedInvalidAdcodes.map(
        (item) => `Skipped invalid prefecture source feature: ${item}`,
      ),
    ],
  };
}

function buildChinaProvinceRegions(provinceCollection: GeoJsonFeatureCollection, provinceRaw: string) {
  const provinceFeatures = provinceCollection.features
    .map((feature) => ({ feature, adcode: adcodeFromGb(feature.properties.gb) }))
    .filter((item): item is { feature: GeoJsonFeature; adcode: string } =>
      Boolean(item.adcode && /^\d{2}0000$/.test(item.adcode)))
    .sort((left, right) => left.adcode.localeCompare(right.adcode));
  const provinceRegions = provinceFeatures.map(({ feature }) =>
    buildRegion(feature, {
      level: "province",
      parentAdcode: "100000",
      provinceAdcode: adcodeFromGb(feature.properties.gb),
      prefectureAdcode: null,
      sourceFile: provinceRaw,
    }),
  );
  const countryGeometry: NormalizedGeometry = {
    type: "MultiPolygon",
    coordinates: provinceRegions.flatMap((region) => region.geometry.coordinates),
  };
  const countryRegion = buildRegion(
    {
      type: "Feature",
      properties: { name: "中国", gb: "156100000" },
      geometry: null,
    },
    {
      level: "country",
      adcode: "100000",
      name: "中国",
      adminType: "country",
      parentAdcode: null,
      provinceAdcode: null,
      prefectureAdcode: null,
      sourceFile: provinceRaw,
      geometryOverride: countryGeometry,
    },
  );

  return {
    regions: [countryRegion, ...provinceRegions],
    warnings: provinceCollection.features
      .filter((feature) => !adcodeFromGb(feature.properties.gb))
      .map((feature) => `Skipped non-admin province source feature: ${feature.properties.name ?? "unknown"}`),
  };
}

function buildGuangdongCountyRegions(input: {
  countyCollection: GeoJsonFeatureCollection;
  prefectureCollection: GeoJsonFeatureCollection;
  countyRaw: string;
}) {
  const guangdongPrefectureAdcodes = new Set(
    input.prefectureCollection.features
      .map((feature) => adcodeFromGb(feature.properties.gb))
      .filter((adcode): adcode is string => Boolean(adcode?.startsWith("44"))),
  );
  const skippedDirectAdminPrefectures: string[] = [];
  const countyFeatures = input.countyCollection.features
    .map((feature) => ({ feature, adcode: adcodeFromGb(feature.properties.gb) }))
    .filter((item): item is { feature: GeoJsonFeature; adcode: string } =>
      Boolean(item.adcode?.startsWith("44")))
    .filter(({ feature, adcode }) => {
      if (adcode === "441900" || adcode === "442000") {
        skippedDirectAdminPrefectures.push(`${adcode}:${feature.properties.name ?? adcode}`);
        return false;
      }
      return true;
    })
    .sort((left, right) => left.adcode.localeCompare(right.adcode));
  const regions = countyFeatures.map(({ feature, adcode }) => {
    const parentAdcode = countyParentCandidateAdcode(adcode);

    if (!guangdongPrefectureAdcodes.has(parentAdcode)) {
      throw new Error(`County ${adcode} has no matching Guangdong prefecture parent ${parentAdcode}.`);
    }

    return buildRegion(feature, {
      level: "county",
      parentAdcode,
      provinceAdcode: "440000",
      prefectureAdcode: parentAdcode,
      sourceFile: input.countyRaw,
    });
  });

  return {
    regions,
    warnings: skippedDirectAdminPrefectures.map(
      (item) => `Skipped direct-administered prefecture source feature in county file: ${item}`,
    ),
  };
}

function buildChinaCountyRegions(input: {
  countyCollection: GeoJsonFeatureCollection;
  prefectureCollection: GeoJsonFeatureCollection;
  provinceCollection: GeoJsonFeatureCollection;
  countyRaw: string;
}) {
  const provinceAdcodes = new Set(
    input.provinceCollection.features
      .map((feature) => adcodeFromGb(feature.properties.gb))
      .filter((adcode): adcode is string => Boolean(adcode && /^\d{2}0000$/.test(adcode))),
  );
  const prefectureAdcodes = new Set(
    input.prefectureCollection.features
      .map((feature) => adcodeFromGb(feature.properties.gb))
      .filter((adcode): adcode is string => Boolean(adcode && /^\d{4}00$/.test(adcode) && !/^\d{2}0000$/.test(adcode))),
  );
  const skippedInvalidAdcodes: string[] = [];
  const skippedDirectAdminPrefectures: string[] = [];
  const skippedUnresolvedParent: string[] = [];
  const skippedTownshipLike: string[] = [];
  const directCountyUnderProvince: string[] = [];
  const municipalityCounty: string[] = [];
  const countyFeatures = input.countyCollection.features
    .map((feature) => ({ feature, adcode: adcodeFromGb(feature.properties.gb) }))
    .filter((item): item is { feature: GeoJsonFeature; adcode: string } => {
      if (!item.adcode) {
        skippedInvalidAdcodes.push(item.feature.properties.name ?? "unknown");
        return false;
      }

      if (!/^\d{6}$/.test(item.adcode)) {
        skippedInvalidAdcodes.push(`${item.adcode}:${item.feature.properties.name ?? item.adcode}`);
        return false;
      }

      if (/^\d{4}00$/.test(item.adcode)) {
        skippedDirectAdminPrefectures.push(`${item.adcode}:${item.feature.properties.name ?? item.adcode}`);
        return false;
      }

      if (Number(item.adcode.slice(4)) > 900) {
        skippedTownshipLike.push(`${item.adcode}:${item.feature.properties.name ?? item.adcode}`);
        return false;
      }

      return true;
    })
    .sort((left, right) => left.adcode.localeCompare(right.adcode));
  const regions = [];

  for (const { feature, adcode } of countyFeatures) {
    const province = provinceAdcode(adcode);
    const parentCandidate = countyParentCandidateAdcode(adcode);
    const isMunicipalityCounty = MUNICIPALITY_ADCODES.has(province);
    const isProvinceDirectCounty =
      /^\d{2}9\d{3}$/.test(adcode) ||
      SPECIAL_DIRECT_COUNTY_PROVINCE_ADCODES.has(province);
    let parentAdcode: string | null = null;
    let prefectureAdcode: string | null = null;
    const metadata: Record<string, unknown> = {};

    if (!provinceAdcodes.has(province)) {
      skippedUnresolvedParent.push(`${adcode}:${feature.properties.name ?? adcode}:missing province ${province}`);
      continue;
    }

    if (isMunicipalityCounty) {
      parentAdcode = province;
      metadata.municipalityCounty = true;
      municipalityCounty.push(`${adcode}:${feature.properties.name ?? adcode}`);
    } else if (prefectureAdcodes.has(parentCandidate)) {
      parentAdcode = parentCandidate;
      prefectureAdcode = parentCandidate;
    } else if (isProvinceDirectCounty) {
      parentAdcode = province;
      metadata.directCountyUnderProvince = true;
      directCountyUnderProvince.push(`${adcode}:${feature.properties.name ?? adcode}`);
    } else {
      skippedUnresolvedParent.push(`${adcode}:${feature.properties.name ?? adcode}:missing prefecture ${parentCandidate}`);
      continue;
    }

    regions.push(buildRegion(feature, {
      level: "county",
      parentAdcode,
      provinceAdcode: province,
      prefectureAdcode,
      sourceFile: input.countyRaw,
      metadata,
    }));
  }

  return {
    regions,
    warnings: [
      ...skippedDirectAdminPrefectures.map(
        (item) => `Skipped direct-administered prefecture source feature in county file: ${item}`,
      ),
      ...skippedTownshipLike.map(
        (item) => `Skipped township-like source feature in county file: ${item}`,
      ),
      ...skippedInvalidAdcodes.map(
        (item) => `Skipped invalid county source feature: ${item}`,
      ),
      ...skippedUnresolvedParent.map(
        (item) => `Skipped county source feature because parent could not be resolved: ${item}`,
      ),
    ],
    stats: {
      directCountyUnderProvince: directCountyUnderProvince.length,
      municipalityCounty: municipalityCounty.length,
      skippedDirectAdminPrefectures: skippedDirectAdminPrefectures.length,
      skippedTownshipLike: skippedTownshipLike.length,
      skippedInvalidAdcodes: skippedInvalidAdcodes.length,
      skippedUnresolvedParent: skippedUnresolvedParent.length,
    },
  };
}

function writeNormalizedFile(filePath: string, payload: unknown) {
  const outputPath = resolve(process.cwd(), filePath);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function summarize(regions: Array<{ level: string; geometry: unknown }>) {
  return {
    total: regions.length,
    country: regions.filter((region) => region.level === "country").length,
    province: regions.filter((region) => region.level === "province").length,
    prefecture: regions.filter((region) => region.level === "prefecture").length,
    county: regions.filter((region) => region.level === "county").length,
    missingGeometry: regions.filter((region) => region.geometry === null).length,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputs = [];

  if (args.mode === "all" || args.mode === "province") {
    const provinceCollection = readFeatureCollection(args.provinceRaw);
    const { regions, warnings } = buildChinaProvinceRegions(provinceCollection, args.provinceRaw);
    const payload = {
      schemaVersion: "admin-regions-normalized/v1",
      description: "China country anchor + province-level real boundaries normalized from local 2025 reviewed admin division GeoJSON. The country anchor is included to satisfy admin_regions.parent_adcode foreign key for parentAdcode=100000 province rows.",
      generatedAt: new Date().toISOString(),
      sourceFiles: {
        province: args.provinceRaw,
      },
      coverage: {
        parentAdcode: "100000",
        countryCount: 1,
        provinceCount: regions.filter((region) => region.level === "province").length,
      },
      warnings,
      regions,
    };
    writeNormalizedFile(args.provinceOutput, payload);
    outputs.push({
      output: args.provinceOutput,
      ...summarize(regions),
      warnings,
    });
  }

  if (args.mode === "all" || args.mode === "prefecture") {
    const prefectureCollection = readFeatureCollection(args.prefectureRaw);
    const { regions, warnings } = buildChinaPrefectureRegions({
      prefectureCollection,
      prefectureRaw: args.prefectureRaw,
    });
    const parentAdcodes = [...new Set(regions.map((region) => region.parentAdcode))].sort();
    const payload = {
      schemaVersion: "admin-regions-normalized/v1",
      description: "China prefecture-level real boundaries normalized from local 2025 reviewed admin division GeoJSON. Municipality duplicate features whose adcode equals province-level municipality adcode are skipped to preserve unique admin_regions.adcode semantics.",
      generatedAt: new Date().toISOString(),
      sourceFiles: {
        prefecture: args.prefectureRaw,
      },
      coverage: {
        level: "prefecture",
        prefectureCount: regions.length,
        parentProvinceCount: parentAdcodes.length,
        parentAdcodes,
      },
      warnings,
      regions,
    };
    writeNormalizedFile(args.prefectureOutput, payload);
    outputs.push({
      output: args.prefectureOutput,
      ...summarize(regions),
      parentProvinceCount: parentAdcodes.length,
      warnings,
    });
  }

  if (args.mode === "all" || args.mode === "county") {
    const countyCollection = readFeatureCollection(args.countyRaw);
    const prefectureCollection = readFeatureCollection(args.prefectureRaw);
    const provinceCollection = readFeatureCollection(args.provinceRaw);
    const countyBuilder = args.mode === "all"
      ? buildGuangdongCountyRegions({
          countyCollection,
          prefectureCollection,
          countyRaw: args.countyRaw,
        })
      : buildChinaCountyRegions({
          countyCollection,
          prefectureCollection,
          provinceCollection,
          countyRaw: args.countyRaw,
        });
    const { regions, warnings } = countyBuilder;
    const stats = "stats" in countyBuilder ? countyBuilder.stats : {
      directCountyUnderProvince: 0,
      municipalityCounty: 0,
      skippedDirectAdminPrefectures: warnings.length,
      skippedTownshipLike: 0,
      skippedInvalidAdcodes: 0,
      skippedUnresolvedParent: 0,
    };
    const parentAdcodes = [...new Set(regions.map((region) => region.parentAdcode))].sort();
    const provinceAdcodes = [...new Set(regions.map((region) => region.provinceAdcode))].sort();
    const payload = {
      schemaVersion: "admin-regions-normalized/v1",
      description: args.mode === "all"
        ? "Guangdong county-level real boundaries normalized from local 2025 reviewed admin division GeoJSON. Direct-administered Dongguan/Zhongshan prefecture features from the county source are intentionally skipped and not converted into county children."
        : "China county-level real boundaries normalized from local 2025 reviewed admin division GeoJSON. Municipal county rows point directly to municipality province adcodes; province-direct county-level units are marked in metadata; direct-administered prefecture city source duplicates are skipped.",
      generatedAt: new Date().toISOString(),
      sourceFiles: {
        county: args.countyRaw,
        prefecture: args.prefectureRaw,
        province: args.provinceRaw,
      },
      coverage: {
        level: "county",
        provinceAdcodes,
        parentAdcodes,
        parentCount: parentAdcodes.length,
        countyCount: regions.length,
        ...stats,
      },
      warnings,
      regions,
    };
    writeNormalizedFile(args.countyOutput, payload);
    outputs.push({
      output: args.countyOutput,
      ...summarize(regions),
      ...stats,
      warnings,
    });
  }

  console.log(JSON.stringify({ outputs }, null, 2));
}

main();
