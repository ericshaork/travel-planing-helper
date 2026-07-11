import type { ExploreTripContent } from "@/lib/explore/types";

interface ArchiveTagsPanelProps {
  item: ExploreTripContent;
}

export function ArchiveTagsPanel({ item }: ArchiveTagsPanelProps) {
  const tags = [
    ...item.tags,
    ...(item.terrainTags ?? []),
    ...(item.cuisineTags ?? []),
    ...(item.seasonTags ?? []),
  ].filter((value, index, array) => value && array.indexOf(value) === index);

  if (tags.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div>
        <p className="workspace-kicker">TAGS</p>
        <h2 className="mt-2 text-lg font-semibold text-[var(--ink)]">
          这份档案的关键词
        </h2>
      </div>

      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-[rgba(223,232,216,0.54)] px-3 py-1.5 text-sm text-[var(--sage-deep)]"
          >
            {tag}
          </span>
        ))}
      </div>
    </section>
  );
}
