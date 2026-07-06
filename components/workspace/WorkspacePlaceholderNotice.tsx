interface WorkspacePlaceholderNoticeProps {
  title?: string;
  message?: string;
}

export function WorkspacePlaceholderNotice({
  title = "后续开放",
  message = "该功能将在后续版本开放。",
}: WorkspacePlaceholderNoticeProps) {
  return (
    <div className="rounded-[18px] border border-dashed border-[var(--line-strong)] bg-[var(--paper)] px-3 py-3 text-sm leading-6 text-[var(--ink-muted)]">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--clay-deep)]">
        {title}
      </p>
      <p className="mt-1.5">{message}</p>
    </div>
  );
}
