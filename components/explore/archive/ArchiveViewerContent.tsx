import type { ArchiveReaderViewModel } from "@/lib/explore/archive-reader";

import { CreateMyVersion } from "../CreateMyVersion";
import { ArchiveCover } from "./ArchiveCover";
import { ArchiveDecorations } from "./ArchiveDecorations";
import { ArchiveFood } from "./ArchiveFood";
import { ArchiveHighlights } from "./ArchiveHighlights";
import { ArchiveIntro } from "./ArchiveIntro";
import { ArchiveItinerary } from "./ArchiveItinerary";
import { ArchiveMap } from "./ArchiveMap";
import { ArchivePOI } from "./ArchivePOI";
import { ArchiveRecommendedFor } from "./ArchiveRecommendedFor";

interface ArchiveViewerContentProps {
  item: ArchiveReaderViewModel;
}

export function ArchiveViewerContent({ item }: ArchiveViewerContentProps) {
  return (
    <section className="px-5 pb-8 sm:px-7 sm:pb-10">
      <div className="mx-auto max-w-[54rem]">
        <ArchiveCover item={item} />

        <section className="space-y-8 pt-6">
          <section className="relative space-y-4 border-t border-[rgba(158,136,110,0.12)] pt-7">
            <ArchiveDecorations variant="sectionDivider" />
            <ArchiveIntro item={item} />
            <ArchiveRecommendedFor item={item} />
          </section>

          <ArchiveHighlights item={item} />
          <ArchiveItinerary item={item} />

          <section className="relative space-y-4 border-t border-[rgba(158,136,110,0.12)] pt-7">
            <ArchiveDecorations variant="foodPlaces" />
            <div className="max-w-3xl">
              <p className="workspace-kicker">FOOD & PLACES</p>
              <h2 className="mt-2 text-lg font-semibold text-[var(--ink)]">美食与地点</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--ink-muted)]">
                先看最能代表这条路线气质的几处地点和味道，真正展开时再去 Workspace
                里补更多细节。
              </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              <ArchiveFood item={item} />
              <ArchivePOI item={item} />
            </div>
          </section>

          <ArchiveMap item={item} />
          <CreateMyVersion item={item} />
        </section>
      </div>
    </section>
  );
}
