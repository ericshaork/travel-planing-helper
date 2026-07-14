"use client";

interface CitySearchSectionProps {
  cityQuery: string;
  onCityQueryChange: (value: string) => void;
  onSearch: () => void | Promise<void>;
  onReset: () => void;
}

export function CitySearchSection({
  cityQuery,
  onCityQueryChange,
  onSearch,
  onReset,
}: CitySearchSectionProps) {
  return (
    <section className="space-y-2 border-b border-[rgba(214,205,187,0.55)] pb-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--ink-faint)]">
            Travel Archive
          </p>
          <h1 className="mt-1 text-[1.62rem] font-semibold tracking-[-0.05em] text-[var(--ink)] sm:text-[1.78rem]">
            发现下一段旅程灵感
          </h1>
        </div>
        <p className="text-[11px] leading-5 text-[var(--ink-muted)] sm:text-xs">
          先搜现成档案，也可以直接从下面的灵感开始。
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-[16px] border border-[rgba(214,205,187,0.62)] bg-[rgba(255,253,247,0.62)] px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] lg:flex-row lg:items-center">
        <input
          value={cityQuery}
          onChange={(event) => onCityQueryChange(event.target.value)}
          placeholder="想找一个适合周末慢慢逛的海边城市"
          className="h-10 flex-1 rounded-[12px] border border-[rgba(214,205,187,0.82)] bg-[rgba(255,253,247,0.94)] px-3.5 text-[15px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)]"
        />
        <div className="flex items-center gap-2 self-end lg:self-auto">
          <button
            type="button"
            onClick={() => void onSearch()}
            className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[rgba(255,253,247,0.96)] px-4 text-sm font-semibold text-[var(--ink)]"
          >
            搜索探索
          </button>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--line)] bg-transparent px-4 text-sm font-semibold text-[var(--ink-muted)]"
          >
            清空
          </button>
        </div>
      </div>

      <p className="truncate text-[11px] leading-5 text-[var(--ink-muted)]">
        例如：周末慢逛的海边城市 / 预算 3000 的毕业旅行 / 适合情侣的两天小城路线
      </p>
    </section>
  );
}
