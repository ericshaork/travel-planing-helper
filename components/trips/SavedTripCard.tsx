"use client";

import Image from "next/image";

import type { SavedTripListItem } from "../../lib/trips/types";
import {
  formatSavedTripBudget,
  formatSavedTripDateRange,
  formatSavedTripDays,
  formatSavedTripUpdatedAt,
} from "../../lib/trips/list-format";

interface SavedTripCardProps {
  trip: SavedTripListItem;
  isOpening?: boolean;
  isDeleting?: boolean;
  isConfirmingDelete?: boolean;
  openError?: string | null;
  deleteError?: string | null;
  onOpen?: (trip: SavedTripListItem) => void | Promise<void>;
  onDelete?: (trip: SavedTripListItem) => void | Promise<void>;
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

export function SavedTripCard({
  trip,
  isOpening = false,
  isDeleting = false,
  isConfirmingDelete = false,
  openError = null,
  deleteError = null,
  onOpen,
  onDelete,
  onCancelDelete,
}: SavedTripCardProps) {
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

        <div>
          <p className="workspace-kicker">已保存计划</p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--ink)]">
            {trip.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
            {trip.destination_city?.trim() || "待定目的地"}
          </p>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <Fact label="日期" value={formatSavedTripDateRange(trip)} />
          <Fact label="天数" value={formatSavedTripDays(trip.days)} />
          <Fact label="预算" value={formatSavedTripBudget(trip.budget)} />
          <Fact label="最近更新" value={formatSavedTripUpdatedAt(trip.updated_at)} />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void onOpen?.(trip)}
            disabled={!onOpen || isOpening || isDeleting}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--ink)] bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-[var(--paper-bright)] shadow-[4px_4px_0_var(--clay)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
          >
            {isOpening ? "正在打开..." : "打开到 Workspace"}
          </button>

          <button
            type="button"
            onClick={() => void onDelete?.(trip)}
            disabled={!onDelete || isOpening || isDeleting}
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
            再点一次“确认删除”，这条已保存计划会从“我的行程”中移除。
          </p>
        ) : (
          <p className="text-xs leading-5 text-[var(--ink-muted)]">
            打开时会先恢复到本地工作态，然后进入 /workspace 阅读模式。
          </p>
        )}

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
