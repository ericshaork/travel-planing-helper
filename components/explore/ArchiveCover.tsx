import type { ExploreTripContent } from "@/lib/explore/types";

interface ArchiveCoverProps {
  item: ExploreTripContent;
}

export function ArchiveCover({ item }: ArchiveCoverProps) {
  return (
    <article className="workspace-panel px-4 py-4 sm:px-5 sm:py-5">
      <div className="relative z-[1] space-y-3">
        <p className="workspace-kicker">TRAVEL ARCHIVE</p>
        <h1 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--ink)] sm:text-4xl">
          {item.title}
        </h1>
        <p className="text-sm leading-6 text-[var(--ink-muted)] sm:text-[15px]">
          {item.summary}
        </p>
        <div className="flex flex-wrap gap-2 text-xs text-[var(--ink-muted)]">
          <span>{item.city}</span>
          <span>{item.days} days</span>
          <span>{item.tripType}</span>
          {item.theme ? <span>{item.theme}</span> : null}
          {item.pace ? <span>{item.pace}</span> : null}
        </div>
      </div>
    </article>
  );
}
