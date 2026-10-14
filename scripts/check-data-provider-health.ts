const { existsSync, readFileSync, writeFileSync, mkdirSync } = require("node:fs");
const { dirname, resolve } = require("node:path");

type ProviderStatus = "configured" | "missing" | "placeholder" | "needs_test" | "reachable" | "failed";
type CapabilityStatus = "primary" | "partial" | "fallback" | "missing";
type RolloutPriority = "P0" | "P1" | "P2" | "P3";

type Capability =
  | "geocode"
  | "reverseGeocode"
  | "poiSearch"
  | "placeDetails"
  | "openingHours"
  | "ticketInfo"
  | "images"
  | "encyclopediaIntro"
  | "adminBoundary"
  | "routeEstimate"
  | "transit"
  | "traffic"
  | "weather"
  | "weatherAlert"
  | "airQuality"
  | "events"
  | "hotels"
  | "priceReference"
  | "sourceEvidence";

type EnvValueState = {
  name: string;
  present: boolean;
  hasValue: boolean;
  placeholder: boolean;
};

type ProviderDefinition = {
  provider: string;
  category: string;
  checkedVars: string[];
  requiredAny?: string[];
  requiredAll?: string[];
  capabilities: Partial<Record<Capability, CapabilityStatus>>;
  recommendedUse: string;
  priority: RolloutPriority;
  blockingIssue: string;
  nextAction: string;
  liveTestPolicy: "none" | "public_only" | "manual";
};

type ProviderHealth = ProviderDefinition & {
  status: ProviderStatus;
  envStates: EnvValueState[];
  missingRequiredVars: string[];
  placeholderVars: string[];
  emptyVars: string[];
};

const DEFAULT_ENV_PATH = resolve(process.cwd(), "WANDERLY_V2_FULL_ENV_TEMPLATE.env.local");
const DEFAULT_REPORT_PATH = resolve(process.cwd(), "docs", "WANDERLY_V2_PROVIDER_CAPABILITY_MATRIX.md");

const GOOGLE_STANDARD_MAPS_VARS = ["GOOGLE_MAPS_API_KEY", "GOOGLE_GEOCODING_API_KEY"] as const;
const GOOGLE_STANDARD_PLACES_VARS = ["GOOGLE_PLACES_API_KEY", "GOOGLE_PLACES_PHOTO_API_KEY"] as const;
const GOOGLE_STANDARD_ROUTES_VARS = ["GOOGLE_ROUTES_API_KEY", "GOOGLE_DIRECTIONS_API_KEY", "GOOGLE_DISTANCE_MATRIX_API_KEY"] as const;
const GOOGLE_LEGACY_ALIAS_VARS = ["Google_MAP_API"] as const;
const TAIWAN_MOENV_DATASET_VARS = [
  "TAIWAN_MOENV_AQI_DATASET",
  "TAIWAN_MOENV_AIR_QUALITY_STATION_DATASET",
  "TAIWAN_MOENV_PM25_DATASET",
  "TAIWAN_MOENV_UVI_DATASET",
] as const;
const TAIWAN_MOENV_LEGACY_ENDPOINT_VARS = [
  "TAIWAN_MOENV_AQI_ENDPOINT",
  "TAIWAN_MOENV_PM25_ENDPOINT",
  "TAIWAN_MOENV_UVI_ENDPOINT",
] as const;

const CAPABILITIES: Capability[] = [
  "geocode",
  "reverseGeocode",
  "poiSearch",
  "placeDetails",
  "openingHours",
  "ticketInfo",
  "images",
  "encyclopediaIntro",
  "adminBoundary",
  "routeEstimate",
  "transit",
  "traffic",
  "weather",
  "weatherAlert",
  "airQuality",
  "events",
  "hotels",
  "priceReference",
  "sourceEvidence",
];

const PLACEHOLDER_PATTERNS = [
  /^$/,
  /^your[-_ ]?/i,
  /^replace[-_ ]?me$/i,
  /^changeme$/i,
  /^todo$/i,
  /^tbd$/i,
  /^xxx+$/i,
  /^test[-_ ]?key$/i,
  /^demo[-_ ]?key$/i,
  /^example[-_ ]?/i,
  /^<.*>$/,
  /^\{.*\}$/,
  /^填/,
  /^请填/,
  /your_api_key/i,
  /api_key_here/i,
  /secret_here/i,
  /token_here/i,
];

function isPlaceholderValue(value: string): boolean {
  const trimmed = value.trim();
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function parseEnvFile(envPath: string): Map<string, string> {
  const values = new Map<string, string>();
  if (!existsSync(envPath)) return values;

  const text = readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const name = match[1];
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values.set(name, value);
  }

  return values;
}

function stateFor(envValues: Map<string, string>, name: string): EnvValueState {
  const present = envValues.has(name);
  const value = envValues.get(name) ?? "";
  const hasValue = present && value.trim().length > 0;
  return {
    name,
    present,
    hasValue,
    placeholder: present && hasValue && isPlaceholderValue(value),
  };
}

function makeCapabilities(input: Partial<Record<Capability, CapabilityStatus>>): Partial<Record<Capability, CapabilityStatus>> {
  return input;
}

