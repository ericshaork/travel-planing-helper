"use client";

import { getInspirationCardImageCandidates } from "@/lib/explore/image-resolver";
import type { InspirationFacetKey } from "@/lib/explore/types";

import { ResolvedImage } from "./ResolvedImage";

interface InspirationCategoryProps {
  title: string;
  description: string;
  categoryKey: InspirationFacetKey;
  previewItems: string[];
  selectedCount: number;
}

export function InspirationCategory({
  title,
  description,
  categoryKey,
  previewItems,
  selectedCount,
}: InspirationCategoryProps) {
  return (
    <div className="flex h-full items-center gap-3">
      <div className="relative h-[4.8rem] w-[4.35rem] shrink-0 overflow-hidden rounded-[15px] border border-[rgba(214,205,187,0.65)] bg-[var(--paper)] shadow-[0_6px_12px_rgba(88,76,57,0.04)]">
        <ResolvedImage
          sources={getInspirationCardImageCandidates(categoryKey)}
          alt={`${title} inspiration`}
          sizes="84px"
          wrapperClassName="absolute inset-0 bg-[var(--paper)]"
          imageClassName="object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,253,247,0.04)_0%,rgba(32,27,22,0.18)_100%)]" />
      </div>

      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[1.05rem] font-semibold tracking-[-0.04em] text-[var(--ink)]">
            {title}
          </h3>
          {selectedCount > 0 ? (
            <span className="rounded-full border border-[rgba(86,105,84,0.18)] bg-[rgba(244,248,238,0.82)] px-2 py-0.5 text-[10px] font-semibold text-[rgb(76,96,74)]">
              已选 {selectedCount}
            </span>
          ) : null}
        </div>

        <p className="line-clamp-1 text-[11px] leading-5 text-[var(--ink-muted)]">
          {description}
        </p>

        <div className="flex flex-wrap gap-1.5">
          {previewItems.slice(0, 3).map((item) => (
            <span
              key={item}
              className="rounded-full border border-[rgba(214,205,187,0.52)] bg-[rgba(255,253,247,0.6)] px-2 py-0.5 text-[10px] text-[var(--ink-muted)]"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
