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

describe("SettingsPage SSR", () => {
  it("显示设置页分区和长期默认偏好说明", () => {
    const settings = cloneDefaultUserSettings();
    const markup = renderToStaticMarkup(
      <SettingsPageContent
        email="user@example.com"
        settings={settings}
        isLoadingSettings={false}
        isSaving={false}
        hasUnsavedChanges={false}
        onRetry={() => {}}
        onSave={() => {}}
        onUpdate={() => {}}
      />,
    );

    expect(markup).toContain("设置");
    expect(markup).toContain("这些设置会作为之后创建旅行计划时的长期默认参考。");
    expect(markup).toContain("它们不会自动覆盖某一篇已经创建的计划。");
    expect(markup).toContain("每次创建计划时选择的偏好，仍然只属于那一篇计划。");
    expect(markup).toContain("账号设置");
    expect(markup).toContain("旅行长期偏好");
    expect(markup).toContain("Workspace 默认偏好");
    expect(markup).toContain("AI 默认偏好");
    expect(markup).toContain("保存为长期默认偏好");
    expect(markup).toContain("user@example.com");
  });

  it("读取成功后会展示接口返回的 settings 值", () => {
    const settings = cloneDefaultUserSettings();
    settings.travelPreferences.budget = "comfort";
    settings.travelPreferences.interests = ["food", "hidden_gems"];
    settings.workspacePreferences.defaultMode = "edit";
    settings.aiPreferences.detailLevel = "detailed";

    const markup = renderToStaticMarkup(
      <SettingsPageContent
        email="user@example.com"
        settings={settings}
        isLoadingSettings={false}
        isSaving={false}
        hasUnsavedChanges
        successMessage="已保存为你的长期默认偏好。"
        onRetry={() => {}}
        onSave={() => {}}
        onUpdate={() => {}}
      />,
    );

    expect(markup).toContain("舒适");
    expect(markup).toContain("美食");
    expect(markup).toContain("小众地点");
    expect(markup).toContain("编辑模式");
    expect(markup).toContain("详细");
    expect(markup).toContain("已保存为你的长期默认偏好。");
    expect(markup).toContain('aria-pressed="true" data-selected="true"');
  });

  it("保存中和保存失败时有中文状态提示", () => {
    const markup = renderToStaticMarkup(
      <SettingsPageContent
        email="user@example.com"
        settings={cloneDefaultUserSettings()}
        isLoadingSettings={false}
        isSaving
        hasUnsavedChanges
        saveError="暂时还没保存成功，请稍后再试。"
        onRetry={() => {}}
        onSave={() => {}}
        onUpdate={() => {}}
      />,
    );

    expect(markup).toContain("正在保存...");
    expect(markup).toContain("暂时还没保存成功，请稍后再试。");
  });

  it("读取失败时显示中文错误和重试按钮", () => {
    const markup = renderToStaticMarkup(
      <SettingsPageContent
        email="user@example.com"
        settings={null}
        isLoadingSettings={false}
        isSaving={false}
        hasUnsavedChanges={false}
        loadError="暂时没读到你的默认偏好，请稍后再试。"
        onRetry={() => {}}
        onSave={() => {}}
        onUpdate={() => {}}
      />,
    );

    expect(markup).toContain("暂时没读到你的默认偏好");
    expect(markup).toContain("重试");
  });

  it("未登录时仍然显示跳转登录提示", () => {
    const markup = renderToStaticMarkup(
      <SettingsPageAuthFallback authStatus="anonymous" />,
    );

    expect(markup).toContain("这个页面需要先登录。");
    expect(markup).toContain("登录后会自动回到 /settings。");
  });

  it("读取中时显示中文加载提示", () => {
    const markup = renderToStaticMarkup(
      <SettingsPageContent
        email="user@example.com"
        settings={null}
        isLoadingSettings
        isSaving={false}
        hasUnsavedChanges={false}
        onRetry={() => {}}
        onSave={() => {}}
        onUpdate={() => {}}
      />,
    );

    expect(markup).toContain("正在读取你的默认偏好...");
  });
});
