import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { InspectorPointDetailCard } from "../../components/workspace/InspectorPointDetailCard";
import type { DayRouteInsight } from "../../lib/trip/route-insight";

const insight: DayRouteInsight = {
  dayNumber: 2,
  dayTitle: "Walk Day",
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

describe("InspectorPointDetailCard", () => {
  it("没有 activePointId 时显示默认引导", () => {
    const markup = renderToStaticMarkup(
      <InspectorPointDetailCard insight={insight} activePointId={null} />,
    );

    expect(markup).toContain("点一下地图点位，或者右侧列表里的地点");
  });

  it("已确认点位会显示已定位说明", () => {
    const markup = renderToStaticMarkup(
      <InspectorPointDetailCard insight={insight} activePointId="resolved" />,
    );

    expect(markup).toContain("已定位");
    expect(markup).toContain("这个地点已经在地图里定位好了");
  });

  it("未确认点位会显示无法定位提示", () => {
    const markup = renderToStaticMarkup(
      <InspectorPointDetailCard insight={insight} activePointId="pending" />,
    );

    expect(markup).toContain("待确认");
    expect(markup).toContain("该地点暂未确认，无法在地图中定位");
  });

  it("未匹配到地图点时会显示稳定提示", () => {
    const markup = renderToStaticMarkup(
      <InspectorPointDetailCard
        insight={insight}
        activePointId={null}
        unmatchedPlaceName="酒店附近随便逛"
      />,
    );

    expect(markup).toContain("酒店附近随便逛");
    expect(markup).toContain("暂时没有匹配到地图点");
  });
});
