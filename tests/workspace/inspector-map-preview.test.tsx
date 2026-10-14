import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { InspectorMapPreview } from "../../components/workspace/InspectorMapPreview";
import type { DayRouteInsight } from "../../lib/trip/route-insight";

const unresolvedOnlyInsight: DayRouteInsight = {
  dayNumber: 2,
  dayTitle: "Old Town Day",
  date: "2026-07-10",
  routeSummary: undefined,
  weatherImpacts: [],
  mapPoints: [
    {
      id: "pending-1",
      name: "老街散步",
      dayIndex: 2,
      slot: "afternoon",
      itemIndex: 0,
      itemType: "free_time",
      resolved: false,
    },
  ],
};

describe("InspectorMapPreview", () => {
  it("全是 unresolved 点位时仍会保留清晰的待确认信息", () => {
    const markup = renderToStaticMarkup(
      <InspectorMapPreview insight={unresolvedOnlyInsight} />,
    );

    expect(markup).toContain("地图加载中");
    expect(markup).toContain("不影响行程阅读");
  });

  it("loading 时会显示稳定占位，不影响其他模块理解", () => {
    const markup = renderToStaticMarkup(<InspectorMapPreview loading />);

    expect(markup).toContain("animate-pulse");
    expect(markup).toContain("linear-gradient");
  });
});
