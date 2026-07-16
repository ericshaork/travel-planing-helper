import { describe, expect, it, vi } from "vitest";

import { openSavedTripIntoWorkspace } from "../../lib/trips/open-flow";
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
  source_type: "ai_generated",
  status: "saved",
  trip_preferences_json: {},
  local_draft_id: null,
  last_opened_at: null,
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
};

describe("openSavedTripIntoWorkspace", () => {
  it("tries to patch last_opened_at, then restores and navigates to /workspace", async () => {
    const storage = new MemoryStorage();
    const markTripOpened = vi.fn().mockResolvedValue(undefined);
    const openTrip = vi.fn().mockResolvedValue(savedTrip);
    const restoreTrip = vi.fn();
    const navigate = vi.fn();

    const trip = await openSavedTripIntoWorkspace("trip-1", {
      storage,
      markTripOpened,
      openTrip,
      restoreTrip,
      navigate,
    });

    expect(markTripOpened).toHaveBeenCalledWith("trip-1");
    expect(openTrip).toHaveBeenCalledWith("trip-1");
    expect(restoreTrip).toHaveBeenCalledWith({ trip: savedTrip }, storage);
    expect(navigate).toHaveBeenCalledWith("/workspace");
    expect(trip.id).toBe("trip-1");
  });

  it("keeps opening the trip even if last_opened_at patch fails", async () => {
    const openTrip = vi.fn().mockResolvedValue(savedTrip);
    const restoreTrip = vi.fn();
    const navigate = vi.fn();

    await openSavedTripIntoWorkspace("trip-1", {
      markTripOpened: vi.fn().mockRejectedValue(new Error("patch failed")),
      openTrip,
      restoreTrip,
      navigate,
    });

    expect(openTrip).toHaveBeenCalledWith("trip-1");
    expect(restoreTrip).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/workspace");
  });
});
