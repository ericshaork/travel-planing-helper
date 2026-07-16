"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { SignOutButton } from "../auth/SignOutButton";
import { useAuthStatus } from "../auth/useAuthStatus";
import { Footer } from "../layout/Footer";
import { Header } from "../layout/Header";
import { getUserSettings, updateUserSettings } from "../../lib/settings/client";
import { cloneDefaultUserSettings } from "../../lib/settings/defaults";
import type { UserSettings } from "../../lib/settings/types";
import { buildLoginHref } from "../../lib/trips/save-client";

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

const modeOptions = [
  { value: "read", label: "阅读模式" },
  { value: "edit", label: "编辑模式" },
] as const;

const mapLayoutOptions = [
  { value: "balanced", label: "平衡" },
  { value: "map_focus", label: "地图更大" },
  { value: "plan_focus", label: "计划更大" },
] as const;

const mapOverlayOptions = [
  { value: "expanded", label: "默认展开" },
  { value: "collapsed", label: "默认收起" },
] as const;

const detailLevelOptions = [
  { value: "brief", label: "简洁" },
  { value: "standard", label: "标准" },
  { value: "detailed", label: "详细" },
] as const;

const booleanOptions = {
  useLongTermPreferences: [
    { value: true, label: "参考长期偏好" },
    { value: false, label: "先不参考" },
  ],
  preferHiddenGems: [
    { value: true, label: "偏小众路线" },
    { value: false, label: "先不强调" },
  ],
  preferLessWalking: [
    { value: true, label: "尽量少走路" },
    { value: false, label: "先不强调" },
  ],
  preferConvenientTransport: [
    { value: true, label: "优先交通便利" },
    { value: false, label: "先不强调" },
  ],
} as const;

function SettingsSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="journal-sheet px-5 py-5 sm:px-6 sm:py-6">
      <div className="relative z-[1]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="workspace-kicker">{title}</p>
            {hint ? (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ink-muted)]">
                {hint}
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-5 space-y-5">{children}</div>
      </div>
    </section>
  );
}

function ChoicePill({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      data-selected={selected ? "true" : "false"}
      className={
        selected
          ? "inline-flex min-h-10 items-center rounded-full border border-[var(--sage-deep)] bg-[var(--sage-soft)] px-4 py-2 text-sm font-semibold text-[var(--sage-deep)]"
          : "inline-flex min-h-10 items-center rounded-full border border-[var(--line)] bg-[rgba(255,253,247,0.78)] px-4 py-2 text-sm text-[var(--ink-muted)] hover:bg-[var(--paper-bright)]"
      }
    >
      {label}
    </button>
  );
}

function ChoiceGroup<T extends string | boolean>({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <ChoicePill
          key={String(option.value)}
          label={option.label}
          selected={option.value === value}
          onClick={() => onChange(option.value)}
        />
      ))}
    </div>
  );
}

function MultiChoiceGroup<T extends string>({
  options,
  value,
  onToggle,
}: {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <ChoicePill
          key={option.value}
          label={option.label}
          selected={value.includes(option.value)}
          onClick={() => onToggle(option.value)}
        />
      ))}
    </div>
  );
}

