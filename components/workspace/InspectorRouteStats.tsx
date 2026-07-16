import type { DayRouteInsight } from "@/lib/trip/route-insight";
import {
  buildWorkspaceInsightStats,
  formatRouteDistance,
  formatRouteDuration,
} from "@/lib/trip/workspace-inspector";

interface InspectorRouteStatsProps {
  insight?: DayRouteInsight;
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="workspace-panel-soft px-3 py-3">
      <p className="workspace-kicker">{label}</p>
      <p className="mt-1 text-base font-semibold">{value}</p>
    </div>
  );
}

export function InspectorRouteStats({ insight }: InspectorRouteStatsProps) {
  const stats = buildWorkspaceInsightStats(insight);

  return (
    <section className="space-y-3">
      <div>
        <p className="workspace-kicker">路线摘要</p>
        <h3 className="mt-1 text-base font-semibold">路线摘要</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="已定位地点" value={stats.resolvedPoints} />
        <StatCard label="待确认地点" value={stats.unresolvedPoints} />
        <StatCard
          label="路线距离"
          value={
            insight?.routeSummary
              ? formatRouteDistance(stats.totalDistanceMeters)
              : "待补充"
          }
        />
        <StatCard
          label="移动时长"
          value={
            insight?.routeSummary
              ? formatRouteDuration(stats.totalDurationMinutes)
              : "待补充"
          }
        />
      </div>
    </section>
  );
}
