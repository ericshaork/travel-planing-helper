import type { ExploreTripContent } from "@/lib/explore/types";

import { ArchivePaperPanel } from "./ArchivePaperPanel";

interface ArchivePOIProps {
  item: ExploreTripContent;
}

export function ArchivePOI({ item }: ArchivePOIProps) {
  return (
    <ArchivePaperPanel
      paper="light"
      bookmark="default"
      className="px-4 py-4 sm:px-5 sm:py-5"
      contentClassName="space-y-4 pt-4"
    >
      <div className="space-y-4">
        <div>
          <p className="workspace-kicker">PLACE RECORDS</p>
          <h2 className="mt-2 text-lg font-semibold text-[var(--ink)]">POI</h2>
        </div>
        <div className="space-y-3">
          {item.pois.map((poi, index) => (
            <section
              key={poi.id}
              className="rounded-[20px] border border-[var(--line)] bg-[rgb(255_255_255_/_0.56)] px-4 py-4"
            >
              <div className="flex flex-wrap items-start gap-3">
                <span className="rounded-full border border-[var(--line)] px-3 py-1 text-[11px] font-semibold tracking-[0.08em] text-[var(--ink-muted)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1 space-y-2">
                  <h3 className="text-base font-semibold text-[var(--ink)]">
                    {poi.name}
                  </h3>
                  <p className="text-sm leading-6 text-[var(--ink-muted)]">
                    {poi.reason}
                  </p>
                  <div className="flex flex-wrap gap-2 text-[11px] text-[var(--ink-muted)]">
                    {poi.type ? (
                      <span className="rounded-full border border-dashed border-[var(--line)] px-2.5 py-1">
                        {poi.type}
                      </span>
                    ) : null}
                    {poi.district ? (
                      <span className="rounded-full border border-dashed border-[var(--line)] px-2.5 py-1">
                        {poi.district}
                      </span>
                    ) : null}
                    {typeof poi.recommendedDurationMinutes === "number" ? (
                      <span className="rounded-full border border-dashed border-[var(--line)] px-2.5 py-1">
                        Best time: {poi.recommendedDurationMinutes} min
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>
    </ArchivePaperPanel>
  );
}
