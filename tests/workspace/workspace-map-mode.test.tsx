import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { MapStudio } from "../../components/map-studio/MapStudio";
import { WorkspaceTopBar } from "../../components/workspace/WorkspaceTopBar";
import { buildMapProjectFromTripPlan } from "../../lib/map-studio/trip-adapter";
import type { TripPlan, TripRequest } from "../../lib/trip/types";

const tripRequest: TripRequest = {
  departureCity: "深圳",
  destinationCity: "杭州",
  days: 1,
  budget: 1500,
  currency: "CNY",
  interests: ["城市漫步"],
  travelStyles: ["轻松"],
  mustVisitPlaces: [],
  avoidPlaces: [],
};

const tripPlan: TripPlan = {
  tripTitle: "杭州 1 天轻松走",
  summary: "湖边慢慢走。",
  destination: "杭州",
  days: 1,
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
    totalEstimate: "约 1500 元",
    transport: "500 元",
    hotel: "500 元",
    food: "250 元",
    tickets: "100 元",
    localTransport: "80 元",
    flexibleSpending: "70 元",
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
      theme: "湖边慢慢走",
      routeOrder: [],
      routeReason: "还没有正式安排。",
      morning: [],
      afternoon: [],
      evening: [],
      dailyTips: [],
    },
  ],
  generalTips: [],
  warnings: [],
};

function countOccurrences(source: string, pattern: string) {
  return source.split(pattern).length - 1;
}

describe("Workspace Map Mode boundary", () => {
  it("top bar exposes Map Mode as an active selectable mode", () => {
    const markup = renderToStaticMarkup(
      <WorkspaceTopBar
        tripPlan={tripPlan}
        tripRequest={tripRequest}
        workspaceMode="map"
        onWorkspaceModeChange={vi.fn()}
      />,
    );

    expect(markup).toContain("地图探索");
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).not.toContain("地图探索会在 2.0 开放");
    expect(markup).not.toContain("disabled");
  });

  it("renders the Phase 1 Map Studio shell without using the inspector layout", () => {
    const mapProject = buildMapProjectFromTripPlan({ tripPlan, tripRequest });
    const markup = renderToStaticMarkup(
      <MapStudio
        tripPlan={tripPlan}
        tripRequest={tripRequest}
        mapProject={mapProject}
        onWorkspaceModeChange={vi.fn()}
      />,
    );

    expect(markup).toContain("Map Studio");
    expect(markup).toContain("地图探索");
    expect(markup).toContain("图层");
    expect(markup).toContain("天数");
    expect(markup).toContain("预算");
    expect(markup).toContain("版本");
    expect(markup).toContain("城市");
    expect(markup).toContain("返回");
    expect(markup).toContain("工作台");
    expect(markup).toContain("行程");
    expect(markup).toContain('data-testid="map-studio-nav-workspace"');
    expect(markup).toContain('href="/workspace"');
    expect(markup).toContain('data-testid="map-studio-nav-back"');
    expect(markup).toContain('href="/explore"');
    expect(markup).toContain('data-testid="map-studio-nav-itinerary"');
    expect(markup).toContain('href="/trips"');
    expect(markup).toContain('data-testid="map-studio-nav-settings"');
    expect(markup).toContain('href="/settings"');
    expect(markup).toContain('aria-label="用户主页头像"');
    expect(markup).toContain('aria-label="区域"');
    expect(markup).toContain('aria-label="地点"');
    expect(markup).toContain('aria-label="筛选"');
    expect(countOccurrences(markup, 'aria-label="筛选"')).toBe(1);
    expect(countOccurrences(markup, 'aria-label="图层"')).toBe(1);
    expect(markup).not.toContain('aria-label="收藏"');
    expect(markup).not.toContain('aria-label="餐饮"');
    expect(markup).not.toContain('aria-label="住宿"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain("展开行程");
    expect(markup).toContain("pointer-events-none max-h-0");
    expect(markup).toContain('aria-label="Day 1"');
    expect(markup).toContain('aria-label="+候选"');
    expect(markup).toContain('aria-label="写入"');
    expect(markup).toContain('aria-label="撤销"');
    expect(markup).not.toContain("重做");
    expect(markup).toContain('aria-label="导入"');
    expect(markup).toContain('aria-label="放大"');
    expect(markup).toContain('aria-label="帮助"');
    expect(markup).toContain("点击区域查看详情");
    expect(markup).not.toContain('aria-label="图层抽屉"');
    expect(markup).not.toContain('aria-label="筛选抽屉"');
    expect(markup).not.toContain("LAYER");
    expect(markup).not.toContain("FILTER");
    expect(markup).not.toContain("当前地图档案");
    expect(markup).not.toContain("类型筛选");
    expect(markup).not.toContain("区域详情");
    expect(markup).not.toContain("地点详情");
    expect(markup).not.toContain("候选清单与写回操作条");
    expect(markup).not.toContain("确认写入行程");
    expect(markup).not.toContain("取消写回");
    expect(markup).not.toContain("Batch 5：点击区域会高亮");
    expect(markup).not.toContain("target_full_ui_mockup.png");
    expect(markup).not.toContain("top_full_hud.png");
    expect(markup).not.toContain("top_function_button_row.png");
    expect(markup).not.toContain("right_vertical_toolbar_full.png");
    expect(markup).not.toContain("bottom_command_bar_full.png");
    expect(markup).not.toContain("bottom_action_button_row.png");
    expect(markup).not.toContain("bottom_empty_candidate_slots.png");
  });
});
