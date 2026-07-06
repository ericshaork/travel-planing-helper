import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { MockPoiProvider } from "../../lib/poi/mock";

describe("MockPoiProvider", () => {
  it("能查到厦门鼓浪屿", async () => {
    const provider = new MockPoiProvider();
    const result = await provider.searchPoi({
      city: "厦门",
      keyword: "鼓浪屿",
    });

    expect(result.warnings ?? []).toHaveLength(0);
    expect(result.candidates[0]?.name).toBe("鼓浪屿");
    expect(result.candidates[0]?.provider).toBe("mock");
  });

  it("能查到成都宽窄巷子", async () => {
    const provider = new MockPoiProvider();
    const result = await provider.searchPoi({
      city: "成都",
      keyword: "宽窄巷子",
    });

    expect(result.candidates[0]?.name).toBe("宽窄巷子");
  });

  it("能查到杭州西湖", async () => {
    const provider = new MockPoiProvider();
    const result = await provider.searchPoi({
      city: "杭州",
      keyword: "西湖",
    });

    expect(result.candidates[0]?.name).toBe("西湖");
  });

  it("查不到地点时返回空 candidates 和 warning", async () => {
    const provider = new MockPoiProvider();
    const result = await provider.searchPoi({
      city: "厦门",
      keyword: "不存在的地方",
    });

    expect(result.candidates).toEqual([]);
    expect(result.warnings?.join("")).toContain("暂时没找到");
  });
});
