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

  it("关闭 Mock 时选择 OpenAICompatibleProvider 并带上 timeout", () => {
    const provider = createLLMProvider({
      LLM_BASE_URL: "https://example.test/v1",
      LLM_API_KEY: "test-key",
      LLM_MODEL: "qwen-plus",
      LLM_TIMEOUT_MS: 180000,
      USE_MOCK_AI: false,
      WEATHER_PROVIDER: "qweather",
      USE_MOCK_WEATHER: true,
    });

    expect(provider).toBeInstanceOf(OpenAICompatibleProvider);
    expect(
      (provider as OpenAICompatibleProvider).getTimeoutMs(),
    ).toBe(180000);
  });

  it("真实模式缺少 LLM_BASE_URL 时给出明确错误", () => {
    expect(() =>
      getServerEnvironment({
        USE_MOCK_AI: "false",
        LLM_API_KEY: "test-key",
        LLM_MODEL: "qwen-plus",
        USE_MOCK_WEATHER: "true",
      }),
    ).toThrowError(/LLM_BASE_URL/);
  });

  it("真实模式缺少 LLM_API_KEY 时给出明确错误", () => {
    expect(() =>
      getServerEnvironment({
        USE_MOCK_AI: "false",
        LLM_BASE_URL: "https://example.test/v1",
        LLM_MODEL: "qwen-plus",
        USE_MOCK_WEATHER: "true",
      }),
    ).toThrowError(/LLM_API_KEY/);
  });

  it("真实模式缺少 LLM_MODEL 时给出明确错误", () => {
    expect(() =>
      getServerEnvironment({
        USE_MOCK_AI: "false",
        LLM_BASE_URL: "https://example.test/v1",
        LLM_API_KEY: "test-key",
        USE_MOCK_WEATHER: "true",
      }),
    ).toThrowError(/LLM_MODEL/);
  });
});
