import type { ArchiveReaderViewModel } from "@/lib/explore/archive-reader";
import { cleanDisplayText } from "@/lib/explore/archive-display";
import { getArchiveFoodImageSlot } from "@/lib/explore/image-resolver";

import { ResolvedImage } from "../ResolvedImage";

interface ArchiveFoodProps {
  item: ArchiveReaderViewModel;
}

export function ArchiveFood({ item }: ArchiveFoodProps) {
  const visibleFood = item.food.slice(0, 3);
  const remainingCount = Math.max(item.food.length - visibleFood.length, 0);

  if (visibleFood.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="workspace-kicker">FOOD</p>
        <h3 className="mt-2 text-base font-semibold text-[var(--ink)]">代表美食</h3>
      </div>

      <div className="space-y-4">
        {visibleFood.map((food, index) => {
          const imageSlot = getArchiveFoodImageSlot(food);
          const shouldShowImage = index === 0 || !imageSlot.usesFallbackOnly;

          return (
            <article
              key={food.id}
              className={`grid gap-3 ${shouldShowImage ? "sm:grid-cols-[6rem_minmax(0,1fr)]" : ""}`}
            >
              {shouldShowImage && imageSlot.sources.length > 0 ? (
                <ResolvedImage
                  sources={imageSlot.sources}
                  alt={`${food.name} 美食图`}
                  sizes="96px"
                  wrapperClassName="relative aspect-[4/3] overflow-hidden rounded-[10px] bg-[rgba(255,250,241,0.24)]"
                  imageClassName="object-cover"
                />
              ) : null}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[rgba(158,136,110,0.14)] px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] text-[var(--ink-muted)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {food.category ? (
                    <span className="rounded-full border border-dashed border-[rgba(158,136,110,0.18)] px-2.5 py-1 text-[11px] text-[var(--ink-muted)]">
                      {cleanDisplayText(food.category)}
                    </span>
                  ) : null}
                </div>
                <h4 className="text-sm font-semibold text-[var(--ink)]">
                  {cleanDisplayText(food.name, "在地风味")}
                </h4>
                <p className="text-sm leading-6 text-[var(--ink-muted)]">
                  {cleanDisplayText(food.reason, "这一站适合留一顿给当地味道。")}
                </p>
              </div>
            </article>
          );
        })}
      </div>

      {remainingCount > 0 ? (
        <p className="text-sm leading-6 text-[var(--ink-muted)]">
          还有 {remainingCount} 个美食灵感，可在 Workspace 里继续展开。
        </p>
      ) : null}
    </div>
  );
}
