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
  { type: "lowerBudget", label: "预算低一点" },
  { type: "addFoodNightMarket", label: "加美食 / 夜市" },
  { type: "noEarlyStart", label: "不早起" },
];

export function ModificationQuickActions({
  onSelect,
}: ModificationQuickActionsProps) {
  return (
    <section className="overflow-hidden border border-[var(--line-strong)] bg-[var(--paper-bright)] p-3.5 shadow-[3px_3px_0_var(--sand)] sm:p-5 sm:shadow-[4px_4px_0_var(--sand)]">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold tracking-[0.14em] text-[var(--sage-deep)]">
          先点一个修改方向
        </p>
        <h2 className="mt-2 text-base font-semibold sm:text-lg">
          不用想太复杂，点一下也行。
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
          我会先把修改要求写进下面的修改框，你确认后再重新生成，不会自动提交。
        </p>
      </div>

      <div className="mt-3.5 flex flex-wrap gap-2 sm:mt-4 sm:gap-2.5">
        {ACTIONS.map((action) => (
          <button
            key={action.type}
            type="button"
            onClick={() => onSelect(action.type)}
            className="min-h-10 max-w-full rounded-none border border-[var(--line)] bg-[var(--sand-soft)] px-3 py-2 text-sm font-semibold text-[var(--ink)] transition-colors duration-150 ease-out hover:border-[var(--clay-deep)] hover:text-[var(--clay-deep)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] sm:min-h-11 sm:px-3.5"
          >
            {action.label}
          </button>
        ))}
      </div>
    </section>
  );
}
