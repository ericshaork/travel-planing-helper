import Image from "next/image";

import { DayCabinet } from "../trip/DayCabinet";
import type { DayRouteInsight } from "../../lib/trip/route-insight";
import type { DayCabinetView } from "../../lib/trip/itinerary-view";
import type { BlockActionType } from "../../lib/trip/modification-intents";

interface WorkspaceDayPanelProps {
  cabinet?: DayCabinetView;
  insight?: DayRouteInsight;
  showActions?: boolean;
  activeBlockId?: string | null;
  onBlockSelect?: (
    block: DayCabinetView["slots"][number]["items"][number],
  ) => void;
  onBlockAction?: (
    actionType: BlockActionType,
    block: DayCabinetView["slots"][number]["items"][number],
  ) => void;
}

export function WorkspaceDayPanel({
  cabinet,
  insight,
  showActions = false,
  activeBlockId,
  onBlockSelect,
  onBlockAction,
}: WorkspaceDayPanelProps) {
  if (!cabinet) {
    return null;
  }

  return (
    <section
      id={`workspace-day-panel-${cabinet.dayNumber}`}
      className="space-y-4"
    >
      <div className="workspace-panel relative overflow-hidden px-5 py-5 sm:px-6 sm:py-6">
        <div className="pointer-events-none absolute left-4 top-3 h-12 w-20 opacity-70">
          <Image
            src="/images/archive/decoration/archive-label-note.png"
            alt=""
            fill
            aria-hidden
            sizes="80px"
            className="object-contain"
          />
        </div>
        <div className="pointer-events-none absolute right-4 top-0 h-16 w-12 opacity-85">
          <Image
            src="/images/archive/bookmark/archive-bookmark-active.png"
            alt=""
            fill
            aria-hidden
            sizes="48px"
            className="object-contain object-top"
          />
        </div>
        <div className="relative z-[1] flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-2xl">
          <p className="workspace-kicker">DAY TIMELINE</p>
          <h2 className="mt-1.5 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
              {`Day ${cabinet.dayNumber}`}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
              {cabinet.theme}
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
              {cabinet.routeReason ||
                "按这一天的时间线阅读行程，地图会在右侧同步显示同一天的路线。"}
            </p>
          </div>

          <div className="workspace-chip workspace-chip-accent">
            {insight?.mapPoints.length ?? cabinet.itemCount} 个行程节点
          </div>
        </div>
      </div>

      <DayCabinet
        cabinet={cabinet}
        mapPoints={insight?.mapPoints}
        showActions={showActions}
        activeBlockId={activeBlockId}
        onBlockSelect={onBlockSelect}
        onBlockAction={onBlockAction}
      />
    </section>
  );
}
