import { describe, expect, it, vi } from "vitest";

import {
  loadWorkspaceLocalTripState,
  restoreWorkspaceProjectVersionContext,
  touchWorkspaceProjectContext,
} from "../lib/projects/workspace-context-client";
import {
  getProjectSession,
  setProjectSession,
} from "../lib/projects/session";
import { loadTripPlan, loadTripRequest, type StorageLike } from "../lib/trip/storage";

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

const tripPlan = {
  tripTitle: "Yunnan 5 days",
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
        mode: "other",
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
} as const;

describe("workspace project context", () => {
  it("restores workspace from project current version when project session exists", async () => {
    const storage = new MemoryStorage();
    setProjectSession(
      {
        projectId: "project-1",
        versionId: "version-1",
        sourceType: "blank_input",
        flowStage: "workspace_ready",
      },
      storage,
    );
    const fetcher = vi.fn().mockResolvedValueOnce(
      createJsonResponse({
        project: {
          id: "project-1",
          currentFlowStage: "workspace_ready",
        },
        currentVersion: {
          id: "version-1",
          tripPlan,
          tripRequestSnapshot: tripRequest,
        },
        sources: [],
      }),
    );

    const restored = await restoreWorkspaceProjectVersionContext({
      fetcher,
      getAccessToken: async () => "token-123",
      storage,
    });

    expect(restored).toEqual({
      projectId: "project-1",
      versionId: "version-1",
      flowStage: "workspace_ready",
      tripPlan,
      tripRequest,
    });
    expect(loadTripPlan(storage)).toEqual(tripPlan);
    expect(loadTripRequest(storage)).toEqual(tripRequest);
  });

  it("falls back cleanly when no project session exists", async () => {
    const storage = new MemoryStorage();

    const restored = await restoreWorkspaceProjectVersionContext({
      fetcher: vi.fn(),
      getAccessToken: async () => "token-123",
      storage,
    });
    const localState = loadWorkspaceLocalTripState(storage);

    expect(restored).toBeNull();
    expect(localState.tripPlan).toBeNull();
    expect(localState.tripRequest).toBeNull();
  });

  it("loads an explicit version id when it differs from currentVersion", async () => {
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
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          project: {
            id: "project-1",
            currentFlowStage: "workspace_ready",
          },
          currentVersion: {
            id: "version-3",
            tripPlan,
            tripRequestSnapshot: tripRequest,
          },
          sources: [],
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          version: {
            id: "version-2",
            tripPlan: {
              ...tripPlan,
              tripTitle: "Yunnan 5 days v2",
            },
            tripRequestSnapshot: tripRequest,
          },
        }),
      );

    const restored = await restoreWorkspaceProjectVersionContext({
      fetcher,
      getAccessToken: async () => "token-123",
      storage,
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(restored?.versionId).toBe("version-2");
    expect(restored?.tripPlan.tripTitle).toBe("Yunnan 5 days v2");
  });

  it("touches and preserves project/version context during workspace saves", () => {
    const storage = new MemoryStorage();
    setProjectSession(
      {
        projectId: "project-1",
        versionId: "version-1",
        sourceType: "blank_input",
        flowStage: "workspace_ready",
      },
      storage,
    );

    const touched = touchWorkspaceProjectContext(storage);

    expect(touched?.projectId).toBe("project-1");
    expect(touched?.versionId).toBe("version-1");
    expect(getProjectSession(storage)?.versionId).toBe("version-1");
  });
});
