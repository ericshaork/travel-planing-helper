"use client";

import { ChoicePill } from "./ChoicePill";

export function MultiChoiceGroup<T extends string>({
  options,
  value,
  onToggle,
}: {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <ChoicePill
          key={option.value}
          label={option.label}
          selected={value.includes(option.value)}
          onClick={() => onToggle(option.value)}
        />
      ))}
    </div>
  );
}
