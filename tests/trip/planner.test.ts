import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { MockLLMProvider } from "../../lib/ai/mock";
import type { LLMProvider } from "../../lib/ai/provider";
import type {
  GenerateTripOutput,
  ParseTripOutput,
  RegenerateTripOutput,
} from "../../lib/ai/types";
import { generateTripResponseSchema } from "../../lib/trip/schema";
import { planTrip } from "../../lib/trip/planner";
import type { TripRequest } from "../../lib/trip/types";
import { MockWeatherProvider } from "../../lib/weather/mock";
import type { WeatherProvider } from "../../lib/weather/provider";

const tripRequest: TripRequest = {
  departureCity: "深圳",
  destinationCity: "厦门",
  days: 3,
  budget: 2500,
  currency: "CNY",
  interests: ["海边", "美食", "拍照"],
  travelStyles: ["轻松"],
  mustVisitPlaces: ["鼓浪屿"],
  avoidPlaces: ["过度商业化景点"],
};

const dependencies = {
  llmProvider: new MockLLMProvider(),
  weatherProvider: new MockWeatherProvider({
    now: new Date("2026-07-02T00:00:00.000Z"),
  }),
};

async function createBaseResponse() {
  return planTrip({ tripRequest }, dependencies);
}

class StaticLLMProvider implements LLMProvider {
  readonly providerName = "static";

  constructor(
    private readonly output: GenerateTripOutput,
    private readonly repairOutput?: unknown,
  ) {}

  async parseTrip(): Promise<ParseTripOutput> {
    throw new Error("Not used in this test.");
  }

  async generateTrip(): Promise<GenerateTripOutput> {
    return this.output;
  }

  async regenerateTrip(): Promise<RegenerateTripOutput> {
    return this.output;
  }

  async repairJson<T>(): Promise<T> {
    if (this.repairOutput === undefined) {
      throw new Error("repairJson was not expected.");
    }

    return this.repairOutput as T;
  }
}

