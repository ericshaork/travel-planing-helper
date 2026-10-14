import { vi } from "vitest";

vi.mock("server-only", () => ({}));

import { describe, expect, it } from "vitest";

import {
  buildGenerateTripPrompt,
  buildRegenerateTripPrompt,
  TRIP_PLAN_SYSTEM_PROMPT,
} from "../../lib/ai/prompts";
import type { TripPlan, TripRequest } from "../../lib/trip/types";

const tripRequest: TripRequest = {
  departureCity: "深圳",
  destinationCity: "厦门",
  days: 3,
  budget: 2500,
  currency: "CNY",
  interests: ["海边", "美食"],
  travelStyles: ["轻松"],
  mustVisitPlaces: [],
  avoidPlaces: [],
};

const tripPlan: TripPlan = {
  tripTitle: "厦门 3 天轻松玩",
  summary: "mock",
  destination: "厦门",
  days: 3,
  travelStyleSummary: "轻松",
  weatherSummary: {
    available: false,
    overview: "mock",
    dailyForecast: [],
    alerts: [],
    reminders: [],
    dataNote: "mock",
  },
  budgetSummary: {
    totalEstimate: "约 2500 元",
    transport: "800 元",
    hotel: "900 元",
    food: "400 元",
    tickets: "200 元",
    localTransport: "100 元",
    flexibleSpending: "100 元",
    note: "mock",
  },
  hotelAreaAdvice: [],
  transportAdvice: {
    summary: "mock",
    options: [
      {
        mode: "other",
        pros: ["省心"],
        cons: ["高峰会慢"],
        recommendation: "mock",
      },
    ],
    suggestedPlatforms: [],
    note: "mock",
  },
  dailyItinerary: [
    {
      day: 1,
      theme: "mock",
      routeOrder: ["沙坡尾"],
      routeReason: "mock",
      morning: [],
      afternoon: [],
      evening: [],
      dailyTips: [],
    },
    {
      day: 2,
      theme: "mock",
      routeOrder: ["八市"],
      routeReason: "mock",
      morning: [],
      afternoon: [],
      evening: [],
      dailyTips: [],
    },
    {
      day: 3,
      theme: "mock",
      routeOrder: ["中山路"],
      routeReason: "mock",
      morning: [],
      afternoon: [],
      evening: [],
      dailyTips: [],
    },
  ],
  generalTips: [],
  warnings: [],
};

