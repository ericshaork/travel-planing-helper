import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createEnrichTripHandler } from "../../app/api/enrich-trip/route";
import type { TripResultEnrichment } from "../../lib/trip/enrichment-types";
import { tripPlanSchema, tripRequestSchema } from "../../lib/trip/schema";
import { AppError } from "../../lib/utils/errors";

const tripPlan = tripPlanSchema.parse({
  tripTitle: "厦门两天顺路版",
  summary: "按片区慢慢走。",
  destination: "厦门",
  days: 2,
  travelStyleSummary: "少折腾。",
  weatherSummary: {
    available: false,
    overview: "先按通用方案来。",
    dailyForecast: [],
    alerts: [],
    reminders: [],
    dataNote: "未接实时天气。",
  },
  budgetSummary: {
    totalEstimate: "约 2200 元",
    transport: "约 700 元",
    hotel: "约 700 元",
    food: "约 400 元",
    tickets: "约 200 元",
    localTransport: "约 100 元",
    flexibleSpending: "约 100 元",
    note: "预算仅供参考。",
  },
  hotelAreaAdvice: [],
  transportAdvice: {
    summary: "先看高铁。",
    options: [
      {
        mode: "high_speed_rail",
        pros: ["进城方便"],
        cons: ["热门日期要提早订"],
        recommendation: "先看 12306。",
      },
    ],
    suggestedPlatforms: ["12306"],
    note: "票价不是实时数据。",
  },
  dailyItinerary: [
    {
      day: 1,
      date: "2026-07-10",
      theme: "海边散步",
      routeOrder: ["沙坡尾"],
      routeReason: "先慢慢走。",
      morning: [
        {
          placeName: "沙坡尾",
          type: "attraction",
          reason: "先去海边。",
          guide: [],
        },
      ],
      afternoon: [],
      evening: [],
      dailyTips: [],
    },
    {
      day: 2,
      date: "2026-07-11",
      theme: "老城区慢逛",
      routeOrder: ["中山路步行街"],
      routeReason: "少折返。",
      morning: [
        {
          placeName: "中山路步行街",
          type: "shopping",
          reason: "吃吃走走。",
          guide: [],
        },
      ],
      afternoon: [],
      evening: [],
      dailyTips: [],
    },
  ],
  generalTips: [],
  warnings: [],
});

const tripRequest = tripRequestSchema.parse({
  departureCity: "深圳",
  destinationCity: "厦门",
  startDate: "2026-07-10",
  endDate: "2026-07-11",
  days: 2,
  budget: 2200,
  currency: "CNY",
  interests: ["海边"],
  travelStyles: ["轻松"],
  mustVisitPlaces: [],
  avoidPlaces: [],
});

function postJson(body: unknown): Request {
  return new Request("http://localhost/api/enrich-trip", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/enrich-trip", () => {
  it("成功返回 TripEnrichment 和派生天气摘要", async () => {
    const mockPayload: TripResultEnrichment = {
      enrichment: {
        daySummaries: [
          {
            dayIndex: 1,
            totalDistanceMeters: 1200,
            totalDurationMinutes: 12,
            legs: [],
            unresolvedPlaces: [],
            warnings: [],
          },
        ],
        mapPoints: [],
        warnings: [],
      },
      weatherSummary: {
        city: "厦门",
        available: true,
        overview: "已整理厦门未来 2 天的天气。",
        daySummaries: [],
        impacts: [],
        warnings: [],
        alerts: [],
      },
    };
    const POST = createEnrichTripHandler(async () => mockPayload);
    const response = await POST(postJson({ tripPlan, tripRequest }));
    const payload = (await response.json()) as TripResultEnrichment;

    expect(response.status).toBe(200);
    expect(payload).toEqual(mockPayload);
  });

  it("非法输入返回统一 INVALID_INPUT", async () => {
    const POST = createEnrichTripHandler(async () => {
      throw new Error("should not reach");
    });
    const response = await POST(
      postJson({
        tripPlan: {
          destination: "厦门",
        },
      }),
    );
    const payload = (await response.json()) as {
      error?: { code?: string; message?: string };
    };

    expect(response.status).toBe(400);
    expect(payload.error?.code).toBe("INVALID_INPUT");
  });

  it("上游天气错误会返回 502", async () => {
    const POST = createEnrichTripHandler(async () => {
      throw new AppError(
        "WEATHER_API_FAILED",
        "天气服务暂时不可用。",
      );
    });
    const response = await POST(postJson({ tripPlan, tripRequest }));
    const payload = (await response.json()) as {
      error?: { code?: string };
    };

    expect(response.status).toBe(502);
    expect(payload.error?.code).toBe("WEATHER_API_FAILED");
  });
});
