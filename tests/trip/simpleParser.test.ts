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

  it("不会把“不想去寺庙”猜成目的地，同时把寺庙提取到 avoidPlaces", () => {
    expect(simpleParseTripText("不想去寺庙，喜欢历史。")).toEqual({
      interests: ["历史文化"],
      avoidPlaces: ["寺庙"],
    });
  });

  it("从「不去兵马俑」抽出 avoidPlaces", () => {
    const parsed = simpleParseTripText(
      "去西安 3 天，喜欢历史文化和美食，不去兵马俑，预算 3000。",
    );
    expect(parsed).toMatchObject({
      destinationCity: "西安",
      days: 3,
      budget: 3000,
      interests: ["美食", "历史文化"],
      avoidPlaces: ["兵马俑"],
    });
  });

  it("识别多个避免地点，忽略明显不是地名的短语", () => {
    const parsed = simpleParseTripText(
      "去成都 4 天，不去锦里，避开人民公园；不想太累。",
    );
    expect(parsed.avoidPlaces).toEqual(["锦里", "人民公园"]);
    expect(parsed.travelStyles).toContain("轻松");
  });

  it("识别 mustVisitPlaces 但不会重复目的地", () => {
    const parsed = simpleParseTripText(
      "我想去西安玩 3 天，必去大雁塔，一定要去回民街，喜欢历史。",
    );
    expect(parsed.destinationCity).toBe("西安");
    expect(parsed.mustVisitPlaces).toEqual(["大雁塔", "回民街"]);
  });

  it("识别同行人并合并进 travelStyles", () => {
    const parsed = simpleParseTripText(
      "我想和爱人去杭州玩 2 天，喜欢城市漫步，不想早起。",
    );
    expect(parsed.travelStyles).toEqual(
      expect.arrayContaining(["不想早起", "情侣同行"]),
    );
    expect(parsed.destinationCity).toBe("杭州");
  });

  it("带孩子的场景会归入家庭亲子", () => {
    const parsed = simpleParseTripText(
      "去北京 3 天带孩子，想看故宫和天坛。",
    );
    expect(parsed.travelStyles).toContain("家庭亲子");
    expect(parsed.destinationCity).toBe("北京");
  });
});
