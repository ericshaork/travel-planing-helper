import Link from "next/link";

import { UserMenu } from "@/components/auth/UserMenu";

export function Header() {
  return (
    <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-8 sm:py-7">
      <div className="flex min-w-0 items-center gap-3" aria-label="漫游草签">
        <span
          aria-hidden="true"
          className="grid size-8 shrink-0 -rotate-3 place-items-center border border-[var(--ink)] bg-[var(--paper)] shadow-[3px_3px_0_var(--sand-deep)]"
        >
          <span className="size-2 rounded-full bg-[var(--clay)]" />
        </span>
        <div className="min-w-0">
          <p className="break-words text-sm font-bold tracking-[0.14em]">
            漫游草签
          </p>
          <p className="break-words text-[11px] text-[var(--ink-muted)]">
            自由行路线整理
          </p>
        </div>
      </div>

      <div className="flex max-w-full items-center gap-3">
        <Link
          href="/trips"
          className="inline-flex min-h-10 items-center rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-3 py-2 text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--paper-bright)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
        >
          我的行程
        </Link>
        <p className="text-right text-xs leading-5 text-[var(--ink-muted)] sm:block">
          不卖课，只帮你先想清楚
        </p>
        <UserMenu />
      </div>
    </header>
  );
}