describe("planTrip", () => {
  it("Mock AI + Mock Weather 可以零 Key 生成完整 TripPlan", async () => {
    const result = await planTrip({ tripRequest }, dependencies);

    expect(generateTripResponseSchema.safeParse(result).success).toBe(true);
    expect(result.tripPlan.destination).toBe("厦门");
    expect(result.tripPlan.dailyItinerary).toHaveLength(3);
    expect(result.tripPlan.weatherSummary.available).toBe(true);
    expect(result.warnings?.join("")).toContain("演示天气");
  });

  it("天气 Provider 失败时仍然生成行程并写入 warning", async () => {
    const failingWeatherProvider: WeatherProvider = {
      async getForecast() {
        throw new Error("upstream weather secret");
      },
    };

    const result = await planTrip(
      { tripRequest },
      {
        llmProvider: new MockLLMProvider(),
        weatherProvider: failingWeatherProvider,
      },
    );

    expect(generateTripResponseSchema.safeParse(result).success).toBe(true);
    expect(result.tripPlan.weatherSummary.available).toBe(false);
    expect(result.tripPlan.weatherSummary.overview).toContain("天气");
    expect(result.warnings?.join("")).not.toContain("upstream weather secret");
  });

  it("携带 previousPlan 和 modificationRequest 时返回完整新方案", async () => {
    const original = await planTrip({ tripRequest }, dependencies);
    const regenerated = await planTrip(
      {
        tripRequest,
        previousPlan: original.tripPlan,
        modificationRequest: "第二天再轻松一点，晚上留空。",
      },
      dependencies,
    );

    expect(generateTripResponseSchema.safeParse(regenerated).success).toBe(
      true,
    );
    expect(regenerated.tripPlan.dailyItinerary).toHaveLength(3);
    expect(regenerated.appliedChanges).toEqual([
      "第二天再轻松一点，晚上留空。",
    ]);
  });

  it("会移除模型输出里未经天气 Provider 验证的预警和实时天气判断", async () => {
    const base = await createBaseResponse();
    const provider = new StaticLLMProvider({
      ...base,
      warnings: ["厦门暴雨预警已经发布", "预算偏紧，吃饭别太散"],
      tripPlan: {
        ...base.tripPlan,
        weatherSummary: {
          ...base.tripPlan.weatherSummary,
          overview: "模型说厦门今天有暴雨预警",
        },
        warnings: ["高温红色预警，下午别出门", "这天别安排太满"],
        generalTips: [
          "台风预警快到了，海边先别去",
          "带伞可备用，出发前再看天气",
        ],
        dailyItinerary: base.tripPlan.dailyItinerary.map((day, index) => ({
          ...day,
          dailyTips:
            index === 0
              ? ["明天厦门会下暴雨", "这天别安排太满"]
              : day.dailyTips,
          morning:
            index === 0
              ? day.morning.map((item) => ({
                  ...item,
                  weatherImpact: "厦门今天有台风预警，户外别去",
                  backupPlan: "如果下雨就改室内，带伞备用",
                }))
              : day.morning,
        })),
      },
    });

    const result = await planTrip(
      { tripRequest },
      {
        llmProvider: provider,
        weatherProvider: dependencies.weatherProvider,
      },
    );
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain("暴雨预警");
    expect(serialized).not.toContain("台风预警");
    expect(serialized).not.toContain("高温红色预警");
    expect(result.tripPlan.weatherSummary.overview).toContain("已取得 厦门 的天气数据");
    expect(result.warnings).toContain("预算偏紧，吃饭别太散");
    expect(result.tripPlan.warnings).toContain("这天别安排太满");
    expect(result.tripPlan.generalTips).toContain("带伞可备用，出发前再看天气");
    expect(result.tripPlan.dailyItinerary[0]?.dailyTips).toContain("这天别安排太满");
    expect(result.tripPlan.dailyItinerary[0]?.morning[0]?.backupPlan).toBe(
      "如果下雨就改室内，带伞备用",
    );
    expect(result.tripPlan.dailyItinerary[0]?.morning[0]?.weatherImpact).toBe(
      "户外安排请按出发前天气再调整。",
    );
  });

  it("WeatherProvider unavailable 时只保留可信 weather warning，不保留模型自说自话", async () => {
    const base = await createBaseResponse();
    const provider = new StaticLLMProvider({
      ...base,
      warnings: ["厦门明天有暴雨，海边先取消"],
      tripPlan: {
        ...base.tripPlan,
        generalTips: ["厦门这几天有台风，别去海边", "出发前查看天气"],
        dailyItinerary: base.tripPlan.dailyItinerary.map((day) => ({
          ...day,
          dailyTips: ["今天会有大风", "预算紧就少折腾一点"],
        })),
      },
    });
    const unavailableWeatherProvider: WeatherProvider = {
      async getForecast() {
        return {
          city: "厦门",
          available: false,
          forecastDays: [],
          alerts: [],
          warnings: ["暂时无法获取实时天气，先给你一版不含实时天气的。"],
        };
      },
    };

    const result = await planTrip(
      { tripRequest },
      {
        llmProvider: provider,
        weatherProvider: unavailableWeatherProvider,
      },
    );
    const serialized = JSON.stringify(result);

    expect(result.tripPlan.weatherSummary.available).toBe(false);
    expect(result.tripPlan.weatherSummary.overview).toContain("暂时无法获取实时天气");
    expect(result.warnings).toContain("暂时无法获取实时天气，先给你一版不含实时天气的。");
    expect(serialized).not.toContain("厦门明天有暴雨");
    expect(serialized).not.toContain("厦门这几天有台风");
    expect(serialized).not.toContain("今天会有大风");
    expect(result.tripPlan.generalTips).toContain("出发前查看天气");
    expect(result.tripPlan.dailyItinerary[0]?.dailyTips).toContain(
      "预算紧就少折腾一点",
    );
  });

  it("repairJson 之后的结果也会经过同样的天气内容清洗", async () => {
    const base = await createBaseResponse();
    const repaired = {
      ...base,
      warnings: ["厦门暴雨预警已发布"],
      tripPlan: {
        ...base.tripPlan,
        generalTips: ["高温红色预警，午后不要出门", "开放时间出发前确认"],
      },
    };
    const provider = new StaticLLMProvider("not-json", repaired);

    const result = await planTrip(
      { tripRequest },
      {
        llmProvider: provider,
        weatherProvider: dependencies.weatherProvider,
      },
    );
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain("暴雨预警");
    expect(serialized).not.toContain("高温红色预警");
    expect(result.tripPlan.generalTips).toContain("开放时间出发前确认");
  });
});
