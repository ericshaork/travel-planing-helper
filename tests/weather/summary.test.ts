import { describe, expect, it } from "vitest";

import {
  analyzeWeatherImpact,
  buildTripWeatherSummary,
} from "../../lib/weather/summary";
import type { WeatherForecast } from "../../lib/weather/types";

describe("weather summary helpers", () => {
  it("rain and heat impacts are derived from stable forecast data", () => {
    const forecast: WeatherForecast = {
      city: "\u53a6\u95e8",
      available: true,
      forecastDays: [
        {
          date: "2026-07-10",
          dayWeather: "\u9635\u96e8",
          tempMax: 35,
          tempMin: 27,
          precipitationProbability: 80,
          summary: "\u9635\u96e8\uff0c\u504f\u70ed",
        },
      ],
      alerts: [],
      warnings: [],
    };

    const impacts = analyzeWeatherImpact(forecast);

    expect(impacts.some((impact) => impact.type === "rain")).toBe(true);
    expect(
      impacts.some(
        (impact) => impact.type === "heat" && impact.level === "critical",
      ),
    ).toBe(true);
  });

  it("cold and wind impacts are derived when thresholds are met", () => {
    const forecast: WeatherForecast = {
      city: "\u676d\u5dde",
      available: true,
      forecastDays: [
        {
          date: "2026-12-03",
          dayWeather: "\u6674",
          tempMax: 9,
          tempMin: 3,
          wind: "\u4e1c\u5317\u98ce 6 \u7ea7",
          summary: "\u6674\uff0c\u504f\u51b7",
        },
      ],
      alerts: [],
      warnings: [],
    };

    const impacts = analyzeWeatherImpact(forecast);

    expect(impacts.some((impact) => impact.type === "cold")).toBe(true);
    expect(impacts.some((impact) => impact.type === "wind")).toBe(true);
  });

  it("unavailable forecast produces one info-level fallback impact", () => {
    const forecast: WeatherForecast = {
      city: "\u6210\u90fd",
      available: false,
      forecastDays: [],
      alerts: [],
      warnings: [
        "\u5929\u6c14\u63a5\u53e3\u521a\u521a\u6ca1\u63a5\u4e0a\uff0c\u5148\u6309\u4e0d\u542b\u5b9e\u65f6\u5929\u6c14\u7684\u65b9\u5f0f\u7ee7\u7eed\u3002",
      ],
    };

    const impacts = analyzeWeatherImpact(forecast);
    const summary = buildTripWeatherSummary(forecast);

    expect(impacts).toHaveLength(1);
    expect(impacts[0]?.type).toBe("unavailable");
    expect(impacts[0]?.level).toBe("info");
    expect(summary.available).toBe(false);
    expect(summary.daySummaries).toEqual([]);
  });

  it("buildTripWeatherSummary returns stable daily summaries", () => {
    const forecast: WeatherForecast = {
      city: "\u53a6\u95e8",
      available: true,
      forecastDays: [
        {
          date: "2026-07-10",
          dayWeather: "\u591a\u4e91",
          nightWeather: "\u6674",
          tempMax: 31,
          tempMin: 26,
          summary: "\u591a\u4e91\u8f6c\u6674",
        },
      ],
      alerts: [],
      warnings: [
        "\u5f53\u524d\u4f7f\u7528\u6f14\u793a\u5929\u6c14\uff0c\u4e0d\u4ee3\u8868\u5b9e\u65f6\u9884\u62a5\uff0c\u51fa\u53d1\u524d\u8bb0\u5f97\u518d\u786e\u8ba4\u3002",
      ],
    };

    const summary = buildTripWeatherSummary(forecast);

    expect(summary.available).toBe(true);
    expect(summary.overview).toContain("\u53a6\u95e8");
    expect(summary.daySummaries[0]).toMatchObject({
      date: "2026-07-10",
      weatherText: "\u591a\u4e91\uff0c\u591c\u95f4 \u6674",
      temperatureText: "26~31\u00b0C",
      summary: "\u591a\u4e91\u8f6c\u6674",
    });
    expect(summary.warnings).toHaveLength(1);
  });
});
