import type { DayCabinetView } from "@/lib/trip/itinerary-view";

interface WorkspaceDayTabsProps {
  cabinets: DayCabinetView[];
  activeDayNumber: number;
  onSelect: (dayNumber: number) => void;
}

export function WorkspaceDayTabs({
  cabinets,
  activeDayNumber,
  onSelect,
}: WorkspaceDayTabsProps) {
  if (cabinets.length === 0) {
    return null;
  }

  return (
    <section className="workspace-panel px-4 py-4 sm:px-5">
      <div className="relative z-[1]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="workspace-kicker">DAY TABS</p>
            <h2 className="mt-1.5 text-lg font-semibold sm:text-xl">
              先盯住今天要改的这一天
            </h2>
          </div>
          <span className="workspace-chip">共 {cabinets.length} 天</span>
        </div>

        <div className="mt-4 grid gap-2 lg:grid-cols-3">
          {cabinets.map((cabinet) => {
            const active = cabinet.dayNumber === activeDayNumber;

            return (
              <button
                key={cabinet.dayNumber}
                type="button"
                onClick={() => onSelect(cabinet.dayNumber)}
                aria-pressed={active}
                className={`workspace-panel-soft w-full px-3 py-3 text-left transition-all duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] ${
                  active
                    ? "border-[var(--ink)] bg-[var(--sand-soft)] shadow-[4px_4px_0_var(--sand)]"
                    : "hover:-translate-y-0.5 hover:border-[var(--line-strong)]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="workspace-kicker">Day {cabinet.dayNumber}</p>
                    <h3 className="mt-1 truncate text-sm font-semibold text-[var(--ink)] sm:text-base">
                      {cabinet.theme}
                    </h3>
                    <p className="mt-1 truncate text-xs text-[var(--ink-muted)]">
                      {cabinet.date ?? "日期待确认"}
                    </p>
                  </div>

                  <span
                    className={
                      active ? "workspace-chip workspace-chip-accent" : "workspace-chip"
                    }
                  >
                    {cabinet.itemCount} 项
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
