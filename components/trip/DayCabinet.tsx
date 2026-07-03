import type { DailyItinerary } from "@/lib/trip/types";
import {
  mapDailyItineraryToCabinet,
  type DayCabinetView,
} from "@/lib/trip/itinerary-view";
import type { BlockActionType } from "@/lib/trip/modification-intents";

import { TimeSlotSection } from "./TimeSlotSection";

interface DayCabinetProps {
  itinerary?: DailyItinerary;
  cabinet?: DayCabinetView;
  onBlockAction?: (
    actionType: BlockActionType,
    block: DayCabinetView["slots"][number]["items"][number],
  ) => void;
}

export function DayCabinet({
  itinerary,
  cabinet,
  onBlockAction,
}: DayCabinetProps) {
  const resolvedCabinet =
    cabinet ?? (itinerary ? mapDailyItineraryToCabinet(itinerary) : null);

  if (!resolvedCabinet) {
    return null;
  }

  return (
    <article className="overflow-hidden border border-[var(--line-strong)] bg-[var(--paper-bright)] shadow-[4px_5px_0_var(--sand-soft)] sm:shadow-[6px_7px_0_var(--sand-soft)]">
      <header className="grid gap-3 bg-[var(--sand-soft)] p-3.5 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:p-5">
        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center border border-[var(--ink)] bg-[var(--paper-bright)] font-mono sm:h-14 sm:w-14">
          <span className="text-[10px] font-semibold tracking-[0.12em]">
            DAY
          </span>
          <span className="text-lg font-bold sm:text-xl">
            {resolvedCabinet.dayNumber}
          </span>
        </div>

        <div className="min-w-0">
          {resolvedCabinet.date ? (
            <p className="break-words font-mono text-[11px] text-[var(--ink-muted)] sm:text-xs">
              {resolvedCabinet.date}
            </p>
          ) : null}
          <h2 className="mt-1 break-words text-lg font-semibold sm:text-2xl">
            {resolvedCabinet.theme}
          </h2>
          <p className="mt-1.5 break-words text-sm font-semibold leading-6">
            {resolvedCabinet.routeSummary}
          </p>
          <p className="mt-1 break-words text-sm leading-6 text-[var(--ink-muted)]">
            {resolvedCabinet.routeReason}
          </p>
        </div>
      </header>

      <div className="bg-[var(--paper)] px-3.5 py-1 sm:px-5">
        {resolvedCabinet.slots.map((slot) => (
          <TimeSlotSection
            key={slot.key}
            slot={slot}
            onBlockAction={onBlockAction}
          />
        ))}
      </div>

      {resolvedCabinet.dailyTips.length > 0 ? (
        <footer className="border-t border-dashed border-[var(--line)] bg-[var(--sage-soft)] px-3.5 py-3 sm:px-5">
          <p className="text-xs font-semibold text-[var(--sage-deep)]">
            这天记一笔
          </p>
          <ul className="mt-2 space-y-1 text-sm leading-6 text-[var(--sage-deep)]">
            {resolvedCabinet.dailyTips.map((tip) => (
              <li key={tip} className="break-words">
                - {tip}
              </li>
            ))}
          </ul>
        </footer>
      ) : null}
    </article>
  );
}
