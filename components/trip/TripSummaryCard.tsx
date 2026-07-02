import type { TripPlan } from "@/lib/trip/types";

interface TripSummaryCardProps {
  tripPlan: TripPlan;
}

export function TripSummaryCard({ tripPlan }: TripSummaryCardProps) {
  return (
    <section
      aria-labelledby="trip-summary-title"
      className="paper-card relative overflow-hidden border border-[var(--line-strong)] bg-[var(--paper-bright)] p-5 sm:p-8"
    >
      <div
        aria-hidden="true"
        className="absolute -right-3 -top-3 h-9 w-24 rotate-2 bg-[var(--tape)] opacity-80"
      />
      <p className="text-xs font-semibold tracking-[0.14em] text-[var(--clay-deep)]">
        这趟怎么走
      </p>
      <h1
        id="trip-summary-title"
        className="mt-3 max-w-3xl break-words text-3xl font-semibold tracking-[-0.035em] sm:text-5xl"
      >
        {tripPlan.tripTitle}
      </h1>
      <div className="mt-5 flex flex-wrap gap-2 text-sm">
        <span className="max-w-full break-words border border-[var(--line)] bg-[var(--sand-soft)] px-3 py-1.5 font-semibold">
          {tripPlan.destination}
        </span>
        <span className="max-w-full break-words border border-[var(--line)] bg-[var(--sage-soft)] px-3 py-1.5 font-semibold text-[var(--sage-deep)]">
          {tripPlan.days} 天
        </span>
      </div>
      <p className="mt-6 max-w-3xl break-words text-base leading-8 text-[var(--ink)]">
        {tripPlan.summary}
      </p>
      <p className="mt-5 break-words border-l-2 border-[var(--sage-deep)] pl-4 text-sm leading-7 text-[var(--ink-muted)]">
        {tripPlan.travelStyleSummary}
      </p>
    </section>
  );
}
