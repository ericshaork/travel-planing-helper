"use client";

interface InspirationActionBarProps {
  selectedLabels: string[];
  onSearchArchives: () => void | Promise<void>;
  onCreateTrip: () => void | Promise<void>;
  onClear: () => void;
  searching?: boolean;
}

export function InspirationActionBar({
  selectedLabels,
  onSearchArchives,
  onCreateTrip,
  onClear,
  searching = false,
}: InspirationActionBarProps) {
  if (selectedLabels.length === 0) {
    return null;
  }

  return (
    <section className="rounded-[20px] border border-[rgba(214,205,187,0.55)] bg-[linear-gradient(180deg,rgba(255,253,247,0.88)_0%,rgba(250,244,232,0.82)_100%)] px-3.5 py-3 shadow-[0_8px_16px_rgba(88,76,57,0.04)]">
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--ink-faint)]">
            Selected Inspiration
          </p>
          <p className="mt-1 truncate text-sm leading-5 text-[var(--ink-muted)]">
            {selectedLabels.join(" / ")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void onSearchArchives()}
            className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[rgba(255,253,247,0.96)] px-4 text-sm font-semibold text-[var(--ink)] transition-transform hover:-translate-y-0.5"
          >
            {searching ? "正在找相关档案" : "搜索相关档案"}
          </button>
          <button
            type="button"
            onClick={() => void onCreateTrip()}
            className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--ink)] bg-[var(--ink)] px-4 text-sm font-semibold text-[var(--paper-bright)] transition-transform hover:-translate-y-0.5"
          >
            用这些灵感创建计划
          </button>
          <button
            type="button"
            onClick={onClear}
            className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--line)] bg-transparent px-4 text-sm font-semibold text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
          >
            清空
          </button>
        </div>
      </div>
    </section>
  );
}
