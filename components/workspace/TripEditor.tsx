import type { DayRouteInsight } from "@/lib/trip/route-insight";
import type { DayCabinetView } from "@/lib/trip/itinerary-view";
import type { BlockActionType } from "@/lib/trip/modification-intents";

import { WorkspaceDayPanel } from "./WorkspaceDayPanel";
import { WorkspaceDayTabs } from "./WorkspaceDayTabs";
import { WorkspaceMain } from "./WorkspaceMain";

interface TripEditorProps {
  cabinets: DayCabinetView[];
  activeCabinet?: DayCabinetView;
  activeDayNumber: number;
  insight?: DayRouteInsight;
  showActions?: boolean;
  activeBlockId?: string | null;
  onSelectDay: (dayNumber: number) => void;
  onBlockSelect?: (
    block: DayCabinetView["slots"][number]["items"][number],
  ) => void;
  onBlockAction?: (
    actionType: BlockActionType,
    block: DayCabinetView["slots"][number]["items"][number],
  ) => void;
}

export function TripEditor({
  cabinets,
  activeCabinet,
  activeDayNumber,
  insight,
  showActions = false,
  activeBlockId = null,
  onSelectDay,
  onBlockSelect,
  onBlockAction,
}: TripEditorProps) {
  return (
    <WorkspaceMain>
      <WorkspaceDayTabs
        cabinets={cabinets}
        activeDayNumber={activeDayNumber}
        onSelect={onSelectDay}
      />

      <WorkspaceDayPanel
        cabinet={activeCabinet}
        insight={insight}
        showActions={showActions}
        activeBlockId={activeBlockId}
        onBlockSelect={onBlockSelect}
        onBlockAction={onBlockAction}
      />
    </WorkspaceMain>
  );
}
