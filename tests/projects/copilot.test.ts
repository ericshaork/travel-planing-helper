import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createProjectCopilotPostHandler } from "../../app/api/projects/[projectId]/copilot/route";
import { createCopilotService } from "../../lib/projects/copilot/copilot-service";
import type { FlowService } from "../../lib/projects/flow/flow-service";
import type { ProjectDetail, ProjectService } from "../../lib/projects/service";
import type { TravelProject } from "../../lib/projects/types";
import { AppError } from "../../lib/utils/errors";

function createProject(
  overrides: Partial<TravelProject> = {},
): TravelProject {
  return {
    id: "project-1",
    userId: "user-1",
    title: "Yunnan trip",
    lifecycleState: "planning",
    currentFlowStage: "source_received",
    currentVersionId: null,
    lastActivityAt: "2026-07-23T00:00:00.000Z",
    createdAt: "2026-07-23T00:00:00.000Z",
    updatedAt: "2026-07-23T00:00:00.000Z",
    ...overrides,
  };
}

function createProjectServiceMock(
  detail: ProjectDetail | null,
): ProjectService {
  return {
    createProject: vi.fn(),
    getProject: vi.fn().mockResolvedValue(detail),
    updateProjectState: vi.fn(),
    createProjectVersion: vi.fn(),
    listProjectVersions: vi.fn(),
    getProjectVersion: vi.fn(),
    addProjectSource: vi.fn(),
    listProjectSources: vi.fn(),
    appendProjectMessage: vi.fn().mockResolvedValue({
      id: "message-1",
      projectId: "project-1",
      role: "user",
      content: "hello",
      createdAt: "2026-07-23T00:00:00.000Z",
    }),
    listProjectMessages: vi.fn().mockResolvedValue([
      {
        id: "message-1",
        projectId: "project-1",
        role: "user",
        content: "I want to go to Yunnan",
        createdAt: "2026-07-23T00:00:00.000Z",
      },
    ]),
  };
}

function createFlowServiceMock(): FlowService {
  const moveFlowStage = vi
    .fn()
    .mockImplementation(async (_projectId: string, nextStage: string) => ({
      project: createProject({
        currentFlowStage: nextStage as TravelProject["currentFlowStage"],
      }),
      currentStage: nextStage,
      messages: [],
      sources: [],
      metadata: {},
    }));

  return {
    initializeFlow: vi.fn(),
    moveFlowStage,
    abandonFlow: vi.fn(),
    resumeFlow: vi.fn().mockResolvedValue({
      currentStage: "abandoned",
      resumeStage: "source_review",
      resumedFromAbandoned: true,
    }),
  } as FlowService;
}

describe("copilot service", () => {
  it("routes destination messages through conversation intelligence", async () => {
    const projectService = createProjectServiceMock({
      project: createProject(),
      currentVersion: null,
      sources: [],
    });
    const flowService = createFlowServiceMock();
    const copilotService = createCopilotService(projectService, flowService);

    const result = await copilotService.handleMessage(
      "project-1",
      "I want to go to Yunnan",
    );

    expect(projectService.appendProjectMessage).toHaveBeenNthCalledWith(
      1,
      "project-1",
      {
        role: "user",
        content: "I want to go to Yunnan",
      },
    );
    expect(flowService.moveFlowStage).toHaveBeenNthCalledWith(
      1,
      "project-1",
      "source_review",
    );
    expect(flowService.moveFlowStage).toHaveBeenNthCalledWith(
      2,
      "project-1",
      "clarifying",
    );
    expect(projectService.appendProjectMessage).toHaveBeenNthCalledWith(
      2,
      "project-1",
      {
        role: "assistant",
        content:
          "目的地收到。接下来告诉我几天、想玩得多慢、以及更看重什么，我就能继续收紧方案。",
      },
    );
    expect(result).toEqual({
      success: true,
      projectId: "project-1",
      stage: "clarifying",
      reply:
        "目的地收到。接下来告诉我几天、想玩得多慢、以及更看重什么，我就能继续收紧方案。",
    });
  });
});

