import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { renderToStaticMarkup } from "react-dom/server";

import {
  CreateFlowRouter,
  CreateFlowRouterView,
  resolveCreateFlowView,
  restoreCreateFlowRoute,
} from "../components/create/CreateFlowRouter";
import {
  CreateCopilotPanel,
  resolveEmptyStateIntro,
  resolveEmptyStatePlaceholder,
  resolveEmptyStateQuickStarts,
  shouldShowArchiveContext,
} from "../components/trip/CreateCopilotPanel";
import { resolveCreateEntry } from "../lib/projects/create-entry";
import {
  restoreCreateCopilotSession,
} from "../lib/projects/create-copilot-client";
import { submitCreateFlow } from "../lib/projects/create-flow-client";
import { getProjectSession, setProjectSession } from "../lib/projects/session";
import { type StorageLike } from "../lib/trip/storage";
import type { TripPlanDraft } from "../lib/trip/types";

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

function createTripPlanDraft(overrides: Partial<TripPlanDraft> = {}): TripPlanDraft {
  return {
    tripTitle: "杭州 3 日旅行档案",
    sourceType: "explore_archive",
    sourceExploreId: "explore-1",
    sourceExploreSlug: "hangzhou-3-days",
    tripRequestDraft: {
      destinationCity: "杭州",
      days: 3,
      interests: ["food"],
      travelStyles: ["relaxed"],
      specialRequirements: "",
    },
    tripPlanSeed: {
      tripTitle: "杭州 3 日",
      summary: "一份简短的旅行计划",
      destination: "杭州",
      days: 3,
      travelStyleSummary: "轻松",
      weatherSummary: {
        available: false,
        overview: "天气待补充",
        dailyForecast: [],
        alerts: [],
        reminders: [],
        dataNote: "草稿无实时天气",
      },
      budgetSummary: {
        totalEstimate: "待补充",
        transport: "待补充",
        hotel: "待补充",
        food: "待补充",
        tickets: "待补充",
        localTransport: "待补充",
        flexibleSpending: "待补充",
        note: "待补充",
      },
      hotelAreaAdvice: [],
      transportAdvice: {
        summary: "待补充",
        options: [],
        suggestedPlatforms: [],
        note: "待补充",
      },
      dailyItinerary: [],
      generalTips: [],
      warnings: [],
    },
    ...overrides,
  };
}

describe("resolveCreateEntry", () => {
  it("resolves source=ai to entrySource=ai and always sets continueSession=false", () => {
    const params = new URLSearchParams("source=ai");
    expect(resolveCreateEntry(params)).toEqual({
      entrySource: "ai",
      continueSession: false,
    });
  });
  it("resolves source=ai with continue=1 as an explicit continuation", () => {
    const params = new URLSearchParams("source=ai&continue=1");
    expect(resolveCreateEntry(params)).toEqual({
      entrySource: "ai",
      continueSession: true,
    });
  });

  it("resolves source=explore_archive with archiveSlug to entrySource=explore_archive", () => {
    const params = new URLSearchParams(
      "source=explore_archive&archiveSlug=test",
    );
    expect(resolveCreateEntry(params)).toEqual({
      entrySource: "explore_archive",
      archiveSlug: "test",
      continueSession: true,
    });
  });

  it("resolves mode=chat for explore_archive entry", () => {
    const params = new URLSearchParams(
      "source=explore_archive&archiveSlug=test&mode=chat",
    );
    expect(resolveCreateEntry(params)).toEqual({
      entrySource: "explore_archive",
      archiveSlug: "test",
      mode: "chat",
      continueSession: true,
    });
  });

  it("returns an empty entry when source is missing or invalid", () => {
    expect(resolveCreateEntry(new URLSearchParams(""))).toEqual({});
    expect(resolveCreateEntry(new URLSearchParams("source=other"))).toEqual({});
  });

  it("resolves source=revision with projectId/versionId to a direct revision entry", () => {
    const params = new URLSearchParams(
      "source=revision&projectId=project-1&versionId=version-2",
    );

    expect(resolveCreateEntry(params)).toEqual({
      entrySource: "revision",
      projectId: "project-1",
      versionId: "version-2",
      continueSession: true,
    });
  });

  it("ignores unknown mode values for explore_archive entry", () => {
    const params = new URLSearchParams(
      "source=explore_archive&archiveSlug=test&mode=video",
    );
    expect(resolveCreateEntry(params)).toEqual({
      entrySource: "explore_archive",
      archiveSlug: "test",
      mode: undefined,
      continueSession: true,
    });
  });
});

