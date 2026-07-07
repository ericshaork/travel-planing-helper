import Link from "next/link";

export function TripsEmptyState() {
  return (
    <section className="workspace-panel px-5 py-5 sm:px-6 sm:py-6">
      <div className="relative z-[1] max-w-2xl">
        <p className="workspace-kicker">NO SAVED TRIPS YET</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--ink)] sm:text-3xl">
          你还没有存下来的行程。
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)] sm:text-[15px] sm:leading-7">
          先去生成一版，满意了再点保存。等 phase 6 开始后，这里再接“打开历史计划”。
        </p>
        <Link
          href="/create"
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--ink)] bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-[var(--paper-bright)] shadow-[4px_4px_0_var(--clay)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
        >
          去创建新计划
        </Link>
      </div>
    </section>
  );
}
