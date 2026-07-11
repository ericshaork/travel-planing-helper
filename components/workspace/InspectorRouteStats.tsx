import Image from "next/image";

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
    <section className="workspace-panel relative overflow-hidden px-4 py-4">
      <div className="pointer-events-none absolute right-3 top-0 h-14 w-12 opacity-65">
        <Image
          src="/images/archive/bookmark/archive-bookmark-default.png"
          alt=""
          fill
          aria-hidden
          sizes="48px"
          className="object-contain object-top"
        />
      </div>
      <div className="relative z-[1] space-y-3">
        <div>
          <p className="workspace-kicker">ROUTE SUMMARY</p>
          <h3 className="mt-1 text-base font-semibold">Planning stats</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Mapped stops" value={stats.resolvedPoints} />
          <StatCard label="Pending stops" value={stats.unresolvedPoints} />
          <StatCard
            label="Distance"
            value={
              insight?.routeSummary
                ? formatRouteDistance(stats.totalDistanceMeters)
                : "pending"
            }
          />
          <StatCard
            label="Travel time"
            value={
              insight?.routeSummary
                ? formatRouteDuration(stats.totalDurationMinutes)
                : "pending"
            }
          />
        </div>
      </div>
    </section>
  );
}
