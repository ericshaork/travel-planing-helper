import type { ExploreTripContent } from "@/lib/explore/types";

interface ArchiveMapProps {
  item: ExploreTripContent;
}

export function ArchiveMap({ item }: ArchiveMapProps) {
  return (
    <article className="workspace-panel px-4 py-4 sm:px-5 sm:py-5">
      <div className="relative z-[1] space-y-3">
        <h2 className="text-lg font-semibold text-[var(--ink)]">Map handoff</h2>
        <p className="text-sm leading-6 text-[var(--ink-muted)]">
          Phase 2.1 keeps this as a structural section. The actual interactive map
          stays in Workspace and can be connected later through the draft adapter.
        </p>
        <div className="rounded-[18px] border border-dashed border-[var(--line)] px-4 py-4 text-sm leading-6 text-[var(--ink-muted)]">
          {item.pois.length > 0
            ? item.pois.map((poi) => poi.name).join(" · ")
            : "No POI list is available for this archive yet."}
        </div>
      </div>
    </article>
  );
}
