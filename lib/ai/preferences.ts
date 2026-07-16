import type { UserSettings } from "../settings/types";
import type { TripRequest } from "../trip/types";

export interface UserDefaults {
  budget: UserSettings["travelPreferences"]["budget"];
  pace: UserSettings["travelPreferences"]["pace"];
  interests: UserSettings["travelPreferences"]["interests"];
  companions: UserSettings["travelPreferences"]["companions"];
  wakeUpPreference: UserSettings["travelPreferences"]["wakeUpPreference"];
  transportPreference: UserSettings["travelPreferences"]["transportPreference"];
  detailLevel: UserSettings["aiPreferences"]["detailLevel"];
  preferHiddenGems: boolean;
  preferLessWalking: boolean;
  preferConvenientTransport: boolean;
}

export interface TripSpecificPreferences {
  budget: number;
  currency: string;
  interests: string[];
  travelStyles: string[];
  accommodationPreference?: string;
  localTransportPreference?: string;
  schedulePreference?: string;
  specialRequirements?: string;
  mustVisitPlaces: string[];
  avoidPlaces: string[];
}

export interface EffectivePreferences {
  budget: number;
  currency: string;
  interests: string[];
  travelStyles: string[];
  accommodationPreference?: string;
  localTransportPreference?: string;
  schedulePreference?: string;
  specialRequirements?: string;
  mustVisitPlaces: string[];
  avoidPlaces: string[];
  pace?: UserDefaults["pace"];
  companions?: UserDefaults["companions"];
  wakeUpPreference?: UserDefaults["wakeUpPreference"];
  transportPreference?: UserDefaults["transportPreference"];
  detailLevel?: UserDefaults["detailLevel"];
  preferHiddenGems?: boolean;
  preferLessWalking?: boolean;
  preferConvenientTransport?: boolean;
}

const budgetLabels: Record<UserDefaults["budget"], string> = {
  budget: "节省",
  moderate: "适中",
  comfort: "舒适",
};

const paceLabels: Record<UserDefaults["pace"], string> = {
  slow: "慢慢逛",
  balanced: "平衡",
  packed: "紧凑",
};

const companionLabels: Record<UserDefaults["companions"], string> = {
  solo: "一个人",
  friends: "朋友同行",
  partner: "伴侣同行",
  family: "家人同行",
  parent_child: "亲子同行",
};

const wakeUpLabels: Record<UserDefaults["wakeUpPreference"], string> = {
  early: "偏早起",
  normal: "作息正常",
  sleep_in: "不赶早",
};

const transportLabels: Record<UserDefaults["transportPreference"], string> = {
  public_transport: "公共交通优先",
  taxi_first: "打车更方便",
  walkable: "步行友好",
  self_drive: "更适合自驾",
};

const detailLevelLabels: Record<UserDefaults["detailLevel"], string> = {
  brief: "回答尽量简洁",
  standard: "回答详细程度标准",
  detailed: "回答可以更详细一些",
};

const longTermInterestLabels: Record<
  UserDefaults["interests"][number],
  string
> = {
  history_culture: "历史文化",
  nature: "自然风景",
  city_walk: "城市漫游",
  food: "美食",
  family: "亲子活动",
  hidden_gems: "小众地点",
};

function joinLabels(values: string[]) {
  return values.filter(Boolean).join("、");
}

function mapInterestLabel(value: string) {
  return value in longTermInterestLabels
    ? longTermInterestLabels[value as UserDefaults["interests"][number]]
    : value;
}

export function buildUserDefaultsFromSettings(
  settings: UserSettings | null | undefined,
): UserDefaults | null {
  if (!settings?.aiPreferences.useLongTermPreferences) {
    return null;
  }

  return {
    budget: settings.travelPreferences.budget,
    pace: settings.travelPreferences.pace,
    interests: [...settings.travelPreferences.interests],
    companions: settings.travelPreferences.companions,
    wakeUpPreference: settings.travelPreferences.wakeUpPreference,
    transportPreference: settings.travelPreferences.transportPreference,
    detailLevel: settings.aiPreferences.detailLevel,
    preferHiddenGems: settings.aiPreferences.preferHiddenGems,
    preferLessWalking: settings.aiPreferences.preferLessWalking,
    preferConvenientTransport: settings.aiPreferences.preferConvenientTransport,
  };
}

export function extractTripSpecificPreferences(
  tripRequest: TripRequest,
): TripSpecificPreferences {
  return {
    budget: tripRequest.budget,
    currency: tripRequest.currency,
    interests: [...tripRequest.interests],
    travelStyles: [...tripRequest.travelStyles],
    accommodationPreference: tripRequest.accommodationPreference,
    localTransportPreference: tripRequest.localTransportPreference,
    schedulePreference: tripRequest.schedulePreference,
    specialRequirements: tripRequest.specialRequirements,
    mustVisitPlaces: [...tripRequest.mustVisitPlaces],
    avoidPlaces: [...tripRequest.avoidPlaces],
  };
}

