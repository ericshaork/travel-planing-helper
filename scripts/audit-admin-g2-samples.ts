import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

type GeoJsonFeature = {
  type: "Feature";
  properties?: Record<string, unknown>;
  geometry?: GeoJsonGeometry | null;
};

type GeoJsonGeometry = {
  type: string;
  coordinates?: unknown;
  geometries?: GeoJsonGeometry[];
};

type FeatureCollection = {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
  crs?: unknown;
};

type GeometryMetrics = {
  featureCount: number;
  geometryTypes: Record<string, number>;
  vertexCount: number;
  segmentCount: number;
  polygonPartCount: number;
  ringCount: number;
  innerRingCount: number;
  longSegmentCount20km: number;
  maxSegmentKm: number;
  propertyKeys: string[];
  hasName: boolean;
  hasAdcode: boolean;
  hasGb: boolean;
  coordinateSystem: string;
  sizeBytes?: number;
};

type SampleRegion = {
  id: string;
  name: string;
  riskType: "county_precision" | "coastal_patch" | "mixed";
  datavAdcodes: string[];
  current: {
    provinceAdcodes?: string[];
    cityAdcodes?: string[];
    countyAdcodes?: string[];
    countyPrefixes?: string[];
  };
  notes: string;
};

const ROOT = process.cwd();
const OUT_DIR = "temp/admin-source-comparison-g2";
const DATAV_DIR = `${OUT_DIR}/datav`;
const DOC_PATH = "docs/WANDERLY_V2_ADMIN_G2_SAMPLE_SOURCE_TEST.md";
const JSON_PATH = "data/source-manifests/admin-source-comparison.g2-samples.json";
const MAX_DOWNLOAD_BYTES = 100 * 1024 * 1024;

const CURRENT_SOURCE = {
  province: "【001】2025年带审图号全国行政区划shp（省、市、县）/中国_省.geojson",
  prefecture: "【001】2025年带审图号全国行政区划shp（省、市、县）/中国_市.geojson",
  county: "【001】2025年带审图号全国行政区划shp（省、市、县）/中国_县.geojson",
};

const SAMPLE_REGIONS: SampleRegion[] = [
  {
    id: "shenzhen-dongguan",
    name: "深圳 / 东莞",
    riskType: "mixed",
    datavAdcodes: ["440300", "441900"],
    current: { cityAdcodes: ["440300", "441900"], countyPrefixes: ["4403", "4419"] },
    notes: "区县密集，深圳/东莞/惠州交界和深圳湾周边需要人工验收。",
  },
  {
    id: "zhuhai-macau-hengqin",
    name: "珠海 / 澳门 / 横琴",
    riskType: "coastal_patch",
    datavAdcodes: ["440400", "440402", "820000"],
    current: { provinceAdcodes: ["820000"], cityAdcodes: ["440400"], countyAdcodes: ["440402"], countyPrefixes: ["4404"] },
    notes: "横琴、澳门和岛屿水域边界是 coastal patch 高风险样本。",
  },
  {
    id: "xiamen",
    name: "厦门",
    riskType: "coastal_patch",
    datavAdcodes: ["350200"],
    current: { cityAdcodes: ["350200"], countyPrefixes: ["3502"] },
    notes: "海岛、跨海和湾区边界细节优先。",
  },
  {
    id: "zhoushan",
    name: "舟山",
    riskType: "coastal_patch",
    datavAdcodes: ["330900"],
    current: { cityAdcodes: ["330900"], countyPrefixes: ["3309"] },
    notes: "岛屿密集，当前源和展示级源都可能不足。",
  },
  {
    id: "shanghai-coast-chongming",
    name: "上海沿海 / 崇明",
    riskType: "coastal_patch",
    datavAdcodes: ["310000", "310151"],
    current: { provinceAdcodes: ["310000"], countyAdcodes: ["310151"], countyPrefixes: ["310"] },
    notes: "崇明、长江口和沿海新成陆区域需要高精度源。",
  },
  {
    id: "hangzhou-bay",
    name: "杭州湾",
    riskType: "coastal_patch",
    datavAdcodes: ["330100", "330200", "330400"],
    current: { cityAdcodes: ["330100", "330200", "330400"], countyPrefixes: ["3301", "3302", "3304"] },
    notes: "杭州湾涉及杭州、宁波、嘉兴，河口和湾区口径优先。",
  },
  {
    id: "guangzhou-foshan",
    name: "广州 / 佛山",
    riskType: "county_precision",
    datavAdcodes: ["440100", "440600"],
    current: { cityAdcodes: ["440100", "440600"], countyPrefixes: ["4401", "4406"] },
    notes: "广佛同城区域主要验证县区边界层级和相邻边界重合。",
  },
  {
    id: "sichuan-chongqing",
    name: "四川 / 重庆",
    riskType: "county_precision",
    datavAdcodes: ["510000", "500000"],
    current: { provinceAdcodes: ["510000", "500000"], cityAdcodes: ["500000"], countyPrefixes: ["51", "500"] },
    notes: "大尺度省市交界和重庆区县细节需要单独验收。",
  },
];

