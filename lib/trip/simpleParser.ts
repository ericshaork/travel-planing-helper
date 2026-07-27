import "server-only";

import type { TripRequestDraft } from "./types";

const CHINESE_CITY = "[\\u3400-\\u9fff]{2,10}";
const DESTINATION_BOUNDARY =
  "(?=玩|旅游|旅行|待|住|[，,。.!！?？\\s]|\\d|$)";

const EXPLICIT_ROUTE_PATTERN = new RegExp(
  `从\\s*(${CHINESE_CITY}?)(?:出发)?\\s*[，,]?\\s*(?:去|到|前往)\\s*(${CHINESE_CITY}?)${DESTINATION_BOUNDARY}`,
);

const SIMPLE_ROUTE_PATTERN = new RegExp(
  `(?:^|我想|想|计划|准备|打算)\\s*(${CHINESE_CITY})\\s*(?:去|到|前往)\\s*(${CHINESE_CITY}?)${DESTINATION_BOUNDARY}`,
);

const DESTINATION_ONLY_PATTERN = new RegExp(
  `(?:我想|想要|计划|准备|打算)\\s*(?:去|到|前往)\\s*(${CHINESE_CITY}?)${DESTINATION_BOUNDARY}`,
);

const SENTENCE_DESTINATION_PATTERN = new RegExp(
  `(?:^|[，,。.!！?？\\s])(?:去|到|前往)\\s*(${CHINESE_CITY}?)${DESTINATION_BOUNDARY}`,
);

const INVALID_DEPARTURE_PHRASES = new Set([
  "我想",
  "想要",
  "不想",
  "计划",
  "准备",
  "打算",
]);

const CHINESE_DIGITS: Record<string, number> = {
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

const INTEREST_KEYWORDS = [
  { keywords: ["海边", "海景", "海岛"], value: "海边" },
  { keywords: ["美食", "吃好吃的", "小吃"], value: "美食" },
  { keywords: ["拍照", "摄影", "出片"], value: "拍照" },
  { keywords: ["历史", "古迹", "人文"], value: "历史文化" },
  { keywords: ["博物馆", "展览"], value: "博物馆" },
  { keywords: ["夜生活", "酒吧", "夜店"], value: "夜生活" },
  { keywords: ["自然风景", "风景", "山水"], value: "自然风景" },
  { keywords: ["城市漫步", "citywalk", "City Walk"], value: "城市漫步" },
  { keywords: ["购物", "逛街"], value: "购物" },
  { keywords: ["小众", "人少"], value: "小众路线" },
  { keywords: ["当地体验", "本地生活"], value: "当地体验" },
] as const;

const STYLE_KEYWORDS = [
  {
    keywords: ["轻松", "不想太累", "别太累", "慢一点"],
    value: "轻松",
  },
  {
    keywords: ["不想早起", "不要早起", "睡到自然醒"],
    value: "不想早起",
  },
  { keywords: ["少走路", "不想走太多"], value: "少走路" },
  { keywords: ["高效率", "多玩几个", "行程紧凑"], value: "高效率" },
  { keywords: ["低预算", "省钱", "穷游"], value: "低预算" },
  { keywords: ["舒适优先", "住得舒服"], value: "舒适优先" },
  { keywords: ["深度游", "深度体验"], value: "深度游" },
] as const;

const COMPANION_KEYWORDS = [
  {
    keywords: ["情侣", "和爱人", "和男友", "和女友", "两个人"],
    value: "情侣同行",
  },
  {
    keywords: ["家庭", "带孩子", "带娃", "带小孩", "亲子"],
    value: "家庭亲子",
  },
  {
    keywords: ["和父母", "带父母", "带老人"],
    value: "带父母",
  },
  {
    keywords: ["闺蜜", "朋友一起", "朋友们", "跟朋友"],
    value: "朋友出行",
  },
  {
    keywords: ["独自", "一个人", "solo", "单独"],
    value: "独自出行",
  },
] as const;

// 匹配紧跟在动词后的地名 token，允许「兵马俑」「兵马俑博物馆」「秦始皇陵」这类长度。
// 收尾遇到常见非地名字符（如 太/很/别/多/晚/早/累 等副词/程度词）时截断，避免把"太商业化的景点"误当成地名。
const PLACE_TOKEN_PATTERN = "([\\u4e00-\\u9fff]{2,15}?)(?=[，,。.!！?？、；\\s]|$)";
const AVOID_PLACE_PATTERN = new RegExp(
  `(?:不去|不想去|不要去|不打算去|不希望去|避开|跳过|拒绝去)\\s*${PLACE_TOKEN_PATTERN}`,
  "g",
);
const MUST_VISIT_PLACE_PATTERN = new RegExp(
  `(?:必去|一定要去|必须去|定要去)\\s*${PLACE_TOKEN_PATTERN}`,
  "g",
);
// 用来过滤误抓的副词短语，避免把「太商业化的景点」「太累的」等塞进 avoid/must-visit
const NON_PLACE_LEADING_CHARS = new Set([
  "太",
  "很",
  "非",
  "别",
  "更",
  "多",
  "少",
  "早",
  "晚",
  "累",
  "老",
  "更",
]);

function extractPlaceTokens(regex: RegExp, text: string): string[] {
  const seen = new Set<string>();
  const results: string[] = [];
  regex.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const token = match[1]?.trim();
    if (!token) continue;
    const firstChar = token.charAt(0);
    if (NON_PLACE_LEADING_CHARS.has(firstChar)) continue;
    if (seen.has(token)) continue;
    seen.add(token);
    results.push(token);
  }
  return results;
}

