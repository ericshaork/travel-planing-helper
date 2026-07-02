"use client";

import { TRAVEL_STYLE_OPTIONS } from "@/lib/trip/defaults";

interface TravelStyleSelectorProps {
  selected: string[];
  onToggle: (style: string) => void;
  disabled?: boolean;
  legend?: string;
  helperText?: string;
}

export function TravelStyleSelector({
  selected,
  onToggle,
  disabled = false,
  legend = "想怎么走",
  helperText,
}: TravelStyleSelectorProps) {
  return (
    <fieldset disabled={disabled}>
      <legend className="text-sm font-semibold text-[var(--ink)]">
        {legend}
      </legend>
      {helperText ? (
        <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">
          {helperText}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {TRAVEL_STYLE_OPTIONS.map((style) => {
          const isSelected = selected.includes(style);

          return (
            <button
              key={style}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onToggle(style)}
              className={`min-h-10 max-w-full break-words border px-3 py-2 text-sm leading-5 transition-[transform,background-color,border-color] duration-150 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] ${
                isSelected
                  ? "rotate-1 border-[var(--clay)] bg-[var(--clay-soft)] font-semibold text-[var(--clay-deep)]"
                  : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink-muted)] hover:border-[var(--ink-muted)]"
              }`}
            >
              {style}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
