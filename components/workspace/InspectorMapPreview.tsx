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
    ? "这一天的地点还没确认到具体位置"
    : "这一天暂时没有可落图点位";
  const emptyDescription = hasOnlyUnresolvedPoints
    ? "右侧点位列表里还保留着这些地点。先照着行程看，出发前再把名称或地址核对清楚会更稳。"
    : "如果地点名称还比较泛，先看右侧列表和路线摘要，后面补齐位置后地图就能继续接上。";

  if (loading) {
    return (
      <section className="workspace-panel px-4 py-4">
        <div className="relative z-[1] space-y-3">
          <div>
            <p className="workspace-kicker">DAY MAP</p>
            <h3 className="mt-1 text-base font-semibold">地图预览</h3>
          </div>
          <div className="h-48 animate-pulse rounded-[24px] border border-[var(--line)] bg-[var(--paper)]" />
          <p className="text-sm leading-6 text-[var(--ink-muted)]">
            正在整理当前 Day 的点位和路线。地图出来前，你还是可以先看右侧其他信息。
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="workspace-panel px-4 py-4">
      <div className="relative z-[1]">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="workspace-kicker">DAY MAP</p>
            <h3 className="mt-1 text-base font-semibold">地图预览</h3>
            <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
              现在只显示当前 Day 已确认的点位。待确认地点会先留在右侧列表里，不会硬上地图。
            </p>
          </div>
          <span className="workspace-chip">{points.length} 个点位</span>
        </div>

        <AmapBaseMap
          className="mt-4"
          ariaLabel={insight ? `Day ${insight.dayNumber} 地图预览` : "地图预览"}
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
          <span className="workspace-chip">已落图 {markerPoints.length}</span>
          <span className="workspace-chip">待确认 {stats.unresolvedPoints}</span>
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
