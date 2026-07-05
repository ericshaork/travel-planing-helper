import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { generateTripWithProvider } from "../../lib/ai/generateTrip";
import { MockLLMProvider } from "../../lib/ai/mock";
import { buildTripPlanRepairInstructions } from "../../lib/ai/prompts";
import type { LLMProvider } from "../../lib/ai/provider";
import type {
  GenerateTripOutput,
  ParseTripOutput,
  RegenerateTripOutput,
  RepairJsonInput,
} from "../../lib/ai/types";
import { generateTripResponseSchema } from "../../lib/trip/schema";
import type {
  GenerateTripResponse,
  TripRequest,
} from "../../lib/trip/types";
import type { WeatherForecast } from "../../lib/weather/types";

const HOMEPAGE_EXAMPLES = [
  "7 月从深圳去厦门玩 3 天，预算 2500，喜欢海边、美食和拍照，不想太累。",
  "从广州去成都玩 4 天，喜欢美食和城市漫步，不想去太商业化的景点。",
  "想去杭州玩两天，预算 1500，不想早起，想轻松一点。",
] as const;

const exampleOneRequest: TripRequest = {
  departureCity: "深圳",
  destinationCity: "厦门",
  days: 3,
  budget: 2500,
  currency: "CNY",
  interests: ["海边", "美食", "拍照"],
  travelStyles: ["轻松"],
  mustVisitPlaces: [],
  avoidPlaces: [],
};

const exampleTwoRequest: TripRequest = {
  departureCity: "广州",
  destinationCity: "成都",
  days: 4,
  budget: 3200,
  currency: "CNY",
  interests: ["美食", "城市漫步"],
  travelStyles: ["轻松"],
  mustVisitPlaces: [],
  avoidPlaces: ["太商业化的景点"],
};

const exampleThreeRequest: TripRequest = {
  departureCity: "上海",
  destinationCity: "杭州",
  days: 2,
  budget: 1500,
  currency: "CNY",
  interests: ["城市漫步"],
  travelStyles: ["轻松"],
  mustVisitPlaces: [],
  avoidPlaces: [],
  schedulePreference: "不想早起",
};

const exampleThreeWeather: WeatherForecast = {
  city: "杭州",
  available: true,
  forecastDays: [
    {
      date: "2026-07-10",
      dayWeather: "多云",
      nightWeather: "晴",
      summary: "当前使用演示天气，出发前请再次确认。",
    },
    {
      date: "2026-07-11",
      dayWeather: "阵雨",
      nightWeather: "多云",
      summary: "当前使用演示天气，出发前请再次确认。",
    },
  ],
  alerts: [],
  warnings: [],
};

async function createValidResponse(
  tripRequest: TripRequest,
): Promise<GenerateTripResponse> {
  const mock = new MockLLMProvider();
  return generateTripResponseSchema.parse(
    await mock.generateTrip({ tripRequest }),
  );
}

class StubLLMProvider implements LLMProvider {
  readonly providerName = "stub";
  repairCalls = 0;
  repairInstructions?: string;

