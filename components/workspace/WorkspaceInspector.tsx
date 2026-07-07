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
    <aside className="space-y-4 lg:sticky lg:top-5 xl:space-y-5">
      <section className="workspace-panel px-5 py-5">
        <div className="relative z-[1]">
          <p className="workspace-kicker">MAP / ROUTE INSPECTOR</p>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--ink)]">
                {insight
                  ? `Day ${insight.dayNumber} 路线检查器`
                  : "路线提醒会固定停在这里"}
              </h2>
              <p className="mt-1.5 text-sm leading-6 text-[var(--ink-muted)]">
                {insight
                  ? `${insight.dayTitle} · ${formatDayDate(insight.date)}`
                  : "生成计划后，当前 Day 的点位、路线和节奏提醒都会收进右侧，不需要再把中间主区拉成长报告。"}
              </p>
            </div>
            <span className="workspace-chip">active day sync</span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="workspace-chip">已确认 {stats.resolvedPoints}</span>
            <span className="workspace-chip">待确认 {stats.unresolvedPoints}</span>
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

          {errorMessage ? (
            <p className="mt-4 rounded-[18px] border border-dashed border-[var(--clay)] bg-[var(--clay-soft)] px-3 py-2.5 text-sm leading-6 text-[var(--clay-deep)]">
              {errorMessage}
            </p>
          ) : null}

          {!loading && !insight ? (
            <p className="mt-4 text-sm leading-6 text-[var(--ink-muted)]">
              路线洞察暂不可用时，行程方案仍然可以正常参考。
            </p>
          ) : null}
        </div>
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
