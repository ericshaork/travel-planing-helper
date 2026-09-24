import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("@/components/auth/useAuthStatus", () => ({
  useAuthStatus: () => ({
    status: "authenticated",
    user: { id: "user-1", email: "user@example.com" },
    error: null,
  }),
}));

vi.mock("@/lib/projects/session", () => ({
  getProjectSession: vi.fn(),
}));

import { SaveStatus } from "../../components/workspace/SaveStatus";
import { getProjectSession } from "../../lib/projects/session";
import type { TripPlan, TripRequest } from "../../lib/trip/types";

const mockedGetProjectSession = vi.mocked(getProjectSession);

const tripRequest: TripRequest = {
  departureCity: "深圳",
  destinationCity: "厦门",
  days: 3,
  budget: 2500,
  currency: "CNY",
  interests: ["海边"],
  travelStyles: ["轻松"],
  mustVisitPlaces: [],
  avoidPlaces: [],
};

const tripPlan: TripPlan = {
  tripTitle: "厦门 3 天慢慢玩",
  summary: "一版适合慢节奏海边散步的计划。",
  destination: "厦门",
  days: 3,
  travelStyleSummary: "轻松",
  weatherSummary: {
    available: false,
    overview: "暂无实时天气。",
    dailyForecast: [],
    alerts: [],
    reminders: [],
    dataNote: "测试数据。",
  },
  budgetSummary: {
    totalEstimate: "约 2500 元",
    transport: "800 元",
    hotel: "900 元",
    food: "400 元",
    tickets: "200 元",
    localTransport: "100 元",
    flexibleSpending: "100 元",
    note: "测试数据。",
  },
  hotelAreaAdvice: [],
  transportAdvice: {
    summary: "按需选择交通方式。",
    options: [
      {
        mode: "other",
        pros: ["灵活"],
        cons: ["需要自行确认"],
        recommendation: "出发前确认班次。",
      },
    ],
    suggestedPlatforms: [],
    note: "测试数据。",
  },
  dailyItinerary: [
    {
      day: 1,
      theme: "海边慢逛",
      routeOrder: ["沙坡尾"],
      routeReason: "先安排轻松的城市漫步。",
      morning: [],
      afternoon: [],
      evening: [],
      dailyTips: [],
    },
  ],
  generalTips: [],
  warnings: [],
};

describe("SaveStatus legacy boundary", () => {
  beforeEach(() => {
    mockedGetProjectSession.mockReset();
  });

  it("uses project version saving when projectId and versionId are available", () => {
    mockedGetProjectSession.mockReturnValue({
      projectId: "project-1",
      versionId: "version-2",
      sourceType: "ai_prompt",
      flowStage: "workspace_ready",
      updatedAt: "2026-07-23T10:00:00.000Z",
    });

    const markup = renderToStaticMarkup(
      <SaveStatus tripPlan={tripPlan} tripRequest={tripRequest} />,
    );

    expect(markup).toContain("保存新版本");
    expect(markup).toContain("当前版本");
    expect(markup).not.toContain("保存计划");
  });

  it("falls back to legacy trip_plans saving only without project version context", () => {
    mockedGetProjectSession.mockReturnValue(null);

    const markup = renderToStaticMarkup(
      <SaveStatus tripPlan={tripPlan} tripRequest={tripRequest} />,
    );

    expect(markup).toContain("保存计划");
    expect(markup).not.toContain("保存新版本");
  });
});
