"use client";

import Link from "next/link";
import type { MouseEvent } from "react";

import {
  cleanDisplayText,
  formatDaysText,
  formatPaceLabel,
  formatTagLabel,
  formatTripTypeLabel,
} from "@/lib/explore/archive-display";
import { displayCityName } from "@/lib/explore/display-city";
import type { ExploreTripListItem } from "@/lib/explore/types";

import { getExploreFeedImageCandidates } from "../../lib/explore/image-resolver";

import { ResolvedImage } from "./ResolvedImage";

interface ExploreCardProps {
  item: ExploreTripListItem;
  priorityImage?: boolean;
  onOpenArchive?: (slug: string) => void;
  onCreateFromArchive?: (slug: string) => void | Promise<void>;
}

export function ExploreCard({
  item,
  priorityImage = false,
  onOpenArchive,
  onCreateFromArchive,
}: ExploreCardProps) {
  function handleOpenArchive(event: MouseEvent<HTMLAnchorElement>) {
    if (!onOpenArchive) {
      return;
    }

    event.preventDefault();
    onOpenArchive(item.slug);
  }

  function handleCreateFromArchive(event: MouseEvent<HTMLAnchorElement>) {
    if (!onCreateFromArchive) {
      handleOpenArchive(event);
      return;
    }

    event.preventDefault();
    void onCreateFromArchive(item.slug);
  }

  const visibleTags = [
    ...(item.highlights ?? []),
    ...(item.tags ?? []),
  ]
    .map(formatTagLabel)
    .filter(Boolean)
    .slice(0, 4);
  const cityName = displayCityName(item.city, item.cityCode);

  return (
    <article className="workspace-panel overflow-hidden px-4 py-4 sm:px-5 sm:py-5">
      <div className="relative z-[1] space-y-4">
        <Link
          href={`/explore/${item.slug}`}
          onClick={handleOpenArchive}
          className="group block"
          aria-label={`打开 ${item.title}`}
        >
          <div className="relative aspect-[16/10] overflow-hidden rounded-[18px] border border-[rgba(255,253,247,0.5)]">
            <ResolvedImage
              sources={getExploreFeedImageCandidates(item)}
              alt={`${cityName} ${item.title} 封面`}
              sizes="(min-width: 1024px) 28vw, 100vw"
              priority={priorityImage}
              wrapperClassName="absolute inset-0 bg-[var(--paper)]"
              imageClassName="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(22,24,20,0.02)_0%,rgba(22,24,20,0.08)_46%,rgba(22,24,20,0.42)_100%)]" />

            <div className="absolute inset-x-4 bottom-4 text-[var(--paper-bright)] sm:inset-x-5 sm:bottom-5">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-[rgba(255,253,247,0.8)]">
                旅行档案
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] sm:text-2xl">
                {cleanDisplayText(cityName, "目的地")}
              </h2>
            </div>
          </div>
        </Link>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold tracking-[-0.03em] text-[var(--ink)]">
            {cleanDisplayText(item.title, "旅行计划")}
          </h3>
          <p className="line-clamp-3 text-sm leading-6 text-[var(--ink-muted)]">
            {cleanDisplayText(item.summary, "这份路线正在整理中，先留一版可打开的旅行档案。")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-medium text-[var(--ink-muted)]">
          <span className="rounded-full border border-[var(--line)] bg-[rgba(255,253,247,0.82)] px-2.5 py-1">
            {formatDaysText(item.days, "天数待定")}
          </span>
          <span className="rounded-full border border-[var(--line)] bg-[rgba(255,253,247,0.82)] px-2.5 py-1">
            {formatTripTypeLabel(item.tripType)}
          </span>
          {item.pace ? (
            <span className="rounded-full border border-[var(--line)] bg-[rgba(255,253,247,0.82)] px-2.5 py-1">
              {formatPaceLabel(item.pace)}
            </span>
          ) : null}
        </div>

        {visibleTags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {visibleTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[rgba(223,232,216,0.54)] px-3 py-1 text-xs text-[var(--sage-deep)]"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/explore/${item.slug}`}
            onClick={handleOpenArchive}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--ink)] bg-[rgba(255,253,247,0.82)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition-transform hover:-translate-y-0.5"
          >
            阅读档案
          </Link>
          <Link
            href={`/explore/${item.slug}`}
            onClick={handleCreateFromArchive}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[rgba(248,241,228,0.78)] px-4 py-2 text-sm font-semibold text-[var(--clay-deep)] transition-transform hover:-translate-y-0.5"
          >
            用此行程创建
          </Link>
        </div>
      </div>
    </article>
  );
}
