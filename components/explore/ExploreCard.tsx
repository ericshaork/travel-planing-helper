"use client";

import Link from "next/link";

import type { ExploreTripListItem } from "@/lib/explore/types";

import { getExploreFeedImageCandidates } from "../../lib/explore/image-resolver";

import { ResolvedImage } from "./ResolvedImage";

const tagTranslations: Record<string, string> = {
  food: "美食",
  citywalk: "城市漫步",
  city: "城市",
  coast: "海边",
  beach: "海边",
  island: "海岛",
  mountain: "山野",
  nature: "自然",
  spicy: "辛香",
  hotpot: "火锅",
  seafood: "海鲜",
  dessert: "甜品",
  couple: "情侣",
  family: "家庭",
  friends: "朋友",
  solo: "独行",
  spring: "春天",
  summer: "夏天",
  autumn: "秋天",
  winter: "冬天",
};

function translateLabel(value: string) {
  return tagTranslations[value.toLowerCase()] ?? value;
}

interface ExploreCardProps {
  item: ExploreTripListItem;
  priorityImage?: boolean;
  onOpenArchive?: (slug: string) => void;
}

export function ExploreCard({
  item,
  priorityImage = false,
}: ExploreCardProps) {
  return (
    <article className="workspace-panel overflow-hidden px-4 py-4 sm:px-5 sm:py-5">
      <div className="relative z-[1] space-y-4">
        <div className="relative aspect-[16/10] overflow-hidden rounded-[22px] border border-[rgba(255,253,247,0.5)]">
          <ResolvedImage
            sources={getExploreFeedImageCandidates(item)}
            alt={`${item.title} cover`}
            sizes="(min-width: 1024px) 28vw, 100vw"
            priority={priorityImage}
            wrapperClassName="absolute inset-0 bg-[var(--paper)]"
            imageClassName="object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(22,24,20,0.04)_0%,rgba(22,24,20,0.08)_45%,rgba(22,24,20,0.38)_100%)]" />

          <div className="absolute inset-x-4 bottom-4 text-[var(--paper-bright)] sm:inset-x-5 sm:bottom-5">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-[rgba(255,253,247,0.8)]">
              旅行档案
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] sm:text-2xl">
              {item.city}
            </h2>
            <p className="mt-2 line-clamp-3 max-w-2xl text-sm leading-6 text-[rgba(255,253,247,0.88)]">
              {item.summary}
            </p>
          </div>
        </div>

        <h3 className="text-lg font-semibold tracking-[-0.03em] text-[var(--ink)]">
          {item.title}
        </h3>

        <div className="flex flex-wrap gap-2 text-xs font-medium text-[var(--ink-muted)]">
          <span className="rounded-full border border-[var(--line)] bg-[rgba(255,253,247,0.82)] px-2.5 py-1">
            {item.days} 天
          </span>
          <span className="rounded-full border border-[var(--line)] bg-[rgba(255,253,247,0.82)] px-2.5 py-1">
            {translateLabel(item.tripType)}
          </span>
          {item.pace ? (
            <span className="rounded-full border border-[var(--line)] bg-[rgba(255,253,247,0.82)] px-2.5 py-1">
              {item.pace}
            </span>
          ) : null}
        </div>

        {item.tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {item.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[rgba(223,232,216,0.54)] px-3 py-1 text-xs text-[var(--sage-deep)]"
              >
                {translateLabel(tag)}
              </span>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/explore/${item.slug}`}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--ink)] bg-[rgba(255,253,247,0.82)] px-4 py-2 text-sm font-semibold text-[var(--ink)]"
          >
            <span className="sr-only">Open archive</span>
            <span aria-hidden="true">阅读档案 →</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
