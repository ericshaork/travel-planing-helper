export function Header() {
  return (
    <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-8 sm:py-7">
      <div className="flex min-w-0 items-center gap-3" aria-label="漫游草稿">
        <span
          aria-hidden="true"
          className="grid size-8 shrink-0 -rotate-3 place-items-center border border-[var(--ink)] bg-[var(--paper)] shadow-[3px_3px_0_var(--sand-deep)]"
        >
          <span className="size-2 rounded-full bg-[var(--clay)]" />
        </span>
        <div className="min-w-0">
          <p className="break-words text-sm font-bold tracking-[0.14em]">
            漫游草稿
          </p>
          <p className="break-words text-[11px] text-[var(--ink-muted)]">
            自由行路线整理
          </p>
        </div>
      </div>

      <p className="max-w-full text-right text-xs leading-5 text-[var(--ink-muted)] sm:block">
        不卖票，只帮你先想清楚
      </p>
    </header>
  );
}
