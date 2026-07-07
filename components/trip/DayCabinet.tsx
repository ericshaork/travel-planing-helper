import type { DailyItinerary } from "../../lib/trip/types";
import type { MapPoint } from "../../lib/trip/enrichment-types";
import {
  mapDailyItineraryToCabinet,
  type DayCabinetView,
} from "../../lib/trip/itinerary-view";
import type { BlockActionType } from "../../lib/trip/modification-intents";

import { TimeSlotSection } from "./TimeSlotSection";

interface DayCabinetProps {
  itinerary?: DailyItinerary;
  cabinet?: DayCabinetView;
  mapPoints?: MapPoint[];
  activeBlockId?: string | null;
  onBlockSelect?: (
    block: DayCabinetView["slots"][number]["items"][number],
  ) => void;
  onBlockAction?: (
    actionType: BlockActionType,
    block: DayCabinetView["slots"][number]["items"][number],
  ) => void;
}

export function DayCabinet({
  itinerary,
  cabinet,
  mapPoints = [],
  activeBlockId = null,
  onBlockSelect,
  onBlockAction,
}: DayCabinetProps) {
  const resolvedCabinet =
    cabinet ?? (itinerary ? mapDailyItineraryToCabinet(itinerary) : null);

  if (!resolvedCabinet) {
    return null;
  }

  return (
    <article className="cabinet-shell">
      <header className="relative grid gap-3 border-b border-[var(--line)] bg-[var(--sand-soft)] px-3.5 pb-3.5 pt-6 sm:grid-cols-[4.75rem_minmax(0,1fr)] sm:gap-4 sm:px-5 sm:pb-5 sm:pt-7">
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center border border-[var(--ink)] bg-[var(--paper-bright)] font-mono shadow-[3px_3px_0_var(--sand)] sm:h-16 sm:w-16">
          <span className="text-[10px] font-semibold tracking-[0.12em]">
            DAY
          </span>
          <span className="text-lg font-bold sm:text-xl">
            {resolvedCabinet.dayNumber}
          </span>
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-[var(--clay-deep)] sm:text-[11px]">
            单日柜面
          </p>
          {resolvedCabinet.date ? (
            <p className="mt-1 break-words font-mono text-[11px] text-[var(--ink-muted)] sm:text-xs">
              {resolvedCabinet.date}
            </p>
          ) : null}
          <h2 className="mt-1.5 break-words text-lg font-semibold sm:text-2xl">
            {resolvedCabinet.theme}
          </h2>
          <p className="mt-2 break-words text-sm font-semibold leading-6 text-[var(--ink)]">
            {resolvedCabinet.routeSummary}
          </p>
          <p className="mt-1.5 break-words text-sm leading-6 text-[var(--ink-muted)]">
            {resolvedCabinet.routeReason}
          </p>
        </div>
      </header>

      <div className="border-b border-dashed border-[var(--line)] bg-[var(--paper)] px-3.5 py-2.5 sm:px-5 sm:py-3">
        <div className="flex flex-wrap gap-2 text-[11px] sm:text-xs">
          <span className="border border-[var(--line)] bg-[var(--paper-bright)] px-2.5 py-1 font-semibold text-[var(--ink)]">
            3 层固定格
          </span>
          <span className="border border-[var(--line)] bg-[var(--sand-soft)] px-2.5 py-1 font-semibold text-[var(--ink)]">
            {resolvedCabinet.itemCount} 个积木
          </span>
          {resolvedCabinet.dailyTips.length > 0 ? (
            <span className="border border-[var(--sage-deep)] bg-[var(--sage-soft)] px-2.5 py-1 font-semibold text-[var(--sage-deep)]">
              有当天提醒
            </span>
          ) : null}
        </div>
      </div>

      <div className="bg-[var(--paper)] px-3.5 py-2 sm:px-5 sm:py-3">
        {resolvedCabinet.slots.map((slot) => (
          <TimeSlotSection
            key={slot.key}
            slot={slot}
            mapPoints={mapPoints}
            activeBlockId={activeBlockId}
            onBlockSelect={onBlockSelect}
            onBlockAction={onBlockAction}
          />
        ))}
      </div>

      {resolvedCabinet.dailyTips.length > 0 ? (
        <footer className="border-t border-dashed border-[var(--line)] bg-[var(--sage-soft)] px-3.5 py-3 sm:px-5 sm:py-4">
          <p className="text-xs font-semibold tracking-[0.12em] text-[var(--sage-deep)]">
            这天记一笔
          </p>
          <ul className="mt-2.5 space-y-1.5 text-sm leading-6 text-[var(--sage-deep)]">
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
