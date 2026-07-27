"use client";

import { SignOutButton } from "@/components/auth/SignOutButton";

import { PreferenceRow } from "../ui/PreferenceRow";
import { SettingsSection } from "../ui/SettingsSection";

export function AccountSection({
  email,
  accountActionMessage,
  onExportTrips,
  onClearLocalDrafts,
  onDeleteAccountData,
}: {
  email: string | null;
  accountActionMessage?: string;
  onExportTrips: () => void;
  onClearLocalDrafts: () => void;
  onDeleteAccountData: () => void;
}) {
  return (
    <SettingsSection
      id="settings-account"
      title="账号"
      hint="这里集中处理账号状态、数据管理和退出登录。"
    >
      <PreferenceRow title="当前邮箱" description="当前登录账号。">
        <p className="break-all text-sm leading-6 text-[var(--ink)]">
          {email ?? "暂时没有读到邮箱"}
        </p>
      </PreferenceRow>

      <PreferenceRow title="登录状态" description="当前 Settings 可正常保存到账号。">
        <span className="inline-flex min-h-9 items-center rounded-full border border-[rgba(118,145,98,0.28)] bg-[rgba(242,247,238,0.9)] px-3 py-1 text-sm font-semibold text-[var(--sage-deep)]">
          已登录
        </span>
      </PreferenceRow>

      <PreferenceRow
        title="导出我的旅行记录"
        description="导出入口先保留在这里，后续再补完整导出能力。"
      >
        <button
          type="button"
          onClick={onExportTrips}
          className="inline-flex min-h-10 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--paper-bright)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--paper)]"
        >
          导出旅行记录
        </button>
      </PreferenceRow>

      <PreferenceRow
        title="清理本地草稿"
        description="只清理这台设备上的本地草稿，不会删除已经保存到账号里的旅行计划。"
      >
        <button
          type="button"
          onClick={onClearLocalDrafts}
          className="inline-flex min-h-10 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--paper-bright)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--paper)]"
        >
          清理本地草稿
        </button>
      </PreferenceRow>

      <PreferenceRow
        title="删除账号数据"
        description="这是危险操作，目前先保留完整确认流程，真实删除能力后续开放。"
      >
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onDeleteAccountData}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-[rgba(173,87,72,0.42)] bg-[rgba(255,244,241,0.88)] px-4 py-2 text-sm font-semibold text-[var(--clay-deep)] hover:bg-[rgba(255,238,233,0.96)]"
          >
            删除账号数据
          </button>
          <span className="text-xs font-medium text-[var(--ink-muted)]">暂未真正执行删除</span>
        </div>
      </PreferenceRow>

      <PreferenceRow
        title="退出登录"
        description="退出后，已经保存到账号里的默认设置仍会保留。"
      >
        <SignOutButton className="inline-flex min-h-10 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--paper-bright)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--paper)]" />
      </PreferenceRow>

      {accountActionMessage ? (
        <div className="pt-4 text-sm leading-6 text-[var(--ink-muted)]">{accountActionMessage}</div>
      ) : null}
    </SettingsSection>
  );
}
