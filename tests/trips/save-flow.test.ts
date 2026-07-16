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
  it("creates a new saved trip with ai_generated metadata when there is no savedTripId", async () => {
    const storage = new MemoryStorage();
    const createTrip = vi.fn().mockResolvedValue({
      tripId: "trip-1",
    });

    const result = await persistCurrentTrip(payload, {
      storage,
      createTrip,
      getWorkspaceSession: () => ({
        sourceType: "ai_generated",
        workspaceModeDefault: "read",
        localDraftId: "local-draft-ai",
        updatedAt: "2026-07-16T09:00:00.000Z",
      }),
    });

    expect(createTrip).toHaveBeenCalledWith({
      ...payload,
      saveMetadata: {
        sourceType: "ai_generated",
        status: "saved",
        localDraftId: "local-draft-ai",
      },
    });
    expect(result.mode).toBe("created");
    expect(getSavedTripMetadata(storage)).toMatchObject({
      savedTripId: "trip-1",
      savedTripTitle: "厦门 3 天慢慢玩",
    });
  });

  it("uses blank_manual for blank workspace saves", async () => {
    const createTrip = vi.fn().mockResolvedValue({
      tripId: "trip-blank",
    });

    await persistCurrentTrip(payload, {
      createTrip,
      getWorkspaceSession: () => ({
        sourceType: "blank_manual",
        workspaceModeDefault: "edit",
        localDraftId: "local-draft-blank",
        updatedAt: "2026-07-16T09:00:00.000Z",
      }),
    });

    expect(createTrip).toHaveBeenCalledWith(
      expect.objectContaining({
        saveMetadata: {
          sourceType: "blank_manual",
          status: "saved",
          localDraftId: "local-draft-blank",
        },
      }),
    );
  });

  it("uses explore_import for explore workspace saves", async () => {
    const createTrip = vi.fn().mockResolvedValue({
      tripId: "trip-explore",
    });

    await persistCurrentTrip(payload, {
      createTrip,
      getWorkspaceSession: () => ({
        sourceType: "explore_import",
        workspaceModeDefault: "read",
        localDraftId: "local-draft-explore",
        updatedAt: "2026-07-16T09:00:00.000Z",
      }),
    });

    expect(createTrip).toHaveBeenCalledWith(
      expect.objectContaining({
        saveMetadata: {
          sourceType: "explore_import",
          status: "saved",
          localDraftId: "local-draft-explore",
        },
      }),
    );
  });

  it("does not write saved_trip directly into database source_type", async () => {
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

    await persistCurrentTrip(payload, {
      storage,
      updateTrip,
      getWorkspaceSession: () => ({
        sourceType: "saved_trip",
        workspaceModeDefault: "read",
        localDraftId: "local-draft-restored",
        updatedAt: "2026-07-16T09:00:00.000Z",
      }),
    });

    expect(updateTrip).toHaveBeenCalledWith("trip-1", {
      ...payload,
      saveMetadata: {
        sourceType: undefined,
        status: "saved",
        localDraftId: "local-draft-restored",
      },
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
    const createTrip = vi.fn();

    const result = await persistCurrentTrip(payload, {
      storage,
      updateTrip,
      createTrip,
      getWorkspaceSession: () => ({
        sourceType: "ai_generated",
        workspaceModeDefault: "read",
        localDraftId: "local-draft-ai",
        updatedAt: "2026-07-16T09:00:00.000Z",
      }),
    });

    expect(createTrip).not.toHaveBeenCalled();
    expect(updateTrip).toHaveBeenCalledWith("trip-1", {
      ...payload,
      saveMetadata: {
        sourceType: "ai_generated",
        status: "saved",
        localDraftId: "local-draft-ai",
      },
    });
    expect(result.mode).toBe("updated");
    expect(getSavedTripMetadata(storage)).toMatchObject({
      savedTripId: "trip-1",
      savedTripTitle: "厦门 3 天慢慢玩",
      restoredAt: "2026-07-07T08:00:00.000Z",
      savedAt: "2026-07-08T09:00:00.000Z",
    });
  });

  it("generates and persists a stable localDraftId when the session is missing it", async () => {
    const storage = new MemoryStorage();
    const createTrip = vi.fn().mockResolvedValue({
      tripId: "trip-1",
    });
    const ensuredSession = {
      sourceType: "ai_generated" as const,
      workspaceModeDefault: "read" as const,
      localDraftId: "generated-local-draft",
      updatedAt: "2026-07-16T09:00:00.000Z",
    };
    const ensureWorkspaceSession = vi.fn().mockReturnValue(ensuredSession);

    await persistCurrentTrip(payload, {
      storage,
      createTrip,
      getWorkspaceSession: () => ({
        sourceType: "ai_generated",
        workspaceModeDefault: "read",
        updatedAt: "2026-07-16T08:30:00.000Z",
      }),
      ensureWorkspaceSession,
    });

    expect(ensureWorkspaceSession).toHaveBeenCalled();
    expect(createTrip).toHaveBeenCalledWith(
      expect.objectContaining({
        saveMetadata: {
          sourceType: "ai_generated",
          status: "saved",
          localDraftId: "generated-local-draft",
        },
      }),
    );
  });

  it("does not regenerate localDraftId when one already exists", async () => {
    const createTrip = vi.fn().mockResolvedValue({
      tripId: "trip-1",
    });
    const ensureWorkspaceSession = vi.fn();

    await persistCurrentTrip(payload, {
      createTrip,
      getWorkspaceSession: () => ({
        sourceType: "ai_generated",
        workspaceModeDefault: "read",
        localDraftId: "existing-local-draft",
        updatedAt: "2026-07-16T09:00:00.000Z",
      }),
      ensureWorkspaceSession,
    });

    expect(ensureWorkspaceSession).not.toHaveBeenCalled();
    expect(createTrip).toHaveBeenCalledWith(
      expect.objectContaining({
        saveMetadata: {
          sourceType: "ai_generated",
          status: "saved",
          localDraftId: "existing-local-draft",
        },
      }),
    );
  });
});
