import type { DayRouteInsight } from "@/lib/trip/route-insight";

interface InspectorPointListProps {
  insight?: DayRouteInsight;
}

const SLOT_LABELS = {
  morning: "上午",
  afternoon: "下午",
  evening: "晚上",
} as const;

export function InspectorPointList({ insight }: InspectorPointListProps) {
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
              <li key={point.id} className="workspace-panel-soft px-3 py-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--paper-bright)] text-xs font-semibold text-[var(--clay-deep)]">
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

                    {point.warning ? (
                      <p className="mt-2 rounded-[16px] border border-dashed border-[var(--clay)] bg-[var(--clay-soft)] px-2.5 py-2 text-xs leading-5 text-[var(--clay-deep)]">
                        {point.warning}
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm leading-6 text-[var(--ink-muted)]">
            这一天暂时没有可确认点位。
          </p>
        )}
      </div>
    </section>
  );
}
