import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { MapStudioRouteDraftPanel } from "../../components/map-studio/MapStudioRouteDraftPanel";
import type { BasicRouteDraft } from "../../src/lib/data-hub/planningTypes";

const draft: BasicRouteDraft = {
  days: [
    {
      dayNumber: 1,
      title: "Day 1 · 深圳湾周边",
      slots: [
        {
          placeId: "place-1",
          name: "深圳湾公园",
          startTime: "09:00",
          endTime: "10:30",
          recommendedDurationMinutes: 90,
          routeFromPrevious: null,
          reason: "作为当天起点，同区域优先安排。",
          warnings: ["开放时间暂缺，规划时未按实时开放状态过滤。"],
          sourceSummary: [
            {
              provider: "amap",
              fieldName: "base",
              confidence: 0.8,
              fetchedAt: "2026-09-30T00:00:00.000Z",
            },
          ],
        },
        {
          placeId: "place-2",
          name: "海上世界",
          startTime: "11:30",
          endTime: "13:00",
          recommendedDurationMinutes: 90,
          routeFromPrevious: {
            distanceMeters: 1200,
            durationSeconds: 900,
            provider: "amap",
            confidence: 0.7,
          },
          reason: "根据地理聚类和前后路线耗时排在第 2 站。",
          warnings: [],
          sourceSummary: [
            {
              provider: "wikimedia",
              fieldName: "intro",
              confidence: 0.6,
              fetchedAt: "2026-09-30T00:00:00.000Z",
            },
          ],
        },
      ],
      totalTravelTimeSeconds: 900,
      missingFields: [],
      feasibilityWarnings: ["深圳湾公园：开放时间暂缺，规划时未按实时开放状态过滤。"],
    },
  ],
  unresolved: [],
  evidence: [
    {
      placeId: "place-1",
      sourceType: "data_hub_basic_route_planner",
      sourceId: "amap-place-1",
      reason: "按区域聚类作为当天起点。",
    },
  ],
  missingFields: [],
  warnings: [],
};

describe("MapStudioRouteDraftPanel", () => {
  it("渲染规划 preview，确认前不覆盖正式行程", () => {
    const onConfirm = vi.fn();
    const markup = renderToStaticMarkup(
      <MapStudioRouteDraftPanel
        status="success"
        draft={draft}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    expect(markup).toContain("基础路线预览");
    expect(markup).toContain("深圳湾公园");
    expect(markup).toContain("海上世界");
    expect(markup).toContain("确认前不会覆盖正式行程");
    expect(markup).toContain("确认写入");
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
