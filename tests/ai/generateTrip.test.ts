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

  it("guide / dailyTips / matchedInterests 被写成字符串时会自动包成数组", async () => {
    const valid = await createValidResponse(exampleOneRequest);
    const brokenPlan = {
      ...valid.tripPlan,
      generalTips: "带上防晒霜",
      warnings: "沿海注意台风",
      weatherSummary: {
        ...valid.tripPlan.weatherSummary,
        reminders: "带上雨伞",
      },
      transportAdvice: {
        ...valid.tripPlan.transportAdvice,
        suggestedPlatforms: "12306",
        options: valid.tripPlan.transportAdvice.options.map((option) => ({
          ...option,
          pros: "速度快",
          cons: "价格贵",
        })),
      },
      dailyItinerary: valid.tripPlan.dailyItinerary.map((day) => ({
        ...day,
        routeOrder: "鼓浪屿",
        dailyTips: "早上早点出发",
        morning: day.morning.map((item) => ({
          ...item,
          guide: "提前预约门票",
          matchedInterests: "海边",
        })),
      })),
    };

    const provider = new StubLLMProvider(
      JSON.stringify({ tripPlan: brokenPlan }),
    );

    const result = await generateTripWithProvider(
      { tripRequest: exampleOneRequest },
      provider,
    );

    expect(provider.repairCalls).toBe(0);
    expect(result.tripPlan.generalTips).toEqual(["带上防晒霜"]);
    expect(result.tripPlan.warnings).toEqual(["沿海注意台风"]);
    expect(result.tripPlan.weatherSummary.reminders).toEqual(["带上雨伞"]);
    expect(result.tripPlan.transportAdvice.suggestedPlatforms).toEqual([
      "12306",
    ]);
    expect(result.tripPlan.transportAdvice.options[0]?.pros).toEqual([
      "速度快",
    ]);
    expect(result.tripPlan.transportAdvice.options[0]?.cons).toEqual([
      "价格贵",
    ]);
    expect(result.tripPlan.dailyItinerary[0]?.routeOrder).toEqual([
      "鼓浪屿",
    ]);
    expect(result.tripPlan.dailyItinerary[0]?.dailyTips).toEqual([
      "早上早点出发",
    ]);
    expect(result.tripPlan.dailyItinerary[0]?.morning[0]?.guide).toEqual([
      "提前预约门票",
    ]);
    expect(result.tripPlan.dailyItinerary[0]?.morning[0]?.matchedInterests).toEqual([
      "海边",
    ]);
  });

  it.each([
    ["美食", "food"],
    ["景点", "attraction"],
    ["餐饮", "food"],
    ["自由活动", "free_time"],
    ["购物", "shopping"],
    ["酒店", "hotel"],
    ["ATTRACTIONS", "attraction"],
    ["Restaurant", "food"],
  ])(
    'ItineraryItem type = "%s" 时归一化到英文枚举 "%s"',
    async (typeInput, expected) => {
      const valid = await createValidResponse(exampleOneRequest);
      const brokenPlan = {
        ...valid.tripPlan,
        dailyItinerary: valid.tripPlan.dailyItinerary.map((day, dayIndex) => ({
          ...day,
          morning:
            dayIndex === 0
              ? day.morning.map((item) => ({ ...item, type: typeInput }))
              : day.morning,
        })),
      };

      const provider = new StubLLMProvider(
        JSON.stringify({ tripPlan: brokenPlan }),
      );

      const result = await generateTripWithProvider(
        { tripRequest: exampleOneRequest },
        provider,
      );

      expect(provider.repairCalls).toBe(0);
      expect(result.tripPlan.dailyItinerary[0]?.morning[0]?.type).toBe(expected);
    },
  );

  it("morning / afternoon / evening 是单对象时会被包成数组", async () => {
    const valid = await createValidResponse(exampleOneRequest);
    const originalMorningItem = valid.tripPlan.dailyItinerary[0]!.morning[0]!;
    const brokenPlan = {
      ...valid.tripPlan,
      dailyItinerary: valid.tripPlan.dailyItinerary.map((day, index) => {
        if (index !== 0) return day;
        return {
          ...day,
          // 模拟模型偶尔把三时段全部返回成单对象而非数组
          morning: { ...originalMorningItem, placeName: "西安城墙" },
          afternoon: { ...originalMorningItem, placeName: "陕西历史博物馆" },
          evening: { ...originalMorningItem, placeName: "老米家肉丸胡辣汤" },
        };
      }),
    };
    const provider = new StubLLMProvider(
      JSON.stringify({ tripPlan: brokenPlan }),
    );

    const result = await generateTripWithProvider(
      { tripRequest: exampleOneRequest },
      provider,
    );

    expect(provider.repairCalls).toBe(0);
    expect(Array.isArray(result.tripPlan.dailyItinerary[0]?.morning)).toBe(
      true,
    );
    expect(result.tripPlan.dailyItinerary[0]?.morning[0]?.placeName).toBe(
      "西安城墙",
    );
    expect(result.tripPlan.dailyItinerary[0]?.afternoon[0]?.placeName).toBe(
      "陕西历史博物馆",
    );
    expect(result.tripPlan.dailyItinerary[0]?.evening[0]?.placeName).toBe(
      "老米家肉丸胡辣汤",
    );
  });

  it("morning / afternoon / evening 是 null 时会归一化为空数组", async () => {
    const valid = await createValidResponse(exampleOneRequest);
    const originalMorningItem = valid.tripPlan.dailyItinerary[0]!.morning[0]!;
    const brokenPlan = {
      ...valid.tripPlan,
      dailyItinerary: valid.tripPlan.dailyItinerary.map((day, index) => {
        if (index !== 0) return day;
        return {
          ...day,
          morning: [{ ...originalMorningItem, placeName: "西安城墙" }],
          afternoon: null,
          evening: undefined,
        };
      }),
    };
    const provider = new StubLLMProvider(
      JSON.stringify({ tripPlan: brokenPlan }),
    );

    const result = await generateTripWithProvider(
      { tripRequest: exampleOneRequest },
      provider,
    );

    expect(provider.repairCalls).toBe(0);
    expect(result.tripPlan.dailyItinerary[0]?.morning).toHaveLength(1);
    expect(result.tripPlan.dailyItinerary[0]?.afternoon).toEqual([]);
    expect(result.tripPlan.dailyItinerary[0]?.evening).toEqual([]);
  });

  it("weatherSummary.dailyForecast[].date 缺失时会用 forecast/fallback 兜底而不失败", async () => {
    const valid = await createValidResponse(exampleThreeRequest);
    const brokenPlan = {
      ...valid.tripPlan,
      weatherSummary: {
        ...valid.tripPlan.weatherSummary,
        dailyForecast: [
          // model 完全没给 date / dayWeather / summary
          {},
          // model 只给了空字符串
          { date: "", dayWeather: "", summary: "" },
          // model 只给了 summary
          { summary: "多云偶阵雨" },
        ],
      },
    };
    const provider = new StubLLMProvider(
      JSON.stringify({ tripPlan: brokenPlan }),
    );

    const result = await generateTripWithProvider(
      {
        tripRequest: exampleThreeRequest,
        weatherForecast: exampleThreeWeather,
      },
      provider,
    );

    const forecast = result.tripPlan.weatherSummary.dailyForecast;
    expect(forecast).toHaveLength(3);
    // 第 0、1 项走 weatherForecast 的日期兜底
    expect(forecast[0]?.date).toBe(exampleThreeWeather.forecastDays[0]?.date);
    expect(forecast[1]?.date).toBe(exampleThreeWeather.forecastDays[1]?.date);
    // 第 2 项没有对应 forecast，退化到 today+index 计算的合法 ISO 日期
    expect(forecast[2]?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // dayWeather 缺失时也不会阻断 schema
    expect(typeof forecast[0]?.dayWeather).toBe("string");
    expect(forecast[0]?.dayWeather?.length ?? 0).toBeGreaterThan(0);
  });

  it("模型把 3 个 block 全塞在 morning 时，会自动均摊到 morning/afternoon/evening", async () => {
    const valid = await createValidResponse(exampleOneRequest);
    const firstDay = valid.tripPlan.dailyItinerary[0]!;
    const packedMorning = [
      { ...firstDay.morning[0]!, placeName: "上午地点" },
      { ...firstDay.morning[0]!, placeName: "下午地点" },
      { ...firstDay.morning[0]!, placeName: "晚上地点" },
    ];
    const brokenPlan = {
      ...valid.tripPlan,
      dailyItinerary: valid.tripPlan.dailyItinerary.map((day, index) =>
        index === 0
          ? {
              ...day,
              morning: packedMorning,
              afternoon: [],
              evening: [],
            }
          : day,
      ),
    };
    const provider = new StubLLMProvider(
      JSON.stringify({ tripPlan: brokenPlan }),
    );

    const result = await generateTripWithProvider(
      { tripRequest: exampleOneRequest },
      provider,
    );

    expect(provider.repairCalls).toBe(0);
    expect(result.tripPlan.dailyItinerary[0]?.morning).toHaveLength(1);
    expect(result.tripPlan.dailyItinerary[0]?.morning[0]?.placeName).toBe(
      "上午地点",
    );
    expect(result.tripPlan.dailyItinerary[0]?.afternoon).toHaveLength(1);
    expect(result.tripPlan.dailyItinerary[0]?.afternoon[0]?.placeName).toBe(
      "下午地点",
    );
    expect(result.tripPlan.dailyItinerary[0]?.evening).toHaveLength(1);
    expect(result.tripPlan.dailyItinerary[0]?.evening[0]?.placeName).toBe(
      "晚上地点",
    );
  });

  it("模型正常分布在三个时段时槽位不再被改动", async () => {
    const valid = await createValidResponse(exampleOneRequest);
    const original = valid.tripPlan.dailyItinerary[0]!;
    // 强制构造 morning=1, afternoon=1, evening=1
    const balancedDay = {
      ...original,
      morning: [
        { ...original.morning[0]!, placeName: "上午原样" },
      ],
      afternoon: [
        { ...original.morning[0]!, placeName: "下午原样" },
      ],
      evening: [
        { ...original.morning[0]!, placeName: "晚上原样" },
      ],
    };
    const brokenPlan = {
      ...valid.tripPlan,
      dailyItinerary: valid.tripPlan.dailyItinerary.map((day, index) =>
        index === 0 ? balancedDay : day,
      ),
    };
    const provider = new StubLLMProvider(
      JSON.stringify({ tripPlan: brokenPlan }),
    );

    const result = await generateTripWithProvider(
      { tripRequest: exampleOneRequest },
      provider,
    );

    expect(result.tripPlan.dailyItinerary[0]?.morning[0]?.placeName).toBe(
      "上午原样",
    );
    expect(result.tripPlan.dailyItinerary[0]?.afternoon[0]?.placeName).toBe(
      "下午原样",
    );
    expect(result.tripPlan.dailyItinerary[0]?.evening[0]?.placeName).toBe(
      "晚上原样",
    );
  });

  it("模型把 tripPlan 内容摊平到顶层时也能被自动 rewrap", async () => {
    const valid = await createValidResponse(exampleOneRequest);
    const flatPlan = { ...valid.tripPlan };
    const provider = new StubLLMProvider(JSON.stringify(flatPlan));

    const result = await generateTripWithProvider(
      { tripRequest: exampleOneRequest },
      provider,
    );

    expect(provider.repairCalls).toBe(0);
    expect(result.tripPlan.destination).toBe("厦门");
    expect(result.tripPlan.days).toBe(3);
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

  it("repairJson 明确要求最终结构是 GenerateTripResponse 且保留 tripPlan 外层", () => {
    const instructions = buildTripPlanRepairInstructions("generate-trip");

    expect(instructions).toContain("GenerateTripResponse");
    expect(instructions).toContain("tripPlan 是必需的外层包裹字段");
    expect(instructions).toContain(
      "禁止把 tripTitle / dailyItinerary 等直接放到顶层",
    );
    expect(instructions).toContain("weatherSummary.dailyForecast 每一项都必须包含 summary");
    expect(instructions).toContain(
      "transportAdvice.options[].mode 只能使用 flight、train、high_speed_rail、bus、ship、other",
    );
    expect(instructions).toContain(
      "以下字段必须是 JSON 数组",
    );
    expect(instructions).toContain(
      "type 只能使用英文枚举 attraction / food / transport / hotel / free_time / shopping / other",
    );
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
