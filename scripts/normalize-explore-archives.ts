import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type ThemeSlug =
  | "citywalk"
  | "food"
  | "heritage"
  | "night"
  | "seaside"
  | "jiangnan"
  | "nature"
  | "family"
  | "romance"
  | "museum"
  | "shopping"
  | "mountain"
  | "lake"
  | "slowTravel"
  | "general";

type PriorityLevel = "P0" | "P1" | "P2" | "P3";
type CoverStatus = "missing" | "fallback-city" | "fallback-theme" | "ready";
type NeededImage =
  | "cover"
  | "gallery"
  | "food"
  | "places"
  | "themeFallback"
  | "cityFallback";

interface SourceCity {
  code: string;
  name: string;
  region_name?: string;
}

interface SourceBudget {
  level?: string;
  note?: string;
}

interface SourceActivity {
  time_block?: string;
  description?: string;
  poi_refs?: string[];
  food_refs?: string[];
}

interface SourceDay {
  day?: number;
  title?: string;
  summary?: string;
  activities?: SourceActivity[];
}

interface SourcePoi {
  id?: string;
  name?: string;
  district?: string;
  type?: string;
  reason?: string;
  recommended_duration_minutes?: number;
}

interface SourceFood {
  id?: string;
  name?: string;
  district?: string;
  category?: string;
  reason?: string;
}

interface SourceArchive {
  id?: string;
  slug?: string;
  title?: string;
  summary?: string;
  city?: SourceCity;
  trip_type?: string;
  days?: number;
  budget?: SourceBudget;
  pace?: string;
  tags?: string[];
  image_prompt?: string;
  daily_itinerary?: SourceDay[];
  pois?: SourcePoi[];
  food?: SourceFood[];
}

interface NormalizedHighlight {
  title: string;
  description: string;
  tag: string;
}

interface NormalizedActivity {
  timeBlock: string;
  label: string;
  description: string;
  poiRefs: string[];
  foodRefs: string[];
}

interface NormalizedDay {
  dayNumber: number;
  title: string;
  summary: string;
  activities: NormalizedActivity[];
}

interface NormalizedFood {
  id: string;
  name: string;
  description: string;
  type: string;
  district: string;
  imageUrl: string;
}

interface NormalizedPlace {
  id: string;
  name: string;
  description: string;
  type: string;
  district: string;
  imageUrl: string;
  recommendedDurationMinutes?: number;
}

interface NormalizedArchive {
  externalId: string;
  slug: string;
  sourceSlug: string;
  title: string;
  summary: string;
  city: string;
  cityCode: string;
  region: string;
  theme: ThemeSlug;
  tripType: string;
  days: number;
  pace: string;
  budgetLevel: string;
  budgetNote: string;
  tags: string[];
  recommendedFor: string[];
  coverImageUrl: string;
  galleryImages: string[];
  story: string;
  featuredReason: string;
  highlights: NormalizedHighlight[];
  dailyItinerary: NormalizedDay[];
  food: NormalizedFood[];
  places: NormalizedPlace[];
  imagePrompt: string;
  source: {
    type: "ai_generated_v1";
    sourceFile: string;
    sourceVersion: "v1";
  };
}

interface ImageManifestRecord {
  externalId: string;
  slug: string;
  title: string;
  city: string;
  cityCode: string;
  region: string;
  theme: ThemeSlug;
  tripType: string;
  days: number;
  coverImagePath: string;
  coverStatus: CoverStatus;
  fallbackCityImagePath: string;
  fallbackThemeImagePath: string;
  neededImages: NeededImage[];
  priority: PriorityLevel;
}

interface CliOptions {
  sourceDir: string;
  outputDir: string;
}

interface ScriptSummary {
  total: number;
  externalIdUnique: boolean;
  slugUnique: boolean;
  themeDistribution: Record<string, number>;
  recommendedDistribution: Record<string, number>;
  priorityDistribution: Record<PriorityLevel, number>;
  duplicatesResolved: Record<string, string[]>;
  outputFiles: {
    archives: string;
    imageManifest: string;
    readme: string;
  };
}

const CONTROLLED_THEMES: ThemeSlug[] = [
  "citywalk",
  "food",
  "heritage",
  "night",
  "seaside",
  "jiangnan",
  "nature",
  "family",
  "romance",
  "museum",
  "shopping",
  "mountain",
  "lake",
  "slowTravel",
  "general",
];

const DISPLAY_FORBIDDEN_SNIPPETS = [
  "锟",
  "�",
  "{activity.description}",
  "undefined",
  "null",
  "NaN",
];

