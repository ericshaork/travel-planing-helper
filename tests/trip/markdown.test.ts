import { describe, expect, it } from "vitest";

import {
  toTripMarkdown,
  tripPlanMarkdownFilename,
} from "../../lib/trip/markdown";
import { tripPlanSchema } from "../../lib/trip/schema";

const tripPlan = tripPlanSchema.parse({
  tripTitle: "厦门三天：海边 / 美食",
  summary: "按片区走，给吃饭和休息留出时间。",
  destination: "厦门",
  days: 1,
  travelStyleSummary: "节奏轻松，不安排早起。",
  weatherSummary: {
    available: false,
    overview: "未接入实时天气，先按通用方案安排。",
    dailyForecast: [],
    alerts: [],
    reminders: ["出发前再看一次天气"],
    dataNote: "当前没有使用实时天气数据。",
  },
  budgetSummary: {
    totalEstimate: "约 2500 元",
    transport: "约 700 元",
    hotel: "约 800 元",
    food: "约 450 元",
    tickets: "约 200 元",
    localTransport: "约 150 元",
    flexibleSpending: "约 200 元",
    note: "预算仅为估算。",
  },
  dailyItinerary: [
    {
      day: 1,
      date: "2026-07-10",
      theme: "海边和城市散步",
      routeOrder: ["酒店", "沙坡尾", "环岛路"],
      routeReason: "同一片区移动更少。",
      morning: [
        {
          timeLabel: "09:30",
          placeName: "沙坡尾",
          type: "attraction",
          reason: "先逛街区，上午没那么晒。",
          suggestedDuration: "2 小时",
          guide: ["先沿避风坞散步", "开放状态出发前确认"],
          transportFromPrevious: "从酒店打车或坐公交前往。",
          weatherImpact: "下雨就缩短户外停留。",
          backupPlan: "改去附近室内展馆。",
        },
      ],
      afternoon: [],
      evening: [],
      dailyTips: ["这天别安排太满"],
    },
  ],
  hotelAreaAdvice: [
    {
      area: "思明区",
      reason: "主要活动片区比较集中。",
      suitableFor: "第一次来厦门的人",
      transportationConvenience: "公交和打车都方便。",
      possibleDownside: "热门日期可能较吵。",
      suggestedPlatforms: ["携程"],
    },
  ],
  transportAdvice: {
    summary: "从深圳出发可以先比较高铁。",
    options: [
      {
        mode: "high_speed_rail",
        pros: ["市区往返方便"],
        cons: ["热门日期需要提前购票"],
        recommendation: "通过 12306 核实班次和票价。",
      },
    ],
    suggestedPlatforms: ["12306"],
    note: "不代表实时票价或余票。",
  },
  generalTips: ["门票和开放时间请通过官方渠道确认"],
  warnings: ["暂时无法获取实时天气"],
});

describe("trip markdown", () => {
  it("从 TripPlan 生成结构完整的 Markdown", () => {
    const markdown = toTripMarkdown(tripPlan);

    expect(markdown).toContain("# 厦门三天：海边 / 美食");
    expect(markdown).toContain("## 旅行总览");
    expect(markdown).toContain("## 天气提醒");
    expect(markdown).toContain("## 预算摘要（估算）");
    expect(markdown).toContain("## 每日行程");
    expect(markdown).toContain("## Day 1｜海边和城市散步");
    expect(markdown).toContain("#### 09:30｜沙坡尾");
    expect(markdown).toContain("## 住宿区域建议");
    expect(markdown).toContain("## 交通建议");
    expect(markdown).toContain("## 注意事项");
    expect(markdown).toContain("不代表实时票价");
    expect(markdown.endsWith("\n")).toBe(true);
  });

  it("下载文件名会移除 Windows 不允许的字符", () => {
    const filename = tripPlanMarkdownFilename(tripPlan);

    expect(filename).toBe("厦门三天-海边-美食.md");
    expect(filename).not.toMatch(/[<>:"/\\|?*]/);
  });
});
