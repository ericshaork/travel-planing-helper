import { describe, expect, it, vi } from "vitest";

import {
  buildAmapMarkerLayer,
  buildAmapMarkerOptions,
  clearAmapMarkerInstances,
  createAmapMarkerInstances,
  getMarkerViewportCenter,
  syncAmapViewportForMarkerPoints,
} from "../../components/map/map-utils";
import type {
  AMapGlobal,
  AMapMapConstructor,
  AMapMapInstance,
  AMapMarkerConstructor,
  AMapMarkerInstance,
} from "../../lib/map/amap-types";
import type { MapPoint } from "../../lib/trip/enrichment-types";

const dayPoints: MapPoint[] = [
  {
    id: "a",
    name: "鼓浪屿",
    dayIndex: 1,
    slot: "morning",
    itemIndex: 0,
    itemType: "attraction",
    coordinates: { lat: 24.4486, lng: 118.0679 },
    resolved: true,
  },
  {
    id: "b",
    name: "八市",
    dayIndex: 1,
    slot: "afternoon",
    itemIndex: 1,
    itemType: "food",
    resolved: false,
  },
  {
    id: "c",
    name: "沙坡尾",
    dayIndex: 1,
    slot: "evening",
    itemIndex: 2,
    itemType: "attraction",
    coordinates: { lat: 24.4377, lng: 118.0811 },
    resolved: true,
  },
];

describe("amap marker helpers", () => {
  it("只为已确认且有坐标的点生成 markerPoints，并保留当天顺序编号", () => {
    const result = buildAmapMarkerLayer(dayPoints);

    expect(result.unresolvedCount).toBe(1);
    expect(result.markerPoints).toEqual([
      {
        id: "a",
        name: "鼓浪屿",
        coordinates: { lat: 24.4486, lng: 118.0679 },
        order: 1,
        status: "confirmed",
      },
      {
        id: "c",
        name: "沙坡尾",
        coordinates: { lat: 24.4377, lng: 118.0811 },
        order: 3,
        status: "confirmed",
      },
    ]);
  });

  it("marker options 会把 {lat,lng} 转成 [lng,lat]，并带标题和编号 label", () => {
    const markerPoint = buildAmapMarkerLayer(dayPoints).markerPoints[0]!;
    const options = buildAmapMarkerOptions(markerPoint, true);

    expect(options.position).toEqual([118.0679, 24.4486]);
    expect(options.title).toBe("1. 鼓浪屿");
    expect(options.label?.content).toContain(">1<");
  });

  it("多点时优先调用 setFitView", () => {
    const map: AMapMapInstance = {
      destroy: vi.fn(),
      setFitView: vi.fn(),
      setZoomAndCenter: vi.fn(),
    };
    const markers: AMapMarkerInstance[] = [
      { setMap: vi.fn() },
      { setMap: vi.fn() },
    ];

    syncAmapViewportForMarkerPoints(
      map,
      buildAmapMarkerLayer(dayPoints).markerPoints,
      markers,
      {},
      true,
    );

    expect(map.setFitView).toHaveBeenCalledWith(markers);
    expect(map.setZoomAndCenter).not.toHaveBeenCalled();
  });

  it("单点时使用 setZoomAndCenter 聚焦到该点", () => {
    const map: AMapMapInstance = {
      destroy: vi.fn(),
      setZoomAndCenter: vi.fn(),
    };
    const markerPoint = buildAmapMarkerLayer(dayPoints).markerPoints.slice(0, 1);

    syncAmapViewportForMarkerPoints(map, markerPoint, [{ setMap: vi.fn() }], {});

    expect(map.setZoomAndCenter).toHaveBeenCalledWith(13, [118.0679, 24.4486]);
  });

  it("无点时回退到基础视野", () => {
    const map: AMapMapInstance = {
      destroy: vi.fn(),
      setZoomAndCenter: vi.fn(),
    };

    syncAmapViewportForMarkerPoints(map, [], [], {
      center: { lat: 30.2741, lng: 120.1551 },
      zoom: 9,
    });

    expect(map.setZoomAndCenter).toHaveBeenCalledWith(9, [120.1551, 30.2741]);
  });

  it("创建 marker 时会调用 Marker 构造器，并在清理时 setMap(null)", () => {
    const createdMarkers: AMapMarkerInstance[] = [];
    const Marker = vi.fn(function MockMarker() {
      const marker: AMapMarkerInstance = {
        setMap: vi.fn(),
      };
      createdMarkers.push(marker);
      return marker;
    }) as unknown as AMapMarkerConstructor;
    const amap: AMapGlobal = {
      Map: vi.fn(function MockMap() {}) as unknown as AMapMapConstructor,
      Marker,
    };
    const map: AMapMapInstance = {
      destroy: vi.fn(),
    };

    const markers = createAmapMarkerInstances(
      amap,
      map,
      buildAmapMarkerLayer(dayPoints).markerPoints,
      {
        markerLabel: true,
      },
    );

    expect(Marker).toHaveBeenCalledTimes(2);
    expect(markers).toHaveLength(2);
    expect(createdMarkers[0]?.setMap).toHaveBeenCalledWith(map);

    clearAmapMarkerInstances(markers);
    expect(createdMarkers[0]?.setMap).toHaveBeenLastCalledWith(null);
    expect(createdMarkers[1]?.setMap).toHaveBeenLastCalledWith(null);
  });

  it("平均中心点 helper 会在多点 fallback 时返回稳定中心", () => {
    expect(getMarkerViewportCenter(buildAmapMarkerLayer(dayPoints).markerPoints)).toEqual({
      lat: 24.44315,
      lng: 118.0745,
    });
  });
});
