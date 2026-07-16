"use client";

import { useRouter } from "next/navigation";

import type { ArchiveReaderViewModel } from "@/lib/explore/archive-reader";
import {
  startExploreCreateFlow,
  startExploreWorkspaceFlow,
} from "@/lib/explore/flow";

import { FavoriteButton } from "./FavoriteButton";
import { GenerateTripButton } from "./GenerateTripButton";
import { ArchiveDecorations } from "./archive/ArchiveDecorations";

interface CreateMyVersionProps {
  item: ArchiveReaderViewModel;
}

export function CreateMyVersion({ item }: CreateMyVersionProps) {
  const router = useRouter();
  const draft = item.createDraftSeed;

  return (
    <section className="relative space-y-4 border-t border-[rgba(158,136,110,0.12)] pt-8">
      <ArchiveDecorations variant="footer" />
      <div className="relative z-[1] max-w-3xl">
        <p className="workspace-kicker">导入工作台</p>
        <h2 className="text-lg font-semibold text-[var(--ink)]">
          用这份灵感开始自己的旅行计划
        </h2>
        <p className="mt-2 text-sm leading-7 text-[var(--ink-muted)]">
          可以直接导入 Workspace 当作草稿，也可以先去补充预算、日期和节奏。
        </p>
      </div>

      <div className="relative z-[1] flex flex-wrap gap-3">
        <GenerateTripButton
          label="导入到工作台"
          payload={{
            entry: "archive_import_workspace",
            draft,
          }}
          onGenerate={() => startExploreWorkspaceFlow(draft, router)}
          helperText="会把这份档案作为可编辑草稿打开，默认进入阅读模式。"
        />
        <GenerateTripButton
          label="继续补需求"
          payload={{
            entry: "archive_create_version",
            draft,
          }}
          onGenerate={() => startExploreCreateFlow(draft, router)}
          helperText="先进入创建流程，补完需求后再生成更贴合你的版本。"
        />
        <FavoriteButton archiveId={item.slug} />
      </div>
    </section>
  );
}