const ALLOWED_CITY_CODES = new Set([
  "beijing",
  "changsha",
  "chengdu",
  "chongqing",
  "dali",
  "dunhuang",
  "guangzhou",
  "guilin",
  "hangzhou",
  "harbin",
  "hong-kong",
  "lijiang",
  "macau",
  "nanjing",
  "qingdao",
  "sanya",
  "shanghai",
  "shenzhen",
  "suzhou",
  "taipei",
  "wuhan",
  "xiamen",
  "xian",
]);

const CITY_NAME_ZH: Record<string, string> = {
  beijing: "北京",
  changsha: "长沙",
  chengdu: "成都",
  chongqing: "重庆",
  dali: "大理",
  dunhuang: "敦煌",
  guangzhou: "广州",
  guilin: "桂林",
  hangzhou: "杭州",
  harbin: "哈尔滨",
  lijiang: "丽江",
  nanjing: "南京",
  qingdao: "青岛",
  sanya: "三亚",
  shanghai: "上海",
  shenzhen: "深圳",
  suzhou: "苏州",
  wuhan: "武汉",
  xiamen: "厦门",
  xian: "西安",
  "hong-kong": "香港",
  macau: "澳门",
  taipei: "台北",
};

const THEME_LABEL_ZH: Record<ThemeSlug, string> = {
  citywalk: "城市漫步",
  food: "美食灵感",
  heritage: "古城文化",
  night: "夜色氛围",
  seaside: "海边度假",
  jiangnan: "江南慢旅",
  nature: "山水自然",
  family: "亲子同行",
  romance: "浪漫双人",
  museum: "博物馆与地标",
  shopping: "购物与街区",
  mountain: "山地风景",
  lake: "湖岸时光",
  slowTravel: "轻松慢游",
  general: "城市灵感",
};

const TAG_LABEL_ZH: Record<string, string> = {
  citywalk: "城市漫步",
  food: "美食",
  photo: "拍照",
  "photo-friendly": "拍照",
  photography: "摄影",
  romantic: "情侣",
  couple: "情侣",
  "family-friendly": "亲子",
  "local-culture": "在地感",
  "night-view": "夜景",
  nightlife: "夜游",
  "evening-scene": "夜色",
  "river-evening": "河岸夜色",
  "riverside-evening": "夜色散步",
  "old-town": "古城",
  heritage: "古城",
  history: "历史",
  "old-street": "老街",
  beach: "海边",
  "coastal-city": "海边",
  "bay-view": "海景",
  "lake-view": "湖景",
  "canal-walk": "水巷散步",
  shopping: "购物",
  "slow-travel": "慢旅行",
  "solo-travel": "独游",
  student: "学生",
  nature: "自然",
  "street-food": "街头小吃",
  "local-food": "在地味道",
  "hutong-life": "胡同生活",
  "cultural-landmarks": "文化地标",
};

const PRIORITY_CITY_SET = new Set([
  "beijing",
  "shanghai",
  "xian",
  "xiamen",
  "chengdu",
  "hangzhou",
  "guangzhou",
  "shenzhen",
  "chongqing",
  "qingdao",
  "sanya",
  "suzhou",
  "nanjing",
  "dali",
  "lijiang",
]);

const PRIORITY_THEME_SET = new Set<ThemeSlug>([
  "citywalk",
  "food",
  "heritage",
  "night",
  "seaside",
  "jiangnan",
  "nature",
  "family",
  "romance",
  "museum",
]);

const P0_SOURCE_SLUGS = new Set([
  "beijing-couple-2d-shichahai-night",
  "beijing-couple-3d-romantic-axis",
  "shanghai-couple-2d-romantic-citywalk",
  "shanghai-couple-3d-night-romance",
  "xian-couple-2d-food-citywalk",
  "xian-couple-3d-tangfeng-night",
  "xiamen-couple-2d-gulangyu-shapowei",
  "xiamen-couple-3d-photo-citywalk-food",
  "chengdu-couple-2d-food-citywalk",
  "chengdu-couple-3d-slow-food-romance",
  "hangzhou-couple-2d-slow-tea-lake",
  "hangzhou-couple-3d-romantic-slow",
  "guangzhou-couple-2d-food-citywalk",
  "guangzhou-couple-3d-riverside-romance",
  "shenzhen-couple-2d-photo-citywalk-food",
  "shenzhen-couple-3d-skyline-romance",
  "chongqing-couple-2d-photo-food",
  "chongqing-couple-3d-night-romance",
  "qingdao-couple-3d-slow-photo-food",
  "qingdao-couple-3d-redroof-sunset",
  "sanya-couple-3d-sunset-coconut",
  "sanya-couple-3d-coconut-bay-romance",
  "suzhou-couple-3d-slow-garden-canal",
  "suzhou-couple-4d-water-lantern",
  "nanjing-couple-2d-citywalk-food",
  "nanjing-couple-3d-lantern-walk",
  "lijiang-couple-3d-slow-citywalk-photo",
  "lijiang-couple-3d-mountain-love",
  "dali-couple-3d-slow-lakeside",
  "dali-couple-4d-mountain-lake-night",
]);