describe("create flow entry source propagation", () => {
  it("creates project with sourceType=blank_input and session sourceType=ai_prompt for ai entry", async () => {
    const storage = new MemoryStorage();
    const fetcher = vi
      .fn()
      .mockImplementationOnce(async (_url, init) => {
        expect(_url).toBe("/api/projects");
        const body = JSON.parse(String(init?.body)) as {
          sourceType: string;
          initialMetadata: { sourcePayload: Record<string, unknown> };
        };

        expect(body.sourceType).toBe("blank_input");
        expect(body.initialMetadata.sourcePayload.archiveSlug).toBeUndefined();

        return createJsonResponse({
          project: {
            id: "project-ai-1",
            currentFlowStage: "source_received",
          },
        });
      })
      .mockResolvedValueOnce(
        createJsonResponse({
          messages: [
            {
              id: "message-ai-1",
              projectId: "project-ai-1",
              role: "user",
              content: "seed",
              createdAt: "2026-07-26T00:00:00.000Z",
            },
          ],
        }),
      );

    const result = await submitCreateFlow(
      {
        rawInput: "I want a relaxed Yunnan trip",
        selectedInterests: [],
        selectedTravelStyles: [],
        storage,
        entrySource: "ai",
      },
      {
        fetcher,
        getAccessToken: async () => "token-123",
      },
    );

    expect(result.projectSession?.sourceType).toBe("ai_prompt");
    expect(getProjectSession(storage)?.sourceType).toBe("ai_prompt");
  });

  it("creates project with sourceType=explore_archive and session sourceType=explore_import for archive entry", async () => {
    const storage = new MemoryStorage();
    const fetcher = vi
      .fn()
      .mockImplementationOnce(async (_url, init) => {
        expect(_url).toBe("/api/projects");
        const body = JSON.parse(String(init?.body)) as {
          sourceType: string;
          initialMetadata: { sourcePayload: Record<string, unknown> };
        };

        expect(body.sourceType).toBe("explore_archive");
        expect(body.initialMetadata.sourcePayload.archiveSlug).toBe(
          "hangzhou-3-days",
        );

        return createJsonResponse({
          project: {
            id: "project-archive-1",
            currentFlowStage: "source_received",
          },
        });
      })
      .mockResolvedValueOnce(
        createJsonResponse({
          messages: [
            {
              id: "message-archive-1",
              projectId: "project-archive-1",
              role: "user",
              content: "seed",
              createdAt: "2026-07-26T00:00:00.000Z",
            },
          ],
        }),
      );

    const result = await submitCreateFlow(
      {
        rawInput: "Add Hangzhou archive details",
        selectedInterests: [],
        selectedTravelStyles: [],
        storage,
        entrySource: "explore_archive",
        archiveSlug: "hangzhou-3-days",
      },
      {
        fetcher,
        getAccessToken: async () => "token-123",
      },
    );

    expect(result.projectSession?.sourceType).toBe("explore_import");
    expect(getProjectSession(storage)?.sourceType).toBe("explore_import");
  });
});

describe("create entry bootstrap does not recreate Project", () => {
  it("restoreCreateCopilotSession only performs GET requests, never POST /api/projects", async () => {
    const storage = new MemoryStorage();
    setProjectSession(
      {
        projectId: "project-existing",
        sourceType: "explore_import",
        flowStage: "source_review",
      },
      storage,
    );

    const fetcher = vi
      .fn()
      .mockImplementation(async (url, init) => {
        const method = (init?.method ?? "GET").toUpperCase();
        expect(method).toBe("GET");
        expect(String(url)).not.toBe("/api/projects");

        if (String(url).startsWith("/api/projects/project-existing/messages")) {
          return createJsonResponse({
            messages: [
              {
                id: "message-1",
                projectId: "project-existing",
                role: "user",
                content: "Continue with archive",
                createdAt: "2026-07-23T00:00:00.000Z",
              },
            ],
          });
        }

        return createJsonResponse({
          project: {
            id: "project-existing",
            title: "Hangzhou archive trip",
            currentFlowStage: "source_review",
          },
          currentVersion: null,
          sources: [],
        });
      });

    const restored = await restoreCreateCopilotSession({
      fetcher,
      getAccessToken: async () => "token-123",
      storage,
    });

    expect(restored?.projectId).toBe("project-existing");
    expect(restored?.flowStage).toBe("source_review");
    expect(getProjectSession(storage)?.sourceType).toBe("explore_import");
    fetcher.mock.calls.forEach(([url, init]) => {
      const method = (init?.method ?? "GET").toUpperCase();
      expect(method).toBe("GET");
      expect(String(url)).not.toBe("/api/projects");
    });
  });
});

