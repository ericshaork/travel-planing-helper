import { describe, expect, it, vi } from "vitest";

import { createProjectVersionService } from "../lib/projects/version/version-service";
import type { ProjectService } from "../lib/projects/service";
import type {
  TravelProject,
  TravelProjectVersion,
} from "../lib/projects/types";
import {
  loadWorkspaceLocalTripState,
  restoreWorkspaceProjectVersionContext,
} from "../lib/projects/workspace-context-client";
import { setProjectSession } from "../lib/projects/session";
import type { StorageLike } from "../lib/trip/storage";

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
    lastActivityAt: "2026-07-23T00:00:00.000Z",
    createdAt: "2026-07-23T00:00:00.000Z",
    updatedAt: "2026-07-23T00:00:00.000Z",
    ...overrides,
  };
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

function createVersion(
  id: string,
  versionNumber: number,
  versionStatus: TravelProjectVersion["versionStatus"] = "accepted",
): TravelProjectVersion {
  return {
    id,
    projectId: "project-1",
    versionNumber,
    versionStatus,
    createdFrom: "ai_generate",
    tripPlan: createTripPlan(`Yunnan ${versionNumber}`),
    tripRequestSnapshot: {
      departureCity: "Shenzhen",
      destinationCity: "Yunnan",
      days: 5,
      budget: 6000,
      currency: "CNY",
      interests: ["food"],
      travelStyles: ["relaxed"],
      mustVisitPlaces: [],
      avoidPlaces: [],
    },
    createdAt: "2026-07-23T00:00:00.000Z",
    updatedAt: "2026-07-23T00:00:00.000Z",
  };
}

function createProjectServiceMock(): ProjectService {
  let project = createProject();
  const versions: TravelProjectVersion[] = [createVersion("version-1", 1, "accepted")];

  return {
    createProject: vi.fn(),
    getProject: vi.fn().mockImplementation(async (projectId: string) => {
      if (projectId !== project.id) {
        return null;
      }

      return {
        project,
        currentVersion:
          versions.find((version) => version.id === project.currentVersionId) ?? null,
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
          ? { lastActivityAt: "2026-07-23T01:00:00.000Z" }
          : {}),
      };

      return project;
    }),
    createProjectVersion: vi.fn().mockImplementation(async (_projectId, input) => {
      const version = createVersion(
        `version-${versions.length + 1}`,
        versions.length + 1,
        input.versionStatus ?? "accepted",
      );
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
      return versions.find((version) => version.id === versionId) ?? null;
    }),
    addProjectSource: vi.fn(),
    listProjectSources: vi.fn(),
    appendProjectMessage: vi.fn(),
    listProjectMessages: vi.fn(),
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

describe("project version service", () => {
  it("creates multiple versions with incrementing version numbers", async () => {
    const service = createProjectVersionService(createProjectServiceMock());

    const v2 = await service.createVersion("project-1", {
      tripPlan: createTripPlan("Yunnan v2"),
      managedStatus: "active",
      setAsCurrent: true,
    });
    const v3 = await service.createVersion("project-1", {
      tripPlan: createTripPlan("Yunnan v3"),
      managedStatus: "archived",
      setAsCurrent: false,
    });

    expect(v2.versionNumber).toBe(2);
    expect(v2.managedStatus).toBe("active");
    expect(v3.versionNumber).toBe(3);
    expect(v3.managedStatus).toBe("archived");
  });

  it("maps version lifecycle statuses into managed statuses", async () => {
    const service = createProjectVersionService(createProjectServiceMock());

    await service.createVersion("project-1", {
      tripPlan: createTripPlan("proposal"),
      managedStatus: "proposed",
      setAsCurrent: false,
    });

    const versions = await service.listVersions("project-1");

    expect(versions.map((version) => version.managedStatus)).toContain("proposed");
    expect(versions.map((version) => version.managedStatus)).toContain("active");
  });

  it("switches current version and updates project currentVersionId", async () => {
    const projectService = createProjectServiceMock();
    const service = createProjectVersionService(projectService);

    await service.createVersion("project-1", {
      tripPlan: createTripPlan("Yunnan v2"),
      managedStatus: "active",
      setAsCurrent: false,
    });

    const result = await service.setCurrentVersion("project-1", "version-2");

    expect(result.project.currentVersionId).toBe("version-2");
    expect(result.currentVersion?.id).toBe("version-2");
    expect(result.currentVersion?.managedStatus).toBe("active");
  });

  it("returns the current version for a project", async () => {
    const service = createProjectVersionService(createProjectServiceMock());

    const currentVersion = await service.getCurrentVersion("project-1");

    expect(currentVersion?.id).toBe("version-1");
    expect(currentVersion?.managedStatus).toBe("active");
  });
});

describe("version fallback compatibility", () => {
  it("keeps old workspace fallback working without project context", async () => {
    const storage = new MemoryStorage();

    const restored = await restoreWorkspaceProjectVersionContext({
      fetcher: vi.fn(),
      getAccessToken: async () => "token-123",
      storage,
    });

    expect(restored).toBeNull();
    expect(loadWorkspaceLocalTripState(storage).tripPlan).toBeNull();
  });

  it("preserves explicit version context for workspace restore", async () => {
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
            id: "version-1",
            tripPlan: createTripPlan("Yunnan 1"),
            tripRequestSnapshot: createVersion("version-1", 1).tripRequestSnapshot,
          },
          sources: [],
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          version: {
            id: "version-2",
            tripPlan: createTripPlan("Yunnan 2"),
            tripRequestSnapshot: createVersion("version-2", 2).tripRequestSnapshot,
          },
        }),
      );

    const restored = await restoreWorkspaceProjectVersionContext({
      fetcher,
      getAccessToken: async () => "token-123",
      storage,
    });

    expect(restored?.versionId).toBe("version-2");
    expect(restored?.tripPlan.tripTitle).toBe("Yunnan 2");
  });
});
