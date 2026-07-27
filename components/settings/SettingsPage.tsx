"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useAuthStatus } from "../auth/useAuthStatus";
import { Footer } from "../layout/Footer";
import { Header } from "../layout/Header";
import { getUserSettings, updateUserSettings } from "../../lib/settings/client";
import { cloneDefaultUserSettings } from "../../lib/settings/defaults";
import type { UserSettings } from "../../lib/settings/types";
import { clearLocalTripDraftState } from "../../lib/trip/storage";
import { buildLoginHref } from "../../lib/trips/save-client";
import { AccountSection } from "./sections/AccountSection";
import { AIPreferenceSection } from "./sections/AIPreferenceSection";
import { TravelPreferenceSection } from "./sections/TravelPreferenceSection";
import { WorkspacePreferenceSection } from "./sections/WorkspacePreferenceSection";
import { SaveBar } from "./ui/SaveBar";

type SettingsSource = "server" | "fallback";

const settingsNavItems = [
  { id: "settings-travel", label: "旅行习惯" },
  { id: "settings-workspace", label: "工作台" },
  { id: "settings-ai", label: "AI 助手" },
  { id: "settings-account", label: "账号" },
] as const;

function scrollToSettingsSection(sectionId: string) {
  if (typeof document === "undefined") {
    return;
  }

  const element = document.getElementById(sectionId);

  if (!(element instanceof HTMLElement)) {
    return;
  }

  element.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

export function SettingsPageContent({
  email,
  settings,
  settingsSource,
  isLoadingSettings,
  isSaving,
  loadError,
  saveError,
  successMessage,
  hasUnsavedChanges,
  isStartingFromDefaults,
  accountActionMessage,
  onRetry,
  onSave,
  onReset,
  onUpdate,
  onExportTrips,
  onClearLocalDrafts,
  onDeleteAccountData,
}: {
  email: string | null;
  settings: UserSettings | null;
  settingsSource: SettingsSource;
  isLoadingSettings: boolean;
  isSaving: boolean;
  loadError?: string;
  saveError?: string;
  successMessage?: string;
  hasUnsavedChanges: boolean;
  isStartingFromDefaults: boolean;
  accountActionMessage?: string;
  onRetry: () => void;
  onSave: () => void;
  onReset: () => void;
  onUpdate: (nextSettings: UserSettings) => void;
  onExportTrips: () => void;
  onClearLocalDrafts: () => void;
  onDeleteAccountData: () => void;
}) {
  const canRenderSettings = !isLoadingSettings && Boolean(settings);
  const shouldShowBlockingLoadError = !isLoadingSettings && !settings && Boolean(loadError);
  const renderedSettings = settings;
  const isFallbackSettings = settingsSource === "fallback";

  const statusHint = isLoadingSettings
    ? "正在读取你的默认偏好..."
    : isFallbackSettings
      ? "当前显示的是本地默认设置快照，不是服务器里已保存的那一版。请先重试读取成功，再执行保存。"
      : isStartingFromDefaults
        ? "还没有设置旅行偏好，可以从这里开始建立你的旅行习惯。"
        : hasUnsavedChanges
          ? "你刚刚改动了默认偏好，确认无误后再保存。"
          : "这些默认值只影响之后新建的旅行计划，不会改动已经保存的内容。";

  return (
    <div className="paper-texture flex min-h-screen flex-col overflow-x-clip text-[var(--ink)]">
      <Header />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-10 pt-4 sm:px-8 sm:pt-6">
        <section className="mb-6 max-w-3xl sm:mb-8">
          <p className="inline-flex -rotate-1 rounded-full border border-[var(--sage-deep)] bg-[var(--sage-soft)] px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-[var(--sage-deep)] sm:text-xs">
            我的旅行档案
          </p>
          <h1 className="profile-title mt-4 text-3xl sm:mt-6 sm:text-4xl">
            你的旅行偏好，都在这里
          </h1>
          <p className="profile-subtitle mt-3 sm:mt-4 sm:text-base">
            你的旅行习惯、工作台默认方式，以及 AI 管家的行事风格，都在这里。之后新建计划时会默认参考。
          </p>
        </section>

        <nav aria-label="设置页快捷入口" className="mb-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold sm:mb-7">
          <Link
            href="/workspace"
            className="border-b border-[var(--line-strong)] pb-1 text-[var(--ink-muted)] hover:border-[var(--clay-deep)] hover:text-[var(--clay-deep)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--clay)]"
          >
            回到编辑台
          </Link>
          <Link
            href="/trips"
            className="border-b border-[var(--line-strong)] pb-1 text-[var(--ink-muted)] hover:border-[var(--clay-deep)] hover:text-[var(--clay-deep)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--clay)]"
          >
            我的行程
          </Link>
        </nav>

        {isLoadingSettings ? (
          <section className="profile-card px-5 py-5">
            <p className="profile-kicker">正在读取偏好</p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--ink)]">稍等一下</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
              正在把你已经保存过的偏好拿回来。
            </p>
          </section>
        ) : null}

        {shouldShowBlockingLoadError ? (
          <section className="profile-card px-5 py-5">
            <p className="profile-kicker" style={{ color: "var(--clay-deep)" }}>暂时没读到偏好</p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--ink)]">读取失败</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">{loadError}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 inline-flex min-h-10 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--paper-bright)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--paper)]"
            >
              重试
            </button>
          </section>
        ) : null}

        {canRenderSettings ? (
          <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
            <aside className="lg:sticky lg:top-24">
              <div className="space-y-4">
                {isFallbackSettings ? (
                  <section className="profile-card px-4 py-4">
                    <p className="profile-kicker" style={{ color: "var(--clay-deep)" }}>
                      当前显示的是默认设置
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
                      服务器里已保存的那一版暂时没有读回来，所以这里先让你查看默认值。保存按钮会先锁住，避免误覆盖真实设置。
                    </p>
                    {loadError ? (
                      <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{loadError}</p>
                    ) : null}
                    <button
                      type="button"
                      onClick={onRetry}
                      className="mt-3 inline-flex min-h-10 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--paper-bright)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--paper)]"
                    >
                      重新读取
                    </button>
                  </section>
                ) : null}

                <nav
                  aria-label="偏好分区"
                  className="profile-sidebar p-3"
                >
                  <div className="space-y-1">
                    {settingsNavItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => scrollToSettingsSection(item.id)}
                        className="profile-nav-item"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </nav>

                <SaveBar
                  isSaving={isSaving}
                  successMessage={successMessage}
                  saveError={saveError}
                  statusHint={statusHint}
                  onSave={onSave}
                  onReset={onReset}
                  saveDisabled={!settings || isLoadingSettings || isSaving || isFallbackSettings}
                  resetDisabled={!settings || isLoadingSettings || isSaving}
                />
              </div>
            </aside>

            <div className="space-y-8">
              <TravelPreferenceSection settings={renderedSettings!} onUpdate={onUpdate} />
              <WorkspacePreferenceSection settings={renderedSettings!} onUpdate={onUpdate} />
              <AIPreferenceSection settings={renderedSettings!} onUpdate={onUpdate} />
              <AccountSection
                email={email}
                accountActionMessage={accountActionMessage}
                onExportTrips={onExportTrips}
                onClearLocalDrafts={onClearLocalDrafts}
                onDeleteAccountData={onDeleteAccountData}
              />
            </div>
          </div>
        ) : null}
      </main>

      <div className="hidden lg:block">
        <Footer />
      </div>
    </div>
  );
}

