"use client";

export function SaveBar({
  isSaving,
  successMessage,
  saveError,
  statusHint,
  onSave,
  onReset,
  saveDisabled,
  resetDisabled,
}: {
  isSaving: boolean;
  successMessage?: string;
  saveError?: string;
  statusHint: string;
  onSave: () => void;
  onReset: () => void;
  saveDisabled: boolean;
  resetDisabled: boolean;
}) {
  return (
    <div className="profile-save-card p-4">
      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[var(--ink)]">保存默认偏好</p>
          <p className="text-sm leading-6 text-[var(--ink-muted)]">{statusHint}</p>
          {successMessage ? (
            <p className="text-sm font-semibold text-[var(--sage-deep)]">{successMessage}</p>
          ) : null}
          {saveError ? (
            <p className="text-sm font-semibold text-[var(--clay-deep)]">{saveError}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onReset}
            disabled={resetDisabled}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--paper-bright)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--paper)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            恢复默认
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saveDisabled}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-[var(--ink)] bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-[var(--paper-bright)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "正在保存..." : "保存默认偏好"}
          </button>
        </div>
      </div>
    </div>
  );
}
