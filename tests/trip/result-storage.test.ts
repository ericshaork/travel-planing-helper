import { describe, expect, it } from "vitest";

import {
  loadTripPlan,
  saveTripPlan,
  TRIP_PLAN_STORAGE_KEY,
} from "../../lib/trip/storage";
import { tripPlanSchema } from "../../lib/trip/schema";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

const tripPlan = tripPlanSchema.parse({
  tripTitle: "厦门一天慢慢走",
  summary: "按一个片区安排，不来回折腾。",
  destination: "厦门",
  days: 1,
  travelStyleSummary: "轻松一点，留出休息时间。",
  weatherSummary: {
    available: false,
    overview: "未接入实时天气。",
    dailyForecast: [],
    alerts: [],
    reminders: ["出发前确认天气"],
    dataNote: "当前没有实时天气数据。",
  },
  budgetSummary: {
    totalEstimate: "约 1000 元",
    transport: "约 300 元",
    hotel: "约 300 元",
    food: "约 150 元",
    tickets: "约 50 元",
    localTransport: "约 50 元",
    flexibleSpending: "约 150 元",
    note: "都是估算。",
  },
  hotelAreaAdvice: [
    {
      area: "思明区",
      reason: "移动比较方便。",
      suitableFor: "第一次来的人",
      transportationConvenience: "公交和打车都方便。",
      suggestedPlatforms: [],
    },
  ],
  transportAdvice: {
    summary: "比较总耗时再选。",
    options: [
      {
        mode: "other",
        pros: ["可以灵活比较"],
        cons: ["需要自行核实"],
        recommendation: "去官方平台确认。",
      },
    ],
    suggestedPlatforms: [],
    note: "不代表实时信息。",
  },
  dailyItinerary: [
    {
      day: 1,
      theme: "城市散步",
      routeOrder: ["酒店", "街区"],
      routeReason: "少换乘。",
      morning: [],
      afternoon: [],
      evening: [],
      dailyTips: [],
    },
  ],
  generalTips: [],
  warnings: [],
});

describe("result trip plan storage", () => {
  it("保存并恢复通过正式 Schema 的 TripPlan", () => {
    const storage = new MemoryStorage();

    saveTripPlan(tripPlan, storage);

    expect(loadTripPlan(storage)).toEqual(tripPlan);
  });

  it("损坏或不合格的结果会被清理并返回空状态", () => {
    const storage = new MemoryStorage();
    storage.setItem(TRIP_PLAN_STORAGE_KEY, JSON.stringify({ days: 3 }));

    expect(loadTripPlan(storage)).toBeNull();
    expect(storage.getItem(TRIP_PLAN_STORAGE_KEY)).toBeNull();
  });
});
