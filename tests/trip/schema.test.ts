import { describe, expect, it } from "vitest";

import {
  generateTripRequestSchema,
  tripPlanSchema,
  tripRequestDraftSchema,
  tripRequestSchema,
} from "../../lib/trip/schema";

const validTripRequest = {
  departureCity: "深圳",
  destinationCity: "厦门",
  startDate: "2026-07-10",
  endDate: "2026-07-12",
  days: 3,
  budget: 2500,
  currency: "CNY",
  interests: ["海边", "美食", "拍照"],
  travelStyles: ["轻松"],
  mustVisitPlaces: ["鼓浪屿"],
  avoidPlaces: ["寺庙"],
};

const validTripPlan = {
  tripTitle: "厦门三天轻松走",
  summary: "不赶时间，按片区安排海边、美食和拍照。",
  destination: "厦门",
  days: 1,
  travelStyleSummary: "节奏轻松，不安排早起。",
  weatherSummary: {
    available: false,
    overview: "暂时没有实时天气。",
    dailyForecast: [],
    alerts: [],
    reminders: ["出发前再看一次天气"],
    dataNote: "本方案未使用实时天气。",
  },
  budgetSummary: {
    totalEstimate: "约 2500 元",
    transport: "约 700 元",
    hotel: "约 800 元",
    food: "约 450 元",
    tickets: "约 200 元",
    localTransport: "约 150 元",
    flexibleSpending: "约 200 元",
    note: "预算为估算值，不代表实时票价或酒店价格。",
  },
  hotelAreaAdvice: [
    {
      area: "思明区",
      reason: "去主要片区比较顺路。",
      suitableFor: "第一次来厦门的自由行游客",
      transportationConvenience: "公交和打车都方便。",
      possibleDownside: "热门日期可能比较嘈杂。",
      suggestedPlatforms: ["携程", "飞猪"],
    },
  ],
  transportAdvice: {
    summary: "从深圳出发可优先比较高铁。",
    options: [
      {
        mode: "high_speed_rail" as const,
        pros: ["市区往返方便"],
        cons: ["热门日期需要提前购票"],
        recommendation: "出发前在 12306 核实班次和价格。",
      },
    ],
    suggestedPlatforms: ["12306"],
    note: "交通价格仅作估算，请以平台实时信息为准。",
  },
  dailyItinerary: [
    {
      day: 1,
      theme: "海边和城市散步",
      routeOrder: ["酒店", "沙坡尾", "环岛路", "酒店"],
      routeReason: "同一片区移动更少。",
      morning: [],
      afternoon: [],
      evening: [],
      dailyTips: ["这天别安排太满"],
    },
  ],
  generalTips: ["出行前确认景点开放状态"],
  warnings: ["暂时无法获取实时天气"],
};

describe("trip schemas", () => {
  it("允许不完整的旅行需求草稿", () => {
    expect(
      tripRequestDraftSchema.parse({
        destinationCity: "厦门",
      }),
    ).toEqual({
      destinationCity: "厦门",
    });
  });

  it("接受字段完整且日期一致的旅行需求", () => {
    expect(tripRequestSchema.safeParse(validTripRequest).success).toBe(true);
  });

  it("拒绝缺少完整请求必填字段的数据", () => {
    const result = tripRequestSchema.safeParse({
      destinationCity: "厦门",
      days: 3,
    });

    expect(result.success).toBe(false);
  });

  it("拒绝零预算和负预算", () => {
    expect(
      tripRequestSchema.safeParse({
        ...validTripRequest,
        budget: 0,
      }).success,
    ).toBe(false);
    expect(
      tripRequestSchema.safeParse({
        ...validTripRequest,
        budget: -100,
      }).success,
    ).toBe(false);
  });

  it("拒绝零天数和负天数", () => {
    expect(
      tripRequestSchema.safeParse({
        ...validTripRequest,
        startDate: undefined,
        endDate: undefined,
        days: 0,
      }).success,
    ).toBe(false);
    expect(
      tripRequestSchema.safeParse({
        ...validTripRequest,
        startDate: undefined,
        endDate: undefined,
        days: -1,
      }).success,
    ).toBe(false);
  });

  it("拒绝超过 60 天的行程", () => {
    const result = tripRequestSchema.safeParse({
      ...validTripRequest,
      startDate: undefined,
      endDate: undefined,
      days: 61,
    });

    expect(result.success).toBe(false);
  });

  it("拒绝完整请求中日期和天数都缺失的数据", () => {
    const result = tripRequestSchema.safeParse({
      ...validTripRequest,
      startDate: undefined,
      endDate: undefined,
      days: undefined,
    });

    expect(result.success).toBe(false);
  });

  it("拒绝与日期区间不一致的天数", () => {
    const result = tripRequestSchema.safeParse({
      ...validTripRequest,
      days: 2,
    });

    expect(result.success).toBe(false);
  });

  it("接受符合正式结构的旅行方案", () => {
    expect(tripPlanSchema.safeParse(validTripPlan).success).toBe(true);
  });

  it("拒绝与旅行天数不一致的每日行程", () => {
    const result = tripPlanSchema.safeParse({
      ...validTripPlan,
      days: 2,
    });

    expect(result.success).toBe(false);
  });

  it("接受带 previousPlan 和 modificationRequest 的重新生成请求", () => {
    const result = generateTripRequestSchema.safeParse({
      tripRequest: validTripRequest,
      previousPlan: validTripPlan,
      modificationRequest: "第二天太满了，晚上留空一点。",
    });

    expect(result.success).toBe(true);
  });

  it("拒绝空 modificationRequest 或只带一半上下文的重新生成请求", () => {
    expect(
      generateTripRequestSchema.safeParse({
        tripRequest: validTripRequest,
        previousPlan: validTripPlan,
        modificationRequest: "",
      }).success,
    ).toBe(false);

    expect(
      generateTripRequestSchema.safeParse({
        tripRequest: validTripRequest,
        modificationRequest: "把第二天改轻一点。",
      }).success,
    ).toBe(false);
  });

  it("拒绝过长的 modificationRequest", () => {
    const result = generateTripRequestSchema.safeParse({
      tripRequest: validTripRequest,
      previousPlan: validTripPlan,
      modificationRequest: "太满了".repeat(400),
    });

    expect(result.success).toBe(false);
  });
});
