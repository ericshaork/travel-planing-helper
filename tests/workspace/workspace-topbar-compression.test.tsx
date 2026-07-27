import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { DesktopWorkspaceShell } from "../../components/workspace/DesktopWorkspaceShell";
import { WorkspaceTopBar } from "../../components/workspace/WorkspaceTopBar";
import type { DayCabinetView } from "../../lib/trip/itinerary-view";
import type { TripPlan, TripRequest } from "../../lib/trip/types";

const samplePlan = {
  tripTitle: "成都 3 天烟火气路线",
  summary: "茶馆、街巷和火锅串成一版不赶路的行程。",
  destination: "成都",
  days: 3,
  travelStyleSummary: "轻松慢游",
  weatherSummary: {
    available: false,
    overview: "建议出行前再看天气。",
    dailyForecast: [],
    alerts: [],
    reminders: [],
    dataNote: "测试数据",
  },
  budgetSummary: {
    totalEstimate: "3000 元",
    transport: "按实际出发地确认",
    hotel: "舒适型住宿",
    food: "以街巷小吃和正餐为主",
    tickets: "少量门票",
    localTransport: "地铁和步行",
    flexibleSpending: "留一点机动预算",
    note: "测试数据",
  },
  hotelAreaAdvice: [],
  transportAdvice: {
    summary: "市内以地铁和步行为主。",
    options: [],
    suggestedPlatforms: [],
    note: "测试数据",
  },
  dailyItinerary: [],
  generalTips: [],
  warnings: [],
} satisfies TripPlan;

const sampleRequest = {
  departureCity: "深圳",
  destinationCity: "成都",
  startDate: "2026-09-01",
  endDate: "2026-09-03",
  days: 3,
  budget: 3000,
  currency: "CNY",
  interests: ["美食", "城市漫步"],
  travelStyles: ["轻松"],
  mustVisitPlaces: [],
  avoidPlaces: [],
} satisfies TripRequest;

const activeCabinet = {
  dayNumber: 2,
  theme: "茶馆和街巷",
} as DayCabinetView;

describe("Workspace top bar compression", () => {
  it("keeps the plan identity, save action, mode switch, and compact actions visible", () => {
    const markup = renderToStaticMarkup(
      <WorkspaceTopBar
        tripPlan={samplePlan}
        tripRequest={sampleRequest}
        activeCabinet={activeCabinet}
        enrichmentState="ready"
        workspaceMode="read"
        onWorkspaceModeChange={vi.fn()}
        onFocusExport={vi.fn()}
        onFocusRegenerate={vi.fn()}
        saveAction={<button type="button">保存计划</button>}
      />,
    );

    expect(markup).toContain("成都 3 天烟火气路线");
    expect(markup).toContain("旅行档案");
    expect(markup).toContain("路线洞察已加载");
    expect(markup).toContain("第 2 天");
    expect(markup).toContain("阅读");
    expect(markup).toContain("编辑");
    expect(markup).toContain("地图探索");
    expect(markup).toContain("保存计划");
    expect(markup).toContain("AI 调整");
    expect(markup).toContain("分享");
  });

  it("still renders the left plan area, right map area, and split handle", () => {
    const markup = renderToStaticMarkup(
      <DesktopWorkspaceShell
        topBar={<div>顶部工具栏</div>}
        main={<section>左侧计划</section>}
        inspector={<aside>右侧地图</aside>}
      />,
    );

    expect(markup).toContain("顶部工具栏");
    expect(markup).toContain("左侧计划");
    expect(markup).toContain("右侧地图");
    expect(markup).toContain("拖动调整计划和地图宽度");
  });
});
