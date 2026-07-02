import type { BudgetSummary } from "@/lib/trip/types";

interface BudgetSummaryCardProps {
  budget: BudgetSummary;
}

const BUDGET_ITEMS: Array<{
  label: string;
  field: keyof Pick<
    BudgetSummary,
    | "transport"
    | "hotel"
    | "food"
    | "tickets"
    | "localTransport"
    | "flexibleSpending"
  >;
}> = [
  { label: "大交通", field: "transport" },
  { label: "住宿", field: "hotel" },
  { label: "吃饭", field: "food" },
  { label: "门票", field: "tickets" },
  { label: "市内交通", field: "localTransport" },
  { label: "弹性支出", field: "flexibleSpending" },
];

export function BudgetSummaryCard({ budget }: BudgetSummaryCardProps) {
  return (
    <section
      aria-labelledby="budget-title"
      className="overflow-hidden border border-[var(--line-strong)] bg-[var(--paper-bright)] p-5 shadow-[6px_7px_0_var(--sand)] sm:p-6"
    >
      <div className="flex flex-col gap-4 border-b border-dashed border-[var(--line)] pb-5 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.14em] text-[var(--clay-deep)]">
            先把钱分个大概
          </p>
          <h2 id="budget-title" className="mt-2 text-2xl font-semibold">
            预算摘要
          </h2>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs font-semibold text-[var(--ink-muted)]">估算合计</p>
          <p className="mt-1 break-words text-xl font-semibold">{budget.totalEstimate}</p>
        </div>
      </div>

      <dl className="mt-4 divide-y divide-dashed divide-[var(--line)]">
        {BUDGET_ITEMS.map((item) => (
          <div
            key={item.field}
            className="flex flex-col gap-1 py-2.5 text-sm sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
          >
            <dt className="text-[var(--ink-muted)]">{item.label}</dt>
            <dd className="break-words font-semibold sm:text-right">
              {budget[item.field]}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 break-words bg-[var(--sand-soft)] px-3 py-2 text-xs leading-5 text-[var(--ink-muted)]">
        {budget.note} 这里只是行前估算，不代表实时票价或酒店价格。
      </p>
    </section>
  );
}
