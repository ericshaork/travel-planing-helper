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
          <p className="workspace-kicker">POINT LIST</p>
          <h3 className="mt-1 text-base font-semibold">当天点位</h3>
        </div>

        {points.length > 0 ? (
          <ol className="space-y-2.5">
            {points.map((point, index) => (
              <li key={point.id}>
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
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                        activePointId === point.id
                          ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper-bright)]"
                          : "border-[var(--line)] bg-[var(--paper-bright)] text-[var(--clay-deep)]"
                      }`}
                    >
                      {index + 1}
                    </span>

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
                          {point.resolved ? "已确认" : "待确认"}
                        </span>
                        {activePointId === point.id ? (
                          <span className="workspace-chip workspace-chip-accent">
                            当前查看
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-1 text-xs text-[var(--ink-muted)]">
                        {SLOT_LABELS[point.slot]} · {point.provider ?? "待确认来源"}
                      </p>

                      {point.address ? (
                        <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                          {point.address}
                        </p>
                      ) : (
                        <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                          暂时没有明确地址，出发前再确认一下。
                        </p>
                      )}

                      {!isResolvedMapPoint(point) ? (
                        <p className="mt-2 text-xs leading-5 text-[var(--clay-deep)]">
                          这个地点还没确认，点开后会先看详情提示，不会在地图上高亮。
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
            这一天暂时没有可确认点位，但路线统计、提示和行程本身还可以继续看。
          </p>
        )}
      </div>
    </section>
  );
}
