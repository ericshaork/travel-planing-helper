import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { MockLLMProvider } from "../../lib/ai/mock";
import {
  generateTripResponseSchema,
  parseTripResponseSchema,
  tripPlanSchema,
  tripRequestDraftSchema,
} from "../../lib/trip/schema";
import type { TripRequest } from "../../lib/trip/types";

const tripRequest: TripRequest = {
  departureCity: "深圳",
  destinationCity: "厦门",
  days: 3,
  budget: 2500,
  currency: "CNY",
  interests: ["海边", "美食", "拍照"],
  travelStyles: ["轻松"],
  mustVisitPlaces: ["鼓浪屿"],
  avoidPlaces: ["寺庙"],
};

describe("MockLLMProvider", () => {
  const provider = new MockLLMProvider();

  it("parseTrip 返回通过正式 Schema 的草稿、缺失字段和追问", async () => {
    const result = await provider.parseTrip({
      text: "我想去杭州玩两天，不想早起，预算 1500，想轻松一点。",
    });

    expect(parseTripResponseSchema.safeParse(result).success).toBe(true);
    expect(result.parsed).toMatchObject({
      destinationCity: "杭州",
      days: 2,
      budget: 1500,
    });
    expect(result.missingFields).toContain("departureCity");
    expect(result.followUpQuestions).toContain("你从哪个城市出发？");
  });

  it("generateTrip 返回完整合法行程和天气失败 warning", async () => {
    const result = generateTripResponseSchema.parse(
      await provider.generateTrip({
        tripRequest,
        weatherWarning:
          "天气接口刚刚没接上，先给你一版不含实时天气的。",
      }),
    );

    expect(generateTripResponseSchema.safeParse(result).success).toBe(true);
    expect(tripPlanSchema.safeParse(result.tripPlan).success).toBe(true);
    expect(result.tripPlan.dailyItinerary).toHaveLength(3);
    expect(result.tripPlan.weatherSummary.available).toBe(false);
    expect(result.warnings).toContain(
      "天气接口刚刚没接上，先给你一版不含实时天气的。",
    );
  });

  it("regenerateTrip 返回完整新方案和 appliedChanges", async () => {
    const original = generateTripResponseSchema.parse(
      await provider.generateTrip({ tripRequest }),
    );
    const result = generateTripResponseSchema.parse(
      await provider.regenerateTrip({
        tripRequest,
        previousPlan: original.tripPlan,
        modificationRequest: "整体再轻松一点，晚上留更多自由时间。",
      }),
    );

    expect(generateTripResponseSchema.safeParse(result).success).toBe(true);
    expect(tripPlanSchema.safeParse(result.tripPlan).success).toBe(true);
    expect(result.tripPlan).not.toBe(original.tripPlan);
    expect(result.appliedChanges).toEqual([
      "整体再轻松一点，晚上留更多自由时间。",
    ]);
  });

  it("repairJson 在原始值无效时返回通过目标 Schema 的 fallback", async () => {
    const repaired = await provider.repairJson({
      rawOutput: "{not-valid-json",
      targetSchema: tripRequestDraftSchema,
      fallbackValue: {
        destinationCity: "成都",
        days: 4,
      },
    });

    expect(tripRequestDraftSchema.safeParse(repaired).success).toBe(true);
    expect(repaired).toEqual({
      destinationCity: "成都",
      days: 4,
    });
  });
});
