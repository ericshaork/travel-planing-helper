import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createExploreListHandler } from "../../app/api/explore/route";
import type { ExploreTripListFilters } from "../../lib/explore/types";

describe("GET /api/explore", () => {
  it("returns trip package list items before older fallback sources", async () => {
    const GET = createExploreListHandler({
      async listPublished() {
        return [];
      },
    } as never);

    const response = await GET(new Request("http://localhost/api/explore?limit=5"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.items.map((item: { id: string }) => item.id)).toEqual([
      "beijing_couple_golden_v2",
      "hangzhou_couple_golden_v1",
      "chengdu_couple_golden_v1",
      "shanghai_couple_v1",
      "xian_couple_v1",
    ]);
    expect(json.items.map((item: { city: string }) => item.city)).toEqual([
      "北京",
      "杭州",
      "成都",
      "上海",
      "西安",
    ]);
    expect(
      json.items.every((item: { coverImageUrl?: string }) =>
        item.coverImageUrl?.startsWith("/images/trip-packages/"),
      ),
    ).toBe(true);
  });

  it("keeps display cities Chinese and removes old same-city fallback duplicates", async () => {
    const GET = createExploreListHandler({
      async listPublished() {
        return [];
      },
    } as never);

    const response = await GET(new Request("http://localhost/api/explore?limit=20"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);

    const cities = json.items.map((item: { city: string }) => item.city);
    expect(cities).toEqual(expect.arrayContaining(["北京", "杭州", "成都", "上海", "西安"]));
    expect(cities).not.toContain("Beijing");
    expect(cities).not.toContain("Hangzhou");
    expect(cities).not.toContain("Chengdu");
    expect(cities).not.toContain("Shanghai");
    expect(cities).not.toContain("Xi'an");

    expect(
      json.items.filter((item: { cityCode: string }) => item.cityCode === "beijing"),
    ).toHaveLength(1);
    expect(
      json.items.some((item: { slug: string }) => item.slug === "beijing-hutong-archive"),
    ).toBe(false);
  });

  it("returns repository published list items and parses future filter params", async () => {
    const GET = createExploreListHandler({
      async listPublished(filters: ExploreTripListFilters) {
        expect(filters).toEqual({
          city: "test-city",
          tripType: "student",
          days: 3,
          tags: ["city-walk", "budget"],
          featured: false,
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
            title: "北京学生 3 天游",
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
        "http://localhost/api/explore?city=test-city&trip_type=student&days=3&tags=city-walk,budget&featured=false&terrain=beach&cuisine=spicy&season=summer&companion=couple",
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
          title: "北京学生 3 天游",
          summary: "summary",
          city: "北京",
          cityCode: "beijing",
          region: "北京",
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

  it("keeps mock fallback when package, normalized, and repository sources miss", async () => {
    const GET = createExploreListHandler({
      async listPublished() {
        return [];
      },
    } as never);

    const response = await GET(
      new Request("http://localhost/api/explore?q=definitely-no-real-trip-package"),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.items.length).toBeGreaterThan(0);
  });
});
