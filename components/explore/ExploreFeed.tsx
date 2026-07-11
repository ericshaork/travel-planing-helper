"use client";

import { useEffect, useState } from "react";

import { fetchExploreList } from "@/lib/explore/client";
import type {
  ExploreTripListFilters,
  ExploreTripListItem,
} from "@/lib/explore/types";

import { ExploreCard } from "./ExploreCard";

interface ExploreFeedProps {
  title?: string;
  description?: string;
  filters?: ExploreTripListFilters;
  emptyTitle?: string;
  emptyMessage?: string;
  onOpenArchive?: (slug: string) => void;
}

export function ExploreFeed({
  title = "更多档案",
  description = "继续往下翻，还有更多城市、美食和路线灵感。",
  filters = {},
  emptyTitle = "暂时还没有更多档案",
  emptyMessage = "可以先清掉筛选，回到完整的旅行档案池继续浏览。",
  onOpenArchive,
}: ExploreFeedProps) {
  const [items, setItems] = useState<ExploreTripListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const nextItems = await fetchExploreList(
          JSON.parse(filterKey) as ExploreTripListFilters,
        );

        if (!active) {
          return;
        }

        setItems(nextItems);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setItems([]);
        setError(
          loadError instanceof Error && loadError.message.trim()
            ? loadError.message
            : "旅行档案暂时不可用。",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [filterKey]);

  return (
    <section className="workspace-panel px-4 py-4 sm:px-5 sm:py-5">
      <div className="relative z-[1] space-y-4">
        <div className="max-w-2xl">
          <p className="workspace-kicker">{title}</p>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
            {description}
          </p>
        </div>

        {loading ? (
          <p className="text-sm leading-6 text-[var(--ink-muted)]">
            正在翻找更多旅行档案...
          </p>
        ) : null}

        {!loading && error ? (
          <p className="text-sm leading-6 text-[var(--clay-deep)]">{error}</p>
        ) : null}

        {!loading && !error && items.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-[var(--line)] px-4 py-4">
            <h2 className="text-base font-semibold text-[var(--ink)]">
              {emptyTitle}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
              {emptyMessage}
            </p>
          </div>
        ) : null}

        {!loading && !error && items.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {items.map((item, index) => (
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
  );
}
