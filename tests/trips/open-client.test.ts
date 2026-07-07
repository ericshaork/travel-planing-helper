import { describe, expect, it, vi } from "vitest";

import { openSavedTrip } from "../../lib/trips/open-client";

describe("openSavedTrip", () => {
  it("requests trip detail with bearer token", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        ok: true,
        trip: {
          id: "trip-1",
          title: "厦门 3 天慢慢玩",
          destination_city: "厦门",
          start_date: "2026-07-10",
          end_date: "2026-07-12",
          days: 3,
          budget: 2500,
          cover_image_url: null,
          created_at: "2026-07-01T08:00:00.000Z",
          updated_at: "2026-07-02T08:00:00.000Z",
          trip_request_json: {
            departureCity: "深圳",
            destinationCity: "厦门",
            days: 3,
            budget: 2500,
            currency: "CNY",
            interests: ["海边"],
            travelStyles: ["轻松"],
            mustVisitPlaces: [],
            avoidPlaces: [],
          },
          trip_plan_json: {
            tripTitle: "厦门 3 天慢慢玩",
            summary: "mock",
            destination: "厦门",
            days: 3,
            travelStyleSummary: "轻松",
            weatherSummary: {
              available: true,
              overview: "mock",
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
              note: "mock",
            },
            hotelAreaAdvice: [],
            transportAdvice: {
              summary: "mock",
              options: [
                {
                  mode: "other",
                  pros: ["省心"],
                  cons: ["高峰会慢"],
                  recommendation: "mock",
                },
              ],
              suggestedPlatforms: [],
              note: "mock",
            },
            dailyItinerary: [
              {
                day: 1,
                theme: "mock",
                routeOrder: ["沙坡尾"],
                routeReason: "mock",
                morning: [],
                afternoon: [],
                evening: [],
                dailyTips: [],
              },
              {
                day: 2,
                theme: "mock",
                routeOrder: ["八市"],
                routeReason: "mock",
                morning: [],
                afternoon: [],
                evening: [],
                dailyTips: [],
              },
              {
                day: 3,
                theme: "mock",
                routeOrder: ["中山路"],
                routeReason: "mock",
                morning: [],
                afternoon: [],
                evening: [],
                dailyTips: [],
              },
            ],
            generalTips: [],
            warnings: [],
          },
          enrichment_json: null,
          weather_summary_json: null,
        },
      }),
    });

    const trip = await openSavedTrip("trip-1", {
      fetchImpl,
      getAccessToken: async () => "token-123",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/trips/trip-1",
      expect.objectContaining({
        method: "GET",
        headers: {
          Authorization: "Bearer token-123",
        },
      }),
    );
    expect(trip.id).toBe("trip-1");
  });

  it("requires login before opening a trip", async () => {
    await expect(
      openSavedTrip("trip-1", {
        getAccessToken: async () => null,
      }),
    ).rejects.toThrow("请先登录");
  });

  it("surfaces trip detail api errors", async () => {
    await expect(
      openSavedTrip("trip-1", {
        getAccessToken: async () => "token-123",
        fetchImpl: vi.fn().mockResolvedValue({
          ok: false,
          json: vi.fn().mockResolvedValue({
            ok: false,
            code: "TRIP_NOT_FOUND",
            message: "这条行程不存在，或你暂时没有权限打开它。",
          }),
        }),
      }),
    ).rejects.toThrow("这条行程不存在，或你暂时没有权限打开它。");
  });
});
