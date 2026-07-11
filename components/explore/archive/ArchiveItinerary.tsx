import type { ExploreTripContent } from "@/lib/explore/types";

import { ArchivePaperPanel } from "./ArchivePaperPanel";

interface ArchiveItineraryProps {
  item: ExploreTripContent;
}

export function ArchiveItinerary({ item }: ArchiveItineraryProps) {
  return (
    <ArchivePaperPanel
      paper="warm"
      bookmark="active"
      decoration="tape"
      className="px-4 py-4 sm:px-5 sm:py-5"
      contentClassName="space-y-4 pt-4"
    >
      <div className="space-y-4">
        <div>
          <p className="workspace-kicker">ROUTE PREVIEW</p>
          <h2 className="mt-2 text-lg font-semibold text-[var(--ink)]">
            路线预览
          </h2>
        </div>
        <div className="space-y-3">
          {item.dailyItinerary.map((day) => (
            <section
              key={day.dayNumber}
              className="rounded-[20px] border border-[var(--line)] bg-[rgb(255_255_255_/_0.56)] px-4 py-4 shadow-[0_6px_18px_rgb(55_44_32_/_0.05)]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[var(--line)] px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] text-[var(--ink-muted)]">
                  DAY {day.dayNumber}
                </span>
                <h3 className="text-base font-semibold text-[var(--ink)]">
                  {day.title}
                </h3>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                {day.summary}
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--ink)]">
                {day.activities.map((activity, index) => (
                  <li key={`${day.dayNumber}-${activity.timeBlock}-${index}`}>
                    <span className="font-semibold">{activity.timeBlock}</span>
                    {`：${activity.description}`}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </ArchivePaperPanel>
  );
}
