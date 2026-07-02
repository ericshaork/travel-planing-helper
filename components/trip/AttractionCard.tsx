import type { ItineraryItem } from "@/lib/trip/types";

interface AttractionCardProps {
  attraction: ItineraryItem;
  day: number;
}

export function AttractionCard({ attraction, day }: AttractionCardProps) {
  return (
    <article className="overflow-hidden border border-[var(--line)] bg-[var(--paper-bright)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="break-words text-lg font-semibold">{attraction.placeName}</h3>
        <span className="font-mono text-xs font-semibold text-[var(--clay-deep)]">
          DAY {day}
        </span>
      </div>
      <p className="mt-3 break-words text-sm leading-6 text-[var(--ink-muted)]">
        {attraction.reason}
      </p>

      {attraction.guide.length > 0 ? (
        <ul className="mt-4 space-y-2 border-t border-dashed border-[var(--line)] pt-4 text-sm leading-6">
          {attraction.guide.map((tip) => (
            <li key={tip} className="flex gap-2">
              <span aria-hidden="true" className="text-[var(--clay)]">
                -
              </span>
              <span className="break-words">{tip}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {attraction.suggestedDuration || attraction.backupPlan ? (
        <div className="mt-4 break-words bg-[var(--sand-soft)] px-3 py-2 text-xs leading-5 text-[var(--ink-muted)]">
          {attraction.suggestedDuration ? (
            <p>建议停留：{attraction.suggestedDuration}</p>
          ) : null}
          {attraction.backupPlan ? <p>备选：{attraction.backupPlan}</p> : null}
        </div>
      ) : null}
    </article>
  );
}
