"use client";

import type { ArchiveReaderViewModel } from "@/lib/explore/archive-reader";

import { ArchiveDecorations } from "./archive/ArchiveDecorations";
import { ExploreProjectEntryButton } from "./ExploreProjectEntryButton";
import { FavoriteButton } from "./FavoriteButton";

interface CreateMyVersionProps {
  item: ArchiveReaderViewModel;
}

export function CreateMyVersion({ item }: CreateMyVersionProps) {
  return (
    <section className="relative space-y-4 border-t border-[rgba(158,136,110,0.12)] pt-8">
      <ArchiveDecorations variant="footer" />
      <div className="relative z-[1] max-w-3xl">
        <p className="workspace-kicker">导入工作台</p>
        <h2 className="text-lg font-semibold text-[var(--ink)]">
          用这份行程开始自己的旅行计划
        </h2>
        <p className="mt-2 text-sm leading-7 text-[var(--ink-muted)]">
          先把 Explore 档案整理成你的旅行版本，再决定是直接进入工作台，还是继续和
          Wanderly 一起调整。
        </p>
      </div>

      <div className="relative z-[1] flex flex-wrap gap-3">
        <ExploreProjectEntryButton
          item={item}
          label="用此档案创建"
          helperText="先创建旅行版本，再选择进入工作台或继续 AI 调整。"
        />
        <FavoriteButton archiveId={item.slug} />
      </div>
    </section>
  );
}