function getDefaultSourceDirectory() {
  return path.resolve(
    process.cwd(),
    "data",
    "explore",
    "source",
    "explore_plans_production",
  );
}

function getDefaultOutputDirectory() {
  return path.resolve(process.cwd(), "data", "explore", "normalized");
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    sourceDir: getDefaultSourceDirectory(),
    outputDir: getDefaultOutputDirectory(),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if ((arg === "--source" || arg === "--source-dir") && next) {
      options.sourceDir = path.resolve(process.cwd(), next);
      index += 1;
      continue;
    }

    if ((arg === "--output" || arg === "--output-dir") && next) {
      options.outputDir = path.resolve(process.cwd(), next);
      index += 1;
    }
  }

  return options;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Unknown normalization error";
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function cleanText(value: unknown, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    return fallback;
  }

  if (DISPLAY_FORBIDDEN_SNIPPETS.some((snippet) => normalized.includes(snippet))) {
    return fallback;
  }

  return normalized;
}

function cleanTag(value: string) {
  return cleanText(value).toLowerCase();
}

function uniqueStrings(values: Array<string | undefined>) {
  return Array.from(new Set(values.map((value) => cleanText(value)).filter(Boolean)));
}

function sentenceFromSummary(summary: string) {
  const match = summary.match(/^[^。！？!?]+[。！？!?]?/u);
  return cleanText(match?.[0], summary);
}

function themeKeywordScore(theme: ThemeSlug, haystack: string) {
  const keywordMap: Record<ThemeSlug, string[]> = {
    citywalk: [
      "citywalk",
      "local-culture",
      "old-street",
      "hutong",
      "riverfront",
      "architecture",
      "walk",
      "漫步",
      "街区",
      "胡同",
      "city stroll",
    ],
    food: [
      "food",
      "street-food",
      "local-food",
      "morning-tea",
      "seafood",
      "snacks",
      "night-market",
      "小吃",
      "美食",
      "早茶",
      "夜市",
    ],
    heritage: [
      "heritage",
      "history",
      "historical",
      "old-town",
      "imperial",
      "ancient",
      "silk-road",
      "古城",
      "历史",
      "丝路",
      "皇城",
      "唐风",
    ],
    night: [
      "night-view",
      "nightlife",
      "evening-scene",
      "river-evening",
      "riverside-evening",
      "sunset",
      "night",
      "夜景",
      "夜色",
      "夜游",
      "灯火",
    ],
    seaside: [
      "coastal-city",
      "beach",
      "bay-view",
      "sea",
      "island",
      "coast",
      "ocean",
      "海边",
      "海景",
      "海风",
      "鼓浪屿",
    ],
    jiangnan: [
      "jiangnan",
      "canal-walk",
      "water-town",
      "garden",
      "west-lake",
      "西湖",
      "江南",
      "水乡",
      "园林",
      "运河",
      "茶山",
    ],
    nature: [
      "nature",
      "forest",
      "desert",
      "karst",
      "valley",
      "rainforest",
      "草原",
      "山水",
      "自然",
      "风景",
      "茶山",
    ],
    family: [
      "family-friendly",
      "family",
      "kids",
      "亲子",
      "家庭",
      "爸妈",
      "老人",
    ],
    romance: [
      "romantic",
      "couple",
      "date",
      "约会",
      "情侣",
      "浪漫",
    ],
    museum: [
      "museum",
      "exhibition",
      "cultural-landmarks",
      "art-space",
      "博物馆",
      "展览",
      "文化地标",
    ],
    shopping: [
      "shopping",
      "mall",
      "买手",
      "逛街",
      "购物",
      "商圈",
    ],
    mountain: [
      "mountain",
      "snow-mountain",
      "peak",
      "高原",
      "雪山",
      "山地",
      "山景",
    ],
    lake: [
      "lake",
      "lake-view",
      "湖边",
      "湖景",
      "洱海",
      "湖岸",
    ],
    slowTravel: [
      "slow-travel",
      "慢旅行",
      "slow",
      "relaxed",
      "轻松",
      "慢游",
    ],
    general: [],
  };

  return keywordMap[theme].reduce((score, keyword) => {
    return haystack.includes(keyword) ? score + 1 : score;
  }, 0);
}