export function mergeTripPreferences(
  userDefaults: UserDefaults | null,
  tripSpecificPreferences: TripSpecificPreferences,
): EffectivePreferences {
  return {
    budget: tripSpecificPreferences.budget,
    currency: tripSpecificPreferences.currency,
    interests:
      tripSpecificPreferences.interests.length > 0
        ? [...tripSpecificPreferences.interests]
        : [...(userDefaults?.interests ?? [])],
    travelStyles: [...tripSpecificPreferences.travelStyles],
    accommodationPreference: tripSpecificPreferences.accommodationPreference,
    localTransportPreference:
      tripSpecificPreferences.localTransportPreference ??
      userDefaults?.transportPreference,
    schedulePreference: tripSpecificPreferences.schedulePreference,
    specialRequirements: tripSpecificPreferences.specialRequirements,
    mustVisitPlaces: [...tripSpecificPreferences.mustVisitPlaces],
    avoidPlaces: [...tripSpecificPreferences.avoidPlaces],
    pace: userDefaults?.pace,
    companions: userDefaults?.companions,
    wakeUpPreference: userDefaults?.wakeUpPreference,
    transportPreference: userDefaults?.transportPreference,
    detailLevel: userDefaults?.detailLevel,
    preferHiddenGems: userDefaults?.preferHiddenGems,
    preferLessWalking: userDefaults?.preferLessWalking,
    preferConvenientTransport: userDefaults?.preferConvenientTransport,
  };
}

export function summarizeEffectivePreferences(input: {
  userDefaults: UserDefaults | null;
  tripSpecificPreferences: TripSpecificPreferences;
  effectivePreferences: EffectivePreferences;
}) {
  const { userDefaults, tripSpecificPreferences, effectivePreferences } = input;

  if (!userDefaults) {
    return undefined;
  }

  const longTermParts = [
    `长期预算偏好偏${budgetLabels[userDefaults.budget]}`,
    `旅行节奏偏${paceLabels[userDefaults.pace]}`,
    companionLabels[userDefaults.companions],
    wakeUpLabels[userDefaults.wakeUpPreference],
    transportLabels[userDefaults.transportPreference],
    detailLevelLabels[userDefaults.detailLevel],
    userDefaults.interests.length > 0
      ? `长期兴趣更偏${joinLabels(
          userDefaults.interests.map((interest) => longTermInterestLabels[interest]),
        )}`
      : "",
    userDefaults.preferHiddenGems ? "会偏向小众地点" : "",
    userDefaults.preferLessWalking ? "会尽量少走路" : "",
    userDefaults.preferConvenientTransport ? "会优先交通便利" : "",
  ].filter(Boolean);

  const tripParts = [
    `本次预算约 ${tripSpecificPreferences.budget} ${tripSpecificPreferences.currency}`,
    tripSpecificPreferences.interests.length > 0
      ? `本次更看重${joinLabels(tripSpecificPreferences.interests)}`
      : "",
    tripSpecificPreferences.travelStyles.length > 0
      ? `本次旅行风格偏${joinLabels(tripSpecificPreferences.travelStyles)}`
      : "",
    tripSpecificPreferences.localTransportPreference
      ? `本次已明确市内交通偏好：${tripSpecificPreferences.localTransportPreference}`
      : "",
    tripSpecificPreferences.schedulePreference
      ? `本次已明确行程节奏或作息偏好：${tripSpecificPreferences.schedulePreference}`
      : "",
    tripSpecificPreferences.accommodationPreference
      ? `本次住宿偏好：${tripSpecificPreferences.accommodationPreference}`
      : "",
    tripSpecificPreferences.specialRequirements
      ? `本次还有这些特别要求：${tripSpecificPreferences.specialRequirements}`
      : "",
  ].filter(Boolean);

  const effectiveParts = [
    !tripSpecificPreferences.localTransportPreference &&
    effectivePreferences.localTransportPreference
      ? `如果本次没有单独说明，可参考${transportLabels[effectivePreferences.localTransportPreference as UserDefaults["transportPreference"]]}`
      : "",
    tripSpecificPreferences.interests.length === 0 && effectivePreferences.interests.length > 0
      ? `如果本次兴趣没有填满，可优先参考${joinLabels(
          effectivePreferences.interests.map((interest) => mapInterestLabel(interest)),
        )}`
      : "",
  ].filter(Boolean);

  return [
    `用户长期默认偏好可作为参考：${longTermParts.join("，")}。`,
    tripParts.length > 0
      ? `本次计划已经明确：${tripParts.join("，")}。`
      : "",
    effectiveParts.length > 0 ? `补位参考：${effectiveParts.join("，")}。` : "",
    "如果本次计划偏好和长期默认偏好冲突，以本次计划填写内容为准。",
  ]
    .filter(Boolean)
    .join("\n");
}
