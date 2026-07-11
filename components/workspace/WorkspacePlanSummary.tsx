import Image from "next/image";

import type { DayCabinetView } from "@/lib/trip/itinerary-view";
import { safeDisplayText } from "@/lib/trip/result-overview";
import type { TripPlan } from "@/lib/trip/types";

interface WorkspacePlanSummaryProps {
  tripPlan: TripPlan;
  activeCabinet?: DayCabinetView;
}

export function WorkspacePlanSummary({
  tripPlan,
  activeCabinet,
}: WorkspacePlanSummaryProps) {
  return (
    <section className="workspace-panel relative overflow-hidden px-5 py-5 sm:px-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 opacity-20">
        <Image
          src="/images/ui/background/paper-noise-soft.png"
          alt=""
          fill
          aria-hidden
          sizes="960px"
          className="object-cover object-top"
        />
      </div>
      <div className="relative z-[1] flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="workspace-kicker">PLAN SUMMARY</p>
          <h2 className="mt-1.5 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
            {tripPlan.tripTitle}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
            {safeDisplayText(
              tripPlan.summary,
              "Use this version as the baseline, then decide which day deserves the most careful editing.",
            )}
          </p>
        </div>

        {activeCabinet ? (
          <div className="workspace-panel-soft min-w-[15rem] bg-[linear-gradient(180deg,rgba(223,232,216,0.62)_0%,rgba(255,253,247,0.98)_100%)] px-4 py-3">
            <p className="workspace-kicker">CURRENT FOCUS</p>
            <p className="mt-1.5 text-base font-semibold text-[var(--ink)]">
              Day {activeCabinet.dayNumber} - {activeCabinet.theme}
            </p>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              {activeCabinet.date ?? "date pending"}
            </p>
          </div>
        ) : null}
      </div>

      <div className="relative z-[1] mt-4 flex flex-wrap gap-2.5 text-sm">
        <span className="workspace-chip">{tripPlan.destination}</span>
        <span className="workspace-chip workspace-chip-accent">
          {tripPlan.days} days
        </span>
        <span className="workspace-chip">
          {tripPlan.budgetSummary.totalEstimate}
        </span>
      </div>

      <p className="relative z-[1] mt-4 rounded-[20px] border border-dashed border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-sm leading-6 text-[var(--ink-muted)]">
        {safeDisplayText(
          tripPlan.travelStyleSummary,
          "Smooth out route and pace first, then decide which parts should feel lighter and which parts can still become richer.",
        )}
      </p>
    </section>
  );
}
