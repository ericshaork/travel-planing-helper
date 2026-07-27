import type { ReactNode } from "react";

import { DayCabinet } from "../trip/DayCabinet";
import type {
  DayCabinetView,
  ItineraryBlockUpdate,
  ItineraryBlockView,
} from "../../lib/trip/itinerary-view";
import type { PendingChangeAction } from "../../lib/trip/modification-intents";
import type { DayRouteInsight } from "../../lib/trip/route-insight";
import type { DailyTimeSlot } from "../../lib/trip/types";
import type { WorkspaceCreateEventInput } from "../../lib/trip/workspace-events";

interface WorkspaceDayPanelProps {
  cabinet?: DayCabinetView;
  allCabinets?: DayCabinetView[];
  insight?: DayRouteInsight;
  showActions?: boolean;
  compactBlankReadMode?: boolean;
  compactEmptyEditMode?: boolean;
  activeBlockId?: string | null;
  searchCity?: string;
  onRequestEdit?: () => void;
  editEmptyToolbar?: ReactNode;
  onAddPlace?: (slotId: string, input?: WorkspaceCreateEventInput) => void;
  onAddNote?: (note: string) => void;
  onAddDay?: () => void;
  onOpenAiAssist?: () => void;
  onBlockSelect?: (block: ItineraryBlockView) => void;
  onBlockUpdate?: (
    block: ItineraryBlockView,
    updates: ItineraryBlockUpdate,
  ) => void;
  onBlockDelete?: (block: ItineraryBlockView) => void;
  onBlockSelectionClear?: () => void;
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
  onTimeSlotsChange?: (dayNumber: number, timeSlots: DailyTimeSlot[]) => void;
  onBlockAction?: (
    actionType: PendingChangeAction,
    block: ItineraryBlockView,
  ) => void;
}

export function WorkspaceDayPanel({
  cabinet,
  allCabinets = [],
  insight,
  showActions = false,
  compactBlankReadMode = false,
  compactEmptyEditMode = false,
  activeBlockId,
  searchCity,
  onRequestEdit,
  editEmptyToolbar,
  onAddPlace,
  onAddNote,
  onAddDay,
  onOpenAiAssist,
  onBlockSelect,
  onBlockUpdate,
  onBlockDelete,
  onBlockSelectionClear,
  onBlockMove,
  onTimeSlotAdd,
  onTimeSlotUpdate,
  onTimeSlotDelete,
  onTimeSlotsChange,
  onBlockAction,
}: WorkspaceDayPanelProps) {
  if (!cabinet) {
    return null;
  }

  const isEmptyDay = cabinet.itemCount === 0;

  return (
    <section
      id={`workspace-day-panel-${cabinet.dayNumber}`}
      className={
        compactBlankReadMode || compactEmptyEditMode
          ? "flex min-h-0 flex-1 flex-col gap-1 overflow-hidden"
          : "space-y-4"
      }
    >
      {!compactEmptyEditMode ? (
        <div
          className={`px-1 ${compactBlankReadMode ? "flex-none pt-0" : "pt-1"}`}
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="max-w-2xl">
              <p className="workspace-kicker">当天档案</p>
              <h2
                className={
                  compactBlankReadMode
                    ? "mt-1 text-xl font-semibold tracking-[-0.02em] sm:text-2xl"
                    : "mt-1.5 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl"
                }
              >
                {`第 ${cabinet.dayNumber} 天`}
              </h2>
              {!isEmptyDay && cabinet.theme ? (
                <p className="mt-2 text-base leading-7 text-[var(--ink)]">
                  {cabinet.theme}
                </p>
              ) : null}
              {!compactBlankReadMode ? (
                <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                  {isEmptyDay
                    ? "这一页还在等待第一站。"
                    : cabinet.routeReason || "把今天想去的地方顺着路线记在这一页。"}
                </p>
              ) : null}
            </div>

            {!isEmptyDay ? (
              <div className="journal-chip">
                {insight?.mapPoints.length ?? cabinet.itemCount} 个地点
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <DayCabinet
        cabinet={cabinet}
        allCabinets={allCabinets}
        mapPoints={insight?.mapPoints}
        showActions={showActions}
        compactBlankReadMode={compactBlankReadMode}
        compactEmptyEditMode={compactEmptyEditMode}
        activeBlockId={activeBlockId}
        searchCity={searchCity}
        onRequestEdit={onRequestEdit}
        editEmptyToolbar={editEmptyToolbar}
        onAddPlace={onAddPlace}
        onAddNote={onAddNote}
        onAddDay={onAddDay}
        onOpenAiAssist={onOpenAiAssist}
        onBlockSelect={onBlockSelect}
        onBlockUpdate={onBlockUpdate}
        onBlockDelete={onBlockDelete}
        onBlockSelectionClear={onBlockSelectionClear}
        onBlockMove={onBlockMove}
        onTimeSlotAdd={onTimeSlotAdd}
        onTimeSlotUpdate={onTimeSlotUpdate}
        onTimeSlotDelete={onTimeSlotDelete}
        onBlockAction={onBlockAction}
        onTimeSlotsChange={onTimeSlotsChange}
      />
    </section>
  );
}
