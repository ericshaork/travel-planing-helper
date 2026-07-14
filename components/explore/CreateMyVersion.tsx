"use client";

import { useRouter } from "next/navigation";

import type { ArchiveReaderViewModel } from "@/lib/explore/archive-reader";
import { startExploreCreateFlow } from "@/lib/explore/flow";

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
        <p className="workspace-kicker">CREATE</p>
        <h2 className="text-lg font-semibold text-[var(--ink)]">用这篇档案开始创建</h2>
        <p className="mt-2 text-sm leading-7 text-[var(--ink-muted)]">
          会把这篇档案的城市、天数和灵感标签一起带入 Create，后面还能继续按你的预算和节奏微调。
        </p>
      </div>

      <div className="relative z-[1] flex flex-wrap gap-3">
        <GenerateTripButton
          label="用此行程创建"
          payload={{
            entry: "archive_create_version",
            draft,
          }}
          onGenerate={() => startExploreCreateFlow(draft, router)}
          helperText="创建后会自动带入这篇档案的核心路线和灵感。"
        />
        <FavoriteButton archiveId={item.slug} />
      </div>
    </section>
  );
}
