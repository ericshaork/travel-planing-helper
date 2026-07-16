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
          <p className="workspace-kicker">分段路线</p>
          <h3 className="mt-1 text-base font-semibold">分段路线</h3>
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
                    {String(index + 1).padStart(2, "0")} {leg.fromName ?? "上一站"} 到{" "}
                    {leg.toName ?? "下一站"}
                  </p>
                  <span className="text-xs font-semibold text-[var(--ink-muted)]">
                    {MODE_LABELS[leg.mode]}
                  </span>
                </div>

                <p className="mt-1 text-xs text-[var(--ink-muted)]">
                  {formatRouteDistance(leg.distanceMeters)} /{" "}
                  {formatRouteDuration(leg.durationMinutes)}
                </p>

                {leg.summary ? (
                  <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                    {leg.summary}
                  </p>
                ) : null}

                {isFallbackLeg(leg) ? (
                  <p className="mt-2 rounded-[16px] border border-dashed border-[var(--line)] bg-[var(--paper-bright)] px-2.5 py-2 text-xs leading-5 text-[var(--ink-muted)]">
                    这一段还是保守估算，先把它当作路线草稿来看，后续可以再补精确距离和时间。
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm leading-6 text-[var(--ink-muted)]">
            还没有足够明确的相邻地点，所以这一天的分段路线暂时留空。
          </p>
        )}
      </div>
    </section>
  );
}
