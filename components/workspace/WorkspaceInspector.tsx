import type { DayRouteInsight } from "../../lib/trip/route-insight";
import type { WorkspaceSessionSourceType } from "../../lib/trip/storage";

import { InspectorPointList } from "./InspectorPointList";
import { InspectorRouteLegs } from "./InspectorRouteLegs";
import { InspectorRouteStats } from "./InspectorRouteStats";
import { InspectorWarningStack } from "./InspectorWarningStack";

interface WorkspaceInspectorProps {
  workspaceSourceType?: WorkspaceSessionSourceType;
  isBlankWorkspace?: boolean;
  hasStops?: boolean;
  compactBlankReadMode?: boolean;
  insight?: DayRouteInsight;
  errorMessage?: string;
  activePointId?: string | null;
  onPointSelect?: (pointId: string) => void;
  floating?: boolean;
}

function InspectorContent({
  workspaceSourceType,
  isBlankWorkspace,
  insight,
  errorMessage,
  activePointId,
  onPointSelect,
}: {
  workspaceSourceType?: WorkspaceSessionSourceType;
  isBlankWorkspace: boolean;
  insight?: DayRouteInsight;
  errorMessage?: string;
  activePointId?: string | null;
  onPointSelect?: (pointId: string) => void;
}) {
  return (
    <div className="grid gap-4">
      {errorMessage && !isBlankWorkspace ? (
        <p className="map-workspace-overlay px-3 py-2.5 text-sm leading-6 text-[var(--ink-muted)]">
          {errorMessage}
        </p>
      ) : null}
      <InspectorRouteStats insight={insight} />
      <InspectorWarningStack insight={insight} />
      <InspectorPointList
        workspaceSourceType={workspaceSourceType}
        isBlankWorkspace={isBlankWorkspace}
        insight={insight}
        activePointId={activePointId}
        onPointSelect={onPointSelect}
      />
      <InspectorRouteLegs insight={insight} />
    </div>
  );
}

export function WorkspaceInspector({
  workspaceSourceType,
  isBlankWorkspace = false,
  hasStops = false,
  compactBlankReadMode = false,
  insight,
  errorMessage,
  activePointId = null,
  onPointSelect,
  floating = false,
}: WorkspaceInspectorProps) {
  const isCompletelyEmpty = isBlankWorkspace && !hasStops;
  const hasInsightContent = Boolean(
    insight?.routeSummary ||
      (insight?.mapPoints.length ?? 0) > 0 ||
      (errorMessage && !isBlankWorkspace),
  );

  if (compactBlankReadMode && isCompletelyEmpty) {
    return null;
  }

  if (isCompletelyEmpty) {
    return (
      <div className="px-2 py-1">
        <p className="text-xs leading-5 text-[var(--ink-faint)]">
          等补上第一个地点后，再展开路线细节。
        </p>
      </div>
    );
  }

  if (floating) {
    if (!hasInsightContent) {
      return (
        <p className="px-1 py-1 text-sm leading-6 text-[var(--ink-muted)]">
          暂时还没有完整路线摘要，但地图工作区已经可以先用起来。
        </p>
      );
    }

    return (
      <InspectorContent
        workspaceSourceType={workspaceSourceType}
        isBlankWorkspace={isBlankWorkspace}
        insight={insight}
        errorMessage={errorMessage}
        activePointId={activePointId}
        onPointSelect={onPointSelect}
      />
    );
  }

  return (
    <details className="map-workspace-drawer overflow-hidden">
      <summary className="cursor-pointer list-none px-2 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="workspace-kicker">路线细节</p>
            <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
              {insight
                ? "路线摘要、节奏备注和地点顺序默认收在这里。"
                : "暂时还没有完整路线摘要，但地图工作区已经可以先用起来。"}
            </p>
          </div>
          <span className="map-workspace-chip">
            {hasInsightContent ? "展开详情" : "待补充"}
          </span>
        </div>
      </summary>

      <div className="max-h-[32vh] overflow-y-auto px-2 pb-2 pt-3">
        <InspectorContent
          workspaceSourceType={workspaceSourceType}
          isBlankWorkspace={isBlankWorkspace}
          insight={insight}
          errorMessage={errorMessage}
          activePointId={activePointId}
          onPointSelect={onPointSelect}
        />
      </div>
    </details>
  );
}
