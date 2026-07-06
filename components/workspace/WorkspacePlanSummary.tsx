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
    <section className="workspace-panel px-5 py-5 sm:px-6">
      <div className="relative z-[1] flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="workspace-kicker">PLAN SUMMARY</p>
          <h2 className="mt-1.5 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
            {tripPlan.tripTitle}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
            {safeDisplayText(
              tripPlan.summary,
              "先按这版走通，再决定哪一天最值得细改。",
            )}
          </p>
        </div>

        {activeCabinet ? (
          <div className="workspace-panel-soft min-w-[15rem] bg-[linear-gradient(180deg,rgba(223,232,216,0.62)_0%,rgba(255,253,247,0.98)_100%)] px-4 py-3">
            <p className="workspace-kicker">当前聚焦</p>
            <p className="mt-1.5 text-base font-semibold text-[var(--ink)]">
              Day {activeCabinet.dayNumber} · {activeCabinet.theme}
            </p>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              {activeCabinet.date ?? "日期待确认"}
            </p>
          </div>
        ) : null}
      </div>

      <div className="relative z-[1] mt-4 flex flex-wrap gap-2.5 text-sm">
        <span className="workspace-chip">{tripPlan.destination}</span>
        <span className="workspace-chip workspace-chip-accent">
          {tripPlan.days} 天
        </span>
        <span className="workspace-chip">
          {tripPlan.budgetSummary.totalEstimate}
        </span>
      </div>

      <p className="relative z-[1] mt-4 rounded-[20px] border border-dashed border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-sm leading-6 text-[var(--ink-muted)]">
        {safeDisplayText(
          tripPlan.travelStyleSummary,
          "先把路线和节奏摆平，再看哪些地方要更松一点，哪些地方还能再丰富一点。",
        )}
      </p>
    </section>
  );
}
