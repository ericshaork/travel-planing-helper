import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createCopilotService } from "../../lib/projects/copilot/copilot-service";
import { createConversationService } from "../../lib/projects/conversation/conversation-service";
import { canTransition } from "../../lib/projects/flow/flow-transition";
import { createFlowService } from "../../lib/projects/flow/flow-service";
import type { ProjectService } from "../../lib/projects/service";
import type {
  TravelProject,
  TravelProjectMessage,
  TravelProjectSource,
} from "../../lib/projects/types";

function createProject(
  overrides: Partial<TravelProject> = {},
): TravelProject {
  return {
    id: "project-1",
    userId: "user-1",
    title: "AI flow validation project",
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
    title: "Initial idea",
    payload: {
      rawText: "seed idea",
    },
    createdAt: "2026-07-23T00:00:00.000Z",
    updatedAt: "2026-07-23T00:00:00.000Z",
    ...overrides,
  };
}

function createInMemoryProjectService(options?: {
  projectOverrides?: Partial<TravelProject>;
  sources?: TravelProjectSource[];
  messages?: TravelProjectMessage[];
}): ProjectService & {
  readProject(): TravelProject;
  readMessages(): TravelProjectMessage[];
  readSources(): TravelProjectSource[];
} {
  let project = createProject(options?.projectOverrides);
  let messages = [...(options?.messages ?? [])];
  const sources = [...(options?.sources ?? [createSource()])];

  return {
    createProject: vi.fn(),
    getProject: vi.fn().mockImplementation(async (projectId: string) => {
      if (projectId !== project.id) {
        return null;
      }

      return {
        project,
        currentVersion: null,
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
    createProjectVersion: vi.fn(),
    listProjectVersions: vi.fn(),
    getProjectVersion: vi.fn(),
    addProjectSource: vi.fn(),
    listProjectSources: vi.fn(),
    appendProjectMessage: vi.fn().mockImplementation(async (_projectId, input) => {
      const message: TravelProjectMessage = {
        id: `message-${messages.length + 1}`,
        projectId: project.id,
        role: input.role,
        content: input.content,
        createdAt: `2026-07-23T00:00:0${messages.length}.000Z`,
      };
      messages = [...messages, message];
      return message;
    }),
    listProjectMessages: vi.fn().mockImplementation(async (_projectId, options) => {
      if (!options?.limit) {
        return messages;
      }

      return messages.slice(-options.limit);
    }),
    readProject: () => project,
    readMessages: () => messages,
    readSources: () => sources,
  };
}

describe("AI flow end-to-end", () => {
  it("scenario 1: keeps planning alive when the user does not know the destination", async () => {
    const projectService = createInMemoryProjectService();
    const flowService = createFlowService(projectService);
    const provider = {
      providerName: "test-provider",
      generateConversationResponse: vi.fn().mockResolvedValue({
        reply:
          "Tell me whether you want food, scenery, culture, or a relaxed trip first.",
        intent: "unknown_destination",
        action: "ask_question",
        nextStage: null,
        missingInfo: ["destination_preference", "budget_or_trip_style"],
      }),
    };
    const conversationService = createConversationService(provider);
    const copilotService = createCopilotService(
      projectService,
      flowService,
      conversationService,
    );

    const result = await copilotService.handleMessage(
      "project-1",
      "I do not know where to go",
    );

    expect(provider.generateConversationResponse).toHaveBeenCalledTimes(1);
    expect(projectService.readProject().id).toBe("project-1");
    expect(projectService.readProject().currentFlowStage).toBe("source_review");
    expect(projectService.readMessages()).toHaveLength(2);
    expect(projectService.readMessages()[0]).toMatchObject({
      role: "user",
      content: "I do not know where to go",
    });
    expect(projectService.readMessages()[1]).toMatchObject({
      role: "assistant",
      content:
        "Tell me whether you want food, scenery, culture, or a relaxed trip first.",
    });
    expect(result).toEqual({
      success: true,
      projectId: "project-1",
      stage: "source_review",
      reply:
        "Tell me whether you want food, scenery, culture, or a relaxed trip first.",
    });
  });

  it("scenario 2: detects destination input and moves the flow into clarifying", async () => {
    const projectService = createInMemoryProjectService();
    const flowService = createFlowService(projectService);
    const provider = {
      providerName: "test-provider",
      generateConversationResponse: vi.fn().mockResolvedValue({
        reply: "Great, Yunnan works. Tell me your pace, budget, and top priorities.",
        intent: "destination_provided",
        action: "ask_question",
        nextStage: "clarifying",
        missingInfo: ["budget", "pace", "priorities"],
      }),
    };
    const conversationService = createConversationService(provider);
    const copilotService = createCopilotService(
      projectService,
      flowService,
      conversationService,
    );

    const result = await copilotService.handleMessage(
      "project-1",
      "I want to go to Yunnan for 5 days",
    );

    expect(projectService.readProject().currentFlowStage).toBe("clarifying");
    expect(projectService.readMessages()).toHaveLength(2);
    expect(projectService.readMessages()[1].content).toContain("Yunnan");
    expect(result.stage).toBe("clarifying");
    expect(provider.generateConversationResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "I want to go to Yunnan for 5 days",
      }),
    );
  });

  it("scenario 3: reaches proposal_ready when enough planning information exists", async () => {
    const projectService = createInMemoryProjectService({
      projectOverrides: {
        currentFlowStage: "clarifying",
      },
      messages: [
        {
          id: "message-seed-1",
          projectId: "project-1",
          role: "user",
          content: "I want to go to Yunnan for 5 days",
          createdAt: "2026-07-23T00:00:00.000Z",
        },
        {
          id: "message-seed-2",
          projectId: "project-1",
          role: "assistant",
          content: "Tell me your budget and preferred pace.",
          createdAt: "2026-07-23T00:00:01.000Z",
        },
      ],
    });
    const flowService = createFlowService(projectService);
    const provider = {
      providerName: "test-provider",
      generateConversationResponse: vi.fn().mockResolvedValue({
        reply: "I have enough to draft a proposal now.",
        intent: "ready_for_proposal",
        action: "create_proposal",
        nextStage: "proposal_ready",
        missingInfo: [],
      }),
    };
    const conversationService = createConversationService(provider);
    const copilotService = createCopilotService(
      projectService,
      flowService,
      conversationService,
    );

    const result = await copilotService.handleMessage(
      "project-1",
      "Budget is 6000 and I want a relaxed food-focused trip.",
    );

    expect(projectService.readProject().currentFlowStage).toBe("proposal_ready");
    expect(projectService.readMessages()).toHaveLength(4);
    expect(projectService.readMessages()[3]).toMatchObject({
      role: "assistant",
      content: "I have enough to draft a proposal now.",
    });
    expect(result.stage).toBe("proposal_ready");
  });

  it("scenario 4: falls back safely when the AI provider fails", async () => {
    const projectService = createInMemoryProjectService();
    const flowService = createFlowService(projectService);
    const provider = {
      providerName: "failing-provider",
      generateConversationResponse: vi
        .fn()
        .mockRejectedValue(new Error("provider offline")),
    };
    const conversationService = createConversationService(provider);
    const copilotService = createCopilotService(
      projectService,
      flowService,
      conversationService,
    );

    const result = await copilotService.handleMessage(
      "project-1",
      "I do not know where to go",
    );

    expect(projectService.readProject().currentFlowStage).toBe("source_review");
    expect(projectService.readMessages()).toHaveLength(2);
    expect(projectService.readMessages()[1].role).toBe("assistant");
    expect(result.stage).toBe("source_review");
    expect(result.reply.length).toBeGreaterThan(0);
  });
});

describe("AI flow transition coverage", () => {
  it.each([
    ["source_review", "clarifying"],
    ["clarifying", "proposal_ready"],
    ["clarifying", "generating"],
    ["proposal_ready", "proposal_adjusting"],
    ["proposal_adjusting", "proposal_ready"],
    ["proposal_adjusting", "generating"],
    ["generating", "workspace_ready"],
    ["source_review", "abandoned"],
    ["proposal_ready", "abandoned"],
  ] as const)("allows %s -> %s", (from, to) => {
    expect(canTransition(from, to)).toEqual({
      ok: true,
      from,
      to,
    });
  });

  it.each([
    ["source_review", "workspace_ready"],
    ["workspace_ready", "clarifying"],
    ["abandoned", "source_review"],
  ] as const)("rejects illegal transition %s -> %s", (from, to) => {
    expect(canTransition(from, to)).toEqual({
      ok: false,
      from,
      to,
      reason: `Illegal flow transition: ${from} -> ${to}`,
    });
  });
});
