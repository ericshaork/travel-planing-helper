import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { simpleParseTripText } from "../../lib/trip/simpleParser";

describe("simpleParseTripText", () => {
  it("解析出发地、目的地、阿拉伯数字天数、预算、兴趣和轻松风格", () => {
    expect(
      simpleParseTripText(
        "我想 7 月从深圳去厦门玩 3 天，预算 2500，喜欢海边、美食和拍照，不想太累。",
      ),
    ).toMatchObject({
      departureCity: "深圳",
      destinationCity: "厦门",
      days: 3,
      budget: 2500,
      interests: ["海边", "美食", "拍照"],
      travelStyles: ["轻松"],
    });
  });

  it("解析不带“从”的城市路线和高效率风格", () => {
    expect(
      simpleParseTripText(
        "深圳去厦门玩 2 天，人均 3000，喜欢博物馆和夜生活，想高效率一点。",
      ),
    ).toMatchObject({
      departureCity: "深圳",
      destinationCity: "厦门",
      days: 2,
      budget: 3000,
      interests: ["博物馆", "夜生活"],
      travelStyles: ["高效率"],
    });
  });

  it("解析只有目的地、中文天数和多种风格的输入", () => {
    const parsed = simpleParseTripText(
      "我想去杭州玩两天，不想早起，预算 1500，想轻松一点，最好少走路。",
    );

    expect(parsed).toMatchObject({
      destinationCity: "杭州",
      days: 2,
      budget: 1500,
      travelStyles: ["轻松", "不想早起", "少走路"],
      schedulePreference: "不想早起",
    });
    expect(parsed.departureCity).toBeUndefined();
  });

  it("不会把“不想去寺庙”猜成目的地", () => {
    expect(simpleParseTripText("不想去寺庙，喜欢历史。")).toEqual({
      interests: ["历史文化"],
    });
  });
});
