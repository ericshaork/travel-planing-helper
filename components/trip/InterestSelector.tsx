"use client";

import { useState } from "react";

import { INTEREST_OPTIONS } from "@/lib/trip/defaults";

interface InterestSelectorProps {
  selected: string[];
  onToggle: (interest: string) => void;
  disabled?: boolean;
  legend?: string;
  helperText?: string;
  fieldId?: string;
  errorId?: string;
  errorMessage?: string;
  invalid?: boolean;
  highlighted?: boolean;
  mobileCollapsedCount?: number;
}

function buildButtonClassName(isSelected: boolean): string {
  return `min-h-11 min-w-0 w-full border px-3 py-2 text-center text-sm leading-5 whitespace-normal break-words transition-[transform,background-color,border-color] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] sm:min-h-10 sm:w-auto sm:max-w-full ${
    isSelected
      ? "border-[var(--sage-deep)] bg-[var(--sage-soft)] font-semibold text-[var(--sage-deep)] sm:-rotate-1 sm:hover:-translate-y-0.5"
      : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink-muted)] hover:border-[var(--ink-muted)]"
  }`;
}

export function InterestSelector({
  selected,
  onToggle,
  disabled = false,
  legend = "想玩什么",
  helperText,
  fieldId,
  errorId,
  errorMessage,
  invalid = false,
  highlighted = false,
  mobileCollapsedCount,
}: InterestSelectorProps) {
  const [showAllMobileOptions, setShowAllMobileOptions] = useState(false);
  const baseVisibleOptions =
    typeof mobileCollapsedCount === "number"
      ? INTEREST_OPTIONS.slice(0, mobileCollapsedCount)
      : INTEREST_OPTIONS;
  const mobileVisibleOptions = [
    ...baseVisibleOptions,
    ...selected.filter(
      (interest) =>
        !(baseVisibleOptions as readonly string[]).includes(interest),
    ),
  ];
  const hiddenMobileOptions = INTEREST_OPTIONS.filter(
    (interest) => !(mobileVisibleOptions as readonly string[]).includes(interest),
  );
  const mobileOptions =
    showAllMobileOptions || hiddenMobileOptions.length === 0
      ? INTEREST_OPTIONS
      : mobileVisibleOptions;

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

      <div className="mt-2.5 grid grid-cols-2 gap-1.5 sm:hidden">
        {mobileOptions.map((interest) => {
          const isSelected = selected.includes(interest);

          return (
            <button
              key={interest}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onToggle(interest)}
              className={buildButtonClassName(isSelected)}
            >
              {interest}
            </button>
          );
        })}
      </div>

      <div className="mt-3 hidden sm:flex sm:flex-wrap sm:gap-2">
        {INTEREST_OPTIONS.map((interest) => {
          const isSelected = selected.includes(interest);

          return (
            <button
              key={`desktop-${interest}`}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onToggle(interest)}
              className={buildButtonClassName(isSelected)}
            >
              {interest}
            </button>
          );
        })}
      </div>

      {hiddenMobileOptions.length > 0 ? (
        <button
          type="button"
          onClick={() => setShowAllMobileOptions((current) => !current)}
          className="mt-2 inline-flex min-h-10 items-center border border-dashed border-[var(--line-strong)] bg-[var(--paper-bright)] px-3 py-2 text-sm font-semibold text-[var(--ink-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] sm:hidden"
        >
          {showAllMobileOptions
            ? "收起更多兴趣"
            : `展开更多兴趣（${hiddenMobileOptions.length} 项）`}
        </button>
      ) : null}

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
