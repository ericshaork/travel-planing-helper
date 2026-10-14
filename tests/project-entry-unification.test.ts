import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { startExploreProjectWorkspaceFlow } from "../lib/explore/project-source-client";
import {
  createBlankWorkspaceProjectEntry,
  ENTRY_SESSION_SOURCE_TYPES,
  ensureWorkspaceProjectEntry,
} from "../lib/projects/entry-client";
import { getProjectSession } from "../lib/projects/session";
import {
  getWorkspaceSessionMetadata,
  loadTripPlan,
  type StorageLike,
} from "../lib/trip/storage";
import type { TripPlan, TripPlanDraft, TripRequest } from "../lib/trip/types";
import { openSavedTripIntoWorkspace } from "../lib/trips/open-flow";

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

function createTripPlan(title = "Yunnan trip"): TripPlan {
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
  };
}

function createTripRequest(): TripRequest {
  return {
    departureCity: "Shenzhen",
    destinationCity: "Yunnan",
    days: 5,
    budget: 6000,
    currency: "CNY",
    interests: ["food"],
    travelStyles: ["relaxed"],
    mustVisitPlaces: [],
    avoidPlaces: [],
  };
}

function createExploreDraft(): TripPlanDraft {
  return {
    tripTitle: "Yunnan Explore Draft",
    sourceType: "explore_archive",
    sourceExploreId: "archive-1",
    sourceExploreSlug: "yunnan-food-walk",
    tripRequestDraft: {
      destinationCity: "Yunnan",
      days: 5,
      interests: ["food"],
      travelStyles: ["relaxed"],
    },
    tripPlanSeed: createTripPlan("Explore seed"),
  };
}

describe("project entry unification", () => {
  it("uses a unified ai_prompt session source when creating a workspace project from AI flow output", async () => {
    const storage = new MemoryStorage();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          project: {
            id: "project-ai-1",
            currentFlowStage: "workspace_ready",
          },
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          version: {
            id: "version-ai-1",
          },
        }),
      )
      .mockResolvedValueOnce(createJsonResponse({ ok: true }));

    const result = await ensureWorkspaceProjectEntry(
      {
        title: "Yunnan trip",
        sessionSourceType: ENTRY_SESSION_SOURCE_TYPES.aiPrompt,
        sourceTitle: "Yunnan",
        sourcePayload: {
          sourceOrigin: ENTRY_SESSION_SOURCE_TYPES.aiPrompt,
        },
        tripPlan: createTripPlan(),
        tripRequest: createTripRequest(),
        createdFrom: "ai_generate",
        lifecycleState: "workspace",
        flowStage: "workspace_ready",
        storage,
      },
      {
        fetcher,
        getAccessToken: async () => "token-123",
      },
    );

    expect(result?.projectSession).toEqual({
      projectId: "project-ai-1",
      versionId: "version-ai-1",
      sourceType: ENTRY_SESSION_SOURCE_TYPES.aiPrompt,
      flowStage: "workspace_ready",
      updatedAt: expect.any(String),
    });
    expect(getProjectSession(storage)?.sourceType).toBe(
      ENTRY_SESSION_SOURCE_TYPES.aiPrompt,
    );
  });

  it("uses a unified explore_import source for Explore workspace entry", async () => {
    const storage = new MemoryStorage();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          project: {
            id: "project-explore-9",
            currentFlowStage: "workspace_ready",
          },
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          version: {
            id: "version-explore-9",
          },
        }),
      )
      .mockResolvedValueOnce(createJsonResponse({ ok: true }));

    const session = await startExploreProjectWorkspaceFlow(
      createExploreDraft(),
      createTripPlan("Explore plan"),
      storage,
      {
        fetcher,
        getAccessToken: async () => "token-123",
      },
    );

    expect(session?.sourceType).toBe(ENTRY_SESSION_SOURCE_TYPES.exploreImport);
    expect(session?.versionId).toBe("version-explore-9");
  });

  it("uses a unified blank_manual source for blank workspace entry", async () => {
    const storage = new MemoryStorage();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          project: {
            id: "project-blank-1",
            currentFlowStage: "workspace_ready",
          },
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          version: {
            id: "version-blank-1",
          },
        }),
      )
      .mockResolvedValueOnce(createJsonResponse({ ok: true }));

    const result = await createBlankWorkspaceProjectEntry({
      storage,
      fetcher,
      getAccessToken: async () => "token-123",
    });

    expect(result.projectSession).toEqual({
      projectId: "project-blank-1",
      versionId: "version-blank-1",
      sourceType: ENTRY_SESSION_SOURCE_TYPES.blankManual,
      flowStage: "workspace_ready",
      updatedAt: expect.any(String),
    });
    expect(loadTripPlan(storage)?.tripTitle).toBe("未命名旅行");
  });

  it("keeps blank workspace creation local when the stored auth token is expired", async () => {
    const storage = new MemoryStorage();
    const fetcher = vi.fn().mockResolvedValueOnce(
      createJsonResponse(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "当前登录状态已经失效，请重新登录后再试。",
          },
        },
        { status: 401 },
      ),
    );

    const result = await createBlankWorkspaceProjectEntry({
      storage,
      fetcher,
      getAccessToken: async () => "expired-token",
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.projectSession).toBeNull();
    expect(getProjectSession(storage)).toBeNull();
    expect(loadTripPlan(storage)?.tripTitle).toBe("未命名旅行");
    expect(getWorkspaceSessionMetadata(storage)).toEqual(
      expect.objectContaining({
        sourceType: "blank_manual",
        workspaceModeDefault: "edit",
      }),
    );
  });

  it("keeps legacy saved-trip fallback isolated from project session writes", async () => {
    const storage = new MemoryStorage();

    await openSavedTripIntoWorkspace(
      "legacy-trip-1",
      {
        storage,
        openTrip: vi.fn().mockResolvedValue({
          id: "legacy-trip-1",
          title: "Legacy trip",
          destination_city: "Chengdu",
          start_date: null,
          end_date: null,
          days: 4,
          budget: 3000,
          cover_image_url: null,
          source_type: "ai_generated",
          status: "saved",
          trip_preferences_json: {},
          local_draft_id: null,
          last_opened_at: null,
          created_at: "2026-07-23T09:00:00.000Z",
          updated_at: "2026-07-23T10:00:00.000Z",
          trip_request_json: createTripRequest(),
          trip_plan_json: createTripPlan("Legacy trip"),
          enrichment_json: null,
          weather_summary_json: null,
        }),
        restoreTrip: vi.fn(),
        navigate: vi.fn(),
      },
    );

    expect(getProjectSession(storage)).toBeNull();
  });
});