describe("CreateCopilotPanel empty state entry variants", () => {
  it("returns the AI intro for source=ai", () => {
    expect(resolveEmptyStateIntro("ai", undefined)).toContain("从零开始规划旅行");
    expect(resolveEmptyStatePlaceholder("ai", undefined)).toContain("云南");
    expect(resolveEmptyStateQuickStarts("ai", undefined)).toEqual([
      "不知道去哪，但想找一个适合 4 天放松、美食多一点的地方。",
      "想去云南玩 5 天，节奏慢一点，风景和美食都想要。",
      "给我一版适合周末出发的轻松城市旅行。",
    ]);
  });

  it("returns the archive intro and quick starts for source=explore_archive", () => {
    expect(resolveEmptyStateIntro("explore_archive", undefined)).toContain(
      "我已经了解你的旅行档案",
    );
    expect(resolveEmptyStatePlaceholder("explore_archive", undefined)).toContain(
      "第二天放慢节奏",
    );
    expect(resolveEmptyStateQuickStarts("explore_archive", undefined)).toEqual([
      "第二天节奏放慢一点，留出咖啡时间。",
      "多加一些本地小吃，少安排景点。",
      "整体方向可以，把夜里的内容再丰富一些。",
    ]);
  });

  it("returns the unified archive intro for source=explore_archive with mode=chat", () => {
    expect(resolveEmptyStateIntro("explore_archive", "chat")).toContain(
      "我已经了解你的旅行档案",
    );
    expect(resolveEmptyStatePlaceholder("explore_archive", "chat")).toContain(
      "加点夜景",
    );
    expect(resolveEmptyStateQuickStarts("explore_archive", "chat")).toEqual([
      "想保留档案里的大部分安排。",
      "把第三天换成另一种节奏。",
      "还有几条偏好想加进去。",
    ]);
  });

  it("CreateCopilotPanel accepts the new entry props without throwing", () => {
    expect(() => CreateCopilotPanel).not.toThrow();
    expect(typeof CreateCopilotPanel).toBe("function");
  });

  it("shows the archive context banner only for explore_archive entry with a draft", () => {
    expect(shouldShowArchiveContext("ai", null)).toBe(false);
    expect(shouldShowArchiveContext("ai", createTripPlanDraft())).toBe(false);
    expect(shouldShowArchiveContext("explore_archive", null)).toBe(false);
    expect(shouldShowArchiveContext("explore_archive", undefined)).toBe(false);
    expect(
      shouldShowArchiveContext("explore_archive", createTripPlanDraft()),
    ).toBe(true);
  });
});

describe("CreateFlowRouter entry and stage interpretation", () => {
  it("exports the Router for AI and Explore Archive entry props", () => {
    expect(typeof CreateFlowRouter).toBe("function");
  });

  it("maps chat stages to CreateCopilotPanel", () => {
    expect(resolveCreateFlowView("source_received")).toBe("chat");
    expect(resolveCreateFlowView("source_review")).toBe("chat");
    expect(resolveCreateFlowView("clarifying")).toBe("chat");
  });

  it("maps proposal_ready to the Proposal Preview Panel fallback", () => {
    expect(resolveCreateFlowView("proposal_ready")).toBe("proposal");
    const markup = renderToStaticMarkup(
      <CreateFlowRouterView view="proposal" />,
    );

    expect(markup).toContain("create-flow-proposal-placeholder");
    expect(markup).toContain("还没有找到这版方案");
  });

  it("maps the remaining non-chat stages to their routed views", () => {
    expect(resolveCreateFlowView("proposal_adjusting")).toBe("revision");
    expect(resolveCreateFlowView("generating")).toBe("generating");
    expect(resolveCreateFlowView("abandoned")).toBe("resume");
  });

  it("renders the proposal preview once a currentVersionId is on the server", () => {
    expect(resolveCreateFlowView("workspace_ready")).toBe("workspace_pending");
    expect(resolveCreateFlowView("workspace_ready", null)).toBe(
      "workspace_pending",
    );
    expect(resolveCreateFlowView("workspace_ready", "version-1")).toBe(
      "workspace_preview",
    );
  });
});

