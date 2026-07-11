"use client";

import { getInspirationCardImageCandidates } from "@/lib/explore/image-resolver";
import type { InspirationFacetKey, InspirationSelection } from "@/lib/explore/types";

import { ResolvedImage } from "./ResolvedImage";

const categoryCards: Array<{
  key: InspirationFacetKey;
  title: string;
  description: string;
  items: string[];
  accent: string;
}> = [
  {
    key: "location",
    title: "地点",
    description: "从风景和城市气质开始挑一段旅程。",
    items: ["海边城市", "古城", "山野", "城市漫步"],
    accent:
      "border-[rgba(205,221,198,0.92)] bg-[rgba(233,242,228,0.68)] text-[var(--sage-deep)]",
  },
  {
    key: "food",
    title: "美食",
    description: "让味道先带路，路线自然会长出来。",
    items: ["火锅", "海鲜", "甜品", "夜市"],
    accent:
      "border-[rgba(244,221,209,0.96)] bg-[rgba(247,228,216,0.74)] text-[var(--clay-deep)]",
  },
  {
    key: "season",
    title: "季节",
    description: "用气候和氛围决定这次旅行的底色。",
    items: ["春游", "夏日海岛", "秋季赏景", "冬季旅行"],
    accent:
      "border-[rgba(225,220,234,0.96)] bg-[rgba(232,229,238,0.72)] text-[#5f5b70]",
  },
  {
    key: "companion",
    title: "同行",
    description: "不同旅伴，会把城市走成不同版本。",
    items: ["情侣", "朋友", "家庭", "独自旅行"],
    accent:
      "border-[rgba(226,221,205,0.92)] bg-[rgba(241,235,221,0.72)] text-[#756248]",
  },
];

const selectionMap: Record<InspirationFacetKey, string[]> = {
  location: ["beach", "old-town", "mountain", "city"],
  food: ["hotpot", "seafood", "dessert", "snack"],
  season: ["spring", "summer", "autumn", "winter"],
  companion: ["couple", "friends", "family", "solo"],
};

interface InspirationDeckProps {
  selection: InspirationSelection;
  onSelectionChange: (selection: InspirationSelection) => void;
  onGenerate?: () => void | Promise<void>;
}

export function InspirationDeck({
  selection,
  onSelectionChange,
  onGenerate,
}: InspirationDeckProps) {
  function activateCategory(key: InspirationFacetKey) {
    onSelectionChange({
      ...selection,
      [key]: selectionMap[key],
    });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {categoryCards.map((card) => {
        const isSelected = (selection[card.key]?.length ?? 0) > 0;

        return (
          <button
            key={card.key}
            type="button"
            onClick={() => activateCategory(card.key)}
            className={`overflow-hidden rounded-[24px] border text-left transition-transform hover:-translate-y-0.5 ${card.accent} ${
              isSelected ? "shadow-[0_14px_28px_rgba(72,58,39,0.08)]" : ""
            }`}
          >
            <div className="relative aspect-[16/10] overflow-hidden">
              <ResolvedImage
                sources={getInspirationCardImageCandidates(card.key)}
                alt={`${card.title} inspiration`}
                sizes="(min-width: 1024px) 28vw, 100vw"
                wrapperClassName="absolute inset-0 bg-[var(--paper)]"
                imageClassName="object-cover"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(22,24,20,0.02)_0%,rgba(22,24,20,0.12)_52%,rgba(22,24,20,0.42)_100%)]" />
              <div className="absolute inset-x-4 bottom-4 text-[var(--paper-bright)]">
                <p className="text-[11px] font-semibold tracking-[0.16em] text-[rgba(255,253,247,0.82)]">
                  {card.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-[rgba(255,253,247,0.92)]">
                  {card.description}
                </p>
              </div>
            </div>

            <div className="space-y-3 px-4 py-4">
              <div className="flex flex-wrap gap-2">
                {card.items.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-[rgba(255,253,247,0.5)] bg-[rgba(255,253,247,0.7)] px-3 py-1 text-xs text-current/85"
                  >
                    {item}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-current/80">
                  {isSelected ? "已加入当前灵感" : "浏览灵感"}
                </span>
                <span className="text-sm text-current/75">进入</span>
              </div>
            </div>
          </button>
        );
      })}

      <div className="sm:col-span-2">
        <button
          type="button"
          onClick={() => void onGenerate?.()}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--ink)] bg-[rgba(255,253,247,0.92)] px-5 py-2.5 text-sm font-semibold text-[var(--ink)]"
        >
          按这些灵感生成旅行
        </button>
      </div>
    </div>
  );
}
