import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { AmapRouteProvider } from "../../lib/route/amap";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AmapRouteProvider", () => {
  it("driving 成功返回时能映射 RouteLeg", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        status: "1",
        route: {
          paths: [
            {
              distance: "6200",
              duration: "1080",
            },
          ],
        },
      }),
    });

    const provider = new AmapRouteProvider({
      apiKey: "secret-key",
      fetchImplementation: fetchMock as typeof fetch,
    });
    const result = await provider.estimateRoute({
      origin: { lat: 24.4485, lng: 118.0674 },
      destination: { lat: 24.4383, lng: 118.0897 },
      mode: "driving",
    });

    expect(result.leg).toMatchObject({
      distanceMeters: 6200,
      durationMinutes: 18,
      mode: "driving",
      provider: "amap",
    });
    expect(result.leg.summary).toContain("驾车约 18 分钟");
  });

  it("walking 成功返回时能映射 RouteLeg", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        status: "1",
        route: {
          paths: [
            {
              distance: "900",
              duration: "720",
            },
          ],
        },
      }),
    });

    const provider = new AmapRouteProvider({
      apiKey: "secret-key",
      fetchImplementation: fetchMock as typeof fetch,
    });
    const result = await provider.estimateRoute({
      origin: { lat: 30.2431, lng: 120.1501 },
      destination: { lat: 30.2414, lng: 120.1717 },
      mode: "walking",
    });

    expect(result.leg).toMatchObject({
      distanceMeters: 900,
      durationMinutes: 12,
      mode: "walking",
      provider: "amap",
    });
    expect(result.leg.summary).toContain("步行约 12 分钟");
  });

  it("origin / destination 坐标按 lng,lat 传给高德", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        status: "1",
        route: {
          paths: [
            {
              distance: "1000",
              duration: "600",
            },
          ],
        },
      }),
    });

    const provider = new AmapRouteProvider({
      apiKey: "secret-key",
      fetchImplementation: fetchMock as typeof fetch,
    });
    await provider.estimateRoute({
      origin: { lat: 24.4485, lng: 118.0674 },
      destination: { lat: 24.4383, lng: 118.0897 },
      mode: "driving",
    });

    const requestUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(requestUrl.searchParams.get("origin")).toBe("118.0674,24.4485");
    expect(requestUrl.searchParams.get("destination")).toBe(
      "118.0897,24.4383",
    );
  });

  it("高德 status 非 1 时给出明确 warning 并安全回退", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        status: "0",
        info: "INVALID_USER_KEY",
      }),
    });

    const provider = new AmapRouteProvider({
      apiKey: "secret-key",
      fetchImplementation: fetchMock as typeof fetch,
    });
    const result = await provider.estimateRoute({
      origin: { lat: 24.4485, lng: 118.0674 },
      destination: { lat: 24.4383, lng: 118.0897 },
      mode: "driving",
    });

    expect(result.leg.provider).toBe("amap");
    expect(result.warnings).toEqual(["INVALID_USER_KEY"]);
  });

  it("route paths 为空时返回 warning", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        status: "1",
        route: {
          paths: [],
        },
      }),
    });

    const provider = new AmapRouteProvider({
      apiKey: "secret-key",
      fetchImplementation: fetchMock as typeof fetch,
    });
    const result = await provider.estimateRoute({
      origin: { lat: 24.4485, lng: 118.0674 },
      destination: { lat: 24.4383, lng: 118.0897 },
      mode: "driving",
    });

    expect(result.warnings?.join("")).toContain("没有返回可用路线");
  });

  it("缺 AMAP_API_KEY 时明确报错", () => {
    expect(
      () =>
        new AmapRouteProvider({
          apiKey: "",
        }),
    ).toThrowError(/AMAP_API_KEY/);
  });

  it("网络失败时明确报错", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    const provider = new AmapRouteProvider({
      apiKey: "secret-key",
      fetchImplementation: fetchMock as typeof fetch,
    });

    await expect(
      provider.estimateRoute({
        origin: { lat: 24.4485, lng: 118.0674 },
        destination: { lat: 24.4383, lng: 118.0897 },
        mode: "driving",
      }),
    ).rejects.toThrowError(/高德路线请求失败/);
  });

  it("distance / duration 缺失时回退为安全估算并给 warning", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        status: "1",
        route: {
          paths: [
            {
              distance: "oops",
              duration: "",
            },
          ],
        },
      }),
    });

    const provider = new AmapRouteProvider({
      apiKey: "secret-key",
      fetchImplementation: fetchMock as typeof fetch,
    });
    const result = await provider.estimateRoute({
      origin: { lat: 30.2431, lng: 120.1501 },
      destination: { lat: 30.2414, lng: 120.1717 },
      mode: "walking",
    });

    expect(result.leg.distanceMeters).toBeGreaterThan(0);
    expect(result.leg.durationMinutes).toBeGreaterThan(0);
    expect(result.warnings?.join("")).toContain("缺少有效距离或时长");
  });

  it("transit 暂不支持时降级为 driving 并给 warning", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        status: "1",
        route: {
          paths: [
            {
              distance: "3200",
              duration: "780",
            },
          ],
        },
      }),
    });

    const provider = new AmapRouteProvider({
      apiKey: "secret-key",
      fetchImplementation: fetchMock as typeof fetch,
    });
    const result = await provider.estimateRoute({
      origin: { lat: 30.2431, lng: 120.1501 },
      destination: { lat: 30.2414, lng: 120.1717 },
      mode: "transit",
    });

    expect(result.leg.mode).toBe("driving");
    expect(result.warnings?.join("")).toContain("transit 暂未接入");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/direction/driving");
  });

  it("错误信息里不泄露 API Key", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("boom"));
    const provider = new AmapRouteProvider({
      apiKey: "very-secret-key",
      fetchImplementation: fetchMock as typeof fetch,
    });

    await expect(
      provider.estimateRoute({
        origin: { lat: 24.4485, lng: 118.0674 },
        destination: { lat: 24.4383, lng: 118.0897 },
      }),
    ).rejects.not.toThrowError(/very-secret-key/);
  });
});
