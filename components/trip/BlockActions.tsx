import type { BlockActionType } from "@/lib/trip/modification-intents";

interface BlockActionsProps {
  onAction: (actionType: BlockActionType) => void;
}

const ACTIONS: Array<{
  type: BlockActionType;
  label: string;
}> = [
  { type: "remove", label: "不要这个" },
  { type: "replace", label: "换一个" },
  { type: "lock", label: "一定保留" },
  { type: "addSimilar", label: "加类似" },
];

export function BlockActions({ onAction }: BlockActionsProps) {
  return (
    <div className="mt-2.5 border-t border-dashed border-[var(--line)] pt-2.5">
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {ACTIONS.map((action) => (
          <button
            key={action.type}
            type="button"
            onClick={() => onAction(action.type)}
            className="min-h-9 shrink-0 rounded-none border border-[var(--line)] bg-[var(--paper)] px-2.5 py-1.5 text-xs font-semibold text-[var(--ink-muted)] transition-colors duration-150 ease-out hover:border-[var(--clay-deep)] hover:text-[var(--clay-deep)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
