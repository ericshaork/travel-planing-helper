"use client";

import type { UserSettings } from "@/lib/settings/types";

import { ChoiceGroup } from "../ui/ChoiceGroup";
import { PreferenceRow } from "../ui/PreferenceRow";
import { SettingsSection } from "../ui/SettingsSection";

const modeOptions = [
  { value: "read", label: "阅读模式" },
  { value: "edit", label: "编辑模式" },
] as const;

const mapLayoutOptions = [
  { value: "balanced", label: "均衡" },
  { value: "plan_focus", label: "计划优先" },
  { value: "map_focus", label: "地图优先" },
] as const;

const mapOverlayOptions = [
  { value: "expanded", label: "默认展开" },
  { value: "collapsed", label: "默认收起" },
] as const;

export function WorkspacePreferenceSection({
  settings,
  onUpdate,
}: {
  settings: UserSettings;
  onUpdate: (nextSettings: UserSettings) => void;
}) {
  return (
    <SettingsSection
      id="settings-workspace"
      title="工作台"
      hint="这些设置决定你之后进入 Workspace 时的默认打开方式，不会覆盖已经保存的旅行计划。"
    >
      <PreferenceRow
        title="默认打开模式"
        description="进入工作台时，先从阅读还是编辑开始。"
      >
        <ChoiceGroup
          options={modeOptions}
          value={settings.workspacePreferences.defaultMode}
          onChange={(defaultMode) =>
            onUpdate({
              ...settings,
              workspacePreferences: {
                ...settings.workspacePreferences,
                defaultMode,
              },
            })
          }
        />
      </PreferenceRow>

      <PreferenceRow
        title="地图布局"
        description="控制首次打开工作台时左侧计划和右侧地图的默认比例。"
      >
        <ChoiceGroup
          options={mapLayoutOptions}
          value={settings.workspacePreferences.mapLayout}
          onChange={(mapLayout) =>
            onUpdate({
              ...settings,
              workspacePreferences: {
                ...settings.workspacePreferences,
                mapLayout,
              },
            })
          }
        />
      </PreferenceRow>

      <PreferenceRow
        title="地图信息层"
        description="控制地图主要信息面板默认展开还是收起。"
      >
        <ChoiceGroup
          options={mapOverlayOptions}
          value={settings.workspacePreferences.mapOverlay}
          onChange={(mapOverlay) =>
            onUpdate({
              ...settings,
              workspacePreferences: {
                ...settings.workspacePreferences,
                mapOverlay,
              },
            })
          }
        />
      </PreferenceRow>
    </SettingsSection>
  );
}
