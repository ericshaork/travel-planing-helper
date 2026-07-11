import type { ExploreTripContent } from "@/lib/explore/types";

import { ArchivePaperPanel } from "./ArchivePaperPanel";

interface ArchiveMapProps {
  item: ExploreTripContent;
}

export function ArchiveMap({ item }: ArchiveMapProps) {
  return (
    <ArchivePaperPanel
      paper="warm"
      decoration="tape"
      className="px-4 py-4 sm:px-5 sm:py-5"
      contentClassName="space-y-4 pt-4"
    >
      <div className="space-y-4">
        <div>
          <p className="workspace-kicker">ROUTE RELATION</p>
          <h2 className="mt-2 text-lg font-semibold text-[var(--ink)]">
            Map handoff
          </h2>
        </div>
        <p className="text-sm leading-6 text-[var(--ink-muted)]">
          The interactive map still belongs to Workspace. This viewer keeps the
          archive map section ready for a future drawer and full-page upgrade.
        </p>
        <div className="rounded-[20px] border border-dashed border-[var(--line)] bg-[rgb(255_255_255_/_0.56)] px-4 py-4">
          {item.pois.length > 0 ? (
            <ol className="space-y-3 text-sm leading-6 text-[var(--ink-muted)]">
              {item.pois.slice(0, 6).map((poi, index) => (
                <li key={poi.id} className="flex items-start gap-3">
                  <span className="rounded-full border border-[var(--line)] px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em]">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-[var(--ink)]">{poi.name}</p>
                    <p>{poi.reason}</p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm leading-6 text-[var(--ink-muted)]">
              No POI list is available for this archive yet.
            </p>
          )}
        </div>
      </div>
    </ArchivePaperPanel>
  );
}
