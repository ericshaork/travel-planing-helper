import type { DayRouteInsight } from "../../lib/trip/route-insight";

interface InspectorPointDetailCardProps {
  insight?: DayRouteInsight;
  activePointId?: string | null;
  unmatchedPlaceName?: string | null;
}

const SLOT_LABELS = {
  morning: "上午",
  afternoon: "下午",
  evening: "晚上",
} as const;

export function InspectorPointDetailCard({
  insight,
  activePointId = null,
  unmatchedPlaceName = null,
}: InspectorPointDetailCardProps) {
  const activePoint =
    activePointId === null
      ? undefined
      : insight?.mapPoints.find((point) => point.id === activePointId);

  if (!activePoint && unmatchedPlaceName) {
    return (
      <section className="workspace-panel px-4 py-4">
        <div className="relative z-[1]">
          <p className="workspace-kicker">POINT DETAIL</p>
          <h3 className="mt-1 text-base font-semibold">{unmatchedPlaceName}</h3>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
            这个地点暂时没有匹配到地图点，行程本身还能正常看，出发前再核对一下名称会更稳。
          </p>
          <p className="mt-3 rounded-[18px] border border-dashed border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-sm leading-6 text-[var(--ink-muted)]">
            这轮不会自动创建假 marker，也不会把它写回地图位置。后面如果要更细的手动选点，会放到后续版本再做。
          </p>
        </div>
      </section>
    );
  }

  if (!activePoint) {
    return (
      <section className="workspace-panel px-4 py-4">
        <div className="relative z-[1]">
          <p className="workspace-kicker">POINT DETAIL</p>
          <h3 className="mt-1 text-base font-semibold">点位详情</h3>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
            点一下地图点位，或者右侧列表里的地点，这里就会显示更具体的信息。
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="workspace-panel px-4 py-4">
      <div className="relative z-[1]">
        <p className="workspace-kicker">POINT DETAIL</p>
        <div className="mt-1 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">{activePoint.name}</h3>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">
              {SLOT_LABELS[activePoint.slot]} · {activePoint.provider ?? "待确认来源"}
            </p>
          </div>
          <span
            className={
              activePoint.resolved
                ? "workspace-chip workspace-chip-accent"
                : "workspace-chip workspace-chip-warm"
            }
          >
            {activePoint.resolved ? "已定位" : "待确认"}
          </span>
        </div>

        <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
          {activePoint.address || "暂时还没有明确地址，出发前再核对一下会更稳。"}
        </p>

        <p className="mt-3 rounded-[18px] border border-dashed border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-sm leading-6 text-[var(--ink-muted)]">
          {activePoint.resolved
            ? "这个地点已经在地图里定位好了，可以直接结合右侧路线信息一起看。"
            : "该地点暂未确认，无法在地图中定位。出发前请再核对名称和地址。"}
        </p>

        {activePoint.warning ? (
          <p className="mt-3 rounded-[18px] border border-dashed border-[var(--clay)] bg-[var(--clay-soft)] px-3 py-2.5 text-sm leading-6 text-[var(--clay-deep)]">
            {activePoint.warning}
          </p>
        ) : null}
      </div>
    </section>
  );
}
