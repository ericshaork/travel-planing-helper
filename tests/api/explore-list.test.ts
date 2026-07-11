import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createExploreListHandler } from "../../app/api/explore/route";
import type { ExploreTripListFilters } from "../../lib/explore/types";

describe("GET /api/explore", () => {
  it("returns normalized published list items and parses future filter params", async () => {
    const GET = createExploreListHandler({
      async listPublished(filters: ExploreTripListFilters) {
        expect(filters).toEqual({
          city: "beijing",
          tripType: "student",
          days: 3,
          tags: ["city-walk", "budget"],
          featured: true,
          terrain: ["beach"],
          cuisine: ["spicy"],
          season: ["summer"],
          companion: ["couple"],
        });

        return [
          {
            id: "row-1",
            externalId: "beijing_student_3d_002",
            slug: "beijing-budget-campus-3d",
            title: "北京学生党 3 天轻预算路线",
            summary: "summary",
            city: "Beijing",
            cityCode: "beijing",
            region: "Beijing",
            tripType: "student",
            days: 3,
            tags: ["city-walk", "budget"],
            theme: undefined,
            pace: "slow",
            budgetLevel: "low",
            budgetNote: "note",
            coverImageUrl: undefined,
            imagePrompt: undefined,
            archiveIntro: undefined,
            featured: true,
            featuredReason: "good for first timers",
            creatorType: "editorial",
            creatorId: "editor-1",
            creator: "Wanderly",
            likes: 12,
            views: 120,
            savedCount: 8,
            terrainTags: ["beach"],
            cuisineTags: ["spicy"],
            seasonTags: ["summer"],
            companionTags: ["couple"],
            highlights: ["景山公园", "鼓楼"],
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

    const response = await GET(
      new Request(
        "http://localhost/api/explore?city=beijing&trip_type=student&days=3&tags=city-walk,budget&featured=true&terrain=beach&cuisine=spicy&season=summer&companion=couple",
      ),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      ok: true,
      items: [
        {
          id: "row-1",
          slug: "beijing-budget-campus-3d",
          title: "北京学生党 3 天轻预算路线",
          summary: "summary",
          city: "Beijing",
          cityCode: "beijing",
          region: "Beijing",
          tripType: "student",
          days: 3,
          tags: ["city-walk", "budget"],
          theme: undefined,
          pace: "slow",
          coverImageUrl: undefined,
          archiveIntro: undefined,
          featured: true,
          featuredReason: "good for first timers",
          creatorType: "editorial",
          creatorId: "editor-1",
          creator: "Wanderly",
          likes: 12,
          views: 120,
          savedCount: 8,
          terrainTags: ["beach"],
          cuisineTags: ["spicy"],
          seasonTags: ["summer"],
          companionTags: ["couple"],
          highlights: ["景山公园", "鼓楼"],
        },
      ],
    });
  });
});
