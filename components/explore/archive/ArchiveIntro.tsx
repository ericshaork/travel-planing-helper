import type { ExploreTripContent } from "@/lib/explore/types";

import { ArchivePaperPanel } from "./ArchivePaperPanel";

interface ArchiveIntroProps {
  item: ExploreTripContent;
}

export function ArchiveIntro({ item }: ArchiveIntroProps) {
  return (
    <ArchivePaperPanel
      paper="light"
      bookmark="default"
      decoration="label"
      className="px-4 py-4 sm:px-5 sm:py-5"
      contentClassName="space-y-3 pt-5"
    >
      <div className="space-y-3">
        <p className="workspace-kicker">TRAVEL STORY</p>
        <h2 className="text-lg font-semibold text-[var(--ink)]">旅行故事</h2>
        <p className="text-sm leading-6 text-[var(--ink-muted)]">
          {item.archiveIntro ?? item.summary}
        </p>
        {item.featuredReason ? (
          <p className="rounded-[18px] border border-dashed border-[var(--line)] bg-[rgb(255_255_255_/_0.56)] px-4 py-3 text-sm leading-6 text-[var(--ink-muted)]">
            为什么值得体验：{item.featuredReason}
          </p>
        ) : null}
      </div>
    </ArchivePaperPanel>
  );
}
