import { describe, expect, it } from "vitest";

import type { ItineraryBlockView } from "../../lib/trip/itinerary-view";
import {
  buildBlockModificationRequest,
  buildQuickModificationRequest,
  type BlockActionType,
  type QuickModificationType,
} from "../../lib/trip/modification-intents";

const sampleBlock: ItineraryBlockView = {
  ref: {
    day: 2,
    slot: "afternoon",
    itemIndex: 0,
    placeName: "鼓浪屿",
    type: "attraction",
  },
  item: {
    placeName: "鼓浪屿",
    type: "attraction",
    reason: "慢慢走更舒服。",
    guide: [],
  },
};

describe("modification intents", () => {
  it.each<[BlockActionType, string]>([
    ["remove", "请不要再安排"],
    ["replace", "请把"],
    ["lock", "请一定保留"],
    ["addSimilar", "请增加一个和"],
  ])("%s 会生成包含上下文的中文修改句", (actionType, expectedStart) => {
    const text = buildBlockModificationRequest(actionType, sampleBlock);

    expect(text).toContain(expectedStart);
    expect(text).toContain("第 2 天下午");
    expect(text).toContain("鼓浪屿");
  });

  it("在缺少 type 时仍能生成通顺的中文修改句", () => {
    const text = buildBlockModificationRequest("replace", {
      ref: {
        day: 1,
        slot: "morning",
        placeName: "八市",
      },
    });

    expect(text).toContain("第 1 天上午");
    expect(text).toContain("八市");
    expect(text).toContain("行程安排");
  });

  it("不会改动传入的 block 数据", () => {
    const snapshot = JSON.parse(JSON.stringify(sampleBlock));

    buildBlockModificationRequest("lock", sampleBlock);

    expect(sampleBlock).toEqual(snapshot);
  });

  it.each<[QuickModificationType, string[]]>([
    ["relax", ["轻松一点", "休息", "自由活动"]],
    ["lessWalking", ["少走路", "顺路", "少折返"]],
    ["lowerBudget", ["预算", "压低", "性价比"]],
    ["addFoodNightMarket", ["美食", "夜市", "小吃"]],
    ["noEarlyStart", ["不用太早出门", "上午", "不要早起"]],
  ])("%s 会生成清楚的全局修改要求", (type, expectedPhrases) => {
    const text = buildQuickModificationRequest(type);

    expect(text.length).toBeGreaterThan(0);

    for (const phrase of expectedPhrases) {
      expect(text).toContain(phrase);
    }
  });
});
