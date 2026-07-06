import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { AmapRouteProvider } from "../../lib/route/amap";
import { createRouteProvider } from "../../lib/route/client";
import { MockRouteProvider } from "../../lib/route/mock";
import { getServerEnvironment } from "../../lib/utils/env";

describe("Route provider selection", () => {
  it("USE_MOCK_ROUTE=true 时返回 MockRouteProvider", () => {
    const environment = getServerEnvironment({
      USE_MOCK_ROUTE: "true",
    });

    expect(createRouteProvider(environment)).toBeInstanceOf(MockRouteProvider);
  });

  it("ROUTE_PROVIDER=mock 时返回 MockRouteProvider", () => {
    const environment = getServerEnvironment({
      USE_MOCK_ROUTE: "false",
      ROUTE_PROVIDER: "mock",
    });

    expect(createRouteProvider(environment)).toBeInstanceOf(MockRouteProvider);
  });

  it("ROUTE_PROVIDER=amap 且 USE_MOCK_ROUTE=false 时返回 AmapRouteProvider", () => {
    const environment = getServerEnvironment({
      USE_MOCK_ROUTE: "false",
      ROUTE_PROVIDER: "amap",
      AMAP_API_KEY: "amap-key",
    });

    expect(createRouteProvider(environment)).toBeInstanceOf(AmapRouteProvider);
  });

  it("缺 AMAP_API_KEY 时明确报错", () => {
    const environment = getServerEnvironment({
      USE_MOCK_ROUTE: "false",
      ROUTE_PROVIDER: "amap",
    });

    expect(() => createRouteProvider(environment)).toThrowError(/AMAP_API_KEY/);
  });

  it("mock route 模式零 Key 可跑", () => {
    const environment = getServerEnvironment({
      USE_MOCK_ROUTE: "true",
      ROUTE_PROVIDER: "mock",
    });

    expect(createRouteProvider(environment)).toBeInstanceOf(MockRouteProvider);
  });
});