function absolute(path: string): string {
  return resolve(ROOT, path);
}

function ensureDir(path: string): void {
  mkdirSync(absolute(path), { recursive: true });
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(absolute(path), "utf8")) as T;
}

function writeJson(path: string, value: unknown): void {
  ensureDir(dirname(path));
  writeFileSync(absolute(path), `${JSON.stringify(value, null, 2)}\n`);
}

function adcodeFromFeature(feature: GeoJsonFeature): string | null {
  const props = feature.properties ?? {};
  const raw = props.adcode ?? props.adCode ?? props.code ?? props.gb;
  if (raw === undefined || raw === null) {
    return null;
  }
  const value = String(raw);
  if (value.length === 9 && value.startsWith("156")) {
    return value.slice(3);
  }
  return value;
}

function filterFeatures(features: GeoJsonFeature[], region: SampleRegion, level: keyof typeof CURRENT_SOURCE): GeoJsonFeature[] {
  const provinceSet = new Set(region.current.provinceAdcodes ?? []);
  const citySet = new Set(region.current.cityAdcodes ?? []);
  const countySet = new Set(region.current.countyAdcodes ?? []);
  const countyPrefixes = region.current.countyPrefixes ?? [];

  return features.filter((feature) => {
    const adcode = adcodeFromFeature(feature);
    if (!adcode) {
      return false;
    }
    if (level === "province") {
      return provinceSet.has(adcode);
    }
    if (level === "prefecture") {
      return citySet.has(adcode);
    }
    if (countySet.has(adcode)) {
      return true;
    }
    return countyPrefixes.some((prefix) => adcode.startsWith(prefix));
  });
}

function isCoord(value: unknown): value is [number, number] {
  return Array.isArray(value)
    && value.length >= 2
    && typeof value[0] === "number"
    && typeof value[1] === "number";
}

