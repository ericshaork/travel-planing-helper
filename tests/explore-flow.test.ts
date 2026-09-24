import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  buildExploreRevisionHref,
  prepareExploreWorkspaceEntry,
  startExploreCreateFlow,
} from "../lib/explore/flow";
import {
  startExploreProjectCreateFlow,
  startExploreProjectWorkspaceFlow,
} from "../lib/explore/project-source-client";
import { getProjectSession } from "../lib/projects/session";
import {
  getWorkspaceSessionMetadata,
  loadTripPlan,
  loadTripPlanDraft,
  type StorageLike,
} from "../lib/trip/storage";
import type { TripPlan, TripPlanDraft } from "../lib/trip/types";

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

function createTripPlan(): TripPlan {
  return {
    tripTitle: "Yunnan Explore Draft",
    summary: "A draft imported from Explore.",
    destination: "Yunnan",
    days: 3,
    travelStyleSummary: "Relaxed and food-focused.",
    weatherSummary: {
      available: false,
      overview: "Weather can be added later.",
      dailyForecast: [],
      alerts: [],
      reminders: ["Check weather before departure."],
      dataNote: "Explore draft has no real-time weather.",
    },
    budgetSummary: {
      totalEstimate: "TBD",
      transport: "TBD",
      hotel: "TBD",
      food: "TBD",
      tickets: "TBD",
      localTransport: "TBD",
      flexibleSpending: "TBD",
      note: "Budget can be refined later.",
    },
    hotelAreaAdvice: [],
    transportAdvice: {
      summary: "Transport can be refined later.",
      options: [
        {
          mode: "other",
          pros: ["Keeps the draft lightweight."],
          cons: ["Transport details are not set yet."],
          recommendation: "Refine transport after confirming dates.",
        },
      ],
      suggestedPlatforms: [],
      note: "Explore import keeps transport flexible.",
    },
    dailyItinerary: [
      {
        day: 1,
        theme: "Old town and food",
        routeOrder: ["Old Town", "Market"],
        routeReason: "A simple first-day path.",
        morning: [],
        afternoon: [],
        evening: [],
        dailyTips: ["Keep the first day flexible."],
      },
      {
        day: 2,
        theme: "Mountains",
        routeOrder: ["Scenic area"],
        routeReason: "Focus on one main outdoor area.",
        morning: [],
        afternoon: [],
        evening: [],
        dailyTips: ["Leave buffer time for weather."],
      },
      {
        day: 3,
        theme: "Slow finish",
        routeOrder: ["Cafe", "Station"],
        routeReason: "End lightly before departure.",
        morning: [],
        afternoon: [],
        evening: [],
        dailyTips: ["Do not overpack the last day."],
      },
    ],
    generalTips: ["Imported from Explore."],
    warnings: ["Verify dates and bookings before departure."],
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
      interests: ["food", "culture"],
      travelStyles: ["relaxed"],
      specialRequirements: "Start from this Explore draft and refine it.",
    },
    tripPlanSeed: createTripPlan(),
  };
}

function createJsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
    },
    ...init,
  });
}

