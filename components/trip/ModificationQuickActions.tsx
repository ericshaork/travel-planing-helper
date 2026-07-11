import type { QuickModificationType } from "@/lib/trip/modification-intents";

interface ModificationQuickActionsProps {
  onSelect: (type: QuickModificationType) => void;
}

const ACTIONS: Array<{
  type: QuickModificationType;
  label: string;
}> = [
  { type: "relax", label: "Make it lighter" },
  { type: "lessWalking", label: "Less walking" },
  { type: "lowerBudget", label: "Lower the budget" },
  { type: "addFoodNightMarket", label: "Add food / night market" },
  { type: "noEarlyStart", label: "No early start" },
];

export function ModificationQuickActions({
  onSelect,
}: ModificationQuickActionsProps) {
  return (
    <section className="cabinet-door p-4 pt-7 sm:p-5 sm:pt-8">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold tracking-[0.14em] text-[var(--sage-deep)]">
          QUICK EDIT DIRECTION
        </p>
        <h2 className="mt-2 text-base font-semibold sm:text-lg">
          Start from one clear travel adjustment
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
          These buttons only prepare the edit direction. The actual AI rewrite still happens in the regenerate box below.
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
