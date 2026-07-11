import type { ExploreTripContent } from "@/lib/explore/types";

interface ArchiveIntroProps {
  item: ExploreTripContent;
}

export function ArchiveIntro({ item }: ArchiveIntroProps) {
  return (
    <article className="workspace-panel px-4 py-4 sm:px-5 sm:py-5">
      <div className="relative z-[1] space-y-3">
        <h2 className="text-lg font-semibold text-[var(--ink)]">Archive intro</h2>
        <p className="text-sm leading-6 text-[var(--ink-muted)]">
          {item.archiveIntro ?? item.summary}
        </p>
      </div>
    </article>
  );
}