describe("explore source integration", () => {
  it("creates a project successfully from an Explore draft", async () => {
    const storage = new MemoryStorage();
    const fetcher = vi
      .fn()
      .mockImplementationOnce(async (_url, init) => {
        expect(_url).toBe("/api/projects");
        const body = JSON.parse(String(init?.body)) as {
          sourceType: string;
          initialMetadata: {
            flowStage: string;
            sourcePayload: {
              sourceOrigin: string;
              sourceType: string;
              sourceExploreId: string;
            };
          };
        };

        expect(body.sourceType).toBe("explore_archive");
        expect(body.initialMetadata.flowStage).toBe("source_received");
        expect(body.initialMetadata.sourcePayload.sourceOrigin).toBe(
          "explore_archive",
        );
        expect(body.initialMetadata.sourcePayload.sourceType).toBe(
          "explore_archive",
        );
        expect(body.initialMetadata.sourcePayload.sourceExploreId).toBe(
          "archive-1",
        );

        return createJsonResponse({
          project: {
            id: "project-explore-1",
            currentFlowStage: "source_received",
          },
        });
      })
      .mockResolvedValueOnce(
        createJsonResponse({
          success: true,
          projectId: "project-explore-1",
          stage: "clarifying",
          reply: "Tell me budget and pace.",
        }),
      );

    const session = await startExploreProjectCreateFlow(createExploreDraft(), storage, {
      fetcher,
      getAccessToken: async () => "token-123",
    });

    expect(session).toEqual({
      projectId: "project-explore-1",
      sourceType: "explore_import",
      flowStage: "clarifying",
      updatedAt: expect.any(String),
    });
    expect(getProjectSession(storage)).toEqual({
      projectId: "project-explore-1",
      sourceType: "explore_import",
      flowStage: "clarifying",
      updatedAt: expect.any(String),
    });
  });

  it("saves source data into local draft state for Explore import", async () => {
    const storage = new MemoryStorage();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          project: {
            id: "project-explore-2",
            currentFlowStage: "source_received",
          },
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          success: true,
          projectId: "project-explore-2",
          stage: "source_review",
          reply: "Let me review this draft first.",
        }),
      );

    await startExploreProjectCreateFlow(createExploreDraft(), storage, {
      fetcher,
      getAccessToken: async () => "token-123",
    });

    expect(loadTripPlanDraft(storage)).toEqual(createExploreDraft());
  });

  it("AI enhance path enters the Copilot flow", async () => {
    const storage = new MemoryStorage();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          project: {
            id: "project-explore-3",
            currentFlowStage: "source_received",
          },
        }),
      )
      .mockImplementationOnce(async (_url, init) => {
        expect(_url).toBe("/api/projects/project-explore-3/copilot");
        const body = JSON.parse(String(init?.body)) as { message: string };

        expect(body.message).toContain("Yunnan");
        expect(body.message).toContain("5 days");

        return createJsonResponse({
          success: true,
          projectId: "project-explore-3",
          stage: "proposal_ready",
          reply: "I can draft a proposal from this Explore package.",
        });
      });

    const session = await startExploreProjectCreateFlow(createExploreDraft(), storage, {
      fetcher,
      getAccessToken: async () => "token-123",
    });

    expect(session?.flowStage).toBe("proposal_ready");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("direct edit path does not enter the AI flow and opens workspace-compatible state", async () => {
    const storage = new MemoryStorage();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          project: {
            id: "project-explore-4",
            currentFlowStage: "workspace_ready",
          },
        }),
      )
      .mockImplementationOnce(async (_url, init) => {
        expect(_url).toBe("/api/projects/project-explore-4/versions");
        const body = JSON.parse(String(init?.body)) as {
          createdFrom: string;
          setAsCurrent: boolean;
        };

        expect(body.createdFrom).toBe("template_import");
        expect(body.setAsCurrent).toBe(true);

        return createJsonResponse({
          version: {
            id: "version-explore-4",
          },
        });
      })
      .mockResolvedValueOnce(createJsonResponse({ ok: true }));
    const workspacePlan = createTripPlan();

    const session = await startExploreProjectWorkspaceFlow(
      createExploreDraft(),
      workspacePlan,
      storage,
      {
        fetcher,
        getAccessToken: async () => "token-123",
      },
    );

    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(session).toEqual({
      projectId: "project-explore-4",
      versionId: "version-explore-4",
      sourceType: "explore_import",
      flowStage: "workspace_ready",
      updatedAt: expect.any(String),
    });
    expect(loadTripPlan(storage)).toEqual(workspacePlan);
    expect(getWorkspaceSessionMetadata(storage)).toEqual({
      sourceType: "explore_import",
      workspaceModeDefault: "read",
      localDraftId: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it("creates a unified Explore workspace entry with revision handoff data", async () => {
    const storage = new MemoryStorage();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          project: {
            id: "project-explore-5",
            currentFlowStage: "workspace_ready",
          },
        }),
      )
      .mockImplementationOnce(async (_url, init) => {
        expect(_url).toBe("/api/projects/project-explore-5/versions");
        const body = JSON.parse(String(init?.body)) as {
          createdFrom: string;
          setAsCurrent: boolean;
        };

        expect(body.createdFrom).toBe("template_import");
        expect(body.setAsCurrent).toBe(true);

        return createJsonResponse({
          version: {
            id: "version-explore-5",
          },
        });
      })
      .mockResolvedValueOnce(createJsonResponse({ ok: true }));

    const entry = await prepareExploreWorkspaceEntry(createExploreDraft(), storage, {
      fetcher,
      getAccessToken: async () => "token-123",
    });

    expect(entry).toEqual({
      projectId: "project-explore-5",
      versionId: "version-explore-5",
      revisionHref:
        "/create?source=revision&projectId=project-explore-5&versionId=version-explore-5",
    });
    expect(getProjectSession(storage)).toEqual({
      projectId: "project-explore-5",
      versionId: "version-explore-5",
      sourceType: "explore_import",
      flowStage: "workspace_ready",
      updatedAt: expect.any(String),
    });
  });

  it("keeps Explore inspiration provenance in the project source payload", async () => {
    const storage = new MemoryStorage();
    const inspirationDraft: TripPlanDraft = {
      ...createExploreDraft(),
      sourceType: "explore_inspiration",
      sourceExploreId: undefined,
      sourceExploreSlug: undefined,
    };
    const fetcher = vi
      .fn()
      .mockImplementationOnce(async (_url, init) => {
        const body = JSON.parse(String(init?.body)) as {
          sourceType: string;
          initialMetadata: {
            sourcePayload: {
              sourceOrigin: string;
              sourceType: string;
            };
          };
        };

        expect(body.sourceType).toBe("explore_archive");
        expect(body.initialMetadata.sourcePayload.sourceOrigin).toBe(
          "explore_inspiration",
        );
        expect(body.initialMetadata.sourcePayload.sourceType).toBe(
          "explore_inspiration",
        );

        return createJsonResponse({
          project: {
            id: "project-inspiration-1",
            currentFlowStage: "source_received",
          },
        });
      })
      .mockResolvedValueOnce(
        createJsonResponse({
          projectId: "project-inspiration-1",
          stage: "clarifying",
          reply: "Tell me more.",
        }),
      );

    await startExploreProjectCreateFlow(inspirationDraft, storage, {
      fetcher,
      getAccessToken: async () => "token-123",
    });
  });

  it("creates the Project without logging the source payload or response", async () => {
    const storage = new MemoryStorage();
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          project: {
            id: "project-diagnostic",
            currentFlowStage: "source_received",
          },
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          projectId: "project-diagnostic",
          stage: "clarifying",
          reply: "Tell me more.",
        }),
      );

    try {
      await startExploreProjectCreateFlow(createExploreDraft(), storage, {
        fetcher,
        getAccessToken: async () => "secret-token-value",
      });

      expect(fetcher).toHaveBeenCalledWith(
        "/api/projects",
        expect.objectContaining({ method: "POST" }),
      );
      expect(infoSpy).not.toHaveBeenCalled();
    } finally {
      infoSpy.mockRestore();
    }
  });

  it("shows a readable failure for an HTML Project API response", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const htmlBody = "<!doctype html><html><body>Not Found</body></html>";
    const fetcher = vi.fn().mockResolvedValue(
      new Response(htmlBody, {
        status: 404,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      }),
    );

    try {
      await expect(
        startExploreProjectCreateFlow(createExploreDraft(), undefined, {
          fetcher,
          getAccessToken: async () => "token-123",
        }),
      ).rejects.toThrow("旅行项目创建失败，请稍后再试。");
      expect(infoSpy).not.toHaveBeenCalled();
    } finally {
      infoSpy.mockRestore();
    }
  });

  it("rethrows a network error without logging the raw error", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchError = new Error("Failed to fetch Project API");
    const fetcher = vi.fn().mockRejectedValue(fetchError);

    try {
      await expect(
        startExploreProjectCreateFlow(createExploreDraft(), undefined, {
          fetcher,
          getAccessToken: async () => "token-123",
        }),
      ).rejects.toBe(fetchError);

      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("does not create legacy local state when Project creation fails", async () => {
    const storage = new MemoryStorage();

    await expect(
      startExploreProjectCreateFlow(createExploreDraft(), storage, {
        fetcher: vi.fn(),
        getAccessToken: async () => null,
      }),
    ).rejects.toThrow("请先登录，再从 Explore 创建旅行项目。");

    expect(loadTripPlanDraft(storage)).toBeNull();
    expect(getProjectSession(storage)).toBeNull();
  });

  it("does not create legacy Workspace state when Version creation fails", async () => {
    const storage = new MemoryStorage();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          project: {
            id: "project-version-failure",
            currentFlowStage: "workspace_ready",
          },
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse(
          {
            error: {
              message: "Version creation failed.",
            },
          },
          { status: 500 },
        ),
      );

    await expect(
      startExploreProjectWorkspaceFlow(
        createExploreDraft(),
        createTripPlan(),
        storage,
        {
          fetcher,
          getAccessToken: async () => "token-123",
        },
      ),
    ).rejects.toThrow("Version creation failed.");

    expect(loadTripPlan(storage)).toBeNull();
    expect(loadTripPlanDraft(storage)).toBeNull();
    expect(getWorkspaceSessionMetadata(storage)).toBeNull();
    expect(getProjectSession(storage)).toBeNull();
  });
});

