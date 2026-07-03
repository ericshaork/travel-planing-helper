import { describe, expect, it } from "vitest";

import {
  getTimeSlotItems,
  getTimeSlotLabel,
  getTimeSlotPreview,
  mapDailyItineraryToCabinet,
  mapTripPlanToCabinets,
} from "../../lib/trip/itinerary-view";
import { tripPlanSchema } from "../../lib/trip/schema";

const tripPlan = tripPlanSchema.parse({
  tripTitle: "厦门三天慢慢走",
  summary: "按片区安排，留一点休息时间。",
  destination: "厦门",
  days: 1,
  travelStyleSummary: "节奏轻一点，不赶早。",
  weatherSummary: {
    available: false,
    overview: "先按通用方案来。",
    dailyForecast: [],
    alerts: [],
    reminders: [],
    dataNote: "没有使用实时天气。",
  },
  budgetSummary: {
    totalEstimate: "约 2500 元",
    transport: "约 700 元",
    hotel: "约 800 元",
    food: "约 450 元",
    tickets: "约 200 元",
    localTransport: "约 150 元",
    flexibleSpending: "约 200 元",
    note: "预算为估算。",
  },
  hotelAreaAdvice: [],
  transportAdvice: {
    summary: "先看高铁。",
    options: [
      {
        mode: "high_speed_rail",
        pros: ["市区往返方便"],
        cons: ["热门日期要提前订"],
        recommendation: "出发前再看班次。",
      },
    ],
    suggestedPlatforms: ["12306"],
    note: "票价不是实时的。",
  },
  dailyItinerary: [
    {
      day: 1,
      date: "2026-07-10",
      theme: "海边和城市散步",
      routeOrder: ["酒店", "沙坡尾", "八市", "酒店"],
      routeReason: "上午下午都在相近片区。",
      morning: [
        {
          timeLabel: "09:30",
          placeName: "沙坡尾",
          type: "attraction",
          reason: "早一点过去更舒服。",
          suggestedDuration: "2 小时",
          guide: ["先沿海边走一圈"],
          transportFromPrevious: "从酒店打车过去。",
          weatherImpact: "太晒就缩短户外停留。",
          backupPlan: "改去附近室内展馆。",
          matchedInterests: ["拍照"],
        },
      ],
      afternoon: [
        {
          placeName: "八市",
          type: "food",
          reason: "下午去吃点本地小吃。",
          guide: ["人多时避开热门档口"],
          matchedInterests: ["美食"],
        },
      ],
      evening: [],
      dailyTips: ["这天别排太满"],
    },
  ],
  generalTips: [],
  warnings: [],
});

describe("itinerary view mapping", () => {
  it("将一个 day 映射为固定的上午、下午、晚上三个 slot", () => {
    const cabinet = mapDailyItineraryToCabinet(tripPlan.dailyItinerary[0]);

    expect(cabinet.slots.map((slot) => slot.key)).toEqual([
      "morning",
      "afternoon",
      "evening",
    ]);
    expect(cabinet.slots.map((slot) => slot.label)).toEqual([
      "上午",
      "下午",
      "晚上",
    ]);
  });

  it("保留各时段的 item 数量，并正确标记空 slot", () => {
    const cabinet = mapDailyItineraryToCabinet(tripPlan.dailyItinerary[0]);

    expect(cabinet.slots[0].items).toHaveLength(1);
    expect(cabinet.slots[1].items).toHaveLength(1);
    expect(cabinet.slots[2].items).toHaveLength(0);
    expect(cabinet.slots[2].isEmpty).toBe(true);
    expect(cabinet.itemCount).toBe(2);
  });

  it("为每个积木生成稳定的 day/slot/index/place/type 引用", () => {
    const blocks = getTimeSlotItems(tripPlan.dailyItinerary[0], "morning");

    expect(blocks).toEqual([
      {
        ref: {
          day: 1,
          slot: "morning",
          itemIndex: 0,
          placeName: "沙坡尾",
          type: "attraction",
        },
        item: tripPlan.dailyItinerary[0].morning[0],
      },
    ]);
  });

  it("映射不会修改原始 TripPlan 或 DailyItinerary 数据", () => {
    const snapshot = JSON.parse(JSON.stringify(tripPlan));

    mapTripPlanToCabinets(tripPlan);

    expect(tripPlan).toEqual(snapshot);
  });

  it("支持将整个 TripPlan 映射为多个 cabinet 供结果页直接使用", () => {
    const cabinets = mapTripPlanToCabinets(tripPlan);

    expect(cabinets).toHaveLength(1);
    expect(cabinets[0]).toMatchObject({
      dayNumber: 1,
      theme: "海边和城市散步",
      routeSummary: "酒店 → 沙坡尾 → 八市 → 酒店",
    });
  });

  it("缺少可选字段时仍能安全工作", () => {
    const cabinet = mapDailyItineraryToCabinet({
      ...tripPlan.dailyItinerary[0],
      date: undefined,
      dailyTips: [],
      morning: [
        {
          placeName: "酒店休息",
          type: "free_time",
          reason: "先慢一点。",
          guide: [],
        },
      ],
      afternoon: [],
      evening: [],
    });

    expect(cabinet.date).toBeUndefined();
    expect(cabinet.dailyTips).toEqual([]);
    expect(cabinet.slots[0].items[0].item.placeName).toBe("酒店休息");
  });

  it("提供时段标签工具，便于组件复用", () => {
    expect(getTimeSlotLabel("morning")).toBe("上午");
    expect(getTimeSlotLabel("afternoon")).toBe("下午");
    expect(getTimeSlotLabel("evening")).toBe("晚上");
  });

  it("为手机端 summary 提供每个时段的主要活动名称和额外数量", () => {
    const cabinet = mapDailyItineraryToCabinet({
      ...tripPlan.dailyItinerary[0],
      morning: [
        tripPlan.dailyItinerary[0].morning[0],
        {
          placeName: "海边咖啡馆",
          type: "food",
          reason: "中间坐一下。",
          guide: [],
        },
      ],
      evening: [],
    });

    expect(getTimeSlotPreview(cabinet.slots[0])).toEqual({
      label: "上午",
      primaryName: "沙坡尾",
      extraCount: 1,
    });
    expect(getTimeSlotPreview(cabinet.slots[2])).toEqual({
      label: "晚上",
      primaryName: "自由安排",
      extraCount: 0,
    });
  });
});
