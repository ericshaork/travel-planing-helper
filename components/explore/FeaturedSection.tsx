"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { useEffect, useState } from "react";

import { fetchExploreList } from "@/lib/explore/client";
import type { ExploreTripListItem } from "@/lib/explore/types";
import { getFeaturedImageCandidates } from "@/lib/explore/image-resolver";

import { ResolvedImage } from "./ResolvedImage";

interface FeaturedSectionProps {
  onOpenArchive?: (archiveId: string) => void;
}

export function FeaturedSection({ onOpenArchive }: FeaturedSectionProps) {
  const [archiveWallCards, setArchiveWallCards] = useState<ExploreTripListItem[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
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
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const [heroCard, ...gridCards] = archiveWallCards;

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

  if (!heroCard) {
    return null;
  }

  return (
    <section className="workspace-panel px-4 py-4 sm:px-5 sm:py-5">
      <div className="relative z-[1] space-y-5">
        <div className="max-w-2xl">
          <p className="workspace-kicker">精选档案</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--ink)] sm:text-[2rem]">
            先翻开一张封面，再继续往下逛
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
            这一组档案会把不同城市的旅行节奏铺开。现在优先展示 v1.8 标准化档案库里的中国内容。
          </p>
        </div>

        <article className="overflow-hidden rounded-[28px] border border-[var(--line)] bg-[rgba(255,253,247,0.84)] shadow-[0_18px_38px_rgba(84,71,53,0.08)]">
          <div className="grid gap-0 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="relative min-h-[26rem] overflow-hidden">
              <ResolvedImage
                sources={getFeaturedImageCandidates(heroCard)}
                alt={heroCard.city}
                sizes="(min-width: 1024px) 56vw, 100vw"
                wrapperClassName="absolute inset-0 bg-[var(--paper)]"
                imageClassName="object-cover"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,21,18,0.03)_0%,rgba(18,21,18,0.12)_48%,rgba(18,21,18,0.44)_100%)]" />
              <div className="absolute inset-x-6 bottom-6 text-[var(--paper-bright)]">
                <p className="text-[11px] font-semibold tracking-[0.16em] text-[rgba(255,253,247,0.82)]">
                  精选档案
                </p>
                <h3 className="mt-2 text-3xl font-semibold tracking-[-0.05em] sm:text-[2.8rem]">
                  {heroCard.city}
                </h3>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[rgba(255,253,247,0.92)] sm:text-[15px]">
                  {heroCard.summary}
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-between px-5 py-5 sm:px-6 sm:py-6">
              <div>
                <p className="workspace-kicker">封面城市</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
                  {heroCard.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
                  {heroCard.archiveIntro || heroCard.summary}
                </p>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {heroCard.tags.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[rgba(223,232,216,0.54)] px-3 py-1 text-xs text-[var(--sage-deep)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-6">
                <Link
                  href={`/explore/${heroCard.slug}`}
                  onClick={(event) => handleOpenArchive(event, heroCard.slug)}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--ink)] bg-[rgba(255,253,247,0.92)] px-5 py-2.5 text-sm font-semibold text-[var(--ink)]"
                >
                  阅读档案 →
                </Link>
              </div>
            </div>
          </div>
        </article>

        <div className="grid gap-4 lg:grid-cols-4">
          {gridCards.map((item) => (
            <article
              key={item.slug}
              className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-[rgba(255,253,247,0.8)] shadow-[0_10px_24px_rgba(84,71,53,0.05)]"
            >
              <div className="relative aspect-[16/11] overflow-hidden">
                <ResolvedImage
                  sources={getFeaturedImageCandidates(item)}
                  alt={item.city}
                  sizes="(min-width: 1024px) 22vw, 100vw"
                  wrapperClassName="absolute inset-0 bg-[var(--paper)]"
                  imageClassName="object-cover"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,22,20,0.02)_0%,rgba(20,22,20,0.12)_52%,rgba(20,22,20,0.34)_100%)]" />
                <div className="absolute inset-x-4 bottom-4 text-[var(--paper-bright)]">
                  <p className="text-[11px] font-semibold tracking-[0.16em] text-[rgba(255,253,247,0.82)]">
                    旅行档案
                  </p>
                  <p className="mt-2 text-xl font-semibold tracking-[-0.04em]">{item.city}</p>
                </div>
              </div>

              <div className="space-y-3 px-4 py-4">
                <h3 className="text-lg font-semibold tracking-[-0.03em] text-[var(--ink)]">
                  {item.title}
                </h3>
                <p className="text-sm leading-6 text-[var(--ink-muted)]">{item.summary}</p>
                <div className="flex flex-wrap gap-2">
                  {item.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-[rgba(223,232,216,0.54)] px-3 py-1 text-xs text-[var(--sage-deep)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="pt-1">
                  <Link
                    href={`/explore/${item.slug}`}
                    onClick={(event) => handleOpenArchive(event, item.slug)}
                    className="inline-flex min-h-10 items-center justify-center rounded-full border border-[var(--ink)] bg-[rgba(255,253,247,0.92)] px-4 py-2 text-sm font-semibold text-[var(--ink)]"
                  >
                    阅读档案 →
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
