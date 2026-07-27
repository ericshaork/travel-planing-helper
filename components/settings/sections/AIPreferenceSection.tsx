"use client";

import type { UserSettings } from "@/lib/settings/types";

import { ChoiceGroup } from "../ui/ChoiceGroup";
import { PreferenceRow } from "../ui/PreferenceRow";
import { SettingsSection } from "../ui/SettingsSection";

const detailLevelOptions = [
  { value: "brief", label: "简洁" },
  { value: "standard", label: "标准" },
  { value: "detailed", label: "详细" },
] as const;

const booleanOptions = {
  useLongTermPreferences: [
    { value: true, label: "会参考" },
    { value: false, label: "先不参考" },
  ],
  preferHiddenGems: [
    { value: true, label: "喜欢" },
    { value: false, label: "先不强调" },
  ],
  preferLessWalking: [
    { value: true, label: "尽量减少" },
    { value: false, label: "先不强调" },
  ],
  preferConvenientTransport: [
    { value: true, label: "优先考虑" },
    { value: false, label: "先不强调" },
  ],
} as const;

export function AIPreferenceSection({
  settings,
  onUpdate,
}: {
  settings: UserSettings;
  onUpdate: (nextSettings: UserSettings) => void;
}) {
  return (
    <SettingsSection
      id="settings-ai"
      title="AI 助手"
      hint="这些偏好会在之后创建新旅行计划时作为默认参考，不会回头改动已经生成的计划。"
    >
      <PreferenceRow
        title="规划详细程度"
        description="决定 AI 默认写得多细。"
      >
        <ChoiceGroup
          options={detailLevelOptions}
          value={settings.aiPreferences.detailLevel}
          onChange={(detailLevel) =>
            onUpdate({
              ...settings,
              aiPreferences: {
                ...settings.aiPreferences,
                detailLevel,
              },
            })
          }
        />
      </PreferenceRow>

      <PreferenceRow
        title="参考长期偏好"
        description="开启后，AI 会把你已经保存的旅行习惯一起带进新计划。"
      >
        <ChoiceGroup
          options={booleanOptions.useLongTermPreferences}
          value={settings.aiPreferences.useLongTermPreferences}
          onChange={(useLongTermPreferences) =>
            onUpdate({
              ...settings,
              aiPreferences: {
                ...settings.aiPreferences,
                useLongTermPreferences,
              },
            })
          }
        />
      </PreferenceRow>

      <PreferenceRow
        title="喜欢探索小众地点"
        description="更愿意走人少一点、没那么模板化的路线。"
      >
        <ChoiceGroup
          options={booleanOptions.preferHiddenGems}
          value={settings.aiPreferences.preferHiddenGems}
          onChange={(preferHiddenGems) =>
            onUpdate({
              ...settings,
              aiPreferences: {
                ...settings.aiPreferences,
                preferHiddenGems,
              },
            })
          }
        />
      </PreferenceRow>

      <PreferenceRow
        title="尽量减少步行"
        description="如果没有特别说明，AI 会默认少安排来回折腾的走路路线。"
      >
        <ChoiceGroup
          options={booleanOptions.preferLessWalking}
          value={settings.aiPreferences.preferLessWalking}
          onChange={(preferLessWalking) =>
            onUpdate({
              ...settings,
              aiPreferences: {
                ...settings.aiPreferences,
                preferLessWalking,
              },
            })
          }
        />
      </PreferenceRow>

      <PreferenceRow
        title="优先交通便利"
        description="默认优先更顺手的交通连接，不会强行追求最密集打卡。"
      >
        <ChoiceGroup
          options={booleanOptions.preferConvenientTransport}
          value={settings.aiPreferences.preferConvenientTransport}
          onChange={(preferConvenientTransport) =>
            onUpdate({
              ...settings,
              aiPreferences: {
                ...settings.aiPreferences,
                preferConvenientTransport,
              },
            })
          }
        />
      </PreferenceRow>
    </SettingsSection>
  );
}
