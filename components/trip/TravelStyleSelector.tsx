"use client";

import { TRAVEL_STYLE_OPTIONS } from "@/lib/trip/defaults";

interface TravelStyleSelectorProps {
  selected: string[];
  onToggle: (style: string) => void;
  disabled?: boolean;
  legend?: string;
  helperText?: string;
  fieldId?: string;
  errorId?: string;
  errorMessage?: string;
  invalid?: boolean;
  highlighted?: boolean;
}

export function TravelStyleSelector({
  selected,
  onToggle,
  disabled = false,
  legend = "想怎么走",
  helperText,
  fieldId,
  errorId,
  errorMessage,
  invalid = false,
  highlighted = false,
}: TravelStyleSelectorProps) {
  return (
    <fieldset
      id={fieldId}
      disabled={disabled}
      tabIndex={-1}
      aria-invalid={invalid || undefined}
      aria-describedby={errorId}
      className={`scroll-mt-28 ${
        invalid || highlighted
          ? "border border-[var(--clay)] bg-[var(--clay-soft)] p-3"
          : ""
      }`}
    >
      <legend className="text-sm font-semibold text-[var(--ink)]">
        {legend}
      </legend>
      {helperText ? (
        <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">
          {helperText}
        </p>
      ) : null}

      <div className="no-scrollbar -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
        {TRAVEL_STYLE_OPTIONS.map((style) => {
          const isSelected = selected.includes(style);

          return (
            <button
              key={style}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onToggle(style)}
              className={`min-h-10 shrink-0 whitespace-nowrap border px-3 py-2 text-sm leading-5 transition-[transform,background-color,border-color] duration-150 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] sm:max-w-full sm:break-words sm:whitespace-normal ${
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

      {errorMessage ? (
        <p
          id={errorId}
          role="alert"
          className="mt-3 text-xs leading-5 text-[var(--clay-deep)]"
        >
          {errorMessage}
        </p>
      ) : null}
    </fieldset>
  );
}