function parseChineseNumber(value: string): number | undefined {
  if (value === "十") {
    return 10;
  }

  if (value.includes("十")) {
    const [tensText, unitsText] = value.split("十");
    const tens = tensText ? CHINESE_DIGITS[tensText] : 1;
    const units = unitsText ? CHINESE_DIGITS[unitsText] : 0;

    if (tens === undefined || units === undefined) {
      return undefined;
    }

    return tens * 10 + units;
  }

  return CHINESE_DIGITS[value];
}

function parseRoute(text: string): Pick<
  TripRequestDraft,
  "departureCity" | "destinationCity"
> {
  const explicitRoute = EXPLICIT_ROUTE_PATTERN.exec(text);

  if (explicitRoute) {
    return {
      departureCity: explicitRoute[1],
      destinationCity: explicitRoute[2],
    };
  }

  const simpleRoute = SIMPLE_ROUTE_PATTERN.exec(text);

  if (simpleRoute && !INVALID_DEPARTURE_PHRASES.has(simpleRoute[1])) {
    return {
      departureCity: simpleRoute[1],
      destinationCity: simpleRoute[2],
    };
  }

  const destinationOnly =
    DESTINATION_ONLY_PATTERN.exec(text) ??
    SENTENCE_DESTINATION_PATTERN.exec(text);

  return destinationOnly
    ? { destinationCity: destinationOnly[1] }
    : {};
}

function parseDays(text: string): number | undefined {
  const arabicMatch = /(\d{1,3})\s*天/.exec(text);

  if (arabicMatch) {
    return Number(arabicMatch[1]);
  }

  const chineseMatch = /([一二两三四五六七八九十]+)\s*天/.exec(text);
  return chineseMatch ? parseChineseNumber(chineseMatch[1]) : undefined;
}

function parseBudget(text: string): number | undefined {
  const match =
    /(?:预算|人均)(?:大概|约|是|为)?\s*[¥￥]?\s*(\d+(?:\.\d+)?)\s*(?:元|块)?/.exec(
      text,
    );

  return match ? Number(match[1]) : undefined;
}

function collectKeywordValues(
  text: string,
  definitions: ReadonlyArray<{
    readonly keywords: readonly string[];
    readonly value: string;
  }>,
): string[] {
  return definitions
    .filter(({ keywords }) => keywords.some((keyword) => text.includes(keyword)))
    .map(({ value }) => value);
}

export function simpleParseTripText(text: string): TripRequestDraft {
  const normalizedText = text.trim();
  const route = parseRoute(normalizedText);
  const days = parseDays(normalizedText);
  const budget = parseBudget(normalizedText);
  const interests = collectKeywordValues(normalizedText, INTEREST_KEYWORDS);
  const baseStyles = collectKeywordValues(normalizedText, STYLE_KEYWORDS);
  const companions = collectKeywordValues(normalizedText, COMPANION_KEYWORDS);
  const travelStyles = [
    ...baseStyles,
    ...companions.filter((value) => !baseStyles.includes(value)),
  ];
  const avoidPlaces = extractPlaceTokens(AVOID_PLACE_PATTERN, normalizedText);
  const mustVisitPlaces = extractPlaceTokens(
    MUST_VISIT_PLACE_PATTERN,
    normalizedText,
  ).filter((place) => place !== route.destinationCity);

  return {
    ...route,
    ...(days === undefined ? {} : { days }),
    ...(budget === undefined ? {} : { budget }),
    ...(interests.length === 0 ? {} : { interests }),
    ...(travelStyles.length === 0 ? {} : { travelStyles }),
    ...(mustVisitPlaces.length === 0 ? {} : { mustVisitPlaces }),
    ...(avoidPlaces.length === 0 ? {} : { avoidPlaces }),
    ...(baseStyles.includes("不想早起")
      ? { schedulePreference: "不想早起" }
      : {}),
  };
}
