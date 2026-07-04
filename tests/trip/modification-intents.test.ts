import { describe, expect, it } from "vitest";

import type { ItineraryBlockView } from "../../lib/trip/itinerary-view";
import {
  addPendingChangeItem,
  buildBlockModificationRequest,
  buildPendingChangeItem,
  buildPendingChangesRequest,
  buildQuickModificationRequest,
  mergeModificationRequest,
  type BlockActionType,
  type PendingChangeAction,
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
        itemIndex: 0,
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

  it.each<[PendingChangeAction, string, string]>([
    ["remove", "不要这个", "路线更顺"],
    ["replace", "换一个", "更符合偏好的同类安排"],
    ["lock", "一定保留", "请一定保留"],
    ["addSimilar", "加类似", "类似的地点或活动"],
  ])(
    "%s 会生成可展示的 PendingChangeItem",
    (action, expectedLabel, expectedRequestText) => {
      const item = buildPendingChangeItem(action, sampleBlock);

      expect(item.action).toBe(action);
      expect(item.label).toBe(expectedLabel);
      expect(item.summary).toContain("Day 2");
      expect(item.summary).toContain("下午");
      expect(item.summary).toContain("鼓浪屿");
      expect(item.requestText).toContain(expectedRequestText);
      expect(item.placeName).toBe("鼓浪屿");
      expect(item.itemIndex).toBe(0);
    },
  );

  it("buildPendingChangesRequest 对单条意图生成中文修改句", () => {
    const item = buildPendingChangeItem("lock", sampleBlock);
    const request = buildPendingChangesRequest([item]);

    expect(request).toContain("请基于当前方案重新生成");
    expect(request).toContain("1. 请一定保留 Day 2 下午的「鼓浪屿」。");
    expect(request).toContain("同时保持每天路线顺路，不要让安排太赶。");
  });

  it("buildPendingChangesRequest 对多条意图生成编号列表", () => {
    const items = [
      buildPendingChangeItem("lock", sampleBlock),
      buildPendingChangeItem("replace", {
        ...sampleBlock,
        ref: {
          ...sampleBlock.ref,
          slot: "evening",
          itemIndex: 1,
          placeName: "中山路",
        },
      }),
    ];

    const request = buildPendingChangesRequest(items);

    expect(request).toContain("1. 请一定保留 Day 2 下午的「鼓浪屿」。");
    expect(request).toContain(
      "2. 请把 Day 2 晚上的「中山路」换成一个更符合偏好的同类安排。",
    );
  });

  it("空列表时安全返回空字符串", () => {
    expect(buildPendingChangesRequest([])).toBe("");
  });

  it("addPendingChangeItem 会对同一积木的互斥动作做覆盖，但保留 addSimilar", () => {
    const lockItem = buildPendingChangeItem("lock", sampleBlock);
    const replaceItem = buildPendingChangeItem("replace", sampleBlock);
    const similarItem = buildPendingChangeItem("addSimilar", sampleBlock);

    const merged = addPendingChangeItem(
      addPendingChangeItem([lockItem], replaceItem),
      similarItem,
    );

    expect(merged).toHaveLength(2);
    expect(merged.map((item) => item.action)).toEqual([
      "replace",
      "addSimilar",
    ]);
  });

  it("完全重复的 PendingChangeItem 不会无限累积", () => {
    const item = buildPendingChangeItem("remove", sampleBlock);

    const merged = addPendingChangeItem(addPendingChangeItem([], item), item);

    expect(merged).toHaveLength(1);
  });

  it("mergeModificationRequest 会把已有草稿和待修改清单合并", () => {
    const compiled = buildPendingChangesRequest([
      buildPendingChangeItem("lock", sampleBlock),
    ]);

    const merged = mergeModificationRequest("保留海边行程。", compiled);

    expect(merged).toContain("保留海边行程。");
    expect(merged).toContain("另外，请按下面这些要求统一重排：");
    expect(merged).toContain("请基于当前方案重新生成");
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
