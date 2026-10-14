import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getServerEnvironment,
  resolveAiRuntimeConfig,
  shouldUseMockAi,
} from "../../lib/utils/env";

describe("server environment", () => {
  it("defaults to mock AI, POI, route, and weather", () => {
    const environment = getServerEnvironment({});

    expect(environment).toMatchObject({
      USE_MOCK_AI: true,
      USE_MOCK_POI: true,
      USE_MOCK_ROUTE: true,
      USE_MOCK_WEATHER: true,
      POI_PROVIDER: "mock",
      ROUTE_PROVIDER: "mock",
      WEATHER_PROVIDER: "mock",
    });
    expect(shouldUseMockAi(environment)).toBe(true);
    expect(resolveAiRuntimeConfig(environment).timeoutMs).toBe(120000);
  });

  it("accepts the new AI_* variables for real provider configuration", () => {
    const environment = getServerEnvironment({
      USE_MOCK_AI: "false",
      AI_PROVIDER: "qwen",
      AI_BASE_URL: "https://example.test/v1",
      AI_API_KEY: "ai-key",
      AI_MODEL: "qwen-plus",
      AI_TIMEOUT_MS: "180000",
    });

    expect(resolveAiRuntimeConfig(environment)).toEqual({
      providerName: "qwen",
      baseUrl: "https://example.test/v1",
      apiKey: "ai-key",
      model: "qwen-plus",
      timeoutMs: 180000,
    });
  });

  it("falls back to LLM_* variables when AI_* variables are not provided", () => {
    const environment = getServerEnvironment({
      USE_MOCK_AI: "false",
      LLM_BASE_URL: "https://example.test/v1",
      LLM_API_KEY: "llm-key",
      LLM_MODEL: "deepseek-chat",
    });

    expect(resolveAiRuntimeConfig(environment)).toEqual({
      providerName: "openai-compatible",
      baseUrl: "https://example.test/v1",
      apiKey: "llm-key",
      model: "deepseek-chat",
      timeoutMs: 120000,
    });
  });

  it("allows AI_PROVIDER=mock to keep mock mode even when USE_MOCK_AI=false", () => {
    const environment = getServerEnvironment({
      USE_MOCK_AI: "false",
      AI_PROVIDER: "mock",
    });

    expect(shouldUseMockAi(environment)).toBe(true);
    expect(resolveAiRuntimeConfig(environment)).toEqual({
      providerName: "mock",
      timeoutMs: 120000,
    });
  });

  it("throws a clear error when real AI is enabled without runtime config", () => {
    expect(() =>
      getServerEnvironment({
        USE_MOCK_AI: "false",
      }),
    ).toThrowError(/AI_BASE_URL|LLM_BASE_URL/);
  });
});
