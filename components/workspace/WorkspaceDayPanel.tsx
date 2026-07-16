import { DayCabinet } from "../trip/DayCabinet";
import type { DayRouteInsight } from "../../lib/trip/route-insight";
import type { DayCabinetView, ItineraryBlockView } from "../../lib/trip/itinerary-view";
import type { PendingChangeAction } from "../../lib/trip/modification-intents";
import type { DailyTimeSlot } from "../../lib/trip/types";

interface WorkspaceDayPanelProps {
  cabinet?: DayCabinetView;
  allCabinets: DayCabinetView[];
  insight?: DayRouteInsight;
  showActions?: boolean;
  compactBlankReadMode?: boolean;
  activeBlockId?: string | null;
  onRequestEdit?: () => void;
  onAddPlace?: (slotId: string) => void;
  onAddNote?: (note: string) => void;
  onAddDay?: () => void;
  onOpenAiAssist?: () => void;
  onBlockSelect?: (block: ItineraryBlockView) => void;
  onBlockUpdate?: (
    block: ItineraryBlockView,
    updates: { placeName: string; reason: string },
  ) => void;
  onBlockDelete?: (block: ItineraryBlockView) => void;
  onBlockMove?: (
    block: ItineraryBlockView,
    targetDayNumber: number,
    targetSlotId: string,
  ) => void;
  onTimeSlotAdd?: (dayNumber: number, afterSlotId: string) => void;
  onTimeSlotUpdate?: (
    dayNumber: number,
    slotId: string,
    updates: Pick<DailyTimeSlot, "label" | "startTime" | "endTime">,
  ) => void;
  onTimeSlotDelete?: (dayNumber: number, slotId: string) => void;
  onBlockAction?: (
    actionType: PendingChangeAction,
    block: ItineraryBlockView,
  ) => void;
}

export function WorkspaceDayPanel({
  cabinet,
  allCabinets,
  insight,
  showActions = false,
  compactBlankReadMode = false,
  activeBlockId,
  onRequestEdit,
  onAddPlace,
  onAddNote,
  onAddDay,
  onOpenAiAssist,
  onBlockSelect,
  onBlockUpdate,
  onBlockDelete,
  onBlockMove,
  onTimeSlotAdd,
  onTimeSlotUpdate,
  onTimeSlotDelete,
  onBlockAction,
}: WorkspaceDayPanelProps) {
  if (!cabinet) {
    return null;
  }

  const isEmptyDay = cabinet.itemCount === 0;

  return (
    <section
      id={`workspace-day-panel-${cabinet.dayNumber}`}
      className={compactBlankReadMode ? "space-y-3" : "space-y-4"}
    >
      <div className={`px-1 ${compactBlankReadMode ? "pt-0.5" : "pt-1"}`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-2xl">
            <p className="workspace-kicker">当天档案</p>
            <h2 className="mt-1.5 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
              {`第 ${cabinet.dayNumber} 天`}
            </h2>
            {!isEmptyDay && cabinet.theme ? (
              <p className="mt-2 text-base leading-7 text-[var(--ink)]">
                {cabinet.theme}
              </p>
            ) : null}
            <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
              {isEmptyDay
                ? "这一天还没有地点，先放进第一个想去的地方。"
                : cabinet.routeReason || "把今天想去的地方顺着路线记在这一页。"}
            </p>
          </div>

          {!isEmptyDay ? (
            <div className="journal-chip">
              {insight?.mapPoints.length ?? cabinet.itemCount} 个地点
            </div>
          ) : null}
        </div>
      </div>

      <DayCabinet
        cabinet={cabinet}
        allCabinets={allCabinets}
        mapPoints={insight?.mapPoints}
        showActions={showActions}
        compactBlankReadMode={compactBlankReadMode}
        activeBlockId={activeBlockId}
        onRequestEdit={onRequestEdit}
        onAddPlace={onAddPlace}
        onAddNote={onAddNote}
        onAddDay={onAddDay}
        onOpenAiAssist={onOpenAiAssist}
        onBlockSelect={onBlockSelect}
        onBlockUpdate={onBlockUpdate}
        onBlockDelete={onBlockDelete}
        onBlockMove={onBlockMove}
        onTimeSlotAdd={onTimeSlotAdd}
        onTimeSlotUpdate={onTimeSlotUpdate}
        onTimeSlotDelete={onTimeSlotDelete}
        onBlockAction={onBlockAction}
      />
    </section>
  );
}
