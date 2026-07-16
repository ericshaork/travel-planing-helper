import Link from "next/link";

export function TripsEmptyState() {
  return (
    <section className="workspace-panel px-5 py-5 sm:px-6 sm:py-6">
      <div className="relative z-[1] max-w-2xl">
        <p className="workspace-kicker">还没有保存计划</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--ink)] sm:text-3xl">
          这里还没有存下来的行程。
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)] sm:text-[15px] sm:leading-7">
          可以先让 AI 排一版，也可以去 Explore 找灵感，或者从空白工作台慢慢写。
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/create"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--ink)] bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-[var(--paper-bright)] shadow-[4px_4px_0_var(--clay)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
          >
            AI 创建计划
          </Link>
          <Link
            href="/create"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--line)] px-5 py-2.5 text-sm font-semibold text-[var(--ink-muted)]"
          >
            从空白计划开始
          </Link>
          <Link
            href="/explore"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--line)] px-5 py-2.5 text-sm font-semibold text-[var(--ink-muted)]"
          >
            去探索灵感
          </Link>
        </div>
      </div>
    </section>
  );
}
