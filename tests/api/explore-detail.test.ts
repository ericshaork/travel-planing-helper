import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createExploreDetailHandler } from "../../app/api/explore/[id]/route";

describe("GET /api/explore/[id]", () => {
  it("returns full detail by id", async () => {
    const GET = createExploreDetailHandler({
      async getById(id: string) {
        expect(id).toBe("123e4567-e89b-12d3-a456-426614174000");

        return {
          id: "123e4567-e89b-12d3-a456-426614174000",
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
        };
      },
      async getBySlug() {
        return null;
      },
    } as never);

    const response = await GET(
      new Request(
        "http://localhost/api/explore/123e4567-e89b-12d3-a456-426614174000",
      ),
      {
        params: Promise.resolve({
          id: "123e4567-e89b-12d3-a456-426614174000",
        }),
      },
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.item.id).toBe("123e4567-e89b-12d3-a456-426614174000");
    expect(json.item.cityCode).toBe("beijing");
  });

  it("returns 404 when detail is missing", async () => {
    const GET = createExploreDetailHandler({
      async getById() {
        return null;
      },
      async getBySlug() {
        return null;
      },
    } as never);

    const response = await GET(new Request("http://localhost/api/explore/missing"), {
      params: Promise.resolve({ id: "missing" }),
    });

    expect(response.status).toBe(404);
  });

  it("falls back to slug lookup without hitting uuid query path", async () => {
    const GET = createExploreDetailHandler({
      async getById() {
        throw new Error("getById should not be called for slug input");
      },
      async getBySlug(slug: string) {
        expect(slug).toBe("beijing-budget-campus-3d");

        return {
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
        };
      },
    } as never);

    const response = await GET(
      new Request("http://localhost/api/explore/beijing-budget-campus-3d"),
      {
        params: Promise.resolve({ id: "beijing-budget-campus-3d" }),
      },
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.item.slug).toBe("beijing-budget-campus-3d");
  });
});
