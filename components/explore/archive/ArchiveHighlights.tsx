import type { ExploreTripContent } from "@/lib/explore/types";

import { ArchivePaperPanel } from "./ArchivePaperPanel";

interface ArchiveHighlightsProps {
  item: ExploreTripContent;
}

export function ArchiveHighlights({ item }: ArchiveHighlightsProps) {
  return (
    <ArchivePaperPanel
      paper="light"
      bookmark="default"
      decoration="stamp"
      className="px-4 py-4 sm:px-5 sm:py-5"
      contentClassName="space-y-4 pt-4"
    >
      <div className="space-y-4">
        <div>
          <p className="workspace-kicker">HIGHLIGHT RECORDS</p>
          <h2 className="mt-2 text-lg font-semibold text-[var(--ink)]">
            值得体验的片段
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {item.highlights.map((highlight, index) => (
            <section
              key={highlight}
              className="rounded-[20px] border border-[var(--line)] bg-[rgb(255_255_255_/_0.56)] px-4 py-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[var(--line)] px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] text-[var(--ink-muted)]">
                  H{index + 1}
                </span>
                {item.theme ? (
                  <span className="rounded-full border border-dashed border-[var(--line)] px-2.5 py-1 text-[11px] text-[var(--ink-muted)]">
                    {item.theme}
                  </span>
                ) : null}
              </div>
              <h3 className="mt-3 text-base font-semibold text-[var(--ink)]">
                灵感片段 {index + 1}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                {highlight}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[var(--ink-muted)]">
                <span className="rounded-full border border-dashed border-[var(--line)] px-2.5 py-1">
                  {item.city}
                </span>
                <span className="rounded-full border border-dashed border-[var(--line)] px-2.5 py-1">
                  旅行档案
                </span>
              </div>
            </section>
          ))}
        </div>
        {typeof item.likes === "number" || typeof item.views === "number" ? (
          <p className="text-xs text-[var(--ink-muted)]">
            {typeof item.likes === "number" ? `收藏 ${item.likes}` : ""}
            {typeof item.likes === "number" && typeof item.views === "number"
              ? " · "
              : ""}
            {typeof item.views === "number" ? `浏览 ${item.views}` : ""}
          </p>
        ) : null}
      </div>
    </ArchivePaperPanel>
  );
}
