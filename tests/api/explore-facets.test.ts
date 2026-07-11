import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createExploreFacetsHandler } from "../../app/api/explore/facets/route";

describe("GET /api/explore/facets", () => {
  it("returns discovery hall facet buckets", async () => {
    const GET = createExploreFacetsHandler({
      async listPublished() {
        return [
          {
            id: "row-1",
            externalId: "cd_001",
            slug: "chengdu-food-3d",
            title: "Chengdu archive",
            summary: "summary",
            city: "Chengdu",
            cityCode: "chengdu",
            region: "Sichuan",
            tripType: "food",
            days: 3,
            tags: ["food", "city"],
            theme: "slow",
            pace: "relaxed",
            budgetLevel: "medium",
            budgetNote: "note",
            coverImageUrl: undefined,
            imagePrompt: undefined,
            archiveIntro: undefined,
            featured: true,
            terrainTags: ["city", "mountain"],
            cuisineTags: ["spicy", "hotpot"],
            seasonTags: ["autumn"],
            companionTags: ["couple"],
            highlights: [],
            dailyItinerary: [],
            pois: [],
            food: [],
            status: "published",
            reviewStatus: "approved",
            source: {
              pipeline: "travel-content-pipeline",
            },
            rawContent: {},
            createdAt: "2026-07-09T00:00:00.000Z",
            updatedAt: "2026-07-09T00:00:00.000Z",
          },
        ];
      },
    } as never);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.facets.terrain).toContain("mountain");
    expect(json.facets.cuisine).toContain("hotpot");
    expect(json.facets.season).toContain("autumn");
    expect(json.facets.companion).toContain("couple");
    expect(json.facets.terrain).toContain("beach");
  });
});