function providerDefinitions(): ProviderDefinition[] {
  return [
    {
      provider: "AMap / 高德 JS SDK",
      category: "中国大陆 / 地图",
      checkedVars: ["NEXT_PUBLIC_AMAP_JS_KEY", "NEXT_PUBLIC_AMAP_SECURITY_JS_CODE"],
      requiredAll: ["NEXT_PUBLIC_AMAP_JS_KEY"],
      capabilities: makeCapabilities({ geocode: "fallback", poiSearch: "fallback", adminBoundary: "partial", traffic: "partial", sourceEvidence: "partial" }),
      recommendedUse: "Map Studio 前端底图、地点显示和交互，不承担服务端事实入库。",
      priority: "P0",
      blockingIssue: "JS key 缺失会影响地图前端加载；security js code 取决于高德控制台配置。",
      nextAction: "保持为浏览器公开 key；不要把服务端 Web service key 放入 NEXT_PUBLIC。",
      liveTestPolicy: "manual",
    },
    {
      provider: "AMap / 高德 Web Service",
      category: "中国大陆 / 地点路线边界",
      checkedVars: ["AMAP_API_KEY"],
      requiredAll: ["AMAP_API_KEY"],
      capabilities: makeCapabilities({ geocode: "primary", reverseGeocode: "primary", poiSearch: "primary", placeDetails: "partial", openingHours: "partial", images: "partial", adminBoundary: "primary", routeEstimate: "primary", transit: "partial", traffic: "partial", sourceEvidence: "primary" }),
      recommendedUse: "中国大陆 P0 地点、路线、行政区划主 Provider，优先接入 Data Hub。",
      priority: "P0",
      blockingIssue: "需要确认 key 启用的 Web Service 权限、配额和 IP/Referer 限制。",
      nextAction: "Step 1 先跑 POI search、place detail、route estimate、district boundary 的最小 ingest 闭环。",
      liveTestPolicy: "manual",
    },
    {
      provider: "Baidu Map / 百度地图",
      category: "中国大陆 / 地图备选",
      checkedVars: ["BAIDU_MAP_AK"],
      requiredAll: ["BAIDU_MAP_AK"],
      capabilities: makeCapabilities({ geocode: "primary", reverseGeocode: "primary", poiSearch: "partial", placeDetails: "partial", routeEstimate: "partial", transit: "partial", traffic: "partial", sourceEvidence: "partial" }),
      recommendedUse: "中国大陆备选地理编码、地点和路线 Provider，用于交叉校验或高德失败兜底。",
      priority: "P1",
      blockingIssue: "当前 Data Hub providerRegistry 尚未接入百度 adapter。",
      nextAction: "先保留为 P1 fallback；等 AMap 闭环稳定后再做百度 normalization。",
      liveTestPolicy: "manual",
    },
    {
      provider: "Google Maps",
      category: "全球 / 地图地理编码",
      checkedVars: [...GOOGLE_STANDARD_MAPS_VARS, ...GOOGLE_LEGACY_ALIAS_VARS],
      requiredAny: [...GOOGLE_STANDARD_MAPS_VARS, ...GOOGLE_LEGACY_ALIAS_VARS],
      capabilities: makeCapabilities({ geocode: "primary", reverseGeocode: "primary", adminBoundary: "partial", sourceEvidence: "primary" }),
      recommendedUse: "全球地理编码和目的地解析主候选，不直接替代中国大陆高德路径。",
      priority: "P0",
      blockingIssue: "需要确认 Google Cloud 已启用 Geocoding/Maps API、账单和地区合规；旧 alias `Google_MAP_API` 仅兼容读取。",
      nextAction: "迁移到 `GOOGLE_MAPS_API_KEY` / `GOOGLE_GEOCODING_API_KEY` 等标准变量，逐步移除 `Google_MAP_API` 依赖。",
      liveTestPolicy: "manual",
    },
    {
      provider: "Google Places",
      category: "全球 / 地点详情",
      checkedVars: [...GOOGLE_STANDARD_PLACES_VARS, "GOOGLE_MAPS_API_KEY", ...GOOGLE_LEGACY_ALIAS_VARS],
      requiredAny: ["GOOGLE_PLACES_API_KEY", "GOOGLE_MAPS_API_KEY", ...GOOGLE_LEGACY_ALIAS_VARS],
      capabilities: makeCapabilities({ poiSearch: "primary", placeDetails: "primary", openingHours: "primary", images: "primary", hotels: "fallback", sourceEvidence: "primary" }),
      recommendedUse: "全球地点搜索、地点详情、照片和营业时间主候选。",
      priority: "P0",
      blockingIssue: "当前 GooglePlacesDataHubProvider 还是空 adapter，尚未实现真实调用；旧 alias `Google_MAP_API` 仅兼容读取。",
      nextAction: "标准化为 `GOOGLE_PLACES_API_KEY` / `GOOGLE_PLACES_PHOTO_API_KEY`，Step 2 再实现 text search/details/photo 最小 adapter。",
      liveTestPolicy: "manual",
    },
    {
      provider: "Google Routes / Directions",
      category: "全球 / 路线",
      checkedVars: [...GOOGLE_STANDARD_ROUTES_VARS, "GOOGLE_MAPS_API_KEY", ...GOOGLE_LEGACY_ALIAS_VARS],
      requiredAny: [...GOOGLE_STANDARD_ROUTES_VARS, "GOOGLE_MAPS_API_KEY", ...GOOGLE_LEGACY_ALIAS_VARS],
      capabilities: makeCapabilities({ routeEstimate: "primary", transit: "primary", traffic: "partial", sourceEvidence: "primary" }),
      recommendedUse: "全球路线耗时和多交通模式估算，适合作为 GraphHopper/ORS 的商业补充。",
      priority: "P1",
      blockingIssue: "需要确认启用 Routes/Directions/Distance Matrix 哪个 API，计费和配额差异较大；旧 alias `Google_MAP_API` 仅兼容读取。",
      nextAction: "迁移到标准 Google route 变量；先不接主流程，等基础 route_cache 结构稳定后再接。",
      liveTestPolicy: "manual",
    },
    {
      provider: "OSM Nominatim",
      category: "全球 / 开放地理编码",
      checkedVars: ["NOMINATIM_BASE_URL", "OSM_USER_AGENT"],
      requiredAll: ["NOMINATIM_BASE_URL", "OSM_USER_AGENT"],
      capabilities: makeCapabilities({ geocode: "fallback", reverseGeocode: "fallback", placeDetails: "partial", sourceEvidence: "partial" }),
      recommendedUse: "全球开放地理编码 fallback，必须低频、缓存和带合规 User-Agent。",
      priority: "P1",
      blockingIssue: "公开 Nominatim 不适合高频生产请求。",
      nextAction: "只在 Data Hub 后台低频补全使用，前面加缓存和限流。",
      liveTestPolicy: "public_only",
    },
    {
      provider: "Overpass",
      category: "全球 / OSM 查询",
      checkedVars: ["OVERPASS_API_URL", "OSM_USER_AGENT"],
      requiredAll: ["OVERPASS_API_URL"],
      capabilities: makeCapabilities({ poiSearch: "fallback", placeDetails: "partial", openingHours: "partial", adminBoundary: "partial", sourceEvidence: "partial" }),
      recommendedUse: "开放 POI、边界和 OSM tag 补充，适合缺口填补。",
      priority: "P1",
      blockingIssue: "Overpass 查询容易慢或被限流，不适合请求时实时查。",
      nextAction: "只做后台 job 和缓存，不要直接挂到用户交互链路。",
      liveTestPolicy: "public_only",
    },
    {
      provider: "Wikimedia Commons",
      category: "全球 / 图片媒体",
      checkedVars: ["WIKIMEDIA_COMMONS_API_BASE", "WIKIMEDIA_COMMONS_API_URL", "WIKIPEDIA_USER_AGENT"],
      requiredAny: ["WIKIMEDIA_COMMONS_API_BASE", "WIKIMEDIA_COMMONS_API_URL"],
      capabilities: makeCapabilities({ images: "primary", sourceEvidence: "primary" }),
      recommendedUse: "有授权信息的景点图片候选，不替代商业图片源。",
      priority: "P0",
      blockingIssue: "需要保存 source_url、license、author、language 和 fetched_at。",
      nextAction: "优先补 image source schema，再做图片候选抓取。",
      liveTestPolicy: "public_only",
    },
    {
      provider: "Wikipedia zh/en",
      category: "全球 / 百科文本",
      checkedVars: ["WIKIPEDIA_ZH_API_BASE", "WIKIPEDIA_EN_API_BASE", "WIKIPEDIA_API_URL", "WIKIPEDIA_USER_AGENT"],
      requiredAny: ["WIKIPEDIA_ZH_API_BASE", "WIKIPEDIA_EN_API_BASE", "WIKIPEDIA_API_URL"],
      capabilities: makeCapabilities({ encyclopediaIntro: "primary", images: "partial", sourceEvidence: "primary" }),
      recommendedUse: "目的地和景点百科简介、别名、基础背景，必须带来源。",
      priority: "P0",
      blockingIssue: "百科内容不是实时开放时间或票价来源。",
      nextAction: "作为 Step 1 的非敏感 Provider，可优先实现 search/extract normalize。",
      liveTestPolicy: "public_only",
    },
    {
      provider: "Wikidata SPARQL",
      category: "全球 / 知识图谱",
      checkedVars: ["WIKIDATA_SPARQL_ENDPOINT", "WIKIDATA_SPARQL_URL", "WIKIPEDIA_USER_AGENT"],
      requiredAny: ["WIKIDATA_SPARQL_ENDPOINT", "WIKIDATA_SPARQL_URL"],
      capabilities: makeCapabilities({ placeDetails: "partial", encyclopediaIntro: "partial", images: "partial", sourceEvidence: "primary" }),
      recommendedUse: "地点别名、实体 ID、跨语言链接和 Commons 关联。",
      priority: "P0",
      blockingIssue: "SPARQL 查询需要限流和缓存，不适合用户请求时临时拼复杂查询。",
      nextAction: "先做 place_external_ids 的 Wikidata QID 映射。",
      liveTestPolicy: "public_only",
    },
    {
      provider: "GeoNames",
      category: "全球 / 地名",
      checkedVars: ["GEONAMES_USERNAME", "GEONAMES_BASE_URL"],
      requiredAll: ["GEONAMES_USERNAME"],
      capabilities: makeCapabilities({ geocode: "fallback", reverseGeocode: "fallback", adminBoundary: "partial", sourceEvidence: "partial" }),
      recommendedUse: "全球城市、国家、行政层级地名 fallback。",
      priority: "P1",
      blockingIssue: "免费账户额度有限，且字段粒度不等同景点详情。",
      nextAction: "用于目的地标准化，不要直接做景点事实源。",
      liveTestPolicy: "manual",
    },
    {
      provider: "GraphHopper",
      category: "全球 / 路线",
      checkedVars: ["GRAPHHOPPER_API_KEY", "GRAPHHOPPER_BASE_URL"],
      requiredAll: ["GRAPHHOPPER_API_KEY", "GRAPHHOPPER_BASE_URL"],
      capabilities: makeCapabilities({ routeEstimate: "primary", traffic: "missing", sourceEvidence: "primary" }),
      recommendedUse: "全球步行/驾车路线估算候选，适合 route_cache。",
      priority: "P0",
      blockingIssue: "需要确认套餐、限额和是否覆盖公共交通。",
      nextAction: "和 OpenRouteService 二选一先接 route estimate 最小闭环。",
      liveTestPolicy: "manual",
    },
    {
      provider: "OpenRouteService",
      category: "全球 / 路线",
      checkedVars: ["OPENROUTESERVICE_API_KEY", "OPENROUTESERVICE_BASE_URL"],
      requiredAll: ["OPENROUTESERVICE_API_KEY", "OPENROUTESERVICE_BASE_URL"],
      capabilities: makeCapabilities({ routeEstimate: "primary", traffic: "missing", sourceEvidence: "primary" }),
      recommendedUse: "全球路线估算候选，适合和 GraphHopper 形成 fallback。",
      priority: "P0",
      blockingIssue: "需要确认配额和 profile 覆盖。",
      nextAction: "先实现 walking/driving duration normalize，写入 route_cache。",
      liveTestPolicy: "manual",
    },
    {
      provider: "OpenTripMap",
      category: "全球 / 旅游 POI",
      checkedVars: ["OPENTRIPMAP_API_KEY", "OPENTRIPMAP_BASE_URL"],
      requiredAll: ["OPENTRIPMAP_API_KEY", "OPENTRIPMAP_BASE_URL"],
      capabilities: makeCapabilities({ poiSearch: "primary", placeDetails: "partial", images: "partial", encyclopediaIntro: "partial", sourceEvidence: "primary" }),
      recommendedUse: "全球旅游 POI 补充源，适合非中国目的地景点召回。",
      priority: "P1",
      blockingIssue: "分类、质量和覆盖需要抽样校验。",
      nextAction: "先选 3 个海外城市小样本做质量评估。",
      liveTestPolicy: "manual",
    },
    {
      provider: "Foursquare",
      category: "全球 / POI",
      checkedVars: ["FOURSQUARE_API_KEY", "FOURSQUARE_BASE_URL"],
      requiredAll: ["FOURSQUARE_API_KEY", "FOURSQUARE_BASE_URL"],
      capabilities: makeCapabilities({ poiSearch: "primary", placeDetails: "primary", openingHours: "partial", images: "partial", hotels: "partial", sourceEvidence: "primary" }),
      recommendedUse: "全球 POI、餐饮、酒店和地点详情增强。",
      priority: "P1",
      blockingIssue: "商业 API 成本和字段许可要确认。",
      nextAction: "暂不进 P0；等核心 Data Hub 表稳定后再接。",
      liveTestPolicy: "manual",
    },
    {
      provider: "SerpApi",
      category: "全球 / 搜索兜底",
      checkedVars: ["SERPAPI_API_KEY", "SERPAPI_GOOGLE_MAPS_URL"],
      requiredAll: ["SERPAPI_API_KEY"],
      capabilities: makeCapabilities({ poiSearch: "fallback", placeDetails: "fallback", events: "fallback", priceReference: "fallback", sourceEvidence: "partial" }),
      recommendedUse: "搜索和事件 fallback，不作为权威事实主源。",
      priority: "P1",
      blockingIssue: "搜索结果不是结构化权威数据，需要强 source evidence。",
      nextAction: "只在明确缺口时用作候选召回，不直接写事实字段。",
      liveTestPolicy: "manual",
    },
    {
      provider: "QWeather / 和风天气",
      category: "天气",
      checkedVars: ["QWEATHER_API_KEY", "QWEATHER_BASE_URL", "WEATHER_PROVIDER"],
      requiredAll: ["QWEATHER_API_KEY", "QWEATHER_BASE_URL"],
      capabilities: makeCapabilities({ weather: "primary", weatherAlert: "primary", airQuality: "partial", sourceEvidence: "primary" }),
      recommendedUse: "中国和全球天气上下文主 Provider，直接影响行程可信度。",
      priority: "P0",
      blockingIssue: "WeatherDataHubProvider 目前只预留，不真实调用外部天气 API。",
      nextAction: "Step 1 实现天气 snapshot normalize，API 失败时保持不阻断生成。",
      liveTestPolicy: "manual",
    },
    {
      provider: "Caiyun / 彩云天气",
      category: "天气",
      checkedVars: ["CAIYUN_WEATHER_API_KEY", "CAIYUN_WEATHER_BASE_URL"],
      requiredAll: ["CAIYUN_WEATHER_API_KEY", "CAIYUN_WEATHER_BASE_URL"],
      capabilities: makeCapabilities({ weather: "primary", weatherAlert: "partial", airQuality: "partial", sourceEvidence: "primary" }),
      recommendedUse: "中国天气体验增强，可作为 QWeather fallback。",
      priority: "P1",
      blockingIssue: "需要确认 API 版本和分钟级预报字段。",
      nextAction: "不进第一批，先作为天气二期增强。",
      liveTestPolicy: "manual",
    },
    {
      provider: "OpenWeather",
      category: "天气",
      checkedVars: ["OPENWEATHER_API_KEY", "OPENWEATHER_BASE_URL"],
      requiredAll: ["OPENWEATHER_API_KEY", "OPENWEATHER_BASE_URL"],
      capabilities: makeCapabilities({ weather: "primary", weatherAlert: "partial", airQuality: "partial", sourceEvidence: "primary" }),
      recommendedUse: "全球天气 fallback。",
      priority: "P1",
      blockingIssue: "预警、空气质量和套餐字段需要确认。",
      nextAction: "可作为全球天气 fallback，排在 QWeather 之后。",
      liveTestPolicy: "manual",
    },
    {
      provider: "WeatherAPI",
      category: "天气",
      checkedVars: ["WEATHERAPI_KEY", "WEATHERAPI_BASE_URL"],
      requiredAll: ["WEATHERAPI_KEY", "WEATHERAPI_BASE_URL"],
      capabilities: makeCapabilities({ weather: "primary", weatherAlert: "partial", airQuality: "partial", sourceEvidence: "primary" }),
      recommendedUse: "全球天气 fallback 和天气文案补充。",
      priority: "P1",
      blockingIssue: "需确认套餐、预警覆盖和语言参数。",
      nextAction: "等天气 snapshot schema 固定后再接。",
      liveTestPolicy: "manual",
    },
    {
      provider: "Tomorrow.io",
      category: "天气",
      checkedVars: ["TOMORROW_API_KEY", "TOMORROW_BASE_URL"],
      requiredAll: ["TOMORROW_API_KEY"],
      capabilities: makeCapabilities({ weather: "primary", weatherAlert: "partial", airQuality: "partial", sourceEvidence: "primary" }),
      recommendedUse: "未来可选全球天气 Provider。",
      priority: "P3",
      blockingIssue: "当前模板未发现 Tomorrow.io 配置。",
      nextAction: "暂不接，除非后续明确需要其分钟级或特殊天气能力。",
      liveTestPolicy: "manual",
    },
    {
      provider: "Taiwan TDX",
      category: "港澳台 / 台湾交通旅游",
      checkedVars: ["TAIWAN_TDX_CLIENT_ID", "TAIWAN_TDX_CLIENT_SECRET", "TAIWAN_TDX_TOKEN_URL", "TAIWAN_TDX_API_BASE", "TAIWAN_TDX_TOURISM_SCENIC_SPOT_PATH", "TAIWAN_TDX_TOURISM_RESTAURANT_PATH", "TAIWAN_TDX_TOURISM_HOTEL_PATH", "TAIWAN_TDX_TOURISM_ACTIVITY_PATH"],
      requiredAll: ["TAIWAN_TDX_CLIENT_ID", "TAIWAN_TDX_CLIENT_SECRET", "TAIWAN_TDX_TOKEN_URL", "TAIWAN_TDX_API_BASE"],
      capabilities: makeCapabilities({ poiSearch: "primary", placeDetails: "partial", transit: "primary", events: "partial", hotels: "partial", sourceEvidence: "primary" }),
      recommendedUse: "台湾目的地、交通、观光、餐厅、酒店和活动增强。",
      priority: "P1",
      blockingIssue: "OAuth token 获取和缓存尚未接入。",
      nextAction: "作为台湾区域增强阶段独立实现，不进 P0。",
      liveTestPolicy: "manual",
    },
    {
      provider: "Taiwan CWA",
      category: "港澳台 / 台湾天气",
      checkedVars: ["TAIWAN_CWA_API_KEY", "TAIWAN_CWA_BASE_URL", "TAIWAN_CWA_FORECAST_36H_DATASET", "TAIWAN_CWA_WEEKLY_FORECAST_DATASET", "TAIWAN_CWA_CURRENT_WEATHER_DATASET", "TAIWAN_CWA_WEATHER_WARNING_DATASET"],
      requiredAll: ["TAIWAN_CWA_API_KEY", "TAIWAN_CWA_BASE_URL"],
      capabilities: makeCapabilities({ weather: "primary", weatherAlert: "primary", sourceEvidence: "primary" }),
      recommendedUse: "台湾官方天气和预警。",
      priority: "P1",
      blockingIssue: "需要 dataset 映射和 normalized weather format。",
      nextAction: "台湾阶段接入 weather_snapshots。",
      liveTestPolicy: "manual",
    },
    {
      provider: "Taiwan MOENV",
      category: "港澳台 / 台湾环境",
      checkedVars: ["TAIWAN_MOENV_API_KEY", "TAIWAN_MOENV_BASE_URL", ...TAIWAN_MOENV_DATASET_VARS, ...TAIWAN_MOENV_LEGACY_ENDPOINT_VARS],
      requiredAll: ["TAIWAN_MOENV_API_KEY", "TAIWAN_MOENV_BASE_URL"],
      capabilities: makeCapabilities({ airQuality: "primary", weather: "fallback", sourceEvidence: "primary" }),
      recommendedUse: "台湾空气质量、紫外线和环境提醒。",
      priority: "P1",
      blockingIssue: "建议使用 dataset code；旧 endpoint 变量仅兼容读取，且当前关键 dataset 可能为空。",
      nextAction: "迁移到 `TAIWAN_MOENV_*_DATASET` 命名，再接 airQuality snapshot。",
      liveTestPolicy: "manual",
    },
    {
      provider: "Taiwan Culture Cloud / iCulture",
      category: "港澳台 / 台湾活动文化",
      checkedVars: ["TAIWAN_CULTURE_CLOUD_BASE_URL", "TAIWAN_CULTURE_EVENTS_URL", "TAIWAN_CULTURE_EXHIBITIONS_URL", "TAIWAN_CULTURE_PERFORMANCES_URL", "TAIWAN_CULTURE_MUSEUMS_URL"],
      requiredAny: ["TAIWAN_CULTURE_EVENTS_URL", "TAIWAN_CULTURE_EXHIBITIONS_URL", "TAIWAN_CULTURE_PERFORMANCES_URL"],
      capabilities: makeCapabilities({ events: "primary", placeDetails: "partial", sourceEvidence: "primary" }),
      recommendedUse: "台湾展览、演出和活动增强。",
      priority: "P1",
      blockingIssue: "活动数据要处理日期、地点匹配和过期策略。",
      nextAction: "等 event_records schema 固定后接。",
      liveTestPolicy: "public_only",
    },
    {
      provider: "Taiwan Data.gov.tw",
      category: "港澳台 / 台湾开放数据",
      checkedVars: ["TAIWAN_OPEN_DATA_BASE_URL", "TAIPEI_OPEN_DATA_API_KEY", "TAIPEI_OPEN_DATA_BASE_URL", "NEW_TAIPEI_OPEN_DATA_BASE_URL", "TAICHUNG_OPEN_DATA_BASE_URL", "TAINAN_OPEN_DATA_BASE_URL", "KAOHSIUNG_OPEN_DATA_BASE_URL"],
      requiredAny: ["TAIWAN_OPEN_DATA_BASE_URL", "TAIPEI_OPEN_DATA_BASE_URL"],
      capabilities: makeCapabilities({ poiSearch: "fallback", events: "fallback", traffic: "partial", sourceEvidence: "partial" }),
      recommendedUse: "台湾城市开放数据补充。",
      priority: "P2",
      blockingIssue: "各城市 schema 差异大，不适合第一批接入。",
      nextAction: "按城市专题逐个抽样，不做统一大抓取。",
      liveTestPolicy: "public_only",
    },
    {
      provider: "Hong Kong HKO",
      category: "港澳台 / 香港天气",
      checkedVars: ["HK_HKO_CURRENT_WEATHER_URL", "HK_HKO_9DAY_FORECAST_URL", "HK_HKO_LOCAL_FORECAST_URL", "HK_HKO_WARNING_URL"],
      requiredAny: ["HK_HKO_CURRENT_WEATHER_URL", "HK_HKO_9DAY_FORECAST_URL"],
      capabilities: makeCapabilities({ weather: "primary", weatherAlert: "primary", sourceEvidence: "primary" }),
      recommendedUse: "香港官方天气和预警。",
      priority: "P1",
      blockingIssue: "需统一到 weather_snapshots，不要直接塞进计划文本。",
      nextAction: "港澳区域阶段优先接。",
      liveTestPolicy: "public_only",
    },
    {
      provider: "Hong Kong Data.gov.hk",
      category: "港澳台 / 香港开放数据",
      checkedVars: ["HK_LCSD_EVENTS_URL", "HK_LCSD_VENUES_URL", "HK_SMARTPLAY_URL", "HK_URBTIX_URL_TEMPLATE", "HK_TRANSPORT_ROUTE_URL", "HK_TRANSPORT_STOP_URL", "HK_TRANSPORT_STOP_SEQUENCE_URL", "HK_TRANSPORT_FARE_URL"],
      requiredAny: ["HK_LCSD_EVENTS_URL", "HK_LCSD_VENUES_URL", "HK_TRANSPORT_ROUTE_URL", "HK_TRANSPORT_BUS_ROUTES_URL"],
      capabilities: makeCapabilities({ events: "primary", ticketInfo: "partial", transit: "partial", placeDetails: "partial", sourceEvidence: "primary" }),
      recommendedUse: "香港活动、场馆、交通和票务线索。",
      priority: "P1",
      blockingIssue: "变量存在新旧命名并存，需要 alias 统一。",
      nextAction: "统一 HK_TRANSPORT_* 与 HK_TRANSPORT_BUS_* 命名后再接。",
      liveTestPolicy: "public_only",
    },
    {
      provider: "Macau SMG",
      category: "港澳台 / 澳门天气",
      checkedVars: ["MO_SMG_CURRENT_WEATHER_URL", "MO_SMG_CURRENT_WEATHER_SC_URL", "MO_SMG_CURRENT_WEATHER_EN_URL"],
      requiredAny: ["MO_SMG_CURRENT_WEATHER_URL", "MO_SMG_CURRENT_WEATHER_SC_URL"],
      capabilities: makeCapabilities({ weather: "primary", weatherAlert: "partial", sourceEvidence: "primary" }),
      recommendedUse: "澳门天气上下文。",
      priority: "P1",
      blockingIssue: "需要确认预报和预警 endpoint 是否另有来源。",
      nextAction: "港澳区域阶段接入 weather_snapshots。",
      liveTestPolicy: "public_only",
    },
    {
      provider: "Macau cultural / heritage / transport",
      category: "港澳台 / 澳门开放数据",
      checkedVars: ["MO_CULTURAL_HERITAGE_URL", "MO_MGTO_EVENTS_URL", "MO_MGTO_EVENT_CALENDAR_URL", "MO_DST_LICENSED_HOTELS_URL", "MO_DSAT_BUS_API_BASE", "MO_DSAT_BUS_TOKEN_URL", "MO_DSAT_BUS_UID", "MO_DSAT_BUS_PWD", "MO_DSAT_BUS_STOP_URL", "MO_DSAT_BUS_ROUTE_URL", "MO_DSAT_BUS_ROUTE_DETAIL_URL", "MO_DSAT_CARPARK_PRICE_URL", "MO_DSEC_MACAU_DATA_URL"],
      requiredAny: ["MO_CULTURAL_HERITAGE_URL", "MO_MGTO_EVENTS_URL", "MO_DST_LICENSED_HOTELS_URL", "MO_DSAT_BUS_API_BASE"],
      capabilities: makeCapabilities({ poiSearch: "partial", placeDetails: "partial", events: "partial", hotels: "partial", transit: "partial", traffic: "partial", sourceEvidence: "partial" }),
      recommendedUse: "澳门文化遗产、活动、酒店和交通区域增强。",
      priority: "P1",
      blockingIssue: "部分 DSAT 接口需要账号密码或 token，不应在前端暴露。",
      nextAction: "按澳门区域增强拆分 provider，不要混成一个大 adapter。",
      liveTestPolicy: "manual",
    },
    {
      provider: "Eventbrite",
      category: "活动 / 票务",
      checkedVars: ["EVENTBRITE_PRIVATE_TOKEN", "EVENTBRITE_BASE_URL"],
      requiredAll: ["EVENTBRITE_PRIVATE_TOKEN", "EVENTBRITE_BASE_URL"],
      capabilities: makeCapabilities({ events: "primary", ticketInfo: "partial", sourceEvidence: "primary" }),
      recommendedUse: "全球活动候选，不作为官方景点开放信息。",
      priority: "P2",
      blockingIssue: "活动 API 需要处理地区、日期和票务字段合规。",
      nextAction: "等 event_records schema 固定后接。",
      liveTestPolicy: "manual",
    },
    {
      provider: "PredictHQ",
      category: "活动 / 事件",
      checkedVars: ["PREDICTHQ_ACCESS_TOKEN", "PREDICTHQ_BASE_URL"],
      requiredAll: ["PREDICTHQ_ACCESS_TOKEN", "PREDICTHQ_BASE_URL"],
      capabilities: makeCapabilities({ events: "primary", sourceEvidence: "primary" }),
      recommendedUse: "大型事件、展会、活动趋势补充。",
      priority: "P2",
      blockingIssue: "事件分类和地理范围需要产品决策。",
      nextAction: "先不接主流程，作为事件增强候选。",
      liveTestPolicy: "manual",
    },
    {
      provider: "Ticketmaster",
      category: "活动 / 票务",
      checkedVars: ["TICKETMASTER_API_KEY", "TICKETMASTER_BASE_URL"],
      requiredAll: ["TICKETMASTER_API_KEY", "TICKETMASTER_BASE_URL"],
      capabilities: makeCapabilities({ events: "primary", ticketInfo: "primary", priceReference: "partial", sourceEvidence: "primary" }),
      recommendedUse: "演出、赛事和票务参考。",
      priority: "P2",
      blockingIssue: "票价和余票不能伪装成实时确定结果。",
      nextAction: "只存 source evidence 和 price reference，不承诺实时购票。",
      liveTestPolicy: "manual",
    },
    {
      provider: "SeatGeek",
      category: "活动 / 票务",
      checkedVars: ["SEATGEEK_CLIENT_ID", "SEATGEEK_CLIENT_SECRET", "SEATGEEK_BASE_URL"],
      requiredAll: ["SEATGEEK_CLIENT_ID", "SEATGEEK_CLIENT_SECRET", "SEATGEEK_BASE_URL"],
      capabilities: makeCapabilities({ events: "primary", ticketInfo: "partial", priceReference: "partial", sourceEvidence: "primary" }),
      recommendedUse: "北美活动和票务增强。",
      priority: "P2",
      blockingIssue: "当前 client id/secret 可能为空，且地域覆盖有限。",
      nextAction: "暂缓，除非明确做北美活动推荐。",
      liveTestPolicy: "manual",
    },
    {
      provider: "Amadeus",
      category: "酒店 / 旅行商业",
      checkedVars: ["AMADEUS_CLIENT_ID", "AMADEUS_CLIENT_SECRET", "AMADEUS_BASE_URL"],
      requiredAll: ["AMADEUS_CLIENT_ID", "AMADEUS_CLIENT_SECRET", "AMADEUS_BASE_URL"],
      capabilities: makeCapabilities({ hotels: "primary", priceReference: "partial", sourceEvidence: "primary" }),
      recommendedUse: "酒店/航旅商业数据候选。",
      priority: "P2",
      blockingIssue: "MVP 明确不做真实预订；价格和库存必须谨慎。",
      nextAction: "只作为住宿区域建议后的远期增强。",
      liveTestPolicy: "manual",
    },
    {
      provider: "Booking / RapidAPI",
      category: "酒店 / 住宿",
      checkedVars: ["BOOKING_AFFILIATE_ID", "BOOKING_API_KEY", "EXPEDIA_RAPID_API_KEY"],
      requiredAny: ["BOOKING_API_KEY", "EXPEDIA_RAPID_API_KEY"],
      capabilities: makeCapabilities({ hotels: "primary", priceReference: "partial", sourceEvidence: "primary" }),
      recommendedUse: "酒店搜索和价格参考远期候选。",
      priority: "P2",
      blockingIssue: "当前不应承诺实时房价、余量或预订。",
      nextAction: "暂不接 Data Hub 主线。",
      liveTestPolicy: "manual",
    },
    {
      provider: "Expedia",
      category: "酒店 / 住宿",
      checkedVars: ["EXPEDIA_RAPID_API_KEY", "EXPEDIA_RAPID_SECRET"],
      requiredAll: ["EXPEDIA_RAPID_API_KEY", "EXPEDIA_RAPID_SECRET"],
      capabilities: makeCapabilities({ hotels: "primary", priceReference: "partial", sourceEvidence: "primary" }),
      recommendedUse: "酒店商业数据远期候选。",
      priority: "P2",
      blockingIssue: "商业条款、缓存和展示限制需确认。",
      nextAction: "不进第一批。",
      liveTestPolicy: "manual",
    },
    {
      provider: "Agoda",
      category: "酒店 / 住宿",
      checkedVars: ["AGODA_AFFILIATE_ID", "AGODA_API_KEY"],
      requiredAll: ["AGODA_API_KEY"],
      capabilities: makeCapabilities({ hotels: "primary", priceReference: "partial", sourceEvidence: "primary" }),
      recommendedUse: "亚洲酒店商业数据远期候选。",
      priority: "P2",
      blockingIssue: "当前不应进入 MVP 主流程。",
      nextAction: "暂缓。",
      liveTestPolicy: "manual",
    },
    {
      provider: "Google Places lodging fallback",
      category: "酒店 / 住宿 fallback",
      checkedVars: ["GOOGLE_PLACES_API_KEY", "GOOGLE_MAPS_API_KEY", ...GOOGLE_LEGACY_ALIAS_VARS],
      requiredAny: ["GOOGLE_PLACES_API_KEY", "GOOGLE_MAPS_API_KEY", ...GOOGLE_LEGACY_ALIAS_VARS],
      capabilities: makeCapabilities({ hotels: "fallback", placeDetails: "partial", openingHours: "partial", images: "partial", sourceEvidence: "primary" }),
      recommendedUse: "住宿区域和酒店地点候选，不提供价格和余量。",
      priority: "P1",
      blockingIssue: "不能当作酒店预订能力；旧 alias `Google_MAP_API` 仅兼容读取。",
      nextAction: "随 Google Places adapter 支持 lodging 类型，并迁移到标准 Google Places 变量。",
      liveTestPolicy: "manual",
    },
    {
      provider: "Unsplash",
      category: "图片 / 媒体",
      checkedVars: ["UNSPLASH_ACCESS_KEY", "UNSPLASH_SECRET_KEY"],
      requiredAll: ["UNSPLASH_ACCESS_KEY"],
      capabilities: makeCapabilities({ images: "primary", sourceEvidence: "primary" }),
      recommendedUse: "城市氛围图和非地点事实图，需 attribution。",
      priority: "P2",
      blockingIssue: "不适合做精确景点事实图；授权和署名要落库。",
      nextAction: "等 image source schema 固定后接。",
      liveTestPolicy: "manual",
    },
    {
      provider: "Pexels",
      category: "图片 / 媒体",
      checkedVars: ["PEXELS_API_KEY"],
      requiredAll: ["PEXELS_API_KEY"],
      capabilities: makeCapabilities({ images: "primary", sourceEvidence: "primary" }),
      recommendedUse: "城市氛围图候选，需 attribution。",
      priority: "P2",
      blockingIssue: "不应替代地点官方图片或百科图片。",
      nextAction: "等图片治理规则完成后接。",
      liveTestPolicy: "manual",
    },
    {
      provider: "Pixabay",
      category: "图片 / 媒体",
      checkedVars: ["PIXABAY_API_KEY"],
      requiredAll: ["PIXABAY_API_KEY"],
      capabilities: makeCapabilities({ images: "primary", sourceEvidence: "primary" }),
      recommendedUse: "图片补充源。",
      priority: "P2",
      blockingIssue: "图片授权和相关性要审计。",
      nextAction: "暂不进 P0。",
      liveTestPolicy: "manual",
    },
    {
      provider: "Cloudinary",
      category: "图片 / 存储分发",
      checkedVars: ["CLOUDINARY_URL", "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"],
      requiredAny: ["CLOUDINARY_URL", "CLOUDINARY_CLOUD_NAME"],
      capabilities: makeCapabilities({ images: "fallback", sourceEvidence: "partial" }),
      recommendedUse: "图片存储、转码和分发，不是图片事实来源。",
      priority: "P2",
      blockingIssue: "不能把 Cloudinary 当成图片版权来源。",
      nextAction: "只在有合规图片源后作为 media pipeline 存储层。",
      liveTestPolicy: "manual",
    },
    {
      provider: "主 AI provider",
      category: "AI / 生成与结构化",
      checkedVars: ["AI_PROVIDER", "AI_API_KEY", "AI_BASE_URL", "AI_MODEL", "LLM_PROVIDER", "LLM_API_KEY", "LLM_BASE_URL", "LLM_MODEL"],
      requiredAny: ["AI_API_KEY", "LLM_API_KEY", "OPENAI_API_KEY", "DASHSCOPE_API_KEY", "DEEPSEEK_API_KEY"],
      capabilities: makeCapabilities({ encyclopediaIntro: "fallback", sourceEvidence: "fallback" }),
      recommendedUse: "结构化、摘要和规划，不能作为事实源。",
      priority: "P0",
      blockingIssue: "AI 输出必须引用 Data Hub source records，不能编造实时事实。",
      nextAction: "本轮不改 AI 生成流程；后续只接标准化上下文。",
      liveTestPolicy: "manual",
    },
    {
      provider: "OpenAI-compatible provider",
      category: "AI / OpenAI-compatible",
      checkedVars: ["OPENAI_API_KEY", "OPENAI_BASE_URL", "OPENAI_MODEL", "OPENAI_EMBEDDING_MODEL"],
      requiredAll: ["OPENAI_API_KEY", "OPENAI_BASE_URL"],
      capabilities: makeCapabilities({ encyclopediaIntro: "fallback", sourceEvidence: "fallback" }),
      recommendedUse: "LLM/embedding runtime 候选，不作为旅行事实源。",
      priority: "P1",
      blockingIssue: "需要明确它是否是主 AI provider，避免与 AI_* / LLM_* 重复。",
      nextAction: "统一 runtime 配置优先级。",
      liveTestPolicy: "manual",
    },
    {
      provider: "DashScope / Qwen",
      category: "AI / 阿里云百炼",
      checkedVars: ["DASHSCOPE_API_KEY", "DASHSCOPE_BASE_URL", "DASHSCOPE_MODEL", "DASHSCOPE_EMBEDDING_MODEL"],
      requiredAll: ["DASHSCOPE_API_KEY", "DASHSCOPE_BASE_URL"],
      capabilities: makeCapabilities({ encyclopediaIntro: "fallback", sourceEvidence: "fallback" }),
      recommendedUse: "中文规划和 embedding 候选。",
      priority: "P1",
      blockingIssue: "需要明确是否替代当前主 AI runtime。",
      nextAction: "不在 Data Hub Step 0 测生成。",
      liveTestPolicy: "manual",
    },
    {
      provider: "DeepSeek",
      category: "AI / LLM",
      checkedVars: ["DEEPSEEK_API_KEY", "DEEPSEEK_BASE_URL", "DEEPSEEK_MODEL"],
      requiredAll: ["DEEPSEEK_API_KEY", "DEEPSEEK_BASE_URL"],
      capabilities: makeCapabilities({ encyclopediaIntro: "fallback", sourceEvidence: "fallback" }),
      recommendedUse: "LLM runtime 候选。",
      priority: "P1",
      blockingIssue: "不能作为事实 provider。",
      nextAction: "保留为 AI runtime 选择，不纳入 Provider 事实接入。",
      liveTestPolicy: "manual",
    },
    {
      provider: "SiliconFlow",
      category: "AI / LLM与Embedding",
      checkedVars: ["SILICONFLOW_API_KEY", "SILICONFLOW_BASE_URL", "SILICONFLOW_MODEL", "SILICONFLOW_EMBEDDING_MODEL"],
      requiredAll: ["SILICONFLOW_API_KEY", "SILICONFLOW_BASE_URL"],
      capabilities: makeCapabilities({ encyclopediaIntro: "fallback", sourceEvidence: "fallback" }),
      recommendedUse: "LLM/embedding 备选。",
      priority: "P2",
      blockingIssue: "模型变量可能为空，需明确具体模型。",
      nextAction: "先不接主线。",
      liveTestPolicy: "manual",
    },
    {
      provider: "Gemini",
      category: "AI / LLM",
      checkedVars: ["GOOGLE_AI_API_KEY", "GEMINI_MODEL"],
      requiredAll: ["GOOGLE_AI_API_KEY"],
      capabilities: makeCapabilities({ encyclopediaIntro: "fallback", sourceEvidence: "fallback" }),
      recommendedUse: "LLM 备选。",
      priority: "P3",
      blockingIssue: "当前 key 可能为空。",
      nextAction: "暂不接。",
      liveTestPolicy: "manual",
    },
    {
      provider: "Anthropic",
      category: "AI / LLM",
      checkedVars: ["ANTHROPIC_API_KEY", "ANTHROPIC_BASE_URL", "ANTHROPIC_MODEL"],
      requiredAll: ["ANTHROPIC_API_KEY"],
      capabilities: makeCapabilities({ encyclopediaIntro: "fallback", sourceEvidence: "fallback" }),
      recommendedUse: "LLM 备选。",
      priority: "P3",
      blockingIssue: "当前 key 可能为空。",
      nextAction: "暂不接。",
      liveTestPolicy: "manual",
    },
    {
      provider: "Embedding provider",
      category: "AI / Embedding",
      checkedVars: ["EMBEDDING_PROVIDER", "EMBEDDING_MODEL", "OPENAI_EMBEDDING_MODEL", "DASHSCOPE_EMBEDDING_MODEL", "SILICONFLOW_EMBEDDING_MODEL"],
      requiredAny: ["EMBEDDING_PROVIDER", "OPENAI_EMBEDDING_MODEL", "DASHSCOPE_EMBEDDING_MODEL", "SILICONFLOW_EMBEDDING_MODEL"],
      capabilities: makeCapabilities({ poiSearch: "fallback", sourceEvidence: "fallback" }),
      recommendedUse: "未来地点/攻略语义检索，不替代结构化事实。",
      priority: "P1",
      blockingIssue: "需要向量表和去重策略，当前 Data Hub 表还未固定。",
      nextAction: "Step 1 先固定 facts/source 表，再考虑 embedding。",
      liveTestPolicy: "manual",
    },
    {
      provider: "Sentry",
      category: "监控 / 错误追踪",
      checkedVars: ["NEXT_PUBLIC_SENTRY_DSN", "SENTRY_DSN", "DSN"],
      requiredAny: ["NEXT_PUBLIC_SENTRY_DSN", "SENTRY_DSN", "DSN"],
      capabilities: makeCapabilities({ sourceEvidence: "fallback" }),
      recommendedUse: "错误追踪和 provider 失败观测。",
      priority: "P1",
      blockingIssue: "DSN 可公开但仍不应在文档输出真实值。",
      nextAction: "后续 provider job 增加错误事件，不在本轮改。",
      liveTestPolicy: "none",
    },
    {
      provider: "PostHog",
      category: "监控 / 产品分析",
      checkedVars: ["POSTHOG_KEY", "NEXT_PUBLIC_POSTHOG_KEY", "NEXT_PUBLIC_POSTHOG_HOST"],
      requiredAny: ["POSTHOG_KEY", "NEXT_PUBLIC_POSTHOG_KEY"],
      capabilities: makeCapabilities({ sourceEvidence: "fallback" }),
      recommendedUse: "产品使用分析，不参与旅行事实判断。",
      priority: "P2",
      blockingIssue: "需要隐私和埋点边界。",
      nextAction: "不在 Data Hub Step 0 接。",
      liveTestPolicy: "none",
    },
    {
      provider: "Supabase public anon",
      category: "数据库 / 只读公开数据",
      checkedVars: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
      requiredAll: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
      capabilities: makeCapabilities({ sourceEvidence: "primary" }),
      recommendedUse: "浏览器读取公开 Data Hub 数据和用户态功能。",
      priority: "P0",
      blockingIssue: "只允许读公开表；写入依赖 RLS 和服务端路径。",
      nextAction: "Step 1 固定 Data Hub 表和读取 API。",
      liveTestPolicy: "manual",
    },
    {
      provider: "Supabase service role",
      category: "数据库 / 后台写入",
      checkedVars: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_DB_URL", "SUPABASE_PROJECT_REF"],
      requiredAll: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
      capabilities: makeCapabilities({ sourceEvidence: "primary" }),
      recommendedUse: "后台 ingest、normalize、cache 写入。绝不进前端。",
      priority: "P0",
      blockingIssue: "本轮不得做 destructive write；service role 必须只在服务端使用。",
      nextAction: "Step 1 用 service role 跑 staging 写入脚本，但先 dry-run。",
      liveTestPolicy: "manual",
    },
  ];
}

