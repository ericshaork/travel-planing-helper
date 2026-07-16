"use client";

import Image from "next/image";
import { useState } from "react";

import {
  formatSavedTripBudget,
  formatSavedTripDateRange,
  formatSavedTripDays,
  formatSavedTripLastOpenedAt,
  formatSavedTripUpdatedAt,
} from "../../lib/trips/list-format";
import {
  getTripSourceTypeLabel,
  getTripStatusLabel,
  validateSavedTripTitle,
} from "../../lib/trips/metadata";
import type { SavedTripListItem } from "../../lib/trips/types";

interface SavedTripCardProps {
  trip: SavedTripListItem;
  isOpening?: boolean;
  isDeleting?: boolean;
  isRenaming?: boolean;
  isConfirmingDelete?: boolean;
  openError?: string | null;
  deleteError?: string | null;
  renameError?: string | null;
  onOpen?: (trip: SavedTripListItem) => void | Promise<void>;
  onDelete?: (trip: SavedTripListItem) => void | Promise<void>;
  onRename?: (trip: SavedTripListItem, nextTitle: string) => void | Promise<void>;
  onCancelDelete?: (trip: SavedTripListItem) => void;
}

function CoverPlaceholder({ destination }: { destination: string | null }) {
  const label = destination?.trim() || "旅行计划";

  return (
    <div className="flex h-28 items-end rounded-[20px] border border-[var(--line)] bg-[linear-gradient(135deg,var(--sage-soft),var(--paper-bright),var(--sand-soft))] p-4">
      <div className="rounded-full border border-[var(--line-strong)] bg-[rgb(255_255_255_/_0.72)] px-3 py-1 text-xs font-semibold tracking-[0.12em] text-[var(--clay-deep)]">
        {label}
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-dashed border-[var(--line)] bg-[var(--paper)] px-3 py-2.5">
      <p className="text-[11px] font-semibold tracking-[0.14em] text-[var(--ink-muted)]">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-[var(--ink)]">{value}</p>
    </div>
  );
}

function MetaTag({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "sage" | "sand";
}) {
  const className =
    tone === "sage"
      ? "border-[var(--sage-deep)] bg-[var(--sage-soft)] text-[var(--sage-deep)]"
      : tone === "sand"
        ? "border-[var(--line-strong)] bg-[var(--sand-soft)] text-[var(--ink)]"
        : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink-muted)]";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  );
}

