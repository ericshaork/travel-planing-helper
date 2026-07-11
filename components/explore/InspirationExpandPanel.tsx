"use client";

interface InspirationExpandPanelSection {
  title: string;
  options: string[];
}

interface InspirationExpandPanelProps {
  title: string;
  description: string;
  sections: InspirationExpandPanelSection[];
  selected: string[];
  onToggle: (value: string) => void;
}

export function InspirationExpandPanel({
  title,
  description,
  sections,
  selected,
  onToggle,
}: InspirationExpandPanelProps) {
  return (
    <div className="space-y-4 rounded-[18px] border border-[var(--line)] px-4 py-4">
      <div>
        <h3 className="text-base font-semibold text-[var(--ink)]">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
          {description}
        </p>
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.title} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
              {section.title}
            </p>
            <div className="flex flex-wrap gap-2">
              {section.options.map((option) => {
                const active = selected.includes(option);

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onToggle(option)}
                    className={`rounded-full border px-3 py-2 text-xs ${
                      active
                        ? "border-[var(--ink)] text-[var(--ink)]"
                        : "border-[var(--line)] text-[var(--ink-muted)]"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
