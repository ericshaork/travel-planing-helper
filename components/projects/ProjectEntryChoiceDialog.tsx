"use client";

export interface ProjectEntryChoiceDialogProps {
  open: boolean;
  isWorking?: boolean;
  errorMessage?: string;
  title?: string;
  description?: string;
  workspaceTitle?: string;
  workspaceDescription?: string;
  revisionTitle?: string;
  revisionDescription?: string;
  onChooseWorkspace: () => void;
  onChooseRevision: () => void;
  onClose: () => void;
}

export function ProjectEntryChoiceDialog({
  open,
  isWorking = false,
  errorMessage,
  title = "下一步想怎么继续？",
  description = "这份旅行版本已经创建好了。现在可以直接进入工作台，也可以先交给 Wanderly 继续一起调整。",
  workspaceTitle = "进入旅行工作台",
  workspaceDescription = "直接打开当前版本，在 Workspace 里继续查看和编辑。",
  revisionTitle = "AI 继续调整",
  revisionDescription = "带着这份版本进入 AI Revision，让 Wanderly 继续帮你调整路线和节奏。",
  onChooseWorkspace,
  onChooseRevision,
  onClose,
}: ProjectEntryChoiceDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-entry-choice-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
    >
      <button
        type="button"
        aria-label="关闭创建方式弹窗"
        onClick={onClose}
        disabled={isWorking}
        className="absolute inset-0 bg-[rgba(45,38,28,0.42)] backdrop-blur-[2px] disabled:cursor-not-allowed"
      />

      <div className="journey-portal relative z-[1] w-full max-w-lg px-5 py-5">
        <div className="relative z-[1] space-y-4">
          <div className="space-y-1.5">
            <p className="journey-kicker">旅行版本已创建</p>
            <h2
              id="project-entry-choice-title"
              className="journey-title text-xl leading-[1.1] tracking-[-0.04em]"
            >
              {title}
            </h2>
            <p className="text-sm leading-6 text-[var(--ink-muted)]">
              {description}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onChooseWorkspace}
              disabled={isWorking}
              data-testid="project-entry-open-workspace"
              className="journey-entry-card flex h-full flex-col justify-between gap-3 px-4 py-4 text-left transition disabled:cursor-not-allowed disabled:opacity-70"
            >
              <div className="space-y-1.5">
                <p className="journey-kicker">方式一</p>
                <h3 className="text-base font-semibold text-[var(--ink)]">
                  {workspaceTitle}
                </h3>
                <p className="text-sm leading-6 text-[var(--ink-muted)]">
                  {workspaceDescription}
                </p>
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                /workspace
              </p>
            </button>

            <button
              type="button"
              onClick={onChooseRevision}
              disabled={isWorking}
              data-testid="project-entry-open-revision"
              className="journey-entry-card flex h-full flex-col justify-between gap-3 px-4 py-4 text-left transition disabled:cursor-not-allowed disabled:opacity-70"
            >
              <div className="space-y-1.5">
                <p className="journey-kicker">方式二</p>
                <h3 className="text-base font-semibold text-[var(--ink)]">
                  {revisionTitle}
                </h3>
                <p className="text-sm leading-6 text-[var(--ink-muted)]">
                  {revisionDescription}
                </p>
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                /create?source=revision
              </p>
            </button>
          </div>

          {errorMessage ? (
            <p className="rounded-[14px] border border-[var(--dusty-rose)] bg-[rgb(196_104_89_/_0.08)] px-3 py-2 text-sm leading-6 text-[var(--dusty-rose)]">
              {errorMessage}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isWorking}
              className="inline-flex min-h-9 items-center justify-center rounded-full border border-[var(--line)] px-3 py-1.5 text-sm font-semibold text-[var(--ink-muted)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              稍后再说
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
