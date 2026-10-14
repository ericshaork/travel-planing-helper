import { describe, expect, it } from "vitest";

import {
  ADMIN_BOUNDARY_MAX_COUNTY_RENDER_FEATURES,
  diffAdminOverlayAdcodes,
  getMapBoundsUnion,
  getAdminViewportTileKey,
  isAdminCountyRenderTooDense,
  shouldFetchAdminBounds,
  type MapBounds,
} from "../../components/map/map-utils";

const xiamenViewport: MapBounds = {
  minLat: 24.35,
  maxLat: 24.65,
  minLng: 117.95,
  maxLng: 118.35,
};

describe("admin boundary performance helpers", () => {
  it("小幅 pan 不改变 county viewportTileKey", () => {
    const panned: MapBounds = {
      minLat: xiamenViewport.minLat + 0.01,
      maxLat: xiamenViewport.maxLat + 0.01,
      minLng: xiamenViewport.minLng + 0.01,
      maxLng: xiamenViewport.maxLng + 0.01,
    };

    expect(getAdminViewportTileKey(xiamenViewport, "district")).toBe(
      getAdminViewportTileKey(panned, "district"),
    );
  });

  it("currentViewport 在 loadedBounds 内时 shouldFetchAdminBounds=false", () => {
    const loadedBounds: MapBounds = {
      minLat: 24.2,
      maxLat: 24.8,
      minLng: 117.8,
      maxLng: 118.5,
    };

    expect(shouldFetchAdminBounds(xiamenViewport, loadedBounds, "district")).toBe(false);
  });

  it("超出 loadedBounds buffer 后 shouldFetchAdminBounds=true", () => {
    const loadedBounds: MapBounds = {
      minLat: 24.2,
      maxLat: 24.8,
      minLng: 117.8,
      maxLng: 118.5,
    };
    const outside: MapBounds = {
      minLat: 24.35,
      maxLat: 24.65,
      minLng: 118.8,
      maxLng: 119.15,
    };

    expect(shouldFetchAdminBounds(outside, loadedBounds, "district")).toBe(true);
  });

  it("expanded viewport 超出 loadedBoundsUnion 时必须请求缺失 bbox", () => {
    const loadedBounds: MapBounds = {
      minLat: 24.2,
      maxLat: 24.8,
      minLng: 117.8,
      maxLng: 118.5,
    };
    const expandedViewport: MapBounds = {
      minLat: 24.15,
      maxLat: 24.85,
      minLng: 117.75,
      maxLng: 118.75,
    };

    expect(getMapBoundsUnion([loadedBounds])).toEqual(loadedBounds);
    expect(
      shouldFetchAdminBounds(expandedViewport, [loadedBounds], "district", {
        bufferRatio: 0,
      }),
    ).toBe(true);
  });

  it("loaded bounds 列表中任一 bbox 覆盖当前 expanded viewport 时不重复请求", () => {
    const previousBounds: MapBounds = {
      minLat: 23.9,
      maxLat: 24.2,
      minLng: 117.1,
      maxLng: 117.5,
    };
    const currentLoadedBounds: MapBounds = {
      minLat: 24.2,
      maxLat: 24.8,
      minLng: 117.8,
      maxLng: 118.5,
    };

    expect(
      shouldFetchAdminBounds(
        xiamenViewport,
        [previousBounds, currentLoadedBounds],
        "district",
        { bufferRatio: 0 },
      ),
    ).toBe(false);
  });

  it("overlay diff 时 keep 的 adcode 不进入 add/remove", () => {
    const diff = diffAdminOverlayAdcodes(
      ["350200", "350500", "350600"],
      ["350200", "350600", "330900"],
    );

    expect(diff.keep).toEqual(["350200", "350600"]);
    expect(diff.add).toEqual(["330900"]);
    expect(diff.remove).toEqual(["350500"]);
  });

  it("county feature 数超过阈值时触发保护", () => {
    expect(
      isAdminCountyRenderTooDense(
        "district",
        ADMIN_BOUNDARY_MAX_COUNTY_RENDER_FEATURES + 1,
      ),
    ).toBe(true);
    expect(isAdminCountyRenderTooDense("city", 999)).toBe(false);
  });
});
