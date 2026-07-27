import type { TripRequestDraft } from "../../trip/types";

export type InterviewAutoFilledField =
  | "departureCity"
  | "destinationCity"
  | "days"
  | "budget"
  | "currency"
  | "interests"
  | "travelStyles";

export interface InterviewAutoFillResult {
  draft: TripRequestDraft;
  filledFields: InterviewAutoFilledField[];
  isComplete: boolean;
}

const DEFAULT_DAYS = 3;
const DEFAULT_DAILY_BUDGET = 800;
const DEFAULT_CURRENCY = "CNY";
const DEFAULT_DEPARTURE_CITY = "出发地待确认";

const INTEREST_KEYWORDS_TO_VALUES: Array<{ keywords: string[]; value: string }> = [
  { keywords: ["海边", "海景", "海岛", "海岸"], value: "海边" },
  { keywords: ["山", "自然", "森林", "国家公园"], value: "自然风景" },
  { keywords: ["美食", "小吃", "吃"], value: "美食" },
  { keywords: ["历史", "古迹", "博物馆"], value: "历史文化" },
  { keywords: ["夜", "酒吧"], value: "夜生活" },
  { keywords: ["购物", "逛街"], value: "购物" },
  { keywords: ["拍照", "摄影"], value: "拍照" },
  { keywords: ["城市", "citywalk"], value: "城市漫步" },
];

const TRAVEL_STYLE_KEYWORDS_TO_VALUES: Array<{
  keywords: string[];
  value: string;
}> = [
  { keywords: ["轻松", "慢", "舒服", "不累", "悠闲"], value: "轻松" },
  { keywords: ["深度", "沉浸", "慢慢"], value: "深度游" },
  { keywords: ["效率", "紧凑", "多玩"], value: "高效率" },
  { keywords: ["舒适", "住好", "享受"], value: "舒适优先" },
  { keywords: ["预算", "省", "穷游"], value: "低预算" },
];

const FALLBACK_INTERESTS = ["当地体验", "城市漫步"];
const FALLBACK_TRAVEL_STYLES = ["轻松"];

function hasText(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function uniqueList(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

function detectInterestsFromDraft(draft: TripRequestDraft): string[] {
  const seed = [
    ...(draft.interests ?? []),
    ...(draft.mustVisitPlaces ?? []),
    draft.destinationCity,
    draft.schedulePreference,
    draft.specialRequirements,
  ]
    .filter(hasText)
    .join(" ");

  if (!seed) return [];
  const detected = uniqueList(
    INTEREST_KEYWORDS_TO_VALUES.filter(({ keywords }) =>
      keywords.some((keyword) => seed.includes(keyword)),
    ).map(({ value }) => value),
  );
  return detected;
}

function detectTravelStylesFromDraft(draft: TripRequestDraft): string[] {
  const seed = [
    ...(draft.travelStyles ?? []),
    draft.schedulePreference,
    draft.accommodationPreference,
    draft.specialRequirements,
  ]
    .filter(hasText)
    .join(" ");

  if (!seed) return [];
  const detected = uniqueList(
    TRAVEL_STYLE_KEYWORDS_TO_VALUES.filter(({ keywords }) =>
      keywords.some((keyword) => seed.includes(keyword)),
    ).map(({ value }) => value),
  );
  return detected;
}

function estimateDailyBudget(draft: TripRequestDraft): number {
  const baseStyles = draft.travelStyles ?? [];
  if (baseStyles.includes("高效率") || baseStyles.includes("低预算")) {
    return 600;
  }
  if (
    baseStyles.includes("舒适优先") ||
    baseStyles.includes("深度游") ||
    baseStyles.includes("轻松")
  ) {
    return 1000;
  }
  return DEFAULT_DAILY_BUDGET;
}

function estimateBudget(draft: TripRequestDraft): number {
  const days = typeof draft.days === "number" && draft.days > 0 ? draft.days : DEFAULT_DAYS;
  return days * estimateDailyBudget(draft);
}

export function applyInterviewDefaults(
  draft: TripRequestDraft,
): InterviewAutoFillResult {
  const filledFields: InterviewAutoFilledField[] = [];
  const next: TripRequestDraft = { ...draft };

  if (!hasText(next.departureCity)) {
    next.departureCity = DEFAULT_DEPARTURE_CITY;
    filledFields.push("departureCity");
  }

  if (!hasText(next.destinationCity)) {
    next.destinationCity = "探索中的目的地";
    filledFields.push("destinationCity");
  }

  if (typeof next.days !== "number" || next.days <= 0) {
    next.days = DEFAULT_DAYS;
    filledFields.push("days");
  }

  if (typeof next.budget !== "number" || next.budget <= 0) {
    next.budget = estimateBudget(next);
    filledFields.push("budget");
  }

  if (!hasText(next.currency)) {
    next.currency = DEFAULT_CURRENCY;
    filledFields.push("currency");
  }

  const existingInterests = next.interests ?? [];
  const interestsList = uniqueList([
    ...existingInterests,
    ...detectInterestsFromDraft(next),
    ...FALLBACK_INTERESTS,
  ]);
  if (existingInterests.length === 0) {
    next.interests = interestsList;
    filledFields.push("interests");
  }

  const existingStyles = next.travelStyles ?? [];
  const stylesList = uniqueList([
    ...existingStyles,
    ...detectTravelStylesFromDraft(next),
    ...FALLBACK_TRAVEL_STYLES,
  ]);
  if (existingStyles.length === 0) {
    next.travelStyles = stylesList;
    filledFields.push("travelStyles");
  }

  return {
    draft: next,
    filledFields,
    isComplete: true,
  };
}