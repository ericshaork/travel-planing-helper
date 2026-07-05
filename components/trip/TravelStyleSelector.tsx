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
  const optionLayoutClassName =
    "mt-2.5 grid grid-cols-2 gap-1.5 sm:mt-3 sm:flex sm:flex-wrap sm:gap-2";
  const optionClassName =
    "min-h-11 min-w-0 w-full border px-3 py-2 text-center text-sm leading-5 whitespace-normal break-words transition-[transform,background-color,border-color] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] sm:min-h-10 sm:w-auto sm:max-w-full";

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
        <p className="mt-1 text-xs leading-[1.1rem] text-[var(--ink-muted)] sm:leading-5">
          {helperText}
        </p>
      ) : null}

      <div className={optionLayoutClassName}>
        {TRAVEL_STYLE_OPTIONS.map((style) => {
          const isSelected = selected.includes(style);

          return (
            <button
              key={style}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onToggle(style)}
              className={`${optionClassName} ${
                isSelected
                  ? "border-[var(--clay)] bg-[var(--clay-soft)] font-semibold text-[var(--clay-deep)] sm:rotate-1 sm:hover:-translate-y-0.5"
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
          className="mt-2.5 text-xs leading-5 text-[var(--clay-deep)]"
        >
          {errorMessage}
        </p>
      ) : null}
    </fieldset>
  );
}