function inferTheme(source: SourceArchive) {
  const tags = (source.tags ?? []).map((tag) => cleanTag(tag));
  const haystack = [
    ...tags,
    cleanText(source.title).toLowerCase(),
    cleanText(source.summary).toLowerCase(),
    cleanText(source.city?.code).toLowerCase(),
  ].join(" ");
  const scores = new Map<ThemeSlug, number>();

  for (const theme of CONTROLLED_THEMES) {
    scores.set(theme, themeKeywordScore(theme, haystack));
  }

  const tripType = cleanText(source.trip_type).toLowerCase();

  if (tripType === "family") {
    scores.set("family", (scores.get("family") ?? 0) + 2);
  }
  if (tripType === "couple") {
    scores.set("romance", (scores.get("romance") ?? 0) + 2);
  }

  const cityCode = cleanText(source.city?.code).toLowerCase();
  if (["xian", "dunhuang", "nanjing"].includes(cityCode)) {
    scores.set("heritage", (scores.get("heritage") ?? 0) + 1);
  }
  if (["hangzhou", "suzhou"].includes(cityCode)) {
    scores.set("jiangnan", (scores.get("jiangnan") ?? 0) + 1);
  }
  if (["xiamen", "qingdao", "sanya"].includes(cityCode)) {
    scores.set("seaside", (scores.get("seaside") ?? 0) + 1);
  }
  if (["dali", "lijiang", "guilin"].includes(cityCode)) {
    scores.set("nature", (scores.get("nature") ?? 0) + 1);
  }

  const orderedTieBreak: ThemeSlug[] = [
    "seaside",
    "jiangnan",
    "heritage",
    "night",
    "food",
    "museum",
    "shopping",
    "mountain",
    "lake",
    "nature",
    "family",
    "romance",
    "citywalk",
    "slowTravel",
    "general",
  ];

  let bestTheme: ThemeSlug = "general";
  let bestScore = -1;

  for (const theme of orderedTieBreak) {
    const score = scores.get(theme) ?? 0;
    if (score > bestScore) {
      bestTheme = theme;
      bestScore = score;
    }
  }

  return bestScore > 0 ? bestTheme : "general";
}

function inferRecommendedFor(source: SourceArchive, tags: string[]) {
  const tripType = cleanText(source.trip_type).toLowerCase();
  const joined = tags.join(" ").toLowerCase();
  const summary = cleanText(source.summary);
  const results: string[] = [];

  if (tripType === "couple") {
    results.push("情侣");
  }
  if (tripType === "family") {
    results.push("亲子", "家庭");
  }
  if (tripType === "solo") {
    results.push("独游");
  }
  if (tripType === "student") {
    results.push("学生", "朋友同行");
  }

  if (joined.includes("photo") || joined.includes("photography")) {
    results.push("摄影");
  }
  if (joined.includes("family")) {
    results.push("家庭");
  }
  if (joined.includes("couple") || joined.includes("romantic")) {
    results.push("情侣");
  }
  if (joined.includes("solo")) {
    results.push("独游");
  }
  if (joined.includes("student") || joined.includes("budget-friendly")) {
    results.push("学生");
  }
  if (summary.includes("长辈") || summary.includes("爸妈") || summary.includes("老人")) {
    results.push("长辈同行");
  }

  return Array.from(new Set(results));
}

function normalizeStory(title: string, summary: string) {
  const safeSummary = cleanText(summary);

  if (safeSummary.length >= 24) {
    return safeSummary;
  }

  const safeTitle = cleanText(title);
  if (safeTitle && safeSummary) {
    return `${safeTitle}。${safeSummary}`;
  }

  return safeSummary || safeTitle;
}

function buildFeaturedReason(
  summary: string,
  cityCode: string,
  theme: ThemeSlug,
  days: number,
) {
  const sentence = sentenceFromSummary(summary);
  if (sentence) {
    return sentence;
  }

  const cityName = CITY_NAME_ZH[cityCode] ?? cityCode;
  return `${cityName}这条 ${days} 天路线主打${THEME_LABEL_ZH[theme]}，适合先读完再按自己的节奏微调。`;
}

function mapTagLabel(tag: string) {
  return TAG_LABEL_ZH[tag] ?? tag;
}

