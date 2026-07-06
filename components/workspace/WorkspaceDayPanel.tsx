import { DayCabinet } from "@/components/trip/DayCabinet";
import type { DayCabinetView } from "@/lib/trip/itinerary-view";
import type { BlockActionType } from "@/lib/trip/modification-intents";

interface WorkspaceDayPanelProps {
  cabinet?: DayCabinetView;
  onBlockAction?: (
    actionType: BlockActionType,
    block: DayCabinetView["slots"][number]["items"][number],
  ) => void;
}

export function WorkspaceDayPanel({
  cabinet,
  onBlockAction,
}: WorkspaceDayPanelProps) {
  if (!cabinet) {
    return null;
  }

  return (
    <section id={`workspace-day-panel-${cabinet.dayNumber}`} className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-2xl">
          <p className="workspace-kicker">CURRENT DAY</p>
          <h2 className="mt-1.5 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
            Day {cabinet.dayNumber} 工作区
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
            这轮先只盯当前这一天。积木修改、待修改清单和右侧路线提醒都会围着它转。
          </p>
        </div>

        <div className="workspace-chip workspace-chip-accent">
          当前共 {cabinet.itemCount} 项安排
        </div>
      </div>

      <DayCabinet cabinet={cabinet} onBlockAction={onBlockAction} />
    </section>
  );
}