function haversineKm(a: [number, number], b: [number, number]): number {
  const radius = 6371;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLng = ((b[0] - a[0]) * Math.PI) / 180;
  const lat1 = (a[1] * Math.PI) / 180;
  const lat2 = (b[1] * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * radius * Math.asin(Math.sqrt(h));
}

function countLine(points: unknown[]): Pick<GeometryMetrics, "vertexCount" | "segmentCount" | "longSegmentCount20km" | "maxSegmentKm"> {
  let vertexCount = 0;
  let segmentCount = 0;
  let longSegmentCount20km = 0;
  let maxSegmentKm = 0;
  let prev: [number, number] | null = null;
  for (const point of points) {
    if (!isCoord(point)) {
      continue;
    }
    vertexCount += 1;
    if (prev) {
      segmentCount += 1;
      const km = haversineKm(prev, point);
      maxSegmentKm = Math.max(maxSegmentKm, km);
      if (km >= 20) {
        longSegmentCount20km += 1;
      }
    }
    prev = point;
  }
  return { vertexCount, segmentCount, longSegmentCount20km, maxSegmentKm };
}

function addMetrics(target: GeometryMetrics, partial: Partial<GeometryMetrics>): void {
  target.vertexCount += partial.vertexCount ?? 0;
  target.segmentCount += partial.segmentCount ?? 0;
  target.polygonPartCount += partial.polygonPartCount ?? 0;
  target.ringCount += partial.ringCount ?? 0;
  target.innerRingCount += partial.innerRingCount ?? 0;
  target.longSegmentCount20km += partial.longSegmentCount20km ?? 0;
  target.maxSegmentKm = Math.max(target.maxSegmentKm, partial.maxSegmentKm ?? 0);
}

function countGeometry(geometry: GeoJsonGeometry | null | undefined): Partial<GeometryMetrics> {
  const empty: Partial<GeometryMetrics> = {
    vertexCount: 0,
    segmentCount: 0,
    polygonPartCount: 0,
    ringCount: 0,
    innerRingCount: 0,
    longSegmentCount20km: 0,
    maxSegmentKm: 0,
  };
  if (!geometry) {
    return empty;
  }

  const out = { ...empty };
  if (geometry.type === "Polygon" && Array.isArray(geometry.coordinates)) {
    out.polygonPartCount = 1;
    out.ringCount = geometry.coordinates.length;
    out.innerRingCount = Math.max(0, geometry.coordinates.length - 1);
    for (const ring of geometry.coordinates) {
      if (Array.isArray(ring)) {
        addMetrics(out as GeometryMetrics, countLine(ring));
      }
    }
    return out;
  }
  if (geometry.type === "MultiPolygon" && Array.isArray(geometry.coordinates)) {
    for (const polygon of geometry.coordinates) {
      if (!Array.isArray(polygon)) {
        continue;
      }
      out.polygonPartCount = (out.polygonPartCount ?? 0) + 1;
      out.ringCount = (out.ringCount ?? 0) + polygon.length;
      out.innerRingCount = (out.innerRingCount ?? 0) + Math.max(0, polygon.length - 1);
      for (const ring of polygon) {
        if (Array.isArray(ring)) {
          addMetrics(out as GeometryMetrics, countLine(ring));
        }
      }
    }
    return out;
  }
  if (geometry.type === "LineString" && Array.isArray(geometry.coordinates)) {
    addMetrics(out as GeometryMetrics, countLine(geometry.coordinates));
    return out;
  }
  if (geometry.type === "MultiLineString" && Array.isArray(geometry.coordinates)) {
    for (const line of geometry.coordinates) {
      if (Array.isArray(line)) {
        addMetrics(out as GeometryMetrics, countLine(line));
      }
    }
    return out;
  }
  if (geometry.type === "GeometryCollection" && Array.isArray(geometry.geometries)) {
    for (const child of geometry.geometries) {
      addMetrics(out as GeometryMetrics, countGeometry(child));
    }
  }
  return out;
}

function coordinateSystemOf(collection: FeatureCollection): string {
  const crs = collection.crs as { properties?: { name?: string } } | undefined;
  return crs?.properties?.name ?? "unknown_lonlat_geojson";
}

function metricsForCollection(collection: FeatureCollection, sizeBytes?: number): GeometryMetrics {
  const metrics: GeometryMetrics = {
    featureCount: collection.features.length,
    geometryTypes: {},
    vertexCount: 0,
    segmentCount: 0,
    polygonPartCount: 0,
    ringCount: 0,
    innerRingCount: 0,
    longSegmentCount20km: 0,
    maxSegmentKm: 0,
    propertyKeys: [],
    hasName: false,
    hasAdcode: false,
    hasGb: false,
    coordinateSystem: coordinateSystemOf(collection),
    sizeBytes,
  };

  const propertyKeys = new Set<string>();
  for (const feature of collection.features) {
    const type = feature.geometry?.type ?? "null";
    metrics.geometryTypes[type] = (metrics.geometryTypes[type] ?? 0) + 1;
    for (const key of Object.keys(feature.properties ?? {})) {
      propertyKeys.add(key);
    }
    metrics.hasName ||= Object.prototype.hasOwnProperty.call(feature.properties ?? {}, "name");
    metrics.hasAdcode ||= ["adcode", "adCode", "code"].some((key) => Object.prototype.hasOwnProperty.call(feature.properties ?? {}, key));
    metrics.hasGb ||= Object.prototype.hasOwnProperty.call(feature.properties ?? {}, "gb");
    addMetrics(metrics, countGeometry(feature.geometry));
  }
  metrics.propertyKeys = Array.from(propertyKeys).sort();
  return metrics;
}

function currentMetrics(region: SampleRegion): GeometryMetrics {
  const features: GeoJsonFeature[] = [];
  for (const level of Object.keys(CURRENT_SOURCE) as Array<keyof typeof CURRENT_SOURCE>) {
    const collection = readJson<FeatureCollection>(CURRENT_SOURCE[level]);
    features.push(...filterFeatures(collection.features, region, level));
  }
  return metricsForCollection({
    type: "FeatureCollection",
    features,
    crs: { type: "name", properties: { name: "urn:ogc:def:crs:EPSG::4490" } },
  });
}

async function fetchWithLimit(url: string): Promise<{ ok: true; bytes: Buffer; status: number; contentType: string | null } | { ok: false; status?: number; error: string; contentLength?: number }> {
  const response = await fetch(url, {
    headers: { "user-agent": "WanderlyMapSourceAudit/1.0" },
  });
  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (contentLength > MAX_DOWNLOAD_BYTES) {
    return { ok: false, status: response.status, error: "content_length_over_limit", contentLength };
  }
  if (!response.ok || !response.body) {
    return { ok: false, status: response.status, error: response.statusText };
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    if (!value) {
      continue;
    }
    total += value.byteLength;
    if (total > MAX_DOWNLOAD_BYTES) {
      await reader.cancel();
      return { ok: false, status: response.status, error: "stream_over_limit", contentLength: total };
    }
    chunks.push(value);
  }
  return {
    ok: true,
    bytes: Buffer.concat(chunks),
    status: response.status,
    contentType: response.headers.get("content-type"),
  };
}

async function headMetadata(url: string): Promise<Record<string, unknown>> {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      headers: { "user-agent": "WanderlyMapSourceAudit/1.0" },
    });
    return {
      url,
      ok: response.ok,
      status: response.status,
      contentLength: response.headers.get("content-length"),
      contentType: response.headers.get("content-type"),
      lastModified: response.headers.get("last-modified"),
    };
  } catch (error) {
    return {
      url,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function testDatav(region: SampleRegion): Promise<{
  downloads: Array<Record<string, unknown>>;
  aggregate: GeometryMetrics;
}> {
  const features: GeoJsonFeature[] = [];
  const downloads: Array<Record<string, unknown>> = [];

  for (const adcode of region.datavAdcodes) {
    const candidates = [
      `https://geo.datav.aliyun.com/areas_v3/bound/${adcode}_full.json`,
      `https://geo.datav.aliyun.com/areas_v3/bound/${adcode}.json`,
    ];
    let handled = false;
    for (const url of candidates) {
      const fetched = await fetchWithLimit(url);
      if (!fetched.ok) {
        downloads.push({ adcode, url, ok: false, error: fetched.error, status: fetched.status, contentLength: fetched.contentLength });
        continue;
      }
      try {
        const collection = JSON.parse(fetched.bytes.toString("utf8")) as FeatureCollection;
        if (!Array.isArray(collection.features)) {
          downloads.push({ adcode, url, ok: false, error: "not_feature_collection", sizeBytes: fetched.bytes.byteLength });
          continue;
        }
        const outputPath = `${DATAV_DIR}/${region.id}-${adcode}.geojson`;
        writeFileSync(absolute(outputPath), fetched.bytes);
        const metrics = metricsForCollection(collection, fetched.bytes.byteLength);
        features.push(...collection.features);
        downloads.push({
          adcode,
          url,
          ok: true,
          path: outputPath,
          sizeBytes: fetched.bytes.byteLength,
          contentType: fetched.contentType,
          metrics,
        });
        handled = true;
        break;
      } catch (error) {
        downloads.push({
          adcode,
          url,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
          sizeBytes: fetched.bytes.byteLength,
        });
      }
    }
    if (!handled) {
      // Keep the failure records above; no extra action.
    }
  }

  return {
    downloads,
    aggregate: metricsForCollection({ type: "FeatureCollection", features }, undefined),
  };
}

function compareMetrics(current: GeometryMetrics, datav: GeometryMetrics): Record<string, unknown> {
  const vertexRatio = current.vertexCount > 0 ? datav.vertexCount / current.vertexCount : null;
  const featureRatio = current.featureCount > 0 ? datav.featureCount / current.featureCount : null;
  return {
    datavHasMoreFeatures: datav.featureCount > current.featureCount,
    datavHasMoreVertices: datav.vertexCount > current.vertexCount,
    vertexRatio,
    featureRatio,
    datavLikelyMoreDetailed: typeof vertexRatio === "number" ? vertexRatio > 1.2 : false,
    currentHasLongerMaxSegment: current.maxSegmentKm > datav.maxSegmentKm,
    datavCoastalPatchFit: datav.polygonPartCount > current.polygonPartCount && datav.vertexCount > current.vertexCount,
    notes: "This is structural comparison only; visual alignment with AMap/GCJ-02 was not measured in this phase.",
  };
}

function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined) return "";
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${bytes} B`;
}

function row(values: Array<string | number | boolean | null | undefined>): string {
  return `| ${values.map((value) => String(value ?? "")).join(" | ")} |`;
}

function sourceNotes(): Record<string, unknown>[] {
  return [
    {
      id: "datav-geoatlas",
      source: "DataV / GeoAtlas",
      automaticDownload: true,
      productionUse: "comparison_only",
      licenseRisk: "unclear",
      notes: "Small GeoJSON samples can be fetched by adcode. Treat as display-grade comparison data, not production canonical source.",
    },
    {
      id: "osmdata-coastline",
      source: "OSM coastline / land / water polygons",
      automaticDownload: true,
      productionUse: "patch_candidate_after_odbl_strategy",
      licenseRisk: "ODbL",
      notes: "Global coastline/land/water downloads are likely large. Use as coastal patch candidate only after ODbL attribution and derivative database policy.",
    },
    {
      id: "geofabrik",
      source: "OSM / Geofabrik",
      automaticDownload: true,
      productionUse: "comparison_or_patch_candidate",
      licenseRisk: "ODbL",
      notes: "Province extracts exist, but Guangdong PBF and SHP are over 100MB. Do not download without confirmation.",
    },
    {
      id: "resdc-geodata",
      source: "RESDC / Geodata",
      automaticDownload: "restricted",
      productionUse: "main_or_patch_candidate_if_licensed",
      licenseRisk: "per_dataset_review",
      notes: "Requires registration/order/application for many datasets. User should request county/township boundary, coastline, water system, lake/island samples and license terms.",
    },
    {
      id: "commercial-survey",
      source: "Commercial / official survey sources",
      automaticDownload: false,
      productionUse: "best_main_candidate_if_contract_allows_pmtiles_derivatives",
      licenseRisk: "contract_dependent",
      notes: "Best chance to solve production-grade county and coastal precision, but requires purchase/contract and map compliance review.",
    },
  ];
}

function docFor(result: Record<string, unknown>): string {
  const regions = result.sampleRegions as Array<Record<string, unknown>>;
  const downloads = result.downloadedSmallSamples as Array<Record<string, unknown>>;
  const testedSources = result.testedSources as Array<Record<string, unknown>>;

  const lines: string[] = [
    "# Wanderly v2.0 Admin G2 Sample Source Test",
    "",
    "Audit date: 2026-10-11",
    "Phase: G2-A",
    "",
    "Boundary: 本轮只做高风险样本数据源实测包；未替换现有 PMTiles，未修改 Map Studio UI，未写 Supabase，未上传 OSS/CDN，未购买数据，未绕过登录/验证码/付费限制。",
    "",
    "## 1. Summary",
    "",
    "- 当前 2025 行政区源仍可作为工程底座，但不能作为生产可信主源。",
    "- DataV 小样本可自动获取，字段结构适合作对照；授权不清，不建议生产使用。",
    "- DataV 在部分城市样本上 feature/vertex 数量更高，但这不等于更贴近高德底图，也不等于测绘级精度更高。",
    "- OSM coastline/osmdata 更适合 coastal patch 方向，但文件多为全球大包，且受 ODbL 约束。",
    "- RESDC/Geodata 和商业测绘源最值得申请/采购，用于生产级县区、乡镇、海岸线、小岛、水系。",
    "",
    "## 2. Sample Region Results",
    "",
    row(["Region", "Risk", "Current features", "Current vertices", "DataV features", "DataV vertices", "DataV more detailed?", "Coastal patch fit?", "Notes"]),
    row(["---", "---", "---:", "---:", "---:", "---:", "---", "---", "---"]),
  ];

  for (const region of regions) {
    const current = region.currentMetrics as GeometryMetrics;
    const datav = region.datavMetrics as GeometryMetrics;
    const comparison = region.comparison as Record<string, unknown>;
    lines.push(row([
      region.name as string,
      region.riskType as string,
      current.featureCount,
      current.vertexCount,
      datav.featureCount,
      datav.vertexCount,
      comparison.datavLikelyMoreDetailed as boolean,
      comparison.datavCoastalPatchFit as boolean,
      region.assessment as string,
    ]));
  }

  lines.push(
    "",
    "## 3. Downloaded Small Samples",
    "",
    row(["Region", "Adcode", "URL", "Size", "Feature count", "Property keys", "Local debug path"]),
    row(["---", "---", "---", "---:", "---:", "---", "---"]),
  );

  for (const item of downloads) {
    const metrics = item.metrics as GeometryMetrics | undefined;
    lines.push(row([
      item.region as string,
      item.adcode as string,
      item.url as string,
      formatBytes(item.sizeBytes as number | undefined),
      metrics?.featureCount,
      metrics?.propertyKeys?.join(", "),
      item.path as string,
    ]));
  }

  lines.push(
    "",
    "## 4. Tested Source Accessibility",
    "",
    row(["Source", "Automatic", "Production use", "License risk", "Notes"]),
    row(["---", "---", "---", "---", "---"]),
  );

  for (const source of testedSources) {
    lines.push(row([
      source.source as string,
      source.automaticDownload as string,
      source.productionUse as string,
      source.licenseRisk as string,
      source.notes as string,
    ]));
  }

  lines.push(
    "",
    "## 5. Manual / Restricted Sources",
    "",
    "- RESDC / Geodata: 请用户手动注册或申请县界、乡镇界、海岸线、水系、湖泊、岛屿样本，并确认商用、再分发、公开 PMTiles 派生权限。",
    "- 商业测绘源: 请询价中国省/市/县/乡镇/村级边界、海岸线、小岛、水系，要求明确 WGS84/GCJ-02/CGCS2000、adcode、SHP/GeoJSON/PMTiles 派生权。",
    "- 天地图/官方服务: 适合小样本合法性核对，但批量缓存和公开瓦片派生需单独授权。",
    "",
    "## 6. Findings",
    "",
    "### 县区级精度",
    "",
    "最可能解决县区级精度的是授权明确的商业测绘源，其次是 RESDC/Geodata 的县界/乡镇界数据。DataV 可用于对照，但不应作为生产县区主源。",
    "",
    "### 海岸线 / 小岛 / 河口",
    "",
    "最可能快速形成开放补丁的是 OSM coastline / land / water polygons，但必须先解决 ODbL attribution 和衍生数据库边界。生产级方案仍建议申请 RESDC/Geodata 或商业海岸线/水系/岛屿数据。",
    "",
    "### DataV 是否更细",
    "",
    "DataV 的 `_full` 样本通常能拿到下一级行政区 feature，并且部分样本 vertex 数量高于当前 2025 源；但它更像展示级对照源。没有授权确认和视觉贴合验收前，不能说它比当前源更适合生产。",
    "",
    "### 当前 2025 源",
    "",
    "当前 2025 源可以继续作为工程底座，适合继续做性能、LOD、PMTiles split 和图层系统验证；不建议继续在它上面做行政区美化并声称解决精度问题。",
    "",
    "## 7. Recommended Next Actions",
    "",
    "1. 先申请/采购高精度源样本：RESDC/Geodata 或商业源，字段必须包含授权、adcode、坐标系、县区/乡镇、海岸线/水系/岛屿。",
    "2. 同步做 OSM coastal patch 对照，但先写 ODbL 隔离与 attribution 策略。",
    "3. 可以继续做 PMTiles split 工程试验，但只验证性能和 LOD，不要标记 productionApproved。",
    "4. 暂停纯视觉行政区美化；优先补数据源。",
    "5. OSS/CDN 部署可以做 PMTiles 分发验证，但不能替代数据源质量和授权审查。",
    "",
    "## 8. References / Metadata",
    "",
    "- DataV sample URL pattern: `https://geo.datav.aliyun.com/areas_v3/bound/<adcode>_full.json`",
    "- Geofabrik Guangdong PBF metadata: 165MB; free SHP ZIP metadata: 315MB, both over this phase download limit.",
    "- Geofabrik shape documentation notes admin polygons and coastline clipping options; standard SHP does not replace dedicated land/water/coastline processing.",
    "- OSM coastline/land/water: `https://osmdata.openstreetmap.de/`",
    "",
  );

  return `${lines.join("\n")}\n`;
}

