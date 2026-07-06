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
    <section className="workspace-panel px-4 py-4">
      <div className="relative z-[1] space-y-3">
        <div>
          <p className="workspace-kicker">ROUTE STATS</p>
          <h3 className="mt-1 text-base font-semibold">路线摘要</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard label="已确认点位" value={stats.resolvedPoints} />
          <StatCard label="待确认点位" value={stats.unresolvedPoints} />
          <StatCard
            label="总距离"
            value={
              insight?.routeSummary
                ? formatRouteDistance(stats.totalDistanceMeters)
                : "暂不可用"
            }
          />
          <StatCard
            label="总通勤"
            value={
              insight?.routeSummary
                ? formatRouteDuration(stats.totalDurationMinutes)
                : "暂不可用"
            }
          />
        </div>
      </div>
    </section>
  );
}
