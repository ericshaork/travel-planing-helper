import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getServerEnvironment } from "../../lib/utils/env";

describe("server environment", () => {
  it("默认启用彼此独立的 AI、POI、Route 和天气 Mock", () => {
    const environment = getServerEnvironment({});

    expect(environment).toMatchObject({
      USE_MOCK_AI: true,
      USE_MOCK_POI: true,
      USE_MOCK_ROUTE: true,
      USE_MOCK_WEATHER: true,
      POI_PROVIDER: "mock",
      ROUTE_PROVIDER: "mock",
      WEATHER_PROVIDER: "mock",
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
      USE_MOCK_POI: "false",
      USE_MOCK_ROUTE: "false",
      USE_MOCK_WEATHER: "false",
      POI_PROVIDER: "amap",
      ROUTE_PROVIDER: "amap",
      WEATHER_PROVIDER: "qweather",
      AMAP_API_KEY: "amap-key",
      QWEATHER_API_KEY: "qweather-key",
    });

    expect(environment).toMatchObject({
      LLM_BASE_URL: "https://example.test/v1",
      LLM_API_KEY: "test-key",
      LLM_MODEL: "qwen-plus",
      LLM_TIMEOUT_MS: 180000,
      USE_MOCK_AI: false,
      USE_MOCK_POI: false,
      USE_MOCK_ROUTE: false,
      USE_MOCK_WEATHER: false,
      POI_PROVIDER: "amap",
      ROUTE_PROVIDER: "amap",
      WEATHER_PROVIDER: "qweather",
      AMAP_API_KEY: "amap-key",
      QWEATHER_API_KEY: "qweather-key",
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

  it("mock 模式下不要求真实高德和天气 Key", () => {
    const environment = getServerEnvironment({
      USE_MOCK_POI: "true",
      USE_MOCK_ROUTE: "true",
      USE_MOCK_WEATHER: "true",
      POI_PROVIDER: "mock",
      ROUTE_PROVIDER: "mock",
      WEATHER_PROVIDER: "mock",
    });

    expect(environment.AMAP_API_KEY).toBeUndefined();
    expect(environment.QWEATHER_API_KEY).toBeUndefined();
    expect(environment.USE_MOCK_POI).toBe(true);
    expect(environment.USE_MOCK_ROUTE).toBe(true);
    expect(environment.USE_MOCK_WEATHER).toBe(true);
  });
});
