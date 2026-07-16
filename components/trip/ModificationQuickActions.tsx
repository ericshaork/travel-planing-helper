import type { QuickModificationType } from "@/lib/trip/modification-intents";

interface ModificationQuickActionsProps {
  onSelect: (type: QuickModificationType) => void;
}

const ACTIONS: Array<{
  type: QuickModificationType;
  label: string;
}> = [
  { type: "relax", label: "轻松一点" },
  { type: "lessWalking", label: "少走路" },
  { type: "lowerBudget", label: "预算再省一点" },
  { type: "addFoodNightMarket", label: "加点夜市美食" },
  { type: "noEarlyStart", label: "不要太早出门" },
];

export function ModificationQuickActions({
  onSelect,
}: ModificationQuickActionsProps) {
  return (
    <section className="cabinet-door p-4 pt-6 sm:p-5 sm:pt-7">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold tracking-[0.14em] text-[var(--sage-deep)]">
          快速方向
        </p>
        <h3 className="mt-2 text-base font-semibold sm:text-lg">
          先选一个明确的调整方向
        </h3>
        <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
          这些按钮会先帮你起草 AI 调整方向，不会立刻改动当前行程。
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 sm:gap-2.5">
        {ACTIONS.map((action) => (
          <button
            key={action.type}
            type="button"
            onClick={() => onSelect(action.type)}
            className="min-h-10 max-w-full rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-3 py-2 text-sm font-semibold text-[var(--ink)] transition-colors duration-150 ease-out hover:border-[var(--clay-deep)] hover:bg-[var(--sand-soft)] hover:text-[var(--clay-deep)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] sm:min-h-11 sm:px-3.5"
          >
            {action.label}
          </button>
        ))}
      </div>
    </section>
  );
}
