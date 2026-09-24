import { describe, expect, it, vi } from "vitest";

import {
  loadWorkspaceVersionSummary,
  saveWorkspacePlanAsNewVersion,
} from "../../lib/projects/version/version-client";
import { markWorkspaceProjectDraft } from "../../lib/projects/workspace-context-client";
import {
  getProjectSession,
  setProjectSession,
} from "../../lib/projects/session";
import {
  loadTripPlan,
  saveTripPlan,
  type StorageLike,
} from "../../lib/trip/storage";

class MemoryStorage implements StorageLike {
  private readonly store = new Map<string, string>();

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }

  removeItem(key: string) {
    this.store.delete(key);
  }
}

function createJsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
    },
    ...init,
  });
}

function createTripPlan(title: string) {
  return {
    tripTitle: title,
    summary: "mock",
    destination: "Yunnan",
    days: 5,
    travelStyleSummary: "relaxed",
    weatherSummary: {
      available: false,
      overview: "mock",
      dailyForecast: [],
      alerts: [],
      reminders: [],
      dataNote: "mock",
    },
    budgetSummary: {
      totalEstimate: "6000",
      transport: "1200",
      hotel: "2000",
      food: "1200",
      tickets: "600",
      localTransport: "300",
      flexibleSpending: "700",
      note: "mock",
    },
    hotelAreaAdvice: [],
    transportAdvice: {
      summary: "mock",
      options: [
        {
          mode: "other" as const,
          pros: ["mock"],
          cons: ["mock"],
          recommendation: "mock",
        },
      ],
      suggestedPlatforms: [],
      note: "mock",
    },
    dailyItinerary: Array.from({ length: 5 }, (_, index) => ({
      day: index + 1,
      theme: "mock",
      routeOrder: ["mock"],
      routeReason: "mock",
      morning: [],
      afternoon: [],
      evening: [],
      dailyTips: [],
    })),
    generalTips: [],
    warnings: [],
  };
}

const tripRequest = {
  departureCity: "Shenzhen",
  destinationCity: "Yunnan",
  days: 5,
  budget: 6000,
  currency: "CNY",
  interests: ["food"],
  travelStyles: ["relaxed"],
  mustVisitPlaces: [],
  avoidPlaces: [],
} as const;

describe("workspace version client", () => {
  it("loads the current workspace version summary from session", async () => {
    const storage = new MemoryStorage();
    setProjectSession(
      {
        projectId: "project-1",
        versionId: "version-2",
        sourceType: "blank_input",
        flowStage: "workspace_ready",
      },
      storage,
    );
    const fetcher = vi.fn().mockResolvedValueOnce(
      createJsonResponse({
        version: {
          id: "version-2",
          projectId: "project-1",
          versionNumber: 2,
          versionStatus: "accepted",
          createdFrom: "manual_edit",
          tripPlan: createTripPlan("Yunnan v2"),
          tripRequestSnapshot: tripRequest,
          createdAt: "2026-07-27T00:00:00.000Z",
          updatedAt: "2026-07-27T00:00:00.000Z",
        },
      }),
    );

    const summary = await loadWorkspaceVersionSummary({
      fetcher,
      getAccessToken: async () => "token-123",
      storage,
    });

    expect(fetcher).toHaveBeenCalledWith(
      "/api/projects/project-1/versions/version-2",
      expect.objectContaining({
        method: "GET",
      }),
    );
    expect(summary).toEqual({
      projectId: "project-1",
      versionId: "version-2",
      versionNumber: 2,
      createdFrom: "manual_edit",
      tripTitle: "Yunnan v2",
    });
  });

  it("creates a new manual version and updates workspace session", async () => {
    const storage = new MemoryStorage();
    setProjectSession(
      {
        projectId: "project-1",
        versionId: "version-2",
        sourceType: "blank_input",
        flowStage: "workspace_ready",
      },
      storage,
    );
    markWorkspaceProjectDraft(storage);
    const nextPlan = createTripPlan("Yunnan v3");
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          version: {
            id: "version-2",
            projectId: "project-1",
            versionNumber: 2,
            versionStatus: "accepted",
            createdFrom: "ai_adjust",
            tripPlan: createTripPlan("Yunnan v2"),
            tripRequestSnapshot: tripRequest,
            createdAt: "2026-07-27T00:00:00.000Z",
            updatedAt: "2026-07-27T00:00:00.000Z",
          },
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          version: {
            id: "version-3",
            projectId: "project-1",
            versionNumber: 3,
            versionStatus: "accepted",
            createdFrom: "manual_edit",
            tripPlan: nextPlan,
            tripRequestSnapshot: tripRequest,
            createdAt: "2026-07-27T00:00:00.000Z",
            updatedAt: "2026-07-27T00:00:00.000Z",
          },
        }),
      );

    const created = await saveWorkspacePlanAsNewVersion(
      {
        tripPlan: nextPlan,
        tripRequest: null,
      },
      {
        fetcher,
        getAccessToken: async () => "token-123",
        storage,
      },
    );

    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "/api/projects/project-1/versions",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          versionStatus: "accepted",
          createdFrom: "manual_edit",
          tripPlan: nextPlan,
          tripRequestSnapshot: tripRequest,
          createdBy: "workspace_manual_save",
          setAsCurrent: true,
        }),
      }),
    );
    expect(created?.id).toBe("version-3");
    expect(getProjectSession(storage)?.versionId).toBe("version-3");
    expect(loadTripPlan(storage)?.tripTitle).toBe("Yunnan v3");
    expect(storage.getItem("travel-planning:workspace-project-draft")).toBeNull();
  });

  it("keeps the local draft and selected version when the base version cannot be read", async () => {
    const storage = new MemoryStorage();
    setProjectSession(
      {
        projectId: "project-1",
        versionId: "version-2",
        sourceType: "blank_input",
        flowStage: "workspace_ready",
      },
      storage,
    );
    const editedPlan = createTripPlan("Unsaved edit");
    saveTripPlan(editedPlan, storage);
    markWorkspaceProjectDraft(storage);
    const fetcher = vi.fn().mockResolvedValueOnce(
      createJsonResponse({ error: { code: "NOT_FOUND" } }, { status: 404 }),
    );

    const result = await saveWorkspacePlanAsNewVersion(
      { tripPlan: editedPlan, tripRequest: null },
      { fetcher, getAccessToken: async () => "token-123", storage },
    );

    expect(result).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(getProjectSession(storage)?.versionId).toBe("version-2");
    expect(loadTripPlan(storage)?.tripTitle).toBe("Unsaved edit");
    expect(storage.getItem("travel-planning:workspace-project-draft")).not.toBeNull();
  });
});
