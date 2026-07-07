import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../lib/map/amap-loader", () => ({
  loadAmapSdk: vi.fn(),
}));

import { AmapBaseMap } from "../../components/map/AmapBaseMap";
import {
  buildAmapMarkerLayer,
  buildAmapMapOptions,
  createAmapMapInstance,
  destroyAmapMapInstance,
  syncAmapViewport,
  toAmapLngLatTuple,
} from "../../components/map/map-utils";
import type {
  AMapGlobal,
  AMapMapConstructor,
  AMapMapInstance,
} from "../../lib/map/amap-types";
import type { MapPoint } from "../../lib/trip/enrichment-types";

const markerSourcePoints: MapPoint[] = [
  {
    id: "marker-1",
    name: "中山路",
    dayIndex: 1,
    slot: "morning",
    itemIndex: 0,
    itemType: "attraction",
    coordinates: { lat: 24.4555, lng: 118.0782 },
    resolved: true,
  },
];

describe("AmapBaseMap helpers", () => {
  it("center 会从 {lat,lng} 转为 [lng,lat]", () => {
    expect(toAmapLngLatTuple({ lat: 24.4798, lng: 118.0894 })).toEqual([
      118.0894,
      24.4798,
    ]);

    expect(
      buildAmapMapOptions({
        center: { lat: 30.2741, lng: 120.1551 },
        zoom: 10,
      }),
    ).toEqual({
      center: [120.1551, 30.2741],
      zoom: 10,
    });
  });

  it("createAmapMapInstance 会把 options 传给 AMap.Map", () => {
    const instance: AMapMapInstance = {
      destroy: vi.fn(),
    };
    const Map = vi.fn(function MockMap() {
      return instance;
    }) as unknown as AMapMapConstructor;
    const amap: AMapGlobal = {
      Map,
    };
    const container = {} as HTMLElement;

    const created = createAmapMapInstance(amap, container, {
      center: { lat: 31.2304, lng: 121.4737 },
      zoom: 12,
    });

    expect(created).toBe(instance);
    expect(Map).toHaveBeenCalledWith(container, {
      center: [121.4737, 31.2304],
      zoom: 12,
    });
  });

  it("syncAmapViewport 会优先使用 setZoomAndCenter", () => {
    const map: AMapMapInstance = {
      destroy: vi.fn(),
      setCenter: vi.fn(),
      setZoom: vi.fn(),
      setZoomAndCenter: vi.fn(),
    };

    syncAmapViewport(map, {
      center: { lat: 22.5431, lng: 114.0579 },
      zoom: 11,
    });

    expect(map.setZoomAndCenter).toHaveBeenCalledWith(11, [114.0579, 22.5431]);
    expect(map.setCenter).not.toHaveBeenCalled();
    expect(map.setZoom).not.toHaveBeenCalled();
  });

  it("unmount helper 会销毁地图实例", () => {
    const map: AMapMapInstance = {
      destroy: vi.fn(),
    };

    destroyAmapMapInstance(map);

    expect(map.destroy).toHaveBeenCalledTimes(1);
  });
});

describe("AmapBaseMap SSR", () => {
  it("SSR 渲染时不会崩，并先显示 loading 占位", () => {
    const markup = renderToStaticMarkup(<AmapBaseMap ariaLabel="测试地图" />);

    expect(markup).toContain("地图加载中");
  });

  it("传入 markerPoints 和 unresolvedCount 时 SSR 仍然稳定", () => {
    const markup = renderToStaticMarkup(
      <AmapBaseMap
        ariaLabel="Day 1 地图"
        markerPoints={buildAmapMarkerLayer(markerSourcePoints).markerPoints}
        unresolvedCount={2}
      />,
    );

    expect(markup).toContain("地图加载中");
  });
});