  constructor(
    private readonly output: GenerateTripOutput,
    private readonly repairResult?: unknown,
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

  async repairJson<T>(input: RepairJsonInput<T>): Promise<T> {
    this.repairCalls += 1;
    this.repairInstructions = input.instructions;

    if (this.repairResult === undefined) {
      throw new Error("Repair not configured.");
    }

    return this.repairResult as T;
  }
}

describe("generateTripWithProvider", () => {
  it("首页三个示例文本纳入 generate-trip 回归", () => {
    expect(HOMEPAGE_EXAMPLES).toHaveLength(3);
    expect(HOMEPAGE_EXAMPLES[0]).toContain("7 月从深圳去厦门玩 3 天");
    expect(HOMEPAGE_EXAMPLES[1]).toContain("从广州去成都玩 4 天");
    expect(HOMEPAGE_EXAMPLES[2]).toContain("想去杭州玩两天");
  });

  it("示例一继续可通过", async () => {
    const valid = await createValidResponse(exampleOneRequest);
    const provider = new StubLLMProvider(JSON.stringify(valid));

    const result = await generateTripWithProvider(
      { tripRequest: exampleOneRequest },
      provider,
    );

    expect(result.tripPlan.destination).toBe("厦门");
    expect(result.tripPlan.days).toBe(3);
    expect(provider.repairCalls).toBe(0);
  });

  it("示例二继续支持 wrapper 和 markdown 提取", async () => {
    const valid = await createValidResponse(exampleTwoRequest);
    const provider = new StubLLMProvider(
      `说明\n\`\`\`json\n${JSON.stringify({
        data: {
          result: {
            tripPlan: valid.tripPlan,
          },
        },
      })}\n\`\`\``,
    );

    const result = await generateTripWithProvider(
      { tripRequest: exampleTwoRequest },
      provider,
    );

    expect(result.tripPlan.destination).toBe("成都");
    expect(result.tripPlan.days).toBe(4);
  });

  it("dailyForecast 缺 summary 时 normalize 后可通过", async () => {
    const valid = await createValidResponse(exampleThreeRequest);
    const provider = new StubLLMProvider(
      JSON.stringify({
        tripPlan: {
          ...valid.tripPlan,
          weatherSummary: {
            ...valid.tripPlan.weatherSummary,
            dailyForecast: exampleThreeWeather.forecastDays.map((day) => ({
              ...day,
              summary: undefined,
            })),
          },
        },
      }),
    );

    const result = await generateTripWithProvider(
      {
        tripRequest: exampleThreeRequest,
        weatherForecast: exampleThreeWeather,
      },
      provider,
    );

    expect(result.tripPlan.weatherSummary.dailyForecast[0]?.summary).toBe(
      "当前使用演示天气，出发前请再次确认。",
    );
    expect(result.tripPlan.weatherSummary.dailyForecast[1]?.summary).toBe(
      "当前使用演示天气，出发前请再次确认。",
    );
  });

  it('transport mode = "高铁" 时映射为 high_speed_rail', async () => {
    const valid = await createValidResponse(exampleTwoRequest);
    const provider = new StubLLMProvider(
      JSON.stringify({
        tripPlan: {
          ...valid.tripPlan,
          transportAdvice: {
            ...valid.tripPlan.transportAdvice,
            options: [
              {
                ...valid.tripPlan.transportAdvice.options[0],
                mode: "高铁",
              },
            ],
          },
        },
      }),
    );

    const result = await generateTripWithProvider(
      { tripRequest: exampleTwoRequest },
      provider,
    );

    expect(result.tripPlan.transportAdvice.options[0]?.mode).toBe(
      "high_speed_rail",
    );
  });

  it.each([
    ["地铁"],
    ["打车"],
    ["步行"],
  ])('transport mode = "%s" 时映射为 other', async (mode) => {
    const valid = await createValidResponse(exampleThreeRequest);
    const provider = new StubLLMProvider(
      JSON.stringify({
        tripPlan: {
          ...valid.tripPlan,
          transportAdvice: {
            ...valid.tripPlan.transportAdvice,
            options: [
              {
                ...valid.tripPlan.transportAdvice.options[0],
                mode,
              },
            ],
          },
        },
      }),
    );

    const result = await generateTripWithProvider(
      { tripRequest: exampleThreeRequest, weatherForecast: exampleThreeWeather },
      provider,
    );

    expect(result.tripPlan.transportAdvice.options[0]?.mode).toBe("other");
  });

  it("示例三在缺 weather summary 和非法 transport mode 时仍可通过", async () => {
    const valid = await createValidResponse(exampleThreeRequest);
    const provider = new StubLLMProvider(
      JSON.stringify({
        tripPlan: {
          ...valid.tripPlan,
          weatherSummary: {
            ...valid.tripPlan.weatherSummary,
            dailyForecast: [
              {
                ...exampleThreeWeather.forecastDays[0],
                summary: undefined,
              },
              {
                ...exampleThreeWeather.forecastDays[1],
                summary: undefined,
              },
            ],
          },
          transportAdvice: {
            ...valid.tripPlan.transportAdvice,
            options: [
              {
                ...valid.tripPlan.transportAdvice.options[0],
                mode: "公交地铁",
              },
            ],
          },
        },
      }),
    );

    const result = await generateTripWithProvider(
      { tripRequest: exampleThreeRequest, weatherForecast: exampleThreeWeather },
      provider,
    );

    expect(result.tripPlan.destination).toBe("杭州");
    expect(result.tripPlan.days).toBe(2);
    expect(result.tripPlan.weatherSummary.dailyForecast[0]?.summary).toBe(
      "当前使用演示天气，出发前请再次确认。",
    );
    expect(result.tripPlan.transportAdvice.options[0]?.mode).toBe("other");
  });

  it("repair 后也会再次 normalize", async () => {
    const valid = await createValidResponse(exampleThreeRequest);
    const repaired = {
      tripPlan: {
        ...valid.tripPlan,
        weatherSummary: {
          ...valid.tripPlan.weatherSummary,
          dailyForecast: exampleThreeWeather.forecastDays.map((day) => ({
            ...day,
            summary: undefined,
          })),
        },
        transportAdvice: {
          ...valid.tripPlan.transportAdvice,
          options: [
            {
              ...valid.tripPlan.transportAdvice.options[0],
              mode: "打车",
            },
          ],
        },
      },
    };
    const provider = new StubLLMProvider("not-json", repaired);

    const result = await generateTripWithProvider(
      { tripRequest: exampleThreeRequest, weatherForecast: exampleThreeWeather },
      provider,
    );

    expect(provider.repairCalls).toBe(1);
    expect(result.tripPlan.weatherSummary.dailyForecast[0]?.summary).toBe(
      "当前使用演示天气，出发前请再次确认。",
    );
    expect(result.tripPlan.transportAdvice.options[0]?.mode).toBe("other");
  });

  it("repairJson 仍明确要求修成最终 TripPlan", () => {
    const instructions = buildTripPlanRepairInstructions("generate-trip");

    expect(instructions).toContain("修复目标是 TripPlan");
    expect(instructions).toContain("weatherSummary.dailyForecast 每一项都必须包含 summary");
    expect(instructions).toContain("transportAdvice.options[].mode 只能使用 flight、train、high_speed_rail、bus、ship、other");
  });

  it("Mock generate 不受影响", async () => {
    const provider = new MockLLMProvider();

    const result = await generateTripWithProvider(
      { tripRequest: exampleOneRequest },
      provider,
    );

    expect(result.tripPlan.destination).toBe("厦门");
    expect(result.tripPlan.days).toBe(3);
  });
});
