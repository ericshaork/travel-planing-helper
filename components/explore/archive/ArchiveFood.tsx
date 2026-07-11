import type { ExploreTripContent } from "@/lib/explore/types";

import { ResolvedImage } from "../ResolvedImage";
import { ArchivePaperPanel } from "./ArchivePaperPanel";

interface ArchiveFoodProps {
  item: ExploreTripContent;
}

function getFoodImageCandidates(food: ExploreTripContent["food"][number]) {
  const category = food.category?.trim().toLowerCase() ?? "";

  if (category.includes("seafood")) {
    return [
      "/images/explore/inspiration/food/seafood-card.png",
      "/images/explore/fallback/explore-fallback-food.png",
    ];
  }

  if (category.includes("tea")) {
    return [
      "/images/explore/inspiration/food/tea-card.png",
      "/images/explore/fallback/explore-fallback-food.png",
    ];
  }

  if (category.includes("dessert")) {
    return [
      "/images/explore/inspiration/food/dessert-card.png",
      "/images/explore/fallback/explore-fallback-food.png",
    ];
  }

  return [
    "/images/explore/inspiration/food/spicy-card.png",
    "/images/explore/fallback/explore-fallback-food.png",
  ];
}

export function ArchiveFood({ item }: ArchiveFoodProps) {
  return (
    <ArchivePaperPanel
      paper="warm"
      decoration="label"
      className="px-4 py-4 sm:px-5 sm:py-5"
      contentClassName="space-y-4 pt-4"
    >
      <div className="space-y-4">
        <div>
          <p className="workspace-kicker">FOOD NOTES</p>
          <h2 className="mt-2 text-lg font-semibold text-[var(--ink)]">Food</h2>
        </div>
        <div className="space-y-3">
          {item.food.map((food, index) => (
            <section
              key={food.id}
              className="overflow-hidden rounded-[20px] border border-[var(--line)] bg-[rgb(255_255_255_/_0.56)]"
            >
              <div className="grid gap-4 p-4 sm:grid-cols-[9rem_minmax(0,1fr)]">
                <ResolvedImage
                  sources={getFoodImageCandidates(food)}
                  alt={`${food.name} note`}
                  sizes="(min-width: 640px) 144px, 100vw"
                  wrapperClassName="relative aspect-[4/3] overflow-hidden rounded-[16px] border border-[var(--line)] bg-[var(--paper)]"
                  imageClassName="object-cover"
                />
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[var(--line)] px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] text-[var(--ink-muted)]">
                      FOOD {index + 1}
                    </span>
                    {food.category ? (
                      <span className="rounded-full border border-dashed border-[var(--line)] px-2.5 py-1 text-[11px] text-[var(--ink-muted)]">
                        {food.category}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="text-base font-semibold text-[var(--ink)]">
                    {food.name}
                  </h3>
                  <p className="text-sm leading-6 text-[var(--ink-muted)]">
                    {food.reason}
                  </p>
                  <p className="text-xs text-[var(--ink-muted)]">
                    {food.district
                      ? `${item.city} 路 ${food.district} food note`
                      : `${item.city} food note`}
                  </p>
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>
    </ArchivePaperPanel>
  );
}
