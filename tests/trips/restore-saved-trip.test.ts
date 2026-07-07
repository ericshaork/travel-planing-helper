import { describe, expect, it } from "vitest";

import {
  loadTripPlan,
  loadTripRequest,
  RESTORED_SAVED_TRIP_STORAGE_KEY,
  TRIP_DRAFT_STORAGE_KEY,
  TRIP_ENRICHMENT_STORAGE_KEY,
  TRIP_WEATHER_SUMMARY_STORAGE_KEY,
} from "../../lib/trip/storage";
import { restoreSavedTripToStorage } from "../../lib/trips/restore-saved-trip";
import type { SavedTripDetail } from "../../lib/trips/types";

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

const savedTrip: SavedTripDetail = {
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
  trip_plan_json: {
    tripTitle: "厦门 3 天慢慢玩",
    summary: "给自由行新手的一版海边慢游路线。",
    destination: "厦门",
    days: 3,
    travelStyleSummary: "轻松",
    weatherSummary: {
      available: true,
      overview: "有海风。",
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
        date: "2026-07-10",
        theme: "海边",
        routeOrder: ["沙坡尾"],
        routeReason: "第一天先走轻松路线。",
        morning: [],
        afternoon: [],
        evening: [],
        dailyTips: [],
      },
      {
        day: 2,
        date: "2026-07-11",
        theme: "城市散步",
        routeOrder: ["八市"],
        routeReason: "把吃和逛串起来。",
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
        routeReason: "返程前留一点轻松时间。",
        morning: [],
        afternoon: [],
        evening: [],
        dailyTips: [],
      },
    ],
    generalTips: [],
    warnings: [],
  },
  enrichment_json: {
    daySummaries: [],
    mapPoints: [],
    warnings: [],
  },
  weather_summary_json: {
    available: true,
    overview: "有海风。",
    dailyForecast: [],
    alerts: [],
    reminders: [],
    dataNote: "mock",
  },
};

describe("restoreSavedTripToStorage", () => {
  it("restores trip request, trip plan, and saved metadata", () => {
    const storage = new MemoryStorage();
    storage.setItem(TRIP_DRAFT_STORAGE_KEY, JSON.stringify({ days: 2 }));

    restoreSavedTripToStorage({ trip: savedTrip }, storage);

    expect(loadTripRequest(storage)).toEqual(savedTrip.trip_request_json);
    expect(loadTripPlan(storage)).toEqual(savedTrip.trip_plan_json);
    expect(storage.getItem(TRIP_DRAFT_STORAGE_KEY)).toBeNull();
    expect(
      JSON.parse(storage.getItem(TRIP_ENRICHMENT_STORAGE_KEY) ?? "null"),
    ).toEqual(savedTrip.enrichment_json);
    expect(
      JSON.parse(storage.getItem(TRIP_WEATHER_SUMMARY_STORAGE_KEY) ?? "null"),
    ).toEqual(savedTrip.weather_summary_json);

    const metadata = JSON.parse(
      storage.getItem(RESTORED_SAVED_TRIP_STORAGE_KEY) ?? "null",
    ) as {
      savedTripId: string;
      savedTripTitle: string;
      restoredAt: string;
      savedAt: string;
    };

    expect(metadata.savedTripId).toBe("trip-1");
    expect(metadata.savedTripTitle).toBe("厦门 3 天慢慢玩");
    expect(metadata.restoredAt).toContain("T");
    expect(metadata.savedAt).toContain("T");
  });
});
