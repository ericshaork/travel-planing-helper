import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createWeatherProvider,
  getWeatherForecast,
} from "../../lib/weather/client";
import { MockWeatherProvider } from "../../lib/weather/mock";
import type { WeatherProvider } from "../../lib/weather/provider";
import { QWeatherProvider } from "../../lib/weather/qweather";
import { weatherForecastSchema } from "../../lib/trip/schema";
import { getServerEnvironment } from "../../lib/utils/env";

describe("Weather provider selection", () => {
  it.each([
    {
      name: "USE_MOCK_WEATHER=true",
      source: {
        USE_MOCK_WEATHER: "true",
        WEATHER_PROVIDER: "qweather",
      },
      provider: MockWeatherProvider,
    },
    {
      name: "WEATHER_PROVIDER=mock",
      source: {
        USE_MOCK_WEATHER: "false",
        WEATHER_PROVIDER: "mock",
      },
      provider: MockWeatherProvider,
    },
    {
      name: "WEATHER_PROVIDER=qweather",
      source: {
        USE_MOCK_WEATHER: "false",
        WEATHER_PROVIDER: "qweather",
        QWEATHER_API_KEY: "weather-token",
      },
      provider: QWeatherProvider,
    },
  ])("$name 可以独立选择天气 Provider", ({ source, provider }) => {
    const environment = getServerEnvironment(source);

    expect(createWeatherProvider(environment)).toBeInstanceOf(provider);
  });

  it("真实天气模式缺少 Key 时给出明确配置错误", () => {
    const environment = getServerEnvironment({
      USE_MOCK_WEATHER: "false",
      WEATHER_PROVIDER: "qweather",
    });

    expect(() => createWeatherProvider(environment)).toThrowError(
      /QWEATHER_API_KEY/,
    );
  });

  it("任意 Provider 抛错都会降级为 warning", async () => {
    const failingProvider: WeatherProvider = {
      async getForecast() {
        throw new Error("secret upstream error");
      },
    };

    const forecast = await getWeatherForecast(
      {
        city: "成都",
        days: 4,
      },
      failingProvider,
    );

    expect(weatherForecastSchema.safeParse(forecast).success).toBe(true);
    expect(forecast.available).toBe(false);
    expect(forecast.warnings.join("")).not.toContain("secret upstream error");
  });

  it.each([
    {
      name: "空城市",
      input: { city: "", days: 3 },
    },
    {
      name: "days 为 0",
      input: { city: "厦门", days: 0 },
    },
    {
      name: "days 为负数",
      input: { city: "厦门", days: -2 },
    },
    {
      name: "缺少目的地",
      input: { days: 3 },
    },
    {
      name: "缺少整个 WeatherQuery",
      input: undefined,
    },
  ])("$name 时 client 返回降级结果", async ({ input }) => {
    const forecast = await getWeatherForecast(
      input,
      new MockWeatherProvider(),
    );

    expect(weatherForecastSchema.safeParse(forecast).success).toBe(true);
    expect(forecast.available).toBe(false);
    expect(forecast.forecastDays).toEqual([]);
    expect(forecast.warnings.join("")).toContain("天气查询信息还不完整");
  });
});
