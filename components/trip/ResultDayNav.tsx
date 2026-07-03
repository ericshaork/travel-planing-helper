interface ResultDayNavItem {
  key: string;
  label: string;
}

interface ResultDayNavProps {
  items: ResultDayNavItem[];
  activeKey?: string;
  onSelect: (key: string) => void;
}

export function ResultDayNav({
  items,
  activeKey,
  onSelect,
}: ResultDayNavProps) {
  return (
    <div className="relative overflow-hidden">
      <nav
        aria-label="结果页导航"
        className="no-scrollbar overflow-x-auto overflow-y-hidden border border-[var(--line-strong)] bg-[var(--paper)] px-2.5 py-2.5 shadow-[3px_3px_0_var(--sand-soft)] touch-pan-x sm:px-3 sm:py-3 sm:shadow-[4px_4px_0_var(--sand-soft)]"
      >
        <div className="flex w-max min-w-full flex-nowrap gap-1.5 pr-3 sm:gap-2 sm:pr-4">
          {items.map((item) => {
            const isActive = activeKey === item.key;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelect(item.key)}
                aria-pressed={isActive}
                className={`min-h-9 shrink-0 whitespace-nowrap border px-2.5 py-1.5 text-[13px] font-semibold transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] sm:min-h-10 sm:px-3 sm:py-2 sm:text-sm ${
                  isActive
                    ? "border-[var(--clay)] bg-[var(--clay-soft)] text-[var(--clay-deep)]"
                    : "border-[var(--line)] bg-[var(--paper-bright)] text-[var(--ink-muted)] hover:border-[var(--ink-muted)] hover:text-[var(--ink)]"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-[var(--paper)] to-transparent sm:w-4"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-[var(--paper)] to-transparent sm:w-5"
      />
    </div>
  );
}