export function SavedTripCard({
  trip,
  isOpening = false,
  isDeleting = false,
  isRenaming = false,
  isConfirmingDelete = false,
  openError = null,
  deleteError = null,
  renameError = null,
  onOpen,
  onDelete,
  onRename,
  onCancelDelete,
}: SavedTripCardProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(trip.title);
  const [localRenameError, setLocalRenameError] = useState<string | null>(null);

  async function handleRenameSubmit() {
    const normalizedTitle = titleDraft.trim();

    const validationMessage = validateSavedTripTitle(normalizedTitle);

    if (validationMessage) {
      setLocalRenameError(validationMessage);
      return;
    }

    setLocalRenameError(null);
    try {
      await onRename?.(trip, normalizedTitle);
      setIsEditingTitle(false);
    } catch {
      // The page state will surface a localized error message.
    }
  }

  const renameMessage = localRenameError ?? renameError;

  return (
    <article className="workspace-panel px-4 py-4 sm:px-5 sm:py-5">
      <div className="relative z-[1] space-y-4">
        {trip.cover_image_url ? (
          <div className="overflow-hidden rounded-[20px] border border-[var(--line)]">
            <Image
              src={trip.cover_image_url}
              alt={trip.title}
              width={1200}
              height={448}
              className="h-28 w-full object-cover"
            />
          </div>
        ) : (
          <CoverPlaceholder destination={trip.destination_city} />
        )}

        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="workspace-kicker">我的行程</p>
              {isEditingTitle ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className="sr-only" htmlFor={`rename-trip-${trip.id}`}>
                    重命名行程标题
                  </label>
                  <input
                    id={`rename-trip-${trip.id}`}
                    type="text"
                    value={titleDraft}
                    onChange={(event) => setTitleDraft(event.target.value)}
                    className="min-w-[220px] rounded-full border border-[var(--line-strong)] bg-[var(--paper-bright)] px-4 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--clay-deep)]"
                    placeholder="输入新的行程标题"
                    disabled={isRenaming}
                  />
                  <button
                    type="button"
                    onClick={() => void handleRenameSubmit()}
                    disabled={isRenaming}
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--ink)] bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-[var(--paper-bright)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isRenaming ? "正在保存..." : "保存标题"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTitleDraft(trip.title);
                      setLocalRenameError(null);
                      setIsEditingTitle(false);
                    }}
                    disabled={isRenaming}
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink-muted)]"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--ink)]">
                  {trip.title}
                </h2>
              )}
              <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                {trip.destination_city?.trim() || "目的地待补充"}
              </p>
            </div>

            {!isEditingTitle ? (
              <button
                type="button"
                onClick={() => {
                  setLocalRenameError(null);
                  setTitleDraft(trip.title);
                  setIsEditingTitle(true);
                }}
                disabled={isOpening || isDeleting || isRenaming}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--line)] px-4 py-2.5 text-sm font-semibold text-[var(--ink-muted)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                重命名
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <MetaTag label={getTripStatusLabel(trip.status)} tone="sage" />
            <MetaTag label={getTripSourceTypeLabel(trip.source_type)} tone="sand" />
          </div>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          <Fact label="日期" value={formatSavedTripDateRange(trip)} />
          <Fact label="天数" value={formatSavedTripDays(trip.days)} />
          <Fact label="预算" value={formatSavedTripBudget(trip.budget)} />
          <Fact label="最近更新" value={formatSavedTripUpdatedAt(trip.updated_at)} />
          <Fact
            label="最近打开"
            value={formatSavedTripLastOpenedAt(trip.last_opened_at)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void onOpen?.(trip)}
            disabled={!onOpen || isOpening || isDeleting || isRenaming}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--ink)] bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-[var(--paper-bright)] shadow-[4px_4px_0_var(--clay)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
          >
            {isOpening ? "正在打开..." : "打开到 Workspace"}
          </button>

          <button
            type="button"
            onClick={() => void onDelete?.(trip)}
            disabled={!onDelete || isOpening || isDeleting || isRenaming}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--dusty-rose)] bg-[rgb(196_104_89_/_0.08)] px-4 py-2.5 text-sm font-semibold text-[var(--dusty-rose)] transition-colors hover:bg-[rgb(196_104_89_/_0.14)] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dusty-rose)]"
          >
            {isDeleting ? "正在删除..." : isConfirmingDelete ? "确认删除" : "删除"}
          </button>

          {isConfirmingDelete && !isDeleting ? (
            <button
              type="button"
              onClick={() => onCancelDelete?.(trip)}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--line)] px-4 py-2.5 text-sm font-semibold text-[var(--ink-muted)]"
            >
              取消
            </button>
          ) : null}
        </div>

        {isConfirmingDelete && !isDeleting ? (
          <p className="rounded-[16px] border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm leading-6 text-[var(--ink-muted)]">
            再点一次“确认删除”，这条已保存计划就会从“我的行程”里移除。
          </p>
        ) : (
          <p className="text-xs leading-5 text-[var(--ink-muted)]">
            打开时会先尝试记录最近打开时间，然后仍然沿用原来的恢复流程进入
            /workspace。
          </p>
        )}

        {renameMessage ? (
          <p className="rounded-[16px] border border-[var(--dusty-rose)] bg-[rgb(196_104_89_/_0.08)] px-3 py-2 text-sm leading-6 text-[var(--dusty-rose)]">
            {renameMessage}
          </p>
        ) : null}

        {openError ? (
          <p className="rounded-[16px] border border-[var(--dusty-rose)] bg-[rgb(196_104_89_/_0.08)] px-3 py-2 text-sm leading-6 text-[var(--dusty-rose)]">
            {openError}
          </p>
        ) : null}

        {deleteError ? (
          <p className="rounded-[16px] border border-[var(--dusty-rose)] bg-[rgb(196_104_89_/_0.08)] px-3 py-2 text-sm leading-6 text-[var(--dusty-rose)]">
            {deleteError}
          </p>
        ) : null}
      </div>
    </article>
  );
}
