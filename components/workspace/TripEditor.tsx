import type { DayRouteInsight } from "@/lib/trip/route-insight";
import type { ReactNode } from "react";
import type {
  DayCabinetView,
  ItineraryBlockUpdate,
  ItineraryBlockView,
} from "@/lib/trip/itinerary-view";
import type {
  PendingChangeAction,
} from "@/lib/trip/modification-intents";
import type { DailyTimeSlot } from "@/lib/trip/types";
import type { WorkspaceCreateEventInput } from "@/lib/trip/workspace-events";

import { WorkspaceDayPanel } from "./WorkspaceDayPanel";
import { WorkspaceDayTabs } from "./WorkspaceDayTabs";
import { WorkspaceMain } from "./WorkspaceMain";

interface TripEditorProps {
  cabinets: DayCabinetView[];
  activeCabinet?: DayCabinetView;
  activeDayNumber: number;
  insight?: DayRouteInsight;
  showActions?: boolean;
  compactBlankReadMode?: boolean;
  compactEmptyEditMode?: boolean;
  activeBlockId?: string | null;
  searchCity?: string;
  editEmptyToolbar?: ReactNode;
  onRequestEdit?: () => void;
  onAddDay?: () => void;
  onAddPlace?: (slotId: string, input?: WorkspaceCreateEventInput) => void;
  onAddNote?: (note: string) => void;
  onOpenAiAssist?: () => void;
  onSelectDay: (dayNumber: number) => void;
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

export function TripEditor({
  cabinets,
  activeCabinet,
  activeDayNumber,
  insight,
  showActions = false,
  compactBlankReadMode = false,
  compactEmptyEditMode = false,
  activeBlockId = null,
  searchCity,
  editEmptyToolbar,
  onRequestEdit,
  onAddDay,
  onAddPlace,
  onAddNote,
  onOpenAiAssist,
  onSelectDay,
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
}: TripEditorProps) {
  const compactEditorMode = compactBlankReadMode || compactEmptyEditMode;

  return (
    <WorkspaceMain compact={compactEditorMode}>
      <section
        id="workspace-editor"
        className={`${
          compactEmptyEditMode
            ? "workbench-cabinet-panel workbench-cabinet-panel--compact flex h-full min-h-0 flex-col overflow-hidden p-0"
            : `workbench-cabinet-panel cabinet-wood-surface ${
                compactBlankReadMode
                  ? "flex h-full min-h-0 flex-col overflow-hidden px-3 py-3 sm:px-4 sm:py-3"
                  : "px-4 py-4 sm:px-5 sm:py-5"
              }`
        }`}
      >
        <div
          className={`relative z-[1] ${
            compactEditorMode
              ? "flex h-full min-h-0 flex-col overflow-hidden"
              : ""
          }`}
        >
          <WorkspaceDayTabs
            cabinets={cabinets}
            activeDayNumber={activeDayNumber}
            compactBlankReadMode={compactBlankReadMode}
            compactEmptyEditMode={compactEmptyEditMode}
            showEditActions={showActions}
            onAddDay={onAddDay}
            onSelect={onSelectDay}
          />

          <WorkspaceDayPanel
            cabinet={activeCabinet}
            allCabinets={cabinets}
            insight={insight}
            showActions={showActions}
            compactBlankReadMode={compactBlankReadMode}
            compactEmptyEditMode={compactEmptyEditMode}
            activeBlockId={activeBlockId}
            searchCity={searchCity}
            editEmptyToolbar={editEmptyToolbar}
            onRequestEdit={onRequestEdit}
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
            onTimeSlotsChange={onTimeSlotsChange}
            onBlockAction={onBlockAction}
          />
        </div>
      </section>
    </WorkspaceMain>
  );
}
