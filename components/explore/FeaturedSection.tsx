"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { useEffect, useState } from "react";

import {
  cleanDisplayText,
  formatDaysText,
  formatTripTypeLabel,
} from "@/lib/explore/archive-display";
import { fetchExploreList } from "@/lib/explore/client";
import { displayCityName } from "@/lib/explore/display-city";
import { getFeaturedImageCandidates } from "@/lib/explore/image-resolver";
import type { ExploreTripListItem } from "@/lib/explore/types";

import { ExploreCard } from "./ExploreCard";
import { ResolvedImage } from "./ResolvedImage";

interface FeaturedSectionProps {
  onOpenArchive?: (archiveId: string) => void;
  onCreateFromArchive?: (archiveId: string) => void | Promise<void>;
}

function visibleTags(item: ExploreTripListItem) {
  return [...(item.highlights ?? []), ...(item.tags ?? [])]
    .map((tag) => cleanDisplayText(tag))
    .filter(Boolean)
    .slice(0, 5);
}

export function FeaturedSection({
  onOpenArchive,
  onCreateFromArchive,
}: FeaturedSectionProps) {
  const [archiveWallCards, setArchiveWallCards] = useState<ExploreTripListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setErrorText("");

      try {
        const items = await fetchExploreList({
          featured: true,
          limit: 9,
        });

        if (active) {
          setArchiveWallCards(items);
        }
      } catch {
        if (active) {
          setArchiveWallCards([]);
          setErrorText("这批旅行档案刚刚没读出来，先别急，刷新后会再试一次。");
        }
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
  }, []);

  const [heroCard, ...gridCards] = archiveWallCards;
  const heroCityName = heroCard ? displayCityName(heroCard.city, heroCard.cityCode) : "";

  function handleOpenArchive(
    event: MouseEvent<HTMLAnchorElement>,
    archiveId: string,
  ) {
    if (!onOpenArchive) {
      return;
    }

    event.preventDefault();
    onOpenArchive(archiveId);
  }

  function handleCreateFromArchive(
    event: MouseEvent<HTMLAnchorElement>,
    archiveId: string,
  ) {
    if (!onCreateFromArchive) {
      handleOpenArchive(event, archiveId);
      return;
    }

    event.preventDefault();
    void onCreateFromArchive(archiveId);
  }

  if (loading) {
    return (
      <section className="workspace-panel px-4 py-5 sm:px-5">
        <p className="workspace-kicker">精选档案</p>
        <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
          正在翻开五座城市的旅行档案...
        </p>
      </section>
    );
  }

  if (!heroCard) {
    return (
      <section className="workspace-panel px-4 py-5 sm:px-5">
        <p className="workspace-kicker">精选档案</p>
        <h2 className="mt-2 text-lg font-semibold text-[var(--ink)]">
          暂时没有可展示的旅行档案
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
          {errorText || "如果 Trip Package 暂时不可用，Explore 会继续保留旧档案作为兜底。"}
        </p>
      </section>
    );
  }

  return (
    <section className="workspace-panel px-4 py-4 sm:px-5 sm:py-5">
      <div className="relative z-[1] space-y-5">
        <div className="max-w-2xl">
          <p className="workspace-kicker">精选档案</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--ink)] sm:text-[2rem]">
            先翻开五座城市的旅行手帐
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
            北京、杭州、成都、上海和西安已经接入 Trip Package。先看一眼路线气质，再决定要不要把它带进工作台。
          </p>
        </div>

        <article className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-[rgba(255,253,247,0.84)] shadow-[0_18px_38px_rgba(84,71,53,0.08)]">
          <div className="grid gap-0 lg:grid-cols-[1.25fr_0.75fr]">
            <Link
              href={`/explore/${heroCard.slug}`}
              onClick={(event) => handleOpenArchive(event, heroCard.slug)}
              className="group relative min-h-[26rem] overflow-hidden"
              aria-label={`打开 ${heroCard.title}`}
            >
              <ResolvedImage
                sources={getFeaturedImageCandidates(heroCard)}
                alt={`${heroCityName} ${heroCard.title} 封面`}
                sizes="(min-width: 1024px) 56vw, 100vw"
                priority
                wrapperClassName="absolute inset-0 bg-[var(--paper)]"
                imageClassName="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,21,18,0.03)_0%,rgba(18,21,18,0.12)_48%,rgba(18,21,18,0.44)_100%)]" />
              <div className="absolute inset-x-6 bottom-6 text-[var(--paper-bright)]">
                <p className="text-[11px] font-semibold tracking-[0.16em] text-[rgba(255,253,247,0.82)]">
                  五城 Trip Package
                </p>
                <h3 className="mt-2 text-3xl font-semibold tracking-[-0.05em] sm:text-[2.8rem]">
                  {cleanDisplayText(heroCityName, "目的地")}
                </h3>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[rgba(255,253,247,0.92)] sm:text-[15px]">
                  {cleanDisplayText(heroCard.summary)}
                </p>
              </div>
            </Link>

            <div className="flex flex-col justify-between px-5 py-5 sm:px-6 sm:py-6">
              <div>
                <p className="workspace-kicker">封面城市</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
                  {cleanDisplayText(heroCard.title, "旅行计划")}
                </h3>
                <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
                  {cleanDisplayText(heroCard.archiveIntro || heroCard.summary)}
                </p>
              </div>

              <div className="mt-5 flex flex-wrap gap-2 text-xs font-medium text-[var(--ink-muted)]">
                <span className="rounded-full border border-[var(--line)] bg-[rgba(255,253,247,0.82)] px-2.5 py-1">
                  {formatDaysText(heroCard.days, "天数待定")}
                </span>
                <span className="rounded-full border border-[var(--line)] bg-[rgba(255,253,247,0.82)] px-2.5 py-1">
                  {formatTripTypeLabel(heroCard.tripType)}
                </span>
                {heroCard.pace ? (
                  <span className="rounded-full border border-[var(--line)] bg-[rgba(255,253,247,0.82)] px-2.5 py-1">
                    {cleanDisplayText(heroCard.pace)}
                  </span>
                ) : null}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {visibleTags(heroCard).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[rgba(223,232,216,0.54)] px-3 py-1 text-xs text-[var(--sage-deep)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={`/explore/${heroCard.slug}`}
                  onClick={(event) => handleOpenArchive(event, heroCard.slug)}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--ink)] bg-[rgba(255,253,247,0.92)] px-5 py-2.5 text-sm font-semibold text-[var(--ink)]"
                >
                  阅读档案
                </Link>
                <Link
                  href={`/explore/${heroCard.slug}`}
                  onClick={(event) => handleCreateFromArchive(event, heroCard.slug)}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[rgba(248,241,228,0.78)] px-5 py-2.5 text-sm font-semibold text-[var(--clay-deep)]"
                >
                  用此行程创建
                </Link>
              </div>
            </div>
          </div>
        </article>

        <div className="grid gap-4 lg:grid-cols-4">
          {gridCards.map((item) => (
            <ExploreCard
              key={item.slug}
              item={item}
              onOpenArchive={onOpenArchive}
              onCreateFromArchive={onCreateFromArchive}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
