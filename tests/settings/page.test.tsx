import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/settings",
  useRouter: () => ({
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock("../../components/layout/Header", () => ({
  Header: () => <div>Header</div>,
}));

vi.mock("../../components/layout/Footer", () => ({
  Footer: () => <div>Footer</div>,
}));

vi.mock("../../components/auth/SignOutButton", () => ({
  SignOutButton: () => <button type="button">退出登录</button>,
}));

vi.mock("../../components/auth/useAuthStatus", () => ({
  useAuthStatus: () => ({
    status: "authenticated",
    user: { id: "user-1", email: "user@example.com" },
    error: null,
  }),
}));

import { cloneDefaultUserSettings } from "../../lib/settings/defaults";
import {
  SettingsPageAuthFallback,
  SettingsPageContent,
} from "../../components/settings/SettingsPage";

function renderContent(overrides?: Partial<ComponentProps<typeof SettingsPageContent>>) {
  return renderToStaticMarkup(
    <SettingsPageContent
      email="user@example.com"
      settings={cloneDefaultUserSettings()}
      settingsSource="server"
      isLoadingSettings={false}
      isSaving={false}
      hasUnsavedChanges={false}
      isStartingFromDefaults={false}
      onRetry={() => {}}
      onSave={() => {}}
      onReset={() => {}}
      onUpdate={() => {}}
      onExportTrips={() => {}}
      onClearLocalDrafts={() => {}}
      onDeleteAccountData={() => {}}
      {...overrides}
    />,
  );
}

describe("SettingsPage SSR", () => {
  it("renders compact settings title, side nav and action buttons", () => {
    const markup = renderContent();

    expect(markup).toContain("设置");
    expect(markup).toContain("管理旅行习惯、工作台默认行为和 AI 参考偏好。");
    expect(markup).toContain("旅行习惯");
    expect(markup).toContain("工作台");
    expect(markup).toContain("AI 助手");
    expect(markup).toContain("账号");
    expect(markup).toContain("恢复默认");
    expect(markup).toContain("保存设置");
    expect(markup).toContain("导出旅行记录");
    expect(markup).toContain("清理本地草稿");
    expect(markup).toContain("删除账号数据");
    expect(markup).toContain("user@example.com");
  });

  it("renders dense preference labels for workspace and ai", () => {
    const settings = cloneDefaultUserSettings();
    settings.travelPreferences.budget = "comfort";
    settings.travelPreferences.interests = ["food", "hidden_gems"];
    settings.workspacePreferences.defaultMode = "edit";
    settings.workspacePreferences.mapLayout = "map_focus";
    settings.aiPreferences.detailLevel = "detailed";

    const markup = renderContent({
      settings,
      hasUnsavedChanges: true,
      successMessage: "已保存，将在之后创建旅行计划时作为默认参考。",
    });

    expect(markup).toContain("预算");
    expect(markup).toContain("舒适");
    expect(markup).toContain("美食");
    expect(markup).toContain("小众地点");
    expect(markup).toContain("默认打开模式");
    expect(markup).toContain("编辑模式");
    expect(markup).toContain("地图优先");
    expect(markup).toContain("规划详细程度");
    expect(markup).toContain("详细");
    expect(markup).toContain("尽量减少步行");
    expect(markup).toContain("已保存，将在之后创建旅行计划时作为默认参考。");
    expect(markup).toContain('aria-pressed="true" data-selected="true"');
  });

  it("renders save/loading/error messages in chinese", () => {
    const markup = renderContent({
      isSaving: true,
      hasUnsavedChanges: true,
      saveError: "暂时还没保存成功，请稍后再试。",
    });

    expect(markup).toContain("正在保存...");
    expect(markup).toContain("暂时还没保存成功，请稍后再试。");
  });

  it("renders load error state with retry action", () => {
    const markup = renderContent({
      settings: null,
      loadError: "暂时没读到你的默认偏好，请稍后再试。",
    });

    expect(markup).toContain("暂时没读到你的默认偏好");
    expect(markup).toContain("重试");
  });

  it("renders fallback safety hint and disables saving when using defaults", () => {
    const markup = renderContent({
      settingsSource: "fallback",
      loadError: "暂时没读到服务器里的设置。",
    });

    expect(markup).toContain("当前显示的是默认设置");
    expect(markup).toContain("保存按钮会先锁住，避免误覆盖真实设置。");
    expect(markup).toContain("重新读取");
    expect(markup).toContain("disabled");
  });

  it("renders auth fallback copy for anonymous users", () => {
    const markup = renderToStaticMarkup(
      <SettingsPageAuthFallback authStatus="anonymous" />,
    );

    expect(markup).toContain("这个页面需要先登录。");
    expect(markup).toContain("登录后会自动回到 /settings。");
  });

  it("renders loading hint while reading settings", () => {
    const markup = renderContent({
      settings: null,
      isLoadingSettings: true,
    });

    expect(markup).toContain("正在读取你的默认偏好...");
  });

  it("renders first-time hint when starting from defaults", () => {
    const markup = renderContent({
      isStartingFromDefaults: true,
    });

    expect(markup).toContain("还没有设置旅行偏好，可以从这里开始建立你的旅行习惯。");
  });

  it("renders account management feedback message", () => {
    const markup = renderContent({
      accountActionMessage: "本地草稿已清理，已经保存到账号里的旅行计划不会受影响。",
    });

    expect(markup).toContain("退出登录");
    expect(markup).toContain("已登录");
    expect(markup).toContain("本地草稿已清理，已经保存到账号里的旅行计划不会受影响。");
    expect(markup).toContain("暂未真正执行删除");
  });
});
