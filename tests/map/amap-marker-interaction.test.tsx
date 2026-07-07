import { describe, expect, it, vi } from "vitest";

import {
  buildAmapMarkerLabelContent,
  createAmapMarkerInstances,
} from "../../components/map/map-utils";
import type {
  AMapGlobal,
  AMapMapConstructor,
  AMapMapInstance,
  AMapMarkerConstructor,
  AMapMarkerInstance,
} from "../../lib/map/amap-types";
import type { AmapMarkerPoint } from "../../components/map/map-utils";

const markerPoints: AmapMarkerPoint[] = [
  {
    id: "p1",
    name: "鼓浪屿",
    coordinates: { lat: 24.4486, lng: 118.0679 },
    order: 1,
    status: "confirmed",
  },
  {
    id: "p2",
    name: "沙坡尾",
    coordinates: { lat: 24.4377, lng: 118.0811 },
    order: 2,
    status: "confirmed",
  },
];

describe("amap marker interactions", () => {
  it("active 和 inactive marker label 内容不同", () => {
    expect(buildAmapMarkerLabelContent(1, true)).not.toBe(
      buildAmapMarkerLabelContent(1, false),
    );
  });

  it("marker 点击时会调用 onMarkerClick(pointId)", () => {
    const clickHandlers: Array<() => void> = [];
    const markers: AMapMarkerInstance[] = [];
    const Marker = vi.fn(function MockMarker() {
      const marker: AMapMarkerInstance = {
        setMap: vi.fn(),
        on: vi.fn((eventName: string, handler: () => void) => {
          if (eventName === "click") {
            clickHandlers.push(handler);
          }
        }),
        setzIndex: vi.fn(),
      };
      markers.push(marker);
      return marker;
    }) as unknown as AMapMarkerConstructor;
    const amap: AMapGlobal = {
      Map: vi.fn(function MockMap() {}) as unknown as AMapMapConstructor,
      Marker,
    };
    const map: AMapMapInstance = {
      destroy: vi.fn(),
    };
    const onMarkerClick = vi.fn();

    createAmapMarkerInstances(amap, map, markerPoints, {
      activePointId: "p2",
      markerLabel: true,
      onMarkerClick,
    });

    clickHandlers[0]?.();
    clickHandlers[1]?.();

    expect(onMarkerClick).toHaveBeenNthCalledWith(1, "p1");
    expect(onMarkerClick).toHaveBeenNthCalledWith(2, "p2");
    expect(markers[1]?.setzIndex).toHaveBeenCalledWith(160);
  });
});
