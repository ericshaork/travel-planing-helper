import type { PaceWarning } from "@/lib/trip/enrichment-types";

interface PaceWarningListProps {
  warnings: PaceWarning[];
}

const LEVEL_STYLES: Record<PaceWarning["level"], string> = {
  info: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink-muted)]",
  warning:
    "border-[var(--clay)] bg-[var(--clay-soft)] text-[var(--clay-deep)]",
  critical:
    "border-[var(--sage-deep)] bg-[var(--sage-soft)] text-[var(--sage-deep)]",
};

export function PaceWarningList({ warnings }: PaceWarningListProps) {
  if (warnings.length === 0) {
    return (
      <p className="text-sm leading-6 text-[var(--ink-muted)]">
        这一天目前没看到明显的节奏风险。
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {warnings.map((warning) => (
        <li
          key={warning.id}
          className={`border px-3 py-2 text-sm leading-6 ${LEVEL_STYLES[warning.level]}`}
        >
          {warning.message}
        </li>
      ))}
    </ul>
  );
}
