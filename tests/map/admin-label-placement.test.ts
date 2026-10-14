import { describe, expect, it } from "vitest";

import { transformLngLatForAmap } from "../../src/lib/map/coordinateTransform";
import {
  clearAdminLabelPlacementCache,
  getAdminLabelPlacementCacheKey,
  getRepresentativeLabelPoint,
  pickLargestPolygon,
  pointInPolygon,
} from "../../src/lib/map-studio/adminLabelPlacement";

const smallIsland = [
  { lng: 113.0, lat: 22.0 },
  { lng: 113.1, lat: 22.0 },
  { lng: 113.1, lat: 22.1 },
  { lng: 113.0, lat: 22.1 },
  { lng: 113.0, lat: 22.0 },
];

const mainIsland = [
  { lng: 114.0, lat: 22.0 },
  { lng: 115.0, lat: 22.0 },
  { lng: 115.0, lat: 23.0 },
  { lng: 114.0, lat: 23.0 },
  { lng: 114.0, lat: 22.0 },
];

describe("admin label placement", () => {
  it("MultiPolygon 会选择最大 polygon，而不是整体 bbox 中心", () => {
    const result = getRepresentativeLabelPoint({
      adcode: "810000",
      name: "香港特别行政区",
      level: "province",
      center: null,
      labelPosition: { lng: 113.5, lat: 22.5 },
      bbox: { minLng: 113.0, minLat: 22.0, maxLng: 115.0, maxLat: 23.0 },
      boundaries: [smallIsland, mainIsland],
    });

    expect(result.strategy).toBe("largest_polygon");
    expect(result.point).toEqual({ lng: 114.5, lat: 22.5 });
    expect(pointInPolygon(result.point!, mainIsland)).toBe(true);
  });

  it("pickLargestPolygon 不会把多个岛屿合成一个整体中心", () => {
    const largest = pickLargestPolygon([smallIsland, mainIsland]);

    expect(largest).toBe(mainIsland);
  });

  it("labelPoint outside polygon 时 fallback 到代表点", () => {
    const result = getRepresentativeLabelPoint({
      adcode: "330900",
      name: "舟山市",
      level: "prefecture",
      center: { lng: 122.0, lat: 30.0 },
      labelPosition: { lng: 123.2, lat: 31.0 },
      boundaries: [mainIsland],
    });

    expect(result.strategy).toBe("largest_polygon");
    expect(result.diagnostics.inPolygon).toBe(true);
    expect(result.point).toEqual({ lng: 114.5, lat: 22.5 });
  });

  it("viewport 相交但 labelPoint 在视窗外时，会生成 viewport 内 label", () => {
    const result = getRepresentativeLabelPoint(
      {
        adcode: "350200",
        name: "厦门市",
        level: "prefecture",
        center: null,
        labelPosition: { lng: 114.5, lat: 22.5 },
        boundaries: [mainIsland],
      },
      { minLng: 114.0, minLat: 22.0, maxLng: 114.3, maxLat: 22.3 },
    );

    expect(result.strategy).toBe("viewport_intersection");
    expect(result.point?.lng).toBeGreaterThanOrEqual(114.0);
    expect(result.point?.lng).toBeLessThanOrEqual(114.3);
    expect(result.point?.lat).toBeGreaterThanOrEqual(22.0);
    expect(result.point?.lat).toBeLessThanOrEqual(22.3);
    expect(result.diagnostics.inViewport).toBe(true);
  });

  it("viewport 相交且缺少 labelPoint 时，也会优先生成当前视窗内 label", () => {
    const result = getRepresentativeLabelPoint(
      {
        adcode: "440400",
        name: "珠海市",
        level: "prefecture",
        center: null,
        labelPosition: null,
        boundaries: [mainIsland],
      },
      { minLng: 114.0, minLat: 22.0, maxLng: 114.25, maxLat: 22.25 },
    );

    expect(result.strategy).toBe("viewport_intersection");
    expect(result.diagnostics.inViewport).toBe(true);
  });

  it("label cache key 包含 displayMode 和 viewportTileKey", () => {
    expect(
      getAdminLabelPlacementCacheKey({
        adcode: "440300",
        level: "prefecture",
        viewportTileKey: "z10:113:22",
        displayMode: "raw",
      }),
    ).not.toBe(
      getAdminLabelPlacementCacheKey({
        adcode: "440300",
        level: "prefecture",
        viewportTileKey: "z10:113:22",
        displayMode: "gcj02",
      }),
    );
  });

  it("label 代表点可与 polygon 使用同一 raw/gcj02 displayMode", () => {
    clearAdminLabelPlacementCache();
    const result = getRepresentativeLabelPoint(
      {
        adcode: "440300",
        name: "深圳市",
        level: "prefecture",
        center: null,
        labelPosition: { lng: 114.5, lat: 22.5 },
        boundaries: [mainIsland],
      },
      null,
      { displayMode: "gcj02", viewportTileKey: "sample" },
    );
    const [lng, lat] = transformLngLatForAmap(result.point!.lng, result.point!.lat, {
      displayMode: "gcj02",
      adcode: "440300",
    });

    expect([lng, lat]).not.toEqual([result.point!.lng, result.point!.lat]);
    expect(lng).toBeGreaterThan(result.point!.lng);
    expect(lat).toBeLessThan(result.point!.lat);
  });

  it("港澳/舟山/厦门类 MultiPolygon 样本不会把 label 放到整体海域中心", () => {
    const result = getRepresentativeLabelPoint({
      adcode: "820000",
      name: "澳门特别行政区",
      level: "province",
      center: null,
      labelPosition: { lng: 113.5, lat: 22.5 },
      bbox: { minLng: 113.0, minLat: 22.0, maxLng: 115.0, maxLat: 23.0 },
      boundaries: [smallIsland, mainIsland],
    });

    expect(result.point).toEqual({ lng: 114.5, lat: 22.5 });
    expect(result.point).not.toEqual({ lng: 113.5, lat: 22.5 });
  });
});
