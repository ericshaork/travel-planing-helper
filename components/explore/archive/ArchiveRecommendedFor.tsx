import type { ArchiveReaderViewModel } from "@/lib/explore/archive-reader";
import { cleanDisplayText } from "@/lib/explore/archive-display";

interface ArchiveRecommendedForProps {
  item: ArchiveReaderViewModel;
}

export function ArchiveRecommendedFor({ item }: ArchiveRecommendedForProps) {
  const recommendedFor = item.recommendedFor
    .map((tag) => cleanDisplayText(tag))
    .filter(Boolean)
    .slice(0, 4);

  if (recommendedFor.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {recommendedFor.map((tag) => (
        <span
          key={tag}
          className="rounded-full border border-[rgba(158,136,110,0.16)] bg-[rgba(255,252,246,0.34)] px-3 py-1.5 text-sm text-[var(--ink)]"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
