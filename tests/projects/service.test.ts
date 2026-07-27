import { describe, expect, it, vi } from "vitest";

import { createProjectService } from "../../lib/projects/service";
import type {
  TravelProjectMessageRow,
  TravelProjectRow,
  TravelProjectSourceRow,
  TravelProjectVersionRow,
} from "../../lib/supabase/types";

function createProjectRow(overrides: Partial<TravelProjectRow> = {}): TravelProjectRow {
  return {
    id: "project-1",
    user_id: "user-1",
    title: "Chengdu 4 days",
    lifecycle_state: "planning",
    current_flow_stage: "clarifying",
    current_version_id: null,
    last_activity_at: "2026-07-23T00:00:00.000Z",
    created_at: "2026-07-23T00:00:00.000Z",
    updated_at: "2026-07-23T00:00:00.000Z",
    ...overrides,
  };
}

function createVersionRow(
  overrides: Partial<TravelProjectVersionRow> = {},
): TravelProjectVersionRow {
  return {
    id: "version-1",
    project_id: "project-1",
    version_number: 1,
    version_status: "accepted",
    created_from: "ai_generate",
    trip_plan_json: {
      tripTitle: "Chengdu 4 days",
      summary: "mock",
      destination: "Chengdu",
      days: 4,
      travelStyleSummary: "balanced",
      weatherSummary: {
        available: false,
        overview: "mock",
        dailyForecast: [],
        alerts: [],
        reminders: [],
        dataNote: "mock",
      },
      budgetSummary: {
        totalEstimate: "mock",
        transport: "mock",
        hotel: "mock",
        food: "mock",
        tickets: "mock",
        localTransport: "mock",
        flexibleSpending: "mock",
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
      dailyItinerary: [
        {
          day: 1,
          theme: "mock",
          routeOrder: ["mock"],
          routeReason: "mock",
          morning: [],
          afternoon: [],
          evening: [],
          dailyTips: [],
        },
        {
          day: 2,
          theme: "mock",
          routeOrder: ["mock"],
          routeReason: "mock",
          morning: [],
          afternoon: [],
          evening: [],
          dailyTips: [],
        },
        {
          day: 3,
          theme: "mock",
          routeOrder: ["mock"],
          routeReason: "mock",
          morning: [],
          afternoon: [],
          evening: [],
          dailyTips: [],
        },
        {
          day: 4,
          theme: "mock",
          routeOrder: ["mock"],
          routeReason: "mock",
          morning: [],
          afternoon: [],
          evening: [],
          dailyTips: [],
        },
      ],
      generalTips: [],
      warnings: [],
    },
    trip_request_snapshot_json: {
      departureCity: "Shenzhen",
      destinationCity: "Chengdu",
      days: 4,
      budget: 3000,
      currency: "CNY",
      interests: ["food"],
      travelStyles: ["balanced"],
      mustVisitPlaces: [],
      avoidPlaces: [],
    },
    proposal_summary_json: null,
    created_by: "assistant",
    created_at: "2026-07-23T00:00:00.000Z",
    updated_at: "2026-07-23T00:00:00.000Z",
    ...overrides,
  };
}

function createSourceRow(
  overrides: Partial<TravelProjectSourceRow> = {},
): TravelProjectSourceRow {
  return {
    id: "source-1",
    project_id: "project-1",
    source_type: "blank_input",
    source_title: "Idea",
    source_payload_json: {},
    created_at: "2026-07-23T00:00:00.000Z",
    updated_at: "2026-07-23T00:00:00.000Z",
    ...overrides,
  };
}

function createMessageRow(
  overrides: Partial<TravelProjectMessageRow> = {},
): TravelProjectMessageRow {
  return {
    id: "message-1",
    project_id: "project-1",
    role: "user",
    content: "I want to go to Chengdu",
    created_at: "2026-07-23T00:00:00.000Z",
    ...overrides,
  };
}

describe("project service", () => {
  it("creates project and initial source together", async () => {
    const repository = {
      insertProject: vi.fn().mockResolvedValue(createProjectRow()),
      insertSource: vi.fn().mockResolvedValue(createSourceRow()),
      getProjectById: vi.fn(),
      updateProjectState: vi.fn(),
      insertVersion: vi.fn(),
      listVersions: vi.fn(),
      getVersionById: vi.fn(),
      listSources: vi.fn(),
      insertMessage: vi.fn(),
      listMessages: vi.fn(),
    };
    const service = createProjectService(repository as never);

    const project = await service.createProject("user-1", {
      title: "Chengdu 4 days",
      sourceType: "blank_input",
      initialMetadata: {
        lifecycleState: "planning",
        flowStage: "source_received",
        sourceTitle: "Idea",
        sourcePayload: {
          rawText: "I want to go to Chengdu",
        },
      },
    });

    expect(repository.insertProject).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        title: "Chengdu 4 days",
        lifecycle_state: "planning",
        current_flow_stage: "source_received",
      }),
    );
    expect(repository.insertSource).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: "project-1",
        source_type: "blank_input",
        source_title: "Idea",
      }),
    );
    expect(project.id).toBe("project-1");
  });

  it("increments version_number correctly and sets current version", async () => {
    const repository = {
      getProjectById: vi.fn().mockResolvedValue(createProjectRow()),
      listVersions: vi
        .fn()
        .mockResolvedValue([createVersionRow({ version_number: 2, id: "version-2" })]),
      insertVersion: vi
        .fn()
        .mockResolvedValue(createVersionRow({ id: "version-3", version_number: 3 })),
      updateProjectState: vi.fn().mockResolvedValue(
        createProjectRow({
          current_version_id: "version-3",
        }),
      ),
      insertProject: vi.fn(),
      getVersionById: vi.fn(),
      insertSource: vi.fn(),
      listSources: vi.fn(),
      insertMessage: vi.fn(),
      listMessages: vi.fn(),
    };
    const service = createProjectService(repository as never);

    const version = await service.createProjectVersion("project-1", {
      tripPlan: createVersionRow().trip_plan_json as never,
      tripRequestSnapshot: createVersionRow().trip_request_snapshot_json as never,
      createdFrom: "ai_adjust",
      setAsCurrent: true,
    });

    expect(repository.insertVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: "project-1",
        version_number: 3,
        created_from: "ai_adjust",
      }),
    );
    expect(repository.updateProjectState).toHaveBeenCalledWith(
      "project-1",
      expect.objectContaining({
        current_version_id: "version-3",
      }),
    );
    expect(version.versionNumber).toBe(3);
  });

  it("appends message and updates project activity", async () => {
    const repository = {
      insertMessage: vi.fn().mockResolvedValue(createMessageRow()),
      updateProjectState: vi.fn().mockResolvedValue(createProjectRow()),
      insertProject: vi.fn(),
      getProjectById: vi.fn(),
      insertSource: vi.fn(),
      listVersions: vi.fn(),
      insertVersion: vi.fn(),
      getVersionById: vi.fn(),
      listSources: vi.fn(),
      listMessages: vi.fn(),
    };
    const service = createProjectService(repository as never);

    const message = await service.appendProjectMessage("project-1", {
      role: "user",
      content: "Add more food spots",
    });

    expect(repository.insertMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: "project-1",
        role: "user",
        content: "Add more food spots",
      }),
    );
    expect(repository.updateProjectState).toHaveBeenCalledWith(
      "project-1",
      expect.objectContaining({
        last_activity_at: expect.any(String),
      }),
    );
    expect(message.content).toBe("I want to go to Chengdu");
  });
});
