import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ArchiveHeader } from "../../components/explore/archive/ArchiveHeader";

describe("ArchiveHeader SSR", () => {
  it("renders drawer mode with close action", () => {
    const markup = renderToStaticMarkup(
      <ArchiveHeader
        mode="drawer"
        onClose={() => {}}
        item={{
          id: "archive-1",
          externalId: "cd_001",
          slug: "chengdu-food-3d",
          title: "Chengdu archive",
          summary: "summary",
          city: "Chengdu",
          cityCode: "chengdu",
          tripType: "food",
          days: 3,
          tags: ["spicy"],
          highlights: [],
          dailyItinerary: [],
          pois: [],
          food: [],
          status: "published",
          reviewStatus: "approved",
          source: { pipeline: "travel-content-pipeline" },
          rawContent: {},
          createdAt: "2026-07-10T00:00:00.000Z",
          updatedAt: "2026-07-10T00:00:00.000Z",
        }}
      />,
    );

    expect(markup).toContain("ARCHIVE DRAWER");
    expect(markup).toContain("Close");
    expect(markup).toContain("Chengdu archive");
  });
});
