import { describe, expect, it } from "vitest";

import { mapProjectSchema } from "../../lib/map-studio/schema";
import { buildMapProjectFromTripPlan } from "../../lib/map-studio/trip-adapter";
import type { TripPlan, TripRequest } from "../../lib/trip/types";

const tripRequest: TripRequest = {
  departureCity: "深圳",
  destinationCity: "厦门",
  days: 2,
  budget: 2500,
  currency: "CNY",
  interests: ["海边", "美食"],
  travelStyles: ["轻松"],
  mustVisitPlaces: [],
  avoidPlaces: [],
};

const tripPlan: TripPlan = {
  tripTitle: "厦门 2 天慢慢走",
  summary: "轻松看海和吃小吃。",
  destination: "厦门",
  days: 2,
  travelStyleSummary: "轻松",
  weatherSummary: {
    available: false,
    overview: "暂无实时天气。",
    dailyForecast: [],
    alerts: [],
    reminders: [],
    dataNote: "测试数据。",
  },
  budgetSummary: {
    totalEstimate: "约 2500 元",
    transport: "800 元",
    hotel: "900 元",
    food: "400 元",
    tickets: "200 元",
    localTransport: "100 元",
    flexibleSpending: "100 元",
    note: "测试数据。",
  },
  hotelAreaAdvice: [],
  transportAdvice: {
    summary: "按需选择交通方式。",
    options: [
      {
        mode: "other",
        pros: ["灵活"],
        cons: ["需要自行确认"],
        recommendation: "出发前确认班次。",
      },
    ],
    suggestedPlatforms: [],
    note: "测试数据。",
  },
  dailyItinerary: [
    {
      day: 1,
      theme: "海边散步",
      routeOrder: ["沙坡尾"],
      routeReason: "先在近处慢慢走。",
      morning: [],
      afternoon: [],
      evening: [],
      dailyTips: [],
    },
    {
      day: 2,
      theme: "城市小吃",
      routeOrder: ["八市"],
      routeReason: "集中在市区。",
      morning: [],
      afternoon: [],
      evening: [],
      dailyTips: [],
    },
  ],
  generalTips: [],
  warnings: [],
};

describe("Map Studio field contract", () => {
  it("从 TripPlan 生成可校验的 MapProject", () => {
    const project = buildMapProjectFromTripPlan({
      tripPlan,
      tripRequest,
      projectId: "project-1",
      now: "2026-09-24T00:00:00.000Z",
    });

    expect(() => mapProjectSchema.parse(project)).not.toThrow();
    expect(project.projectId).toBe("project-1");
    expect(project.city).toBe("厦门");
    expect(project.regions.length).toBeGreaterThanOrEqual(3);
    expect(project.places.length).toBeGreaterThanOrEqual(3);
    expect(project.layers.map((layer) => layer.type)).toEqual([
      "regions",
      "labels",
      "plan_places",
      "places",
      "routes",
      "candidates",
      "traffic",
    ]);
  });

  it("Phase 1 字段合同包含区域边界、地点可信状态和路线 path", () => {
    const project = buildMapProjectFromTripPlan({ tripPlan, tripRequest });
    const parsed = mapProjectSchema.parse(project);

    expect(parsed.regions[0].boundary.coordinates[0]).toHaveLength(4);
    expect(parsed.regions[0].dataStatus).toBe("mock");
    expect(parsed.places[0].openingHours).toContain("官方平台");
    expect(parsed.places[0].ticketInfo).toContain("实时票价");
    expect(parsed.routes[0].path).toBeDefined();
    expect(parsed.candidatePlaceIds).toEqual([]);
    expect(parsed.candidatePlaces).toEqual([]);
  });
});
