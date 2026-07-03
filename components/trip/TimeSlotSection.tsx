import type { TimeSlotView } from "@/lib/trip/itinerary-view";
import type { BlockActionType } from "@/lib/trip/modification-intents";

import { ItineraryBlock } from "./ItineraryBlock";

interface TimeSlotSectionProps {
  slot: TimeSlotView;
  onBlockAction?: (
    actionType: BlockActionType,
    block: TimeSlotView["items"][number],
  ) => void;
}

export function TimeSlotSection({
  slot,
  onBlockAction,
}: TimeSlotSectionProps) {
  return (
    <section className="grid gap-2.5 border-t border-dashed border-[var(--line)] py-3.5 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:gap-3 sm:py-4">
      <div className="pt-0.5 sm:pt-1">
        <h3 className="text-sm font-semibold text-[var(--clay-deep)]">
          {slot.label}
        </h3>
        <p className="mt-1 text-xs text-[var(--ink-muted)]">
          {slot.isEmpty ? "这格先留白" : `${slot.items.length} 个积木`}
        </p>
      </div>

      <div className="min-w-0 rounded-sm border border-dashed border-[var(--line)] bg-[var(--paper)] px-2.5 py-2.5 sm:px-3 sm:py-3">
        {slot.isEmpty ? (
          <p className="min-w-0 break-words text-sm leading-6 text-[var(--ink-muted)]">
            这格先空着，适合休息或自由安排。
          </p>
        ) : (
          <div className="min-w-0 space-y-2.5 sm:space-y-3">
            {slot.items.map((block) => (
              <ItineraryBlock
                key={`${block.ref.slot}-${block.ref.itemIndex}-${block.ref.placeName}`}
                block={block}
                onAction={onBlockAction}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
