import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { InspectorPointDetailCard } from "../../components/workspace/InspectorPointDetailCard";
import type { DayCabinetView } from "../../lib/trip/itinerary-view";
import type { DayRouteInsight } from "../../lib/trip/route-insight";

const insight: DayRouteInsight = {
  dayNumber: 2,
  dayTitle: "海边散步",
  date: "2026-07-09",
  routeSummary: undefined,
  weatherImpacts: [],
  mapPoints: [
    {
      id: "resolved",
      name: "沙坡尾",
      dayIndex: 2,
      slot: "evening",
      itemIndex: 0,
      itemType: "attraction",
      coordinates: { lat: 24.4377, lng: 118.0811 },
      resolved: true,
      provider: "amap",
      address: "思明区沙坡尾",
    },
    {
      id: "pending",
      name: "老街散步",
      dayIndex: 2,
      slot: "afternoon",
      itemIndex: 1,
      itemType: "free_time",
      resolved: false,
      warning: "地点名称还不够具体。",
    },
  ],
};

const cabinet: DayCabinetView = {
  dayNumber: 2,
  date: "2026-07-09",
  theme: "海边散步",
  routeOrder: ["沙坡尾"],
  routeSummary: "沙坡尾",
  routeReason: "慢慢逛",
  dailyTips: [],
  itemCount: 1,
  itinerary: {
    day: 2,
    theme: "海边散步",
    routeOrder: ["沙坡尾"],
    routeReason: "慢慢逛",
    morning: [],
    afternoon: [],
    evening: [
      {
        placeName: "沙坡尾",
        type: "attraction",
        reason: "傍晚散步和看海最合适。",
      },
    ],
    dailyTips: [],
  },
  slots: [
    { id: "morning", key: "morning", label: "上午", isEmpty: true, items: [] },
    { id: "afternoon", key: "afternoon", label: "下午", isEmpty: true, items: [] },
    {
      id: "evening",
      key: "evening",
      label: "晚上",
      isEmpty: false,
      items: [
        {
          ref: {
            day: 2,
            slot: "evening",
            slotId: "evening",
            itemIndex: 0,
            placeName: "沙坡尾",
            type: "attraction",
          },
          item: {
            placeName: "沙坡尾",
            type: "attraction",
            reason: "傍晚散步和看海最合适。",
          },
        },
      ],
    },
  ],
};

const baseProps = {
  workspaceMode: "edit" as const,
  slotOptions: cabinet.slots,
  distanceTargetPointId: "",
  distanceLoading: false,
  resolvedPoints: insight.mapPoints,
  onTargetSlotChange: vi.fn(),
  onAddSelectedPlace: vi.fn(),
  onDistanceTargetChange: vi.fn(),
  onEstimateDistance: vi.fn(),
};

describe("InspectorPointDetailCard", () => {
  it("没有选中地点时显示默认引导", () => {
    const markup = renderToStaticMarkup(
      <InspectorPointDetailCard {...baseProps} insight={insight} activePointId={null} />,
    );

    expect(markup).toContain("当前地点");
    expect(markup).toContain("选左侧事件积木，或点地图 marker 查看当前地点。");
  });

  it("已定位地点会展示类型、地址和备注", () => {
    const markup = renderToStaticMarkup(
      <InspectorPointDetailCard
        {...baseProps}
        insight={insight}
        activeCabinet={cabinet}
        activePointId="resolved"
      />,
    );

    expect(markup).toContain("沙坡尾");
    expect(markup).toContain("已定位");
    expect(markup).toContain("景点");
    expect(markup).toContain("思明区沙坡尾");
    expect(markup).toContain("傍晚散步和看海最合适。");
  });

  it("未确认地点会展示待确认和 warning", () => {
    const markup = renderToStaticMarkup(
      <InspectorPointDetailCard {...baseProps} insight={insight} activePointId="pending" />,
    );

    expect(markup).toContain("待确认");
    expect(markup).toContain("地点名称还不够具体。");
  });

  it("未匹配到地图点位时会显示稳定提示", () => {
    const markup = renderToStaticMarkup(
      <InspectorPointDetailCard
        {...baseProps}
        insight={insight}
        activePointId={null}
        unmatchedPlaceName="酒店附近随便逛"
      />,
    );

    expect(markup).toContain("酒店附近随便逛");
    expect(markup).toContain("还没有匹配到地图坐标");
  });
});