export function SettingsPageAuthFallback({
  authStatus,
}: {
  authStatus: "loading" | "anonymous";
}) {
  return (
    <div className="paper-texture flex min-h-screen flex-col overflow-x-clip text-[var(--ink)]">
      <Header />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 pb-8 pt-10 sm:px-8 sm:pb-16">
        <section className="profile-card px-6 py-6">
          <div className="max-w-2xl">
            <p className="profile-kicker">
              {authStatus === "loading" ? "正在确认登录状态" : "准备跳转登录"}
            </p>
            <h1 className="profile-title mt-2 text-2xl sm:text-4xl">
              {authStatus === "loading" ? "先确认一下是不是你本人。" : "这个页面需要先登录。"}
            </h1>
            <p className="profile-subtitle mt-3 sm:text-[15px] sm:leading-7">
              {authStatus === "loading"
                ? "确认完成后，如果你已经登录，就会直接打开设置页。"
                : "正在带你去登录，登录后会自动回到 /settings。"}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

function areSettingsEqual(left: UserSettings | null, right: UserSettings | null) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function SettingsPage() {
  const authState = useAuthStatus();
  const router = useRouter();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [savedSettings, setSavedSettings] = useState<UserSettings | null>(null);
  const [settingsSource, setSettingsSource] = useState<SettingsSource>("server");
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string>();
  const [saveError, setSaveError] = useState<string>();
  const [successMessage, setSuccessMessage] = useState<string>();
  const [accountActionMessage, setAccountActionMessage] = useState<string>();

  const clearMessages = useCallback(() => {
    setSaveError(undefined);
    setSuccessMessage(undefined);
    setAccountActionMessage(undefined);
  }, []);

  const loadSettings = useCallback(() => {
    setIsLoadingSettings(true);
    setLoadError(undefined);
    clearMessages();

    return getUserSettings()
      .then((nextSettings) => {
        setSettings(nextSettings);
        setSavedSettings(nextSettings);
        setSettingsSource("server");
      })
      .catch((error) => {
        const fallbackSettings = cloneDefaultUserSettings();

        setLoadError(
          error instanceof Error && error.message.trim()
            ? error.message
            : "暂时没读到你的默认偏好，请稍后再试。",
        );
        setSettings(fallbackSettings);
        setSavedSettings(fallbackSettings);
        setSettingsSource("fallback");
      })
      .finally(() => {
        setIsLoadingSettings(false);
      });
  }, [clearMessages]);

  useEffect(() => {
    if (authState.status === "anonymous") {
      router.replace(buildLoginHref("/settings"));
      return;
    }

    if (authState.status !== "authenticated") {
      return;
    }

    queueMicrotask(() => {
      void loadSettings();
    });
  }, [authState.status, loadSettings, router]);

  if (authState.status !== "authenticated") {
    return <SettingsPageAuthFallback authStatus={authState.status} />;
  }

  const hasUnsavedChanges = !areSettingsEqual(settings, savedSettings);
  const isStartingFromDefaults = Boolean(
    settings &&
      savedSettings &&
      !hasUnsavedChanges &&
      areSettingsEqual(savedSettings, cloneDefaultUserSettings()),
  );

  return (
    <SettingsPageContent
      email={authState.user.email}
      settings={settings}
      settingsSource={settingsSource}
      isLoadingSettings={isLoadingSettings}
      isSaving={isSaving}
      loadError={loadError}
      saveError={saveError}
      successMessage={successMessage}
      hasUnsavedChanges={hasUnsavedChanges}
      isStartingFromDefaults={isStartingFromDefaults}
      accountActionMessage={accountActionMessage}
      onRetry={() => {
        void loadSettings();
      }}
      onSave={() => {
        if (!settings || settingsSource === "fallback") {
          return;
        }

        setIsSaving(true);
        setSaveError(undefined);
        setSuccessMessage(undefined);
        setAccountActionMessage(undefined);

        void updateUserSettings(settings)
          .then((nextSettings) => {
            setSettings(nextSettings);
            setSavedSettings(nextSettings);
            setSettingsSource("server");
            setSuccessMessage("已保存，将在之后创建旅行计划时作为默认参考。");
          })
          .catch((error) => {
            setSaveError(
              error instanceof Error && error.message.trim()
                ? error.message
                : "暂时还没保存成功，请稍后再试。",
            );
          })
          .finally(() => {
            setIsSaving(false);
          });
      }}
      onReset={() => {
        setSettings(cloneDefaultUserSettings());
        setSaveError(undefined);
        setSuccessMessage("已经恢复到默认设置，确认无误后再保存。");
        setAccountActionMessage(undefined);
      }}
      onUpdate={(nextSettings) => {
        setSettings(nextSettings);
        clearMessages();
      }}
      onExportTrips={() => {
        setAccountActionMessage("导出旅行记录入口已经预留好，后续会补上真实导出能力。");
        setSaveError(undefined);
        setSuccessMessage(undefined);
      }}
      onClearLocalDrafts={() => {
        if (typeof window !== "undefined") {
          const confirmed = window.confirm(
            "要清理这台设备上的本地草稿吗？这不会删除已经保存到账号里的旅行计划。",
          );

          if (!confirmed) {
            return;
          }
        }

        clearLocalTripDraftState();
        setAccountActionMessage("本地草稿已清理，已经保存到账号里的旅行计划不会受影响。");
        setSaveError(undefined);
        setSuccessMessage(undefined);
      }}
      onDeleteAccountData={() => {
        if (typeof window !== "undefined") {
          const confirmed = window.confirm(
            "删除账号数据功能还在整理中。现在继续只会记录你的确认，不会真的删除数据库内容。要继续吗？",
          );

          if (!confirmed) {
            return;
          }
        }

        setAccountActionMessage(
          "已记录删除账号数据的操作意图。真实删除功能会在后续补齐前再让你做一次确认。",
        );
        setSaveError(undefined);
        setSuccessMessage(undefined);
      }}
    />
  );
}
