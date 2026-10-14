import { describe, expect, it } from "vitest";

import {
  buildRouteHints,
  estimateMapDistanceKm,
} from "../../lib/map-studio/route-hints";
import { buildMapProjectFromTripPlan, createCandidateFromPlace } from "../../lib/map-studio/trip-adapter";
import type { MapPoint } from "../../lib/trip/enrichment-types";
import type { TripPlan } from "../../lib/trip/types";

function createTripPlan(): TripPlan {
  return {
    tripTitle: "杭州 1 天轻松走",
    summary: "慢慢看湖边。",
    destination: "杭州",
    days: 1,
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
      totalEstimate: "约 1500 元",
      transport: "500 元",
      hotel: "500 元",
      food: "250 元",
      tickets: "100 元",
      localTransport: "80 元",
      flexibleSpending: "70 元",
      note: "测试数据。",
    },
    hotelAreaAdvice: [],
    transportAdvice: {
      summary: "按需选择交通方式。",
      options: [],
      suggestedPlatforms: [],
      note: "测试数据。",
    },
    dailyItinerary: [
      {
        day: 1,
        theme: "湖边慢慢走",
        routeOrder: ["杭州城市地标"],
        routeReason: "先在近处慢慢走。",
        morning: [
          {
            placeName: "杭州城市地标",
            type: "attraction",
            reason: "测试地点。",
            guide: ["测试。"],
          },
        ],
        afternoon: [],
        evening: [],
        dailyTips: [],
      },
    ],
    generalTips: [],
    warnings: [],
  };
}

function createMapPoint(input: {
  name: string;
  itemIndex: number;
  slot?: "morning" | "afternoon" | "evening";
  lat?: number;
  lng?: number;
}): MapPoint {
  return {
    id: `day-1-${input.slot ?? "morning"}-${input.itemIndex}-${input.name}`,
    name: input.name,
    dayIndex: 1,
    slot: input.slot ?? "morning",
    itemIndex: input.itemIndex,
    itemType: "attraction",
    coordinates: {
      lat: input.lat ?? 30.2741 + input.itemIndex * 0.001,
      lng: input.lng ?? 120.1551 + input.itemIndex * 0.001,
    },
    provider: "amap",
    resolved: true,
  };
}

describe("Map Studio route hints", () => {
  it("同区域且距离较近时给出适合同一天安排的提示", () => {
    const tripPlan = createTripPlan();
    const mapProject = buildMapProjectFromTripPlan({
      tripPlan,
      mapPoints: [createMapPoint({ name: "杭州城市地标", itemIndex: 0 })],
    });
    const candidate = createCandidateFromPlace(mapProject.places[0]!);

    const hints = buildRouteHints({
      tripPlan,
      mapProject,
      candidate,
      dayNumber: 1,
    });

    expect(hints.map((hint) => hint.type)).toEqual(
      expect.arrayContaining(["same_region", "distance_near"]),
    );
    expect(hints.map((hint) => hint.message).join(" ")).toContain("适合同一天安排");
  });

  it("当天地点过多且同类型过密时给出节奏提醒", () => {
    const tripPlan = createTripPlan();
    const busyItems = Array.from({ length: 5 }, (_, index) => ({
      placeName: `景点 ${index + 1}`,
      type: "attraction" as const,
      reason: "测试地点。",
      guide: ["测试。"],
    }));
    const busyTripPlan: TripPlan = {
      ...tripPlan,
      dailyItinerary: [
        {
          ...tripPlan.dailyItinerary[0]!,
          routeOrder: busyItems.map((item) => item.placeName),
          morning: busyItems.slice(0, 2),
          afternoon: busyItems.slice(2, 4),
          evening: busyItems.slice(4),
        },
      ],
    };
    const mapProject = buildMapProjectFromTripPlan({
      tripPlan: busyTripPlan,
      mapPoints: busyItems.map((item, index) =>
        createMapPoint({
          name: item.placeName,
          itemIndex: index % 2,
          slot: index < 2 ? "morning" : index < 4 ? "afternoon" : "evening",
        }),
      ),
    });
    const candidate = createCandidateFromPlace(mapProject.places[0]!);

    const hints = buildRouteHints({
      tripPlan: busyTripPlan,
      mapProject,
      candidate,
      dayNumber: 1,
    });

    expect(hints.map((hint) => hint.type)).toEqual(
      expect.arrayContaining(["day_capacity", "category_density"]),
    );
  });

  it("候选地点距离当天路线较远时提示单独安排半天", () => {
    const tripPlan = createTripPlan();
    const mapProject = buildMapProjectFromTripPlan({
      tripPlan,
      mapPoints: [createMapPoint({ name: "杭州城市地标", itemIndex: 0 })],
    });
    const farPlace = {
      ...mapProject.places[0]!,
      id: "far-place",
      displayName: "远处山谷",
      name: "远处山谷",
      lat: mapProject.places[0]!.lat + 0.4,
      lng: mapProject.places[0]!.lng + 0.4,
      regionId: mapProject.regions[2]!.id,
    };
    const farProject = {
      ...mapProject,
      places: [...mapProject.places, farPlace],
    };
    const candidate = createCandidateFromPlace(farPlace);

    const hints = buildRouteHints({
      tripPlan,
      mapProject: farProject,
      candidate,
      dayNumber: 1,
    });

    expect(hints.map((hint) => hint.type)).toContain("distance_far");
    expect(hints.map((hint) => hint.message).join(" ")).toContain("单独安排半天");
  });

  it("提示文案不声称掌握实时交通、开放时间或拥挤度", () => {
    const tripPlan = createTripPlan();
    const mapProject = buildMapProjectFromTripPlan({
      tripPlan,
      mapPoints: [createMapPoint({ name: "杭州城市地标", itemIndex: 0 })],
    });
    const candidate = createCandidateFromPlace(mapProject.places[0]!);
    const copy = buildRouteHints({
      tripPlan,
      mapProject,
      candidate,
      dayNumber: 1,
    })
      .map((hint) => `${hint.title}${hint.message}`)
      .join(" ");

    expect(copy).not.toMatch(/实时交通|实时开放|拥挤度|排队/);
  });

  it("距离估算 helper 返回稳定公里数", () => {
    expect(
      estimateMapDistanceKm(
        { lat: 30.2741, lng: 120.1551 },
        { lat: 30.2841, lng: 120.1651 },
      ),
    ).toBeGreaterThan(1);
  });
});