function requiredNames(definition: ProviderDefinition): string[] {
  return [...(definition.requiredAll ?? []), ...(definition.requiredAny ?? [])];
}

function evaluateProvider(definition: ProviderDefinition, envValues: Map<string, string>, live: boolean): ProviderHealth {
  const namesToCheck = Array.from(new Set([...definition.checkedVars, ...requiredNames(definition)]));
  const envStates = namesToCheck.map((name) => stateFor(envValues, name));
  const checked = new Map(envStates.map((state) => [state.name, state]));
  const requiredAll = definition.requiredAll ?? [];
  const requiredAny = definition.requiredAny ?? [];
  const allPlaceholderVars = requiredAll.filter((name) => checked.get(name)?.placeholder);
  const allEmptyVars = requiredAll.filter((name) => checked.get(name)?.present && !checked.get(name)?.hasValue);
  const missingAll = (definition.requiredAll ?? []).filter((name) => {
    const state = checked.get(name);
    return !state?.present || !state.hasValue || state.placeholder;
  });

  let missingAny: string[] = [];
  let anyPlaceholderVars: string[] = [];
  let anyEmptyVars: string[] = [];
  if (requiredAny.length) {
    const hasAny = requiredAny.some((name) => {
      const state = checked.get(name);
      return state?.present && state.hasValue && !state.placeholder;
    });
    if (!hasAny) {
      missingAny = requiredAny;
      anyPlaceholderVars = requiredAny.filter((name) => checked.get(name)?.placeholder);
      anyEmptyVars = requiredAny.filter((name) => checked.get(name)?.present && !checked.get(name)?.hasValue);
    }
  }

  const missingRequiredVars = Array.from(new Set([...missingAll, ...missingAny]));
  const placeholderVars = Array.from(new Set([...allPlaceholderVars, ...anyPlaceholderVars]));
  const emptyVars = Array.from(new Set([...allEmptyVars, ...anyEmptyVars]));
  let status: ProviderStatus;
  if (placeholderVars.length > 0) {
    status = "placeholder";
  } else if (missingRequiredVars.length > 0 || emptyVars.length > 0) {
    status = "missing";
  } else if (live && definition.liveTestPolicy === "public_only") {
    status = "needs_test";
  } else if (!live && definition.liveTestPolicy !== "none") {
    status = "needs_test";
  } else {
    status = "configured";
  }

  return {
    ...definition,
    status,
    envStates,
    missingRequiredVars,
    placeholderVars,
    emptyVars,
  };
}

