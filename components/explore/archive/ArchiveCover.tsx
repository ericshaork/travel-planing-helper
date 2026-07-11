import type { ExploreTripContent } from "@/lib/explore/types";

import { getArchiveAssetBundle } from "../../../lib/explore/image-resolver";

import { ResolvedImage } from "../ResolvedImage";
import { ArchivePaperPanel } from "./ArchivePaperPanel";

interface ArchiveCoverProps {
  item: ExploreTripContent;
}

export function ArchiveCover({ item }: ArchiveCoverProps) {
  const assets = getArchiveAssetBundle(item);

  return (
    <ArchivePaperPanel
      paper="warm"
      bookmark="active"
      decoration={item.featured ? "stamp" : "label"}
      className="px-4 py-4 sm:px-5 sm:py-5"
      contentClassName="space-y-4"
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr]">
          <ResolvedImage
            sources={[assets.template]}
            alt="Archive template"
            sizes="(min-width: 640px) 50vw, 100vw"
            priority
            wrapperClassName="relative aspect-[16/10] overflow-hidden rounded-[20px] border border-[var(--line)] bg-[var(--paper)]"
            imageClassName="object-cover"
          />
          <div className="grid gap-3">
            <div className="relative">
              <ResolvedImage
                sources={assets.coverCandidates}
                alt={`${item.title} archive cover`}
                sizes="(min-width: 640px) 24vw, 100vw"
                wrapperClassName="relative aspect-[4/3] overflow-hidden rounded-[20px] border border-[var(--line)] bg-[var(--paper)]"
                imageClassName="object-cover"
              />
              <ResolvedImage
                sources={[
                  "/images/archive/frame/archive-photo-frame-01.png",
                  "/images/archive/frame/archive-photo-frame-02.png",
                ]}
                alt=""
                sizes="(min-width: 640px) 24vw, 100vw"
                wrapperClassName="pointer-events-none absolute inset-0 overflow-hidden rounded-[20px]"
                imageClassName="object-contain opacity-90"
              />
            </div>
            <ResolvedImage
              sources={[assets.paper, assets.frame]}
              alt="Archive paper texture"
              sizes="(min-width: 640px) 24vw, 100vw"
              wrapperClassName="relative aspect-[4/3] overflow-hidden rounded-[20px] border border-[var(--line)] bg-[var(--paper)]"
              imageClassName="object-cover"
            />
          </div>
        </div>

        <p className="workspace-kicker">TRAVEL ARCHIVE</p>
        <h1 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--ink)] sm:text-4xl">
          {item.title}
        </h1>
        <p className="text-sm leading-6 text-[var(--ink-muted)] sm:text-[15px]">
          {item.summary}
        </p>
        <div className="flex flex-wrap gap-2 text-xs font-medium text-[var(--ink-muted)]">
          <span className="rounded-full border border-[var(--line)] bg-[rgb(255_255_255_/_0.8)] px-2.5 py-1">
            {item.city}
          </span>
          <span className="rounded-full border border-[var(--line)] bg-[rgb(255_255_255_/_0.8)] px-2.5 py-1">
            {item.days} 天
          </span>
          <span className="rounded-full border border-[var(--line)] bg-[rgb(255_255_255_/_0.8)] px-2.5 py-1">
            {item.tripType}
          </span>
          {item.theme ? (
            <span className="rounded-full border border-dashed border-[var(--line)] px-2.5 py-1">
              {item.theme}
            </span>
          ) : null}
          {item.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-dashed border-[var(--line)] px-2.5 py-1"
            >
              #{tag}
            </span>
          ))}
          {item.creator ? (
            <span className="rounded-full border border-dashed border-[var(--line)] px-2.5 py-1">
              {item.creator}
            </span>
          ) : null}
        </div>
      </div>
    </ArchivePaperPanel>
  );
}
