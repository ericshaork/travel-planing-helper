"use client";

import type {
  RevisionChange,
  RevisionModificationSuggestion,
} from "@/lib/projects/revision-chat/revision-chat-types";

interface RevisionSuggestionCardProps {
  suggestion: RevisionModificationSuggestion;
  onApply?: () => void;
  onContinueDiscussion?: () => void;
  isApplying?: boolean;
  applyError?: string;
  applySuccessMessage?: string;
}

function resolveActionLabel(change: RevisionChange): string {
  switch (change.action) {
    case "replace":
      return "替换";
    case "remove":
      return "移除";
    case "add":
      return "新增";
    case "modify":
    default:
      return "调整";
  }
}

function resolveActionAccent(change: RevisionChange): string {
  switch (change.action) {
    case "remove":
      return "border-[var(--dusty-rose)] text-[var(--dusty-rose)]";
    case "add":
      return "border-[var(--sage-deep)] text-[var(--sage-deep)]";
    case "modify":
      return "border-[var(--sand-deep)] text-[var(--sand-deep)]";
    case "replace":
    default:
      return "border-[var(--clay)] text-[var(--clay-deep)]";
  }
}

export function RevisionSuggestionCard({
  suggestion,
  onApply,
  onContinueDiscussion,
  isApplying = false,
  applyError,
  applySuccessMessage,
}: RevisionSuggestionCardProps) {
  return (
    <section
      data-testid="revision-suggestion-card"
      className="mt-3 border-l-2 border-[var(--clay)] bg-[var(--clay-soft)]/35 px-4 py-3"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--clay-deep)]">
        AI 调整建议
      </p>
      <p
        data-testid="revision-suggestion-message"
        className="mt-1 font-serif text-sm leading-6 text-[var(--ink)]"
      >
        {suggestion.message}
      </p>

      <ol className="mt-3 space-y-2">
        {suggestion.changes.map((change, index) => (
          <li
            key={`${change.day}-${change.action}-${change.target}-${index}`}
            data-testid={`revision-suggestion-change-${index}`}
            className="border border-dashed border-[var(--line-strong)] bg-[var(--paper-bright)] px-3 py-2"
          >
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
              <span className="font-serif text-sm font-semibold text-[var(--ink)]">
                D{String(change.day).padStart(2, "0")}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${resolveActionAccent(change)}`}
              >
                {resolveActionLabel(change)}
              </span>
            </div>
            <div className="mt-1 grid grid-cols-1 gap-1 text-sm leading-6 text-[var(--ink)] sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:gap-x-3">
              <p>
                <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--ink-faint)]">
                  当前安排
                </span>
                {change.target}
              </p>
              {change.replacement ? (
                <p>
                  <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--ink-faint)]">
                    调整为
                  </span>
                  {change.replacement}
                </p>
              ) : null}
            </div>
            <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">
              调整原因：{change.reason}
            </p>
          </li>
        ))}
      </ol>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          data-testid="revision-suggestion-apply"
          disabled={isApplying || !onApply}
          onClick={onApply}
          className="rounded-full border border-[var(--ink)] bg-[var(--ink)] px-3 py-1.5 text-xs font-semibold text-[var(--paper-bright)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isApplying ? "正在应用修改..." : "应用修改"}
        </button>
        <button
          type="button"
          data-testid="revision-suggestion-continue"
          onClick={onContinueDiscussion}
          className="rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-bright)]"
        >
          继续讨论
        </button>
      </div>

      {applyError ? (
        <p
          data-testid="revision-suggestion-apply-error"
          className="mt-3 text-xs leading-5 text-[var(--dusty-rose)]"
        >
          {applyError}
        </p>
      ) : null}

      {applySuccessMessage ? (
        <p
          data-testid="revision-suggestion-apply-success"
          className="mt-3 text-xs leading-5 text-[var(--sage-deep)]"
        >
          {applySuccessMessage}
        </p>
      ) : null}
    </section>
  );
}
