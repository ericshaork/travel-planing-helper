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
      className="overflow-hidden border border-[var(--line-strong)] bg-[var(--paper)] p-3 shadow-[4px_5px_0_var(--sand)] sm:p-5 sm:shadow-[5px_6px_0_var(--sand)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.12em] text-[var(--clay-deep)]">
            还差 {missingFields.length} 项
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)] sm:mt-2 sm:text-sm sm:leading-6">
            点一下就能跳过去。
          </p>
        </div>
        <span className="hidden shrink-0 border border-[var(--sage-deep)] bg-[var(--sage-soft)] px-2 py-1 text-xs font-semibold text-[var(--sage-deep)] sm:inline-flex">
          先补最关键的
        </span>
      </div>

      <div className="no-scrollbar -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
        {missingFields.map((field) => (
          <button
            key={field.field}
            type="button"
            onClick={() => onSelect(field.field)}
            className="min-h-10 shrink-0 whitespace-nowrap border border-[var(--line-strong)] bg-[var(--paper-bright)] px-3 py-2 text-left text-sm font-semibold text-[var(--ink)] transition-colors duration-150 ease-out hover:border-[var(--clay)] hover:bg-[var(--clay-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] sm:max-w-full sm:break-words sm:whitespace-normal"
          >
            {field.label}
          </button>
        ))}
      </div>
    </section>
  );
}
