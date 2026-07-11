import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  buildExploreTripInsertRow,
  buildExploreTripUpdateRow,
  mapExploreTripContentRow,
} from "../../lib/explore/repository";

describe("explore repository mappers", () => {
  it("maps content insert to Supabase row shape", () => {
    const row = buildExploreTripInsertRow({
      externalId: "beijing_student_3d_002",
      slug: "beijing-budget-campus-3d",
      title: "北京学生党 3 天轻预算路线",
      summary: "summary",
      city: "Beijing",
      cityCode: "beijing",
      tripType: "student",
      days: 3,
      tags: ["预算友好"],
      pace: "slow",
      budgetLevel: "low",
      budgetNote: "全程控制预算。",
      highlights: ["预算友好", "城市漫步"],
      source: {
        pipeline: "travel-content-pipeline",
      },
      dailyItinerary: [],
      pois: [],
      food: [],
      rawContent: {
        foo: "bar",
      },
    });

    expect(row).toMatchObject({
      external_id: "beijing_student_3d_002",
      city_code: "beijing",
      trip_type: "student",
      pace: "slow",
      budget_level: "low",
      status: "draft",
      review_status: "pending",
      source_pipeline: "travel-content-pipeline",
    });
  });

  it("maps Supabase row back to ExploreTripContent", () => {
    const content = mapExploreTripContentRow({
      id: "row-1",
      external_id: "beijing_student_3d_002",
      slug: "beijing-budget-campus-3d",
      title: "北京学生党 3 天轻预算路线",
      summary: "summary",
      city: "Beijing",
      city_code: "beijing",
      region: "Beijing",
      trip_type: "student",
      theme: null,
      days: 3,
      tags: ["预算友好"],
      pace: "slow",
      budget_level: "low",
      budget_note: "全程控制预算。",
      status: "published",
      review_status: "approved",
      image_prompt: null,
      cover_image_url: null,
      source_pipeline: "travel-content-pipeline",
      source_batch_id: "batch-1",
      source_content_key: "item-1",
      source_file_path: "foo.json",
      highlights_json: ["预算友好", "城市漫步"],
      itinerary_days_json: [],
      poi_highlights_json: [],
      food_highlights_json: [],
      raw_content_json: {
        foo: "bar",
      },
      published_at: "2026-07-09T00:00:00.000Z",
      created_at: "2026-07-09T00:00:00.000Z",
      updated_at: "2026-07-09T00:00:00.000Z",
    });

    expect(content).toMatchObject({
      id: "row-1",
      externalId: "beijing_student_3d_002",
      cityCode: "beijing",
      tripType: "student",
      pace: "slow",
      budgetLevel: "low",
      status: "published",
      reviewStatus: "approved",
      source: {
        pipeline: "travel-content-pipeline",
        batchId: "batch-1",
        sourceContentKey: "item-1",
        sourceFilePath: "foo.json",
      },
    });
  });

  it("maps update payload to partial row shape", () => {
    const row = buildExploreTripUpdateRow({
      status: "published",
      reviewStatus: "approved",
      highlights: ["预算友好"],
      publishedAt: "2026-07-09T00:00:00.000Z",
    });

    expect(row).toEqual({
      status: "published",
      review_status: "approved",
      highlights_json: ["预算友好"],
      published_at: "2026-07-09T00:00:00.000Z",
    });
  });
});
