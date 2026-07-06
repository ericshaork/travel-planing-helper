import { describe, expect, it } from "vitest";

import type { TripResultEnrichment } from "../../lib/trip/enrichment-types";
import {
  buildDayRouteInsight,
  buildEnrichmentWeatherQuery,
  resolveInsightDayNumber,
} from "../../lib/trip/route-insight";
import { tripPlanSchema, tripRequestSchema } from "../../lib/trip/schema";

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

const enrichment: TripResultEnrichment = {
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
      {
        dayIndex: 2,
        totalDistanceMeters: 3300,
        totalDurationMinutes: 28,
        legs: [],
        unresolvedPlaces: ["神秘小店"],
        warnings: [],
      },
    ],
    mapPoints: [
      {
        id: "day-1-a",
        name: "沙坡尾",
        dayIndex: 1,
        slot: "morning",
        itemIndex: 0,
        itemType: "attraction",
        resolved: true,
      },
      {
        id: "day-2-a",
        name: "中山路步行街",
        dayIndex: 2,
        slot: "morning",
        itemIndex: 0,
        itemType: "shopping",
        resolved: true,
      },
    ],
    warnings: [],
  },
  weatherSummary: {
    city: "厦门",
    available: true,
    overview: "已整理厦门未来 2 天的天气。",
    daySummaries: [],
    impacts: [
      {
        id: "2026-07-10-rain",
        date: "2026-07-10",
        type: "rain",
        level: "warning",
        message: "2026-07-10 可能有雨。",
      },
      {
        id: "trip-info",
        type: "unavailable",
        level: "info",
        message: "出发前再确认。",
      },
    ],
    warnings: [],
    alerts: [],
  },
};

describe("route insight helpers", () => {
  it("会优先使用 tripRequest 日期生成 weather query", () => {
    expect(buildEnrichmentWeatherQuery(tripPlan, tripRequest)).toEqual({
      city: "厦门",
      startDate: "2026-07-10",
      endDate: "2026-07-11",
      days: 2,
    });
  });

  it("没有合法请求日期时回退到 daily itinerary 日期", () => {
    expect(buildEnrichmentWeatherQuery(tripPlan, null)).toEqual({
      city: "厦门",
      startDate: "2026-07-10",
      endDate: "2026-07-11",
      days: 2,
    });
  });

  it("selected day 越界时回退到 Day 1", () => {
    expect(resolveInsightDayNumber(tripPlan, 99)).toBe(1);
  });

  it("会筛出当前 Day 的 route summary、map points 和 weather impacts", () => {
    const result = buildDayRouteInsight(tripPlan, enrichment, 2);

    expect(result.dayNumber).toBe(2);
    expect(result.dayTitle).toBe("老城区慢逛");
    expect(result.routeSummary?.dayIndex).toBe(2);
    expect(result.mapPoints).toHaveLength(1);
    expect(result.weatherImpacts).toHaveLength(1);
    expect(result.weatherImpacts[0]?.type).toBe("unavailable");
  });
});
