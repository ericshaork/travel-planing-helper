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
    <section className="grid gap-3 border-t border-dashed border-[var(--line)] py-4 first:border-t-0 sm:grid-cols-[5rem_minmax(0,1fr)] sm:gap-4 sm:py-5">
      <div className="pt-0.5 sm:pt-1">
        <p className="text-[10px] font-semibold tracking-[0.14em] text-[var(--clay-deep)]">
          固定格层
        </p>
        <h3 className="mt-1 text-sm font-semibold text-[var(--ink)]">
          {slot.label}
        </h3>
        <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">
          {slot.isEmpty ? "这格先留白" : `${slot.items.length} 个积木`}
        </p>
      </div>

      <div className="cabinet-slot min-w-0 px-3 py-3 sm:px-4 sm:py-3.5">
        {slot.isEmpty ? (
          <div className="rounded-sm border border-dashed border-[var(--line)] bg-[var(--paper)] px-3 py-3 text-sm leading-6 text-[var(--ink-muted)]">
            这格先空着，适合休息、机动调整，或者把临时想去的小点塞进来。
          </div>
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
