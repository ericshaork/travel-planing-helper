import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { AmapPoiProvider } from "../../lib/poi/amap";
import { createPoiProvider } from "../../lib/poi/client";
import { MockPoiProvider } from "../../lib/poi/mock";
import { getServerEnvironment } from "../../lib/utils/env";

describe("POI provider selection", () => {
  it("USE_MOCK_POI=true 时返回 MockPoiProvider", () => {
    const environment = getServerEnvironment({
      USE_MOCK_POI: "true",
    });

    expect(createPoiProvider(environment)).toBeInstanceOf(MockPoiProvider);
  });

  it("POI_PROVIDER=amap 且 USE_MOCK_POI=false 时返回 AmapPoiProvider", () => {
    const environment = getServerEnvironment({
      USE_MOCK_POI: "false",
      POI_PROVIDER: "amap",
      AMAP_API_KEY: "amap-key",
    });

    expect(createPoiProvider(environment)).toBeInstanceOf(AmapPoiProvider);
  });

  it("缺 AMAP_API_KEY 时明确报错", () => {
    const environment = getServerEnvironment({
      USE_MOCK_POI: "false",
      POI_PROVIDER: "amap",
    });

    expect(() => createPoiProvider(environment)).toThrowError(/AMAP_API_KEY/);
  });

  it("mock 模式仍零 Key 可跑", () => {
    const environment = getServerEnvironment({
      USE_MOCK_POI: "true",
      POI_PROVIDER: "mock",
    });

    expect(createPoiProvider(environment)).toBeInstanceOf(MockPoiProvider);
  });
});
