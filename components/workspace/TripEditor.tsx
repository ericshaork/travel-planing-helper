import type { DayRouteInsight } from "@/lib/trip/route-insight";
import type {
  DayCabinetView,
  ItineraryBlockView,
} from "@/lib/trip/itinerary-view";
import type {
  PendingChangeAction,
} from "@/lib/trip/modification-intents";
import type { DailyTimeSlot } from "@/lib/trip/types";

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
  activeBlockId?: string | null;
  onRequestEdit?: () => void;
  onAddDay?: () => void;
  onAddPlace?: (slotId: string) => void;
  onAddNote?: (note: string) => void;
  onOpenAiAssist?: () => void;
  onSelectDay: (dayNumber: number) => void;
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

export function TripEditor({
  cabinets,
  activeCabinet,
  activeDayNumber,
  insight,
  showActions = false,
  compactBlankReadMode = false,
  activeBlockId = null,
  onRequestEdit,
  onAddDay,
  onAddPlace,
  onAddNote,
  onOpenAiAssist,
  onSelectDay,
  onBlockSelect,
  onBlockUpdate,
  onBlockDelete,
  onBlockMove,
  onTimeSlotAdd,
  onTimeSlotUpdate,
  onTimeSlotDelete,
  onBlockAction,
}: TripEditorProps) {
  return (
    <WorkspaceMain compact={compactBlankReadMode}>
      <section
        id="workspace-editor"
        className={`journal-sheet ${
          compactBlankReadMode ? "px-4 py-4 sm:px-5 sm:py-5" : "px-5 py-5 sm:px-6 sm:py-6"
        }`}
      >
        <div className="relative z-[1]">
          <WorkspaceDayTabs
            cabinets={cabinets}
            activeDayNumber={activeDayNumber}
            compactBlankReadMode={compactBlankReadMode}
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
        </div>
      </section>
    </WorkspaceMain>
  );
}
