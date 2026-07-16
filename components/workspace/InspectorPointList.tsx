import type { DayRouteInsight } from "../../lib/trip/route-insight";
import type { WorkspaceSessionSourceType } from "../../lib/trip/storage";

import { isResolvedMapPoint } from "../map/map-utils";

interface InspectorPointListProps {
  workspaceSourceType?: WorkspaceSessionSourceType;
  isBlankWorkspace?: boolean;
  insight?: DayRouteInsight;
  activePointId?: string | null;
  onPointSelect?: (pointId: string) => void;
}

const SLOT_LABELS = {
  morning: "上午",
  afternoon: "下午",
  evening: "晚上",
} as const;

export function InspectorPointList({
  workspaceSourceType,
  isBlankWorkspace = false,
  insight,
  activePointId = null,
  onPointSelect,
}: InspectorPointListProps) {
  const points = insight?.mapPoints ?? [];

  return (
    <section className="space-y-3">
      <div>
        <p className="workspace-kicker">路线地点</p>
        <h3 className="mt-1 text-base font-semibold">地点顺序</h3>
      </div>

      {points.length > 0 ? (
        <ol className="space-y-3">
          {points.map((point, index) => (
            <li key={point.id} className="relative pl-12">
              {index < points.length - 1 ? (
                <span className="pointer-events-none absolute left-[1.1rem] top-8 h-[calc(100%-1rem)] w-px bg-[var(--line)]" />
              ) : null}

              <button
                type="button"
                onClick={() => onPointSelect?.(point.id)}
                aria-pressed={activePointId === point.id}
                className={`workspace-panel-soft w-full px-3 py-3 text-left transition-all duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] ${
                  activePointId === point.id
                    ? "border-[var(--ink)] bg-[var(--sand-soft)] shadow-[4px_4px_0_var(--sand-soft)]"
                    : "hover:-translate-y-0.5 hover:border-[var(--line-strong)]"
                }`}
              >
                <span
                  className={`absolute left-0 top-2.5 flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold ${
                    activePointId === point.id
                      ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper-bright)]"
                      : "border-[var(--line)] bg-[var(--paper-bright)] text-[var(--clay-deep)]"
                  }`}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{point.name}</p>
                    <span
                      className={
                        point.resolved
                          ? "workspace-chip workspace-chip-accent"
                          : "workspace-chip"
                      }
                    >
                      {point.resolved ? "已定位" : "待确认"}
                    </span>
                    {activePointId === point.id ? (
                      <span className="workspace-chip">当前查看</span>
                    ) : null}
                  </div>

                  <p className="mt-1 text-xs text-[var(--ink-muted)]">
                    {SLOT_LABELS[point.slot]}
                    {point.provider ? ` / ${point.provider}` : ""}
                  </p>

                  {point.address ? (
                    <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                      {point.address}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                      地址还没完全确认，先作为这一天的路线地点保留下来。
                    </p>
                  )}

                  {!isResolvedMapPoint(point) ? (
                    <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">
                      这个地点还没完成定位，所以会先留在顺序列表里，不会强行挤占地图主视图。
                    </p>
                  ) : null}

                  {point.warning ? (
                    <p className="mt-2 rounded-[16px] border border-dashed border-[var(--line)] bg-[var(--paper-bright)] px-2.5 py-2 text-xs leading-5 text-[var(--ink-muted)]">
                      {point.warning}
                    </p>
                  ) : null}
                </div>
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-[18px] border border-dashed border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-sm leading-6 text-[var(--ink-muted)]">
          {isBlankWorkspace || workspaceSourceType === "blank_manual"
            ? "空白计划还没有地点顺序。等你从左侧补上第一个地点后，这里会开始同步路线列表。"
            : "这一天暂时还没有完整的地点顺序，但地图工作区仍然可以先显示空状态。"}
        </p>
      )}
    </section>
  );
}
