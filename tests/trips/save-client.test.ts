import { describe, expect, it, vi } from "vitest";

import {
  buildSaveTripLoginHref,
  saveTripToCloud,
} from "../../lib/trips/save-client";
import type { SaveTripRequestPayload } from "../../lib/trips/types";

const payload: SaveTripRequestPayload = {
  tripRequest: {
    departureCity: "深圳",
    destinationCity: "厦门",
    startDate: "2026-07-10",
    endDate: "2026-07-12",
    days: 3,
    budget: 2500,
    currency: "CNY",
    interests: ["海边"],
    travelStyles: ["轻松"],
    mustVisitPlaces: [],
    avoidPlaces: [],
  },
  tripPlan: {
    tripTitle: "厦门 3 天慢慢玩",
    summary: "一版适合新手的海边慢游。",
    destination: "厦门",
    days: 3,
    travelStyleSummary: "节奏轻松",
    weatherSummary: {
      available: true,
      overview: "有风，注意防晒",
      dailyForecast: [],
      alerts: [],
      reminders: [],
      dataNote: "mock",
    },
    budgetSummary: {
      totalEstimate: "约 2500 元",
      transport: "800 元",
      hotel: "900 元",
      food: "400 元",
      tickets: "200 元",
      localTransport: "100 元",
      flexibleSpending: "100 元",
      note: "按轻松玩法估算",
    },
    hotelAreaAdvice: [],
    transportAdvice: {
      summary: "步行和打车结合",
      options: [
        {
          mode: "other",
          pros: ["省心"],
          cons: ["高峰会慢"],
          recommendation: "按当天节奏调整",
        },
      ],
      suggestedPlatforms: [],
      note: "mock",
    },
    dailyItinerary: [
      {
        day: 1,
        date: "2026-07-10",
        theme: "海边",
        routeOrder: ["沙坡尾"],
        routeReason: "近",
        morning: [],
        afternoon: [],
        evening: [],
        dailyTips: [],
      },
      {
        day: 2,
        date: "2026-07-11",
        theme: "美食",
        routeOrder: ["八市"],
        routeReason: "顺路",
        morning: [],
        afternoon: [],
        evening: [],
        dailyTips: [],
      },
      {
        day: 3,
        date: "2026-07-12",
        theme: "返程",
        routeOrder: ["中山路"],
        routeReason: "收尾",
        morning: [],
        afternoon: [],
        evening: [],
        dailyTips: [],
      },
    ],
    generalTips: [],
    warnings: [],
  },
};

describe("saveTripToCloud", () => {
  it("builds login href with returnTo", () => {
    expect(buildSaveTripLoginHref("/result")).toBe("/login?returnTo=%2Fresult");
  });

  it("posts payload with bearer token", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        tripId: "trip-1",
      }),
    });

    const response = await saveTripToCloud(payload, {
      fetchImpl,
      getAccessToken: async () => "token-123",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/trips",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
          "Content-Type": "application/json",
        }),
      }),
    );
    expect(response).toEqual({
      tripId: "trip-1",
    });
  });

  it("requires login before saving", async () => {
    await expect(
      saveTripToCloud(payload, {
        getAccessToken: async () => null,
      }),
    ).rejects.toThrow("请先登录");
  });

  it("surfaces friendly api error messages", async () => {
    await expect(
      saveTripToCloud(payload, {
        getAccessToken: async () => "token-123",
        fetchImpl: vi.fn().mockResolvedValue({
          ok: false,
          json: vi.fn().mockResolvedValue({
            error: {
              message: "当前方案内容不完整，暂时还不能保存。",
            },
          }),
        }),
      }),
    ).rejects.toThrow("当前方案内容不完整，暂时还不能保存。");
  });
});
