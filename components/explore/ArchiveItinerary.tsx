import type { ExploreTripContent } from "@/lib/explore/types";

interface ArchiveItineraryProps {
  item: ExploreTripContent;
}

export function ArchiveItinerary({ item }: ArchiveItineraryProps) {
  return (
    <article className="workspace-panel px-4 py-4 sm:px-5 sm:py-5">
      <div className="relative z-[1] space-y-4">
        <h2 className="text-lg font-semibold text-[var(--ink)]">Daily itinerary</h2>
        <div className="space-y-3">
          {item.dailyItinerary.map((day) => (
            <section
              key={day.dayNumber}
              className="rounded-[18px] border border-[var(--line)] px-4 py-4"
            >
              <h3 className="text-base font-semibold text-[var(--ink)]">
                Day {day.dayNumber} · {day.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                {day.summary}
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--ink)]">
                {day.activities.map((activity, index) => (
                  <li key={`${day.dayNumber}-${activity.timeBlock}-${index}`}>
                    <span className="font-semibold">{activity.timeBlock}</span>
                    {` · ${activity.description}`}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}
