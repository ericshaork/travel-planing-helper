import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getServerEnvironment } from "../../lib/utils/env";

describe("server environment", () => {
  it("默认启用相互独立的 AI 和天气 Mock", () => {
    const environment = getServerEnvironment({});

    expect(environment).toMatchObject({
      USE_MOCK_AI: true,
      WEATHER_PROVIDER: "qweather",
      USE_MOCK_WEATHER: true,
      LLM_TIMEOUT_MS: 120000,
    });
  });

  it("关闭 AI Mock 时要求完整的中立模型配置", () => {
    expect(() =>
      getServerEnvironment({
        USE_MOCK_AI: "false",
      }),
    ).toThrowError(/LLM_BASE_URL/);
  });

  it("接受完整的 OpenAI-Compatible 环境配置", () => {
    const environment = getServerEnvironment({
      USE_MOCK_AI: "false",
      LLM_BASE_URL: "https://example.test/v1",
      LLM_API_KEY: "test-key",
      LLM_MODEL: "qwen-plus",
      LLM_TIMEOUT_MS: "180000",
      USE_MOCK_WEATHER: "true",
    });

    expect(environment).toMatchObject({
      LLM_BASE_URL: "https://example.test/v1",
      LLM_API_KEY: "test-key",
      LLM_MODEL: "qwen-plus",
      LLM_TIMEOUT_MS: 180000,
      USE_MOCK_AI: false,
      USE_MOCK_WEATHER: true,
    });
  });

  it("LLM_BASE_URL 格式错误时会给出单独提示", () => {
    expect(() =>
      getServerEnvironment({
        USE_MOCK_AI: "false",
        LLM_BASE_URL: "not-a-url",
        LLM_API_KEY: "test-key",
        LLM_MODEL: "qwen-plus",
        USE_MOCK_WEATHER: "true",
      }),
    ).toThrowError(/OpenAI-compatible Base URL/);
  });

  it("非法 LLM_TIMEOUT_MS 会回退到安全默认值", () => {
    const environment = getServerEnvironment({
      LLM_TIMEOUT_MS: "abc",
    });

    expect(environment.LLM_TIMEOUT_MS).toBe(120000);
  });
});
