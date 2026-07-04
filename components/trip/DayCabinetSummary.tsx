import {
  getTimeSlotPreview,
  type DayCabinetView,
} from "@/lib/trip/itinerary-view";

interface DayCabinetSummaryProps {
  cabinet: DayCabinetView;
  expanded?: boolean;
  onToggle?: (dayNumber: number) => void;
}

export function DayCabinetSummary({
  cabinet,
  expanded = false,
  onToggle,
}: DayCabinetSummaryProps) {
  const slotPreviews = cabinet.slots.map(getTimeSlotPreview);

  const summaryContent = (
    <>
      <div className="flex flex-wrap items-start gap-3 sm:gap-4">
        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center border border-[var(--ink)] bg-[var(--paper-bright)] font-mono shadow-[2px_2px_0_var(--sand-soft)] sm:h-14 sm:w-14">
          <span className="text-[10px] font-semibold tracking-[0.12em]">
            DAY
          </span>
          <span className="text-base font-bold sm:text-lg">
            {cabinet.dayNumber}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-[var(--clay-deep)] sm:text-[11px]">
            柜门预览
          </p>
          {cabinet.date ? (
            <p className="mt-1 break-words font-mono text-[11px] text-[var(--ink-muted)] sm:text-xs">
              {cabinet.date}
            </p>
          ) : null}
          <h3 className="mt-1.5 break-words text-[15px] font-semibold sm:text-lg">
            {cabinet.theme}
          </h3>
          <p className="mt-1.5 break-words text-xs leading-5 text-[var(--ink-muted)]">
            {cabinet.routeReason}
          </p>
        </div>
      </div>

      <div className="mt-3 overflow-hidden border border-dashed border-[var(--line)] bg-[var(--paper-bright)]">
        {slotPreviews.map((slot, index) => (
          <div
            key={slot.label}
            className={`grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-2.5 px-3 py-2 text-[13px] sm:grid-cols-[3.2rem_minmax(0,1fr)_auto] sm:px-3.5 sm:py-2.5 sm:text-sm ${
              index > 0 ? "border-t border-dashed border-[var(--line)]" : ""
            }`}
          >
            <span className="font-semibold text-[var(--clay-deep)]">
              {slot.label}
            </span>
            <span className="min-w-0 break-words text-[var(--ink)]">
              {slot.primaryName}
            </span>
            {slot.extraCount > 0 ? (
              <span className="shrink-0 border border-[var(--line)] bg-[var(--paper)] px-1.5 py-0.5 text-[11px] text-[var(--ink-muted)] sm:text-xs">
                +{slot.extraCount}
              </span>
            ) : (
              <span className="shrink-0 text-[11px] text-[var(--ink-faint)] sm:text-xs">
                —
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-sm">
        <div className="flex flex-wrap gap-2 text-[11px] sm:text-xs">
          <span className="border border-[var(--line)] bg-[var(--sand-soft)] px-2 py-1 font-semibold text-[var(--ink)]">
            {cabinet.itemCount} 个积木
          </span>
          {cabinet.dailyTips.length > 0 ? (
            <span className="border border-[var(--sage-deep)] bg-[var(--sage-soft)] px-2 py-1 font-semibold text-[var(--sage-deep)]">
              有提醒
            </span>
          ) : null}
        </div>
        <span className="shrink-0 border border-[var(--clay)] bg-[var(--paper)] px-2.5 py-1 text-[13px] font-semibold text-[var(--clay-deep)] sm:text-sm">
          {expanded ? "收起这天" : "打开这天"}
        </span>
      </div>
    </>
  );

  if (!onToggle) {
    return (
      <article className="cabinet-door p-4 pt-7 sm:p-5 sm:pt-8">
        {summaryContent}
      </article>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onToggle(cabinet.dayNumber)}
      aria-expanded={expanded}
      className="cabinet-door block w-full p-4 pt-7 text-left transition-transform duration-150 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] sm:p-5 sm:pt-8"
    >
      {summaryContent}
    </button>
  );
}
