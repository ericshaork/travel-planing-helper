import { describe, expect, it } from "vitest";

import {
  applyCandidateToTripPlan,
  buildMapProjectFromTripPlan,
  createCandidateFromPlace,
  extractPlanPlacesFromTripPlan,
  mapPlaceToItineraryItem,
  revertCandidateFromTripPlan,
} from "../../lib/map-studio/trip-adapter";
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
        theme: "湖边慢慢走",
        routeOrder: [],
        routeReason: "还没有正式安排。",
        morning: [],
        afternoon: [],
        evening: [],
        dailyTips: [],
      },
    ],
    generalTips: [],
    warnings: [],
  };
}

function createTripPlanWithRealPlaces(): TripPlan {
  const tripPlan = createTripPlan();

  return {
    ...tripPlan,
    dailyItinerary: [
      {
        ...tripPlan.dailyItinerary[0]!,
        routeOrder: ["西湖断桥", "神秘小店"],
        morning: [
          {
            timeLabel: "09:30",
            placeName: "西湖断桥",
            type: "attraction",
            reason: "先看湖边经典视角。",
            suggestedDuration: "1.5 小时",
            guide: ["沿湖慢慢走。"],
            editorId: "editor-west-lake",
            editorSlotId: "slot-morning-1",
          },
        ],
        afternoon: [
          {
            placeName: "神秘小店",
            type: "food",
            reason: "想试一下本地小吃。",
            suggestedDuration: "1 小时",
            guide: ["到店前再确认营业。"],
          },
        ],
      },
    ],
  };
}

const realMapPoint: MapPoint = {
  id: "day-1-morning-0-西湖断桥",
  name: "西湖断桥",
  dayIndex: 1,
  slot: "morning",
  itemIndex: 0,
  itemType: "attraction",
  coordinates: {
    lat: 30.258,
    lng: 120.143,
  },
  address: "杭州市西湖区北山街",
  provider: "amap",
  resolved: true,
};

