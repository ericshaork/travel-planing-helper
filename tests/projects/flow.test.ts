import { describe, expect, it, vi } from "vitest";

import { createFlowService } from "../../lib/projects/flow/flow-service";
import { canTransition } from "../../lib/projects/flow/flow-transition";
import type { ProjectDetail, ProjectService } from "../../lib/projects/service";
import type {
  TravelProject,
  TravelProjectSource,
} from "../../lib/projects/types";

function createProject(
  overrides: Partial<TravelProject> = {},
): TravelProject {
  return {
    id: "project-1",
    userId: "user-1",
    title: "Chengdu 4 days",
    lifecycleState: "planning",
    currentFlowStage: "source_received",
    currentVersionId: null,
    lastActivityAt: "2026-07-23T00:00:00.000Z",
    createdAt: "2026-07-23T00:00:00.000Z",
    updatedAt: "2026-07-23T00:00:00.000Z",
    ...overrides,
  };
}

function createSource(
  overrides: Partial<TravelProjectSource> = {},
): TravelProjectSource {
  return {
    id: "source-1",
    projectId: "project-1",
    sourceType: "blank_input",
    title: "Idea",
    payload: {
      rawText: "I want to go to Chengdu",
    },
    createdAt: "2026-07-23T00:00:00.000Z",
    updatedAt: "2026-07-23T00:00:00.000Z",
    ...overrides,
  };
}

function createDetail(
  projectOverrides: Partial<TravelProject> = {},
): ProjectDetail {
  return {
    project: createProject(projectOverrides),
    currentVersion: null,
    sources: [createSource()],
  };
}

function createProjectServiceMock(
  detail: ProjectDetail = createDetail(),
): ProjectService {
  let currentDetail = detail;

  return {
    createProject: vi.fn().mockImplementation(async (_userId, input) => {
      currentDetail = createDetail({
        title: input.title,
        lifecycleState: input.initialMetadata?.lifecycleState ?? "planning",
        currentFlowStage: input.initialMetadata?.flowStage ?? "source_received",
      });
      return currentDetail.project;
    }),
    getProject: vi.fn().mockImplementation(async (projectId: string) => {
      return currentDetail.project.id === projectId ? currentDetail : null;
    }),
    updateProjectState: vi.fn().mockImplementation(async (_projectId, input) => {
      currentDetail = {
        ...currentDetail,
        project: {
          ...currentDetail.project,
          ...(input.lifecycleState !== undefined
            ? { lifecycleState: input.lifecycleState }
            : {}),
          ...(input.currentFlowStage !== undefined
            ? { currentFlowStage: input.currentFlowStage }
            : {}),
          ...(input.touchActivity
            ? { lastActivityAt: "2026-07-23T01:00:00.000Z" }
            : {}),
        },
      };
      return currentDetail.project;
    }),
    createProjectVersion: vi.fn(),
    listProjectVersions: vi.fn(),
    getProjectVersion: vi.fn(),
    addProjectSource: vi.fn(),
    listProjectSources: vi.fn(),
    appendProjectMessage: vi.fn(),
    listProjectMessages: vi.fn(),
  };
}

describe("flow transition", () => {
  it("allows source_received -> source_review", () => {
    expect(canTransition("source_received", "source_review")).toEqual({
      ok: true,
      from: "source_received",
      to: "source_review",
    });
  });

  it("rejects source_received -> workspace_ready", () => {
    expect(canTransition("source_received", "workspace_ready")).toEqual({
      ok: false,
      from: "source_received",
      to: "workspace_ready",
      reason: "Illegal flow transition: source_received -> workspace_ready",
    });
  });
});

describe("flow service", () => {
  it("moves flow stage for a legal transition", async () => {
    const projectService = createProjectServiceMock();
    const flowService = createFlowService(projectService);

    const context = await flowService.moveFlowStage(
      "project-1",
      "source_review",
    );

    expect(projectService.updateProjectState).toHaveBeenCalledWith("project-1", {
      currentFlowStage: "source_review",
      touchActivity: true,
    });
    expect(context.currentStage).toBe("source_review");
  });

  it("abandons from clarifying", async () => {
    const projectService = createProjectServiceMock(
      createDetail({
        currentFlowStage: "clarifying",
      }),
    );
    const flowService = createFlowService(projectService);

    const context = await flowService.abandonFlow("project-1");

    expect(projectService.updateProjectState).toHaveBeenCalledWith("project-1", {
      currentFlowStage: "abandoned",
      touchActivity: true,
    });
    expect(context.currentStage).toBe("abandoned");
  });

  it("resumes abandoned project to source_review", async () => {
    const projectService = createProjectServiceMock(
      createDetail({
        currentFlowStage: "abandoned",
      }),
    );
    const flowService = createFlowService(projectService);

    const result = await flowService.resumeFlow("project-1");

    expect(result).toEqual({
      currentStage: "abandoned",
      resumeStage: "source_review",
      resumedFromAbandoned: true,
    });
  });
});
