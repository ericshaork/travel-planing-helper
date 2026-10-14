"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { fetchExploreDetail, fetchExploreList } from "@/lib/explore/client";
import { startExploreCreateFlow } from "@/lib/explore/flow";
import { buildTripPlanDraftFromExplore } from "@/lib/explore/to-trip-draft";
import type { InspirationSelection } from "@/lib/explore/types";

import { ArchiveDrawerShell } from "./archive/ArchiveDrawerShell";
import { CitySearchSection } from "./CitySearchSection";
import { FeaturedSection } from "./FeaturedSection";
import { InspirationDeck } from "./InspirationDeck";

function normalizeCityQuery(value: string) {
  return value.trim().toLowerCase();
}

export function ExploreHome() {
  const router = useRouter();
  const [cityInput, setCityInput] = useState("");
  const [inspirationSelection, setInspirationSelection] =
    useState<InspirationSelection>({});
  const [selectedArchiveKey, setSelectedArchiveKey] = useState<string | null>(null);
  const [isArchiveDrawerOpen, setIsArchiveDrawerOpen] = useState(false);
  const [isCreatingFromArchive, setIsCreatingFromArchive] = useState(false);

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
    router.push("/create");
  }

  function handleOpenArchive(slug: string) {
    setSelectedArchiveKey(slug);
    setIsArchiveDrawerOpen(true);
  }

  async function handleCreateFromArchive(slug: string) {
    if (isCreatingFromArchive) {
      return;
    }

    setIsCreatingFromArchive(true);

    try {
      const content = await fetchExploreDetail(slug);
      const draft = buildTripPlanDraftFromExplore(content);
      await startExploreCreateFlow(draft, router, {
        source: "explore_archive",
        archiveSlug: draft.sourceExploreSlug ?? slug,
      });
    } catch (error) {
      window.alert(
        error instanceof Error && error.message.trim()
          ? error.message
          : "用此行程创建没有成功，请稍后再试。",
      );
    } finally {
      setIsCreatingFromArchive(false);
    }
  }

  function handleCloseArchiveDrawer() {
    setIsArchiveDrawerOpen(false);
  }

  return (
    <>
      <div
        aria-hidden={isArchiveDrawerOpen}
        className={`space-y-3 transition-[filter,opacity] duration-300 sm:space-y-3.5 ${
          isArchiveDrawerOpen
            ? "pointer-events-none select-none opacity-80 blur-[0.5px]"
            : "opacity-100"
        }`}
      >
        <section className="explore-zone relative px-2 pb-3 pt-2 sm:px-3 sm:pb-4">
          <div className="space-y-5">
            <CitySearchSection
              cityQuery={cityInput}
              onCityQueryChange={setCityInput}
              onSearch={handleCitySearch}
              onReset={resetFilters}
              onGenerate={handleGenerateFromInspiration}
            />

            <div className="space-y-3">
              <div
                aria-hidden="true"
                className="h-px bg-[linear-gradient(90deg,rgba(145,111,72,0.3)_0%,rgba(145,111,72,0.12)_55%,rgba(145,111,72,0)_100%)]"
              />
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="workspace-kicker text-[var(--sage-deep)]">
                    灵感筛选
                  </p>
                  <h2 className="mt-1 text-[1.12rem] font-semibold tracking-[-0.04em] text-[var(--ink)]">
                    先选一个分类，翻一行精选灵感
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

        <div className="explore-zone-divider" aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M6 1.5v9M1.5 6h9M2.9 2.9l6.2 6.2M9.1 2.9 2.9 9.1"
              stroke="currentColor"
              strokeWidth="0.8"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <FeaturedSection
          onOpenArchive={handleOpenArchive}
          onCreateFromArchive={handleCreateFromArchive}
        />
      </div>

      <ArchiveDrawerShell
        archiveId={isArchiveDrawerOpen ? selectedArchiveKey : null}
        isOpen={isArchiveDrawerOpen}
        onClose={handleCloseArchiveDrawer}
      />
    </>
  );
}