function PreferenceRow({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 border-b border-dashed border-[rgba(142,139,127,0.22)] pb-5 last:border-b-0 last:pb-0">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-[var(--ink)]">{title}</h3>
        {description ? (
          <p className="text-sm leading-6 text-[var(--ink-muted)]">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function SettingsPageContent({
  email,
  settings,
  isLoadingSettings,
  isSaving,
  loadError,
  saveError,
  successMessage,
  hasUnsavedChanges,
  onRetry,
  onSave,
  onUpdate,
}: {
  email: string | null;
  settings: UserSettings | null;
  isLoadingSettings: boolean;
  isSaving: boolean;
  loadError?: string;
  saveError?: string;
  successMessage?: string;
  hasUnsavedChanges: boolean;
  onRetry: () => void;
  onSave: () => void;
  onUpdate: (nextSettings: UserSettings) => void;
}) {
  return (
    <div className="paper-texture flex min-h-screen flex-col overflow-x-clip text-[var(--ink)]">
      <Header />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-8 pt-4 sm:px-8 sm:pb-16 sm:pt-10">
        <nav
          aria-label="设置页返回入口"
          className="mb-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold sm:mb-7"
        >
          <Link
            href="/workspace"
            className="border-b border-[var(--line-strong)] pb-1 text-[var(--ink-muted)] hover:border-[var(--clay-deep)] hover:text-[var(--clay-deep)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--clay)]"
          >
            回到 Workspace
          </Link>
          <Link
            href="/trips"
            className="border-b border-[var(--line-strong)] pb-1 text-[var(--ink-muted)] hover:border-[var(--clay-deep)] hover:text-[var(--clay-deep)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--clay)]"
          >
            去看我的行程
          </Link>
        </nav>

        <section className="mb-6 max-w-4xl sm:mb-8">
          <p className="inline-flex -rotate-1 rounded-full border border-[var(--sage-deep)] bg-[var(--sage-soft)] px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-[var(--sage-deep)] sm:text-xs">
            设置
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-[1.08] tracking-[-0.05em] sm:mt-6 sm:text-6xl">
            先把你平时的旅行习惯，
            <span className="mt-1 block text-[var(--clay)]">整理成一份长期默认参考。</span>
          </h1>
          <div className="mt-4 max-w-3xl space-y-3 text-sm leading-6 text-[var(--ink-muted)] sm:mt-6 sm:text-lg sm:leading-8">
            <p>这些设置会作为之后创建旅行计划时的长期默认参考。</p>
            <p>它们不会自动覆盖某一篇已经创建的计划。</p>
            <p>每次创建计划时选择的偏好，仍然只属于那一篇计划。</p>
          </div>
        </section>

        <div className="mb-6 workspace-panel px-5 py-5 sm:px-6 sm:py-6">
          <div className="relative z-[1] flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-3xl">
              <p className="workspace-kicker">长期默认偏好</p>
              <p className="mt-2 text-base font-semibold text-[var(--ink)]">
                这里只保存你以后新建计划时的默认参考，不会回头覆盖已经建好的那一篇计划。
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                {isLoadingSettings
                  ? "正在读取你的默认偏好..."
                  : hasUnsavedChanges
                    ? "你刚刚改过一些默认偏好。确认无误后，再保存成长期默认参考。"
                    : "改动会只影响之后新建计划时的默认参考，不会碰当前 Workspace 里的本地草稿。"}
              </p>
              {successMessage ? (
                <p className="mt-3 text-sm font-semibold text-[var(--sage-deep)]">
                  {successMessage}
                </p>
              ) : null}
              {saveError ? (
                <p className="mt-3 text-sm font-semibold text-[var(--clay-deep)]">
                  {saveError}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onSave}
              disabled={!settings || isLoadingSettings || isSaving || Boolean(loadError)}
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-[var(--ink)] bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-[var(--paper-bright)] shadow-[4px_4px_0_var(--clay)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "正在保存..." : "保存为长期默认偏好"}
            </button>
          </div>
        </div>

        {isLoadingSettings ? (
          <section className="workspace-panel px-6 py-6">
            <div className="relative z-[1] max-w-2xl">
              <p className="workspace-kicker">正在读取</p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--ink)]">
                正在读取你的默认偏好...
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
                稍等一下，我先把你已经保存过的长期默认参考拿回来。
              </p>
            </div>
          </section>
        ) : null}

        {!isLoadingSettings && loadError ? (
          <section className="workspace-panel px-6 py-6">
            <div className="relative z-[1] max-w-2xl">
              <p className="workspace-kicker">读取失败</p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--ink)]">
                暂时没读到你的默认偏好
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">{loadError}</p>
              <button
                type="button"
                onClick={onRetry}
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--paper-bright)] px-5 py-2.5 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--paper)]"
              >
                重试
              </button>
            </div>
          </section>
        ) : null}

        {!isLoadingSettings && !loadError && settings ? (
          <div className="space-y-5">
            <SettingsSection
              title="账号设置"
              hint="这里先把账号状态说明清楚。真实资料编辑和数据管理会在后续步骤接进来。"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="workspace-panel-soft px-4 py-4">
                  <div className="relative z-[1] space-y-1">
                    <p className="text-sm font-semibold text-[var(--ink)]">当前邮箱</p>
                    <p className="break-all text-sm leading-6 text-[var(--ink-muted)]">
                      {email ?? "暂时没有读到邮箱"}
                    </p>
                  </div>
                </div>
                <div className="workspace-panel-soft px-4 py-4">
                  <div className="relative z-[1] space-y-1">
                    <p className="text-sm font-semibold text-[var(--ink)]">登录状态</p>
                    <p className="text-sm leading-6 text-[var(--ink-muted)]">
                      已登录，可继续查看和整理你的长期默认参考。
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
                <div className="workspace-panel-soft px-4 py-4">
                  <div className="relative z-[1] space-y-1">
                    <p className="text-sm font-semibold text-[var(--ink)]">删除数据</p>
                    <p className="text-sm leading-6 text-[var(--ink-muted)]">
                      后续开放。等账号资料和数据管理范围明确后，再把删除数据入口补齐。
                    </p>
                  </div>
                </div>
                <SignOutButton className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--paper-bright)] px-5 py-2.5 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--paper)]" />
                <span className="workspace-chip workspace-chip-warm">先不开放删除数据</span>
              </div>
            </SettingsSection>

            <SettingsSection
              title="旅行长期偏好"
              hint="这是你平时常用的默认参考，不是某一篇计划已经锁定的约束。之后新建计划时可以先按这里带入，再按当次出行重新改。"
            >
              <PreferenceRow
                title="预算偏好"
                description="以后新建计划时，先按你平时更常用的预算风格参考。"
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
                description="只是长期默认参考，不会自动盖掉某一篇计划里临时选的节奏。"
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
                description="更像你平时常会勾的兴趣清单，单篇计划里还是可以重新选。"
              >
                <MultiChoiceGroup
                  options={interestOptions}
                  value={settings.travelPreferences.interests}
                  onToggle={(interest) => {
                    const nextInterests = settings.travelPreferences.interests.includes(
                      interest,
                    )
                      ? settings.travelPreferences.interests.filter(
                          (item) => item !== interest,
                        )
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
                description="给新计划一个默认出发点，不会替你决定这次到底和谁去。"
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
                description="比如你平时不想太早出门，之后可以先按这个节奏参考。"
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
                description="只作为默认参考，具体某篇计划还是以那一篇的选择为准。"
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

            <SettingsSection
              title="Workspace 默认偏好"
              hint="这里只整理你进入工作台时更顺手的默认样子，不会去改动你当前已经打开的那一篇计划内容。"
            >
              <PreferenceRow title="默认打开模式">
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

              <PreferenceRow title="地图比例">
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

              <PreferenceRow title="地图浮层">
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

            <SettingsSection
              title="AI 默认偏好"
              hint="这里只是在保存长期默认参考，不会直接改动某一篇已经创建的计划，也不会在这一步接入 AI 生成逻辑。"
            >
              <PreferenceRow title="回答详细程度">
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

              <PreferenceRow title="是否参考长期偏好">
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

              <PreferenceRow title="是否偏小众路线">
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

              <PreferenceRow title="是否少走路">
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

              <PreferenceRow title="是否优先交通便利">
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
        <section className="workspace-panel px-6 py-6">
          <div className="relative z-[1] max-w-2xl">
            <p className="workspace-kicker">
              {authStatus === "loading" ? "正在确认登录状态" : "准备跳转登录"}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--ink)] sm:text-4xl">
              {authStatus === "loading"
                ? "先确认一下是不是你本人。"
                : "这个页面需要先登录。"}
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)] sm:text-[15px] sm:leading-7">
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
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string>();
  const [saveError, setSaveError] = useState<string>();
  const [successMessage, setSuccessMessage] = useState<string>();

  function loadSettings() {
    setIsLoadingSettings(true);
    setLoadError(undefined);
    setSaveError(undefined);
    setSuccessMessage(undefined);

    return getUserSettings()
      .then((nextSettings) => {
        setSettings(nextSettings);
        setSavedSettings(nextSettings);
      })
      .catch((error) => {
        setLoadError(
          error instanceof Error && error.message.trim()
            ? error.message
            : "暂时没读到你的默认偏好，请稍后再试。",
        );
        setSettings(cloneDefaultUserSettings());
        setSavedSettings(null);
      })
      .finally(() => {
        setIsLoadingSettings(false);
      });
  }

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
  }, [authState.status, router]);

  if (authState.status !== "authenticated") {
    return <SettingsPageAuthFallback authStatus={authState.status} />;
  }

  const hasUnsavedChanges = !areSettingsEqual(settings, savedSettings);

  return (
    <SettingsPageContent
      email={authState.user.email}
      settings={settings}
      isLoadingSettings={isLoadingSettings}
      isSaving={isSaving}
      loadError={loadError}
      saveError={saveError}
      successMessage={successMessage}
      hasUnsavedChanges={hasUnsavedChanges}
      onRetry={() => {
        void loadSettings();
      }}
      onSave={() => {
        if (!settings) {
          return;
        }

        setIsSaving(true);
        setSaveError(undefined);
        setSuccessMessage(undefined);

        void updateUserSettings(settings)
          .then((nextSettings) => {
            setSettings(nextSettings);
            setSavedSettings(nextSettings);
            setSuccessMessage("已保存为你的长期默认偏好。");
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
      onUpdate={(nextSettings) => {
        setSettings(nextSettings);
        setSaveError(undefined);
        setSuccessMessage(undefined);
      }}
    />
  );
}
