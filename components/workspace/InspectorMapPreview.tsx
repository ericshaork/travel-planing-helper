import type { PoiCandidate } from "@/lib/poi/types";
import type { DayRouteInsight } from "@/lib/trip/route-insight";
import type { WorkspaceSessionSourceType } from "@/lib/trip/storage";

import { AmapBaseMap } from "../map/AmapBaseMap";
import { buildAmapMarkerLayer, type AmapMarkerPoint } from "../map/map-utils";

interface InspectorMapPreviewProps {
  workspaceSourceType?: WorkspaceSessionSourceType;
  isBlankWorkspace?: boolean;
  insight?: DayRouteInsight;
  loading?: boolean;
  errorMessage?: string;
  activePointId?: string | null;
  selectedSearchCandidate?: PoiCandidate | null;
  pendingSearchCandidate?: PoiCandidate | null;
  onMarkerClick?: (pointId: string) => void;
}

function buildEmptyCopy({
  workspaceSourceType,
  isBlankWorkspace,
  pointsLength,
  markerPointsLength,
}: {
  workspaceSourceType?: WorkspaceSessionSourceType;
  isBlankWorkspace: boolean;
  pointsLength: number;
  markerPointsLength: number;
}) {
  const hasOnlyUnresolvedPoints = pointsLength > 0 && markerPointsLength === 0;

  if (isBlankWorkspace || workspaceSourceType === "blank_manual") {
    return {
      title: "还没有地点",
      description: "添加第一个地点后，地图会在这里开始标记行程。",
    };
  }

  if (hasOnlyUnresolvedPoints) {
    return {
      title: "这一天的地点还在等确认",
      description: "地点名或地址更明确之后，地图会继续把它们补上。",
    };
  }

  return {
    title: "这一天暂时还没有可显示的地点",
    description: "等左侧行程补出地点后，这里会自动同步 marker 和顺序。",
  };
}

function buildDraftMarkerCandidate(
  candidate: PoiCandidate | null | undefined,
  markerPointsLength: number,
): AmapMarkerPoint[] {
  if (!candidate?.coordinates) {
    return [];
  }

  return [
    {
      id: `draft-${candidate.id}`,
      name: candidate.name,
      coordinates: candidate.coordinates,
      order: markerPointsLength + 1,
      status: "confirmed",
    },
  ];
}

export function InspectorMapPreview({
  workspaceSourceType,
  isBlankWorkspace = false,
  insight,
  loading = false,
  errorMessage,
  activePointId = null,
  selectedSearchCandidate = null,
  pendingSearchCandidate = null,
  onMarkerClick,
}: InspectorMapPreviewProps) {
  const points = insight?.mapPoints ?? [];
  const { markerPoints, unresolvedCount } = buildAmapMarkerLayer(points);
  const draftMarkers = buildDraftMarkerCandidate(
    selectedSearchCandidate ?? pendingSearchCandidate,
    markerPoints.length,
  );
  const allMarkerPoints = [...markerPoints, ...draftMarkers];
  const emptyCopy = buildEmptyCopy({
    workspaceSourceType,
    isBlankWorkspace,
    pointsLength: points.length,
    markerPointsLength: markerPoints.length,
  });

  if (loading) {
    return (
      <section className="absolute inset-0 overflow-hidden">
        <div className="h-full w-full animate-pulse bg-[linear-gradient(180deg,rgba(243,238,223,0.42)_0%,rgba(236,245,231,0.28)_100%)]" />
      </section>
    );
  }

  return (
    <section className="absolute inset-0 overflow-hidden">
      <AmapBaseMap
        className="h-full min-h-0 w-full"
        ariaLabel={insight ? `第 ${insight.dayNumber} 天地图` : "工作台地图"}
        markerPoints={allMarkerPoints}
        unresolvedCount={unresolvedCount}
        activePointId={activePointId}
        onMarkerClick={onMarkerClick}
        fitToMarkers
        markerLabel
        emptyTitle={emptyCopy.title}
        emptyDescription={emptyCopy.description}
        surfaceClassName="map-workspace-surface"
      />

      {errorMessage && !isBlankWorkspace ? (
        <div className="pointer-events-none absolute left-4 bottom-4 z-[2]">
          <span className="map-workspace-chip">
            地图补充信息暂时不完整，但当前点位仍可查看。
          </span>
        </div>
      ) : null}
    </section>
  );
}
