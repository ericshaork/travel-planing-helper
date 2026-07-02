import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createLLMProvider } from "../../lib/ai/client";
import { MockLLMProvider } from "../../lib/ai/mock";
import { OpenAICompatibleProvider } from "../../lib/ai/openai-compatible";
import { getServerEnvironment } from "../../lib/utils/env";

describe("LLM provider selection", () => {
  it("USE_MOCK_AI=true 且没有 API Key 时选择 MockLLMProvider", () => {
    const environment = getServerEnvironment({
      USE_MOCK_AI: "true",
      USE_MOCK_WEATHER: "true",
    });

    expect(createLLMProvider(environment)).toBeInstanceOf(MockLLMProvider);
  });

  it("关闭 Mock 时选择中立的 OpenAICompatibleProvider", () => {
    const provider = createLLMProvider({
      LLM_BASE_URL: "https://example.test/v1",
      LLM_API_KEY: "test-key",
      LLM_MODEL: "test-model",
      USE_MOCK_AI: false,
      WEATHER_PROVIDER: "qweather",
      USE_MOCK_WEATHER: true,
    });

    expect(provider).toBeInstanceOf(OpenAICompatibleProvider);
  });
});
