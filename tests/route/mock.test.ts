import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { MockRouteProvider } from "../../lib/route/mock";

describe("MockRouteProvider", () => {
  it("根据两个坐标返回 distanceMeters", async () => {
    const provider = new MockRouteProvider();
    const result = await provider.estimateRoute({
      origin: { lat: 24.4485, lng: 118.0674 },
      destination: { lat: 24.4383, lng: 118.0897 },
    });

    expect(result.leg.distanceMeters).toBeGreaterThan(0);
  });

  it("durationMinutes 大于 0", async () => {
    const provider = new MockRouteProvider();
    const result = await provider.estimateRoute({
      origin: { lat: 30.2431, lng: 120.1501 },
      destination: { lat: 30.2414, lng: 120.1717 },
    });

    expect(result.leg.durationMinutes).toBeGreaterThan(0);
  });

  it("mode 默认是 driving", async () => {
    const provider = new MockRouteProvider();
    const result = await provider.estimateRoute({
      origin: { lat: 30.2431, lng: 120.1501 },
      destination: { lat: 30.2414, lng: 120.1717 },
    });

    expect(result.leg.mode).toBe("driving");
  });

  it("walking 和 driving 有不同估算", async () => {
    const provider = new MockRouteProvider();
    const origin = { lat: 30.2431, lng: 120.1501 };
    const destination = { lat: 30.2414, lng: 120.1717 };
    const driving = await provider.estimateRoute({
      origin,
      destination,
      mode: "driving",
    });
    const walking = await provider.estimateRoute({
      origin,
      destination,
      mode: "walking",
    });

    expect(driving.leg.distanceMeters).toBe(walking.leg.distanceMeters);
    expect(walking.leg.durationMinutes).toBeGreaterThan(
      driving.leg.durationMinutes,
    );
  });

  it("无效坐标时返回 warning", async () => {
    const provider = new MockRouteProvider();
    const result = await provider.estimateRoute({
      origin: { lat: 999, lng: 120.1501 },
      destination: { lat: 30.2414, lng: 120.1717 },
    });

    expect(result.leg.distanceMeters).toBe(0);
    expect(result.warnings?.join("")).toContain("坐标信息不完整");
  });
});
