import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createProjectProposalPostHandler } from "../app/api/projects/[projectId]/proposal/route";
import { createFlowService } from "../lib/projects/flow/flow-service";
import { createProposalService } from "../lib/projects/proposal/proposal-service";
import { cloneDefaultUserSettings } from "../lib/settings/defaults";
import type { ProjectService } from "../lib/projects/service";
import type {
  TravelProject,
  TravelProjectMessage,
  TravelProjectSource,
  TravelProjectVersion,
} from "../lib/projects/types";

function createProject(overrides: Partial<TravelProject> = {}): TravelProject {
  return {
    id: "project-1",
    userId: "user-1",
    title: "Yunnan idea",
    lifecycleState: "planning",
    currentFlowStage: "proposal_ready",
    currentVersionId: null,
    lastActivityAt: "2026-07-23T00:00:00.000Z",
    createdAt: "2026-07-23T00:00:00.000Z",
    updatedAt: "2026-07-23T00:00:00.000Z",
    ...overrides,
  };
}

function createProjectServiceMock(): ProjectService & {
  readProject(): TravelProject;
} {
  let project = createProject();
  const sources: TravelProjectSource[] = [
    {
      id: "source-1",
      projectId: "project-1",
      sourceType: "blank_input",
      title: "Initial idea",
      payload: {
        rawInput: "I want to go to Yunnan for 5 days",
        parseResult: {
          parsed: {
            departureCity: "Shenzhen",
            destinationCity: "Yunnan",
            days: 5,
            budget: 6000,
            interests: ["food"],
            travelStyles: ["relaxed"],
          },
        },
      },
      createdAt: "2026-07-23T00:00:00.000Z",
      updatedAt: "2026-07-23T00:00:00.000Z",
    },
  ];
  const messages: TravelProjectMessage[] = [
    {
      id: "message-1",
      projectId: "project-1",
      role: "user",
      content: "I want a relaxed food trip and my budget is 6000.",
      createdAt: "2026-07-23T00:00:00.000Z",
    },
  ];
  const versions: TravelProjectVersion[] = [];

  return {
    createProject: vi.fn(),
    getProject: vi.fn().mockImplementation(async (projectId: string) => {
      if (projectId !== project.id) {
        return null;
      }

      return {
        project,
        currentVersion: versions.at(-1) ?? null,
        sources,
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
        ...(input.touchActivity
          ? { lastActivityAt: "2026-07-23T01:00:00.000Z" }
          : {}),
      };

      return project;
    }),
    createProjectVersion: vi.fn().mockImplementation(async (_projectId, input) => {
      const version: TravelProjectVersion = {
        id: `version-${versions.length + 1}`,
        projectId: "project-1",
        versionNumber: versions.length + 1,
        versionStatus: input.versionStatus ?? "accepted",
        createdFrom: input.createdFrom ?? null,
        tripPlan: input.tripPlan,
        tripRequestSnapshot: input.tripRequestSnapshot ?? null,
        createdAt: "2026-07-23T00:00:00.000Z",
        updatedAt: "2026-07-23T00:00:00.000Z",
      };
      versions.push(version);
      return version;
    }),
    listProjectVersions: vi.fn().mockResolvedValue(versions),
    getProjectVersion: vi.fn(),
    addProjectSource: vi.fn(),
    listProjectSources: vi.fn().mockResolvedValue(sources),
    appendProjectMessage: vi.fn(),
    listProjectMessages: vi.fn().mockResolvedValue(messages),
    readProject: () => project,
  };
}

describe("proposal service", () => {
  it("moves proposal_ready into generating and creates an accepted version", async () => {
    const projectService = createProjectServiceMock();
    const flowService = createFlowService(projectService);
    const planner = vi.fn().mockResolvedValue({
      tripPlan: {
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
      },
    });
    const service = createProposalService(projectService, flowService, {
      planner: planner as never,
    });

    const result = await service.generateFromProposal("project-1");

    expect(planner).toHaveBeenCalledTimes(1);
    expect(result.tripRequest.destinationCity).toBe("Yunnan");
    expect(result.versionId).toBe("version-1");
    expect(projectService.readProject().currentFlowStage).toBe("workspace_ready");
  });

  it("moves proposal_ready back to proposal_adjusting", async () => {
    const projectService = createProjectServiceMock();
    const flowService = createFlowService(projectService);
    const service = createProposalService(projectService, flowService);

    await service.markProposalAdjusting("project-1");

    expect(projectService.readProject().currentFlowStage).toBe("proposal_adjusting");
  });
});

describe("proposal route", () => {
  it("continues generation with default settings when user settings fail to load", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: new Error("user_settings unavailable"),
    });
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ maybeSingle }),
        }),
      }),
    };
    let resolvedSettings: unknown;
    const mockProposalService = {
      createProposal: vi.fn(),
      markProposalAdjusting: vi.fn(),
      generateFromProposal: vi.fn(async () => {
        resolvedSettings = await dependencies.resolveUserSettings();
        return {
          proposal: null,
          tripRequest: null,
          tripPlan: null,
          versionId: "version-1",
        };
      }),
    };
    const dependencies = {
      resolveUserSettings: async () => null as unknown,
    };
    const createProposal = vi.fn(
      (
        _projectService: unknown,
        _flowService: unknown,
        routeDependencies: typeof dependencies,
      ) => {
        dependencies.resolveUserSettings = routeDependencies.resolveUserSettings;
        return mockProposalService;
      },
    );
    const POST = createProjectProposalPostHandler(
      () => client as never,
      createProposal as never,
    );

    const response = await POST(
      new Request("http://localhost/api/projects/project-1/proposal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token-123",
        },
        body: JSON.stringify({ action: "generate" }),
      }),
      { params: Promise.resolve({ projectId: "project-1" }) },
    );

    expect(response.status).toBe(200);
    expect(resolvedSettings).toEqual(cloneDefaultUserSettings());
  });

  it("returns workspace-ready payload after generation", async () => {
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: vi.fn(),
    };
    const mockProposalService = {
      createProposal: vi.fn(),
      markProposalAdjusting: vi.fn(),
      generateFromProposal: vi.fn().mockResolvedValue({
        proposal: {
          destination: "Yunnan",
          duration: {
            days: 5,
          },
          preferences: ["food"],
          highlights: ["Yunnan"],
          notes: [],
        },
        tripRequest: {
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
        tripPlan: {
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
        },
        versionReason: "ai_generate",
        versionId: "version-1",
      }),
    };
    const POST = createProjectProposalPostHandler(
      () => client as never,
      (() => mockProposalService) as never,
    );

    const response = await POST(
      new Request("http://localhost/api/projects/project-1/proposal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token-123",
        },
        body: JSON.stringify({
          action: "generate",
        }),
      }),
      {
        params: Promise.resolve({
          projectId: "project-1",
        }),
      },
    );
    const payload = (await response.json()) as {
      versionId: string;
      stage: string;
    };

    expect(response.status).toBe(200);
    expect(payload.versionId).toBe("version-1");
    expect(payload.stage).toBe("workspace_ready");
  });
});
