import Image from "next/image";

import type { ExploreTripContent } from "@/lib/explore/types";

interface ArchiveHeaderProps {
  item?: ExploreTripContent | null;
  mode: "drawer" | "page";
  onClose?: () => void;
}

export function ArchiveHeader({ item, mode, onClose }: ArchiveHeaderProps) {
  const archiveCode = item?.externalId ?? item?.id ?? "archive";
  const archiveNumber = archiveCode.toUpperCase().slice(0, 12);
  const sourceLabel =
    item?.creatorType === "editorial"
      ? "编辑档案"
      : item?.creatorType === "community"
        ? "社区档案"
        : "AI档案";

  return (
    <header className="workspace-panel relative overflow-hidden px-4 py-4 sm:px-5 sm:py-5">
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
            <span className="rounded-full border border-[var(--line)] bg-[rgb(255_255_255_/_0.74)] px-2.5 py-1">
              {mode === "drawer" ? "ARCHIVE DRAWER" : "TRAVEL ARCHIVE"}
            </span>
            <span className="rounded-full border border-dashed border-[var(--line)] px-2.5 py-1">
              {archiveNumber}
            </span>
            {item ? (
              <span className="rounded-full border border-dashed border-[var(--line)] px-2.5 py-1">
                {sourceLabel}
              </span>
            ) : null}
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--ink)] sm:text-2xl">
            {item?.title ?? "Travel archive"}
          </h2>
          {item ? (
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium text-[var(--ink-muted)]">
              <span className="rounded-full border border-[var(--line)] bg-[rgb(255_255_255_/_0.78)] px-2.5 py-1">
                {item.city}
              </span>
              <span className="rounded-full border border-[var(--line)] bg-[rgb(255_255_255_/_0.78)] px-2.5 py-1">
                {item.days} 天
              </span>
              <span className="rounded-full border border-dashed border-[var(--line)] px-2.5 py-1">
                {item.tripType}
              </span>
            </div>
          ) : (
            <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
              打开一份档案开始阅读。
            </p>
          )}
        </div>

        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink-muted)]"
          >
            Close
          </button>
        ) : null}
      </div>
    </header>
  );
}