function buildHighlights(
  source: SourceArchive,
  cityCode: string,
  theme: ThemeSlug,
) {
  const highlights: NormalizedHighlight[] = [];
  const seen = new Set<string>();

  function pushHighlight(title: string, description: string, tag: string) {
    const safeTitle = cleanText(title);
    const safeDescription = cleanText(description);
    const safeTag = cleanText(tag);

    if (!safeTitle || seen.has(safeTitle) || highlights.length >= 4) {
      return;
    }

    highlights.push({
      title: safeTitle,
      description:
        safeDescription || `${safeTitle}会是这份${CITY_NAME_ZH[cityCode] ?? cityCode}路线里很容易记住的一段。`,
      tag: safeTag || THEME_LABEL_ZH[theme],
    });
    seen.add(safeTitle);
  }

  for (const day of source.daily_itinerary ?? []) {
    pushHighlight(
      cleanText(day.title),
      cleanText(day.summary),
      THEME_LABEL_ZH[theme],
    );
  }

  for (const poi of source.pois ?? []) {
    pushHighlight(
      cleanText(poi.name),
      cleanText(poi.reason),
      mapTagLabel(cleanText(poi.type)),
    );
  }

  for (const tag of source.tags ?? []) {
    const safeTag = cleanTag(tag);
    pushHighlight(
      mapTagLabel(safeTag),
      `${CITY_NAME_ZH[cityCode] ?? cityCode}这条路线会把${mapTagLabel(safeTag)}放进更顺的旅行节奏里。`,
      mapTagLabel(safeTag),
    );
  }

  if (highlights.length < 2) {
    pushHighlight(
      THEME_LABEL_ZH[theme],
      `${CITY_NAME_ZH[cityCode] ?? cityCode}这份档案主打${THEME_LABEL_ZH[theme]}，适合先读一遍整体节奏。`,
      THEME_LABEL_ZH[theme],
    );
    pushHighlight(
      `${source.days ?? 1} 天路线预览`,
      `${CITY_NAME_ZH[cityCode] ?? cityCode}这份安排不会把行程压得太满，留了可微调的空间。`,
      "路线",
    );
  }

  return highlights.slice(0, 4);
}

function formatTimeBlockLabel(timeBlock: string) {
  const normalized = timeBlock.toLowerCase();

  if (normalized.includes("morning")) {
    return "上午";
  }
  if (normalized.includes("afternoon")) {
    return "下午";
  }
  if (normalized.includes("evening") || normalized.includes("night")) {
    return "晚上";
  }

  return "行程";
}

function normalizeActivityDescription(
  activity: SourceActivity,
  label: string,
  cityCode: string,
) {
  const description = cleanText(activity.description);
  if (description) {
    return description;
  }

  return `${label}先留一点弹性时间，按${CITY_NAME_ZH[cityCode] ?? cityCode}当天状态微调。`;
}

function normalizeDailyItinerary(source: SourceArchive, cityCode: string) {
  return (source.daily_itinerary ?? []).map<NormalizedDay>((day, dayIndex) => {
    const dayNumber =
      typeof day.day === "number" && Number.isFinite(day.day) && day.day > 0
        ? Math.floor(day.day)
        : dayIndex + 1;

    const activities = (day.activities ?? []).map<NormalizedActivity>((activity) => {
      const timeBlock = cleanText(activity.time_block, "flex");
      const label = formatTimeBlockLabel(timeBlock);

      return {
        timeBlock,
        label,
        description: normalizeActivityDescription(activity, label, cityCode),
        poiRefs: Array.isArray(activity.poi_refs)
          ? activity.poi_refs.map((item) => cleanText(item)).filter(Boolean)
          : [],
        foodRefs: Array.isArray(activity.food_refs)
          ? activity.food_refs.map((item) => cleanText(item)).filter(Boolean)
          : [],
      };
    });

    return {
      dayNumber,
      title: cleanText(day.title, `第 ${dayNumber} 天`),
      summary: cleanText(day.summary, "按当天节奏慢慢走，不必排得太满。"),
      activities,
    };
  });
}

function normalizeFood(source: SourceArchive, cityCode: string) {
  return (source.food ?? []).map<NormalizedFood>((item, index) => ({
    id: cleanText(item.id, `${cityCode}-food-${index + 1}`),
    name: cleanText(item.name, "在地风味"),
    description: cleanText(item.reason, "这一站适合留一顿给当地味道。"),
    type: cleanText(item.category, "local"),
    district: cleanText(item.district),
    imageUrl: "",
  }));
}

function normalizePlaces(source: SourceArchive, cityCode: string) {
  return (source.pois ?? []).map<NormalizedPlace>((item, index) => ({
    id: cleanText(item.id, `${cityCode}-place-${index + 1}`),
    name: cleanText(item.name, "路线节点"),
    description: cleanText(item.reason, "这一站可以按当天状态灵活停留。"),
    type: cleanText(item.type, "sight"),
    district: cleanText(item.district),
    imageUrl: "",
    recommendedDurationMinutes:
      typeof item.recommended_duration_minutes === "number" &&
      Number.isFinite(item.recommended_duration_minutes)
        ? item.recommended_duration_minutes
        : undefined,
  }));
}

