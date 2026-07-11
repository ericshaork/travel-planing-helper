import Image from "next/image";

import type { DayRouteInsight } from "../../lib/trip/route-insight";
import { buildWorkspaceInsightStats } from "../../lib/trip/workspace-inspector";

import { AmapBaseMap } from "../map/AmapBaseMap";
import { buildAmapMarkerLayer } from "../map/map-utils";

interface InspectorMapPreviewProps {
  insight?: DayRouteInsight;
  loading?: boolean;
  errorMessage?: string;
  activePointId?: string | null;
  onMarkerClick?: (pointId: string) => void;
}

export function InspectorMapPreview({
  insight,
  loading = false,
  errorMessage,
  activePointId = null,
  onMarkerClick,
}: InspectorMapPreviewProps) {
  const points = insight?.mapPoints ?? [];
  const stats = buildWorkspaceInsightStats(insight);
  const { markerPoints, unresolvedCount } = buildAmapMarkerLayer(points);
  const hasOnlyUnresolvedPoints = points.length > 0 && markerPoints.length === 0;
  const emptyTitle = hasOnlyUnresolvedPoints
    ? "这一天的地点还在等确认"
    : "这一天暂时没有可展示的地图点位";
  const emptyDescription = hasOnlyUnresolvedPoints
    ? "先沿着右侧路线列表阅读，等地点名称或地址更明确后，地图会继续补上。"
    : "可以先阅读左侧 Day 行程和右侧路线说明，地图稍后再补足也不影响阅读。";

  if (loading) {
    return (
      <section className="workspace-panel relative overflow-hidden px-4 py-4">
        <div className="pointer-events-none absolute right-4 top-0 h-16 w-12 opacity-75">
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
            <p className="workspace-kicker">DAY MAP</p>
            <h3 className="mt-1 text-base font-semibold">地图预览</h3>
          </div>
          <div className="h-56 animate-pulse rounded-[24px] border border-[var(--line)] bg-[var(--paper)]" />
          <p className="text-sm leading-6 text-[var(--ink-muted)]">
            正在整理当前 Day 的点位和路线……
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="workspace-panel relative overflow-hidden px-4 py-4">
      <div className="pointer-events-none absolute left-4 top-3 h-12 w-20 opacity-70">
        <Image
          src="/images/archive/decoration/archive-label-note.png"
          alt=""
          fill
          aria-hidden
          sizes="80px"
          className="object-contain"
        />
      </div>
      <div className="relative z-[1]">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="workspace-kicker">DAY MAP</p>
            <h3 className="mt-1 text-base font-semibold">路线地图</h3>
            <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
              现在只显示当前 Day 已确认的点位，路线编号、地点标记和高亮焦点都会在这里同步显示。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="workspace-chip">{points.length} 个地点</span>
            <span className="workspace-chip">已定位 {markerPoints.length}</span>
            <span className="workspace-chip">待确认 {stats.unresolvedPoints}</span>
          </div>
        </div>

        <AmapBaseMap
          className="mt-4"
          ariaLabel={insight ? `Day ${insight.dayNumber} route map` : "Route map"}
          markerPoints={markerPoints}
          unresolvedCount={unresolvedCount}
          activePointId={activePointId}
          onMarkerClick={onMarkerClick}
          fitToMarkers
          markerLabel
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
        />

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="workspace-chip">路线编号已显示</span>
          <span className="workspace-chip">当前焦点可高亮</span>
          {errorMessage ? (
            <span className="workspace-chip workspace-chip-warm">
              {errorMessage}
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}
