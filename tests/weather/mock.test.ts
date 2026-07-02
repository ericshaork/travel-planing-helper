import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { weatherForecastSchema } from "../../lib/trip/schema";
import { MockWeatherProvider } from "../../lib/weather/mock";

const now = new Date("2026-07-02T00:00:00.000Z");

describe("MockWeatherProvider", () => {
  it("正常天气返回符合正式 Schema 的逐日预报", async () => {
    const provider = new MockWeatherProvider({ now });
    const forecast = await provider.getForecast({
      city: "厦门",
      startDate: "2026-07-10",
      endDate: "2026-07-12",
      days: 3,
    });

    expect(weatherForecastSchema.safeParse(forecast).success).toBe(true);
    expect(forecast.available).toBe(true);
    expect(forecast.forecastDays).toHaveLength(3);
    expect(forecast.warnings.join("")).toContain("演示天气");
  });

  it("降雨场景提供提醒和雨天数据", async () => {
    const provider = new MockWeatherProvider({ scenario: "rain", now });
    const forecast = await provider.getForecast({
      city: "厦门",
      startDate: "2026-07-10",
      endDate: "2026-07-12",
      days: 3,
    });

    expect(forecast.available).toBe(true);
    expect(forecast.alerts[0]?.title).toBe("降雨提醒");
    expect(
      forecast.forecastDays.some(
        (day) => (day.precipitationProbability ?? 0) >= 80,
      ),
    ).toBe(true);
  });

  it("天气不可用场景只返回友好 warning", async () => {
    const provider = new MockWeatherProvider({
      scenario: "unavailable",
      now,
    });
    const forecast = await provider.getForecast({
      city: "成都",
      days: 4,
    });

    expect(forecast.available).toBe(false);
    expect(forecast.forecastDays).toEqual([]);
    expect(forecast.warnings.join("")).toContain("天气接口");
  });

  it("明显无法识别的城市返回友好降级结果", async () => {
    const provider = new MockWeatherProvider({ now });
    const forecast = await provider.getForecast({
      city: "不存在的测试城市",
      days: 3,
    });

    expect(weatherForecastSchema.safeParse(forecast).success).toBe(true);
    expect(forecast.available).toBe(false);
    expect(forecast.forecastDays).toEqual([]);
    expect(forecast.warnings).toContain(
      "暂时没认出这个城市，先不加入实时天气。",
    );
  });

  it("超出预报范围时不伪造天气", async () => {
    const provider = new MockWeatherProvider({ now });
    const forecast = await provider.getForecast({
      city: "杭州",
      startDate: "2026-09-01",
      endDate: "2026-09-03",
      days: 3,
    });

    expect(forecast.available).toBe(false);
    expect(forecast.forecastDays).toEqual([]);
    expect(forecast.warnings.join("")).toContain("超出当前可预报范围");
  });

  it("只有天数时返回近期 Mock，并明确提示日期未定", async () => {
    const provider = new MockWeatherProvider({ now });
    const forecast = await provider.getForecast({
      city: "广州",
      days: 2,
    });

    expect(forecast.available).toBe(true);
    expect(forecast.forecastDays).toHaveLength(2);
    expect(forecast.warnings.join("")).toContain("没有具体日期");
  });
});
