import { describe, expect, it, vi } from "vitest";

import {
  getSavedTripMetadata,
  type StorageLike,
} from "../../lib/trip/storage";
import { persistCurrentTrip } from "../../lib/trips/save-flow";
import type { SaveTripRequestPayload } from "../../lib/trips/types";

class MemoryStorage implements StorageLike {
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

const payload: SaveTripRequestPayload = {
  tripRequest: {
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
  tripPlan: {
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
};

describe("persistCurrentTrip", () => {
  it("creates a new saved trip when there is no savedTripId metadata", async () => {
    const storage = new MemoryStorage();
    const createTrip = vi.fn().mockResolvedValue({
      tripId: "trip-1",
    });

    const result = await persistCurrentTrip(payload, {
      storage,
      createTrip,
    });

    expect(createTrip).toHaveBeenCalledWith(payload);
    expect(result.mode).toBe("created");
    expect(getSavedTripMetadata(storage)).toMatchObject({
      savedTripId: "trip-1",
      savedTripTitle: "厦门 3 天慢慢玩",
    });
  });

  it("updates the existing saved trip when savedTripId metadata exists", async () => {
    const storage = new MemoryStorage();
    storage.setItem(
      "travel-planning:restored-saved-trip",
      JSON.stringify({
        savedTripId: "trip-1",
        savedTripTitle: "旧标题",
        restoredAt: "2026-07-07T08:00:00.000Z",
      }),
    );
    const updateTrip = vi.fn().mockResolvedValue({
      ok: true,
      tripId: "trip-1",
      updatedAt: "2026-07-08T09:00:00.000Z",
    });

    const result = await persistCurrentTrip(payload, {
      storage,
      updateTrip,
    });

    expect(updateTrip).toHaveBeenCalledWith("trip-1", payload);
    expect(result.mode).toBe("updated");
    expect(getSavedTripMetadata(storage)).toMatchObject({
      savedTripId: "trip-1",
      savedTripTitle: "厦门 3 天慢慢玩",
      restoredAt: "2026-07-07T08:00:00.000Z",
      savedAt: "2026-07-08T09:00:00.000Z",
    });
  });
});