describe("Map Studio TripPlan adapter", () => {
  it("可以从 TripPlan.dailyItinerary 抽取 morning / afternoon / evening 的真实地点", () => {
    const places = extractPlanPlacesFromTripPlan(createTripPlanWithRealPlaces());

    expect(places).toEqual([
      expect.objectContaining({
        day: 1,
        slot: "morning",
        itemIndex: 0,
        item: expect.objectContaining({
          placeName: "西湖断桥",
          timeLabel: "09:30",
          editorId: "editor-west-lake",
        }),
      }),
      expect.objectContaining({
        day: 1,
        slot: "afternoon",
        itemIndex: 0,
        item: expect.objectContaining({
          placeName: "神秘小店",
        }),
      }),
    ]);
  });

  it("有坐标的真实地点会进入 plan marker，并保留 day/slot/reason metadata", () => {
    const project = buildMapProjectFromTripPlan({
      tripPlan: createTripPlanWithRealPlaces(),
      mapPoints: [realMapPoint],
      now: "2026-09-24T00:00:00.000Z",
    });
    const planPlace = project.places.find((place) => place.displayName === "西湖断桥");

    expect(planPlace).toMatchObject({
      sourceType: "plan",
      assignedDayId: "1",
      lat: 30.258,
      lng: 120.143,
      relationshipToPlan: "已在行程中",
      planMeta: {
        day: 1,
        slot: "morning",
        itemIndex: 0,
        placeName: "西湖断桥",
        reason: "先看湖边经典视角。",
        suggestedDuration: "1.5 小时",
        timeLabel: "09:30",
        editorId: "editor-west-lake",
        editorSlotId: "slot-morning-1",
      },
    });
  });

  it("无坐标的真实地点进入 unresolved list，不会被静默丢弃", () => {
    const project = buildMapProjectFromTripPlan({
      tripPlan: createTripPlanWithRealPlaces(),
      mapPoints: [realMapPoint],
    });

    expect(project.unresolvedPlaces).toEqual([
      expect.objectContaining({
        placeName: "神秘小店",
        day: 1,
        slot: "afternoon",
        status: "missing_coordinates",
      }),
    ]);
  });

  it("有真实地点时不再返回纯 mock project，mock 只在空行程 fallback 使用", () => {
    const realProject = buildMapProjectFromTripPlan({
      tripPlan: createTripPlanWithRealPlaces(),
      mapPoints: [realMapPoint],
    });
    const fallbackProject = buildMapProjectFromTripPlan({ tripPlan: createTripPlan() });

    expect(realProject.places.map((place) => place.displayName)).toContain("西湖断桥");
    expect(realProject.places.some((place) => place.sourceType === "mock")).toBe(false);
    expect(fallbackProject.places.every((place) => place.sourceType === "mock")).toBe(
      true,
    );
  });

  it("将 MapPlace 转成现有 ItineraryItem，不引入新行程 schema", () => {
    const project = buildMapProjectFromTripPlan({ tripPlan: createTripPlan() });
    const place = project.places[0];
    const item = mapPlaceToItineraryItem({ place, slot: "morning" });

    expect(item.placeName).toBe(place.displayName);
    expect(item.type).toBe("attraction");
    expect(item.editorId).toBe(`map-${place.id}`);
    expect(item.editorSlotId).toBe("morning");
    expect(item.guide.join(" ")).toContain("官方平台");
  });

  it("候选地点可以显式写回某一天某个 slot", () => {
    const tripPlan = createTripPlan();
    const project = buildMapProjectFromTripPlan({ tripPlan });
    const candidate = createCandidateFromPlace(
      project.places[0],
      "2026-09-24T00:00:00.000Z",
    );

    const result = applyCandidateToTripPlan({
      tripPlan,
      candidate,
      dayNumber: 1,
      slot: "afternoon",
      now: "2026-09-24T00:01:00.000Z",
    });

    expect(result.tripPlan.dailyItinerary[0].afternoon).toHaveLength(1);
    expect(result.tripPlan.dailyItinerary[0].afternoon[0].placeName).toBe(
      project.places[0].displayName,
    );
    expect(result.tripPlan.dailyItinerary[0].routeOrder).toEqual([
      project.places[0].displayName,
    ]);
    expect(result.candidate.status).toBe("assigned");
    expect(result.candidate.targetDayId).toBe("1");
    expect(result.candidate.targetSlot).toBe("afternoon");
  });

  it("可以撤销最近一次候选写回并保留候选状态", () => {
    const tripPlan = createTripPlan();
    const project = buildMapProjectFromTripPlan({ tripPlan });
    const candidate = createCandidateFromPlace(
      project.places[0],
      "2026-09-24T00:00:00.000Z",
    );
    const assigned = applyCandidateToTripPlan({
      tripPlan,
      candidate,
      dayNumber: 1,
      slot: "afternoon",
      now: "2026-09-24T00:01:00.000Z",
    });

    const reverted = revertCandidateFromTripPlan({
      tripPlan: assigned.tripPlan,
      candidate: assigned.candidate,
      dayNumber: 1,
      slot: "afternoon",
    });

    expect(reverted.removed).toBe(true);
    expect(reverted.tripPlan.dailyItinerary[0].afternoon).toHaveLength(0);
    expect(reverted.tripPlan.dailyItinerary[0].routeOrder).toEqual([]);
    expect(reverted.candidate.status).toBe("candidate");
    expect(reverted.candidate.targetDayId).toBeUndefined();
    expect(reverted.candidate.place.isCandidate).toBe(true);
  });

  it("目标 Day 不存在时拒绝静默写回", () => {
    const tripPlan = createTripPlan();
    const project = buildMapProjectFromTripPlan({ tripPlan });
    const candidate = createCandidateFromPlace(project.places[0]);

    expect(() =>
      applyCandidateToTripPlan({
        tripPlan,
        candidate,
        dayNumber: 9,
        slot: "morning",
      }),
    ).toThrow("Day 9 does not exist");
  });
});
