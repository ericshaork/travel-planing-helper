import Image from "next/image";

import type { DayRouteInsight } from "@/lib/trip/route-insight";
import {
  buildWorkspaceInsightStats,
  formatRouteDistance,
  formatRouteDuration,
} from "@/lib/trip/workspace-inspector";

import { WorkspaceInspector } from "./WorkspaceInspector";

interface MapPanelProps {
  insight?: DayRouteInsight;
  loading?: boolean;
  errorMessage?: string;
  activePointId?: string | null;
  unmatchedPlaceName?: string | null;
  onPointSelect?: (pointId: string) => void;
}

export function MapPanel({
  insight,
  loading = false,
  errorMessage,
  activePointId = null,
  unmatchedPlaceName = null,
  onPointSelect,
}: MapPanelProps) {
  const stats = buildWorkspaceInsightStats(insight);

  return (
    <section
      id="workspace-route-insight"
      className="workspace-panel relative scroll-mt-24 overflow-hidden px-4 py-4 sm:px-5 sm:py-5"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 opacity-20">
        <Image
          src="/images/ui/background/paper-noise-soft.png"
          alt=""
          fill
          aria-hidden
          sizes="420px"
          className="object-cover object-top"
        />
      </div>
      <div className="pointer-events-none absolute right-4 top-0 h-16 w-12 opacity-85">
        <Image
          src="/images/archive/bookmark/archive-bookmark-default.png"
          alt=""
          fill
          aria-hidden
          sizes="48px"
          className="object-contain object-top"
        />
      </div>

      <div className="relative z-[1]">
        <div className="border-b border-dashed border-[var(--line)] pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="workspace-kicker">MAP</p>
              <h2 className="mt-1 text-lg font-semibold text-[var(--ink)] sm:text-xl">
                {insight ? `Day ${insight.dayNumber} 路线地图` : "路线地图"}
              </h2>
              <p className="mt-1.5 text-sm leading-6 text-[var(--ink-muted)]">
                {insight
                  ? `${insight.dayTitle}${insight.date ? ` · ${insight.date}` : ""}`
                  : "选中某一天后，这里会同步显示对应的路线、停靠点和节奏信息。"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="workspace-chip">
                {insight?.mapPoints.length ?? 0} 个地点
              </span>
              <span className="workspace-chip">
                {insight?.routeSummary
                  ? formatRouteDistance(stats.totalDistanceMeters)
                  : "距离待确认"}
              </span>
              <span className="workspace-chip">
                {insight?.routeSummary
                  ? formatRouteDuration(stats.totalDurationMinutes)
                  : "时长待确认"}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <WorkspaceInspector
            insight={insight}
            loading={loading}
            errorMessage={errorMessage}
            activePointId={activePointId}
            unmatchedPlaceName={unmatchedPlaceName}
            onPointSelect={onPointSelect}
          />
        </div>
      </div>
    </section>
  );
}