describe("explore revision handoff URL", () => {
  it("builds a revision entry URL from project and version ids", () => {
    expect(buildExploreRevisionHref("project-a", "version-b")).toBe(
      "/create?source=revision&projectId=project-a&versionId=version-b",
    );
  });
});

describe("explore entry URL routing", () => {
  function createMockRouter() {
    return {
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as unknown as Parameters<typeof startExploreCreateFlow>[1];
  }

  function createProjectCopilotFetcher() {
    return vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          project: {
            id: "project-url-test",
            currentFlowStage: "source_received",
          },
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          success: true,
          projectId: "project-url-test",
          stage: "source_review",
          reply: "ok",
        }),
      );
  }

  it("AI creation card routes to /create?source=ai", async () => {
    const storage = new MemoryStorage();
    const fetcher = createProjectCopilotFetcher();
    const router = createMockRouter();

    await startExploreCreateFlow(
      createExploreDraft(),
      router,
      { source: "ai" },
      storage,
      {
        fetcher,
        getAccessToken: async () => "token-123",
      },
    );

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith("/create?source=ai&continue=1");
  });

  it("archive '用此行程创建' routes to /create?source=explore_archive&archiveSlug=...", async () => {
    const storage = new MemoryStorage();
    const fetcher = createProjectCopilotFetcher();
    const router = createMockRouter();

    await startExploreCreateFlow(
      createExploreDraft(),
      router,
      { source: "explore_archive", archiveSlug: "yunnan-food-walk" },
      storage,
      {
        fetcher,
        getAccessToken: async () => "token-123",
      },
    );

    expect(router.push).toHaveBeenCalledWith(
      "/create?source=explore_archive&continue=1&archiveSlug=yunnan-food-walk",
    );
  });

  it("archive '先补充需求' routes to /create?source=explore_archive&mode=chat&archiveSlug=...", async () => {
    const storage = new MemoryStorage();
    const fetcher = createProjectCopilotFetcher();
    const router = createMockRouter();

    await startExploreCreateFlow(
      createExploreDraft(),
      router,
      {
        source: "explore_archive",
        mode: "chat",
        archiveSlug: "yunnan-food-walk",
      },
      storage,
      {
        fetcher,
        getAccessToken: async () => "token-123",
      },
    );

    expect(router.push).toHaveBeenCalledWith(
      "/create?source=explore_archive&continue=1&mode=chat&archiveSlug=yunnan-food-walk",
    );
  });

  it("does not use the legacy entry=explore URL for any explore entry", async () => {
    const router = createMockRouter();

    await startExploreCreateFlow(
      createExploreDraft(),
      router,
      { source: "ai" },
      undefined,
      { fetcher: createProjectCopilotFetcher(), getAccessToken: async () => "token-123" },
    );
    await startExploreCreateFlow(
      createExploreDraft(),
      router,
      { source: "explore_archive", archiveSlug: "slug-a" },
      undefined,
      { fetcher: createProjectCopilotFetcher(), getAccessToken: async () => "token-123" },
    );
    await startExploreCreateFlow(
      createExploreDraft(),
      router,
      { source: "explore_archive", mode: "chat", archiveSlug: "slug-b" },
      undefined,
      { fetcher: createProjectCopilotFetcher(), getAccessToken: async () => "token-123" },
    );

    const pushedUrls = (router.push as unknown as ReturnType<typeof vi.fn>)
      .mock.calls.map((call) => call[0] as string);

    expect(pushedUrls).toEqual([
      "/create?source=ai&continue=1",
      "/create?source=explore_archive&continue=1&archiveSlug=slug-a",
      "/create?source=explore_archive&continue=1&mode=chat&archiveSlug=slug-b",
    ]);
    expect(pushedUrls.every((url) => !url.includes("entry=explore"))).toBe(true);
  });
});

