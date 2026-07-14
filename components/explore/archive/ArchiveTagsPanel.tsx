import type { ArchiveReaderViewModel } from "@/lib/explore/archive-reader";
import { cleanDisplayText } from "@/lib/explore/archive-display";

interface ArchiveTagsPanelProps {
  item: ArchiveReaderViewModel;
  compact?: boolean;
}

export function ArchiveTagsPanel({
  item,
  compact = false,
}: ArchiveTagsPanelProps) {
  const tags = item.tags.map((tag) => cleanDisplayText(tag)).filter(Boolean);

  if (tags.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {tags.slice(0, 6).map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-[rgba(223,232,216,0.34)] px-3 py-1 text-xs text-[var(--sage-deep)]"
          >
            {tag}
          </span>
        ))}
      </div>
    );
  }

  return (
    <section className="space-y-3 border-t border-[rgba(158,136,110,0.12)] pt-6">
      <div>
        <p className="workspace-kicker">TAGS</p>
        <h2 className="mt-2 text-lg font-semibold text-[var(--ink)]">这份档案的关键词</h2>
      </div>

      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-[rgba(223,232,216,0.36)] px-3 py-1.5 text-sm text-[var(--sage-deep)]"
          >
            {tag}
          </span>
        ))}
      </div>
    </section>
  );
}