function statusCounts(providers: ProviderHealth[]) {
  const counts: Record<ProviderStatus, number> = {
    configured: 0,
    missing: 0,
    placeholder: 0,
    needs_test: 0,
    reachable: 0,
    failed: 0,
  };
  for (const provider of providers) {
    counts[provider.status] += 1;
  }
  return counts;
}

function envNamesFor(provider: ProviderHealth): string {
  return provider.checkedVars.map((name) => `\`${name}\``).join(", ");
}

function capabilityValue(provider: ProviderHealth, capability: Capability): CapabilityStatus {
  return provider.capabilities[capability] ?? "missing";
}

function capabilityLabel(status: CapabilityStatus): string {
  if (status === "primary") return "primary";
  if (status === "partial") return "partial";
  if (status === "fallback") return "fallback";
  return "—";
}

function blockingIssueFor(provider: ProviderHealth): string {
  if (provider.status === "missing") {
    const missing = provider.missingRequiredVars.length ? provider.missingRequiredVars : provider.emptyVars;
    return `缺少关键配置：${missing.map((name) => `\`${name}\``).join(", ")}。${provider.blockingIssue}`;
  }
  if (provider.status === "placeholder") {
    return `关键配置疑似占位值：${provider.placeholderVars.map((name) => `\`${name}\``).join(", ")}。${provider.blockingIssue}`;
  }
  if (provider.status === "needs_test") {
    return `配置存在但未做外部最小请求验证。${provider.blockingIssue}`;
  }
  return provider.blockingIssue;
}

function endpointVars(provider: ProviderHealth): string[] {
  return provider.checkedVars.filter((name) => /(URL|BASE|ENDPOINT|PATH)$/i.test(name));
}

function keyVars(provider: ProviderHealth): string[] {
  return provider.checkedVars.filter((name) => /(KEY|SECRET|TOKEN|AK|PWD|PASSWORD|CLIENT_ID|CLIENT_SECRET|DSN)$/i.test(name));
}

function renderGapList(providers: ProviderHealth[]): string[] {
  const lines: string[] = [];
  const missingProviders = providers.filter((provider) => provider.status === "missing");
  const placeholderProviders = providers.filter((provider) => provider.status === "placeholder");
  const endpointMissing = providers
    .map((provider) => ({
      provider,
      missingEndpoints: endpointVars(provider).filter((name) => {
        const state = provider.envStates.find((item) => item.name === name);
        return !state?.present || !state.hasValue || state.placeholder;
      }),
    }))
    .filter((item) => item.missingEndpoints.length > 0);
  const keyWithoutBase = providers
    .map((provider) => {
      const hasKey = keyVars(provider).some((name) => {
        const state = provider.envStates.find((item) => item.name === name);
        return state?.present && state.hasValue && !state.placeholder;
      });
      const missingEndpoints = endpointVars(provider).filter((name) => {
        const state = provider.envStates.find((item) => item.name === name);
        return !state?.present || !state.hasValue || state.placeholder;
      });
      return { provider, hasKey, missingEndpoints };
    })
    .filter((item) => item.hasKey && item.missingEndpoints.length > 0);

  lines.push("### 缺 key 或关键变量");
  lines.push("");
  if (!missingProviders.length) {
    lines.push("- 暂未发现完全缺关键变量的 Provider。");
  } else {
    for (const provider of missingProviders) {
      lines.push(`- ${provider.provider}：缺少 ${provider.missingRequiredVars.map((name) => `\`${name}\``).join(", ")}。`);
    }
  }
  lines.push("");

  lines.push("### 疑似占位值");
  lines.push("");
  if (!placeholderProviders.length) {
    lines.push("- 暂未发现关键变量疑似占位值。");
  } else {
    for (const provider of placeholderProviders) {
      lines.push(`- ${provider.provider}：${provider.placeholderVars.map((name) => `\`${name}\``).join(", ")} 疑似占位。`);
    }
  }
  lines.push("");

  lines.push("### 缺 endpoint / base URL");
  lines.push("");
  if (!endpointMissing.length) {
    lines.push("- 关键 endpoint / base URL 基本齐全。");
  } else {
    for (const item of endpointMissing.slice(0, 30)) {
      lines.push(`- ${item.provider.provider}：${item.missingEndpoints.map((name) => `\`${name}\``).join(", ")} 未配置或为空。`);
    }
    if (endpointMissing.length > 30) {
      lines.push(`- 另有 ${endpointMissing.length - 30} 个 Provider 存在 endpoint 缺口，详见 Provider 明细表。`);
    }
  }
  lines.push("");

  lines.push("### 只有 key 但缺 base URL 的风险");
  lines.push("");
  if (!keyWithoutBase.length) {
    lines.push("- 暂未发现明显“有 key 但缺 base URL”的核心 Provider。");
  } else {
    for (const item of keyWithoutBase.slice(0, 20)) {
      lines.push(`- ${item.provider.provider}：已有 key 类变量，但 ${item.missingEndpoints.map((name) => `\`${name}\``).join(", ")} 未配置。`);
    }
  }
  lines.push("");

  lines.push("### 不建议马上接入");
  lines.push("");
  for (const provider of providers.filter((item) => item.priority === "P3")) {
    lines.push(`- ${provider.provider}：${provider.nextAction}`);
  }
  lines.push("");

  lines.push("### 当前仍无法可靠覆盖的能力");
  lines.push("");
  lines.push("- 全球门票、预约和实时票价：目前只能做局部活动/票务线索，不能承诺实时可买或实时价格。");
  lines.push("- 实时酒店价格、房态和下单：当前不应进入 MVP 主流程。");
  lines.push("- 官方开放时间：Google/AMap/OSM 可能部分提供，但必须按字段记录 source、confidence、fetched_at，缺失时显示待核验。");
  lines.push("- 实时交通：地图路线 Provider 可给估算，实时交通覆盖和许可仍需单独确认。");
  lines.push("- 图片授权链路：图片 URL 必须配套 source_url、license、author/attribution，不要只存裸 URL。");

  return lines;
}

function renderReport(input: {
  envPath: string;
  providers: ProviderHealth[];
  live: boolean;
}): string {
  const { envPath, providers, live } = input;
  const counts = statusCounts(providers);
  const locallyConfigured = counts.configured + counts.reachable;
  const lines: string[] = [];
  const date = new Date().toISOString().slice(0, 10);

  lines.push("# Wanderly v2 Provider Capability Matrix");
  lines.push("");
  lines.push(`审计日期：${date}`);
  lines.push("");
  lines.push("本报告是 Wanderly v2.0.5 Data Hub / 数据底座建设第 0 步：Provider 可用性体检。");
  lines.push("本轮只读取环境变量的变量名、是否存在、是否为空、是否疑似占位；不输出任何真实 API key、token、secret 或带 key 的完整 URL。");
  lines.push("Step0 是静态配置体检；除非显式启用并实现安全 public-only 请求，否则本报告不代表真实外部 API 可连通。");
  lines.push("");

  lines.push("## A. 总览");
  lines.push("");
  lines.push(`- 环境文件：\`${envPath.replace(process.cwd(), ".")}\``);
  lines.push(`- 外部最小请求：${live ? "已显式启用 public-only 请求规划；带密钥 Provider 仍不会自动请求" : "未启用；配置存在的外部 Provider 标记为 needs_test"}`);
  lines.push(`- 已确认本地配置成立 Provider 数量：${locallyConfigured}`);
  lines.push(`- 已配置但待外部连通性测试 Provider 数量：${counts.needs_test}`);
  lines.push(`- 缺失 Provider 数量：${counts.missing}`);
  lines.push(`- 疑似占位 Provider 数量：${counts.placeholder}`);
  lines.push(`- 明确失败 Provider 数量：${counts.failed}`);
  lines.push("");

  lines.push("状态说明：");
  lines.push("");
  lines.push("- `configured`：关键变量存在且非空，本轮不需要外部请求即可确认配置成立。");
  lines.push("- `missing`：关键变量缺失或为空。");
  lines.push("- `placeholder`：变量存在但疑似占位值。");
  lines.push("- `needs_test`：配置存在，但本轮未做或不应自动做外部请求验证。");
  lines.push("- `reachable`：安全、低成本、只读的最小请求成功。");
  lines.push("- `failed`：最小请求失败。");
  lines.push("");

  lines.push("## B. Provider 明细表");
  lines.push("");
  lines.push("| Provider | Category | Env vars checked | Status | Capabilities | Recommended use in Wanderly | Rollout priority | Blocking issue | Next action |");
  lines.push("|---|---|---|---|---|---|---|---|---|");
  for (const provider of providers) {
    const capabilities = CAPABILITIES.filter((capability) => capabilityValue(provider, capability) !== "missing")
      .map((capability) => `${capability}:${capabilityLabel(capabilityValue(provider, capability))}`)
      .join(", ");
    lines.push(`| ${provider.provider} | ${provider.category} | ${envNamesFor(provider)} | ${provider.status} | ${capabilities || "—"} | ${provider.recommendedUse} | ${provider.priority} | ${blockingIssueFor(provider)} | ${provider.nextAction} |`);
  }
  lines.push("");

  lines.push("## C. 能力覆盖矩阵");
  lines.push("");
  lines.push("矩阵值：`primary` 表示主能力，`partial` 表示字段或区域不完整，`fallback` 表示只适合兜底，`—` 表示不覆盖。");
  lines.push("");
  lines.push(`| Provider | ${CAPABILITIES.join(" | ")} |`);
  lines.push(`|---${CAPABILITIES.map(() => "|---").join("")}|`);
  for (const provider of providers) {
    lines.push(`| ${provider.provider} | ${CAPABILITIES.map((capability) => capabilityLabel(capabilityValue(provider, capability))).join(" | ")} |`);
  }
  lines.push("");

  lines.push("## D. 推荐接入优先级");
  lines.push("");
  for (const priority of ["P0", "P1", "P2", "P3"] as RolloutPriority[]) {
    const group = providers.filter((provider) => provider.priority === priority);
    lines.push(`### ${priority}`);
    lines.push("");
    if (priority === "P0") lines.push("直接影响 Map Studio、基础路线、天气上下文和计划生成可信度。");
    if (priority === "P1") lines.push("增强区域能力、全球 fallback 和 Data Hub 覆盖。");
    if (priority === "P2") lines.push("活动、票务、酒店、图片和产品观测增强。");
    if (priority === "P3") lines.push("后续可选或成本较高 Provider。");
    lines.push("");
    for (const provider of group) {
      lines.push(`- ${provider.provider}：${provider.recommendedUse}`);
    }
    lines.push("");
  }

  lines.push("## E. 缺口清单");
  lines.push("");
  lines.push(...renderGapList(providers));
  lines.push("");

  lines.push("## F. 下一步施工建议");
  lines.push("");
  lines.push("Step 1 不建议直接把所有 Provider 接到业务 UI，而是先固定数据底座的 ingest → normalize → cache → API/UI 读取闭环。");
  lines.push("");
  lines.push("1. 固定 Data Hub 知识库表结构。");
  lines.push("   - 保持 `admin_areas`、`travel_regions`、`places` 分离。");
  lines.push("   - 不把旅行热点区域写进真实行政区划表。");
  lines.push("2. 建立 `provider_records_staging`。");
  lines.push("   - 存 provider、external_id、record_type、raw_hash、fetched_at、expires_at、raw_snapshot。");
  lines.push("   - staging 只给后台 job 使用，不直接给 UI。");
  lines.push("3. 建立 `place_external_ids`。");
  lines.push("   - 存 place_id、provider、external_id、confidence、match_method、last_verified_at。");
  lines.push("   - 用来解决 AMap、Google、Wikidata、OpenTripMap 等跨源 ID 映射。");
  lines.push("4. 建立 `place_facts`。");
  lines.push("   - 按字段存事实：opening_hours、ticket_info、image、intro、phone、website、recommended_duration 等。");
  lines.push("   - 每条 fact 都要有 source、confidence、fetched_at、expires_at、verification_status。");
  lines.push("5. 建立 `event_records`、`weather_snapshots`、`traffic_snapshots`。");
  lines.push("   - 活动、天气、交通都是时效数据，不要混进静态 place_details。");
  lines.push("6. 第一批只接 3-5 个核心 Provider。");
  lines.push("   - 建议：AMap Web Service、Wikipedia/Wikidata/Wikimedia、QWeather、GraphHopper 或 OpenRouteService、Supabase service role。");
  lines.push("   - Google Places 可作为并行 P0，但要先确认账单、配额、照片 attribution 和缓存规则。");
  lines.push("7. 每个 Provider 只做最小闭环。");
  lines.push("   - ingest：最小只读请求或本地数据导入。");
  lines.push("   - normalize：转为统一字段。");
  lines.push("   - cache：写入 staging / facts / route_cache / weather_snapshots。");
  lines.push("   - read：通过 Data Hub API 读取 normalized 结果。");
  lines.push("   - UI：后续再接，不在 Step 0 修改 Map Studio。");
  lines.push("");

  lines.push("## 安全备注");
  lines.push("");
  lines.push("- 本报告没有复制 `.env.local` 或 `WANDERLY_V2_FULL_ENV_TEMPLATE.env.local` 的任何真实值。");
  lines.push("- 文档只包含变量名和状态，不包含 Authorization header、service role key、AI key、地图 key 或 OAuth secret。");
  lines.push("- 本轮不做生产数据写入、不做批量抓取、不改 Map Studio UI、不改 AI 生成流程。");

  return lines.join("\n");
}

