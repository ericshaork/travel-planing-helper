import { describe, expect, it } from "vitest";

import {
  findMatchingMapPoint,
  getItineraryBlockId,
  getItineraryBlockMapStatus,
  getMapPointBlockId,
  isGenericNonPoiPlace,
  normalizeMapPointName,
} from "../../lib/trip/map-point-match";
import type { MapPoint } from "../../lib/trip/enrichment-types";
import type { ItineraryBlockView } from "../../lib/trip/itinerary-view";

const sampleMapPoints: MapPoint[] = [
  {
    id: "poi-1",
    name: "中山路步行街",
    dayIndex: 2,
    slot: "afternoon",
    itemIndex: 1,
    itemType: "shopping",
    resolved: true,
  },
  {
    id: "poi-2",
    name: "八市 海鲜市场",
    dayIndex: 2,
    slot: "evening",
    itemIndex: 0,
    itemType: "food",
    resolved: false,
  },
  {
    id: "poi-3",
    name: "中山路步行街",
    dayIndex: 3,
    slot: "afternoon",
    itemIndex: 0,
    itemType: "shopping",
    resolved: true,
  },
];

function createBlock(
  overrides: Partial<ItineraryBlockView> = {},
): ItineraryBlockView {
  return {
    ref: {
      day: 2,
      slot: "afternoon",
      itemIndex: 1,
      placeName: "中山路步行街",
      type: "shopping",
      ...(overrides.ref ?? {}),
    },
    item: {
      placeName: "中山路步行街",
      type: "shopping",
      reason: "慢慢逛",
      guide: [],
      ...(overrides.item ?? {}),
    },
  };
}

describe("map point match helpers", () => {
  it("优先按 day + slot + placeName 匹配", () => {
    const match = findMatchingMapPoint(createBlock(), sampleMapPoints);

    expect(match?.id).toBe("poi-1");
  });

  it("支持规范化后的 placeName 匹配", () => {
    const match = findMatchingMapPoint(
      createBlock({
        ref: {
          day: 2,
          slot: "evening",
          itemIndex: 0,
          placeName: "八市（海鲜市场）",
          type: "food",
        },
        item: {
          placeName: "八市（海鲜市场）",
          type: "food",
          reason: "去吃海鲜",
          guide: [],
        },
      }),
      sampleMapPoints,
    );

    expect(match?.id).toBe("poi-2");
  });

  it("泛化 item 不会强行匹配地图点", () => {
    const match = findMatchingMapPoint(
      createBlock({
        ref: {
          day: 2,
          slot: "afternoon",
          itemIndex: 0,
          placeName: "午餐",
          type: "food",
        },
        item: {
          placeName: "午餐",
          type: "food",
          reason: "先吃一点",
          guide: [],
        },
      }),
      sampleMapPoints,
    );

    expect(match).toBeNull();
  });

  it("未确认点位会返回 unresolved 状态", () => {
    const status = getItineraryBlockMapStatus(
      createBlock({
        ref: {
          day: 2,
          slot: "evening",
          itemIndex: 0,
          placeName: "八市（海鲜市场）",
          type: "food",
        },
        item: {
          placeName: "八市（海鲜市场）",
          type: "food",
          reason: "去吃海鲜",
          guide: [],
        },
      }),
      sampleMapPoints,
    );

    expect(status).toBe("unresolved");
  });

  it("找不到匹配时返回 unmatched", () => {
    const status = getItineraryBlockMapStatus(
      createBlock({
        ref: {
          day: 2,
          slot: "morning",
          itemIndex: 0,
          placeName: "植物园散步",
          type: "attraction",
        },
        item: {
          placeName: "植物园散步",
          type: "attraction",
          reason: "先走走",
          guide: [],
        },
      }),
      sampleMapPoints,
    );

    expect(status).toBe("unmatched");
  });

  it("block id 和 point block id 规则一致", () => {
    const block = createBlock();

    expect(getItineraryBlockId(block)).toBe(getMapPointBlockId(sampleMapPoints[0]!));
  });

  it("能识别泛化非 poi 名称", () => {
    expect(isGenericNonPoiPlace("回酒店休息", "free_time")).toBe(true);
    expect(isGenericNonPoiPlace("鼓浪屿", "attraction")).toBe(false);
  });

  it("会规整名称里的空格和标点", () => {
    expect(normalizeMapPointName(" 八市（海鲜市场） ")).toBe("八市 海鲜市场");
  });
});
