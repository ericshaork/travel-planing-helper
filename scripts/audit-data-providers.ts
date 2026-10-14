const { existsSync, readFileSync, writeFileSync, mkdirSync } = require("node:fs");
const { dirname, resolve } = require("node:path");

const ENV_PATH = resolve(process.cwd(), ".env.local");
const DEFAULT_REPORT_PATH = resolve(process.cwd(), "docs", "WANDERLY_V2_DATA_PROVIDER_AUDIT.md");

type ProviderStatus = "configured" | "partial" | "missing";
type CapabilityStatus = "available" | "likely" | "partial" | "fallback" | "missing";

type Capability =
  | "geocode"
  | "poiSearch"
  | "placeDetails"
  | "openingHours"
  | "ticketInfo"
  | "routePlanning"
  | "weather"
  | "events"
  | "images"
  | "encyclopediaIntro";

type ProviderAudit = {
  name: string;
  status: ProviderStatus;
  detectedVars: string[];
  missingVars: string[];
  capabilities: Record<Capability, CapabilityStatus>;
  notes: string[];
  fallbackFields: string[];
  needsFollowUp: string[];
};

const CAPABILITIES: Capability[] = [
  "geocode",
  "poiSearch",
  "placeDetails",
  "openingHours",
  "ticketInfo",
  "routePlanning",
  "weather",
  "events",
  "images",
  "encyclopediaIntro",
];

const GOOGLE_ENV_ALIASES = ["Google_MAP_API", "GOOGLE_MAPS_API_KEY", "GOOGLE_PLACES_API_KEY"];
const WIKIMEDIA_ENV_ALIASES = [
  "WIKIDATA_SPARQL_URL",
  "WIKIDATA_SPARQL_ENDPOINT",
  "WIKIMEDIA_API_URL",
  "WIKIMEDIA_COMMONS_API_URL",
  "WIKIPEDIA_API_URL",
  "WIKIPEDIA_ZH_API_URL",
  "WIKIPEDIA_EN_API_URL",
];
const OSM_ENV_ALIASES = ["NOMINATIM_BASE_URL", "OVERPASS_API_URL", "OSM_USER_AGENT"];

function parseEnvNames(envPath: string): Set<string> {
  if (!existsSync(envPath)) return new Set();
  const text = readFileSync(envPath, "utf8");
  const names = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (match) names.add(match[1]);
  }
  return names;
}

function present(envNames: Set<string>, vars: string[]): string[] {
  return vars.filter((name) => envNames.has(name));
}

function missing(envNames: Set<string>, vars: string[]): string[] {
  return vars.filter((name) => !envNames.has(name));
}

function hasAny(envNames: Set<string>, vars: string[]): boolean {
  return vars.some((name) => envNames.has(name));
}

function statusFrom(envNames: Set<string>, required: string[], optional: string[] = []): ProviderStatus {
  const requiredPresent = present(envNames, required).length;
  if (requiredPresent === required.length && required.length > 0) return "configured";
  if (requiredPresent > 0 || hasAny(envNames, optional)) return "partial";
  return "missing";
}

function emptyCapabilities(): Record<Capability, CapabilityStatus> {
  return Object.fromEntries(CAPABILITIES.map((capability) => [capability, "missing"])) as Record<Capability, CapabilityStatus>;
}

