import type { DayRouteInsight } from "../../lib/trip/route-insight";

import { isResolvedMapPoint } from "../map/map-utils";

interface InspectorPointListProps {
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
  insight,
  activePointId = null,
  onPointSelect,
}: InspectorPointListProps) {
  const points = insight?.mapPoints ?? [];

  return (
    <section className="workspace-panel px-4 py-4">
      <div className="relative z-[1] space-y-3">
        <div>
          <p className="workspace-kicker">ROUTE TIMELINE</p>
          <h3 className="mt-1 text-base font-semibold">路线顺序</h3>
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

                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{point.name}</p>
                        <span
                          className={
                            point.resolved
                              ? "workspace-chip"
                              : "workspace-chip workspace-chip-warm"
                          }
                        >
                          {point.resolved ? "已定位" : "待确认"}
                        </span>
                        {activePointId === point.id ? (
                          <span className="workspace-chip workspace-chip-accent">
                            当前查看
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-1 text-xs text-[var(--ink-muted)]">
                        {SLOT_LABELS[point.slot]} · {point.provider ?? "位置来源待确认"}
                      </p>

                      {point.address ? (
                        <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                          {point.address}
                        </p>
                      ) : (
                        <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                          地址还没有完全确认，先把它当作这一天的路线笔记保留下来。
                        </p>
                      )}

                      {!isResolvedMapPoint(point) ? (
                        <p className="mt-2 text-xs leading-5 text-[var(--clay-deep)]">
                          这个地点还没确认，所以会先留在路线列表里，不会直接压到地图上。
                        </p>
                      ) : null}

                      {point.warning ? (
                        <p className="mt-2 rounded-[16px] border border-dashed border-[var(--clay)] bg-[var(--clay-soft)] px-2.5 py-2 text-xs leading-5 text-[var(--clay-deep)]">
                          {point.warning}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm leading-6 text-[var(--ink-muted)]">
            这一天暂时还没有完整的地点顺序，但你仍然可以先阅读左侧时间线。
          </p>
        )}
      </div>
    </section>
  );
}
