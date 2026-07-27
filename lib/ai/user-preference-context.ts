import {
  buildUserDefaultsFromSettings,
  type UserDefaults,
} from "./preferences";
import type { UserSettings } from "../settings/types";

export interface UserPreferenceContext {
  source: "user_settings";
  userDefaults: UserDefaults;
  summary: string;
}

const budgetLabels: Record<UserDefaults["budget"], string> = {
  budget: "节省",
  moderate: "适中",
  comfort: "舒适",
};

const paceLabels: Record<UserDefaults["pace"], string> = {
  slow: "慢节奏",
  balanced: "平衡安排",
  packed: "尽量体验",
};

const companionLabels: Record<UserDefaults["companions"], string> = {
  solo: "一个人出行",
  friends: "朋友同游",
  partner: "情侣/伴侣出行",
  family: "家庭出行",
  parent_child: "亲子出行",
};

const wakeUpLabels: Record<UserDefaults["wakeUpPreference"], string> = {
  early: "偏早起",
  normal: "作息正常",
  sleep_in: "不赶早",
};

const transportLabels: Record<UserDefaults["transportPreference"], string> = {
  public_transport: "更偏公共交通",
  taxi_first: "更偏打车省心",
  walkable: "更喜欢步行友好",
  self_drive: "更适合自驾",
};

const detailLevelLabels: Record<UserDefaults["detailLevel"], string> = {
  brief: "回复尽量简洁",
  standard: "回复详细程度标准",
  detailed: "回复可以更细一些",
};

const interestLabels: Record<UserDefaults["interests"][number], string> = {
  history_culture: "历史文化",
  nature: "自然风景",
  city_walk: "城市漫游",
  food: "美食",
  family: "亲子活动",
  hidden_gems: "小众地点",
};

function joinValues(values: string[]) {
  return values.filter(Boolean).join("、");
}

export function buildUserPreferenceContext(
  settings: UserSettings | null | undefined,
): UserPreferenceContext | null {
  const userDefaults = buildUserDefaultsFromSettings(settings);

  if (!userDefaults) {
    return null;
  }

  const parts = [
    `长期预算偏好偏${budgetLabels[userDefaults.budget]}`,
    `旅行节奏偏${paceLabels[userDefaults.pace]}`,
    companionLabels[userDefaults.companions],
    wakeUpLabels[userDefaults.wakeUpPreference],
    transportLabels[userDefaults.transportPreference],
    detailLevelLabels[userDefaults.detailLevel],
    userDefaults.interests.length > 0
      ? `长期兴趣更偏${joinValues(
          userDefaults.interests.map((interest) => interestLabels[interest]),
        )}`
      : "",
    userDefaults.preferHiddenGems ? "会偏向小众地点" : "",
    userDefaults.preferLessWalking ? "会尽量少走路" : "",
    userDefaults.preferConvenientTransport ? "会优先交通便利" : "",
  ].filter(Boolean);

  return {
    source: "user_settings",
    userDefaults,
    summary: [
      `用户长期偏好参考：${parts.join("；")}。`,
      "这些长期偏好只用于补充理解；如果和本次旅行需求冲突，以本次项目需求为准。",
    ].join("\n"),
  };
}