function main() {
  const args = new Set(process.argv.slice(2));
  const envArg = process.argv.find((arg) => arg.startsWith("--env="));
  const envPath = envArg ? resolve(process.cwd(), envArg.slice("--env=".length)) : DEFAULT_ENV_PATH;
  const write = args.has("--write");
  const live = args.has("--live");
  const envValues = parseEnvFile(envPath);
  const providers = providerDefinitions().map((definition) => evaluateProvider(definition, envValues, live));
  const report = renderReport({ envPath, providers, live });

  if (write) {
    mkdirSync(dirname(DEFAULT_REPORT_PATH), { recursive: true });
    writeFileSync(DEFAULT_REPORT_PATH, report, "utf8");
    const counts = statusCounts(providers);
    console.log(`Wrote ${DEFAULT_REPORT_PATH}`);
    console.log(`Provider health summary: configured=${counts.configured}, needs_test=${counts.needs_test}, missing=${counts.missing}, placeholder=${counts.placeholder}, reachable=${counts.reachable}, failed=${counts.failed}`);
    console.log("No secret values were printed. Only variable names and statuses were audited.");
    return;
  }

  console.log(report);
}

if (require.main === module) {
  main();
}

module.exports = {
  CAPABILITIES,
  parseEnvFile,
  providerDefinitions,
  evaluateProvider,
  renderReport,
};
