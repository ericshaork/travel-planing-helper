"use client";

import { Fragment, useEffect, useMemo, useState } from "react";

import { fetchExploreList } from "@/lib/explore/client";
import {
  CURATED_ARCHIVE_ENTRIES,
  getStandardArchives,
  splitFeaturedArchives,
  type CuratedArchiveEntry,
} from "@/lib/explore/curated-archives";
import { displayCityName } from "@/lib/explore/display-city";
import type { ExploreTripListItem } from "@/lib/explore/types";

import { ArchiveSheetCard } from "./ArchiveSheetCard";
import { CuratedArchiveCard } from "./CuratedArchiveCard";

interface FeaturedSectionProps {
  onOpenArchive?: (archiveId: string) => void;
  onCreateFromArchive?: (archiveId: string) => void | Promise<void>;
}

export function FeaturedSection({
  onOpenArchive,
  onCreateFromArchive,
}: FeaturedSectionProps) {
  const [realByCity, setRealByCity] = useState<Record<string, ExploreTripListItem>>(
    {},
  );

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const items = await fetchExploreList({ featured: true, limit: 12 });

        if (!active) {
          return;
        }

        const map: Record<string, ExploreTripListItem> = {};
        for (const item of items) {
          map[displayCityName(item.city, item.cityCode)] = item;
        }
        setRealByCity(map);
      } catch {
        // 真实档案读不出来时保留 mock 数据，点击走抽屉兜底提示
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const entries = useMemo(
    () =>
      CURATED_ARCHIVE_ENTRIES.map((entry) => {
        const real = realByCity[entry.city];

        return real
          ? {
              ...entry,
              slug: real.slug,
              coverImageUrl: real.coverImageUrl ?? entry.coverImageUrl,
            }
          : entry;
      }),
    [realByCity],
  );

  const { main, secondary, mini } = splitFeaturedArchives(entries);
  const standard = getStandardArchives(entries);

  function handleOpen(entry: CuratedArchiveEntry) {
    onOpenArchive?.(entry.slug ?? entry.id);
  }

  function handleCreate(entry: CuratedArchiveEntry) {
    if (!onCreateFromArchive) {
      handleOpen(entry);
      return;
    }

    void onCreateFromArchive(entry.slug ?? entry.id);
  }

  return (
    <>
      <section className="explore-zone relative px-2 pb-3 pt-2 sm:px-3 sm:pb-4">
        <div className="relative z-[1] space-y-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
              <div>
                <p className="workspace-kicker">策展精选 · CURATED ARCHIVES</p>
                <h2
                  className="mt-1.5 text-[1.35rem] font-semibold tracking-[-0.03em] text-[var(--ink)] sm:text-[1.5rem]"
                  style={{ fontFamily: "var(--font-serif-display)" }}
                >
                  精选旅行档案
                </h2>
                <p className="mt-1.5 text-[12.5px] leading-6 text-[var(--ink-muted)]">
                  编辑先翻一遍档案箱，把最值得走的路线放在最前面。
                </p>
              </div>
              <p className="archive-more-note" aria-hidden="true">
                picked by editors · 手帖摘录 No.7
              </p>
            </div>
            <div className="flex items-center gap-2.5" aria-hidden="true">
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                className="text-[rgba(122,63,49,0.5)]"
              >
                <circle
                  cx="8"
                  cy="8"
                  r="5.6"
                  stroke="currentColor"
                  strokeWidth="0.9"
                  strokeDasharray="2.4 2.2"
                />
                <path
                  d="M8 5.6v4.8M5.6 8h4.8"
                  stroke="currentColor"
                  strokeWidth="0.9"
                  strokeLinecap="round"
                />
              </svg>
              <span className="h-px flex-1 bg-[linear-gradient(90deg,rgba(139,105,62,0.3),rgba(139,105,62,0.05))]" />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.62fr)_minmax(0,1fr)]">
            {main ? (
              <CuratedArchiveCard
                variant="main"
                entry={main}
                onOpen={handleOpen}
                onCreate={handleCreate}
              />
            ) : null}
            <div className="grid content-stretch gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {secondary.map((entry) => (
                <CuratedArchiveCard
                  key={entry.id}
                  variant="secondary"
                  entry={entry}
                  onOpen={handleOpen}
                />
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {mini.map((entry) => (
              <CuratedArchiveCard
                key={entry.id}
                variant="mini"
                entry={entry}
                onOpen={handleOpen}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="archive-more-section relative px-1 pt-1 sm:px-2">
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
        <div className="relative z-[1] space-y-2">
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
            <p className="workspace-kicker">更多旅行档案 · MORE ARCHIVES</p>
            <p className="archive-more-note" aria-hidden="true">
              field notes · city walks · keep turning the pages
            </p>
          </div>
          <div className="flex items-center gap-2.5" aria-hidden="true">
            <svg
              width="15"
              height="15"
              viewBox="0 0 16 16"
              fill="none"
              className="text-[rgba(122,63,49,0.55)]"
            >
              <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="0.9" />
              <path
                d="M8 3.4 9.2 6.8 12.6 8 9.2 9.2 8 12.6 6.8 9.2 3.4 8 6.8 6.8Z"
                stroke="currentColor"
                strokeWidth="0.9"
                strokeLinejoin="round"
              />
            </svg>
            <span className="h-px flex-1 bg-[linear-gradient(90deg,rgba(139,105,62,0.32),rgba(139,105,62,0.06))]" />
          </div>
        </div>

        <div className="relative z-[1] mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {standard.map((entry, index) => (
            <Fragment key={entry.id}>
              <ArchiveSheetCard entry={entry} onOpen={handleOpen} />
              {(index + 1) % 3 === 0 && index + 1 < standard.length ? (
                <div
                  aria-hidden="true"
                  className="archive-sheet-divider col-span-full hidden lg:block"
                />
              ) : null}
            </Fragment>
          ))}
        </div>
      </section>
    </>
  );
}
