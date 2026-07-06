import { describe, expect, it } from "vitest";

import {
  getMobileOverviewAccentText,
  MOBILE_OVERVIEW_FALLBACK,
  safeDisplayText,
} from "../../lib/trip/result-overview";

describe("result overview display helpers", () => {
  it("mobile overview 的异常摘要会替换为 fallback", () => {
    expect(
      getMobileOverviewAccentText({
        travelStyleSummary:
          "妫板嫮鐣婚崢姹€婊堫暕缁犳せ鈧繈銆夐敍灞姐亯濮樻柨鎷版禍銈夈€?",
      }),
    ).toBe(MOBILE_OVERVIEW_FALLBACK);
  });

  it("正常中文摘要不被替换", () => {
    expect(
      getMobileOverviewAccentText({
        travelStyleSummary: "行程安排轻松，适合不想太累的旅行者。",
      }),
    ).toBe("行程安排轻松，适合不想太累的旅行者。");
  });

  it("正常英文地名不被替换", () => {
    expect(
      safeDisplayText(
        "Hangzhou West Lake + Hefang Street in 2 days.",
        MOBILE_OVERVIEW_FALLBACK,
      ),
    ).toBe("Hangzhou West Lake + Hefang Street in 2 days.");
  });

  it("数字和时间不被替换", () => {
    expect(
      safeDisplayText(
        "2天 / 1500元 / 09:30 出发，下午回酒店休息。",
        MOBILE_OVERVIEW_FALLBACK,
      ),
    ).toBe("2天 / 1500元 / 09:30 出发，下午回酒店休息。");
  });

  it("明显的乱码标记会被识别", () => {
    expect(
      safeDisplayText("```json {\"summary\":\"坏掉了\"}```", MOBILE_OVERVIEW_FALLBACK),
    ).toBe(MOBILE_OVERVIEW_FALLBACK);
    expect(safeDisplayText("锟斤拷锟斤拷", MOBILE_OVERVIEW_FALLBACK)).toBe(
      MOBILE_OVERVIEW_FALLBACK,
    );
  });

  it("正常 desktop 同源字段不会被误伤", () => {
    expect(
      safeDisplayText(
        "行程安排轻松，适合不想早起、预算 1500 左右的两天杭州慢慢走。",
        MOBILE_OVERVIEW_FALLBACK,
      ),
    ).toBe(
      "行程安排轻松，适合不想早起、预算 1500 左右的两天杭州慢慢走。",
    );
  });
});
