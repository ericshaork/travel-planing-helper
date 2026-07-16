import { describe, expect, it } from "vitest";

import {
  buildUserDefaultsFromSettings,
  extractTripSpecificPreferences,
  mergeTripPreferences,
  summarizeEffectivePreferences,
} from "../../lib/ai/preferences";
import { cloneDefaultUserSettings } from "../../lib/settings/defaults";
import type { TripRequest } from "../../lib/trip/types";

const tripRequest: TripRequest = {
  departureCity: "深圳",
  destinationCity: "厦门",
  days: 3,
  budget: 2500,
  currency: "CNY",
  interests: ["海边", "美食"],
  travelStyles: ["轻松"],
  mustVisitPlaces: [],
  avoidPlaces: [],
  localTransportPreference: "优先公共交通",
  schedulePreference: "不想太早出门",
};

describe("AI preference helpers", () => {
  it("useLongTermPreferences = false 时不生成 userDefaults", () => {
    const settings = cloneDefaultUserSettings();
    settings.aiPreferences.useLongTermPreferences = false;

    expect(buildUserDefaultsFromSettings(settings)).toBeNull();
  });

  it("当前计划 interests 非空时优先使用当前计划", () => {
    const settings = cloneDefaultUserSettings();
    settings.travelPreferences.interests = ["food", "hidden_gems"];
    const userDefaults = buildUserDefaultsFromSettings(settings);
    const tripSpecificPreferences = extractTripSpecificPreferences(tripRequest);
    const effectivePreferences = mergeTripPreferences(
      userDefaults,
      tripSpecificPreferences,
    );

    expect(effectivePreferences.interests).toEqual(["海边", "美食"]);
  });

  it("当前计划 interests 为空时回退到长期默认 interests", () => {
    const settings = cloneDefaultUserSettings();
    settings.travelPreferences.interests = ["food", "hidden_gems"];
    const userDefaults = buildUserDefaultsFromSettings(settings);
    const tripSpecificPreferences = extractTripSpecificPreferences({
      ...tripRequest,
      interests: [],
    });
    const effectivePreferences = mergeTripPreferences(
      userDefaults,
      tripSpecificPreferences,
    );

    expect(effectivePreferences.interests).toEqual(["food", "hidden_gems"]);
  });

  it("偏好摘要使用中文，不暴露英文枚举或 workspace 偏好", () => {
    const settings = cloneDefaultUserSettings();
    settings.travelPreferences.interests = ["food", "hidden_gems"];
    settings.aiPreferences.preferHiddenGems = true;
    settings.aiPreferences.preferLessWalking = true;
    settings.aiPreferences.preferConvenientTransport = true;
    const userDefaults = buildUserDefaultsFromSettings(settings);
    const tripSpecificPreferences = extractTripSpecificPreferences({
      ...tripRequest,
      interests: [],
    });
    const effectivePreferences = mergeTripPreferences(
      userDefaults,
      tripSpecificPreferences,
    );
    const summary = summarizeEffectivePreferences({
      userDefaults,
      tripSpecificPreferences,
      effectivePreferences,
    });

    expect(summary).toContain("用户长期默认偏好可作为参考");
    expect(summary).toContain("本次计划已经明确");
    expect(summary).toContain("交通便利");
    expect(summary).toContain("小众地点");
    expect(summary).not.toContain("hidden_gems");
    expect(summary).not.toContain("public_transport");
    expect(summary).not.toContain("defaultMode");
  });
});
