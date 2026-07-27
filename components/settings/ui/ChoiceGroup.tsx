"use client";

import { ChoicePill } from "./ChoicePill";

export function ChoiceGroup<T extends string | boolean>({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <ChoicePill
          key={String(option.value)}
          label={option.label}
          selected={option.value === value}
          onClick={() => onChange(option.value)}
        />
      ))}
    </div>
  );
}
