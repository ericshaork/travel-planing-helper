import type { ExploreCreatorType, ExploreTripDailyActivity } from "./types";

const FORBIDDEN_SNIPPETS = [
  "锟",
  "�",
  "{activity.description}",
  "undefined",
  "null",
  "NaN",
  "??",
];

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function isRenderableText(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    return false;
  }

  return !FORBIDDEN_SNIPPETS.some((snippet) => normalized.includes(snippet));
}

export function cleanDisplayText(value: unknown, fallback = "") {
  if (!isRenderableText(value)) {
    return fallback;
  }

  return normalizeWhitespace(value);
}

export function cleanDisplayList(values: Array<unknown>, fallback: string[] = []) {
  const cleaned = values.map((value) => cleanDisplayText(value)).filter(Boolean);
  return cleaned.length > 0 ? Array.from(new Set(cleaned)) : fallback;
}

export function formatDaysText(days: number | null | undefined, fallback = "") {
  if (typeof days !== "number" || !Number.isFinite(days) || days <= 0) {
    return fallback;
  }

  return `${days} 天`;
}

export function formatTripTypeLabel(tripType: string | undefined) {
  const normalized = cleanDisplayText(tripType).toLowerCase();

  switch (normalized) {
    case "couple":
      return "情侣";
    case "family":
      return "亲子";
    case "solo":
      return "独旅";
    case "student":
      return "学生";
    case "citywalk":
      return "城市漫步";
    case "food":
      return "美食";
    case "coast":
      return "海边";
    default:
      return cleanDisplayText(tripType, "自由行");
  }
}

export function formatCreatorTypeLabel(creatorType: ExploreCreatorType | undefined) {
  switch (creatorType) {
    case "editorial":
      return "编辑档案";
    case "community":
      return "社区档案";
    case "ai_generated":
    default:
      return "AI 档案";
  }
}

export function formatTimeBlockLabel(value: string | undefined) {
  const normalized = cleanDisplayText(value).toLowerCase();

  if (!normalized) {
    return "行程";
  }

  if (["morning", "am", "上午", "早上", "清晨"].some((token) => normalized.includes(token))) {
    return "上午";
  }

  if (["afternoon", "pm", "下午"].some((token) => normalized.includes(token))) {
    return "下午";
  }

  if (["evening", "night", "晚上", "夜间", "傍晚"].some((token) => normalized.includes(token))) {
    return "晚上";
  }

  return cleanDisplayText(value, "行程");
}

export function formatActivityDescription(
  activity: Partial<ExploreTripDailyActivity> & {
    title?: string;
    location?: string;
  },
) {
  const description = cleanDisplayText(activity.description);
  const title = cleanDisplayText(activity.title);
  const location = cleanDisplayText(activity.location);

  if (description) {
    return description;
  }

  if (title && location) {
    return `${title}，地点在${location}`;
  }

  if (title) {
    return title;
  }

  if (location) {
    return location;
  }

  return "保留弹性时间，按当天状态微调。";
}
