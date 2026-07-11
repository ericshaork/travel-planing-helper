import type { ExploreTripContent } from "@/lib/explore/types";

interface ArchiveHighlightsProps {
  item: ExploreTripContent;
}

export function ArchiveHighlights({ item }: ArchiveHighlightsProps) {
  return (
    <article className="workspace-panel px-4 py-4 sm:px-5 sm:py-5">
      <div className="relative z-[1] space-y-3">
        <h2 className="text-lg font-semibold text-[var(--ink)]">Highlights</h2>
        <div className="flex flex-wrap gap-2">
          {item.highlights.map((highlight) => (
            <span
              key={highlight}
              className="rounded-full border border-[var(--line)] px-3 py-1 text-xs text-[var(--ink-muted)]"
            >
              {highlight}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}
