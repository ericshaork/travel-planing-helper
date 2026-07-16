import { vi } from "vitest";

vi.mock("server-only", () => ({}));

import { describe, expect, it } from "vitest";

import {
  buildGenerateTripPrompt,
  buildRegenerateTripPrompt,
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
});