function findCityFallbackPath(cityCode: string) {
  const candidates = [
    path.resolve(process.cwd(), "public", "images", "explore", "cities", `${cityCode}-city-card.png`),
    path.resolve(process.cwd(), "public", "images", "explore", "cities", `${cityCode}-city-card-alt.png`),
  ];

  for (const absolutePath of candidates) {
    if (existsSync(absolutePath)) {
      return absolutePath
        .replace(path.resolve(process.cwd(), "public").replaceAll("\\", "/"), "")
        .replaceAll("\\", "/");
    }
  }

  return "";
}

function buildThemeFallbackPath(theme: ThemeSlug) {
  return `/images/explore/archive/fallback/theme-${theme}-archive-cover.png`;
}

function getThemeFallbackAbsolutePath(theme: ThemeSlug) {
  return path.resolve(
    process.cwd(),
    "public",
    "images",
    "explore",
    "archive",
    "fallback",
    `theme-${theme}-archive-cover.png`,
  );
}

function pickPriority(record: NormalizedArchive) {
  if (P0_SOURCE_SLUGS.has(record.sourceSlug)) {
    return "P0" as const;
  }

  if (PRIORITY_CITY_SET.has(record.cityCode) || PRIORITY_THEME_SET.has(record.theme)) {
    return "P1" as const;
  }

  if (findCityFallbackPath(record.cityCode)) {
    return "P2" as const;
  }

  return "P3" as const;
}

function buildNeededImages(
  record: NormalizedArchive,
  cityFallbackPath: string,
  themeFallbackExists: boolean,
) {
  const needed = new Set<NeededImage>();

  if (!record.coverImageUrl) {
    needed.add("cover");
  }
  if (record.galleryImages.length === 0) {
    needed.add("gallery");
  }
  if (record.food.some((item) => !item.imageUrl)) {
    needed.add("food");
  }
  if (record.places.some((item) => !item.imageUrl)) {
    needed.add("places");
  }
  if (!cityFallbackPath) {
    needed.add("cityFallback");
  }
  if (!themeFallbackExists && PRIORITY_THEME_SET.has(record.theme)) {
    needed.add("themeFallback");
  }

  return Array.from(needed);
}

function validateNoDangerousStrings(value: unknown, trail: string[] = []) {
  if (typeof value === "string") {
    for (const snippet of DISPLAY_FORBIDDEN_SNIPPETS) {
      if (value.includes(snippet)) {
        throw new Error(
          `Found forbidden display snippet "${snippet}" at ${trail.join(".") || "root"}.`,
        );
      }
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => validateNoDangerousStrings(item, [...trail, String(index)]));
    return;
  }

  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      validateNoDangerousStrings(nested, [...trail, key]);
    }
  }
}

function validateNormalizedArchives(records: NormalizedArchive[]) {
  if (records.length !== 200) {
    throw new Error(`Expected 200 normalized archives, received ${records.length}.`);
  }

  const externalIds = new Set(records.map((record) => record.externalId));
  const slugs = new Set(records.map((record) => record.slug));

  if (externalIds.size !== records.length) {
    throw new Error("externalId is not unique across normalized archives.");
  }
  if (slugs.size !== records.length) {
    throw new Error("slug is not unique across normalized archives.");
  }

  for (const record of records) {
    if (!record.title) {
      throw new Error(`Missing title for ${record.externalId}.`);
    }
    if (!record.summary) {
      throw new Error(`Missing summary for ${record.externalId}.`);
    }
    if (!record.city) {
      throw new Error(`Missing city for ${record.externalId}.`);
    }
    if (!record.cityCode) {
      throw new Error(`Missing cityCode for ${record.externalId}.`);
    }
    if (!ALLOWED_CITY_CODES.has(record.cityCode)) {
      throw new Error(`Disallowed cityCode for v1.8 normalized output: ${record.cityCode}.`);
    }
    if (!Number.isInteger(record.days) || record.days <= 0) {
      throw new Error(`Invalid days for ${record.externalId}.`);
    }
    if (!Array.isArray(record.tags)) {
      throw new Error(`tags must be an array for ${record.externalId}.`);
    }
    if (!Array.isArray(record.recommendedFor)) {
      throw new Error(`recommendedFor must be an array for ${record.externalId}.`);
    }
    if (!Array.isArray(record.dailyItinerary)) {
      throw new Error(`dailyItinerary must be an array for ${record.externalId}.`);
    }
    if (!Array.isArray(record.food)) {
      throw new Error(`food must be an array for ${record.externalId}.`);
    }
    if (!Array.isArray(record.places)) {
      throw new Error(`places must be an array for ${record.externalId}.`);
    }
    if (typeof record.coverImageUrl === "undefined") {
      throw new Error(`coverImageUrl field missing for ${record.externalId}.`);
    }
    if (typeof record.galleryImages === "undefined") {
      throw new Error(`galleryImages field missing for ${record.externalId}.`);
    }

    validateNoDangerousStrings(record, [record.externalId]);
  }
}

