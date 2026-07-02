import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { weatherForecastSchema } from "../../lib/trip/schema";
import { QWeatherProvider } from "../../lib/weather/qweather";

const now = new Date("2026-07-02T00:00:00.000Z");

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

describe("QWeatherProvider", () => {
  it("服务端查询城市和预报，并转换为内部 WeatherForecast", async () => {
    const requests: Array<{ url: string; authorization: string | null }> = [];
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      const headers = new Headers(init?.headers);
      requests.push({
        url,
        authorization: headers.get("Authorization"),
      });

      if (url.includes("/geo/v2/city/lookup")) {
        return jsonResponse({
          code: "200",
          location: [{ id: "101230201", name: "厦门" }],
        });
      }

      return jsonResponse({
        code: "200",
        daily: [
          {
            fxDate: "2026-07-10",
            tempMax: "30",
            tempMin: "25",
            textDay: "多云",
            textNight: "晴",
            windDirDay: "东南风",
            windScaleDay: "2-3",
          },
          {
            fxDate: "2026-07-11",
            tempMax: "29",
            tempMin: "24",
            textDay: "小雨",
            textNight: "阴",
          },
          {
            fxDate: "2026-07-12",
            tempMax: "31",
            tempMin: "25",
            textDay: "晴",
            textNight: "多云",
          },
        ],
      });
    });
    const provider = new QWeatherProvider({
      apiKey: "weather-token",
      baseUrl: "https://weather.example.test",
      fetcher,
      now,
    });

    const forecast = await provider.getForecast({
      city: "厦门",
      startDate: "2026-07-10",
      endDate: "2026-07-12",
      days: 3,
    });

    expect(weatherForecastSchema.safeParse(forecast).success).toBe(true);
    expect(forecast).toMatchObject({
      city: "厦门",
      available: true,
      alerts: [],
      warnings: [],
    });
    expect(forecast.forecastDays).toHaveLength(3);
    expect(forecast.forecastDays[0]).toMatchObject({
      date: "2026-07-10",
      tempMax: 30,
      tempMin: 25,
      dayWeather: "多云",
    });
    expect(requests).toHaveLength(2);
    expect(requests[0]?.url).toContain("/geo/v2/city/lookup");
    expect(requests[1]?.url).toContain("/v7/weather/15d");
    expect(requests.every((request) => request.authorization === "Bearer weather-token")).toBe(true);
  });

  it("城市无法识别时返回 warning，不继续请求天气", async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({
        code: "200",
        location: [],
      }),
    );
    const provider = new QWeatherProvider({
      apiKey: "weather-token",
      fetcher,
      now,
    });

    const forecast = await provider.getForecast({
      city: "不存在的城市",
      days: 3,
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(forecast.available).toBe(false);
    expect(forecast.warnings.join("")).toContain("没认出这个城市");
  });

  it("网络错误不会暴露原始错误", async () => {
    const fetcher = vi.fn(async () => {
      throw new Error("upstream hostname and secret");
    });
    const provider = new QWeatherProvider({
      apiKey: "weather-token",
      fetcher,
      now,
    });

    const forecast = await provider.getForecast({
      city: "成都",
      days: 4,
    });

    expect(forecast.available).toBe(false);
    expect(forecast.warnings.join("")).toContain("天气接口");
    expect(forecast.warnings.join("")).not.toContain("secret");
  });
});
