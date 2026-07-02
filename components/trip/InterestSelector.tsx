"use client";

import { INTEREST_OPTIONS } from "@/lib/trip/defaults";

interface InterestSelectorProps {
  selected: string[];
  onToggle: (interest: string) => void;
  disabled?: boolean;
  legend?: string;
  helperText?: string;
}

export function InterestSelector({
  selected,
  onToggle,
  disabled = false,
  legend = "想玩什么",
  helperText,
}: InterestSelectorProps) {
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
        {INTEREST_OPTIONS.map((interest) => {
          const isSelected = selected.includes(interest);

          return (
            <button
              key={interest}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onToggle(interest)}
              className={`min-h-10 max-w-full break-words border px-3 py-2 text-sm leading-5 transition-[transform,background-color,border-color] duration-150 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] ${
                isSelected
                  ? "-rotate-1 border-[var(--sage-deep)] bg-[var(--sage-soft)] font-semibold text-[var(--sage-deep)]"
                  : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink-muted)] hover:border-[var(--ink-muted)]"
              }`}
            >
              {interest}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