async function loadSourceArchive(filePath: string) {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as SourceArchive;
}

function normalizeArchive(
  source: SourceArchive,
  fileName: string,
  canonicalSlug: string,
) {
  const fileStem = path.parse(fileName).name;
  const cityCode = cleanText(source.city?.code).toLowerCase();
  const tags = uniqueStrings((source.tags ?? []).map((tag) => cleanTag(tag)));
  const theme = inferTheme(source);
  const title = cleanText(source.title, fileStem);
  const summary = cleanText(source.summary, `${CITY_NAME_ZH[cityCode] ?? cityCode}这条路线正在整理中。`);
  const days =
    typeof source.days === "number" && Number.isFinite(source.days) && source.days > 0
      ? Math.floor(source.days)
      : 1;

  return {
    externalId: `explore_${fileStem}`,
    slug: canonicalSlug,
    sourceSlug: cleanText(source.slug, fileStem),
    title,
    summary,
    city: cleanText(source.city?.name, cityCode),
    cityCode,
    region: cleanText(source.city?.region_name, cityCode),
    theme,
    tripType: cleanText(source.trip_type, "general"),
    days,
    pace: cleanText(source.pace, "balanced"),
    budgetLevel: cleanText(source.budget?.level),
    budgetNote: cleanText(source.budget?.note),
    tags,
    recommendedFor: inferRecommendedFor(source, tags),
    coverImageUrl: "",
    galleryImages: [],
    story: normalizeStory(title, summary),
    featuredReason: buildFeaturedReason(summary, cityCode, theme, days),
    highlights: buildHighlights(source, cityCode, theme),
    dailyItinerary: normalizeDailyItinerary(source, cityCode),
    food: normalizeFood(source, cityCode),
    places: normalizePlaces(source, cityCode),
    imagePrompt: cleanText(source.image_prompt),
    source: {
      type: "ai_generated_v1" as const,
      sourceFile: fileName,
      sourceVersion: "v1" as const,
    },
  } satisfies NormalizedArchive;
}

function buildImageManifest(records: NormalizedArchive[]) {
  const perThemeIndex = new Map<string, number>();

  return records.map<ImageManifestRecord>((record) => {
    const counterKey = `${record.cityCode}:${record.theme}`;
    const nextIndex = (perThemeIndex.get(counterKey) ?? 0) + 1;
    perThemeIndex.set(counterKey, nextIndex);

    const coverImagePath = `/images/explore/archive/covers/archive-cover-${record.cityCode}-${record.theme}-${String(nextIndex).padStart(2, "0")}.png`;
    const coverImageAbsolutePath = path.resolve(
      process.cwd(),
      "public",
      "images",
      "explore",
      "archive",
      "covers",
      `archive-cover-${record.cityCode}-${record.theme}-${String(nextIndex).padStart(2, "0")}.png`,
    );
    const fallbackCityImagePath = findCityFallbackPath(record.cityCode);
    const fallbackThemeImagePath = buildThemeFallbackPath(record.theme);
    const themeFallbackExists = existsSync(getThemeFallbackAbsolutePath(record.theme));

    let coverStatus: CoverStatus = "missing";

    if (existsSync(coverImageAbsolutePath)) {
      coverStatus = "ready";
    } else if (fallbackCityImagePath) {
      coverStatus = "fallback-city";
    } else if (themeFallbackExists) {
      coverStatus = "fallback-theme";
    }

    return {
      externalId: record.externalId,
      slug: record.slug,
      title: record.title,
      city: record.city,
      cityCode: record.cityCode,
      region: record.region,
      theme: record.theme,
      tripType: record.tripType,
      days: record.days,
      coverImagePath,
      coverStatus,
      fallbackCityImagePath,
      fallbackThemeImagePath,
      neededImages: buildNeededImages(record, fallbackCityImagePath, themeFallbackExists),
      priority: pickPriority(record),
    };
  });
}

