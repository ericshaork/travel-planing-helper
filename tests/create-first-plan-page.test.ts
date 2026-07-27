import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildDaySlotViews } from "../components/create/FirstPlanPage";
import type { DailyItinerary, ItineraryItem } from "../lib/trip/types";

function makeItem(overrides: Partial<ItineraryItem> = {}): ItineraryItem {
  return {
    placeName: "占位地点",
    type: "attraction",
    reason: "占位理由",
    guide: [],
    ...overrides,
  };
}

function makeDay(overrides: Partial<DailyItinerary> = {}): DailyItinerary {
  return {
    day: 1,
    theme: "皇城初印象",
    routeOrder: [],
    routeReason: "全天顺着中轴线走。",
    morning: [],
    afternoon: [],
    evening: [],
    dailyTips: [],
    ...overrides,
  };
}

describe("buildDaySlotViews", () => {
  it("返回按上午/下午/晚上顺序排布的 3 个槽位", () => {
    const slots = buildDaySlotViews(makeDay());
    expect(slots.map((slot) => slot.key)).toEqual([
      "morning",
      "afternoon",
      "evening",
    ]);
    expect(slots.map((slot) => slot.label)).toEqual(["上午", "下午", "晚上"]);
  });

  it("每个槽位取第一项作为 primary，其余进 extras", () => {
    const morning = [
      makeItem({ placeName: "西安城墙", suggestedDuration: "约 2 小时" }),
      makeItem({ placeName: "备选：钟楼", suggestedDuration: "约 30 分钟" }),
    ];
    const afternoon = [
      makeItem({ placeName: "陕西历史博物馆", suggestedDuration: "约 2.5 小时" }),
    ];
    const evening = [
      makeItem({ placeName: "老米家肉丸胡辣汤", suggestedDuration: "约 1 小时" }),
    ];

    const [morningSlot, afternoonSlot, eveningSlot] = buildDaySlotViews(
      makeDay({ morning, afternoon, evening }),
    );

    expect(morningSlot.primary?.placeName).toBe("西安城墙");
    expect(morningSlot.extras.map((extra) => extra.placeName)).toEqual([
      "备选：钟楼",
    ]);
    expect(afternoonSlot.primary?.placeName).toBe("陕西历史博物馆");
    expect(afternoonSlot.extras).toEqual([]);
    expect(eveningSlot.primary?.placeName).toBe("老米家肉丸胡辣汤");
  });

  it("槽位为空时 primary 为 null 而不是 undefined", () => {
    const [, , eveningSlot] = buildDaySlotViews(
      makeDay({ morning: [makeItem()], afternoon: [], evening: [] }),
    );
    expect(eveningSlot.primary).toBeNull();
    expect(eveningSlot.extras).toEqual([]);
  });

  it("primary 保留原始 suggestedDuration / reason / transportFromPrevious 字段供渲染使用", () => {
    const item = makeItem({
      placeName: "陕西历史博物馆",
      suggestedDuration: "约 2.5 小时",
      reason: "首日建立西安历史脉络，命中「历史文化」兴趣。",
      transportFromPrevious: "地铁 2 号线约 25 分钟",
      matchedInterests: ["历史文化"],
    });
    const [, afternoonSlot] = buildDaySlotViews(
      makeDay({ afternoon: [item] }),
    );

    expect(afternoonSlot.primary?.suggestedDuration).toBe("约 2.5 小时");
    expect(afternoonSlot.primary?.reason).toContain("历史文化");
    expect(afternoonSlot.primary?.transportFromPrevious).toBe(
      "地铁 2 号线约 25 分钟",
    );
    expect(afternoonSlot.primary?.matchedInterests).toEqual(["历史文化"]);
  });
});
