import type { ExploreTripContent } from "@/lib/explore/types";

import { ArchiveCover } from "./ArchiveCover";
import { ArchiveFood } from "./ArchiveFood";
import { ArchiveHighlights } from "./ArchiveHighlights";
import { ArchiveIntro } from "./ArchiveIntro";
import { ArchiveItinerary } from "./ArchiveItinerary";
import { ArchiveMap } from "./ArchiveMap";
import { ArchivePaperPanel } from "./ArchivePaperPanel";
import { ArchivePOI } from "./ArchivePOI";
import { ArchiveRecommendedFor } from "./ArchiveRecommendedFor";
import { ArchiveTagsPanel } from "./ArchiveTagsPanel";
import { CreateMyVersion } from "./CreateMyVersion";

interface ArchiveViewerContentProps {
  item: ExploreTripContent;
}

export function ArchiveViewerContent({ item }: ArchiveViewerContentProps) {
  return (
    <section className="space-y-4">
      <ArchiveCover item={item} />
      <ArchivePaperPanel
        paper="light"
        className="px-3 py-3 sm:px-4 sm:py-4"
        contentClassName="space-y-4"
      >
        <ArchiveIntro item={item} />
        <ArchiveRecommendedFor item={item} />
        <ArchiveTagsPanel item={item} />
        <ArchiveHighlights item={item} />
        <ArchiveItinerary item={item} />
        <div className="grid gap-4 lg:grid-cols-2">
          <ArchiveFood item={item} />
          <ArchivePOI item={item} />
        </div>
        <ArchiveMap item={item} />
      </ArchivePaperPanel>
      <CreateMyVersion item={item} />
    </section>
  );
}
