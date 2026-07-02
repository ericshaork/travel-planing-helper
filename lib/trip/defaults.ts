export const DEFAULT_CURRENCY = "CNY";

export const INTEREST_OPTIONS = [
  "美食",
  "自然风景",
  "海边",
  "历史文化",
  "博物馆",
  "拍照",
  "购物",
  "夜生活",
  "小众路线",
  "城市漫步",
  "当地体验",
] as const;

export const TRAVEL_STYLE_OPTIONS = [
  "轻松",
  "高效率",
  "深度游",
  "低预算",
  "舒适优先",
  "不想早起",
  "少走路",
] as const;

export const TRIP_INPUT_LIMITS = {
  naturalLanguageText: 2_000,
  modificationRequest: 1_000,
  city: 80,
  shortText: 120,
  longText: 1_000,
  listItem: 120,
  listSize: 30,
  maxDays: 60,
  maxBudget: 10_000_000,
} as const;

export const WEATHER_UNAVAILABLE_MESSAGE = "暂时无法获取实时天气";

export const ESTIMATE_DISCLAIMER =
  "预算为估算值，不代表实时票价或酒店价格，建议出行前再次核实。";
