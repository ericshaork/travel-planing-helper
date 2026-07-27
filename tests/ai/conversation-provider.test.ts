import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createConversationAIProvider,
  createMockAIProvider,
} from "../../lib/ai/provider/provider";
import { OpenAICompatibleConversationProvider } from "../../lib/ai/provider/providers/openai-compatible-conversation-provider";

describe("conversation AI provider factory", () => {
  it("returns the mock provider when mock AI is enabled", () => {
    const provider = createConversationAIProvider({
      USE_MOCK_AI: true,
      USE_MOCK_POI: true,
      USE_MOCK_ROUTE: true,
      USE_MOCK_WEATHER: true,
      POI_PROVIDER: "mock",
      ROUTE_PROVIDER: "mock",
      WEATHER_PROVIDER: "mock",
      AI_TIMEOUT_MS: 120000,
      LLM_TIMEOUT_MS: 120000,
    });

    expect(provider.providerName).toBe(createMockAIProvider().providerName);
  });

  it("returns the real provider when qwen is configured", () => {
    const provider = createConversationAIProvider({
      USE_MOCK_AI: false,
      USE_MOCK_POI: true,
      USE_MOCK_ROUTE: true,
      USE_MOCK_WEATHER: true,
      POI_PROVIDER: "mock",
      ROUTE_PROVIDER: "mock",
      WEATHER_PROVIDER: "mock",
      AI_PROVIDER: "qwen",
      AI_BASE_URL: "https://example.test/v1",
      AI_API_KEY: "ai-key",
      AI_MODEL: "qwen-plus",
      AI_TIMEOUT_MS: 120000,
      LLM_TIMEOUT_MS: 120000,
    });

    expect(provider).toBeInstanceOf(OpenAICompatibleConversationProvider);
    expect(provider.providerName).toBe("qwen");
  });
});

describe("openai-compatible conversation provider", () => {
  it("parses structured JSON from a completion response", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                reply: "Tell me your pace and priorities.",
                intent: "destination_provided",
                action: "ask_question",
                nextStage: "clarifying",
                missingInfo: ["days", "pace"],
              }),
            },
          },
        ],
      }),
    });
    const provider = new OpenAICompatibleConversationProvider({
      providerName: "deepseek",
      baseUrl: "https://example.test/v1",
      apiKey: "ai-key",
      model: "deepseek-chat",
      fetcher,
    });

    const result = await provider.generateConversationResponse({
      message: "I want to go to Yunnan",
      systemPrompt: "system",
      userPrompt: "user",
      context: {
        project: {
          id: "project-1",
          userId: "user-1",
          title: "Trip",
          lifecycleState: "planning",
          currentFlowStage: "source_review",
          currentVersionId: null,
          lastActivityAt: "2026-07-23T00:00:00.000Z",
          createdAt: "2026-07-23T00:00:00.000Z",
          updatedAt: "2026-07-23T00:00:00.000Z",
        },
        currentStage: "source_review",
        recentMessages: [],
        sources: [],
      },
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      reply: "Tell me your pace and priorities.",
      intent: "destination_provided",
      action: "ask_question",
      nextStage: "clarifying",
      missingInfo: ["days", "pace"],
    });
  });
});
