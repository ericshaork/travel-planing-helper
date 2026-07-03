interface RegenerateShortcutProps {
  onJump: () => void;
}

export function RegenerateShortcut({ onJump }: RegenerateShortcutProps) {
  return (
    <section className="overflow-hidden border border-[var(--line-strong)] bg-[var(--sand-soft)] p-3.5 shadow-[3px_3px_0_var(--sand)] sm:p-5 sm:shadow-[4px_4px_0_var(--sand)]">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.14em] text-[var(--clay-deep)]">
            不想一路滑到底
          </p>
          <p className="mt-1.5 break-words text-sm leading-5 text-[var(--ink-muted)] sm:mt-2 sm:leading-6">
            这版不太对？可以先告诉我想怎么改。
          </p>
        </div>

        <button
          type="button"
          onClick={onJump}
          className="min-h-10 shrink-0 border border-[var(--ink)] bg-[var(--paper-bright)] px-3.5 py-2 text-sm font-semibold text-[var(--ink)] shadow-[2px_2px_0_var(--clay)] transition-transform duration-150 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] active:translate-y-0 sm:min-h-11 sm:px-4 sm:shadow-[3px_3px_0_var(--clay)]"
        >
          想改这版？跳到修改区
        </button>
      </div>
    </section>
  );
}