function buildReadmeContent() {
  return `# Explore Normalized Data

## 目录说明

- \`source/\` 保存原始 AI 生成结果，保持只读，不直接给前端使用。
- \`normalized/\` 是 Wanderly v1.8 Explore 的标准化内容层。

## 当前产物

- \`explore_archives_v1.json\`
  - 统一的标准字段输出
  - 用于后续导入、审计和前端统一读取
- \`explore_archive_image_manifest.json\`
  - 用于补图计划、图片接线和优先级排期

## 使用原则

- 不要手改 normalized JSON。
- 需要更新时，请重新运行：

\`\`\`bash
node --experimental-strip-types scripts/normalize-explore-archives.ts
\`\`\`

## 数据治理约定

- 原始目录保留 source of truth
- normalized 层负责 slug 去重、externalId 生成、theme / recommendedFor / highlights 推导
- 图片字段和 image manifest 在 normalized 层统一治理
`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const entries = await readdir(options.sourceDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort();

  const slugCounts = new Map<string, number>();
  const sourcesByFile = new Map<string, SourceArchive>();

  for (const file of files) {
    const fullPath = path.join(options.sourceDir, file);
    const source = await loadSourceArchive(fullPath);
    sourcesByFile.set(file, source);
    const sourceSlug = cleanText(source.slug, path.parse(file).name);
    slugCounts.set(sourceSlug, (slugCounts.get(sourceSlug) ?? 0) + 1);
  }

  const duplicateCounters = new Map<string, number>();
  const duplicatesResolved: Record<string, string[]> = {};
  const normalizedRecords: NormalizedArchive[] = [];

  for (const file of files) {
    const source = sourcesByFile.get(file);
    if (!source) {
      throw new Error(`Source JSON missing in memory for ${file}.`);
    }

    const fileStem = path.parse(file).name;
    const sourceSlug = cleanText(source.slug, fileStem);
    const isDuplicateSlug = (slugCounts.get(sourceSlug) ?? 0) > 1;
    let canonicalSlug = sourceSlug;

    if (isDuplicateSlug) {
      const suffixMatch = fileStem.match(/_(\d{3,})$/);
      const suffix = suffixMatch?.[1] ?? String((duplicateCounters.get(sourceSlug) ?? 0) + 1).padStart(3, "0");
      canonicalSlug = `${sourceSlug}-${suffix}`;
      duplicateCounters.set(sourceSlug, (duplicateCounters.get(sourceSlug) ?? 0) + 1);
      duplicatesResolved[sourceSlug] = [...(duplicatesResolved[sourceSlug] ?? []), canonicalSlug];
    }

    normalizedRecords.push(normalizeArchive(source, file, canonicalSlug));
  }

  validateNormalizedArchives(normalizedRecords);

  const imageManifest = buildImageManifest(normalizedRecords);
  validateNoDangerousStrings(imageManifest);

  const outputArchivesPath = path.join(options.outputDir, "explore_archives_v1.json");
  const outputManifestPath = path.join(
    options.outputDir,
    "explore_archive_image_manifest.json",
  );
  const outputReadmePath = path.join(options.outputDir, "README.md");

  await mkdir(options.outputDir, { recursive: true });
  await writeFile(outputArchivesPath, JSON.stringify(normalizedRecords, null, 2), "utf8");
  await writeFile(outputManifestPath, JSON.stringify(imageManifest, null, 2), "utf8");
  await writeFile(outputReadmePath, buildReadmeContent(), "utf8");

  const themeDistribution = normalizedRecords.reduce<Record<string, number>>((acc, record) => {
    acc[record.theme] = (acc[record.theme] ?? 0) + 1;
    return acc;
  }, {});

  const recommendedDistribution = normalizedRecords.reduce<Record<string, number>>(
    (acc, record) => {
      for (const label of record.recommendedFor) {
        acc[label] = (acc[label] ?? 0) + 1;
      }
      return acc;
    },
    {},
  );

  const priorityDistribution = imageManifest.reduce<Record<PriorityLevel, number>>(
    (acc, item) => {
      acc[item.priority] = (acc[item.priority] ?? 0) + 1;
      return acc;
    },
    { P0: 0, P1: 0, P2: 0, P3: 0 },
  );

  const summary: ScriptSummary = {
    total: normalizedRecords.length,
    externalIdUnique:
      new Set(normalizedRecords.map((record) => record.externalId)).size === normalizedRecords.length,
    slugUnique:
      new Set(normalizedRecords.map((record) => record.slug)).size === normalizedRecords.length,
    themeDistribution,
    recommendedDistribution,
    priorityDistribution,
    duplicatesResolved,
    outputFiles: {
      archives: outputArchivesPath,
      imageManifest: outputManifestPath,
      readme: outputReadmePath,
    },
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: getErrorMessage(error),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
