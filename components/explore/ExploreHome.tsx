"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { fetchExploreList } from "@/lib/explore/client";
import { startExploreCreateFlow } from "@/lib/explore/flow";
import { buildTripPlanDraftFromInspiration } from "@/lib/explore/to-trip-draft";
import type { InspirationSelection } from "@/lib/explore/types";

import { ArchiveDrawerShell } from "./archive/ArchiveDrawerShell";
import { CitySearchSection } from "./CitySearchSection";
import { FeaturedSection } from "./FeaturedSection";
import { InspirationDeck } from "./InspirationDeck";

function normalizeCityQuery(value: string) {
  return value.trim().toLowerCase();
}

interface DirectCreateSectionProps {
  onGenerate: () => void;
}

function DirectCreateSection({ onGenerate }: DirectCreateSectionProps) {
  const examples = ["深圳出发，厦门 3 天", "预算 3000，成都慢游", "杭州两天，轻松一点"];

  return (
    <section className="flex h-full flex-col justify-between rounded-[22px] border border-[rgba(214,205,187,0.5)] bg-[linear-gradient(180deg,rgba(255,253,247,0.88)_0%,rgba(248,241,228,0.8)_100%)] px-4 py-3 shadow-[0_8px_18px_rgba(88,76,57,0.05)]">
      <div>
        <p className="text-[10px] font-semibold tracking-[0.22em] text-[var(--ink-faint)]">
          AI 创建
        </p>
        <h2 className="mt-1 text-[1.02rem] font-semibold tracking-[-0.04em] text-[var(--ink)]">
          一句话生成你的私人旅行方案
        </h2>
        <p className="mt-1 text-[11px] leading-5 text-[var(--ink-muted)] sm:text-xs">
          选好的灵感会带入草稿，也可以直接输入一句话开始。
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {examples.map((example) => (
          <span
            key={example}
            className="rounded-full border border-[rgba(214,205,187,0.55)] bg-[rgba(255,253,247,0.82)] px-2.5 py-1 text-[10px] text-[var(--ink-muted)]"
          >
            {example}
          </span>
        ))}
      </div>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={onGenerate}
          className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--ink)] bg-[var(--ink)] px-4 text-sm font-semibold text-[var(--paper-bright)] shadow-[0_8px_16px_rgba(88,76,57,0.08)] transition-transform hover:-translate-y-0.5"
        >
          生成我的旅行
        </button>
      </div>
    </section>
  );
}

export function ExploreHome() {
  const router = useRouter();
  const [cityInput, setCityInput] = useState("");
  const [inspirationSelection, setInspirationSelection] =
    useState<InspirationSelection>({});
  const [selectedArchiveKey, setSelectedArchiveKey] = useState<string | null>(null);
  const [isArchiveDrawerOpen, setIsArchiveDrawerOpen] = useState(false);

  function resetFilters() {
    setCityInput("");
    setInspirationSelection({});
  }

  async function handleCitySearch() {
    const normalizedQuery = normalizeCityQuery(cityInput);

    if (!normalizedQuery) {
      return;
    }

    const items = await fetchExploreList({
      search: cityInput,
      limit: 24,
    });
    const matchedItem = items.find((item) => {
      const haystacks = [item.city, item.cityCode, item.slug, item.title].map(
        (value) => value.trim().toLowerCase(),
      );

      return haystacks.some(
        (value) => value === normalizedQuery || value.includes(normalizedQuery),
      );
    });

    if (matchedItem) {
      handleOpenArchive(matchedItem.slug);
    }
  }

  function handleGenerateFromInspiration() {
    const draft = buildTripPlanDraftFromInspiration(inspirationSelection, {
      cityQuery: cityInput,
    });
    startExploreCreateFlow(draft, router);
  }

  function handleOpenArchive(slug: string) {
    setSelectedArchiveKey(slug);
    setIsArchiveDrawerOpen(true);
  }

  function handleCloseArchiveDrawer() {
    setIsArchiveDrawerOpen(false);
  }

  return (
    <>
      <div
        aria-hidden={!isArchiveDrawerOpen}
        className={`space-y-3 transition-[filter,opacity] duration-300 sm:space-y-3.5 ${
          isArchiveDrawerOpen
            ? "pointer-events-none select-none opacity-80 blur-[0.5px]"
            : "opacity-100"
        }`}
      >
        <section className="rounded-[30px] border border-[rgba(214,205,187,0.46)] bg-[linear-gradient(180deg,rgba(255,252,244,0.93)_0%,rgba(250,244,233,0.88)_100%)] px-4 py-3 shadow-[0_10px_22px_rgba(88,76,57,0.04)] supports-[backdrop-filter]:bg-[rgba(255,252,244,0.9)] supports-[backdrop-filter]:backdrop-blur-[2px] sm:px-5">
          <div className="space-y-3">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.72fr)] xl:items-stretch">
              <CitySearchSection
                cityQuery={cityInput}
                onCityQueryChange={setCityInput}
                onSearch={handleCitySearch}
                onReset={resetFilters}
              />

              <DirectCreateSection onGenerate={handleGenerateFromInspiration} />
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="workspace-kicker text-[var(--sage-deep)]">
                    灵感筛选
                  </p>
                  <h2 className="mt-1 text-[1.12rem] font-semibold tracking-[-0.04em] text-[var(--ink)]">
                    地点、美食、季节和同行方式都先摊开看看
                  </h2>
                </div>
                <p className="text-[11px] leading-5 text-[var(--ink-muted)] sm:text-xs">
                  多选会保留偏好。下面可以搜档案，也可以直接生成计划。
                </p>
              </div>

              <InspirationDeck
                selection={inspirationSelection}
                onSelectionChange={setInspirationSelection}
                onGenerate={handleGenerateFromInspiration}
                onOpenArchive={handleOpenArchive}
              />
            </div>
          </div>
        </section>

        <FeaturedSection onOpenArchive={handleOpenArchive} />
      </div>

      <ArchiveDrawerShell
        archiveId={isArchiveDrawerOpen ? selectedArchiveKey : null}
        isOpen={isArchiveDrawerOpen}
        onClose={handleCloseArchiveDrawer}
      />
    </>
  );
}
