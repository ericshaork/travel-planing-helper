"use client";

interface InspirationOption {
  label: string;
  value: string;
  group: string;
}

const inspirationOptions: InspirationOption[] = [
  { label: "Sea", value: "sea", group: "Terrain" },
  { label: "Mountain", value: "mountain", group: "Terrain" },
  { label: "Spicy", value: "spicy", group: "Cuisine" },
  { label: "Street food", value: "street-food", group: "Cuisine" },
  { label: "Summer", value: "summer", group: "Season" },
  { label: "Snow", value: "snow", group: "Season" },
  { label: "Couple", value: "couple", group: "Companion" },
  { label: "Family", value: "family", group: "Companion" },
];

interface InspirationSectionProps {
  selectedTags: string[];
  onToggleTag: (value: string) => void;
  onClear: () => void;
}

export function InspirationSection({
  selectedTags,
  onToggleTag,
  onClear,
}: InspirationSectionProps) {
  return (
    <section className="workspace-panel px-4 py-4 sm:px-5 sm:py-5">
      <div className="relative z-[1] space-y-4">
        <div>
          <p className="workspace-kicker">INSPIRATION</p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--ink)]">
            Filter by feeling before we add the full archive taxonomy
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
            These options preview the future terrain, cuisine, season, and
            companion dimensions without changing the current data source.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {inspirationOptions.map((option) => {
            const active = selectedTags.includes(option.value);

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onToggleTag(option.value)}
                className={`rounded-full border px-3 py-2 text-xs ${
                  active
                    ? "border-[var(--ink)] text-[var(--ink)]"
                    : "border-[var(--line)] text-[var(--ink-muted)]"
                }`}
              >
                {option.group}: {option.label}
              </button>
            );
          })}
        </div>

        {selectedTags.length > 0 ? (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink-muted)]"
          >
            Clear inspiration filters
          </button>
        ) : null}
      </div>
    </section>
  );
}
