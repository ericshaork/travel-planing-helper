import { describe, expect, it } from "vitest";

import {
  buildExploreTripImport,
  buildExploreTripImportBatch,
  buildExploreTripSlug,
  parsePipelineExploreTrip,
} from "../../lib/explore/importer";
import { exploreTripContentInsertSchema } from "../../lib/explore/schema";

const rawPipelineTrip = {
  id: "beijing_student_3d_002",
  slug: "beijing-budget-campus-3d",
  title: "北京学生党 3 天轻预算路线",
  summary: "适合预算敏感、喜欢城市步行和地道小吃的 3 天北京路线。",
  city: {
    code: "beijing",
    name: "Beijing",
    region_name: "Beijing",
  },
  trip_type: "student",
  days: 3,
  budget: {
    level: "low",
    note: "全程以地铁和步行为主，控制门票和餐饮预算。",
  },
  pace: "slow",
  tags: ["预算友好", "城市漫步", "本地小吃"],
  image_prompt: "travel magazine collage, beijing student trip",
  archive_intro: "第一次去北京也能轻松走完。",
  featured: true,
  featured_reason: "适合第一次去北京的人",
  creator_type: "editorial",
  creator_id: "editor-1",
  creator: "Wanderly",
  likes: 10,
  views: 100,
  saved_count: 6,
  terrain_tags: ["city"],
  cuisine_tags: ["snack"],
  season_tags: ["autumn"],
  companion_tags: ["solo"],
  daily_itinerary: [
    {
      day: 1,
      title: "中轴线热身",
      summary: "先从轻量步行和城市感知开始。",
      activities: [
        {
          time_block: "morning",
          description: "景山和周边散步",
          poi_refs: ["poi-jingshan"],
          food_refs: [],
        },
      ],
    },
    {
      day: 1,
      title: "胡同慢逛",
      summary: "下午和晚间放到胡同与小店。",
      activities: [
        {
          time_block: "afternoon",
          description: "逛鼓楼和胡同",
          poi_refs: ["poi-gulou"],
          food_refs: ["food-luzhu"],
        },
      ],
    },
  ],
  pois: [
    {
      id: "poi-jingshan",
      name: "景山公园",
      district: "东城区",
      type: "park",
      reason: "预算低，也适合看城市层次。",
      recommended_duration_minutes: 90,
    },
    {
      id: "poi-gulou",
      name: "鼓楼",
      district: "东城区",
      type: "landmark",
      reason: "胡同线的起点很好用。",
      recommended_duration_minutes: 60,
    },
  ],
  food: [
    {
      id: "food-luzhu",
      name: "卤煮小馆",
      district: "东城区",
      category: "local",
      reason: "本地味道强，价格友好。",
    },
  ],
};

describe("explore importer", () => {
  it("parses real pipeline JSON shape", () => {
    const parsed = parsePipelineExploreTrip(rawPipelineTrip);

    expect(parsed.city.code).toBe("beijing");
    expect(parsed.budget?.level).toBe("low");
    expect(parsed.pois).toHaveLength(2);
    expect(parsed.food).toHaveLength(1);
    expect(parsed.featured_reason).toBe("适合第一次去北京的人");
    expect(parsed.raw).toEqual(rawPipelineTrip);
  });

  it("builds deterministic slug with city code", () => {
    expect(
      buildExploreTripSlug({
        cityCode: "beijing",
        title: "北京学生党 3 天轻预算路线",
        days: 3,
      }),
    ).toBe("beijing-北京学生党-3-天轻预算路线-3d");
  });

  it("builds normalized ExploreTripContentInsert", () => {
    const result = buildExploreTripImport(rawPipelineTrip, {
      batchId: "batch-001",
      sourceFilePath: "explore/beijing_student_3d_002.json",
    });

    expect(exploreTripContentInsertSchema.parse(result)).toMatchObject({
      externalId: "beijing_student_3d_002",
      slug: "beijing-budget-campus-3d",
      city: "Beijing",
      cityCode: "beijing",
      tripType: "student",
      pace: "slow",
      budgetLevel: "low",
      archiveIntro: "第一次去北京也能轻松走完。",
      featured: true,
      featuredReason: "适合第一次去北京的人",
      creatorType: "editorial",
      creatorId: "editor-1",
      creator: "Wanderly",
      likes: 10,
      views: 100,
      savedCount: 6,
      terrainTags: ["city"],
      cuisineTags: ["snack"],
      seasonTags: ["autumn"],
      companionTags: ["solo"],
      status: "draft",
      reviewStatus: "pending",
      source: {
        pipeline: "travel-content-pipeline",
        batchId: "batch-001",
        sourceFilePath: "explore/beijing_student_3d_002.json",
      },
    });
    expect(result.dailyItinerary[0]?.dayNumber).toBe(1);
    expect(result.dailyItinerary[1]?.dayNumber).toBe(2);
    expect(result.pois[0]?.name).toBe("景山公园");
    expect(result.food[0]?.name).toBe("卤煮小馆");
    expect(result.highlights.length).toBeGreaterThan(0);
  });

  it("builds batch imports and auto-fills source content key", () => {
    const batch = buildExploreTripImportBatch([rawPipelineTrip]);

    expect(batch).toHaveLength(1);
    expect(batch[0]?.source.sourceContentKey).toBe("beijing_student_3d_002");
  });
});
