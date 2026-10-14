"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { HeroArchiveDecor } from "@/components/create/CreateEntryDecor";
import { createBlankWorkspaceProjectEntry } from "@/lib/projects/entry-client";

const CREATE_ENTRY_ASSET_BASE = "/assets/wanderly/create-entry";

interface EntryCardVisualProps {
  archiveNo: string;
  kicker: string;
  title: string;
  description: string;
  actionLabel: string;
  iconSrc: string;
  iconAlt: string;
  recommended?: boolean;
  primaryAction?: boolean;
}

interface EntryCardProps extends EntryCardVisualProps {
  href: string;
  recommended?: boolean;
}

interface EntryActionCardProps extends EntryCardVisualProps {
  disabled?: boolean;
  onClick: () => void;
}

function NoteCompassIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m15 9-2 5-5 2 2-5z" />
    </svg>
  );
}

function NoteClockIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

function EntryCardVisual({
  archiveNo,
  kicker,
  title,
  description,
  actionLabel,
  iconSrc,
  iconAlt,
  recommended = false,
  primaryAction = false,
}: EntryCardVisualProps) {
  return (
    <>
      <div className="relative z-[1] flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="create-entry-icon">
            <Image
              src={iconSrc}
              alt={iconAlt}
              width={48}
              height={48}
              unoptimized
              loading="eager"
              className="h-12 w-12"
            />
          </span>
          <span className="text-[10px] font-semibold tracking-[0.2em] text-[var(--ink-faint)]">
            {archiveNo}
          </span>
        </div>
        {recommended ? <span className="create-entry-stamp">推荐</span> : null}
      </div>
      <div className="relative z-[1] mt-4 flex-1 space-y-2">
        <p className="text-[11px] font-bold tracking-[0.2em] text-[var(--sage-deep)]">
          {kicker}
        </p>
        <h2 className="journey-title text-[21px] leading-snug tracking-[-0.02em] text-[var(--ink)]">
          {title}
        </h2>
        <p className="text-[13px] leading-6 text-[var(--ink-muted)]">
          {description}
        </p>
      </div>
      <span
        className={[
          "create-entry-btn relative z-[1] mt-5",
          primaryAction ? "create-entry-btn--primary" : "",
        ].join(" ")}
      >
        {actionLabel}
      </span>
    </>
  );
}

function EntryCard({ href, recommended = false, ...visual }: EntryCardProps) {
  return (
    <Link
      href={href}
      className={[
        "create-entry-card group min-h-[15rem] px-5 py-5 text-left sm:min-h-[15.5rem] lg:min-h-[16rem]",
        recommended ? "create-entry-card--primary" : "",
      ].join(" ")}
    >
      <EntryCardVisual recommended={recommended} {...visual} />
    </Link>
  );
}

function EntryActionCard({
  disabled = false,
  onClick,
  ...visual
}: EntryActionCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="create-entry-card group min-h-[15rem] px-5 py-5 text-left transition disabled:cursor-not-allowed disabled:opacity-70 sm:min-h-[15.5rem] lg:min-h-[16rem]"
    >
      <EntryCardVisual {...visual} />
    </button>
  );
}

export function CreateEntryHub() {
  const [isCreatingBlankTrip, setIsCreatingBlankTrip] = useState(false);
  const [blankTripError, setBlankTripError] = useState<string>();

  async function handleCreateBlankTrip() {
    if (isCreatingBlankTrip) {
      return;
    }

    setIsCreatingBlankTrip(true);
    setBlankTripError(undefined);

    try {
      await createBlankWorkspaceProjectEntry();
      window.location.assign("/workspace");
    } catch (error) {
      setBlankTripError(
        error instanceof Error && error.message.trim()
          ? error.message
          : "空白计划暂时没创建成功，请稍后再试。",
      );
      setIsCreatingBlankTrip(false);
    }
  }

  return (
    <section className="relative flex flex-1 flex-col">
      <div className="create-entry-hero grid items-center gap-5 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(220px,300px)] lg:py-6">
        <div className="max-w-2xl space-y-3">
          <nav
            aria-label="次级导航"
            className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-semibold text-[var(--ink-muted)]"
          >
            <Link
              href="/"
              className="border-b border-transparent pb-0.5 hover:border-[var(--clay-deep)] hover:text-[var(--clay-deep)]"
            >
              回到首页
            </Link>
            <span aria-hidden="true" className="text-[var(--ink-faint)]">
              /
            </span>
            <Link
              href="/explore"
              className="border-b border-transparent pb-0.5 hover:border-[var(--clay-deep)] hover:text-[var(--clay-deep)]"
            >
              探索灵感
            </Link>
          </nav>
          <p className="inline-flex items-center rounded-full border border-[rgb(83_107_82/30%)] bg-[rgb(223_232_216/45%)] px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-[var(--sage-deep)]">
            WANDERLY · 旅行计划工作台
          </p>
          <h1 className="journey-title text-4xl leading-[1.08] tracking-[-0.04em] text-[var(--ink)] sm:text-[44px]">
            开始一次旅行
          </h1>
          <p className="journey-subtitle max-w-xl text-[15px] leading-7">
            选择一种方式，把旅行想法整理成可执行行程。
          </p>
        </div>
        <HeroArchiveDecor className="hidden lg:block" />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 lg:mt-6 lg:grid-cols-3 lg:gap-5">
        <EntryCard
          href="/create?source=file"
          archiveNo="ARCHIVE No.01"
          kicker="IMPORT"
          title="导入已有计划"
          description="上传 md / txt 计划，先解析成旅行版本，再继续编辑或进入工作台。"
          actionLabel="进入导入流程"
          iconSrc={`${CREATE_ENTRY_ASSET_BASE}/icons/import-plan.svg`}
          iconAlt=""
        />
        <EntryCard
          href="/create?source=ai"
          archiveNo="ARCHIVE No.02"
          kicker="AI GUIDE"
          title="AI 创建"
          description="从目的地、天数、预算和偏好开始，先生成一版可修改的旅行草案。"
          actionLabel="进入五问流程"
          iconSrc={`${CREATE_ENTRY_ASSET_BASE}/icons/ai-guide.svg`}
          iconAlt=""
          recommended
          primaryAction
        />
        <EntryActionCard
          archiveNo="ARCHIVE No.03"
          kicker="BLANK"
          title="直接新建计划"
          description="创建一份空白计划，直接进入工作台和 Map Studio，再慢慢补内容。"
          actionLabel={
            isCreatingBlankTrip ? "正在创建空白计划" : "直接进入工作台"
          }
          iconSrc={`${CREATE_ENTRY_ASSET_BASE}/icons/blank-plan.svg`}
          iconAlt=""
          disabled={isCreatingBlankTrip}
          onClick={() => void handleCreateBlankTrip()}
        />
      </div>

      {blankTripError ? (
        <p className="mt-4 rounded-[14px] border border-[rgb(196_104_89/0.5)] bg-[rgb(196_104_89_/_0.08)] px-3 py-2 text-sm leading-6 text-[rgb(146_68_56)]">
          {blankTripError}
        </p>
      ) : null}

      <div className="create-entry-notebar mt-6 lg:mt-7">
        <p className="flex min-w-0 items-center gap-2 text-[var(--ink-muted)]">
          <NoteCompassIcon />
          路线只是参考，出发前请确认实时天气、票价和开放状态。
        </p>
        <p className="flex min-w-0 items-center gap-2 text-[var(--sage-deep)]">
          <NoteClockIcon />
          慢一点，通常比多塞两个景点更好玩。
        </p>
      </div>
    </section>
  );
}
