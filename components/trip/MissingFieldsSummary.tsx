import type { PlanFieldDetail } from "@/lib/trip/plan-fields";

interface MissingFieldsSummaryProps {
  missingFields: PlanFieldDetail[];
  onSelect: (field: PlanFieldDetail["field"]) => void;
}

export function MissingFieldsSummary({
  missingFields,
  onSelect,
}: MissingFieldsSummaryProps) {
  if (missingFields.length === 0) {
    return null;
  }

  return (
    <section
      role="alert"
      aria-live="polite"
      className="overflow-hidden border border-[var(--line-strong)] bg-[var(--paper)] p-4 shadow-[5px_6px_0_var(--sand)] sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.12em] text-[var(--clay-deep)]">
            还差 {missingFields.length} 项信息
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
            补完这些就能生成行程。
          </p>
        </div>
        <span className="shrink-0 border border-[var(--sage-deep)] bg-[var(--sage-soft)] px-2 py-1 text-xs font-semibold text-[var(--sage-deep)]">
          点一下就能跳过去
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {missingFields.map((field) => (
          <button
            key={field.field}
            type="button"
            onClick={() => onSelect(field.field)}
            className="min-h-10 max-w-full break-words border border-[var(--line-strong)] bg-[var(--paper-bright)] px-3 py-2 text-left text-sm font-semibold text-[var(--ink)] transition-colors duration-150 ease-out hover:border-[var(--clay)] hover:bg-[var(--clay-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
          >
            {field.label}
          </button>
        ))}
      </div>
    </section>
  );
}

