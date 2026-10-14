import type { DayCabinetView } from "@/lib/trip/itinerary-view";

interface WorkspaceDayTabsProps {
  cabinets: DayCabinetView[];
  activeDayNumber: number;
  compactBlankReadMode?: boolean;
  compactEmptyEditMode?: boolean;
  showEditActions?: boolean;
  onAddDay?: () => void;
  onSelect: (dayNumber: number) => void;
}

export function WorkspaceDayTabs({
  cabinets,
  activeDayNumber,
  compactBlankReadMode = false,
  compactEmptyEditMode = false,
  showEditActions = false,
  onAddDay,
  onSelect,
}: WorkspaceDayTabsProps) {
  if (cabinets.length === 0) {
    return null;
  }

  const compactTabs = compactBlankReadMode || compactEmptyEditMode;

  function handleAddDayClick() {
    onAddDay?.();
  }

  return (
    <section
      className={`workbench-day-tabs sticky z-10 -mx-2 px-2 ${
        compactEmptyEditMode
          ? "top-0 mb-0 flex-none pb-0.5 pt-0"
          : compactTabs
            ? "top-0 mb-0 flex-none pb-1 pt-0"
          : "top-2 mb-1 pb-1.5 pt-0.5"
      }`}
    >
      {!compactEmptyEditMode ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="workspace-kicker">日期页签</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {cabinets.length > 1 ? (
              <span className="journal-chip py-0.5 text-[10px]">{cabinets.length} 天</span>
            ) : null}
            {showEditActions && onAddDay ? (
              <button
                type="button"
                onClick={handleAddDayClick}
                className="journal-chip border-[var(--ink)] py-0.5 text-[10px] text-[var(--ink)] transition-colors hover:border-[var(--clay-deep)] hover:text-[var(--clay-deep)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
              >
                添加一天
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div
        className={
          compactEmptyEditMode
            ? "flex flex-wrap items-center gap-1.5"
            : compactTabs
              ? "mt-1.5 flex flex-wrap gap-1.5"
            : "mt-2 flex flex-wrap gap-1.5"
        }
      >
        {cabinets.map((cabinet) => {
          const active = cabinet.dayNumber === activeDayNumber;

          return (
            <button
              key={cabinet.dayNumber}
              type="button"
              onClick={() => onSelect(cabinet.dayNumber)}
              aria-pressed={active}
              data-active={active ? "true" : "false"}
              className="workbench-day-tab journal-tab min-h-[2rem] px-3 py-1 text-[12px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
            >
              {`第 ${cabinet.dayNumber} 天`}
            </button>
          );
        })}
        {compactEmptyEditMode && showEditActions && onAddDay ? (
          <button
            type="button"
            onClick={handleAddDayClick}
            aria-label="添加一天"
            className="workbench-day-tab journal-tab min-h-[2rem] min-w-9 px-3 py-1 text-[12px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
          >
            +
          </button>
        ) : null}
      </div>
    </section>
  );
}
