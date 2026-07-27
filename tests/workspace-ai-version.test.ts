import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  regenerateWorkspaceTrip,
  requestWorkspaceAiModification,
} from "../lib/projects/workspace-ai/workspace-ai-client";
import { createWorkspaceAiService } from "../lib/projects/workspace-ai/workspace-ai-service";
import { setProjectSession, getProjectSession } from "../lib/projects/session";
import type { StorageLike } from "../lib/trip/storage";
import type { ProjectService } from "../lib/projects/service";
import type {
  TravelProject,
  TravelProjectMessage,
  TravelProjectVersion,
} from "../lib/projects/types";

function createTripPlan(title: string) {
  return {
    tripTitle: title,
    summary: "mock summary",
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
      hotel: "2200",
      food: "1100",
      tickets: "700",
      localTransport: "300",
      flexibleSpending: "500",
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
      theme: `day-${index + 1}`,
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

function createTripRequest() {
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

function createProject(
  overrides: Partial<TravelProject> = {},
): TravelProject {
  return {
    id: "project-1",
    userId: "user-1",
    title: "Yunnan trip",
    lifecycleState: "workspace",
    currentFlowStage: "workspace_ready",
    currentVersionId: "version-1",
    lastActivityAt: "2026-07-23T10:00:00.000Z",
    createdAt: "2026-07-23T10:00:00.000Z",
    updatedAt: "2026-07-23T10:00:00.000Z",
    ...overrides,
  };
}

function createVersion(
  id: string,
  versionNumber: number,
  title: string,
): TravelProjectVersion {
  return {
    id,
    projectId: "project-1",
    versionNumber,
    versionStatus: "accepted",
    createdFrom: versionNumber === 1 ? "ai_generate" : "ai_adjust",
    tripPlan: createTripPlan(title),
    tripRequestSnapshot: createTripRequest(),
    createdAt: "2026-07-23T10:00:00.000Z",
    updatedAt: "2026-07-23T10:00:00.000Z",
  };
}

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

function createProjectServiceMock() {
  let project = createProject();
  const versions: TravelProjectVersion[] = [createVersion("version-1", 1, "Yunnan v1")];
  const messages: TravelProjectMessage[] = [];

  const service: ProjectService = {
    createProject: vi.fn(),
    getProject: vi.fn().mockImplementation(async (projectId: string) => {
      if (projectId !== project.id) {
        return null;
      }

      return {
        project,
        currentVersion:
          versions.find((item) => item.id === project.currentVersionId) ?? null,
        sources: [],
      };
    }),
    updateProjectState: vi.fn().mockImplementation(async (_projectId, input) => {
      project = {
        ...project,
        ...(input.lifecycleState !== undefined
          ? { lifecycleState: input.lifecycleState }
          : {}),
        ...(input.currentFlowStage !== undefined
          ? { currentFlowStage: input.currentFlowStage }
          : {}),
        ...(input.currentVersionId !== undefined
          ? { currentVersionId: input.currentVersionId }
          : {}),
        ...(input.touchActivity
          ? { lastActivityAt: "2026-07-23T11:00:00.000Z" }
          : {}),
      };

      return project;
    }),
    createProjectVersion: vi.fn().mockImplementation(async (_projectId, input) => {
      const version = {
        id: `version-${versions.length + 1}`,
        projectId: "project-1",
        versionNumber: versions.length + 1,
        versionStatus: input.versionStatus ?? "accepted",
        createdFrom: input.createdFrom ?? "ai_adjust",
        tripPlan: input.tripPlan,
        tripRequestSnapshot: input.tripRequestSnapshot ?? null,
        createdAt: "2026-07-23T11:00:00.000Z",
        updatedAt: "2026-07-23T11:00:00.000Z",
      } satisfies TravelProjectVersion;

      versions.unshift(version);

      if (input.setAsCurrent ?? true) {
        project = {
          ...project,
          currentVersionId: version.id,
        };
      }

      return version;
    }),
    listProjectVersions: vi.fn().mockImplementation(async () => versions),
    getProjectVersion: vi.fn().mockImplementation(async (_projectId, versionId: string) => {
      return versions.find((item) => item.id === versionId) ?? null;
    }),
    addProjectSource: vi.fn(),
    listProjectSources: vi.fn(),
    appendProjectMessage: vi.fn().mockImplementation(async (_projectId, input) => {
      const message: TravelProjectMessage = {
        id: `message-${messages.length + 1}`,
        projectId: "project-1",
        role: input.role,
        content: input.content,
        createdAt: "2026-07-23T11:00:00.000Z",
      };
      messages.push(message);
      return message;
    }),
    listProjectMessages: vi.fn().mockImplementation(async () => messages),
  };

  return {
    service,
    getProjectSnapshot: () => project,
    getVersionsSnapshot: () => versions.slice(),
    getMessagesSnapshot: () => messages.slice(),
  };
}

describe("workspace ai service", () => {
  it("creates a new version from the current version and keeps the old version", async () => {
    const projectServiceMock = createProjectServiceMock();
    const service = createWorkspaceAiService(projectServiceMock.service, {
      planner: vi.fn().mockResolvedValue({
        tripPlan: createTripPlan("Yunnan v2"),
        appliedChanges: ["Day 3 made slower"],
        warnings: [],
      }),
      conversationService: {
        processMessage: vi.fn().mockResolvedValue({
          reply: "我会在保留主线路的前提下，把第三天放松一点。",
          intent: "modification_request",
          action: "modify_proposal",
          nextStage: null,
          missingInfo: [],
        }),
      },
      resolveUserSettings: async () => null,
    });

    const result = await service.applyModification(
      "project-1",
      "version-1",
      "第三天轻松一点",
    );

    const versions = projectServiceMock.getVersionsSnapshot();
    const project = projectServiceMock.getProjectSnapshot();
    const messages = projectServiceMock.getMessagesSnapshot();

    expect(result.versionId).toBe("version-2");
    expect(result.previousVersionId).toBe("version-1");
    expect(result.tripPlan.tripTitle).toBe("Yunnan v2");
    expect(project.currentVersionId).toBe("version-2");
    expect(versions).toHaveLength(2);
    expect(versions.some((item) => item.id === "version-1")).toBe(true);
    expect(versions.some((item) => item.id === "version-2")).toBe(true);
    expect(messages.map((item) => item.role)).toEqual(["user", "assistant"]);
  });
});

describe("workspace ai client", () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    vi.stubGlobal("window", {
      localStorage: storage,
    });
  });

  it("switches workspace session to the new version after ai regeneration", async () => {
    setProjectSession(
      {
        projectId: "project-1",
        versionId: "version-1",
        sourceType: "blank_input",
        flowStage: "workspace_ready",
      },
      storage,
    );

    const result = await regenerateWorkspaceTrip(
      {
        tripPlan: createTripPlan("Yunnan v1"),
        tripRequest: createTripRequest(),
        modificationRequest: "第三天轻松一点",
      },
      {
        getAccessToken: async () => "token-123",
        fetchImpl: vi.fn().mockResolvedValue(
          createJsonResponse({
            success: true,
            projectId: "project-1",
            versionId: "version-2",
            previousVersionId: "version-1",
            stage: "workspace_ready",
            reply: "已帮你调整为更轻松的节奏。",
            tripPlan: createTripPlan("Yunnan v2"),
            tripRequest: createTripRequest(),
            appliedChanges: ["第三天轻松一点"],
            warnings: [],
            intent: "modification_request",
            action: "modify_proposal",
          }),
        ),
      },
    );

    expect(result.tripPlan.tripTitle).toBe("Yunnan v2");
    expect(getProjectSession(storage)?.versionId).toBe("version-2");
    expect(getProjectSession(storage)?.flowStage).toBe("workspace_ready");
  });

  it("can call workspace ai directly without switching the current session", async () => {
    setProjectSession(
      {
        projectId: "project-1",
        versionId: "version-1",
        sourceType: "blank_input",
        flowStage: "workspace_ready",
      },
      storage,
    );

    const result = await requestWorkspaceAiModification(
      {
        projectId: "project-1",
        versionId: "version-1",
        modificationRequest: "请把第二天调整得更轻松一些。",
      },
      {
        getAccessToken: async () => "token-123",
        fetchImpl: vi.fn().mockResolvedValue(
          createJsonResponse({
            success: true,
            projectId: "project-1",
            versionId: "version-2",
            previousVersionId: "version-1",
            stage: "workspace_ready",
            reply: "我会把第二天的节奏放慢一些。",
            tripPlan: createTripPlan("Yunnan v2"),
            tripRequest: createTripRequest(),
            appliedChanges: ["第二天节奏更轻松"],
            warnings: [],
            intent: "modification_request",
            action: "modify_proposal",
          }),
        ),
      },
    );

    expect(result.versionId).toBe("version-2");
    expect(result.previousVersionId).toBe("version-1");
    expect(result.tripPlan.tripTitle).toBe("Yunnan v2");
    expect(getProjectSession(storage)?.versionId).toBe("version-1");
    expect(getProjectSession(storage)?.flowStage).toBe("workspace_ready");
  });

  it("falls back to the old generate-trip flow when no project context exists", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      createJsonResponse({
        tripPlan: createTripPlan("Legacy regenerated"),
        appliedChanges: ["legacy path"],
        warnings: [],
      }),
    );

    const result = await regenerateWorkspaceTrip(
      {
        tripPlan: createTripPlan("Yunnan v1"),
        tripRequest: createTripRequest(),
        modificationRequest: "轻松一点",
      },
      {
        fetchImpl,
        getAccessToken: async () => null,
      },
    );

    expect(result.tripPlan.tripTitle).toBe("Legacy regenerated");
    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/generate-trip",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });
});
