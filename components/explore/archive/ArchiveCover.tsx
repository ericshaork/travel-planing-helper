"use client";

import { useRouter } from "next/navigation";

import type { ArchiveReaderViewModel } from "@/lib/explore/archive-reader";
import {
  cleanDisplayText,
  formatDaysText,
  formatTripTypeLabel,
} from "@/lib/explore/archive-display";
import {
  startExploreCreateFlow,
  startExploreWorkspaceFlow,
} from "@/lib/explore/flow";
import { getArchiveHeroCoverSlot } from "@/lib/explore/image-resolver";

import { FavoriteButton } from "../FavoriteButton";
import { GenerateTripButton } from "../GenerateTripButton";
import { ResolvedImage } from "../ResolvedImage";
import { ArchiveTagsPanel } from "./ArchiveTagsPanel";

interface ArchiveCoverProps {
  item: ArchiveReaderViewModel;
}

function buildMetaTags(item: ArchiveReaderViewModel) {
  return [
    cleanDisplayText(item.city, "目的地"),
    formatDaysText(item.days),
    cleanDisplayText(item.theme),
    formatTripTypeLabel(item.tripType),
    cleanDisplayText(item.pace),
  ].filter(Boolean);
}

export function ArchiveCover({ item }: ArchiveCoverProps) {
  const router = useRouter();
  const heroCoverSlot = getArchiveHeroCoverSlot(item);
  const metaTags = buildMetaTags(item);

  return (
    <section className="relative overflow-hidden py-6">
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="max-w-[38rem] space-y-4">
          <p className="workspace-kicker">旅行档案</p>
          <div className="space-y-3">
            <h1 className="text-[2rem] font-semibold tracking-[-0.05em] text-[var(--ink)] sm:text-[2.65rem]">
              {cleanDisplayText(item.title, "旅行档案")}
            </h1>
            <div className="flex flex-wrap gap-2 text-xs font-medium text-[var(--ink-muted)]">
              {metaTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[rgba(158,136,110,0.16)] bg-[rgba(255,252,246,0.34)] px-2.5 py-1"
                >
                  {tag}
                </span>
              ))}
            </div>
            <p className="max-w-3xl text-[15px] leading-7 text-[var(--ink-muted)]">
              {cleanDisplayText(item.summary, "这份路线正在整理中。")}
            </p>
            {item.featuredReason ? (
              <p className="max-w-3xl text-sm leading-7 text-[var(--ink-muted)]">
                {cleanDisplayText(item.featuredReason)}
              </p>
            ) : null}
          </div>

          <ArchiveTagsPanel item={item} compact />

          <div className="flex flex-wrap items-start gap-3 pt-1">
            <GenerateTripButton
              label="导入到工作台"
              payload={{
                entry: "archive_cover_import_workspace",
                draft: item.createDraftSeed,
              }}
              onGenerate={() => startExploreWorkspaceFlow(item.createDraftSeed, router)}
            />
            <GenerateTripButton
              label="继续补需求"
              payload={{
                entry: "archive_cover_create",
                draft: item.createDraftSeed,
              }}
              onGenerate={() => startExploreCreateFlow(item.createDraftSeed, router)}
            />
            <FavoriteButton archiveId={item.slug} />
          </div>
        </div>

        <div className="relative justify-self-start lg:justify-self-end">
          <div className="pointer-events-none absolute -left-3 top-2 h-7 w-16 -rotate-[8deg] bg-[rgba(214,191,152,0.48)] blur-[0.3px]" />
          <div className="pointer-events-none absolute left-6 top-[-0.4rem] h-5 w-20 rotate-[3deg] rounded-full bg-[rgba(255,245,214,0.72)]" />
          <ResolvedImage
            sources={heroCoverSlot.sources}
            alt={`${item.title} 档案封面`}
            sizes="(min-width: 1024px) 320px, 72vw"
            priority
            wrapperClassName="relative aspect-[16/10] w-[17rem] rotate-[1.6deg] overflow-hidden rounded-[10px] border border-[rgba(158,136,110,0.12)] bg-[rgba(255,250,241,0.18)] shadow-[0_14px_28px_rgba(88,76,57,0.08)] sm:w-[19rem] lg:w-[20rem]"
            imageClassName="object-cover"
          />
        </div>
      </div>
    </section>
  );
}
