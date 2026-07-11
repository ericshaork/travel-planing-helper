import type { DayRouteInsight } from "../../lib/trip/route-insight";
import {
  buildWorkspaceInsightStats,
  formatRouteDistance,
  formatRouteDuration,
} from "../../lib/trip/workspace-inspector";

import { InspectorMapPreview } from "./InspectorMapPreview";
import { InspectorPointDetailCard } from "./InspectorPointDetailCard";
import { InspectorPointList } from "./InspectorPointList";
import { InspectorRouteLegs } from "./InspectorRouteLegs";
import { InspectorRouteStats } from "./InspectorRouteStats";
import { InspectorWarningStack } from "./InspectorWarningStack";

interface WorkspaceInspectorProps {
  insight?: DayRouteInsight;
  loading?: boolean;
  errorMessage?: string;
  activePointId?: string | null;
  unmatchedPlaceName?: string | null;
  onPointSelect?: (pointId: string) => void;
}

function formatDayDate(date?: string) {
  if (!date) {
    return "日期待确认";
  }

  return date;
}

export function WorkspaceInspector({
  insight,
  loading = false,
  errorMessage,
  activePointId = null,
  unmatchedPlaceName = null,
  onPointSelect,
}: WorkspaceInspectorProps) {
  const stats = buildWorkspaceInsightStats(insight);

  return (
    <aside className="space-y-4 xl:space-y-5">
      <section className="workspace-panel-soft px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="workspace-kicker">ROUTE NOTE</p>
            <h3 className="mt-1 text-base font-semibold text-[var(--ink)]">
              {insight
                ? `${insight.dayTitle} route archive`
                : "Route archive stays ready here"}
            </h3>
            <p className="mt-1.5 text-sm leading-6 text-[var(--ink-muted)]">
              {insight
                ? `Follow stop order, map placement, and pace checks for ${formatDayDate(insight.date)}.`
                : "Once route insight is available, map, sequence, and travel warnings will stay together on the right."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="workspace-chip">resolved {stats.resolvedPoints}</span>
            <span className="workspace-chip">
              pending {stats.unresolvedPoints}
            </span>
            {insight?.routeSummary ? (
              <>
                <span className="workspace-chip">
                  {formatRouteDistance(stats.totalDistanceMeters)}
                </span>
                <span className="workspace-chip">
                  {formatRouteDuration(stats.totalDurationMinutes)}
                </span>
              </>
            ) : null}
          </div>
        </div>

        {errorMessage ? (
          <p className="mt-4 rounded-[18px] border border-dashed border-[var(--clay)] bg-[var(--clay-soft)] px-3 py-2.5 text-sm leading-6 text-[var(--clay-deep)]">
            {errorMessage}
          </p>
        ) : null}

        {!loading && !insight ? (
          <p className="mt-4 text-sm leading-6 text-[var(--ink-muted)]">
            Route insight is optional. The itinerary stays readable even when map enrichment is not available.
          </p>
        ) : null}
      </section>

      <InspectorMapPreview
        insight={insight}
        loading={loading}
        errorMessage={errorMessage}
        activePointId={activePointId}
        onMarkerClick={onPointSelect}
      />
      <InspectorPointDetailCard
        insight={insight}
        activePointId={activePointId}
        unmatchedPlaceName={unmatchedPlaceName}
      />
      <InspectorRouteStats insight={insight} />
      <InspectorPointList
        insight={insight}
        activePointId={activePointId}
        onPointSelect={onPointSelect}
      />
      <InspectorRouteLegs insight={insight} />
      <InspectorWarningStack insight={insight} />
    </aside>
  );
}