describe("AI prompts", () => {
  it("有偏好摘要时会把中文偏好说明注入 generate prompt", () => {
    const prompt = buildGenerateTripPrompt({
      tripRequest,
      preferenceSummary:
        "用户长期默认偏好可作为参考：旅行节奏偏慢慢逛，会尽量少走路。如果本次计划偏好和长期默认偏好冲突，以本次计划填写内容为准。",
    });

    expect(prompt).toContain("偏好参考说明");
    expect(prompt).toContain("长期默认偏好");
    expect(prompt).not.toContain("hidden_gems");
    expect(prompt).not.toContain("defaultMode");
  });

  it("没有偏好摘要时不会额外注入该段落", () => {
    const prompt = buildGenerateTripPrompt({
      tripRequest,
    });

    expect(prompt).not.toContain("偏好参考说明");
  });

  it("generate prompt 注入 evidence pack 事实边界并禁止编造缺失事实", () => {
    const prompt = buildGenerateTripPrompt({
      tripRequest,
      evidencePromptSection:
        "- place: 深圳湾公园 | openingHours=待确认 | ticketInfo=待确认",
      evidenceWarnings: ["部分地点缺少开放时间，建议出行前确认。"],
    });

    expect(prompt).toContain("Data Hub Evidence Pack");
    expect(prompt).toContain("已知事实来自 evidence pack");
    expect(prompt).toContain("openingHours / ticketInfo / weather / route 如果缺失");
    expect(prompt).toContain("不允许编造开放时间、门票、交通耗时");
    expect(prompt).toContain("部分地点缺少开放时间");
  });

  it("重新生成时也会带上偏好参考说明", () => {
    const prompt = buildRegenerateTripPrompt({
      tripRequest,
      previousPlan: tripPlan,
      modificationRequest: "第二天轻松一点",
      preferenceSummary:
        "用户长期默认偏好可作为参考：优先交通便利。本次计划已经明确：本次更看重海边、美食。",
    });

    expect(prompt).toContain("偏好参考说明");
    expect(prompt).toContain("优先交通便利");
    expect(prompt).toContain("本次更看重海边、美食");
  });

  it("目的地未命中城市 inventory 时会给出通用真实地点约束提示", () => {
    const prompt = buildGenerateTripPrompt({ tripRequest });

    expect(prompt).toContain("当前目的地没有城市参考地点池");
    expect(prompt).not.toContain("参考地点池（优先在此选择");
  });

  it("目的地命中北京 inventory 时会注入城市参考地点池", () => {
    const beijingRequest: TripRequest = {
      ...tripRequest,
      destinationCity: "北京",
    };
    const prompt = buildGenerateTripPrompt({ tripRequest: beijingRequest });

    expect(prompt).toContain("北京 参考地点池");
    expect(prompt).toContain("故宫博物院");
    expect(prompt).toContain("景山公园");
    expect(prompt).toContain("角色:first_anchor");
  });

  it("Regenerate prompt 同样注入真实地点硬约束与城市池", () => {
    const beijingRequest: TripRequest = {
      ...tripRequest,
      destinationCity: "Beijing",
    };
    const prompt = buildRegenerateTripPrompt({
      tripRequest: beijingRequest,
      previousPlan: tripPlan,
      modificationRequest: "第二天多加一处本地美食",
    });

    expect(prompt).toContain("北京 参考地点池");
    expect(prompt).toContain("故宫博物院");
    expect(prompt).toContain("禁止泛化描述");
    expect(prompt).toContain("transportFromPrevious");
  });

  it("prompt 会把 tripRequest 展开成人类可读的用户需求段", () => {
    const xianRequest: TripRequest = {
      ...tripRequest,
      destinationCity: "西安",
      days: 3,
      budget: 3000,
      interests: ["历史文化", "美食"],
      travelStyles: ["情侣同行"],
      mustVisitPlaces: ["大雁塔"],
      avoidPlaces: ["兵马俑"],
    };
    const prompt = buildGenerateTripPrompt({ tripRequest: xianRequest });

    // humanized sections
    expect(prompt).toContain("用户旅行需求");
    expect(prompt).toContain("目的地：西安");
    expect(prompt).toContain("天数：3 天");
    expect(prompt).toContain(
      "兴趣（按优先级）：历史文化 → 美食",
    );
    expect(prompt).toContain("出行风格 / 同行人：情侣同行");
    expect(prompt).toContain(
      "必去地点（mustVisitPlaces，务必作为黄金档 block 出现）：大雁塔",
    );
    expect(prompt).toContain(
      "明确要避开的地点（avoidPlaces，硬红线，一次都不允许出现）：兵马俑",
    );

    // quality clauses
    expect(prompt).toContain(
      "avoidPlaces 里的地点是硬红线",
    );
    expect(prompt).toContain(
      "mustVisitPlaces 里的每个地点都必须作为核心",
    );
    expect(prompt).toContain(
      "至少 60% 的 attraction/food/experience block 的 matchedInterests",
    );
    expect(prompt).toContain(
      "禁止「特色餐厅」「当地小巷」「附近景点」「城市漫步」「文化体验」这类占位式描述",
    );

    // 原始 JSON 仍作为参考出现在最后
    expect(prompt).toContain("原始结构化 TripRequest");
    expect(prompt).toContain('"destinationCity":"西安"');
    expect(prompt).toContain('"avoidPlaces":["兵马俑"]');
  });

  it("system prompt 把用户信号硬约束和每日行程质量硬约束都写进去了", () => {
    expect(TRIP_PLAN_SYSTEM_PROMPT).toContain("用户信号硬约束");
    expect(TRIP_PLAN_SYSTEM_PROMPT).toContain(
      "avoidPlaces 中的每一个地名都是硬红线",
    );
    expect(TRIP_PLAN_SYSTEM_PROMPT).toContain(
      "mustVisitPlaces 中的每一个地名都必须作为核心",
    );
    expect(TRIP_PLAN_SYSTEM_PROMPT).toContain("每日行程质量硬约束");
    expect(TRIP_PLAN_SYSTEM_PROMPT).toContain(
      "默认每天生成上午 1 + 下午 1 + 晚上 1 共 3 个 block",
    );
    expect(TRIP_PLAN_SYSTEM_PROMPT).toContain(
      "禁止只写「体验当地文化」「感受城市氛围」「适合放松」这类空话",
    );
    expect(TRIP_PLAN_SYSTEM_PROMPT).toContain("已知事实只能来自 evidence pack");
    expect(TRIP_PLAN_SYSTEM_PROMPT).toContain("不得编造开放时间、门票、路线耗时");
  });
});
