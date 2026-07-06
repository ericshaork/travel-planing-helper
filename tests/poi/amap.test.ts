import { describe, expect, it, vi, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

import { AmapPoiProvider } from "../../lib/poi/amap";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AmapPoiProvider", () => {
  it("成功返回高德 POI 时能映射成 PoiCandidate", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        status: "1",
        pois: [
          {
            id: "B001",
            name: "鼓浪屿",
            address: "思明区鼓浪屿",
            cityname: "厦门",
            location: "118.0674,24.4485",
            type: "风景名胜",
          },
        ],
      }),
    });

    const provider = new AmapPoiProvider({
      apiKey: "secret-key",
      fetchImplementation: fetchMock as typeof fetch,
    });
    const result = await provider.searchPoi({
      city: "厦门",
      keyword: "鼓浪屿",
    });

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({
      id: "B001",
      name: "鼓浪屿",
      city: "厦门",
      address: "思明区鼓浪屿",
      provider: "amap",
      coordinates: {
        lng: 118.0674,
        lat: 24.4485,
      },
    });
  });

  it("location 的 lng,lat 能正确转成 coordinates", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        status: "1",
        pois: [
          {
            id: "B002",
            name: "西湖",
            address: "西湖风景区",
            cityname: "杭州",
            location: "120.1501,30.2431",
          },
        ],
      }),
    });

    const provider = new AmapPoiProvider({
      apiKey: "secret-key",
      fetchImplementation: fetchMock as typeof fetch,
    });
    const result = await provider.searchPoi({
      city: "杭州",
      keyword: "西湖",
    });

    expect(result.candidates[0]?.coordinates).toEqual({
      lng: 120.1501,
      lat: 30.2431,
    });
  });

  it("limit 能限制数量", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        status: "1",
        pois: [
          {
            id: "1",
            name: "春熙路A",
            address: "A",
            cityname: "成都",
            location: "104.0838,30.6574",
          },
          {
            id: "2",
            name: "春熙路B",
            address: "B",
            cityname: "成都",
            location: "104.0839,30.6575",
          },
        ],
      }),
    });

    const provider = new AmapPoiProvider({
      apiKey: "secret-key",
      fetchImplementation: fetchMock as typeof fetch,
    });
    const result = await provider.searchPoi({
      city: "成都",
      keyword: "春熙路",
      limit: 1,
    });

    expect(result.candidates).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("offset=1");
  });

  it("高德空 pois 返回空 candidates 和 warning", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        status: "1",
        pois: [],
      }),
    });

    const provider = new AmapPoiProvider({
      apiKey: "secret-key",
      fetchImplementation: fetchMock as typeof fetch,
    });
    const result = await provider.searchPoi({
      city: "厦门",
      keyword: "不存在",
    });

    expect(result.candidates).toEqual([]);
    expect(result.warnings?.join("")).toContain("没找到");
  });

  it("高德 status 非 1 时返回明确 warning", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        status: "0",
        info: "INVALID_USER_KEY",
        pois: [],
      }),
    });

    const provider = new AmapPoiProvider({
      apiKey: "secret-key",
      fetchImplementation: fetchMock as typeof fetch,
    });
    const result = await provider.searchPoi({
      city: "厦门",
      keyword: "鼓浪屿",
    });

    expect(result.candidates).toEqual([]);
    expect(result.warnings).toEqual(["INVALID_USER_KEY"]);
  });

  it("缺 AMAP_API_KEY 时明确报错", () => {
    expect(
      () =>
        new AmapPoiProvider({
          apiKey: "",
        }),
    ).toThrowError(/AMAP_API_KEY/);
  });

  it("网络失败时明确报错", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    const provider = new AmapPoiProvider({
      apiKey: "secret-key",
      fetchImplementation: fetchMock as typeof fetch,
    });

    await expect(
      provider.searchPoi({
        city: "厦门",
        keyword: "鼓浪屿",
      }),
    ).rejects.toThrowError(/高德 POI 请求失败/);
  });

  it("坐标异常时跳过并给 warning", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        status: "1",
        pois: [
          {
            id: "bad",
            name: "坏坐标",
            address: "未知",
            cityname: "厦门",
            location: "abc,def",
          },
          {
            id: "good",
            name: "鼓浪屿",
            address: "思明区鼓浪屿",
            cityname: "厦门",
            location: "118.0674,24.4485",
          },
        ],
      }),
    });

    const provider = new AmapPoiProvider({
      apiKey: "secret-key",
      fetchImplementation: fetchMock as typeof fetch,
    });
    const result = await provider.searchPoi({
      city: "厦门",
      keyword: "鼓浪屿",
      limit: 5,
    });

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.id).toBe("good");
    expect(result.warnings?.join("")).toContain("坐标格式异常");
  });

  it("错误信息里不泄露 API Key", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("boom"));
    const provider = new AmapPoiProvider({
      apiKey: "very-secret-key",
      fetchImplementation: fetchMock as typeof fetch,
    });

    await expect(
      provider.searchPoi({
        city: "厦门",
        keyword: "鼓浪屿",
      }),
    ).rejects.not.toThrowError(/very-secret-key/);
  });
});
