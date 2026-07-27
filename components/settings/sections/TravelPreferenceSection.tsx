"use client";

import type { UserSettings } from "@/lib/settings/types";

import { ChoiceGroup } from "../ui/ChoiceGroup";
import { MultiChoiceGroup } from "../ui/MultiChoiceGroup";
import { PreferenceRow } from "../ui/PreferenceRow";
import { SettingsSection } from "../ui/SettingsSection";

const budgetOptions = [
  { value: "budget", label: "节省" },
  { value: "moderate", label: "适中" },
  { value: "comfort", label: "舒适" },
] as const;

const paceOptions = [
  { value: "slow", label: "慢慢逛" },
  { value: "balanced", label: "平衡" },
  { value: "packed", label: "紧凑" },
] as const;

const interestOptions = [
  { value: "history_culture", label: "历史文化" },
  { value: "nature", label: "自然风景" },
  { value: "city_walk", label: "城市漫游" },
  { value: "food", label: "美食" },
  { value: "family", label: "亲子" },
  { value: "hidden_gems", label: "小众地点" },
] as const;

const companionOptions = [
  { value: "solo", label: "一个人" },
  { value: "friends", label: "朋友" },
  { value: "partner", label: "伴侣" },
  { value: "family", label: "家人" },
  { value: "parent_child", label: "亲子" },
] as const;

const wakeUpOptions = [
  { value: "early", label: "早起" },
  { value: "normal", label: "正常" },
  { value: "sleep_in", label: "不赶早" },
] as const;

const transportOptions = [
  { value: "public_transport", label: "公共交通" },
  { value: "taxi_first", label: "打车更方便" },
  { value: "walkable", label: "步行友好" },
  { value: "self_drive", label: "自驾" },
] as const;

export function TravelPreferenceSection({
  settings,
  onUpdate,
}: {
  settings: UserSettings;
  onUpdate: (nextSettings: UserSettings) => void;
}) {
  return (
    <SettingsSection
      id="settings-travel"
      title="旅行习惯"
      hint="这些偏好会作为以后新建旅行计划时的默认参考，你仍然可以按每次出行再单独调整。"
    >
      <PreferenceRow
        title="预算"
        description="决定 AI 默认更偏向哪一种消费档次。"
      >
        <ChoiceGroup
          options={budgetOptions}
          value={settings.travelPreferences.budget}
          onChange={(budget) =>
            onUpdate({
              ...settings,
              travelPreferences: {
                ...settings.travelPreferences,
                budget,
              },
            })
          }
        />
      </PreferenceRow>

      <PreferenceRow
        title="旅行节奏"
        description="默认更偏轻松、平衡还是紧凑。"
      >
        <ChoiceGroup
          options={paceOptions}
          value={settings.travelPreferences.pace}
          onChange={(pace) =>
            onUpdate({
              ...settings,
              travelPreferences: {
                ...settings.travelPreferences,
                pace,
              },
            })
          }
        />
      </PreferenceRow>

      <PreferenceRow
        title="兴趣方向"
        description="你平时更容易优先考虑的旅行内容。"
      >
        <MultiChoiceGroup
          options={interestOptions}
          value={settings.travelPreferences.interests}
          onToggle={(interest) => {
            const nextInterests = settings.travelPreferences.interests.includes(
              interest,
            )
              ? settings.travelPreferences.interests.filter((item) => item !== interest)
              : [...settings.travelPreferences.interests, interest];

            onUpdate({
              ...settings,
              travelPreferences: {
                ...settings.travelPreferences,
                interests: nextInterests,
              },
            });
          }}
        />
      </PreferenceRow>

      <PreferenceRow
        title="同行人"
        description="给新计划一个默认同行场景。"
      >
        <ChoiceGroup
          options={companionOptions}
          value={settings.travelPreferences.companions}
          onChange={(companions) =>
            onUpdate({
              ...settings,
              travelPreferences: {
                ...settings.travelPreferences,
                companions,
              },
            })
          }
        />
      </PreferenceRow>

      <PreferenceRow
        title="起床偏好"
        description="比如你平时不想太早出门。"
      >
        <ChoiceGroup
          options={wakeUpOptions}
          value={settings.travelPreferences.wakeUpPreference}
          onChange={(wakeUpPreference) =>
            onUpdate({
              ...settings,
              travelPreferences: {
                ...settings.travelPreferences,
                wakeUpPreference,
              },
            })
          }
        />
      </PreferenceRow>

      <PreferenceRow
        title="交通偏好"
        description="默认更偏向公共交通、打车、步行还是自驾。"
      >
        <ChoiceGroup
          options={transportOptions}
          value={settings.travelPreferences.transportPreference}
          onChange={(transportPreference) =>
            onUpdate({
              ...settings,
              travelPreferences: {
                ...settings.travelPreferences,
                transportPreference,
              },
            })
          }
        />
      </PreferenceRow>
    </SettingsSection>
  );
}
