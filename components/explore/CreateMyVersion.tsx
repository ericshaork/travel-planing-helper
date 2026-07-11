"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

import { startExploreCreateFlow } from "@/lib/explore/flow";
import { buildTripPlanDraftFromExplore } from "@/lib/explore/to-trip-draft";
import type { ExploreTripContent } from "@/lib/explore/types";

import { FavoriteButton } from "./FavoriteButton";
import { GenerateTripButton } from "./GenerateTripButton";

interface CreateMyVersionProps {
  item: ExploreTripContent;
}

export function CreateMyVersion({ item }: CreateMyVersionProps) {
  const router = useRouter();
  const draft = buildTripPlanDraftFromExplore(item);

  return (
    <article className="workspace-panel relative overflow-hidden px-4 py-4 sm:px-5 sm:py-5">
      <div className="pointer-events-none absolute right-4 top-3 h-14 w-14 opacity-80">
        <Image
          src="/images/archive/decoration/archive-label-note.png"
          alt=""
          fill
          sizes="56px"
          aria-hidden
          className="object-contain"
        />
      </div>
      <div className="relative z-[1] space-y-4">
        <div>
          <p className="workspace-kicker">NEXT STEP</p>
          <h2 className="text-lg font-semibold text-[var(--ink)]">
            把这份档案带进你的旅行计划
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
            先收藏，或者直接基于这份档案生成一版属于你的路线。
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <FavoriteButton archiveId={item.slug} />
          <GenerateTripButton
            label="AI生成类似旅行"
            payload={{
              entry: "archive_create_version",
              draft,
            }}
            onGenerate={() => startExploreCreateFlow(draft, router)}
            helperText="会带着这份档案的城市、节奏和灵感进入 Create。"
          />
        </div>
      </div>
    </article>
  );
}
