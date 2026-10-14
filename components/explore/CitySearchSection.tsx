"use client";

interface CitySearchSectionProps {
  cityQuery: string;
  onCityQueryChange: (value: string) => void;
  onSearch: () => void | Promise<void>;
  onReset: () => void;
  onGenerate: () => void | Promise<void>;
}

const QUICK_CHIPS = [
  "深圳出发",
  "厦门 3 天",
  "预算 3000",
  "海边慢游",
  "情侣周末",
  "杭州两天",
];

function Sparkle({ className }: { className?: string }) {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M6 1.2 7.1 4.5 10.4 5.6 7.1 6.7 6 10 4.9 6.7 1.6 5.6 4.9 4.5Z"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CitySearchSection({
  cityQuery,
  onCityQueryChange,
  onSearch,
  onReset,
  onGenerate,
}: CitySearchSectionProps) {
  function handleChipClick(chip: string) {
    const current = cityQuery.trim();
    if (current.includes(chip)) {
      return;
    }
    onCityQueryChange(current ? `${current}，${chip}` : chip);
  }

  const hasQuery = cityQuery.trim().length > 0;

  return (
    <section className="relative">
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,0.38fr)_minmax(0,0.62fr)] lg:items-center lg:gap-10">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.34em] text-[rgba(98,102,94,0.78)]">
            <Sparkle className="text-[rgba(173,96,72,0.6)]" />
            Travel Archive
          </p>

          <h1
            className="mt-2 text-[1.48rem] font-semibold leading-[1.32] tracking-[-0.015em] text-[var(--ink)] lg:text-[1.62rem]"
            style={{ fontFamily: "var(--font-serif-display)" }}
          >
            发现下一段旅程灵感
          </h1>

          <p className="mt-1.5 max-w-[24rem] text-[12.5px] leading-6 text-[rgba(98,102,94,0.88)]">
            输入目的地、预算、天数或旅行心情，也可以从下方灵感开始。
          </p>
        </div>

        <div>
          <div className="explore-search-console">
            <label className="explore-search-field">
              <svg
                className="explore-search-icon"
                width="15"
                height="15"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <circle cx="7" cy="7" r="4.25" stroke="currentColor" strokeWidth="1.4" />
                <path
                  d="m10.4 10.4 3 3"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
              <input
                value={cityQuery}
                onChange={(event) => onCityQueryChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void onSearch();
                  }
                }}
                placeholder="例如：深圳出发，厦门 3 天，想看海、吃小吃、节奏慢一点"
                aria-label="旅行灵感搜索"
                className="explore-search-input"
              />
            </label>

            {hasQuery ? (
              <button type="button" onClick={onReset} className="explore-search-clear">
                清空
              </button>
            ) : null}

            <div className="explore-search-actions">
              <button
                type="button"
                onClick={() => void onSearch()}
                className="explore-search-action explore-search-action--secondary"
              >
                搜索灵感
              </button>
              <button
                type="button"
                onClick={() => void onGenerate()}
                className="explore-search-action explore-search-action--primary"
              >
                生成旅行
              </button>
            </div>
          </div>

          <div className="no-scrollbar mt-3 flex items-center gap-2 overflow-x-auto">
            <span className="shrink-0 text-[10.5px] font-medium tracking-[0.06em] text-[rgba(122,98,68,0.66)]">
              热门灵感：
            </span>
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleChipClick(chip)}
                className="explore-chip"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