describe("copilot route", () => {
  it("returns success for a normal message", async () => {
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: vi.fn(),
    };
    const mockCopilot = vi.fn().mockReturnValue({
      handleMessage: vi.fn().mockResolvedValue({
        success: true,
        projectId: "project-1",
        stage: "clarifying",
        reply: "reply",
      }),
    });
    const POST = createProjectCopilotPostHandler(
      () => client as never,
      mockCopilot as never,
    );

    const response = await POST(
      new Request("http://localhost/api/projects/project-1/copilot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token-123",
        },
        body: JSON.stringify({
          message: "I want to go to Yunnan",
        }),
      }),
      {
        params: Promise.resolve({
          projectId: "project-1",
        }),
      },
    );
    const payload = (await response.json()) as {
      success: boolean;
      projectId: string;
      stage: string;
      reply: string;
    };

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      success: true,
      projectId: "project-1",
      stage: "clarifying",
      reply: "reply",
    });
  });

  it("returns 400 for an empty message", async () => {
    const POST = createProjectCopilotPostHandler(
      () =>
        ({
          auth: {
            getUser: vi.fn(),
          },
          from: vi.fn(),
        }) as never,
      vi.fn() as never,
    );

    const response = await POST(
      new Request("http://localhost/api/projects/project-1/copilot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token-123",
        },
        body: JSON.stringify({
          message: "   ",
        }),
      }),
      {
        params: Promise.resolve({
          projectId: "project-1",
        }),
      },
    );

    expect(response.status).toBe(400);
  });

  it("returns 404 for a missing project", async () => {
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: vi.fn(),
    };
    const mockCopilot = vi.fn().mockReturnValue({
      handleMessage: vi
        .fn()
        .mockRejectedValue(
          new AppError(
            "UNKNOWN_ERROR",
            "Travel project not found: project-404",
          ),
        ),
    });
    const POST = createProjectCopilotPostHandler(
      () => client as never,
      mockCopilot as never,
    );

    const response = await POST(
      new Request("http://localhost/api/projects/project-404/copilot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token-123",
        },
        body: JSON.stringify({
          message: "Plan Yunnan",
        }),
      }),
      {
        params: Promise.resolve({
          projectId: "project-404",
        }),
      },
    );

    expect(response.status).toBe(404);
  });

  it("loads user settings and forwards userPreferenceContext to the copilot service", async () => {
    const handleMessage = vi.fn().mockResolvedValue({
      success: true,
      projectId: "project-1",
      stage: "clarifying",
      reply: "reply",
    });
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table !== "user_settings") {
          return {};
        }

        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "settings-1",
                  user_id: "user-1",
                  travel_preferences_json: {
                    budget: "moderate",
                    pace: "slow",
                    interests: ["food"],
                    companions: "partner",
                    wakeUpPreference: "normal",
                    transportPreference: "public_transport",
                  },
                  workspace_preferences_json: {
                    defaultMode: "read",
                    mapLayout: "balanced",
                    mapOverlay: "expanded",
                  },
                  ai_preferences_json: {
                    detailLevel: "standard",
                    useLongTermPreferences: true,
                    preferHiddenGems: false,
                    preferLessWalking: true,
                    preferConvenientTransport: true,
                  },
                  created_at: "2026-07-27T00:00:00.000Z",
                  updated_at: "2026-07-27T00:00:00.000Z",
                },
                error: null,
              }),
            }),
          }),
        };
      }),
    };
    const mockCopilot = vi.fn().mockReturnValue({
      handleMessage,
    });
    const POST = createProjectCopilotPostHandler(
      () => client as never,
      mockCopilot as never,
    );

    const response = await POST(
      new Request("http://localhost/api/projects/project-1/copilot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token-123",
        },
        body: JSON.stringify({
          message: "I want to go to Yunnan",
        }),
      }),
      {
        params: Promise.resolve({
          projectId: "project-1",
        }),
      },
    );

    expect(response.status).toBe(200);
    expect(handleMessage).toHaveBeenCalledWith(
      "project-1",
      "I want to go to Yunnan",
      expect.objectContaining({
        userPreferenceContext: expect.objectContaining({
          source: "user_settings",
          summary: expect.stringContaining("长期偏好"),
        }),
      }),
    );
  });
});
