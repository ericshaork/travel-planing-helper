import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { WorkspaceDayPanel } from "../../components/workspace/WorkspaceDayPanel";
import type { DayCabinetView } from "../../lib/trip/itinerary-view";
import type { DayRouteInsight } from "../../lib/trip/route-insight";
import { getItineraryBlockId } from "../../lib/trip/map-point-match";

const cabinet: DayCabinetView = {
  dayNumber: 2,
  date: "2026-07-10",
  theme: "老城逛吃",
  routeOrder: ["中山路步行街", "八市海鲜市场"],
  routeSummary: "中山路步行街 → 八市海鲜市场",
  routeReason: "下午和晚上都顺路",
  dailyTips: [],
  itemCount: 2,
  itinerary: {
    day: 2,
    date: "2026-07-10",
    theme: "老城逛吃",
    routeOrder: ["中山路步行街", "八市海鲜市场"],
    routeReason: "下午和晚上都顺路",
    morning: [],
    afternoon: [
      {
        placeName: "中山路步行街",
        type: "shopping",
        reason: "下午慢慢逛",
        guide: [],
      },
    ],
    evening: [
      {
        placeName: "八市海鲜市场",
        type: "food",
        reason: "晚上去吃海鲜",
        guide: [],
      },
    ],
    dailyTips: [],
  },
  slots: [
    {
      key: "morning",
      label: "上午",
      items: [],
      isEmpty: true,
    },
    {
      key: "afternoon",
      label: "下午",
      items: [
        {
          ref: {
            day: 2,
            slot: "afternoon",
            itemIndex: 0,
            placeName: "中山路步行街",
            type: "shopping",
          },
          item: {
            placeName: "中山路步行街",
            type: "shopping",
            reason: "下午慢慢逛",
            guide: [],
          },
        },
      ],
      isEmpty: false,
    },
    {
      key: "evening",
      label: "晚上",
      items: [
        {
          ref: {
            day: 2,
            slot: "evening",
            itemIndex: 0,
            placeName: "八市海鲜市场",
            type: "food",
          },
          item: {
            placeName: "八市海鲜市场",
            type: "food",
            reason: "晚上去吃海鲜",
            guide: [],
          },
        },
      ],
      isEmpty: false,
    },
  ],
};

const insight: DayRouteInsight = {
  dayNumber: 2,
  dayTitle: "老城逛吃",
  date: "2026-07-10",
  routeSummary: undefined,
  weatherImpacts: [],
  mapPoints: [
    {
      id: "point-1",
      name: "中山路步行街",
      dayIndex: 2,
      slot: "afternoon",
      itemIndex: 0,
      itemType: "shopping",
      resolved: true,
    },
    {
      id: "point-2",
      name: "八市海鲜市场",
      dayIndex: 2,
      slot: "evening",
      itemIndex: 0,
      itemType: "food",
      resolved: false,
    },
  ],
};

describe("WorkspaceDayPanel map selection state", () => {
  it("会把 active block 显示成 selected，并展示 map status", () => {
    const activeBlockId = getItineraryBlockId(cabinet.slots[1]!.items[0]!);
    const markup = renderToStaticMarkup(
      <WorkspaceDayPanel
        cabinet={cabinet}
        insight={insight}
        activeBlockId={activeBlockId}
      />,
    );

    expect(markup).toContain('data-selected="true"');
    expect(markup).toContain("已定位");
    expect(markup).toContain("待确认");
  });
});
