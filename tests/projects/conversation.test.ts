import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createConversationContext } from "../../lib/projects/conversation/conversation-context";
import { aiConversationResponseSchema } from "../../lib/projects/conversation/ai-response-schema";
import { createConversationService } from "../../lib/projects/conversation/conversation-service";
import { buildUserPreferenceContext } from "../../lib/ai/user-preference-context";
import { cloneDefaultUserSettings } from "../../lib/settings/defaults";
import type { TravelProject } from "../../lib/projects/types";

function createProject(
  overrides: Partial<TravelProject> = {},
): TravelProject {
  return {
    id: "project-1",
    userId: "user-1",
    title: "Travel project",
    lifecycleState: "planning",
    currentFlowStage: "source_review",
    currentVersionId: null,
    lastActivityAt: "2026-07-23T00:00:00.000Z",
    createdAt: "2026-07-23T00:00:00.000Z",
    updatedAt: "2026-07-23T00:00:00.000Z",
    ...overrides,
  };
}

describe("conversation response schema", () => {
  it("validates a structured AI response", () => {
    const parsed = aiConversationResponseSchema.parse({
      reply: "Tell me what kind of trip mood you want first.",
      intent: "unknown_destination",
      action: "ask_question",
      nextStage: "source_review",
      missingInfo: ["destination_preference"],
    });

    expect(parsed.intent).toBe("unknown_destination");
    expect(parsed.missingInfo).toEqual(["destination_preference"]);
  });
});

describe("conversation service", () => {
  it("uses provider output when the structured response is valid", async () => {
    const provider = {
      providerName: "test-provider",
      generateConversationResponse: vi.fn().mockResolvedValue({
        reply: "Structured reply from provider.",
        intent: "destination_provided",
        action: "ask_question",
        nextStage: "clarifying",
        missingInfo: ["days", "pace"],
      }),
    };
    const service = createConversationService(provider);
    const context = createConversationContext({
      project: createProject(),
      currentStage: "source_review",
    });

    const result = await service.processMessage("I want to go to Yunnan", context);

    expect(provider.generateConversationResponse).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      reply: "Structured reply from provider.",
      intent: "destination_provided",
      action: "ask_question",
      nextStage: "clarifying",
      missingInfo: ["days", "pace"],
    });
  });

  it("falls back to rule logic when provider output is invalid", async () => {
    const provider = {
      providerName: "broken-provider",
      generateConversationResponse: vi.fn().mockResolvedValue({
        reply: "",
        intent: "destination_provided",
      }),
    };
    const service = createConversationService(provider);
    const context = createConversationContext({
      project: createProject(),
      currentStage: "source_review",
    });

    const result = await service.processMessage("I do not know where to go", context);

    expect(result.intent).toBe("unknown_destination");
    expect(result.action).toBe("ask_question");
    expect(result.nextStage).toBeNull();
    expect(result.missingInfo).toEqual([
      "destination_preference",
      "budget_or_trip_style",
    ]);
  });

  it("creates proposal guidance when planning info is already sufficient", async () => {
    const service = createConversationService({
      providerName: "throwing-provider",
      generateConversationResponse: vi.fn().mockRejectedValue(new Error("offline")),
    });
    const context = createConversationContext({
      project: createProject({
        currentFlowStage: "clarifying",
      }),
      currentStage: "clarifying",
    });

    const result = await service.processMessage(
      "I want to go to Yunnan for 4 days and focus on food with a relaxed pace",
      context,
    );

    expect(result.intent).toBe("ready_for_proposal");
    expect(result.action).toBe("create_proposal");
    expect(result.nextStage).toBe("proposal_ready");
    expect(result.missingInfo).toEqual([]);
  });

  it("passes long-term user preference context to the provider input", async () => {
    const provider = {
      providerName: "test-provider",
      generateConversationResponse: vi.fn().mockResolvedValue({
        reply: "Structured reply from provider.",
        intent: "preference_collection",
        action: "continue_chat",
        nextStage: null,
        missingInfo: ["preferences"],
      }),
    };
    const service = createConversationService(provider);
    const context = createConversationContext({
      project: createProject(),
      currentStage: "source_review",
      userPreferenceContext: buildUserPreferenceContext(cloneDefaultUserSettings()),
    });

    await service.processMessage("Plan me a slower culture trip", context);

    expect(provider.generateConversationResponse).toHaveBeenCalledTimes(1);
    expect(provider.generateConversationResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({
          userPreferenceContext: expect.objectContaining({
            source: "user_settings",
            summary: expect.stringContaining("长期偏好"),
          }),
        }),
      }),
    );
  });
});
