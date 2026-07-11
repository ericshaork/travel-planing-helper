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
    <section className="workspace-panel px-5 py-5 sm:px-6 sm:py-6">
      <div className="relative z-[1] space-y-5">
        <div>
          <p className="workspace-kicker">TRAVEL ARCHIVE</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[var(--ink)] sm:text-[2.6rem]">
            发现下一段旅程灵感
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ink-muted)] sm:text-[15px]">
            先看看别人怎样走，再决定要不要立刻开始做自己的版本。
          </p>
        </div>

        <div className="rounded-[26px] border border-[var(--line)] bg-[rgba(255,253,247,0.88)] px-4 py-4 shadow-[0_12px_28px_rgba(88,76,57,0.06)] sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <input
              value={cityQuery}
              onChange={(event) => onCityQueryChange(event.target.value)}
              placeholder="想找一个适合周末慢慢逛的海边城市"
              className="min-h-14 flex-1 rounded-[20px] border border-[rgba(214,205,187,0.9)] bg-[rgba(255,253,247,0.95)] px-5 py-4 text-base text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)]"
            />
            <div className="flex gap-2 self-end lg:self-auto">
              <button
                type="button"
                onClick={() => void onSearch()}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[rgba(255,253,247,0.92)] px-4 py-2 text-sm font-semibold text-[var(--ink)]"
              >
                搜索探索
              </button>
              <button
                type="button"
                onClick={onReset}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--line)] bg-transparent px-4 py-2 text-sm font-semibold text-[var(--ink-muted)]"
              >
                清空
              </button>
            </div>
          </div>

          <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
            例如：适合周末慢慢逛的海边城市、预算 3000 元的毕业旅行、适合情侣的两天小城路线
          </p>
        </div>
      </div>
    </section>
  );
}
