"use client";

import type { ChatWorkspaceVersion } from "@/lib/projects/chat-workspace-client";
import {
  buildEnterWorkspaceLabel,
  buildRevisionDailyOutline,
  buildRevisionVersionLabel,
} from "@/lib/projects/revision-mode";

interface RevisionEditModePanelProps {
  selectedVersion: ChatWorkspaceVersion | null;
  onBackToChat: () => void;
  onEnterWorkspace: () => void;
  isEnteringWorkspace?: boolean;
  errorMessage?: string;
}

export function RevisionEditModePanel({
  selectedVersion,
  onBackToChat,
  onEnterWorkspace,
  isEnteringWorkspace = false,
  errorMessage,
}: RevisionEditModePanelProps) {
  const dailyOutline = buildRevisionDailyOutline(selectedVersion?.tripPlan);
  const summary = selectedVersion?.summary?.trim();

  return (
    <section
      data-testid="revision-edit-mode-panel"
      className="flex min-h-0 flex-1 flex-col gap-3"
    >
      <header className="border-b border-[var(--line)]/70 pb-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--clay-deep)]">
          旅行计划档案
        </p>
        <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">
          从左边挑一版旅行计划，带着它进工作台细修。这里只负责选择，不会改动任何一版内容。
        </p>
      </header>

      {selectedVersion ? (
        <div
          data-testid="revision-edit-selected-version"
          data-version-id={selectedVersion.id}
          className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto border-l-2 border-[var(--clay)] pl-3.5"
        >
          <div>
            <p className="font-serif text-[11px] font-semibold tracking-[0.12em] text-[var(--ink-muted)]">
              {buildRevisionVersionLabel(selectedVersion.versionNumber)}
              {selectedVersion.isCurrent ? " · 当前方案" : " · 历史版本"}
            </p>
            <h2
              data-testid="revision-edit-selected-title"
              className="mt-1 font-serif text-xl font-semibold text-[var(--ink)]"
            >
              {selectedVersion.title}
            </h2>
            {selectedVersion.destination || selectedVersion.days > 0 ? (
              <p className="mt-1 text-xs leading-5 text-[var(--ink-faint)]">
                {selectedVersion.destination}
                {selectedVersion.days > 0
                  ? ` · ${selectedVersion.days} 天`
                  : ""}
              </p>
            ) : null}
          </div>

          {summary ? (
            <p
              data-testid="revision-edit-selected-summary"
              className="text-sm leading-6 text-[var(--ink-muted)]"
            >
              {summary}
            </p>
          ) : null}

          {dailyOutline.length > 0 ? (
            <div data-testid="revision-edit-selected-outline">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-faint)]">
                每日路线
              </p>
              <ul className="mt-1.5 space-y-1 text-sm leading-6 text-[var(--ink-muted)]">
                {dailyOutline.map((line) => (
                  <li key={line} className="border-b border-dashed border-[var(--line)]/60 pb-1">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs leading-5 text-[var(--ink-faint)]">
              这一版的每日路线还没取回来，进入工作台后可以看到完整安排。
            </p>
          )}
        </div>
      ) : (
        <div
          data-testid="revision-edit-empty"
          className="flex min-h-0 flex-1 items-center justify-center px-4 text-center text-sm leading-6 text-[var(--ink-muted)]"
        >
          还没有可以进入编辑的旅行计划版本，先回到讨论把方向聊出来。
        </div>
      )}

      {errorMessage ? (
        <p
          data-testid="revision-edit-error"
          className="text-xs leading-5 text-[var(--dusty-rose)]"
        >
          {errorMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)]/70 pt-3">
        <button
          type="button"
          data-testid="revision-back-to-chat"
          onClick={onBackToChat}
          className="rounded-full px-2.5 py-1.5 text-xs font-semibold text-[var(--ink-muted)] hover:bg-[var(--paper-bright)]"
        >
          回到和 AI 讨论
        </button>
        <button
          type="button"
          data-testid="revision-action-enter-workspace"
          onClick={onEnterWorkspace}
          disabled={!selectedVersion || isEnteringWorkspace}
          className="rounded-full bg-[var(--ink)] px-3.5 py-1.5 text-xs font-semibold text-[var(--paper-bright)] shadow-[3px_3px_0_var(--clay)] transition-transform hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:hover:translate-y-0"
        >
          {selectedVersion
            ? isEnteringWorkspace
              ? "正在打开工作台..."
              : buildEnterWorkspaceLabel(
                  selectedVersion.title,
                  selectedVersion.versionNumber,
                )
            : "进入工作台"}
        </button>
      </div>
    </section>
  );
}
