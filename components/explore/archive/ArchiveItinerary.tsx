import type { ArchiveReaderViewModel } from "@/lib/explore/archive-reader";
import {
  cleanDisplayText,
  formatActivityDescription,
  formatTimeBlockLabel,
} from "@/lib/explore/archive-display";
import { getArchiveRouteIllustrationSlot } from "@/lib/explore/image-resolver";

import { ResolvedImage } from "../ResolvedImage";
import { ArchiveDecorations } from "./ArchiveDecorations";

interface ArchiveItineraryProps {
  item: ArchiveReaderViewModel;
}

export function ArchiveItinerary({ item }: ArchiveItineraryProps) {
  if (item.dailyItinerary.length === 0) {
    return null;
  }

  const routeIllustrationSlot = getArchiveRouteIllustrationSlot(item);

  return (
    <section className="relative space-y-4 border-t border-[rgba(158,136,110,0.12)] pt-7">
      <ArchiveDecorations variant="route" />
      <div className="max-w-3xl">
        <p className="workspace-kicker">DAILY ROUTE</p>
        <h2 className="mt-2 text-lg font-semibold text-[var(--ink)]">每日路线</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start">
        <div className="grid gap-5 xl:grid-cols-2">
          {item.dailyItinerary.map((day, dayIndex) => (
            <article
              key={`${day.dayNumber}-${dayIndex}`}
              className="space-y-3 border-l border-[rgba(158,136,110,0.16)] pl-4"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-[rgba(158,136,110,0.14)] px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] text-[var(--ink-muted)]">
                  Day {typeof day.dayNumber === "number" ? day.dayNumber : dayIndex + 1}
                </span>
                <h3 className="text-base font-semibold text-[var(--ink)]">
                  {cleanDisplayText(day.title, `第 ${dayIndex + 1} 天`)}
                </h3>
              </div>

              <p className="max-w-2xl text-sm leading-7 text-[var(--ink-muted)]">
                {cleanDisplayText(day.summary, "按当天节奏慢慢走，不必排得太满。")}
              </p>

              <ul className="space-y-2 text-sm leading-7 text-[var(--ink)]">
                {day.activities.slice(0, 3).map((activity, index) => (
                  <li key={`${day.dayNumber}-${activity.timeBlock}-${index}`} className="flex gap-3">
                    <span className="w-11 shrink-0 font-semibold text-[var(--ink-muted)]">
                      {formatTimeBlockLabel(activity.timeBlock)}
                    </span>
                    <span className="min-w-0">{formatActivityDescription(activity)}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        {routeIllustrationSlot.sources.length > 0 ? (
          <div className="relative hidden lg:block">
            <ResolvedImage
              sources={routeIllustrationSlot.sources}
              alt={`${item.title} 路线预览插图`}
              sizes="256px"
              wrapperClassName="relative aspect-[4/5] overflow-hidden rounded-[10px] border border-[rgba(158,136,110,0.1)] bg-[rgba(255,250,241,0.14)] shadow-[0_12px_24px_rgba(88,76,57,0.06)]"
              imageClassName="object-cover"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