function auditProviders(envNames: Set<string>): ProviderAudit[] {
  const amapConfigured = hasAny(envNames, ["AMAP_API_KEY", "NEXT_PUBLIC_AMAP_JS_KEY"]);
  const googleConfigured = hasAny(envNames, GOOGLE_ENV_ALIASES);
  const osmConfigured = hasAny(envNames, OSM_ENV_ALIASES);
  const wikimediaConfigured = hasAny(envNames, WIKIMEDIA_ENV_ALIASES);
  const qweatherConfigured = envNames.has("QWEATHER_API_KEY") || envNames.has("WEATHER_PROVIDER");
  const hkWeatherConfigured = Array.from(envNames).some((name) => name.startsWith("HK_HKO_"));
  const macauWeatherConfigured = Array.from(envNames).some((name) => name.startsWith("MO_SMG_"));
  const eventsConfigured = Array.from(envNames).some((name) => name.startsWith("HK_LCSD_") || name.startsWith("MO_MGTO_") || name === "HK_URBTIX_URL_TEMPLATE" || name === "HK_SMARTPLAY_URL");
  const hotelConfigured = envNames.has("MO_DST_LICENSED_HOTELS_URL");
  const cloudinaryConfigured = envNames.has("CLOUDINARY_URL") || envNames.has("CLOUDINARY_CLOUD_NAME");
  const aiConfigured = hasAny(envNames, ["AI_API_KEY", "AI_BASE_URL", "AI_MODEL", "LLM_API_KEY", "LLM_BASE_URL", "LLM_MODEL"]);
  const supabaseConfigured = hasAny(envNames, ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]);

  const providers: ProviderAudit[] = [];

  providers.push({
    name: "AMap / 高德",
    status: statusFrom(envNames, ["AMAP_API_KEY"], ["NEXT_PUBLIC_AMAP_JS_KEY", "NEXT_PUBLIC_AMAP_SECURITY_JS_CODE"]),
    detectedVars: present(envNames, ["AMAP_API_KEY", "NEXT_PUBLIC_AMAP_JS_KEY", "NEXT_PUBLIC_AMAP_SECURITY_JS_CODE"]),
    missingVars: missing(envNames, ["AMAP_API_KEY", "NEXT_PUBLIC_AMAP_JS_KEY", "NEXT_PUBLIC_AMAP_SECURITY_JS_CODE"]),
    capabilities: {
      ...emptyCapabilities(),
      geocode: amapConfigured ? "available" : "missing",
      poiSearch: amapConfigured ? "available" : "missing",
      placeDetails: amapConfigured ? "partial" : "missing",
      openingHours: amapConfigured ? "partial" : "missing",
      ticketInfo: amapConfigured ? "fallback" : "missing",
      routePlanning: amapConfigured ? "available" : "missing",
    },
    notes: [
      "适合作为中国地图、POI、路线和行政区划的优先 provider。",
      "开放时间、门票和图片不应默认视为完整可信字段，需要字段级来源和缺失提示。",
    ],
    fallbackFields: ["ticketInfo", "images", "encyclopediaIntro"],
    needsFollowUp: ["确认 Web 服务 key 与 JS key 的使用边界", "确认 DistrictSearch / POI / route 的实际接入路径和配额"],
  });

  providers.push({
    name: "Google Maps / Places",
    status: googleConfigured ? "configured" : "missing",
    detectedVars: present(envNames, GOOGLE_ENV_ALIASES),
    missingVars: missing(envNames, GOOGLE_ENV_ALIASES),
    capabilities: {
      ...emptyCapabilities(),
      geocode: googleConfigured ? "likely" : "missing",
      poiSearch: googleConfigured ? "likely" : "missing",
      placeDetails: googleConfigured ? "likely" : "missing",
      openingHours: googleConfigured ? "likely" : "missing",
      routePlanning: googleConfigured ? "likely" : "missing",
      images: googleConfigured ? "likely" : "missing",
    },
    notes: [
      "这是全球地点、详情、营业时间、照片和路线能力的关键候选。",
      "仅凭变量名不能确认已启用 Places / Directions / Photos 等具体 API。",
    ],
    fallbackFields: googleConfigured ? ["ticketInfo", "events"] : ["geocode", "poiSearch", "placeDetails", "openingHours", "routePlanning", "images"],
    needsFollowUp: ["确认变量名是否被代码读取", "确认已启用的 Google API 列表、账单、配额和合规限制"],
  });

  providers.push({
    name: "OpenStreetMap / Overpass / Nominatim",
    status: statusFrom(envNames, ["OVERPASS_API_URL"], ["NOMINATIM_BASE_URL", "OSM_USER_AGENT"]),
    detectedVars: present(envNames, OSM_ENV_ALIASES),
    missingVars: missing(envNames, OSM_ENV_ALIASES),
    capabilities: {
      ...emptyCapabilities(),
      geocode: envNames.has("NOMINATIM_BASE_URL") ? "available" : osmConfigured ? "fallback" : "missing",
      poiSearch: osmConfigured ? "partial" : "missing",
      placeDetails: osmConfigured ? "partial" : "missing",
      openingHours: osmConfigured ? "partial" : "missing",
    },
    notes: [
      "适合全球 fallback、OSM POI、边界和开放标签查询。",
      "Overpass 不适合高频实时请求，应配合缓存、限流和字段缺失提示。",
    ],
    fallbackFields: ["ticketInfo", "routePlanning", "events", "images", "encyclopediaIntro"],
    needsFollowUp: ["确认是否需要 Nominatim 地理编码 endpoint", "设计 Overpass 查询缓存和限流策略"],
  });

  providers.push({
    name: "Wikimedia / Wikipedia / Wikidata",
    status: wikimediaConfigured ? "configured" : "missing",
    detectedVars: present(envNames, WIKIMEDIA_ENV_ALIASES),
    missingVars: missing(envNames, WIKIMEDIA_ENV_ALIASES),
    capabilities: {
      ...emptyCapabilities(),
      images: wikimediaConfigured ? "partial" : "fallback",
      encyclopediaIntro: wikimediaConfigured ? "available" : "fallback",
    },
    notes: [
      wikimediaConfigured
        ? "检测到 Wikimedia / Wikipedia / Wikidata 相关 endpoint，可作为百科简介、别名和图片候选的候选 provider。"
        : "当前未检测到显式 Wikimedia / Wikidata 配置。",
      "公共百科和图片数据必须保留 source_url、license、language 和更新时间，不能直接当成无来源事实。",
    ],
    fallbackFields: wikimediaConfigured ? ["ticketInfo", "openingHours"] : ["encyclopediaIntro", "images"],
    needsFollowUp: ["决定是否使用 public endpoint 或显式配置 endpoint", "建立百科文本和图片版权字段"],
  });

  providers.push({
    name: "Weather provider",
    status: qweatherConfigured || hkWeatherConfigured || macauWeatherConfigured ? "configured" : "missing",
    detectedVars: Array.from(envNames).filter((name) => name === "QWEATHER_API_KEY" || name === "QWEATHER_BASE_URL" || name === "WEATHER_PROVIDER" || name.startsWith("HK_HKO_") || name.startsWith("MO_SMG_")).sort(),
    missingVars: missing(envNames, ["QWEATHER_API_KEY", "QWEATHER_BASE_URL", "WEATHER_PROVIDER"]),
    capabilities: {
      ...emptyCapabilities(),
      weather: qweatherConfigured || hkWeatherConfigured || macauWeatherConfigured ? "available" : "missing",
    },
    notes: [
      "天气能力已具备明确配置痕迹，港澳还有区域官方天气 endpoint。",
      "天气不应写入 place_details 主事实字段，应作为计划上下文和动态提示。",
    ],
    fallbackFields: ["temporaryClosure", "events"],
    needsFollowUp: ["确认全球城市覆盖范围和套餐限制", "统一 QWeather / HKO / SMG 的 normalized weather format"],
  });

  providers.push({
    name: "Events provider",
    status: eventsConfigured ? "partial" : "missing",
    detectedVars: Array.from(envNames).filter((name) => name.startsWith("HK_LCSD_") || name.startsWith("MO_MGTO_") || name === "HK_URBTIX_URL_TEMPLATE" || name === "HK_SMARTPLAY_URL").sort(),
    missingVars: [],
    capabilities: {
      ...emptyCapabilities(),
      events: eventsConfigured ? "partial" : "missing",
      ticketInfo: eventsConfigured ? "partial" : "missing",
    },
    notes: [
      "当前更像香港 / 澳门区域活动和票务线索，不是全球事件数据源。",
      "v2.0 可先预留字段；v2.2 可做港澳区域增强样板。",
    ],
    fallbackFields: ["globalEvents", "globalExhibitions"],
    needsFollowUp: ["确认 LCSD / MGTO / URBTIX 字段结构和刷新频率", "补全球活动/展览 provider 或人工精选机制"],
  });

  providers.push({
    name: "Hotel provider",
    status: hotelConfigured ? "partial" : "missing",
    detectedVars: present(envNames, ["MO_DST_LICENSED_HOTELS_URL"]),
    missingVars: missing(envNames, ["MO_DST_LICENSED_HOTELS_URL"]),
    capabilities: {
      ...emptyCapabilities(),
      poiSearch: hotelConfigured ? "partial" : "missing",
      placeDetails: hotelConfigured ? "partial" : "missing",
    },
    notes: [
      "检测到澳门持牌酒店列表，不能代表全球酒店、价格、余量或预订能力。",
      "当前不适合做复杂商业化酒店预订系统。",
    ],
    fallbackFields: ["hotelAvailability", "hotelPrice", "hotelBooking"],
    needsFollowUp: ["明确酒店只作为地点类别还是后续接商业 provider", "避免 AI 声称实时房价和余量"],
  });

  providers.push({
    name: "Image provider",
    status: cloudinaryConfigured || googleConfigured || wikimediaConfigured ? "partial" : "missing",
    detectedVars: present(envNames, ["CLOUDINARY_URL", "CLOUDINARY_CLOUD_NAME", ...GOOGLE_ENV_ALIASES, ...WIKIMEDIA_ENV_ALIASES]),
    missingVars: missing(envNames, ["CLOUDINARY_URL", "CLOUDINARY_CLOUD_NAME"]),
    capabilities: {
      ...emptyCapabilities(),
      images: cloudinaryConfigured ? "available" : googleConfigured || wikimediaConfigured ? "likely" : "missing",
    },
    notes: [
      "图片 provider 需要区分存储/分发与图片来源。Cloudinary 是媒体管理，不等于授权图片源。",
      "Google Places photos 如果可用，也需要遵守 attribution 和缓存规则。",
    ],
    fallbackFields: ["imageLicense", "imageSourceUrl", "globalImageSearch"],
    needsFollowUp: ["确认是否有 Cloudinary env 或其他图片源", "建立 image_urls 的 source / license / updated_at 字段"],
  });

  providers.push({
    name: "AI / LLM provider",
    status: aiConfigured ? "configured" : "missing",
    detectedVars: present(envNames, ["AI_API_KEY", "AI_BASE_URL", "AI_MODEL", "AI_PROVIDER", "AI_TIMEOUT_MS", "LLM_API_KEY", "LLM_BASE_URL", "LLM_MODEL", "LLM_TIMEOUT_MS"]),
    missingVars: [],
    capabilities: {
      ...emptyCapabilities(),
      encyclopediaIntro: aiConfigured ? "fallback" : "missing",
    },
    notes: [
      "LLM 可以用于摘要、结构化和规划，但不能作为开放时间、票价、地址、路线耗时等事实源。",
      "v2.3 需要 plan_evidence 和 source_records，避免 AI 编造事实。",
    ],
    fallbackFields: ["languageSummaryOnly"],
    needsFollowUp: ["限制 AI 只能引用已有 source_records", "为缺失字段生成明确的暂缺/待核验提示"],
  });

  providers.push({
    name: "Supabase",
    status: statusFrom(envNames, ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"], ["SUPABASE_SERVICE_ROLE_KEY"]),
    detectedVars: present(envNames, ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]),
    missingVars: missing(envNames, ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]),
    capabilities: {
      ...emptyCapabilities(),
    },
    notes: [
      "适合作为 v2.0 数据底座，但本轮只审计，不新增 migration。",
      "需要后续建立 destinations、travel_regions、admin_areas、places、place_details、place_sources、route_cache、ai_plan_evidence。",
    ],
    fallbackFields: ["databaseSchema", "sourceRecords", "routeCache"],
    needsFollowUp: ["确认 RLS / service role 使用边界", "确认 migration 应用流程和本地/生产环境隔离"],
  });

  return providers;
}

