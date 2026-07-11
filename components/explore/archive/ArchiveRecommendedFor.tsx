import type { ExploreTripContent } from "@/lib/explore/types";

interface ArchiveRecommendedForProps {
  item: ExploreTripContent;
}

export function ArchiveRecommendedFor({
  item,
}: ArchiveRecommendedForProps) {
  const rawRecommended =
    Array.isArray(item.rawContent.recommendedFor) &&
    item.rawContent.recommendedFor.every((value) => typeof value === "string")
      ? (item.rawContent.recommendedFor as string[])
      : [];
  const recommendedFor =
    rawRecommended.length > 0 ? rawRecommended : item.companionTags ?? [];

  if (recommendedFor.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div>
        <p className="workspace-kicker">RECOMMENDED FOR</p>
        <h2 className="mt-2 text-lg font-semibold text-[var(--ink)]">
          适合谁去
        </h2>
      </div>

      <div className="flex flex-wrap gap-2">
        {recommendedFor.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-[var(--line)] bg-[rgba(255,253,247,0.82)] px-3 py-1.5 text-sm text-[var(--ink)]"
          >
            {tag}
          </span>
        ))}
      </div>
    </section>
  );
}
