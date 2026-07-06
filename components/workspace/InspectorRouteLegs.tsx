import type { DayRouteInsight } from "@/lib/trip/route-insight";
import {
  formatRouteDistance,
  formatRouteDuration,
  isFallbackLeg,
} from "@/lib/trip/workspace-inspector";

interface InspectorRouteLegsProps {
  insight?: DayRouteInsight;
}

const MODE_LABELS = {
  driving: "驾车",
  walking: "步行",
  transit: "公共交通",
  other: "混合方式",
} as const;

export function InspectorRouteLegs({ insight }: InspectorRouteLegsProps) {
  const legs = insight?.routeSummary?.legs ?? [];

  return (
    <section className="workspace-panel px-4 py-4">
      <div className="relative z-[1] space-y-3">
        <div>
          <p className="workspace-kicker">ROUTE LEGS</p>
          <h3 className="mt-1 text-base font-semibold">段落通勤</h3>
        </div>

        {legs.length > 0 ? (
          <ol className="space-y-2.5">
            {legs.map((leg, index) => (
              <li
                key={`${leg.fromName ?? "from"}-${leg.toName ?? "to"}-${index}`}
                className="workspace-panel-soft px-3 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">
                    {leg.fromName ?? "上一站"} → {leg.toName ?? "下一站"}
                  </p>
                  <span className="text-xs font-semibold text-[var(--ink-muted)]">
                    {MODE_LABELS[leg.mode]}
                  </span>
                </div>

                <p className="mt-1 text-xs text-[var(--ink-muted)]">
                  {formatRouteDistance(leg.distanceMeters)} ·{" "}
                  {formatRouteDuration(leg.durationMinutes)}
                </p>

                {leg.summary ? (
                  <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                    {leg.summary}
                  </p>
                ) : null}

                {isFallbackLeg(leg) ? (
                  <p className="mt-2 rounded-[16px] border border-dashed border-[var(--line)] bg-[var(--paper-bright)] px-2.5 py-2 text-xs leading-5 text-[var(--ink-muted)]">
                    这一段仍是估算路线，真实地图接入前先按保守时间理解。
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm leading-6 text-[var(--ink-muted)]">
            这一天还没有足够的相邻点位来生成 route legs。
          </p>
        )}
      </div>
    </section>
  );
}
