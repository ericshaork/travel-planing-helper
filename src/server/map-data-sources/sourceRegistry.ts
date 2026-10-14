export type MapSourceCategory = "admin" | "coastline" | "poi" | "transport" | "mixed";
export type MapSourceAccessMode = "directDownload" | "indexCrawl" | "api" | "manual";
export type MapSourceStorageTarget = "raw OSS" | "public OSS" | "Supabase" | "git" | "manual-review";
export type MapSourceCrawlerStatus = "ready" | "index-only" | "manual-only" | "baseline-local" | "blocked";

export type MapSampleRegion = {
  id: string;
  name: string;
  adcodes?: string[];
  notes: string;
};

export type MapDataSource = {
  sourceId: string;
  name: string;
  category: MapSourceCategory;
  accessMode: MapSourceAccessMode;
  licenseRisk: "low" | "medium" | "high" | "unknown";
  attributionRequired: boolean | "unknown";
  productionApproved: false;
  sampleRegions: string[];
  expectedFormats: string[];
  storageTarget: MapSourceStorageTarget;
  crawlerStatus: MapSourceCrawlerStatus;
  homepage?: string;
  notes: string;
};

export const G4_SAMPLE_REGIONS: MapSampleRegion[] = [
  {
    id: "guangdong",
    name: "广东省",
    adcodes: ["440000"],
    notes: "Province-level admin sample and baseline for Pearl River Delta follow-up.",
  },
  {
    id: "shenzhen-dongguan-huizhou",
    name: "深圳 / 东莞 / 惠州边界",
    adcodes: ["440300", "441900", "441300"],
    notes: "High-risk county/prefecture edge sample for PRD boundary precision.",
  },
  {
    id: "guangzhou-foshan",
    name: "广州 / 佛山边界",
    adcodes: ["440100", "440600"],
    notes: "Urban adjacency sample for prefecture/county boundary consistency.",
  },
  {
    id: "xiamen-coastal",
    name: "厦门沿海",
    adcodes: ["350200"],
    notes: "Coastal and island boundary sample.",
  },
  {
    id: "zhoushan-islands",
    name: "舟山群岛",
    adcodes: ["330900"],
    notes: "Dense island sample for coastline and small-island patch evaluation.",
  },
  {
    id: "shanghai-coastal",
    name: "上海沿海 / 崇明",
    adcodes: ["310000", "310151"],
    notes: "Changjiang estuary and coastal reclamation sample.",
  },
];

export const G4_MAP_SOURCE_REGISTRY: MapDataSource[] = [
  {
    sourceId: "datav",
    name: "DataV / GeoAtlas",
    category: "admin",
    accessMode: "directDownload",
    licenseRisk: "high",
    attributionRequired: "unknown",
    productionApproved: false,
    sampleRegions: G4_SAMPLE_REGIONS.map((region) => region.id),
    expectedFormats: ["GeoJSON"],
    storageTarget: "raw OSS",
    crawlerStatus: "ready",
    homepage: "https://geo.datav.aliyun.com/areas_v3/bound/",
    notes: "Automatically downloadable by adcode. Use as comparison/sample source only until license and redistribution terms are confirmed.",
  },
  {
    sourceId: "osm-geofabrik",
    name: "OSM / Geofabrik",
    category: "mixed",
    accessMode: "indexCrawl",
    licenseRisk: "medium",
    attributionRequired: true,
    productionApproved: false,
    sampleRegions: ["guangdong", "xiamen-coastal", "zhoushan-islands", "shanghai-coastal"],
    expectedFormats: ["PBF", "SHP ZIP", "metadata"],
    storageTarget: "raw OSS",
    crawlerStatus: "index-only",
    homepage: "https://download.geofabrik.de/asia/china.html",
    notes: "Province extracts are often over the 100MB G4.1 limit. Record index and sizes; do not download large PBF/SHP files in this phase. ODbL strategy required.",
  },
  {
    sourceId: "osm-coastline",
    name: "OSM coastline / osmdata",
    category: "coastline",
    accessMode: "indexCrawl",
    licenseRisk: "medium",
    attributionRequired: true,
    productionApproved: false,
    sampleRegions: ["xiamen-coastal", "zhoushan-islands", "shanghai-coastal"],
    expectedFormats: ["SHP ZIP", "metadata"],
    storageTarget: "raw OSS",
    crawlerStatus: "index-only",
    homepage: "https://osmdata.openstreetmap.de/",
    notes: "Best candidate for coastline/land/water patch comparison, but public downloads are global packages and usually exceed the small-sample limit.",
  },
  {
    sourceId: "geojsoncn",
    name: "GeoJSONcn / GeoJSON CDN mirrors",
    category: "admin",
    accessMode: "directDownload",
    licenseRisk: "high",
    attributionRequired: "unknown",
    productionApproved: false,
    sampleRegions: ["guangdong", "shenzhen-dongguan-huizhou", "guangzhou-foshan"],
    expectedFormats: ["GeoJSON"],
    storageTarget: "raw OSS",
    crawlerStatus: "ready",
    homepage: "https://geojson.cn/",
    notes: "Treat as mirror/redistribution comparison source. Many public mirrors derive from DataV and need license review before production use.",
  },
  {
    sourceId: "cn-atlas-ruiduo",
    name: "Ruiduobao-derived cn-atlas and similar mirrors",
    category: "admin",
    accessMode: "indexCrawl",
    licenseRisk: "high",
    attributionRequired: "unknown",
    productionApproved: false,
    sampleRegions: ["guangdong", "shenzhen-dongguan-huizhou", "guangzhou-foshan"],
    expectedFormats: ["GeoJSON", "TopoJSON", "metadata"],
    storageTarget: "manual-review",
    crawlerStatus: "index-only",
    homepage: "https://github.com/BarbarossaWang/cn-atlas",
    notes: "Candidate only. Record index and repository metadata first; do not treat as production source without upstream license confirmation.",
  },
  {
    sourceId: "local-2025-admin-baseline",
    name: "Current local 2025 administrative boundary baseline",
    category: "admin",
    accessMode: "manual",
    licenseRisk: "high",
    attributionRequired: "unknown",
    productionApproved: false,
    sampleRegions: G4_SAMPLE_REGIONS.map((region) => region.id),
    expectedFormats: ["GeoJSON", "SHP"],
    storageTarget: "raw OSS",
    crawlerStatus: "baseline-local",
    notes: "Existing local baseline only. Do not re-download in G4.1.",
  },
];
