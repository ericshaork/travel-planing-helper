import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { PoiProvider } from "../../lib/poi/provider";
import type { PoiSearchRequest, PoiSearchResult } from "../../lib/poi/types";
import type { RouteProvider } from "../../lib/route/provider";
import type { RouteEstimateRequest, RouteEstimateResult } from "../../lib/route/types";
import { enrichTripPlanWithRoutes } from "../../lib/trip/enrichTripPlan";
import { tripPlanSchema } from "../../lib/trip/schema";

const tripPlan = tripPlanSchema.parse({
  tripTitle: "厦门两天顺路版",
  summary: "按片区慢慢走。",
  destination: "厦门",
  days: 1,
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
      routeOrder: ["沙坡尾", "中山路步行街", "鼓浪屿"],
      routeReason: "尽量顺着走。",
      morning: [
        {
          placeName: "沙坡尾",
          type: "attraction",
          reason: "上午先去海边。",
          guide: [],
        },
      ],
      afternoon: [
        {
          placeName: "中山路步行街",
          type: "shopping",
          reason: "下午逛逛。",
          guide: [],
        },
        {
          placeName: "神秘小店",
          type: "other",
          reason: "试试查不到的点。",
          guide: [],
        },
      ],
      evening: [
        {
          placeName: "鼓浪屿",
          type: "attraction",
          reason: "晚上再去。",
          guide: [],
        },
      ],
      dailyTips: [],
    },
  ],
  generalTips: [],
  warnings: [],
});

class StaticPoiProvider implements PoiProvider {
  async searchPoi(request: PoiSearchRequest): Promise<PoiSearchResult> {
    const records: Record<string, PoiSearchResult> = {
      沙坡尾: {
        candidates: [
          {
            id: "poi-1",
            name: "沙坡尾",
            address: "厦门思明区沙坡尾",
            city: request.city,
            coordinates: { lat: 24.4383, lng: 118.0897 },
            confidence: 0.99,
            provider: "mock",
          },
        ],
      },
      中山路步行街: {
        candidates: [
          {
            id: "poi-2",
            name: "中山路步行街",
            address: "厦门思明区中山路",
            city: request.city,
            coordinates: { lat: 24.4558, lng: 118.0819 },
            confidence: 0.99,
            provider: "mock",
          },
        ],
      },
      鼓浪屿: {
        candidates: [
          {
            id: "poi-3",
            name: "鼓浪屿",
            address: "厦门思明区鼓浪屿",
            city: request.city,
            coordinates: { lat: 24.4485, lng: 118.0674 },
            confidence: 0.99,
            provider: "mock",
          },
        ],
      },
    };

    return records[request.keyword] ?? {
      candidates: [],
      warnings: ["没找到这个地点"],
    };
  }
}

class StableRouteProvider implements RouteProvider {
  async estimateRoute(request: RouteEstimateRequest): Promise<RouteEstimateResult> {
    const sameAsFirst =
      request.origin.lng === 118.4383 || request.origin.lng === 118.0897;

    return {
      leg: {
        distanceMeters: sameAsFirst ? 2100 : 3600,
        durationMinutes: sameAsFirst ? 16 : 28,
        mode: request.mode ?? "driving",
        provider: "mock",
        summary: "stable route",
      },
    };
  }
}

class PartiallyFailingRouteProvider implements RouteProvider {
  async estimateRoute(request: RouteEstimateRequest): Promise<RouteEstimateResult> {
    if (request.destination.lng === 118.0674) {
      throw new Error("route down");
    }

    return {
      leg: {
        distanceMeters: 2000,
        durationMinutes: 15,
        mode: request.mode ?? "driving",
        provider: "amap",
        summary: "fallback route",
      },
      warnings: ["高德路线服务暂时不可用，已回退为安全估算。"],
    };
  }
}

describe("trip route enrichment", () => {
  it("使用 POI + Route provider 能生成 DayRouteSummary", async () => {
    const enrichment = await enrichTripPlanWithRoutes(tripPlan, {
      poiProvider: new StaticPoiProvider(),
      routeProvider: new StableRouteProvider(),
    });

    expect(enrichment.daySummaries).toHaveLength(1);
    expect(enrichment.daySummaries[0]).toMatchObject({
      dayIndex: 1,
      unresolvedPlaces: ["神秘小店"],
    });
    expect(enrichment.daySummaries[0]?.legs).toHaveLength(2);
    expect(enrichment.mapPoints).toHaveLength(4);
  });

  it("查不到 POI 时不崩，进入 unresolvedPlaces", async () => {
    const enrichment = await enrichTripPlanWithRoutes(tripPlan, {
      poiProvider: new StaticPoiProvider(),
      routeProvider: new StableRouteProvider(),
    });

    expect(enrichment.daySummaries[0]?.unresolvedPlaces).toContain("神秘小店");
    expect(enrichment.mapPoints.find((point) => point.name === "神秘小店")?.resolved).toBe(false);
  });

  it("某段 route 失败时不崩，并给出 route_unavailable", async () => {
    const enrichment = await enrichTripPlanWithRoutes(tripPlan, {
      poiProvider: new StaticPoiProvider(),
      routeProvider: new PartiallyFailingRouteProvider(),
    });

    expect(
      enrichment.daySummaries[0]?.warnings.some(
        (warning) => warning.type === "route_unavailable",
      ),
    ).toBe(true);
  });

  it("route fallback warning 会汇总成 fallback_estimate", async () => {
    const enrichment = await enrichTripPlanWithRoutes(tripPlan, {
      poiProvider: new StaticPoiProvider(),
      routeProvider: new PartiallyFailingRouteProvider(),
    });

    expect(
      enrichment.warnings.some((warning) => warning.type === "fallback_estimate"),
    ).toBe(true);
  });

  it("不需要真实高德 Key", async () => {
    await expect(
      enrichTripPlanWithRoutes(tripPlan, {
        poiProvider: new StaticPoiProvider(),
        routeProvider: new StableRouteProvider(),
      }),
    ).resolves.toBeTruthy();
  });

  it("不会改写原始 TripPlan", async () => {
    const snapshot = JSON.parse(JSON.stringify(tripPlan));

    await enrichTripPlanWithRoutes(tripPlan, {
      poiProvider: new StaticPoiProvider(),
      routeProvider: new StableRouteProvider(),
    });

    expect(tripPlan).toEqual(snapshot);
  });
});
