"use client";

import { useMemo, useState } from "react";

import { fetchExploreList } from "@/lib/explore/client";
import { filterV18ExploreVisibleArchives } from "@/lib/explore/display";
import {
  clearInspirationSelection,
  getInspirationSearchKeywords,
  getInspirationSelectionCount,
  getSelectedInspirationLabels,
  INSPIRATION_CATEGORY_CONFIG,
  toggleInspirationSelection,
} from "@/lib/explore/inspiration";
import type { ExploreTripListItem, InspirationSelection } from "@/lib/explore/types";

import { ExploreCard } from "./ExploreCard";
import { InspirationActionBar } from "./InspirationActionBar";
import { InspirationCategory } from "./InspirationCategory";
import { InspirationTagPanel } from "./InspirationTagPanel";

interface InspirationDeckProps {
  selection: InspirationSelection;
  onSelectionChange: (selection: InspirationSelection) => void;
  onGenerate?: () => void | Promise<void>;
  onOpenArchive?: (archiveId: string) => void;
}

function buildSearchableText(item: ExploreTripListItem) {
  return [
    item.city,
    item.cityCode,
    item.title,
    item.summary,
    item.theme,
    item.tripType,
    item.pace,
    ...(item.tags ?? []),
    ...(item.terrainTags ?? []),
    ...(item.cuisineTags ?? []),
    ...(item.seasonTags ?? []),
    ...(item.companionTags ?? []),
    ...(item.highlights ?? []),
  ]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ")
    .toLowerCase();
}

function rankArchiveMatches(
  items: ExploreTripListItem[],
  selection: InspirationSelection,
) {
  const keywords = getInspirationSearchKeywords(selection).map((keyword) =>
    keyword.trim().toLowerCase(),
  );

  if (keywords.length === 0) {
    return [];
  }

  return items
    .map((item) => {
      const haystack = buildSearchableText(item);
      const score = keywords.reduce(
        (count, keyword) => (haystack.includes(keyword) ? count + 1 : count),
        0,
      );

      return { item, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.item);
}

export function InspirationDeck({
  selection,
  onSelectionChange,
  onGenerate,
  onOpenArchive,
}: InspirationDeckProps) {
  const [searchingArchives, setSearchingArchives] = useState(false);
  const [archiveResults, setArchiveResults] = useState<ExploreTripListItem[]>([]);
  const [hasSearchedArchives, setHasSearchedArchives] = useState(false);
  const [searchError, setSearchError] = useState("");
  const selectedLabels = useMemo(
    () => getSelectedInspirationLabels(selection),
    [selection],
  );
  const totalSelections = getInspirationSelectionCount(selection);

  function handleToggleOption(key: keyof InspirationSelection, label: string) {
    onSelectionChange(toggleInspirationSelection(selection, key, label));
  }

  function handleClearSelection() {
    onSelectionChange(clearInspirationSelection());
    setArchiveResults([]);
    setHasSearchedArchives(false);
    setSearchError("");
  }

  async function handleSearchArchives() {
    if (totalSelections === 0) {
      return;
    }

    setSearchingArchives(true);
    setSearchError("");
    setHasSearchedArchives(true);

    try {
      const items = await fetchExploreList({ limit: 60 });
      const visibleItems = filterV18ExploreVisibleArchives(items);
      const rankedItems = rankArchiveMatches(visibleItems, selection).slice(0, 12);
      setArchiveResults(rankedItems);
    } catch (error) {
      setArchiveResults([]);
      setSearchError(
        error instanceof Error && error.message.trim()
          ? error.message
          : "暂时没把相关档案找出来，可以先直接用这些灵感创建一版。",
      );
    } finally {
      setSearchingArchives(false);
    }
  }

  return (
    <div className="space-y-2.5">
      <div className="space-y-1.5 rounded-[24px] bg-[rgba(255,250,241,0.38)] px-2 py-2">
        {INSPIRATION_CATEGORY_CONFIG.map((category) => (
          <div
            key={category.key}
            className="grid gap-3 border-b border-[rgba(214,205,187,0.48)] py-1.5 last:border-b-0 xl:grid-cols-[18.25rem_minmax(0,1fr)] xl:items-center"
          >
            <div className="xl:w-[18.25rem]">
              <InspirationCategory
                title={category.title}
                description={category.description}
                categoryKey={category.key}
                previewItems={category.options.slice(0, 4).map((option) => option.label)}
                selectedCount={selection[category.key]?.length ?? 0}
              />
            </div>

            <div className="min-w-0 flex-1">
              <InspirationTagPanel
                title={category.title}
                categoryKey={category.key}
                options={category.options.map((option) => option.label)}
                selected={selection[category.key] ?? []}
                onToggle={(label) => handleToggleOption(category.key, label)}
              />
            </div>
          </div>
        ))}
      </div>

      <InspirationActionBar
        selectedLabels={selectedLabels}
        searching={searchingArchives}
        onSearchArchives={handleSearchArchives}
        onCreateTrip={() => void onGenerate?.()}
        onClear={handleClearSelection}
      />

      {hasSearchedArchives ? (
        <section className="workspace-panel px-4 py-4 sm:px-5 sm:py-5">
          <div className="relative z-[1] space-y-4">
            <div className="max-w-2xl">
              <p className="workspace-kicker">RELATED ARCHIVES</p>
              <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--ink)]">
                先从这些现有档案看看
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                第一版先按已选灵感在现有档案池里做轻量匹配，不额外引入新的搜索系统。
              </p>
            </div>

            {searchError ? (
              <p className="text-sm leading-6 text-[var(--clay-deep)]">{searchError}</p>
            ) : null}

            {!searchError && archiveResults.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-[var(--line)] px-4 py-4">
                <p className="text-base font-semibold text-[var(--ink)]">
                  这组灵感暂时还没在现有档案里撞到特别近的结果
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                  可以直接用这些灵感创建一版计划，或者再补几个更具体的标签试试。
                </p>
              </div>
            ) : null}

            {!searchError && archiveResults.length > 0 ? (
              <div className="grid gap-4 lg:grid-cols-3">
                {archiveResults.map((item, index) => (
                  <ExploreCard
                    key={item.id}
                    item={item}
                    priorityImage={index === 0}
                    onOpenArchive={onOpenArchive}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
