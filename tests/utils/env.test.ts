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
    });
  });

  it("关闭 AI Mock 时要求完整的中立模型配置", () => {
    expect(() =>
      getServerEnvironment({
        USE_MOCK_AI: "false",
      }),
    ).toThrow();
  });

  it("接受完整的 OpenAI-Compatible 环境配置", () => {
    const environment = getServerEnvironment({
      USE_MOCK_AI: "false",
      LLM_BASE_URL: "https://example.test/v1",
      LLM_API_KEY: "test-key",
      LLM_MODEL: "test-model",
      USE_MOCK_WEATHER: "true",
    });

    expect(environment).toMatchObject({
      LLM_BASE_URL: "https://example.test/v1",
      LLM_API_KEY: "test-key",
      LLM_MODEL: "test-model",
      USE_MOCK_AI: false,
      USE_MOCK_WEATHER: true,
    });
  });
});