describe("CreateFlowRouter refresh restoration", () => {
  it("clears an existing Project session for a fresh AI entry without requests", async () => {
    const storage = new MemoryStorage();
    setProjectSession(
      {
        projectId: "project-old",
        sourceType: "ai_prompt",
        flowStage: "proposal_ready",
      },
      storage,
    );
    const fetcher = vi.fn();

    await expect(
      restoreCreateFlowRoute({
        fetcher,
        getAccessToken: async () => "token-123",
        storage,
        continueSession: false,
      }),
    ).resolves.toEqual({ status: "new" });

    expect(getProjectSession(storage)).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("URL → resolveCreateEntry → restoreCreateFlowRoute: source=ai 永远清旧 session 且不发起请求", async () => {
    const storage = new MemoryStorage();
    setProjectSession(
      {
        projectId: "project-stale",
        sourceType: "ai_prompt",
        flowStage: "clarifying",
      },
      storage,
    );
    const fetcher = vi.fn();

    const entry = resolveCreateEntry(new URLSearchParams("source=ai"));

    expect(entry.continueSession).toBe(false);

    await expect(
      restoreCreateFlowRoute({
        fetcher,
        getAccessToken: async () => "token-123",
        storage,
        continueSession: entry.continueSession,
      }),
    ).resolves.toEqual({ status: "new" });

    expect(getProjectSession(storage)).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("URL → resolveCreateEntry → restoreCreateFlowRoute: source=ai&continue=1 仍可恢复", async () => {
    const storage = new MemoryStorage();
    setProjectSession(
      {
        projectId: "project-keep",
        sourceType: "ai_prompt",
        flowStage: "clarifying",
      },
      storage,
    );
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          project: {
            id: "project-keep",
            currentFlowStage: "clarifying",
            currentVersionId: null,
          },
          currentVersion: null,
          sources: [],
        }),
      )
      .mockResolvedValueOnce(createJsonResponse({ messages: [] }));

    const entry = resolveCreateEntry(
      new URLSearchParams("source=ai&continue=1"),
    );

    expect(entry.continueSession).toBe(true);

    const result = await restoreCreateFlowRoute({
      fetcher,
      getAccessToken: async () => "token-123",
      storage,
      continueSession: entry.continueSession,
    });

    expect(result).toMatchObject({
      status: "restored",
      project: {
        projectId: "project-keep",
        flowStage: "clarifying",
        messages: [],
      },
    });
    expect(getProjectSession(storage)?.projectId).toBe("project-keep");
  });

  it("opens a fresh Chat without requests when no Project session exists", async () => {
    const fetcher = vi.fn();

    await expect(
      restoreCreateFlowRoute({
        fetcher,
        getAccessToken: async () => "token-123",
        storage: new MemoryStorage(),
      }),
    ).resolves.toEqual({ status: "new" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("restores clarifying from the server and only performs GET requests", async () => {
    const storage = new MemoryStorage();
    setProjectSession(
      {
        projectId: "project-existing",
        versionId: "stale-version",
        sourceType: "explore_import",
        flowStage: "proposal_ready",
      },
      storage,
    );
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          project: {
            id: "project-existing",
            currentFlowStage: "clarifying",
            currentVersionId: null,
          },
          currentVersion: null,
          sources: [],
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          messages: [
            {
              id: "message-1",
              projectId: "project-existing",
              role: "assistant",
              content: "Tell me your budget.",
              createdAt: "2026-07-25T00:00:00.000Z",
            },
          ],
        }),
      );

    const restored = await restoreCreateFlowRoute({
      fetcher,
      getAccessToken: async () => "token-123",
      storage,
      continueSession: true,
    });

    expect(restored).toEqual({
      status: "restored",
      project: {
        projectId: "project-existing",
        flowStage: "clarifying",
        currentVersionId: undefined,
        messages: [
          {
            id: "message-1",
            projectId: "project-existing",
            role: "assistant",
            content: "Tell me your budget.",
            createdAt: "2026-07-25T00:00:00.000Z",
          },
        ],
      },
    });
    expect(getProjectSession(storage)?.flowStage).toBe("clarifying");
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(
      fetcher.mock.calls.some(
        ([url, init]) =>
          String(url) === "/api/projects" &&
          (init?.method ?? "GET").toUpperCase() === "POST",
      ),
    ).toBe(false);
    fetcher.mock.calls.forEach(([url, init]) => {
      expect((init?.method ?? "GET").toUpperCase()).toBe("GET");
      expect(String(url)).not.toBe("/api/projects");
    });
  });

  it("restores proposal_ready without creating or fetching chat messages", async () => {
    const storage = new MemoryStorage();
    setProjectSession(
      {
        projectId: "project-proposal",
        sourceType: "ai_prompt",
        flowStage: "clarifying",
      },
      storage,
    );
    const fetcher = vi.fn().mockResolvedValue(
      createJsonResponse({
        project: {
          id: "project-proposal",
          currentFlowStage: "proposal_ready",
          currentVersionId: null,
        },
        currentVersion: null,
        sources: [],
      }),
    );

    const restored = await restoreCreateFlowRoute({
      fetcher,
      getAccessToken: async () => "token-123",
      storage,
      continueSession: true,
    });

    expect(restored).toMatchObject({
      status: "restored",
      project: {
        flowStage: "proposal_ready",
        messages: [],
      },
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(
      "/api/projects/project-proposal",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("uses the server currentVersionId for Workspace readiness", async () => {
    const storage = new MemoryStorage();
    setProjectSession(
      {
        projectId: "project-ready",
        sourceType: "ai_prompt",
        flowStage: "workspace_ready",
      },
      storage,
    );
    const fetcher = vi.fn().mockResolvedValue(
      createJsonResponse({
        project: {
          id: "project-ready",
          currentFlowStage: "workspace_ready",
          currentVersionId: "version-current",
        },
        currentVersion: null,
        sources: [],
      }),
    );

    const restored = await restoreCreateFlowRoute({
      fetcher,
      getAccessToken: async () => "token-123",
      storage,
      continueSession: true,
    });

    expect(restored).toMatchObject({
      status: "restored",
      project: {
        flowStage: "workspace_ready",
        currentVersionId: "version-current",
        messages: [],
      },
    });
    expect(getProjectSession(storage)?.versionId).toBe("version-current");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("restores a direct revision entry from explicit projectId/versionId", async () => {
    const storage = new MemoryStorage();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          project: {
            id: "project-revision",
            currentFlowStage: "workspace_ready",
            currentVersionId: "version-1",
          },
          currentVersion: null,
          sources: [],
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          messages: [
            {
              id: "message-1",
              projectId: "project-revision",
              role: "assistant",
              content: "Existing planning history",
              createdAt: "2026-07-25T00:00:00.000Z",
            },
          ],
        }),
      );

    const restored = await restoreCreateFlowRoute({
      fetcher,
      getAccessToken: async () => "token-123",
      storage,
      continueSession: true,
      entrySource: "revision",
      explicitProjectId: "project-revision",
      explicitVersionId: "version-2",
    });

    expect(restored).toEqual({
      status: "restored",
      project: {
        projectId: "project-revision",
        flowStage: "workspace_ready",
        currentVersionId: "version-2",
        requestedVersionId: "version-2",
        messages: [
          {
            id: "message-1",
            projectId: "project-revision",
            role: "assistant",
            content: "Existing planning history",
            createdAt: "2026-07-25T00:00:00.000Z",
          },
        ],
      },
    });
    expect(getProjectSession(storage)).toMatchObject({
      projectId: "project-revision",
      versionId: "version-2",
    });
  });

  it("does not recreate a Project when restoration is unavailable", async () => {
    const storage = new MemoryStorage();
    setProjectSession(
      {
        projectId: "project-missing",
        sourceType: "ai_prompt",
        flowStage: "clarifying",
      },
      storage,
    );
    const fetcher = vi.fn().mockResolvedValue(
      createJsonResponse(
        {
          error: {
            code: "UNKNOWN_ERROR",
            message: "Travel project not found.",
          },
        },
        { status: 404 },
      ),
    );

    await expect(
      restoreCreateFlowRoute({
        fetcher,
        getAccessToken: async () => "token-123",
        storage,
        continueSession: true,
      }),
    ).resolves.toEqual({ status: "unavailable" });
    expect(fetcher).toHaveBeenCalledTimes(1);
    fetcher.mock.calls.forEach(([url, init]) => {
      expect((init?.method ?? "GET").toUpperCase()).toBe("GET");
      expect(String(url)).not.toBe("/api/projects");
    });
  });
});
