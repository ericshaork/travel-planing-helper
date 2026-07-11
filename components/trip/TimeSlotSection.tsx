import type { TimeSlotView } from "../../lib/trip/itinerary-view";
import {
  getItineraryBlockId,
  getItineraryBlockMapStatus,
} from "../../lib/trip/map-point-match";
import type { BlockActionType } from "../../lib/trip/modification-intents";
import type { MapPoint } from "../../lib/trip/enrichment-types";

import { ItineraryBlock } from "./ItineraryBlock";

interface TimeSlotSectionProps {
  slot: TimeSlotView;
  mapPoints?: MapPoint[];
  showActions?: boolean;
  activeBlockId?: string | null;
  onBlockSelect?: (block: TimeSlotView["items"][number]) => void;
  onBlockAction?: (
    actionType: BlockActionType,
    block: TimeSlotView["items"][number],
  ) => void;
}

export function TimeSlotSection({
  slot,
  mapPoints = [],
  showActions = false,
  activeBlockId = null,
  onBlockSelect,
  onBlockAction,
}: TimeSlotSectionProps) {
  return (
    <section className="grid gap-3 border-t border-dashed border-[var(--line)] py-4 first:border-t-0 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-4 sm:py-5">
      <div className="pt-0.5 sm:pt-1">
        <p className="text-[10px] font-semibold tracking-[0.14em] text-[var(--clay-deep)]">
          TIME SLOT
        </p>
        <h3 className="mt-1 text-sm font-semibold text-[var(--ink)]">
          {slot.label}
        </h3>
        <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">
          {slot.isEmpty ? "这段时间先留白" : `${slot.items.length} 个安排`}
        </p>
      </div>

      <div className="cabinet-slot min-w-0 px-3 py-3 sm:px-4 sm:py-3.5">
        {slot.isEmpty ? (
          <div className="rounded-[20px] border border-dashed border-[var(--line)] bg-[var(--paper)] px-3 py-3 text-sm leading-6 text-[var(--ink-muted)]">
            这一段时间先留给休息、随走随停，或者临时想加进去的小安排。
          </div>
        ) : (
          <div className="min-w-0 space-y-2.5 sm:space-y-3">
            {slot.items.map((block) => (
              <ItineraryBlock
                key={getItineraryBlockId(block)}
                block={block}
                showActions={showActions}
                isSelected={activeBlockId === getItineraryBlockId(block)}
                mapStatus={getItineraryBlockMapStatus(block, mapPoints)}
                onSelect={onBlockSelect ? () => onBlockSelect(block) : undefined}
                onAction={onBlockAction}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