async function main(): Promise<void> {
  ensureDir(DATAV_DIR);
  const sampleRegions: Array<Record<string, unknown>> = [];
  const downloadedSmallSamples: Array<Record<string, unknown>> = [];

  for (const region of SAMPLE_REGIONS) {
    const current = currentMetrics(region);
    const datav = await testDatav(region);
    for (const download of datav.downloads) {
      if (download.ok) {
        downloadedSmallSamples.push({ region: region.id, ...download });
      }
    }
    const comparison = compareMetrics(current, datav.aggregate);
    const assessment = region.riskType === "coastal_patch"
      ? "DataV 可做结构对照；coastal patch 仍应优先看 OSM/RESDC/商业海岸线。"
      : "DataV 可做县区结构对照；生产精度仍需授权高精度源。";
    sampleRegions.push({
      id: region.id,
      name: region.name,
      riskType: region.riskType,
      notes: region.notes,
      currentMetrics: current,
      datavMetrics: datav.aggregate,
      datavDownloads: datav.downloads,
      comparison,
      assessment,
    });
  }

  const osmMetadata = await Promise.all([
    headMetadata("https://download.geofabrik.de/asia/china/guangdong-latest.osm.pbf"),
    headMetadata("https://download.geofabrik.de/asia/china/guangdong-latest-free.shp.zip"),
    headMetadata("https://download.geofabrik.de/asia/china/shanghai-latest.osm.pbf"),
    headMetadata("https://download.geofabrik.de/asia/china/zhejiang-latest.osm.pbf"),
    headMetadata("https://download.geofabrik.de/asia/china/fujian-latest.osm.pbf"),
    headMetadata("https://download.geofabrik.de/asia/china/sichuan-latest.osm.pbf"),
    headMetadata("https://download.geofabrik.de/asia/china/chongqing-latest.osm.pbf"),
    headMetadata("https://osmdata.openstreetmap.de/download/coastlines-split-4326.zip"),
    headMetadata("https://osmdata.openstreetmap.de/download/land-polygons-split-4326.zip"),
    headMetadata("https://osmdata.openstreetmap.de/download/water-polygons-split-4326.zip"),
  ]);

  const result = {
    phase: "G2-A",
    generatedAt: new Date().toISOString(),
    sampleRegions,
    testedSources: sourceNotes(),
    downloadedSmallSamples,
    manualRequiredSources: [
      {
        id: "resdc-geodata",
        askUserFor: [
          "县界/乡镇界线样本",
          "海岸线/岛屿/水系/湖泊样本",
          "商用授权条款",
          "再分发和公开 PMTiles 派生权限",
          "坐标系和 adcode 字段说明",
        ],
      },
      {
        id: "commercial-survey",
        askUserFor: [
          "中国省/市/县/乡镇/村级行政区边界报价",
          "海岸线/岛屿/河口/水系数据报价",
          "WGS84/GCJ-02/CGCS2000 交付能力",
          "SHP/GeoJSON/PMTiles 派生授权",
          "审图号和公开发布合规说明",
        ],
      },
    ],
    osmAndGeofabrikMetadata: osmMetadata,
    recommendedMainSourceCandidates: ["commercial-survey", "resdc-geodata_if_license_approved"],
    recommendedPatchSourceCandidates: ["osmdata-coastline_after_odbl_strategy", "resdc-geodata_coastline_water_islands", "commercial-survey_high_precision_coastal"],
    doNotUseForProduction: ["datav-geoatlas_without_license_review", "current_2025_unknown_netdisk_source", "osm_data_inside_closed_admin_database_without_odbl_strategy"],
    nextActions: [
      "pause_visual_admin_polishing_until_source_quality_improves",
      "request_resdc_or_commercial_samples_and_license_terms",
      "design_osm_odbl_isolation_before_coastal_patch",
      "optionally_run_pmtiles_split_as_engineering_only_performance_test",
      "do_not_mark_any_current_admin_source_productionApproved_true",
    ],
  };

  writeJson(`${OUT_DIR}/g2-sample-debug-summary.json`, result);
  writeJson(JSON_PATH, result);
  ensureDir(dirname(DOC_PATH));
  writeFileSync(absolute(DOC_PATH), docFor(result));
  console.log(JSON.stringify({
    ok: true,
    sampleRegions: sampleRegions.length,
    downloadedSmallSamples: downloadedSmallSamples.length,
    outputDir: OUT_DIR,
    json: JSON_PATH,
    doc: DOC_PATH,
  }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
