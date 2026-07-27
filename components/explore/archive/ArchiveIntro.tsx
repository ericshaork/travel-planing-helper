import type { ArchiveReaderViewModel } from "@/lib/explore/archive-reader";
import { cleanDisplayText } from "@/lib/explore/archive-display";

interface ArchiveIntroProps {
  item: ArchiveReaderViewModel;
}

export function ArchiveIntro({ item }: ArchiveIntroProps) {
  const story = cleanDisplayText(
    item.story,
    cleanDisplayText(item.summary, "这份档案会在创建时继续按你的偏好细化。"),
  );

  return (
    <div className="max-w-3xl">
      <p className="workspace-kicker">计划摘要</p>
      <h2 className="mt-2 text-lg font-semibold text-[var(--ink)]">
        这条路线适合怎么走
      </h2>
      <p className="mt-3 text-sm leading-7 text-[var(--ink-muted)]">{story}</p>
    </div>
  );
}
