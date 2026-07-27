"use client";

export function ChoicePill({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      data-selected={selected ? "true" : "false"}
      className={
        selected
          ? "inline-flex min-h-10 items-center rounded-full border border-[var(--sage-deep)] bg-[var(--sage-soft)] px-4 py-2 text-sm font-semibold text-[var(--sage-deep)]"
          : "inline-flex min-h-10 items-center rounded-full border border-[var(--line)] bg-[rgba(255,253,247,0.78)] px-4 py-2 text-sm text-[var(--ink-muted)] hover:bg-[var(--paper-bright)]"
      }
    >
      {label}
    </button>
  );
}
