import type { ArchiveReaderViewModel } from "@/lib/explore/archive-reader";
import { cleanDisplayText } from "@/lib/explore/archive-display";
import { getArchivePlaceImageSlot } from "@/lib/explore/image-resolver";

import { ResolvedImage } from "../ResolvedImage";

interface ArchivePOIProps {
  item: ArchiveReaderViewModel;
}

export function ArchivePOI({ item }: ArchivePOIProps) {
  const visiblePlaces = item.places.slice(0, 3);
  const remainingCount = Math.max(item.places.length - visiblePlaces.length, 0);

  if (visiblePlaces.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="workspace-kicker">PLACES</p>
        <h3 className="mt-2 text-base font-semibold text-[var(--ink)]">代表地点</h3>
      </div>

      <div className="space-y-4">
        {visiblePlaces.map((poi, index) => {
          const imageSlot = getArchivePlaceImageSlot(poi, item);
          const shouldShowImage = index === 0 || !imageSlot.usesFallbackOnly;

          return (
            <article
              key={poi.id}
              className={`grid gap-3 ${shouldShowImage ? "sm:grid-cols-[6rem_minmax(0,1fr)]" : ""}`}
            >
              {shouldShowImage && imageSlot.sources.length > 0 ? (
                <ResolvedImage
                  sources={imageSlot.sources}
                  alt={`${poi.name} 地点图`}
                  sizes="96px"
                  wrapperClassName="relative aspect-[4/3] overflow-hidden rounded-[10px] bg-[rgba(255,250,241,0.24)]"
                  imageClassName="object-cover"
                />
              ) : null}

              <div className="space-y-1.5 border-l border-[rgba(158,136,110,0.14)] pl-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[rgba(158,136,110,0.14)] px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] text-[var(--ink-muted)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {poi.type ? (
                    <span className="rounded-full border border-dashed border-[rgba(158,136,110,0.18)] px-2.5 py-1 text-[11px] text-[var(--ink-muted)]">
                      {cleanDisplayText(poi.type)}
                    </span>
                  ) : null}
                </div>
                <h4 className="text-sm font-semibold text-[var(--ink)]">
                  {cleanDisplayText(poi.name, "路线节点")}
                </h4>
                <p className="text-sm leading-6 text-[var(--ink-muted)]">
                  {cleanDisplayText(poi.reason, "这一站可以按当天状态灵活停留。")}
                </p>
                {poi.district ? (
                  <p className="text-xs text-[var(--ink-faint)]">
                    {cleanDisplayText(poi.district)}
                  </p>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      {remainingCount > 0 ? (
        <p className="text-sm leading-6 text-[var(--ink-muted)]">
          还有 {remainingCount} 个地点，可在 Workspace 里继续展开。
        </p>
      ) : null}
    </div>
  );
}
