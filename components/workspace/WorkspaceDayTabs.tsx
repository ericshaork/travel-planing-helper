import Image from "next/image";

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
    <section className="workspace-panel sticky top-4 z-10 relative overflow-hidden px-4 py-4 sm:px-5 sm:py-5">
      <div className="pointer-events-none absolute left-4 top-3 h-12 w-20 opacity-65">
        <Image
          src="/images/archive/decoration/archive-label-note.png"
          alt=""
          fill
          aria-hidden
          sizes="80px"
          className="object-contain"
        />
      </div>
      <div className="pointer-events-none absolute right-4 top-0 h-16 w-12 opacity-85">
        <Image
          src="/images/archive/bookmark/archive-bookmark-default.png"
          alt=""
          fill
          aria-hidden
          sizes="48px"
          className="object-contain object-top"
        />
      </div>

      <div className="relative z-[1]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="workspace-kicker">DAY TABS</p>
            <h2 className="mt-1.5 text-lg font-semibold sm:text-xl">
              切换 Day，左侧行程和右侧地图会一起翻页
            </h2>
          </div>
          <span className="workspace-chip">{cabinets.length} 天</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {cabinets.map((cabinet) => {
            const active = cabinet.dayNumber === activeDayNumber;

            return (
              <button
                key={cabinet.dayNumber}
                type="button"
                onClick={() => onSelect(cabinet.dayNumber)}
                aria-pressed={active}
                className={`inline-flex min-h-11 items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] ${
                  active
                    ? "border-[var(--ink)] bg-[linear-gradient(180deg,rgba(252,245,231,0.98)_0%,rgba(255,253,247,0.98)_100%)] text-[var(--ink)] shadow-[4px_4px_0_var(--sand)]"
                    : "border-[var(--line-strong)] bg-[rgba(255,253,247,0.88)] text-[var(--ink-muted)] hover:border-[var(--ink)] hover:text-[var(--ink)]"
                }`}
              >
                {`Day ${cabinet.dayNumber}`}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
