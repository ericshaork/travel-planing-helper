import Image from "next/image";

import type { ArchiveReaderViewModel } from "@/lib/explore/archive-reader";
import {
  cleanDisplayText,
  formatCreatorTypeLabel,
  formatDaysText,
  formatTripTypeLabel,
} from "@/lib/explore/archive-display";

import { ArchiveDecorations } from "./ArchiveDecorations";

interface ArchiveHeaderProps {
  item?: ArchiveReaderViewModel | null;
  mode: "drawer" | "page";
  onClose?: () => void;
}

export function ArchiveHeader({ item, mode, onClose }: ArchiveHeaderProps) {
  const archiveCode = cleanDisplayText(item?.externalId ?? item?.id, "ARCHIVE");
  const archiveNumber = archiveCode.toUpperCase().slice(0, 18);
  const sourceLabel = formatCreatorTypeLabel(item?.creatorType);

  if (mode === "drawer") {
    return (
      <header className="sticky top-0 z-20 overflow-hidden border-b border-[rgba(158,136,110,0.14)] bg-[linear-gradient(90deg,rgba(250,245,234,0.9),rgba(250,245,234,0.62)),url('/images/explore/archive/drawer/archive-drawer-header-02.png')] bg-cover bg-center bg-no-repeat px-5 py-4 sm:px-7">
        <ArchiveDecorations variant="header" />
        <div className="relative z-[1] mx-auto flex max-w-[54rem] items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold tracking-[0.08em] text-[var(--ink-muted)]">
              <span className="rounded-full border border-[rgba(158,136,110,0.18)] bg-[rgb(255_255_255_/_0.56)] px-2.5 py-1">
                阅读档案
              </span>
              <span className="rounded-full border border-dashed border-[rgba(158,136,110,0.22)] bg-[rgba(255,252,246,0.3)] px-2.5 py-1">
                {archiveNumber}
              </span>
              {item ? (
                <span className="rounded-full border border-dashed border-[rgba(158,136,110,0.22)] bg-[rgba(255,252,246,0.3)] px-2.5 py-1">
                  {sourceLabel}
                </span>
              ) : null}
            </div>

            {item ? (
              <div className="flex flex-wrap gap-2 text-[11px] font-medium text-[var(--ink-muted)]">
                <span className="rounded-full border border-[rgba(158,136,110,0.18)] bg-[rgb(255_255_255_/_0.56)] px-2.5 py-1">
                  {cleanDisplayText(item.city, "目的地")}
                </span>
                <span className="rounded-full border border-[rgba(158,136,110,0.18)] bg-[rgb(255_255_255_/_0.56)] px-2.5 py-1">
                  {formatDaysText(item.days, "行程待定")}
                </span>
                <span className="rounded-full border border-dashed border-[rgba(158,136,110,0.22)] bg-[rgba(255,252,246,0.3)] px-2.5 py-1">
                  {formatTripTypeLabel(item.tripType)}
                </span>
              </div>
            ) : null}
          </div>

          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-[rgba(158,136,110,0.18)] bg-[rgba(255,252,246,0.56)] px-4 py-2 text-sm font-semibold text-[var(--ink-muted)]"
            >
              关闭
            </button>
          ) : null}
        </div>
      </header>
    );
  }

  return (
    <header className="workspace-panel relative overflow-hidden px-5 py-5 sm:px-7 sm:py-6">
      <div className="pointer-events-none absolute left-4 top-3 h-12 w-20 opacity-78">
        <Image
          src="/images/archive/decoration/archive-label-note.png"
          alt=""
          fill
          sizes="80px"
          aria-hidden
          className="object-contain"
        />
      </div>
      <div className="pointer-events-none absolute right-4 top-0 h-16 w-12 opacity-90">
        <Image
          src="/images/archive/bookmark/archive-bookmark-default.png"
          alt=""
          fill
          sizes="48px"
          aria-hidden
          className="object-contain object-top"
        />
      </div>

      <div className="relative z-[1] flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold tracking-[0.08em] text-[var(--ink-muted)]">
            <span className="rounded-full border border-[rgba(158,136,110,0.18)] bg-[rgb(255_255_255_/_0.56)] px-2.5 py-1">
              旅行档案
            </span>
            <span className="rounded-full border border-dashed border-[rgba(158,136,110,0.22)] bg-[rgba(255,252,246,0.3)] px-2.5 py-1">
              {archiveNumber}
            </span>
            {item ? (
              <span className="rounded-full border border-dashed border-[rgba(158,136,110,0.22)] bg-[rgba(255,252,246,0.3)] px-2.5 py-1">
                {sourceLabel}
              </span>
            ) : null}
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--ink)] sm:text-2xl">
            {cleanDisplayText(item?.title, "旅行档案")}
          </h2>
          {item ? (
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium text-[var(--ink-muted)]">
              <span className="rounded-full border border-[rgba(158,136,110,0.18)] bg-[rgb(255_255_255_/_0.56)] px-2.5 py-1">
                {cleanDisplayText(item.city, "目的地")}
              </span>
              <span className="rounded-full border border-[rgba(158,136,110,0.18)] bg-[rgb(255_255_255_/_0.56)] px-2.5 py-1">
                {formatDaysText(item.days, "行程待定")}
              </span>
              <span className="rounded-full border border-dashed border-[rgba(158,136,110,0.22)] bg-[rgba(255,252,246,0.3)] px-2.5 py-1">
                {formatTripTypeLabel(item.tripType)}
              </span>
            </div>
          ) : (
            <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
              打开一份档案，先看看这条路线怎么展开。
            </p>
          )}
        </div>
      </div>
    </header>
  );
}
