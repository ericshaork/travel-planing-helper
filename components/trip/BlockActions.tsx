import { useEffect, useState, type SyntheticEvent } from "react";

import type { PendingChangeAction } from "../../lib/trip/modification-intents";

interface BlockActionsProps {
  onAction: (actionType: PendingChangeAction) => void;
  onInteraction?: (event: SyntheticEvent) => void;
}

const ACTIONS: Array<{
  type: PendingChangeAction;
  label: string;
}> = [
  { type: "replace", label: "让 AI 换一个" },
  { type: "addSimilar", label: "让 AI 加类似" },
  { type: "adjust", label: "让 AI 调整" },
];

export function BlockActions({ onAction, onInteraction }: BlockActionsProps) {
  const [recentAction, setRecentAction] = useState<PendingChangeAction | null>(
    null,
  );

  useEffect(() => {
    if (!recentAction) {
      return;
    }

    const timer = window.setTimeout(() => {
      setRecentAction(null);
    }, 1400);

    return () => window.clearTimeout(timer);
  }, [recentAction]);

  return (
    <div className="mt-3 border-t border-dashed border-[var(--line)] pt-3">
      <p className="text-[10px] font-semibold tracking-[0.14em] text-[var(--ink-faint)]">
        AI 调整意图
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5 sm:gap-2">
        {ACTIONS.map((action) => {
          const isRecent = recentAction === action.type;

          return (
            <button
              key={action.type}
              type="button"
              onClickCapture={onInteraction}
              onClick={() => {
                onAction(action.type);
                setRecentAction(action.type);
              }}
              className={`min-h-9 shrink-0 rounded-full border px-2.5 py-1.5 text-xs font-semibold transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] ${
                isRecent
                  ? "border-[var(--sage-deep)] bg-[var(--sage-soft)] text-[var(--sage-deep)]"
                  : "border-dashed border-[var(--line-strong)] bg-[var(--paper)] text-[var(--ink-muted)] hover:border-[var(--clay-deep)] hover:bg-[var(--sand-soft)] hover:text-[var(--clay-deep)]"
              }`}
            >
              {isRecent ? "已加入 AI 调整" : action.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