function statusLabel(status: ProviderStatus): string {
  if (status === "configured") return "configured";
  if (status === "partial") return "partial";
  return "missing";
}

function capabilityLabel(status: CapabilityStatus): string {
  return status;
}

function renderReport(envNames: Set<string>, providers: ProviderAudit[]): string {
  const lines: string[] = [];
  const date = new Date().toISOString().slice(0, 10);

  lines.push("# Wanderly v2 Data Provider Audit");
  lines.push("");
  lines.push(`审计日期：${date}`);
  lines.push("");
  lines.push("本文档对应 Wanderly v2.0 Phase 1.5 的第一步：环境变量与 API 能力审计。本文只读取 `.env.local` 中的变量名，不读取、不展示、不记录任何 API key、token、secret 的真实值。本轮不接入新 API，不新增 Supabase migration，不修改 Map Studio 业务逻辑。");
  lines.push("");

  lines.push("## 1. .env.local 检测结果");
  lines.push("");
  lines.push(existsSync(ENV_PATH) ? "- `.env.local`: detected" : "- `.env.local`: missing");
  lines.push("- 审计方式：只解析符合 `NAME=value` 的变量名；忽略说明文字、注释和非环境变量行。");
  lines.push("- 安全策略：报告只展示变量名和推断用途，不展示任何变量值。");
  lines.push("");
  lines.push("检测到的变量名：");
  lines.push("");
  for (const name of Array.from(envNames).sort()) {
    lines.push(`- \`${name}\``);
  }
  lines.push("");

  lines.push("## 2. Provider 配置状态");
  lines.push("");
  lines.push("| Provider | 状态 | 检测到的变量名 | 缺失 / 待确认变量 | 结论 |");
  lines.push("|---|---|---|---|---|");
  for (const provider of providers) {
    const detected = provider.detectedVars.length ? provider.detectedVars.map((name) => `\`${name}\``).join(", ") : "—";
    const missingVars = provider.missingVars.length ? provider.missingVars.map((name) => `\`${name}\``).join(", ") : "—";
    const conclusion = provider.notes[0] ?? "—";
    lines.push(`| ${provider.name} | ${statusLabel(provider.status)} | ${detected} | ${missingVars} | ${conclusion} |`);
  }
  lines.push("");

  lines.push("## 3. 能力矩阵");
  lines.push("");
  lines.push("状态说明：`available` 表示变量名足以推断已有明确能力；`likely` 表示疑似可覆盖但要验证 API 启用和代码接入；`partial` 表示区域或字段不完整；`fallback` 表示只能作为兜底或文本提示；`missing` 表示当前未发现配置。");
  lines.push("");
  lines.push(`| Provider | ${CAPABILITIES.join(" | ")} |`);
  lines.push(`|---${CAPABILITIES.map(() => "|---").join("")}|`);
  for (const provider of providers) {
    lines.push(`| ${provider.name} | ${CAPABILITIES.map((capability) => capabilityLabel(provider.capabilities[capability])).join(" | ")} |`);
  }
  lines.push("");

  lines.push("## 4. 已可用能力");
  lines.push("");
  lines.push("- **中国地图 / POI / 路线 / 行政区划**：高德和百度变量存在，v2.0 可以优先围绕中国地图数据建立最小数据底座。开放时间、门票、图片仍需字段级缺失提示。");
  lines.push("- **天气**：QWeather、香港 HKO、澳门 SMG 相关变量存在，天气 provider 已具备配置基础。天气应作为动态计划上下文，不应混入 place_details 的静态事实字段。");
  lines.push("- **全球基础地名 / OSM 数据**：GeoNames 和 Overpass 变量存在，可作为全球城市、行政地名、OSM POI 和边界 fallback，但需要缓存和限流。");
  lines.push("- **香港 / 澳门区域增强**：港澳活动、交通、场馆、酒店和文化遗产变量较完整，适合 v2.2 做区域增强样板。");
  lines.push("- **Supabase / LLM**：Supabase 和 AI / LLM 变量存在，具备后续数据底座和 AI 证据链建设基础；本轮不新增 schema。");
  lines.push("");

  lines.push("## 5. 缺失能力");
  lines.push("");
  lines.push("- **全球地点详情的稳定 provider 仍待确认**：Google Maps / Places alias 包括 `Google_MAP_API`, `GOOGLE_MAPS_API_KEY`, `GOOGLE_PLACES_API_KEY`；检测到变量时仍必须验证启用的 Google APIs、配额、账单和代码接入。");
  lines.push("- **Wikimedia / Wikipedia / Wikidata 仅作为百科增强候选**：alias 包括 `WIKIDATA_SPARQL_URL`, `WIKIDATA_SPARQL_ENDPOINT`, `WIKIMEDIA_API_URL`, `WIKIMEDIA_COMMONS_API_URL`, `WIKIPEDIA_API_URL`, `WIKIPEDIA_ZH_API_URL`, `WIKIPEDIA_EN_API_URL`；检测到 endpoint 也需要 source_url、license、language 和更新时间。");
  lines.push("- **全球门票 / 预约 / 实时票价缺失**：当前只看到港澳局部票务线索，不具备全球景点票务能力。");
  lines.push("- **全球活动 / 展览缺失**：港澳有区域数据，其他目的地还需要新 provider 或人工精选。");
  lines.push("- **酒店实时价格 / 余量 / 预订缺失**：澳门持牌酒店列表不能等同于酒店预订系统。");
  lines.push("- **图片授权链路缺失**：没有可靠检测到专门图片来源配置；即使后续使用 Google Places photos，也需要 attribution 和缓存规则。");
  lines.push("- **数据治理层缺失**：source_records、field-level confidence、freshness、expires_at、route cache 和 AI plan evidence 还未落库。");
  lines.push("");

  lines.push("## 6. 当前只能 fallback 的字段");
  lines.push("");
  lines.push("| 字段 | 当前状态 | 建议处理 |");
  lines.push("|---|---|---|");
  lines.push("| `opening_hours` | AMap / Google / OSM 可能部分提供，但未验证完整性 | UI 显示来源和更新时间；缺失时显示“暂缺 / 待核验”。 |");
  lines.push("| `ticketInfo` | 只有港澳局部线索 | 不要让 AI 编造票价；详情页显示“暂缺”。 |");
  lines.push("| `image_urls` | Google 可能提供照片，Cloudinary 未可靠检测到 env | 后续需要图片来源、授权和 attribution 字段。 |");
  lines.push("| `encyclopediaIntro` | Wikimedia / Wikipedia / Wikidata endpoint 如已配置可作为百科候选；未配置时只能 fallback | 可先用 curated seed 或 AI 摘要，但必须标记来源，不能当成无来源事实。 |");
  lines.push("| `events` | 港澳局部可用，全球缺失 | v2.0 不做完整闭环；v2.2 可做区域增强。 |");
  lines.push("| `hotel_price` / `availability` | 缺失 | 不承诺实时酒店价格和余量。 |");
  lines.push("| `route duration` | 高德 / 百度 / Google 可能可用 | API 失败时只能显示 fallback reason，不要伪装成真实耗时。 |");
  lines.push("");

  lines.push("## 7. 后续需要补充或验证的 API");
  lines.push("");
  lines.push("1. 验证 Google alias 是否实际可用于 Places Details、Opening Hours、Photos、Directions、Geocoding。若不能，需要补正式全球 Places provider。");
  lines.push("2. 验证 Wikimedia / Wikidata / Wikipedia alias 的 endpoint 可用性，用于百科简介、别名、图片候选和 source_url。");
  lines.push("3. 为 Overpass / Nominatim / OSM user-agent alias 设计缓存、限流和失败降级，不把 OSM 当作实时高频 API。");
  lines.push("4. 明确图片 provider：图片来源、版权、attribution、缓存规则和失效策略。");
  lines.push("5. 如果要做门票、活动、酒店、餐厅增强，需要按地区逐步接入官方或商业 provider，不建议 v2.0 扩大范围。");
  lines.push("6. 后续 Supabase migration 应建立 `destinations`, `travel_regions`, `admin_areas`, `places`, `place_details`, `place_sources`, `route_cache`, `ai_plan_evidence`，并保持行政区划和旅行热点区域分表。");
  lines.push("");

  lines.push("## 8. Provider 逐项备注");
  lines.push("");
  for (const provider of providers) {
    lines.push(`### ${provider.name}`);
    lines.push("");
    lines.push(`- 状态：${statusLabel(provider.status)}`);
    lines.push(`- 检测到变量：${provider.detectedVars.length ? provider.detectedVars.map((name) => `\`${name}\``).join(", ") : "—"}`);
    lines.push(`- fallback 字段：${provider.fallbackFields.length ? provider.fallbackFields.map((field) => `\`${field}\``).join(", ") : "—"}`);
    lines.push("- 备注：");
    for (const note of provider.notes) lines.push(`  - ${note}`);
    lines.push("- 后续动作：");
    for (const item of provider.needsFollowUp) lines.push(`  - ${item}`);
    lines.push("");
  }

  lines.push("## 9. 本轮结论");
  lines.push("");
  lines.push("当前配置足够支持 v2.0 中国优先的数据底座起步：真实地点、坐标、路线、天气和行政区划可以优先围绕高德 / 百度 / QWeather / Supabase 建立。它还不足以支撑全球可信旅行数据底座；全球地点详情、开放时间、图片授权、门票预约、活动展览、酒店餐厅深度数据，以及 source/freshness/confidence 数据治理都需要后续补齐。");
  lines.push("");
  lines.push("下一步如果继续 Phase 1.5，应进入 Supabase migration 设计与生成，但仍需保持 `travel_regions` 和 `admin_areas` 分离，不能用 mock 行政区划替代真实行政区划，也不能静默丢弃缺失数据。");
  lines.push("");

  return lines.join("\n");
}

function main() {
  const args = new Set(process.argv.slice(2));
  const envNames = parseEnvNames(ENV_PATH);
  const providers = auditProviders(envNames);
  const report = renderReport(envNames, providers);

  if (args.has("--write")) {
    mkdirSync(dirname(DEFAULT_REPORT_PATH), { recursive: true });
    writeFileSync(DEFAULT_REPORT_PATH, report, "utf8");
    console.log(`Wrote ${DEFAULT_REPORT_PATH}`);
    console.log("No secret values were printed. Only variable names were audited.");
    return;
  }

  console.log(report);
}

if (require.main === module) {
  main();
}

module.exports = {
  GOOGLE_ENV_ALIASES,
  WIKIMEDIA_ENV_ALIASES,
  OSM_ENV_ALIASES,
  parseEnvNames,
  auditProviders,
  renderReport,
};



