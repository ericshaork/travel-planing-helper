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
    const requests: string[] = [];
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      requests.push(url);

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
            precip: "70",
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
    expect(forecast.forecastDays[1]?.precipitationProbability).toBe(70);
    expect(requests).toHaveLength(2);
    expect(requests[0]).toContain("/geo/v2/city/lookup");
    expect(requests[0]).toContain("key=weather-token");
    expect(requests[1]).toContain("/v7/weather/15d");
    expect(requests[1]).toContain("location=101230201");
    expect(requests[1]).toContain("key=weather-token");
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

  it("QWeather status 非 200 时返回 provider warning", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.includes("/geo/v2/city/lookup")) {
        return jsonResponse({
          code: "200",
          location: [{ id: "101010100", name: "北京" }],
        });
      }

      return jsonResponse({
        code: "500",
      });
    });
    const provider = new QWeatherProvider({
      apiKey: "weather-token",
      fetcher,
      now,
    });

    const forecast = await provider.getForecast({
      city: "北京",
      days: 3,
    });

    expect(forecast.available).toBe(false);
    expect(forecast.warnings.join("")).toContain("天气服务这次返回不太正常");
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
    expect(forecast.warnings.join("")).not.toContain("weather-token");
  });

  it("缺少 QWEATHER_API_KEY 时明确报错", async () => {
    const provider = new QWeatherProvider({
      now,
    });

    await expect(
      provider.getForecast({
        city: "杭州",
        days: 2,
      }),
    ).rejects.toThrow(/QWEATHER_API_KEY/);
  });
});
