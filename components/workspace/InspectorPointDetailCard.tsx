import Image from "next/image";

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
      <section className="workspace-panel relative overflow-hidden px-4 py-4">
        <div className="pointer-events-none absolute right-4 top-3 h-10 w-16 opacity-65">
          <Image
            src="/images/archive/decoration/archive-label-note.png"
            alt=""
            fill
            aria-hidden
            sizes="64px"
            className="object-contain"
          />
        </div>
        <div className="relative z-[1]">
          <p className="workspace-kicker">CURRENT PLACE</p>
          <h3 className="mt-1 text-base font-semibold">{unmatchedPlaceName}</h3>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
            这个地点暂时没有匹配到地图点，但它仍然保留在今天的阅读线路里。
          </p>
          <p className="mt-3 rounded-[18px] border border-dashed border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-sm leading-6 text-[var(--ink-muted)]">
            后续如果补充了更准确的名称或地址，这里就能继续联动到地图高亮。
          </p>
        </div>
      </section>
    );
  }

  if (!activePoint) {
    return (
      <section className="workspace-panel px-4 py-4">
        <div className="relative z-[1]">
          <p className="workspace-kicker">CURRENT PLACE</p>
          <h3 className="mt-1 text-base font-semibold">地点卡片</h3>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
            点一下地图点位，或者右侧列表里的地点，这里就会显示当前地点的细节。
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="workspace-panel px-4 py-4">
      <div className="relative z-[1]">
        <p className="workspace-kicker">CURRENT PLACE</p>
        <div className="mt-1 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">{activePoint.name}</h3>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">
              {SLOT_LABELS[activePoint.slot]} · {activePoint.provider ?? "位置来源待确认"}
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
          {activePoint.address ||
            "地址还没有完全确认，可以先把它当作路线阅读中的地点笔记。"}
        </p>

        <p className="mt-3 rounded-[18px] border border-dashed border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-sm leading-6 text-[var(--ink-muted)]">
          {activePoint.resolved
            ? "这个地点已经在地图里定位好了，路线图与地点顺序会一起高亮。"
            : "该地点暂未确认，无法在地图中定位，出发前建议再核对一下名称和地址。"}
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
