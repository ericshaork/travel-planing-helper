import type { ArchiveReaderViewModel } from "@/lib/explore/archive-reader";
import { cleanDisplayText } from "@/lib/explore/archive-display";
import { getArchiveHighlightIllustrationSlot } from "@/lib/explore/image-resolver";

import { ResolvedImage } from "../ResolvedImage";

interface ArchiveHighlightsProps {
  item: ArchiveReaderViewModel;
}

function buildHighlightDescription(item: ArchiveReaderViewModel, highlight: string) {
  const normalized = cleanDisplayText(highlight);

  const matchedDay = item.dailyItinerary.find((day) =>
    cleanDisplayText(day.title).includes(normalized),
  );
  if (matchedDay?.summary) {
    return cleanDisplayText(matchedDay.summary);
  }

  const matchedPlace = item.places.find((place) =>
    cleanDisplayText(place.name).includes(normalized),
  );
  if (matchedPlace?.reason) {
    return cleanDisplayText(matchedPlace.reason);
  }

  const matchedFood = item.food.find((food) =>
    cleanDisplayText(food.name).includes(normalized),
  );
  if (matchedFood?.reason) {
    return cleanDisplayText(matchedFood.reason);
  }

  return `${cleanDisplayText(item.city, "这座城市")}的这段体验，适合慢慢读完再决定要不要照着走。`;
}

export function ArchiveHighlights({ item }: ArchiveHighlightsProps) {
  const highlights = item.highlights
    .map((highlight) => cleanDisplayText(highlight))
    .filter(Boolean)
    .slice(0, 5);
  const illustrationSlot = getArchiveHighlightIllustrationSlot(item);

  if (highlights.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4 border-t border-[rgba(158,136,110,0.12)] pt-7">
      <div className="max-w-3xl">
        <p className="workspace-kicker">行程亮点</p>
        <h2 className="mt-2 text-lg font-semibold text-[var(--ink)]">行程亮点</h2>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start">
        <div className="grid gap-4 sm:grid-cols-2">
          {highlights.map((highlight, index) => (
            <article
              key={`${highlight}-${index}`}
              className="space-y-2 border-l border-[rgba(158,136,110,0.14)] pl-4"
            >
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-[rgba(158,136,110,0.14)] px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] text-[var(--ink-muted)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="text-base font-semibold text-[var(--ink)]">{highlight}</h3>
              </div>
              <p className="text-sm leading-7 text-[var(--ink-muted)]">
                {buildHighlightDescription(item, highlight)}
              </p>
            </article>
          ))}
        </div>

        {illustrationSlot.sources.length > 0 ? (
          <div className="relative hidden lg:block">
            <div className="pointer-events-none absolute left-5 top-[-0.3rem] h-5 w-16 -rotate-[7deg] rounded-full bg-[rgba(255,243,206,0.68)]" />
            <ResolvedImage
              sources={illustrationSlot.sources}
              alt={`${item.title} 行程亮点插图`}
              sizes="256px"
              wrapperClassName="relative aspect-[16/10] overflow-hidden rounded-[10px] border border-[rgba(158,136,110,0.1)] bg-[rgba(255,250,241,0.14)] shadow-[0_12px_26px_rgba(88,76,57,0.06)]"
              imageClassName="object-cover"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
