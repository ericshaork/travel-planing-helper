import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { analyzeDayPace, extractPlaceNamesFromTripPlan } from "../../lib/trip/enrichTripPlan";
import type { RouteLeg } from "../../lib/route/types";
import { tripPlanSchema } from "../../lib/trip/schema";

const baseTripPlan = tripPlanSchema.parse({
  tripTitle: "厦门三天慢慢走",
  summary: "按片区安排，少绕路。",
  destination: "厦门",
  days: 1,
  travelStyleSummary: "不赶时间。",
  weatherSummary: {
    available: false,
    overview: "先按通用方案来。",
    dailyForecast: [],
    alerts: [],
    reminders: [],
    dataNote: "未接实时天气。",
  },
  budgetSummary: {
    totalEstimate: "约 2500 元",
    transport: "约 700 元",
    hotel: "约 800 元",
    food: "约 450 元",
    tickets: "约 200 元",
    localTransport: "约 150 元",
    flexibleSpending: "约 200 元",
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
      theme: "海边和老城散步",
      routeOrder: ["酒店", "沙坡尾", "中山路步行街"],
      routeReason: "尽量顺路走。",
      morning: [
        {
          timeLabel: "09:30",
          placeName: "沙坡尾",
          type: "attraction",
          reason: "先去海边。",
          guide: ["早点去人少一点。"],
        },
        {
          placeName: "沙坡尾",
          type: "attraction",
          reason: "重复项用于测试去重。",
          guide: [],
        },
      ],
      afternoon: [
        {
          placeName: "午餐",
          type: "food",
          reason: "先吃饭。",
          guide: [],
        },
        {
          placeName: "中山路步行街",
          type: "shopping",
          reason: "下午逛逛。",
          guide: [],
        },
      ],
      evening: [
        {
          placeName: "回酒店休息",
          type: "free_time",
          reason: "晚上早点收。",
          guide: [],
        },
      ],
      dailyTips: [],
    },
  ],
  generalTips: [],
  warnings: [],
});

describe("trip pace helpers", () => {
  it("能从 Day / TimeSlot / ItineraryBlock 提取地点", () => {
    const extracted = extractPlaceNamesFromTripPlan(baseTripPlan);

    expect(extracted).toEqual([
      {
        dayIndex: 1,
        places: [
          {
            name: "沙坡尾",
            dayIndex: 1,
            slot: "morning",
            itemIndex: 0,
            itemType: "attraction",
          },
          {
            name: "中山路步行街",
            dayIndex: 1,
            slot: "afternoon",
            itemIndex: 1,
            itemType: "shopping",
          },
        ],
      },
    ]);
  });

  it("保持每天地点顺序并去重", () => {
    const extracted = extractPlaceNamesFromTripPlan(baseTripPlan);

    expect(extracted[0]?.places.map((place) => place.name)).toEqual([
      "沙坡尾",
      "中山路步行街",
    ]);
  });

  it("不会把空字符串或泛化餐饮词当地点", () => {
    const tripPlan = {
      ...baseTripPlan,
      dailyItinerary: [
        {
          ...baseTripPlan.dailyItinerary[0],
          afternoon: [
            {
              placeName: "  ",
              type: "other" as const,
              reason: "空值",
              guide: [],
            },
            {
              placeName: "晚餐",
              type: "food" as const,
              reason: "泛化餐饮词",
              guide: [],
            },
          ],
        },
      ],
    };

    const extracted = extractPlaceNamesFromTripPlan(tripPlan);
    expect(extracted[0]?.places).toHaveLength(1);
    expect(extracted[0]?.places[0]?.name).toBe("沙坡尾");
  });

  it("单日地点过多会触发 too_many_places", () => {
    const summary = analyzeDayPace({
      dayIndex: 1,
      places: [
        { name: "A", slot: "morning" },
        { name: "B", slot: "morning" },
        { name: "C", slot: "afternoon" },
        { name: "D", slot: "afternoon" },
        { name: "E", slot: "evening" },
      ],
      routeLegs: [],
      unresolvedPlaces: [],
    });

    expect(summary.warnings.some((warning) => warning.type === "too_many_places")).toBe(true);
  });

  it("单段通勤过长会触发 long_transfer", () => {
    const summary = analyzeDayPace({
      dayIndex: 1,
      places: [
        { name: "A", slot: "morning" },
        { name: "B", slot: "afternoon" },
      ],
      routeLegs: [
        {
          fromName: "A",
          toName: "B",
          distanceMeters: 18000,
          durationMinutes: 50,
          mode: "driving",
          provider: "mock",
        },
      ],
      unresolvedPlaces: [],
    });

    expect(summary.warnings.some((warning) => warning.type === "long_transfer")).toBe(true);
  });

  it("单日总通勤过长会触发 high_total_transfer", () => {
    const legs: RouteLeg[] = [
      {
        fromName: "A",
        toName: "B",
        distanceMeters: 10000,
        durationMinutes: 60,
        mode: "driving",
        provider: "mock",
      },
      {
        fromName: "B",
        toName: "C",
        distanceMeters: 14000,
        durationMinutes: 65,
        mode: "driving",
        provider: "mock",
      },
    ];

    const summary = analyzeDayPace({
      dayIndex: 1,
      places: [
        { name: "A", slot: "morning" },
        { name: "B", slot: "afternoon" },
        { name: "C", slot: "evening" },
      ],
      routeLegs: legs,
      unresolvedPlaces: [],
    });

    expect(
      summary.warnings.some((warning) => warning.type === "high_total_transfer"),
    ).toBe(true);
  });

  it("未解析地点会触发 unresolved_place", () => {
    const summary = analyzeDayPace({
      dayIndex: 1,
      places: [{ name: "A", slot: "morning" }],
      routeLegs: [],
      unresolvedPlaces: ["神秘小店"],
    });

    expect(
      summary.warnings.some((warning) => warning.type === "unresolved_place"),
    ).toBe(true);
  });

  it("fallback route 会触发 fallback_estimate", () => {
    const summary = analyzeDayPace({
      dayIndex: 1,
      places: [
        { name: "A", slot: "morning" },
        { name: "B", slot: "afternoon" },
      ],
      routeLegs: [
        {
          fromName: "A",
          toName: "B",
          distanceMeters: 6200,
          durationMinutes: 18,
          mode: "driving",
          provider: "amap",
        },
      ],
      unresolvedPlaces: [],
      fallbackLegIndices: [0],
    });

    expect(
      summary.warnings.some((warning) => warning.type === "fallback_estimate"),
    ).toBe(true);
  });

  it("轻松路线不会触发 warning 或 critical", () => {
    const summary = analyzeDayPace({
      dayIndex: 1,
      places: [
        { name: "A", slot: "morning" },
        { name: "B", slot: "afternoon" },
      ],
      routeLegs: [
        {
          fromName: "A",
          toName: "B",
          distanceMeters: 1800,
          durationMinutes: 12,
          mode: "walking",
          provider: "mock",
        },
      ],
      unresolvedPlaces: [],
    });

    expect(
      summary.warnings.filter((warning) => warning.level !== "info"),
    ).toHaveLength(0);
  });
});
