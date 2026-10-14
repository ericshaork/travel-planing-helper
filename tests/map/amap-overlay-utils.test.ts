import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getAdminBoundaryCacheKey,
  setMemoryAdminBoundary,
} from "../../src/lib/map-studio/adminBoundaryCache";
import { transformLngLatForAmap } from "../../src/lib/map/coordinateTransform";
import {
  buildAmapRegionLabelContent,
  buildAmapPolygonOptions,
  buildAmapPolylineOptions,
  clearAdministrativeBoundaryRuntimeCache,
  clearAmapPolygonInstances,
  clearAmapPolylineInstances,
  clearAmapTrafficLayer,
  computeAdminRequiredTiles,
  createAdminDenseProtectionDebug,
  createAdminLevelSwitchDebug,
  createAdminLabelLifecycleDebug,
  createAdminBoundaryOverlayAuditRecord,
  createAdminPanStabilityDebug,
  createAdminRenderOverlayAuditSnapshot,
  createAdminRenderLevelDebug,
  createAdminRenderDebugSnapshot,
  createAdminZoomSwitchDebug,
  buildAdminBoundaryLineSegments,
  createAmapAdministrativeBoundaryLayer,
  createDedupedAdminBoundaryLineSegments,
  createAmapPolygonInstances,
  createAmapPolylineInstances,
  createAmapTrafficLayer,
  diffAdminTileCoverage,
  getAdministrativeBoundaryCacheKey,
  getAdministrativeBoundaryDisplayCacheKey,
  getAdminLoadedTileKeys,
  getAdminLoadedTileScopeKey,
  getAdminBoundarySnapTolerance,
  getAdminViewportReloadDelayMs,
  getAdminViewportTileKey,
  getAdminLevelByZoom,
  loadAdministrativeBoundaries,
  markAdminLoadedTiles,
  mergeAdministrativeBoundaryRegions,
  prepareAdminBoundaryRegionsForRender,
  resolveAdminBoundaryLevel,
  resolveAdminBoundaryPolygonStyle,
  resolveAdministrativeBoundaryQuery,
  resolveAdminBoundaryLineStyle,
  resolveAdminGeometryDisplayMode,
  resolveAdminPrecisionTargetLevel,
  resolveAdministrativeBoundaryReloadReason,
  selectAdminBoundaryLabelRegionsForRender,
  setAdministrativeBoundaryPersistentCacheAdapterForTests,
  shouldFetchAdminForViewport,
  type AdminBoundaryCacheEntry,
  type AdminBoundaryPersistentCacheAdapter,
  type LoadedAdministrativeBoundaryRegion,
  type MapBounds,
  type AmapPolygonRegion,
  type AmapPolylineRoute,
} from "../../components/map/map-utils";
import type {
  AMapDistrictSearchConstructor,
  AMapDistrictSearchInstance,
  AMapGlobal,
  AMapMapConstructor,
  AMapMapInstance,
  AMapMarkerConstructor,
  AMapMarkerInstance,
  AMapPolygonConstructor,
  AMapPolygonInstance,
  AMapPolylineConstructor,
  AMapPolylineInstance,
  AMapTrafficLayerConstructor,
  AMapTrafficLayerInstance,
} from "../../lib/map/amap-types";

const polygonRegion: AmapPolygonRegion = {
  id: "region-core",
  name: "城市核心区",
  paths: [
    [
      { lat: 24.51, lng: 118.05 },
      { lat: 24.53, lng: 118.11 },
      { lat: 24.46, lng: 118.14 },
      { lat: 24.44, lng: 118.07 },
    ],
  ],
  fillColor: "rgba(70, 112, 122, 0.58)",
  strokeColor: "rgba(255, 236, 190, 0.72)",
};

const polylineRoute: AmapPolylineRoute = {
  id: "day-1-route",
  name: "Day 1 占位路线",
  path: [
    { lat: 24.4486, lng: 118.0679 },
    { lat: 24.4377, lng: 118.0811 },
  ],
  strokeStyle: "dashed",
};

const chinaBounds: MapBounds = {
  minLat: 18,
  maxLat: 53,
  minLng: 73,
  maxLng: 135,
};

const guangdongBounds: MapBounds = {
  minLat: 20.2,
  maxLat: 25.4,
  minLng: 109.8,
  maxLng: 117.2,
};

const tibetBounds: MapBounds = {
  minLat: 27.1,
  maxLat: 36.3,
  minLng: 78.7,
  maxLng: 98.9,
};

const xinjiangBounds: MapBounds = {
  minLat: 34.6,
  maxLat: 49.0,
  minLng: 73.8,
  maxLng: 96.1,
};

const qinghaiBounds: MapBounds = {
  minLat: 31.8,
  maxLat: 39.0,
  minLng: 89.6,
  maxLng: 102.8,
};

const sichuanBounds: MapBounds = {
  minLat: 26.2,
  maxLat: 34.1,
  minLng: 97.6,
  maxLng: 108.3,
};

const pearlRiverDeltaBounds: MapBounds = {
  minLat: 21.85,
  maxLat: 23.65,
  minLng: 112.45,
  maxLng: 115.1,
};

const eastChinaMultiProvinceBounds: MapBounds = {
  minLat: 30.2,
  maxLat: 32.2,
  minLng: 119.6,
  maxLng: 122.4,
};

const shandongHenanHebeiJiangsuJunctionBounds: MapBounds = {
  minLat: 33.5,
  maxLat: 36.8,
  minLng: 114.2,
  maxLng: 119.2,
};

const southChinaRegionalBounds: MapBounds = {
  minLat: 21.4,
  maxLat: 25.8,
  minLng: 108.8,
  maxLng: 116.0,
};

const tooManyProvinceParentsBounds: MapBounds = {
  minLat: 27.8,
  maxLat: 35.2,
  minLng: 108.0,
  maxLng: 122.0,
};

const guangdongGuangxiBoundaryBounds: MapBounds = {
  minLat: 21.1,
  maxLat: 24.9,
  minLng: 108.6,
  maxLng: 113.1,
};

const guangzhouSmallBounds: MapBounds = {
  minLat: 22.86,
  maxLat: 23.48,
  minLng: 112.98,
  maxLng: 113.72,
};

const shenzhenSmallBounds: MapBounds = {
  minLat: 22.39,
  maxLat: 22.82,
  minLng: 113.74,
  maxLng: 114.62,
};

const shenzhenCityScaleBounds: MapBounds = {
  minLat: 21.97,
  maxLat: 23.19,
  minLng: 113.07,
  maxLng: 115.05,
};

const xiamenSmallBounds: MapBounds = {
  minLat: 24.32,
  maxLat: 24.78,
  minLng: 117.92,
  maxLng: 118.42,
};

const shenzhenDistrictQuery = {
  keyword: "深圳市",
  adcode: "440300",
  targetLevel: "district",
  searchLevel: "city",
  subdistrict: 1,
  center: { lat: 22.5431, lng: 114.0579 },
  zoom: 10,
} as const;

function createAdminBoundaryCacheEntry(
  overrides: Partial<AdminBoundaryCacheEntry> = {},
): AdminBoundaryCacheEntry {
  return {
    parentAdcode: "440300",
    parentName: "深圳市",
    targetLevel: "district",
    source: "amap_district_search",
    fetchedAt: new Date().toISOString(),
    features: [
      {
        adcode: "440305",
        name: "南山区",
        level: "district",
        parentAdcode: "440300",
        center: { lat: 22.5333, lng: 113.9304 },
        labelPosition: { lat: 22.535, lng: 113.93 },
        labelPositionSource: "polygon-centroid",
        boundaries: [[
          { lat: 22.58, lng: 113.88 },
          { lat: 22.58, lng: 113.98 },
          { lat: 22.49, lng: 113.98 },
          { lat: 22.49, lng: 113.88 },
        ]],
        bbox: {
          minLat: 22.49,
          maxLat: 22.58,
          minLng: 113.88,
          maxLng: 113.98,
        },
      },
    ],
    ...overrides,
  };
}

function createLoadedAdminRegion(
  overrides: Partial<LoadedAdministrativeBoundaryRegion> = {},
): LoadedAdministrativeBoundaryRegion {
  const boundaries = overrides.boundaries ?? [[
    { lat: 22.58, lng: 113.88 },
    { lat: 22.58, lng: 113.98 },
    { lat: 22.49, lng: 113.98 },
    { lat: 22.49, lng: 113.88 },
    { lat: 22.58, lng: 113.88 },
  ]];

  return {
    id: "admin-440305",
    name: "南山区",
    adcode: "440305",
    level: "district",
    parentAdcode: "440300",
    center: { lat: 22.5333, lng: 113.9304 },
    labelPosition: { lat: 22.535, lng: 113.93 },
    labelPositionSource: "polygon-centroid",
    bbox: {
      minLat: 22.49,
      maxLat: 22.58,
      minLng: 113.88,
      maxLng: 113.98,
    },
    boundaries,
    ...overrides,
  };
}

function createPersistentCacheAdapter(
  initialEntries: Record<string, AdminBoundaryCacheEntry | null> = {},
) {
  const entries = new Map<string, AdminBoundaryCacheEntry | null>(
    Object.entries(initialEntries),
  );
  const adapter: AdminBoundaryPersistentCacheAdapter = {
    get: vi.fn(async (cacheKey: string) => entries.get(cacheKey) ?? null),
    set: vi.fn(async (cacheKey: string, entry: AdminBoundaryCacheEntry) => {
      entries.set(cacheKey, entry);
    }),
  };

  return adapter;
}

function createProvinceApiResponse() {
  return {
    ok: true,
    parentAdcode: "100000",
    level: "province",
    count: 3,
    features: [
      {
        adcode: "440000",
        name: "广东省",
        level: "province",
        adminType: "province",
        parentAdcode: "100000",
        provinceAdcode: "440000",
        prefectureAdcode: null,
        center: [113.27, 23.13],
        labelPoint: [113.27, 23.13],
        bbox: [109.8, 20.2, 117.2, 25.4],
        geometry: {
          type: "Polygon",
          coordinates: [[
            [109.8, 20.2],
            [117.2, 20.2],
            [117.2, 25.4],
            [109.8, 20.2],
          ]],
        },
        source: "reviewed_local_geojson_2025_admin_division",
        sourceUpdatedAt: "2025-01-01T00:00:00.000Z",
        confidence: null,
      },
      {
        adcode: "450000",
        name: "广西壮族自治区",
        level: "province",
        adminType: "autonomous_region",
        parentAdcode: "100000",
        provinceAdcode: "450000",
        prefectureAdcode: null,
        center: [108.32, 22.82],
        labelPoint: [108.32, 22.82],
        bbox: [104.5, 21.0, 112.1, 26.4],
        geometry: {
          type: "Polygon",
          coordinates: [[
            [104.5, 21.0],
            [112.1, 21.0],
            [112.1, 26.4],
            [104.5, 21.0],
          ]],
        },
        source: "reviewed_local_geojson_2025_admin_division",
        sourceUpdatedAt: "2025-01-01T00:00:00.000Z",
        confidence: null,
      },
      {
        adcode: "430000",
        name: "湖南省",
        level: "province",
        adminType: "province",
        parentAdcode: "100000",
        provinceAdcode: "430000",
        prefectureAdcode: null,
        center: [112.98, 28.19],
        labelPoint: [112.98, 28.19],
        bbox: [108.8, 24.6, 114.3, 30.1],
        geometry: {
          type: "Polygon",
          coordinates: [[
            [108.8, 24.6],
            [114.3, 24.6],
            [114.3, 30.1],
            [108.8, 24.6],
          ]],
        },
        source: "reviewed_local_geojson_2025_admin_division",
        sourceUpdatedAt: "2025-01-01T00:00:00.000Z",
        confidence: null,
      },
    ],
    sourceSummary: {
      sources: ["reviewed_local_geojson_2025_admin_division"],
      missingGeometry: 0,
      generatedAt: "2026-10-07T00:00:00.000Z",
    },
  };
}

function createDistrictSearchAmapMock(input?: {
  asyncCallbacks?: boolean;
  childName?: string;
}) {
  const search: AMapDistrictSearchInstance = {
    search: vi.fn((keyword, callback) => {
      const reply = () => {
        if (keyword === "440300" || keyword === "深圳市") {
          callback("complete", {
            districtList: [
              {
                name: "深圳市",
                districtList: [
                  {
                    name: input?.childName ?? "南山区",
                    adcode: "440305",
                    level: "district",
                    center: "113.9304,22.5333",
                  },
                ],
              },
            ],
          });
          return;
        }

        callback("complete", {
          districtList: [
            {
              name: input?.childName ?? "南山区",
              adcode: "440305",
              level: "district",
              center: "113.9304,22.5333",
              boundaries: [[
                [113.88, 22.58],
                [113.98, 22.58],
                [113.98, 22.49],
                [113.88, 22.49],
              ]],
            },
          ],
        });
      };

      if (input?.asyncCallbacks) {
        setTimeout(reply, 0);
        return;
      }

      reply();
    }),
  };
  const DistrictSearch = vi.fn(function MockDistrictSearch() {
    return search;
  }) as unknown as AMapDistrictSearchConstructor;

  return {
    amap: { DistrictSearch } satisfies AMapGlobal,
    DistrictSearch,
    search,
  };
}

async function flushAdministrativeLayerPromises() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("amap overlay helpers", () => {
  beforeEach(() => {
    clearAdministrativeBoundaryRuntimeCache();
    setAdministrativeBoundaryPersistentCacheAdapterForTests(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("polygon options 会把坐标转换为高德 [lng,lat] 路径", () => {
    const options = buildAmapPolygonOptions(
      polygonRegion,
      polygonRegion.paths[0]!,
    );

    expect(options.path).toEqual([
      [118.05, 24.51],
      [118.11, 24.53],
      [118.14, 24.46],
      [118.07, 24.44],
    ]);
    expect(options.extData).toEqual({
      id: "region-core",
      name: "城市核心区",
      overlayType: "region",
    });
  });

  it("polyline options 会保留路线样式并转换路径", () => {
    const options = buildAmapPolylineOptions(polylineRoute);

    expect(options.path).toEqual([
      [118.0679, 24.4486],
      [118.0811, 24.4377],
    ]);
    expect(options.strokeStyle).toBe("dashed");
    expect(options.extData).toEqual({
      id: "day-1-route",
      name: "Day 1 占位路线",
      overlayType: "route",
    });
  });

  it("创建 polygon 时绑定点击事件，并在清理时 setMap(null)", () => {
    const clickHandlers: Array<() => void> = [];
    const mouseoverHandlers: Array<() => void> = [];
    const mouseoutHandlers: Array<() => void> = [];
    const createdPolygons: AMapPolygonInstance[] = [];
    const Polygon = vi.fn(function MockPolygon() {
      const polygon: AMapPolygonInstance = {
        setMap: vi.fn(),
        on: vi.fn((eventName: string, handler: () => void) => {
          if (eventName === "click") {
            clickHandlers.push(handler);
          }
          if (eventName === "mouseover") {
            mouseoverHandlers.push(handler);
          }
          if (eventName === "mouseout") {
            mouseoutHandlers.push(handler);
          }
        }),
      };
      createdPolygons.push(polygon);
      return polygon;
    }) as unknown as AMapPolygonConstructor;
    const amap: AMapGlobal = {
      Map: vi.fn(function MockMap() {}) as unknown as AMapMapConstructor,
      Polygon,
    };
    const map: AMapMapInstance = {
      destroy: vi.fn(),
    };
    const onPolygonClick = vi.fn();
    const onPolygonMouseEnter = vi.fn();
    const onPolygonMouseLeave = vi.fn();

    const polygons = createAmapPolygonInstances(amap, map, [polygonRegion], {
      onPolygonClick,
      onPolygonMouseEnter,
      onPolygonMouseLeave,
    });
    clickHandlers[0]?.();
    mouseoverHandlers[0]?.();
    mouseoutHandlers[0]?.();

    expect(Polygon).toHaveBeenCalledTimes(1);
    expect(createdPolygons[0]?.setMap).toHaveBeenCalledWith(map);
    expect(onPolygonClick).toHaveBeenCalledWith("region-core");
    expect(onPolygonMouseEnter).toHaveBeenCalledWith("region-core");
    expect(onPolygonMouseLeave).toHaveBeenCalledWith("region-core");

    clearAmapPolygonInstances(polygons);
    expect(createdPolygons[0]?.setMap).toHaveBeenLastCalledWith(null);
  });

  it("创建 polyline 时绑定点击事件，并在清理时 setMap(null)", () => {
    const clickHandlers: Array<() => void> = [];
    const createdPolylines: AMapPolylineInstance[] = [];
    const Polyline = vi.fn(function MockPolyline() {
      const polyline: AMapPolylineInstance = {
        setMap: vi.fn(),
        on: vi.fn((eventName: string, handler: () => void) => {
          if (eventName === "click") {
            clickHandlers.push(handler);
          }
        }),
      };
      createdPolylines.push(polyline);
      return polyline;
    }) as unknown as AMapPolylineConstructor;
    const amap: AMapGlobal = {
      Map: vi.fn(function MockMap() {}) as unknown as AMapMapConstructor,
      Polyline,
    };
    const map: AMapMapInstance = {
      destroy: vi.fn(),
    };
    const onPolylineClick = vi.fn();

    const polylines = createAmapPolylineInstances(amap, map, [polylineRoute], {
      onPolylineClick,
    });
    clickHandlers[0]?.();

    expect(Polyline).toHaveBeenCalledTimes(1);
    expect(createdPolylines[0]?.setMap).toHaveBeenCalledWith(map);
    expect(onPolylineClick).toHaveBeenCalledWith("day-1-route");

    clearAmapPolylineInstances(polylines);
    expect(createdPolylines[0]?.setMap).toHaveBeenLastCalledWith(null);
  });

  it("交通流量图层使用高德 TrafficLayer，并在清理时关闭", () => {
    const trafficLayer: AMapTrafficLayerInstance = {
      setMap: vi.fn(),
      setOpacity: vi.fn(),
    };
    const Traffic = vi.fn(function MockTrafficLayer() {
      return trafficLayer;
    }) as unknown as AMapTrafficLayerConstructor;
    const amap: AMapGlobal = {
      TileLayer: {
        Traffic,
      },
    };
    const map: AMapMapInstance = {
      destroy: vi.fn(),
    };

    const created = createAmapTrafficLayer(amap, map, 0.42);

    expect(Traffic).toHaveBeenCalledWith({
      zIndex: 65,
      opacity: 0.42,
      autoRefresh: true,
    });
    expect(created).toBe(trafficLayer);
    expect(trafficLayer.setOpacity).toHaveBeenCalledWith(0.42);
    expect(trafficLayer.setMap).toHaveBeenCalledWith(map);

    clearAmapTrafficLayer(created);
    expect(trafficLayer.setMap).toHaveBeenLastCalledWith(null);
  });

  it("行政区级别会根据 zoom 连续切换，并根据中心解析查询目标", () => {
    expect(getAdminLevelByZoom(4)).toBe("province");
    expect(getAdminLevelByZoom(5.8)).toBe("province");
    expect(getAdminLevelByZoom(5.81)).toBe("city");
    expect(getAdminLevelByZoom(8.5)).toBe("city");
    expect(getAdminLevelByZoom(8.51)).toBe("district");
    expect(getAdminLevelByZoom(12)).toBe("district");
    expect(
      [4, 5.7, 5.9, 7.4, 8.4, 8.6, 10, 12].map((zoom) =>
        resolveAdminBoundaryLevel(zoom).targetLevel,
      ),
    ).toEqual([
      "province",
      "province",
      "city",
      "city",
      "city",
      "district",
      "district",
      "district",
    ]);
    expect(resolveAdministrativeBoundaryQuery({
      zoom: 4,
      center: { lat: 35.8617, lng: 104.1954 },
    })).toMatchObject({
      keyword: "中国",
      adcode: "100000",
      targetLevel: "province",
      searchLevel: "country",
    });
    expect(resolveAdministrativeBoundaryQuery({
      zoom: 7,
      center: { lat: 23.13, lng: 113.27 },
    })).toMatchObject({
      keyword: "广东省",
      adcode: "440000",
      targetLevel: "city",
      searchLevel: "province",
    });
    expect(resolveAdministrativeBoundaryQuery({
      zoom: 10,
      center: { lat: 22.5431, lng: 114.0579 },
    })).toMatchObject({
      keyword: "深圳市",
      adcode: "440300",
      targetLevel: "district",
      searchLevel: "city",
    });
  });

  it("auto precision 下不同 zoom 能 resolve 到 province / prefecture / county", () => {
    expect(resolveAdminPrecisionTargetLevel("auto", getAdminLevelByZoom(4))).toBe(
      "province",
    );
    expect(resolveAdminPrecisionTargetLevel("auto", getAdminLevelByZoom(7))).toBe(
      "city",
    );
    expect(resolveAdminPrecisionTargetLevel("auto", getAdminLevelByZoom(10))).toBe(
      "district",
    );
  });

  it("adminPrecision=province 时只请求 province", () => {
    expect(resolveAdministrativeBoundaryQuery({
      zoom: 10,
      center: { lat: 22.5431, lng: 114.0579 },
      bounds: shenzhenSmallBounds,
      adminPrecision: "province",
    })).toMatchObject({
      targetLevel: "province",
      searchLevel: "country",
    });
  });

  it("adminPrecision=prefecture 时请求并渲染市级 targetLevel", () => {
    const query = resolveAdministrativeBoundaryQuery({
      zoom: 10,
      center: { lat: 22.5431, lng: 114.0579 },
      bounds: shenzhenSmallBounds,
      adminPrecision: "prefecture",
    });

    expect(query).toMatchObject({
      targetLevel: "city",
      searchLevel: "province",
    });
    expect(createAdminRenderLevelDebug({
      targetLevel: query.targetLevel,
      regions: [
        createLoadedAdminRegion({
          level: "prefecture",
          adcode: "440300",
        }),
      ],
    })).toMatchObject({
      targetLevel: "city",
      renderLevel: "city",
      mismatched: false,
    });
  });

  it("adminPrecision=county 时请求并渲染区县级 targetLevel", () => {
    const query = resolveAdministrativeBoundaryQuery({
      zoom: 10,
      center: { lat: 22.5431, lng: 114.0579 },
      bounds: shenzhenSmallBounds,
      adminPrecision: "county",
    });

    expect(query).toMatchObject({
      targetLevel: "district",
      searchLevel: "city",
    });
    expect(createAdminRenderLevelDebug({
      targetLevel: query.targetLevel,
      regions: [
        createLoadedAdminRegion({
          level: "county",
          adcode: "440305",
        }),
      ],
    })).toMatchObject({
      targetLevel: "district",
      renderLevel: "district",
      mismatched: false,
    });
  });

  it("行政区 zoom hysteresis 避免边界附近来回跳层", () => {
    expect(resolveAdminBoundaryLevel(5.9, undefined, undefined, "province").targetLevel).toBe("province");
    expect(resolveAdminBoundaryLevel(6.1, undefined, undefined, "province").targetLevel).toBe("city");
    expect(resolveAdminBoundaryLevel(5.6, undefined, undefined, "city").targetLevel).toBe("city");
    expect(resolveAdminBoundaryLevel(5.4, undefined, undefined, "city").targetLevel).toBe("province");
    expect(resolveAdminBoundaryLevel(8.7, undefined, undefined, "city").targetLevel).toBe("city");
    expect(resolveAdminBoundaryLevel(8.9, undefined, undefined, "city").targetLevel).toBe("district");
    expect(resolveAdminBoundaryLevel(8.3, undefined, undefined, "district").targetLevel).toBe("district");
    expect(resolveAdminBoundaryLevel(8.1, undefined, undefined, "district").targetLevel).toBe("city");
  });

  it("行政区 bounds 策略会把全国图幅解析为省级", () => {
    expect(resolveAdministrativeBoundaryQuery({
      zoom: 4.4,
      center: { lat: 35.8617, lng: 104.1954 },
      bounds: chinaBounds,
    })).toMatchObject({
      keyword: "中国",
      adcode: "100000",
      parentAdcodes: ["100000"],
      targetLevel: "province",
      searchLevel: "country",
    });
  });

  it("行政区 bounds 扩大后会立即从局部 parentScope 回退到全国省级", () => {
    expect(resolveAdministrativeBoundaryQuery({
      zoom: 6,
      center: { lat: 23.13, lng: 113.27 },
      bounds: chinaBounds,
      previousLevel: "district",
    })).toMatchObject({
      keyword: "中国",
      adcode: "100000",
      targetLevel: "province",
      searchLevel: "country",
    });
  });

  it("广东省尺度解析为广东省内市级行政区", () => {
    expect(resolveAdministrativeBoundaryQuery({
      zoom: 6.2,
      center: { lat: 23.13, lng: 113.27 },
      bounds: guangdongBounds,
    })).toMatchObject({
      keyword: "广东省",
      adcode: "440000",
      targetLevel: "city",
      searchLevel: "province",
    });
  });

  it("西藏整省图幅即使 zoom 较低也解析为西藏地级单位", () => {
    const resolved = resolveAdminBoundaryLevel(
      4.8,
      {
        center: { lat: 31.7, lng: 88.8 },
        bounds: tibetBounds,
      },
      undefined,
      "province",
    );

    expect(resolved).toMatchObject({
      targetLevel: "city",
      viewportClass: "singleProvinceWide",
      classificationReason: "dominant_province",
    });
    expect(resolved.intersectingProvinces?.[0]).toMatchObject({
      adcode: "540000",
    });
    expect(resolveAdministrativeBoundaryQuery({
      zoom: 4.8,
      center: { lat: 31.7, lng: 88.8 },
      bounds: tibetBounds,
      previousLevel: "province",
    })).toMatchObject({
      keyword: "西藏自治区",
      adcode: "540000",
      targetLevel: "city",
      searchLevel: "province",
    });
  });

  it("新疆整省图幅按 viewport coverage 解析为新疆地级单位", () => {
    expect(resolveAdministrativeBoundaryQuery({
      zoom: 4.6,
      center: { lat: 43.8, lng: 87.6 },
      bounds: xinjiangBounds,
      previousLevel: "province",
    })).toMatchObject({
      keyword: "新疆维吾尔自治区",
      adcode: "650000",
      targetLevel: "city",
      searchLevel: "province",
    });
  });

  it("青海整省图幅按 viewport coverage 解析为青海地级单位", () => {
    expect(resolveAdministrativeBoundaryQuery({
      zoom: 5.1,
      center: { lat: 36.0, lng: 96.0 },
      bounds: qinghaiBounds,
      previousLevel: "province",
    })).toMatchObject({
      keyword: "青海省",
      adcode: "630000",
      targetLevel: "city",
      searchLevel: "province",
    });
  });

  it("viewport 从全国缩到四川后解析为四川地级单位", () => {
    expect(resolveAdministrativeBoundaryQuery({
      zoom: 5.2,
      center: { lat: 30.7, lng: 103.6 },
      bounds: sichuanBounds,
      previousLevel: "province",
    })).toMatchObject({
      keyword: "四川省",
      adcode: "510000",
      targetLevel: "city",
      searchLevel: "province",
    });
  });

  it("珠三角大图幅即使中心在广州也保持市级", () => {
    const query = resolveAdministrativeBoundaryQuery({
      zoom: 10,
      center: { lat: 23.13, lng: 113.27 },
      bounds: pearlRiverDeltaBounds,
      previousLevel: "city",
    });

    expect(query).toMatchObject({
      keyword: "广东省",
      adcode: "440000",
      targetLevel: "city",
      searchLevel: "province",
    });
    expect(query).not.toMatchObject({
      adcode: "440100",
      targetLevel: "district",
    });
  });

  it("华东少量省份图幅解析为多 parent 市级单位", () => {
    const query = resolveAdministrativeBoundaryQuery({
      zoom: 6,
      center: { lat: 31.2, lng: 121.0 },
      bounds: eastChinaMultiProvinceBounds,
      previousLevel: "city",
    });

    expect(query.targetLevel).toBe("city");
    expect(query.searchLevel).toBe("province");
    expect(query.parentAdcodes).toEqual(
      expect.arrayContaining(["320000", "330000", "310000"]),
    );
    expect(query.parentAdcodes?.length).toBeGreaterThan(1);
  });

  it("山东河南河北江苏交界图幅不会只返回 dominant parent", () => {
    const query = resolveAdministrativeBoundaryQuery({
      zoom: 6.4,
      center: { lat: 35.0, lng: 116.9 },
      bounds: shandongHenanHebeiJiangsuJunctionBounds,
      previousLevel: "city",
    });

    expect(query.targetLevel).toBe("city");
    expect(query.searchLevel).toBe("province");
    expect(query.parentAdcodes).toEqual(
      expect.arrayContaining(["370000", "410000", "130000", "320000"]),
    );
    expect(query.parentAdcodes?.length).toBeGreaterThan(1);
    expect(query.parentAdcodes?.length).toBeLessThanOrEqual(6);
  });

  it("相关省份过多时回退省级，避免加载过多市级 parent", () => {
    const resolved = resolveAdminBoundaryLevel(
      6.2,
      {
        center: { lat: 31.5, lng: 115.0 },
        bounds: tooManyProvinceParentsBounds,
      },
      undefined,
      "city",
    );

    expect(resolved.targetLevel).toBe("province");
    expect(resolved.tooManyParentsFallback).toBe(true);
  });

  it("广州市内小图幅解析为广州区县级", () => {
    expect(resolveAdministrativeBoundaryQuery({
      zoom: 10.8,
      center: { lat: 23.13, lng: 113.27 },
      bounds: guangzhouSmallBounds,
      previousLevel: "city",
    })).toMatchObject({
      keyword: "广州市",
      adcode: "440100",
      targetLevel: "district",
      searchLevel: "city",
    });
  });

  it("深圳市内小图幅解析为深圳区县级", () => {
    expect(resolveAdministrativeBoundaryQuery({
      zoom: 11,
      center: { lat: 22.5431, lng: 114.0579 },
      bounds: shenzhenSmallBounds,
      previousLevel: "city",
    })).toMatchObject({
      keyword: "深圳市",
      adcode: "440300",
      targetLevel: "district",
      searchLevel: "city",
    });
  });

  it("深圳城市尺度图幅在 zoom 10 可快速解析为深圳区县级", () => {
    expect(resolveAdministrativeBoundaryQuery({
      zoom: 10,
      center: { lat: 22.5431, lng: 114.0579 },
      bounds: shenzhenCityScaleBounds,
      previousLevel: "city",
    })).toMatchObject({
      keyword: "深圳市",
      adcode: "440300",
      targetLevel: "district",
      searchLevel: "city",
    });
  });

  it("厦门城市图幅解析为厦门区县级，不把福建省作为 county parent", () => {
    const query = resolveAdministrativeBoundaryQuery({
      zoom: 10.4,
      center: { lat: 24.48, lng: 118.08 },
      bounds: xiamenSmallBounds,
      previousLevel: "city",
    });

    expect(query.targetLevel).toBe("district");
    expect(query.searchLevel).toBe("city");
    expect(query.parentAdcodes).toEqual(expect.arrayContaining(["350200"]));
    expect(query.parentAdcodes).not.toContain("350000");
    expect(getAdministrativeBoundaryCacheKey(query)).toContain("county");
  });

  it("county viewport tile key 对小范围 pan 保持稳定，避免频繁重查", () => {
    const baseQuery = resolveAdministrativeBoundaryQuery({
      zoom: 10.8,
      center: { lat: 24.48, lng: 118.08 },
      bounds: xiamenSmallBounds,
      previousLevel: "city",
    });
    const pannedQuery = resolveAdministrativeBoundaryQuery({
      zoom: 10.8,
      center: { lat: 24.49, lng: 118.09 },
      bounds: {
        minLat: xiamenSmallBounds.minLat + 0.01,
        maxLat: xiamenSmallBounds.maxLat + 0.01,
        minLng: xiamenSmallBounds.minLng + 0.01,
        maxLng: xiamenSmallBounds.maxLng + 0.01,
      },
      previousLevel: "district",
    });

    expect(baseQuery.targetLevel).toBe("district");
    expect(pannedQuery.targetLevel).toBe("district");
    expect(baseQuery.viewportTileKey).toBe(pannedQuery.viewportTileKey);
    expect(getAdministrativeBoundaryCacheKey(baseQuery)).toBe(
      getAdministrativeBoundaryCacheKey(pannedQuery),
    );
    expect(getAdminViewportTileKey(baseQuery.viewportBounds, "district")).toBe(
      baseQuery.viewportTileKey,
    );
  });

  it("pan 后 viewport bbox 改变会改变 required tile，并暴露 missing tile", () => {
    const baseBounds: MapBounds = {
      minLat: 22,
      maxLat: 22.28,
      minLng: 108,
      maxLng: 108.28,
    };
    const pannedBounds: MapBounds = {
      minLat: 22,
      maxLat: 22.28,
      minLng: 108.72,
      maxLng: 109.0,
    };
    const baseTiles = computeAdminRequiredTiles({
      bounds: baseBounds,
      level: "district",
    });
    const pannedTiles = computeAdminRequiredTiles({
      bounds: pannedBounds,
      level: "district",
    });
    const coverage = diffAdminTileCoverage({
      requiredTileKeys: pannedTiles,
      cachedTileKeys: baseTiles,
    });

    expect(pannedTiles).not.toEqual(baseTiles);
    expect(coverage.missingTileKeys.length).toBeGreaterThan(0);
    expect(coverage.coverageDecision).toBe("missing_tiles");
  });

  it("required tile 存在 missing 时 fetch debug 判定必须为 true", () => {
    const loadedBounds: MapBounds = {
      minLat: 22,
      maxLat: 22.28,
      minLng: 108,
      maxLng: 108.28,
    };
    const pannedBounds: MapBounds = {
      minLat: 22,
      maxLat: 22.28,
      minLng: 108.72,
      maxLng: 109.0,
    };
    const requiredTileKeys = computeAdminRequiredTiles({
      bounds: pannedBounds,
      level: "district",
    });
    const cachedTileKeys = computeAdminRequiredTiles({
      bounds: loadedBounds,
      level: "district",
    });
    const decision = shouldFetchAdminForViewport({
      currentViewport: pannedBounds,
      loadedBounds,
      targetLevel: "district",
      requiredTileKeys,
      cachedTileKeys,
    });

    expect(decision.missingTileKeys.length).toBeGreaterThan(0);
    expect(decision.shouldFetch).toBe(true);
    expect(decision.fetchReason).toBe("missing_tile");
  });

  it("same targetLevel + parent changed + viewport covered 但 missing tile 非空时仍然 fetch", () => {
    const coveredViewport: MapBounds = {
      minLat: 22,
      maxLat: 22.28,
      minLng: 108.72,
      maxLng: 109,
    };
    const broadLoadedBounds: MapBounds = {
      minLat: 20,
      maxLat: 25,
      minLng: 106,
      maxLng: 111,
    };
    const oldTileKeys = computeAdminRequiredTiles({
      bounds: {
        minLat: 22,
        maxLat: 22.28,
        minLng: 108,
        maxLng: 108.28,
      },
      level: "district",
    });
    const requiredTileKeys = computeAdminRequiredTiles({
      bounds: coveredViewport,
      level: "district",
    });
    const decision = shouldFetchAdminForViewport({
      currentViewport: coveredViewport,
      loadedBounds: broadLoadedBounds,
      targetLevel: "district",
      requiredTileKeys,
      cachedTileKeys: oldTileKeys,
      reloadReason: "parent_changed",
    });

    expect(decision.missingBoundsCoverage).toBe(false);
    expect(decision.missingTileKeys.length).toBeGreaterThan(0);
    expect(decision.shouldFetch).toBe(true);
    expect(decision.fetchReason).toBe("parent_changed");
    expect(decision.skippedReason).toBeNull();
  });

  it("missingTileKeys 非空时不产生 skippedReason，避免 early return", () => {
    const currentViewport: MapBounds = {
      minLat: 22,
      maxLat: 22.28,
      minLng: 108.72,
      maxLng: 109,
    };
    const requiredTileKeys = computeAdminRequiredTiles({
      bounds: currentViewport,
      level: "district",
    });
    const decision = shouldFetchAdminForViewport({
      currentViewport,
      loadedBounds: {
        minLat: 20,
        maxLat: 25,
        minLng: 106,
        maxLng: 111,
      },
      targetLevel: "district",
      requiredTileKeys,
      cachedTileKeys: [],
    });

    expect(decision.missingTileKeys).toEqual(requiredTileKeys);
    expect(decision.shouldFetch).toBe(true);
    expect(decision.fetchReason).toBe("missing_tile");
    expect(decision.skippedReason).toBeNull();
  });

  it("loaded tile set 支持同 level 多 tile", () => {
    const tileSet = new Map<string, Set<string>>();
    const scope = {
      targetLevel: "district" as const,
      displayMode: "gcj02",
      adminPrecision: "district",
    };

    expect(getAdminLoadedTileScopeKey(scope)).toBe("district:gcj02:district");
    expect(markAdminLoadedTiles(tileSet, scope, ["zcity-a", "zcity-b"])).toEqual([
      "zcity-a",
      "zcity-b",
    ]);
    expect(markAdminLoadedTiles(tileSet, scope, ["zcity-b", "zcity-c"])).toEqual([
      "zcity-a",
      "zcity-b",
      "zcity-c",
    ]);
    expect(getAdminLoadedTileKeys(tileSet, scope)).toEqual([
      "zcity-a",
      "zcity-b",
      "zcity-c",
    ]);
  });

  it("pan 后新 tile loaded 后，旧 tile 和新 tile 的 features 能 merge", () => {
    const oldRegion = createLoadedAdminRegion({
      id: "admin-450100",
      adcode: "450100",
      name: "南宁市",
    });
    const newRegion = createLoadedAdminRegion({
      id: "admin-440100",
      adcode: "440100",
      name: "广州市",
    });
    const updatedOldRegion = createLoadedAdminRegion({
      id: "admin-450100",
      adcode: "450100",
      name: "南宁市 updated",
    });

    const merged = mergeAdministrativeBoundaryRegions(
      [oldRegion],
      [newRegion, updatedOldRegion],
    );

    expect(merged).toHaveLength(2);
    expect(merged.map((region) => region.adcode).sort()).toEqual([
      "440100",
      "450100",
    ]);
    expect(merged.find((region) => region.adcode === "450100")?.name).toBe(
      "南宁市 updated",
    );
  });

  it("targetLevel / displayMode / adminPrecision 不同的 tile cache 不混用", () => {
    const tileSet = new Map<string, Set<string>>();

    markAdminLoadedTiles(tileSet, {
      targetLevel: "city",
      displayMode: "gcj02",
      adminPrecision: "city",
    }, ["zcity:1,1"]);
    markAdminLoadedTiles(tileSet, {
      targetLevel: "city",
      displayMode: "raw",
      adminPrecision: "city",
    }, ["zcity:2,2"]);
    markAdminLoadedTiles(tileSet, {
      targetLevel: "district",
      displayMode: "gcj02",
      adminPrecision: "district",
    }, ["zdistrict:3,3"]);

    expect(getAdminLoadedTileKeys(tileSet, {
      targetLevel: "city",
      displayMode: "gcj02",
      adminPrecision: "city",
    })).toEqual(["zcity:1,1"]);
    expect(getAdminLoadedTileKeys(tileSet, {
      targetLevel: "district",
      displayMode: "gcj02",
      adminPrecision: "city",
    })).toEqual([]);
    expect(getAdminLoadedTileKeys(tileSet, {
      targetLevel: "city",
      displayMode: "raw",
      adminPrecision: "city",
    })).toEqual(["zcity:2,2"]);
    expect(getAdminLoadedTileKeys(tileSet, {
      targetLevel: "city",
      displayMode: "gcj02",
      adminPrecision: "district",
    })).toEqual([]);
  });

  it("province loaded tile 不会让 prefecture / county fetch 被跳过", () => {
    const tileSet = new Map<string, Set<string>>();
    const viewport: MapBounds = {
      minLat: 22.4,
      maxLat: 22.8,
      minLng: 113.8,
      maxLng: 114.3,
    };

    markAdminLoadedTiles(tileSet, {
      targetLevel: "province",
      displayMode: "gcj02",
      adminPrecision: "auto",
    }, computeAdminRequiredTiles({
      bounds: viewport,
      level: "province",
    }));

    for (const targetLevel of ["city", "district"] as const) {
      const requiredTileKeys = computeAdminRequiredTiles({
        bounds: viewport,
        level: targetLevel,
      });
      const cachedTileKeys = getAdminLoadedTileKeys(tileSet, {
        targetLevel,
        displayMode: "gcj02",
        adminPrecision: "auto",
      });
      const decision = shouldFetchAdminForViewport({
        currentViewport: viewport,
        loadedBounds: [],
        targetLevel,
        requiredTileKeys,
        cachedTileKeys,
      });

      expect(cachedTileKeys).toEqual([]);
      expect(decision.missingTileKeys).toEqual(requiredTileKeys);
      expect(decision.shouldFetch).toBe(true);
    }
  });

  it("tileScopeKey 包含 targetLevel，不同 targetLevel 不共享 loaded tile", () => {
    expect(getAdminLoadedTileScopeKey({
      targetLevel: "province",
      displayMode: "gcj02",
      adminPrecision: "auto",
    })).not.toBe(getAdminLoadedTileScopeKey({
      targetLevel: "city",
      displayMode: "gcj02",
      adminPrecision: "auto",
    }));
    expect(getAdminLoadedTileScopeKey({
      targetLevel: "city",
      displayMode: "gcj02",
      adminPrecision: "auto",
    })).not.toBe(getAdminLoadedTileScopeKey({
      targetLevel: "district",
      displayMode: "gcj02",
      adminPrecision: "auto",
    }));
  });

  it("targetLevel 与 requestLevel 保持一致", () => {
    const prefectureQuery = resolveAdministrativeBoundaryQuery({
      zoom: 7,
      center: { lat: 23.13, lng: 113.27 },
      bounds: guangdongBounds,
      adminPrecision: "prefecture",
    });
    const countyQuery = resolveAdministrativeBoundaryQuery({
      zoom: 10,
      center: { lat: 22.5431, lng: 114.0579 },
      bounds: shenzhenSmallBounds,
      adminPrecision: "county",
    });

    expect(prefectureQuery.targetLevel).toBe("city");
    expect(countyQuery.targetLevel).toBe("district");
  });

  it("targetLevel 与 renderLevel 不一致时 debug 标记 mismatched", () => {
    expect(createAdminRenderLevelDebug({
      targetLevel: "city",
      regions: [
        createLoadedAdminRegion({
          level: "province",
          adcode: "440000",
        }),
      ],
    })).toMatchObject({
      targetLevel: "city",
      renderLevel: "province",
      mismatched: true,
    });
  });

  it("targetLevel 从 city / district 回到 province 时标记 level switch", () => {
    expect(createAdminLevelSwitchDebug({
      previousLevel: "city",
      nextLevel: "province",
    })).toMatchObject({
      previousLevel: "city",
      nextLevel: "province",
      switched: true,
      switchReason: "level_changed",
    });
    expect(createAdminLevelSwitchDebug({
      previousLevel: "district",
      nextLevel: "province",
      pendingRequestCancelled: true,
    })).toMatchObject({
      previousLevel: "district",
      nextLevel: "province",
      switched: true,
      pendingRequestCancelled: true,
    });
  });

  it("dense protection 触发时 debug result 包含原因", () => {
    expect(createAdminDenseProtectionDebug({
      targetLevel: "district",
      rawFeatureCount: 160,
      visibleFeatureCount: 80,
    })).toMatchObject({
      denseProtectionTriggered: true,
      denseProtectionReason: "expanded_viewport_too_dense_render_visible_only",
    });
    expect(createAdminDenseProtectionDebug({
      targetLevel: "district",
      rawFeatureCount: 180,
      visibleFeatureCount: 140,
    })).toMatchObject({
      denseProtectionTriggered: true,
      denseProtectionReason: "visible_viewport_too_dense_cap_count",
    });
  });

  it("stale request 回来时 debug result 标记 staleDropped，不能覆盖当前状态", () => {
    expect(createAdminRenderDebugSnapshot({
      requestId: 12,
      currentRequestId: 13,
      rawFeatureCount: 24,
      visibleFeatureCount: 18,
      polygonOverlayCount: 18,
      labelCount: 8,
    })).toMatchObject({
      requestId: 12,
      accepted: false,
      staleDropped: true,
    });
  });

  it("pan 稳定性 debug 保证 missingTileKeys 非空时必须 fetch 且不产生 skippedReason", () => {
    const currentViewport: MapBounds = {
      minLat: 22.45,
      maxLat: 22.82,
      minLng: 113.75,
      maxLng: 114.25,
    };
    const requiredTileKeys = computeAdminRequiredTiles({
      bounds: currentViewport,
      level: "district",
    });
    const cachedTileKeys = requiredTileKeys.slice(0, 1);
    const missingTileKeys = requiredTileKeys.slice(1);

    expect(missingTileKeys.length).toBeGreaterThan(0);
    expect(createAdminPanStabilityDebug({
      targetLevel: "district",
      requiredTileKeys,
      cachedTileKeys,
      missingTileKeys,
      shouldFetch: false,
      skippedReason: "covered",
    })).toMatchObject({
      targetLevel: "district",
      shouldFetch: true,
      fetchReason: "missing_tile",
      skippedReason: null,
      missingTileKeys,
    });
  });

  it("targetLevel 从 county 切到 prefecture 时旧 county 请求会被标记 staleDropped", () => {
    expect(createAdminZoomSwitchDebug({
      previousLevel: "district",
      nextLevel: "city",
      requestId: 8,
      currentRequestId: 9,
      requestLevel: "district",
      desiredLevel: "city",
      requestScopeKey: "district:gcj02:auto",
      desiredScopeKey: "city:gcj02:auto",
      pendingRequestCancelled: true,
    })).toMatchObject({
      previousLevel: "district",
      nextLevel: "city",
      switched: true,
      staleDropped: true,
      oldOverlayRetentionMs: 0,
      pendingRequestCancelled: true,
    });
  });

  it("targetLevel 从 prefecture 切到 province 时旧 prefecture 请求会被标记 staleDropped", () => {
    expect(createAdminZoomSwitchDebug({
      previousLevel: "city",
      nextLevel: "province",
      requestId: 21,
      currentRequestId: 22,
      requestLevel: "city",
      desiredLevel: "province",
      requestScopeKey: "city:gcj02:auto",
      desiredScopeKey: "province:gcj02:auto",
    })).toMatchObject({
      previousLevel: "city",
      nextLevel: "province",
      switched: true,
      staleDropped: true,
      oldOverlayRetentionMs: 0,
    });
  });

  it("已有 province cache 时 zoom out 能立即使用 province scope，并缩短 reload delay", () => {
    const debug = createAdminZoomSwitchDebug({
      previousLevel: "city",
      nextLevel: "province",
      cacheHit: true,
    });

    expect(debug).toMatchObject({
      switched: true,
      cacheHit: true,
      immediateCacheRender: true,
      oldOverlayRetentionMs: 0,
    });
    expect(getAdminViewportReloadDelayMs({
      levelChanged: true,
      cacheHit: true,
      missingTileCount: 0,
    })).toBe(0);
  });

  it("level 切换无缓存时也只保留很短 reload delay，同 level missing tile 使用 pan delay", () => {
    expect(getAdminViewportReloadDelayMs({
      levelChanged: true,
      cacheHit: false,
      missingTileCount: 0,
    })).toBe(40);
    expect(getAdminViewportReloadDelayMs({
      levelChanged: false,
      cacheHit: false,
      missingTileCount: 2,
    })).toBe(120);
    expect(getAdminViewportReloadDelayMs({
      levelChanged: false,
      cacheHit: false,
      missingTileCount: 0,
    })).toBe(260);
  });

  it("display cache key 区分 raw / gcj02，避免渲染坐标混用", () => {
    const query = resolveAdministrativeBoundaryQuery({
      zoom: 10.8,
      center: { lat: 24.48, lng: 118.08 },
      bounds: xiamenSmallBounds,
      previousLevel: "city",
    });

    expect(getAdministrativeBoundaryDisplayCacheKey(query, "raw")).not.toBe(
      getAdministrativeBoundaryDisplayCacheKey(query, "gcj02"),
    );
    expect(getAdministrativeBoundaryDisplayCacheKey(query, "gcj02")).toContain(":gcj02");
  });

  it("county 图幅过大时触发保护并保持市级，避免一次渲染过多区县", () => {
    const query = resolveAdministrativeBoundaryQuery({
      zoom: 10.6,
      center: { lat: 24.48, lng: 118.08 },
      bounds: {
        minLat: 23.65,
        maxLat: 25.15,
        minLng: 117.1,
        maxLng: 119.4,
      },
      previousLevel: "district",
    });

    expect(query.targetLevel).toBe("city");
    expect(query.searchLevel).toBe("province");
  });

  it("viewport 覆盖多个城市时不会因为中心在广州显示广州区级", () => {
    const resolved = resolveAdminBoundaryLevel(
      10.2,
      {
        center: { lat: 23.13, lng: 113.27 },
        bounds: pearlRiverDeltaBounds,
      },
      undefined,
      "city",
    );

    expect(resolved.targetLevel).toBe("city");
    expect(resolved.downgradeReason).toBe("viewport_crosses_multiple_cities");
  });

  it("华南多省区域图幅显示多个省下的市级单位", () => {
    const query = resolveAdministrativeBoundaryQuery({
      zoom: 6.2,
      center: { lat: 23.13, lng: 113.27 },
      bounds: southChinaRegionalBounds,
      previousLevel: "city",
    });

    expect(query.targetLevel).toBe("city");
    expect(query.searchLevel).toBe("province");
    expect(query.parentAdcodes).toEqual(
      expect.arrayContaining(["440000", "450000", "430000", "360000"]),
    );
    expect(query.parentAdcodes?.length).toBeGreaterThan(1);
    expect(query.parentAdcodes?.length).toBeLessThanOrEqual(6);
    expect(query.parentAdcodes?.[0]).toBe("440000");
  });

  it("广东广西省界附近同时显示两个省的市级单位", () => {
    const query = resolveAdministrativeBoundaryQuery({
      zoom: 7,
      center: { lat: 23.3, lng: 111.2 },
      bounds: guangdongGuangxiBoundaryBounds,
      previousLevel: "city",
    });

    expect(query.targetLevel).toBe("city");
    expect(query.parentAdcodes).toEqual(
      expect.arrayContaining(["440000", "450000"]),
    );
    expect(query.parentAdcodes?.length).toBeGreaterThan(1);
  });

  it("行政区 label 使用地图文字样式，不包含圆角胶囊和按钮背景", () => {
    const content = buildAmapRegionLabelContent({
      id: "admin-440100-label",
      name: "广州市",
      shortName: "广州市",
      coordinates: { lat: 23.13, lng: 113.27 },
      priority: 1,
      labelKind: "city",
    });

    expect(content).toContain("广州市");
    expect(content).toContain("wanderly-admin-label-plain");
    expect(content).not.toContain("border-radius");
    expect(content).not.toContain("background:");
    expect(content).not.toContain("border:");
    expect(content).not.toContain("box-shadow");
  });

  it("行政区 label lifecycle debug 能识别重复 label key", () => {
    expect(createAdminLabelLifecycleDebug({
      renderPassId: 7,
      targetLevel: "district",
      labelKeys: [
        "district:tile-a:440303",
        "district:tile-a:440303",
        "district:tile-a:440304",
      ],
      labelCreatedCount: 3,
      labelRetainedCount: 0,
    })).toEqual({
      renderPassId: 7,
      targetLevel: "district",
      labelCreatedCount: 3,
      labelRemovedCount: 0,
      labelRetainedCount: 0,
      duplicateLabelKeys: ["district:tile-a:440303"],
      pmtilesOnly: false,
      skippedByPmtilesOnly: false,
      staleLabelCleanupCount: 0,
    });
  });

  it("区县 label 是纯文字但颜色和 halo 更清楚", () => {
    const content = buildAmapRegionLabelContent({
      id: "admin-350203-label",
      name: "思明区",
      shortName: "思明区",
      coordinates: { lat: 24.45, lng: 118.08 },
      priority: 1,
      labelKind: "district",
    });

    expect(content).toContain("思明区");
    expect(content).toContain("rgba(55,48,38,0.86)");
    expect(content).toContain("font-weight:600");
    expect(content).toContain("rgba(245,238,220,0.85)");
    expect(content).not.toContain("background:");
    expect(content).not.toContain("border-radius");
  });

  it("admin geometry display mode 默认 gcj02，production 会禁用 debug_both", () => {
    expect(resolveAdminGeometryDisplayMode()).toBe("gcj02");
    expect(resolveAdminGeometryDisplayMode("raw")).toBe("raw");
    expect(resolveAdminGeometryDisplayMode("debug_both")).toBe("debug_both");
  });

  it("行政区边界样式按层级递减，county 比 city/province 更细更淡", () => {
    const provinceStyle = resolveAdminBoundaryPolygonStyle({
      level: "province",
      styleMode: "soft",
    });
    const cityStyle = resolveAdminBoundaryPolygonStyle({
      level: "city",
      styleMode: "soft",
    });
    const countyStyle = resolveAdminBoundaryPolygonStyle({
      level: "district",
      styleMode: "soft",
    });

    expect(countyStyle.strokeWeight).toBeLessThan(cityStyle.strokeWeight);
    expect(cityStyle.strokeWeight).toBeLessThan(provinceStyle.strokeWeight);
    expect(countyStyle.strokeOpacity).toBeLessThan(cityStyle.strokeOpacity);
    expect(cityStyle.strokeOpacity).toBeLessThan(provinceStyle.strokeOpacity);
    expect(countyStyle.fillOpacity).toBeLessThan(cityStyle.fillOpacity);
  });

  it("county boundary line style 保持轻量，避免残留双线过于刺眼", () => {
    const countyLine = resolveAdminBoundaryLineStyle("district", "child", "district");
    const prefectureLine = resolveAdminBoundaryLineStyle("city", "parent", "district");
    const provinceLine = resolveAdminBoundaryLineStyle("province", "parent", "district");

    expect(countyLine.strokeWeight).toBeLessThan(prefectureLine.strokeWeight ?? 0);
    expect(prefectureLine.strokeWeight).toBeLessThan(provinceLine.strokeWeight ?? 0);
    expect(countyLine.strokeOpacity).toBeLessThan(prefectureLine.strokeOpacity ?? 0);
    expect(countyLine.strokeWeight).toBeLessThanOrEqual(0.7);
    expect(countyLine.strokeOpacity).toBeLessThanOrEqual(0.4);
    expect(countyLine.strokeColor).not.toContain("0,0,0");
    expect(countyLine.lineJoin).toBe("round");
    expect(countyLine.lineCap).toBe("round");
  });

  it("prefecture targetLevel 下市级边界为主，省界只做柔和外轮廓", () => {
    const prefectureLine = resolveAdminBoundaryLineStyle("city", "child", "city");
    const provinceParentLine = resolveAdminBoundaryLineStyle("province", "parent", "city");
    const countyLine = resolveAdminBoundaryLineStyle("district", "child", "city");

    expect(prefectureLine.strokeWeight).toBeGreaterThan(countyLine.strokeWeight ?? 0);
    expect(prefectureLine.strokeOpacity).toBeGreaterThan(countyLine.strokeOpacity ?? 0);
    expect(Number(provinceParentLine.zIndex)).toBeGreaterThan(Number(prefectureLine.zIndex));
    expect(provinceParentLine.strokeOpacity).toBeLessThan(prefectureLine.strokeOpacity ?? 1);
    expect(provinceParentLine.strokeWeight).toBeLessThanOrEqual(1.3);
    expect(prefectureLine.strokeColor).not.toContain("0,0,0");
  });

  it("province targetLevel 下省界为主但不退回纯黑高透明硬线", () => {
    const provinceLine = resolveAdminBoundaryLineStyle("province", "child", "province");
    const prefectureLine = resolveAdminBoundaryLineStyle("city", "child", "province");
    const countyLine = resolveAdminBoundaryLineStyle("district", "child", "province");

    expect(provinceLine.strokeWeight).toBeGreaterThan(prefectureLine.strokeWeight ?? 0);
    expect(prefectureLine.strokeWeight).toBeGreaterThan(countyLine.strokeWeight ?? 0);
    expect(provinceLine.strokeOpacity).toBeLessThanOrEqual(0.66);
    expect(provinceLine.strokeColor).not.toContain("0,0,0");
    expect(provinceLine.lineJoin).toBe("round");
    expect(provinceLine.lineCap).toBe("round");
  });

  it("两个相邻 polygon 的 shared segment A-B / B-A 去重后保留一次且不删除外边界", () => {
    const regions: LoadedAdministrativeBoundaryRegion[] = [
      createLoadedAdminRegion({
        id: "left",
        name: "左区",
        adcode: "100001",
        boundaries: [[
          { lng: 0, lat: 0 },
          { lng: 1, lat: 0 },
          { lng: 1, lat: 1 },
          { lng: 0, lat: 0 },
        ]],
      }),
      createLoadedAdminRegion({
        id: "right",
        name: "右区",
        adcode: "100002",
        boundaries: [[
          { lng: 1, lat: 1 },
          { lng: 1, lat: 0 },
          { lng: 2, lat: 1 },
          { lng: 1, lat: 1 },
        ]],
      }),
    ];

    const build = buildAdminBoundaryLineSegments(regions, {
      mode: "all",
      targetLevel: "district",
    });
    const sharedSegments = build.segments.filter((segment) => segment.count === 2);

    expect(build.stats.rawSegmentCount).toBe(6);
    expect(build.stats.dedupedSegmentCount).toBe(5);
    expect(build.stats.duplicateSegmentCount).toBe(1);
    expect(build.stats.skippedSegmentCount).toBe(0);
    expect(build.segments).toHaveLength(5);
    expect(sharedSegments).toHaveLength(1);
    expect(sharedSegments[0]?.count).toBe(2);
    expect(sharedSegments[0]?.path).toEqual([
      { lng: 1, lat: 0 },
      { lng: 1, lat: 1 },
    ]);
  });

  it("count=2 的 shared edge 保留一次，不能被重复逻辑删掉", () => {
    const regions: LoadedAdministrativeBoundaryRegion[] = [
      createLoadedAdminRegion({
        id: "a",
        adcode: "a",
        boundaries: [[
          { lng: 0, lat: 0 },
          { lng: 1, lat: 0 },
          { lng: 1, lat: 1 },
          { lng: 0, lat: 1 },
          { lng: 0, lat: 0 },
        ]],
      }),
      createLoadedAdminRegion({
        id: "b",
        adcode: "b",
        boundaries: [[
          { lng: 1, lat: 0 },
          { lng: 2, lat: 0 },
          { lng: 2, lat: 1 },
          { lng: 1, lat: 1 },
          { lng: 1, lat: 0 },
        ]],
      }),
    ];

    const segments = createDedupedAdminBoundaryLineSegments(regions);
    const shared = segments.filter((segment) => segment.count === 2);

    expect(shared).toHaveLength(1);
    expect(segments).toContainEqual(expect.objectContaining({
      count: 2,
      path: [
        { lng: 1, lat: 0 },
        { lng: 1, lat: 1 },
      ],
    }));
  });

  it("反向 ring 顺序不会导致同一条边界重复绘制", () => {
    const clockwise = createLoadedAdminRegion({
      id: "cw",
      adcode: "cw",
      boundaries: [[
        { lng: 0, lat: 0 },
        { lng: 1, lat: 0 },
        { lng: 1, lat: 1 },
        { lng: 0, lat: 1 },
        { lng: 0, lat: 0 },
      ]],
    });
    const counterClockwise = createLoadedAdminRegion({
      id: "ccw",
      adcode: "ccw",
      boundaries: [[
        { lng: 0, lat: 0 },
        { lng: 0, lat: 1 },
        { lng: 1, lat: 1 },
        { lng: 1, lat: 0 },
        { lng: 0, lat: 0 },
      ]],
    });

    const build = buildAdminBoundaryLineSegments([clockwise, counterClockwise], {
      targetLevel: "district",
      tolerance: 0,
    });

    expect(build.stats.rawSegmentCount).toBe(8);
    expect(build.stats.dedupedSegmentCount).toBe(4);
    expect(build.stats.duplicateSegmentCount).toBe(4);
    expect(build.segments.every((segment) => segment.count === 2)).toBe(true);
  });

  it("近似但不完全重合的边界在 tolerance 内会 snap 成一条 boundary line", () => {
    const build = buildAdminBoundaryLineSegments([
      createLoadedAdminRegion({
        id: "left",
        adcode: "left",
        boundaries: [[
          { lng: 0, lat: 0 },
          { lng: 1, lat: 0 },
          { lng: 1, lat: 1 },
          { lng: 0, lat: 1 },
          { lng: 0, lat: 0 },
        ]],
      }),
      createLoadedAdminRegion({
        id: "right",
        adcode: "right",
        boundaries: [[
          { lng: 1.0004, lat: 0 },
          { lng: 2, lat: 0 },
          { lng: 2, lat: 1 },
          { lng: 1.0004, lat: 1 },
          { lng: 1.0004, lat: 0 },
        ]],
      }),
    ], {
      targetLevel: "district",
      tolerance: 0.001,
    });

    const snappedShared = build.segments.filter((segment) => segment.count === 2);

    expect(build.stats.rawSegmentCount).toBe(8);
    expect(build.stats.dedupedSegmentCount).toBe(7);
    expect(build.stats.duplicateSegmentCount).toBe(1);
    expect(build.stats.snappedSegmentCount).toBe(1);
    expect(build.stats.snappedSegmentRatio).toBeGreaterThan(0);
    expect(build.stats.dedupeRatio).toBeGreaterThan(0);
    expect(snappedShared).toHaveLength(1);
  });

  it("超出 tolerance 的近似边界不能被错误合并", () => {
    const build = buildAdminBoundaryLineSegments([
      createLoadedAdminRegion({
        id: "left",
        adcode: "left",
        boundaries: [[
          { lng: 0, lat: 0 },
          { lng: 1, lat: 0 },
          { lng: 1, lat: 1 },
          { lng: 0, lat: 1 },
          { lng: 0, lat: 0 },
        ]],
      }),
      createLoadedAdminRegion({
        id: "right",
        adcode: "right",
        boundaries: [[
          { lng: 1.002, lat: 0 },
          { lng: 2, lat: 0 },
          { lng: 2, lat: 1 },
          { lng: 1.002, lat: 1 },
          { lng: 1.002, lat: 0 },
        ]],
      }),
    ], {
      targetLevel: "district",
      tolerance: 0.001,
    });

    expect(build.stats.rawSegmentCount).toBe(8);
    expect(build.stats.dedupedSegmentCount).toBe(8);
    expect(build.stats.duplicateSegmentCount).toBe(0);
    expect(build.stats.snappedSegmentCount).toBe(0);
    expect(build.segments.filter((segment) => segment.count === 2)).toHaveLength(0);
  });

  it("county tolerance 只做小幅吸附，较远的平行边不会被错误合并", () => {
    const countyTolerance = getAdminBoundarySnapTolerance("district");

    expect(countyTolerance).toBeGreaterThan(0);
    expect(countyTolerance).toBeLessThanOrEqual(0.00015);

    const build = buildAdminBoundaryLineSegments([
      createLoadedAdminRegion({
        id: "left",
        adcode: "left",
        boundaries: [[
          { lng: 0, lat: 0 },
          { lng: 1, lat: 0 },
          { lng: 1, lat: 1 },
          { lng: 0, lat: 1 },
          { lng: 0, lat: 0 },
        ]],
      }),
      createLoadedAdminRegion({
        id: "right",
        adcode: "right",
        boundaries: [[
          { lng: 1 + countyTolerance * 3, lat: 0 },
          { lng: 2, lat: 0 },
          { lng: 2, lat: 1 },
          { lng: 1 + countyTolerance * 3, lat: 1 },
          { lng: 1 + countyTolerance * 3, lat: 0 },
        ]],
      }),
    ], {
      targetLevel: "district",
      tolerance: countyTolerance,
    });

    expect(build.stats.dedupedSegmentCount).toBe(8);
    expect(build.stats.snappedSegmentCount).toBe(0);
    expect(build.segments.filter((segment) => segment.count === 2)).toHaveLength(0);
  });

  it("county tolerance 不会合并 2 倍 tolerance 外的不相邻边界", () => {
    const countyTolerance = getAdminBoundarySnapTolerance("district");
    const offset = countyTolerance * 2;
    const build = buildAdminBoundaryLineSegments([
      createLoadedAdminRegion({
        id: "left",
        adcode: "left",
        boundaries: [[
          { lng: 0, lat: 0 },
          { lng: 1, lat: 0 },
          { lng: 1, lat: 1 },
          { lng: 0, lat: 1 },
          { lng: 0, lat: 0 },
        ]],
      }),
      createLoadedAdminRegion({
        id: "right",
        adcode: "right",
        boundaries: [[
          { lng: 1 + offset, lat: 0 },
          { lng: 2, lat: 0 },
          { lng: 2, lat: 1 },
          { lng: 1 + offset, lat: 1 },
          { lng: 1 + offset, lat: 0 },
        ]],
      }),
    ], {
      targetLevel: "district",
      tolerance: countyTolerance,
    });

    expect(build.stats.dedupedSegmentCount).toBe(8);
    expect(build.stats.duplicateSegmentCount).toBe(0);
    expect(build.stats.snappedSegmentCount).toBe(0);
    expect(build.segments.filter((segment) => segment.count === 2)).toHaveLength(0);
  });

  it("MultiPolygon 多个 exterior ring 不会被错误连接成一条 boundary", () => {
    const build = buildAdminBoundaryLineSegments([
      createLoadedAdminRegion({
        id: "multi",
        adcode: "multi",
        boundaries: [
          [
            { lng: 0, lat: 0 },
            { lng: 1, lat: 0 },
            { lng: 1, lat: 1 },
            { lng: 0, lat: 1 },
            { lng: 0, lat: 0 },
          ],
          [
            { lng: 3, lat: 3 },
            { lng: 4, lat: 3 },
            { lng: 4, lat: 4 },
            { lng: 3, lat: 4 },
            { lng: 3, lat: 3 },
          ],
        ],
      }),
    ], {
      targetLevel: "district",
      tolerance: 0,
    });

    expect(build.stats.polygonCount).toBe(2);
    expect(build.stats.rawSegmentCount).toBe(8);
    expect(build.segments).toHaveLength(8);
    expect(build.segments).not.toContainEqual(expect.objectContaining({
      path: [
        { lng: 1, lat: 1 },
        { lng: 3, lat: 3 },
      ],
    }));
  });

  it("非法 segment 才跳过：零长度、非数字和过短 ring 被统计为 skipped", () => {
    const build = buildAdminBoundaryLineSegments([
      createLoadedAdminRegion({
        boundaries: [
          [
            { lng: 0, lat: 0 },
            { lng: 0, lat: 0 },
            { lng: 1, lat: 1 },
            { lng: 0, lat: 0 },
          ],
          [
            { lng: Number.NaN, lat: 0 },
            { lng: 2, lat: 0 },
            { lng: 2, lat: 1 },
            { lng: Number.NaN, lat: 0 },
          ],
          [
            { lng: 3, lat: 0 },
            { lng: 3, lat: 1 },
          ],
        ],
      }),
    ]);

    expect(build.stats.skippedSegmentCount).toBeGreaterThanOrEqual(3);
    expect(build.segments.every((segment) =>
      segment.path.every((point) =>
        Number.isFinite(point.lng) && Number.isFinite(point.lat),
      ),
    )).toBe(true);
  });

  it("province / prefecture / county 使用不同 dedupe map，不跨层合并 segment", () => {
    const province = buildAdminBoundaryLineSegments([
      createLoadedAdminRegion({ level: "province" }),
    ], { targetLevel: "province" });
    const prefecture = buildAdminBoundaryLineSegments([
      createLoadedAdminRegion({ level: "prefecture" }),
    ], { targetLevel: "city" });
    const county = buildAdminBoundaryLineSegments([
      createLoadedAdminRegion({ level: "county" }),
    ], { targetLevel: "district" });

    expect(province.stats.targetLevel).toBe("province");
    expect(prefecture.stats.targetLevel).toBe("city");
    expect(county.stats.targetLevel).toBe("district");
    expect(province.segments).toHaveLength(prefecture.segments.length);
    expect(prefecture.segments).toHaveLength(county.segments.length);
  });

  it("viewport bbox 过滤只选择 feature，不会在 boundary build 前裁碎 geometry", () => {
    const fullBoundary = [
      { lng: 0, lat: 0 },
      { lng: 4, lat: 0 },
      { lng: 4, lat: 4 },
      { lng: 0, lat: 4 },
      { lng: 0, lat: 0 },
    ];
    const prepared = prepareAdminBoundaryRegionsForRender([
      createLoadedAdminRegion({
        boundaries: [fullBoundary],
        bbox: {
          minLng: 0,
          minLat: 0,
          maxLng: 4,
          maxLat: 4,
        },
      }),
    ], {
      targetLevel: "district",
      parentAdcode: "440300",
      bounds: {
        minLng: 3.5,
        minLat: 3.5,
        maxLng: 4.5,
        maxLat: 4.5,
      },
      viewportPaddingRatio: 0,
    });

    expect(prepared.regions).toHaveLength(1);
    expect(prepared.regions[0]?.boundaries[0]).toEqual(fullBoundary);
    expect(buildAdminBoundaryLineSegments(prepared.regions).segments).toHaveLength(4);
  });

  it("county 模式 province/prefecture/county boundary zIndex 按父级优先", () => {
    const countyLine = resolveAdminBoundaryLineStyle("district", "child", "district");
    const prefectureLine = resolveAdminBoundaryLineStyle("city", "parent", "district");
    const provinceLine = resolveAdminBoundaryLineStyle("province", "parent", "district");

    expect(Number(provinceLine.zIndex)).toBeGreaterThan(Number(prefectureLine.zIndex));
    expect(Number(prefectureLine.zIndex)).toBeGreaterThan(Number(countyLine.zIndex));
    expect(Number(provinceLine.strokeWeight)).toBeGreaterThan(
      Number(prefectureLine.strokeWeight),
    );
    expect(Number(prefectureLine.strokeWeight)).toBeGreaterThan(
      Number(countyLine.strokeWeight),
    );
  });

  it("render overlay audit 能统计同一 snapped segment 在同一 render pass 的重复绘制", () => {
    const first = createAdminBoundaryOverlayAuditRecord({
      overlayId: "county-1",
      level: "district",
      source: "childBoundary",
      segmentKey: "113.90000,22.60000|114.00000,22.70000",
      zIndex: 480,
      strokeWeight: 0.68,
      strokeOpacity: 0.38,
      requestId: 11,
      regionAdcodes: ["440300"],
      regionNames: ["深圳市"],
    });
    const second = createAdminBoundaryOverlayAuditRecord({
      overlayId: "county-2",
      level: "district",
      source: "childBoundary",
      segmentKey: first.segmentKey,
      zIndex: 480.0001,
      strokeWeight: 0.68,
      strokeOpacity: 0.38,
      requestId: 11,
      regionAdcodes: ["441900"],
      regionNames: ["东莞市"],
    });

    const snapshot = createAdminRenderOverlayAuditSnapshot([first, second], {
      requestId: 11,
      targetLevel: "district",
      viewportTileKey: "district:focus",
    });

    expect(snapshot.boundaryOverlayCount).toBe(2);
    expect(snapshot.countyBoundaryCount).toBe(2);
    expect(snapshot.duplicateSegmentGroupCount).toBe(1);
    expect(snapshot.topDuplicateSegmentGroups[0]).toEqual(expect.objectContaining({
      count: 2,
      snappedSegmentKey: first.segmentKey,
      crossLevelDuplicate: false,
      focusRegionDuplicate: true,
    }));
  });

  it("render overlay audit 能区分 retained old overlay 和新 overlay", () => {
    const oldOverlay = createAdminBoundaryOverlayAuditRecord({
      overlayId: "old-county-1",
      level: "county",
      source: "retainedOldOverlay",
      segmentKey: "old-shared-key",
      zIndex: 480,
      strokeWeight: 0.68,
      strokeOpacity: 0.38,
      requestId: 10,
      regionAdcodes: ["440300"],
    });
    const newOverlay = createAdminBoundaryOverlayAuditRecord({
      overlayId: "new-county-1",
      level: "county",
      source: "childBoundary",
      segmentKey: "new-shared-key",
      zIndex: 480,
      strokeWeight: 0.68,
      strokeOpacity: 0.38,
      requestId: 11,
      regionAdcodes: ["441900"],
    });

    const snapshot = createAdminRenderOverlayAuditSnapshot([oldOverlay, newOverlay], {
      requestId: 11,
      targetLevel: "district",
      cleanupScheduled: true,
      cleanupDelayMs: 750,
    });

    expect(snapshot.retainedOldOverlayCount).toBe(1);
    expect(snapshot.childBoundaryOverlayCount).toBe(1);
    expect(snapshot.cleanupScheduled).toBe(true);
    expect(snapshot.cleanupDelayMs).toBe(750);
    expect(snapshot.retainedOldOverlayStableState).toBe(false);
  });

  it("county + prefecture 同线叠加会被标记为 crossLevelDuplicate", () => {
    const county = createAdminBoundaryOverlayAuditRecord({
      overlayId: "county-edge",
      level: "district",
      source: "childBoundary",
      segmentKey: "same-parent-edge",
      zIndex: 480,
      strokeWeight: 0.68,
      strokeOpacity: 0.38,
      regionAdcodes: ["440300"],
    });
    const prefecture = createAdminBoundaryOverlayAuditRecord({
      overlayId: "prefecture-edge",
      level: "city",
      source: "parentBoundary",
      segmentKey: county.segmentKey,
      zIndex: 520,
      strokeWeight: 1.65,
      strokeOpacity: 0.74,
      regionAdcodes: ["440300", "441900"],
    });

    const snapshot = createAdminRenderOverlayAuditSnapshot([county, prefecture], {
      targetLevel: "district",
    });

    expect(snapshot.duplicateSegmentGroupCount).toBe(1);
    expect(snapshot.crossLevelDuplicateGroupCount).toBe(1);
    expect(snapshot.parentBoundaryOverlayCount).toBe(1);
    expect(snapshot.topDuplicateSegmentGroups[0]).toEqual(expect.objectContaining({
      levels: ["county", "prefecture"],
      sources: ["childBoundary", "parentBoundary"],
      crossLevelDuplicate: true,
    }));
  });

  it("level switch 期间 retained old overlay 不会被误判为稳定状态", () => {
    const retained = createAdminBoundaryOverlayAuditRecord({
      overlayId: "retained-prefecture",
      level: "prefecture",
      source: "retainedOldOverlay",
      segmentKey: "prefecture-old-edge",
      zIndex: 520,
      strokeWeight: 1.5,
      strokeOpacity: 0.7,
      requestId: 4,
      regionAdcodes: ["440100"],
    });

    const snapshot = createAdminRenderOverlayAuditSnapshot([retained], {
      requestId: 5,
      targetLevel: "province",
      levelSwitch: true,
      cleanupScheduled: true,
      cleanupDelayMs: 0,
    });

    expect(snapshot.retainedOldOverlayCount).toBe(1);
    expect(snapshot.levelSwitch).toBe(true);
    expect(snapshot.retainedOldOverlayStableState).toBe(false);
  });

  it("行政区 reload 只在开启、层级、父级或手动刷新变化时触发", () => {
    const baseQuery = resolveAdministrativeBoundaryQuery({
      zoom: 7,
      center: { lat: 23.13, lng: 113.27 },
    });
    const sameQuery = resolveAdministrativeBoundaryQuery({
      zoom: 7.2,
      center: { lat: 23.2, lng: 113.3 },
      previousLevel: baseQuery.targetLevel,
    });
    const levelChangedQuery = resolveAdministrativeBoundaryQuery({
      zoom: 9,
      center: { lat: 22.5431, lng: 114.0579 },
      previousLevel: baseQuery.targetLevel,
    });
    const parentChangedQuery = {
      ...baseQuery,
      keyword: "广西壮族自治区",
      adcode: "450000",
    };

    expect(resolveAdministrativeBoundaryReloadReason({
      previousQuery: null,
      nextQuery: baseQuery,
    })).toBe("layer_enabled");
    expect(resolveAdministrativeBoundaryReloadReason({
      previousQuery: baseQuery,
      nextQuery: sameQuery,
    })).toBeNull();
    expect(resolveAdministrativeBoundaryReloadReason({
      previousQuery: baseQuery,
      nextQuery: sameQuery,
      manualRefresh: true,
    })).toBe("manual_refresh");
    expect(resolveAdministrativeBoundaryReloadReason({
      previousQuery: baseQuery,
      nextQuery: levelChangedQuery,
    })).toBe("level_changed");
    expect(resolveAdministrativeBoundaryReloadReason({
      previousQuery: baseQuery,
      nextQuery: parentChangedQuery,
    })).toBe("parent_changed");
    expect(getAdministrativeBoundaryCacheKey(baseQuery)).toBe("admin:440000:prefecture");
  });

  it("行政区边界图层使用 DistrictSearch 返回的真实 boundary，不复用旅行热点 polygon", async () => {
    const createdPolygons: AMapPolygonInstance[] = [];
    const createdMarkers: AMapMarkerInstance[] = [];
    const Polygon = vi.fn(function MockPolygon() {
      const polygon: AMapPolygonInstance = {
        setMap: vi.fn(),
      };
      createdPolygons.push(polygon);
      return polygon;
    }) as unknown as AMapPolygonConstructor;
    const Marker = vi.fn(function MockMarker() {
      const marker: AMapMarkerInstance = {
        setMap: vi.fn(),
        setzIndex: vi.fn(),
      };
      createdMarkers.push(marker);
      return marker;
    }) as unknown as AMapMarkerConstructor;
    const search: AMapDistrictSearchInstance = {
      search: vi.fn((_keyword, callback) => {
        callback("complete", {
          districtList: [
            {
              name: "深圳市",
              districtList: [
                {
                  name: "南山区",
                  adcode: "440305",
                  level: "district",
                  center: "113.9304,22.5333",
                  boundaries: [[
                    [113.88, 22.58],
                    [113.98, 22.58],
                    [113.98, 22.49],
                    [113.88, 22.49],
                  ]],
                },
                {
                  name: "福田区",
                  adcode: "440304",
                  level: "district",
                  center: "114.0557,22.5215",
                  boundaries: [[
                    [114.0, 22.56],
                    [114.11, 22.56],
                    [114.11, 22.49],
                    [114.0, 22.49],
                  ]],
                },
              ],
            },
          ],
        });
      }),
    };
    const DistrictSearch = vi.fn(function MockDistrictSearch() {
      return search;
    }) as unknown as AMapDistrictSearchConstructor;
    const amap: AMapGlobal = {
      DistrictSearch,
      Polygon,
      Marker,
    };
    const map: AMapMapInstance = {
      destroy: vi.fn(),
    };

    const layer = createAmapAdministrativeBoundaryLayer(amap, map, {
      center: { lat: 22.5431, lng: 114.0579 },
      zoom: 10,
      fillOpacity: 0.18,
      labelVisible: true,
    });
    await flushAdministrativeLayerPromises();

    expect(DistrictSearch).toHaveBeenNthCalledWith(1, {
      extensions: "base",
      subdistrict: 1,
      level: "city",
      showbiz: false,
    });
    expect(DistrictSearch).toHaveBeenNthCalledWith(2, {
      extensions: "all",
      subdistrict: 0,
      level: "district",
      showbiz: false,
    });
    expect(search.search).toHaveBeenNthCalledWith(1, "440300", expect.any(Function));
    expect(search.search).toHaveBeenNthCalledWith(2, "440305", expect.any(Function));
    expect(search.search).toHaveBeenNthCalledWith(3, "440304", expect.any(Function));
    expect(Polygon).toHaveBeenCalledTimes(2);
    expect(Marker).toHaveBeenCalledTimes(2);
    const expectedNanshanLabel = transformLngLatForAmap(113.93, 22.535, {
      displayMode: "gcj02",
      adcode: "440305",
      parentAdcode: "440300",
    });
    const expectedNanshanPath = [
      [113.88, 22.58],
      [113.98, 22.58],
      [113.98, 22.49],
      [113.88, 22.49],
    ].map(([lng, lat]) =>
      transformLngLatForAmap(lng, lat, {
        displayMode: "gcj02",
        adcode: "440305",
        parentAdcode: "440300",
      }),
    );
    expect(Marker).toHaveBeenCalledWith(
      expect.objectContaining({
        position: [
          expect.closeTo(expectedNanshanLabel[0], 5),
          expect.closeTo(expectedNanshanLabel[1], 5),
        ],
        content: expect.stringContaining("wanderly-admin-label-plain"),
        anchor: "top-left",
        offset: [0, 0],
      }),
    );
    expect(Polygon).toHaveBeenCalledWith(
      expect.objectContaining({
        path: expectedNanshanPath,
        fillOpacity: 0.045,
        strokeOpacity: 0,
        strokeWeight: 0,
        extData: expect.objectContaining({
          name: "南山区",
          adcode: "440305",
          overlayType: "administrative-boundary",
        }),
      }),
    );

    layer.cancel();
    expect(createdPolygons[0]?.setMap).toHaveBeenLastCalledWith(null);
    expect(createdMarkers[0]?.setMap).toHaveBeenLastCalledWith(null);
  });

  it("行政区 layer clearLabels 会清理 label overlay 且不清 polygon", async () => {
    const createdPolygons: Array<{ setMap: ReturnType<typeof vi.fn> }> = [];
    const createdMarkers: Array<{ setMap: ReturnType<typeof vi.fn>; setzIndex: ReturnType<typeof vi.fn> }> = [];
    const Polygon = vi.fn(function MockPolygon() {
      const polygon = {
        setMap: vi.fn(),
      };
      createdPolygons.push(polygon);
      return polygon;
    }) as unknown as AMapPolygonConstructor;
    const Marker = vi.fn(function MockMarker() {
      const marker = {
        setMap: vi.fn(),
        setzIndex: vi.fn(),
      };
      createdMarkers.push(marker);
      return marker;
    }) as unknown as AMapMarkerConstructor;
    const search: AMapDistrictSearchInstance = {
      search: vi.fn((_keyword, callback) => {
        callback("complete", {
          districtList: [
            {
              name: "深圳市",
              districtList: [
                {
                  name: "南山区",
                  adcode: "440305",
                  level: "district",
                  center: "113.9304,22.5333",
                  boundaries: [[
                    [113.88, 22.58],
                    [113.98, 22.58],
                    [113.98, 22.49],
                    [113.88, 22.49],
                  ]],
                },
              ],
            },
          ],
        });
      }),
    };
    const DistrictSearch = vi.fn(function MockDistrictSearch() {
      return search;
    }) as unknown as AMapDistrictSearchConstructor;
    const map: AMapMapInstance = {
      destroy: vi.fn(),
    };

    const layer = createAmapAdministrativeBoundaryLayer(
      { DistrictSearch, Polygon, Marker },
      map,
      {
        center: { lat: 22.5431, lng: 114.0579 },
        zoom: 10,
        labelVisible: true,
      },
    );
    await flushAdministrativeLayerPromises();

    expect(layer.getOverlayCounts().labels).toBe(1);
    expect(layer.getOverlayCounts().polygons).toBe(1);

    expect(layer.clearLabels()).toBe(1);

    expect(createdMarkers[0]?.setMap).toHaveBeenCalledWith(null);
    expect(createdPolygons[0]?.setMap).not.toHaveBeenLastCalledWith(null);
    expect(layer.getOverlayCounts()).toMatchObject({
      labels: 0,
      polygons: 1,
    });

    layer.cancel();
    expect(createdPolygons[0]?.setMap).toHaveBeenLastCalledWith(null);
  });

  it("旧行政区请求变 stale 后不会绘制覆盖新判定", async () => {
    const Polygon = vi.fn(function MockPolygon() {
      return {
        setMap: vi.fn(),
      };
    }) as unknown as AMapPolygonConstructor;
    const Marker = vi.fn(function MockMarker() {
      return {
        setMap: vi.fn(),
        setzIndex: vi.fn(),
      };
    }) as unknown as AMapMarkerConstructor;
    const search: AMapDistrictSearchInstance = {
      search: vi.fn((_keyword, callback) => {
        callback("complete", {
          districtList: [
            {
              name: "深圳市",
              districtList: [
                {
                  name: "南山区",
                  adcode: "440305",
                  level: "district",
                  center: "113.9304,22.5333",
                  boundaries: [[
                    [113.88, 22.58],
                    [113.98, 22.58],
                    [113.98, 22.49],
                    [113.88, 22.49],
                  ]],
                },
              ],
            },
          ],
        });
      }),
    };
    const DistrictSearch = vi.fn(function MockDistrictSearch() {
      return search;
    }) as unknown as AMapDistrictSearchConstructor;
    const onLoaded = vi.fn();
    const onStale = vi.fn();
    const map: AMapMapInstance = {
      destroy: vi.fn(),
    };

    createAmapAdministrativeBoundaryLayer(
      { DistrictSearch, Polygon, Marker },
      map,
      {
        requestId: 1,
        center: { lat: 22.5431, lng: 114.0579 },
        zoom: 10,
        isStale: () => true,
        onLoaded,
        onStale,
      },
    );
    await flushAdministrativeLayerPromises();

    expect(onStale).toHaveBeenCalledWith(1);
    expect(onLoaded).not.toHaveBeenCalled();
    expect(Polygon).not.toHaveBeenCalled();
    expect(Marker).not.toHaveBeenCalled();
  });

  it("行政区边界命中缓存时不重复调用 DistrictSearch", async () => {
    const Polygon = vi.fn(function MockPolygon() {
      return {
        setMap: vi.fn(),
      };
    }) as unknown as AMapPolygonConstructor;
    const Marker = vi.fn(function MockMarker() {
      return {
        setMap: vi.fn(),
        setzIndex: vi.fn(),
      };
    }) as unknown as AMapMarkerConstructor;
    const search: AMapDistrictSearchInstance = {
      search: vi.fn((_keyword, callback) => {
        callback("complete", {
          districtList: [
            {
              name: "深圳市",
              districtList: [
                {
                  name: "南山区",
                  adcode: "440305",
                  level: "district",
                  center: "113.9304,22.5333",
                  boundaries: [[
                    [113.88, 22.58],
                    [113.98, 22.58],
                    [113.98, 22.49],
                    [113.88, 22.49],
                  ]],
                },
              ],
            },
          ],
        });
      }),
    };
    const DistrictSearch = vi.fn(function MockDistrictSearch() {
      return search;
    }) as unknown as AMapDistrictSearchConstructor;
    const amap: AMapGlobal = {
      DistrictSearch,
      Polygon,
      Marker,
    };
    const map: AMapMapInstance = {
      destroy: vi.fn(),
    };

    const firstLayer = createAmapAdministrativeBoundaryLayer(amap, map, {
      center: { lat: 22.5431, lng: 114.0579 },
      zoom: 10,
    });
    await flushAdministrativeLayerPromises();
    expect(DistrictSearch).toHaveBeenCalledTimes(2);
    expect(search.search).toHaveBeenCalledTimes(2);

    const secondLayer = createAmapAdministrativeBoundaryLayer(amap, map, {
      center: { lat: 22.5431, lng: 114.0579 },
      zoom: 10,
    });
    await flushAdministrativeLayerPromises();

    expect(DistrictSearch).toHaveBeenCalledTimes(2);
    expect(search.search).toHaveBeenCalledTimes(2);
    expect(Polygon).toHaveBeenCalledTimes(2);

    firstLayer.cancel();
    secondLayer.cancel();
  });

  it("memory cache hit 不调用 provider 或 persistent cache", async () => {
    const cacheKey = getAdministrativeBoundaryCacheKey(shenzhenDistrictQuery);
    const adapter = createPersistentCacheAdapter({
      [cacheKey]: createAdminBoundaryCacheEntry(),
    });
    setAdministrativeBoundaryPersistentCacheAdapterForTests(adapter);
    const firstProvider = createDistrictSearchAmapMock();

    const firstResult = await loadAdministrativeBoundaries(firstProvider.amap, {
      query: shenzhenDistrictQuery,
      requestId: 1,
    });

    expect(firstResult.cacheSource).toBe("indexeddb");
    expect(firstProvider.DistrictSearch).not.toHaveBeenCalled();
    expect(adapter.get).toHaveBeenCalledTimes(1);

    const secondProvider = createDistrictSearchAmapMock();
    const secondResult = await loadAdministrativeBoundaries(secondProvider.amap, {
      query: shenzhenDistrictQuery,
      requestId: 2,
    });

    expect(secondResult.cacheSource).toBe("memory");
    expect(secondProvider.DistrictSearch).not.toHaveBeenCalled();
    expect(adapter.get).toHaveBeenCalledTimes(1);
  });

  it("IndexedDB cache hit 不调用 provider，并写回 memory cache", async () => {
    const cacheKey = getAdministrativeBoundaryCacheKey(shenzhenDistrictQuery);
    const adapter = createPersistentCacheAdapter({
      [cacheKey]: createAdminBoundaryCacheEntry(),
    });
    setAdministrativeBoundaryPersistentCacheAdapterForTests(adapter);
    const provider = createDistrictSearchAmapMock();

    const result = await loadAdministrativeBoundaries(provider.amap, {
      query: shenzhenDistrictQuery,
      requestId: 3,
    });

    expect(result.cacheSource).toBe("indexeddb");
    expect(result.cacheHit).toBe(true);
    expect(result.regions).toHaveLength(1);
    expect(provider.DistrictSearch).not.toHaveBeenCalled();
    expect(adapter.get).toHaveBeenCalledWith(cacheKey);
  });

  it("Data Hub hit 不调用 AMap fallback，并渲染 GeoJSON MultiPolygon 和 labelPoint", async () => {
    setAdministrativeBoundaryPersistentCacheAdapterForTests(
      createPersistentCacheAdapter(),
    );
    const prefectureResponse = {
      ok: true,
      parentAdcode: "440000",
      level: "prefecture",
      count: 1,
      features: [
        {
          adcode: "440100",
          name: "广州市",
          level: "prefecture",
          adminType: "prefecture_city",
          parentAdcode: "440000",
          provinceAdcode: "440000",
          prefectureAdcode: "440100",
          center: [113.2644, 23.1291],
          labelPoint: [113.28, 23.13],
          bbox: [112.95, 22.55, 114.05, 23.95],
          geometry: {
            type: "MultiPolygon",
            coordinates: [
              [[
                [113.0, 23.0],
                [113.8, 23.0],
                [113.8, 23.6],
                [113.0, 23.0],
              ]],
            ],
          },
          source: "reviewed_local_geojson_2025_admin_division",
          sourceUpdatedAt: "2025-01-01T00:00:00.000Z",
          confidence: null,
        },
      ],
      sourceSummary: {
        sources: ["reviewed_local_geojson_2025_admin_division"],
        missingGeometry: 0,
        generatedAt: "2026-10-07T00:00:00.000Z",
      },
    };
    const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
      const href = String(url);

      return new Response(JSON.stringify(
        href.includes("parentAdcode=100000")
          ? createProvinceApiResponse()
          : prefectureResponse,
      ), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const provider = createDistrictSearchAmapMock();
    const query = resolveAdministrativeBoundaryQuery({
      zoom: 7,
      center: { lat: 23.13, lng: 113.27 },
      bounds: guangdongBounds,
    });

    const result = await loadAdministrativeBoundaries(provider.amap, {
      query,
      requestId: 31,
    });

    expect(result.cacheSource).toBe("datahub");
    expect(result.regions).toHaveLength(1);
    expect(result.regions[0]?.boundaries[0]).toEqual([
      { lng: 113.0, lat: 23.0 },
      { lng: 113.8, lat: 23.0 },
      { lng: 113.8, lat: 23.6 },
      { lng: 113.0, lat: 23.0 },
    ]);
    expect(result.regions[0]?.labelPosition).toEqual({ lng: 113.28, lat: 23.13 });
    expect(result.parentBoundaryRegions).toHaveLength(1);
    expect(provider.DistrictSearch).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("Data Hub MultiPolygon 转换保留多个 outer ring，不把洞或多个 polygon flatten 成斜线 path", async () => {
    setAdministrativeBoundaryPersistentCacheAdapterForTests(
      createPersistentCacheAdapter(),
    );
    const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
      const href = String(url);

      return new Response(JSON.stringify(
        href.includes("parentAdcode=100000")
          ? createProvinceApiResponse()
          : {
              ok: true,
              parentAdcode: "350200",
              level: "county",
              count: 1,
              features: [
                {
                  adcode: "350203",
                  name: "思明区",
                  level: "county",
                  adminType: "district",
                  parentAdcode: "350200",
                  provinceAdcode: "350000",
                  prefectureAdcode: "350200",
                  center: [118.08, 24.45],
                  labelPoint: [118.08, 24.45],
                  bbox: [118.0, 24.4, 118.2, 24.55],
                  geometry: {
                    type: "MultiPolygon",
                    coordinates: [
                      [
                        [
                          [118.0, 24.4],
                          [118.2, 24.4],
                          [118.2, 24.55],
                          [118.0, 24.4],
                        ],
                        [
                          [118.05, 24.43],
                          [118.08, 24.43],
                          [118.08, 24.46],
                          [118.05, 24.43],
                        ],
                      ],
                      [[
                        [118.3, 24.42],
                        [118.36, 24.42],
                        [118.36, 24.48],
                        [118.3, 24.42],
                      ]],
                    ],
                  },
                  source: "reviewed_local_geojson_2025_admin_division",
                  sourceUpdatedAt: "2025-01-01T00:00:00.000Z",
                  confidence: null,
                },
              ],
              sourceSummary: {
                sources: ["reviewed_local_geojson_2025_admin_division"],
                missingGeometry: 0,
                generatedAt: "2026-10-07T00:00:00.000Z",
              },
            },
      ), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const provider = createDistrictSearchAmapMock();

    const result = await loadAdministrativeBoundaries(provider.amap, {
      query: {
        keyword: "厦门市",
        adcode: "350200",
        parentAdcodes: ["350200"],
        parentNames: ["厦门市"],
        targetLevel: "district",
        searchLevel: "city",
        subdistrict: 1,
        center: { lat: 24.48, lng: 118.08 },
        zoom: 10.4,
      },
      requestId: 37,
    });

    expect(result.cacheSource).toBe("datahub");
    expect(result.regions[0]?.boundaries).toHaveLength(2);
    expect(result.regions[0]?.boundaries[0]).toEqual([
      { lng: 118.0, lat: 24.4 },
      { lng: 118.2, lat: 24.4 },
      { lng: 118.2, lat: 24.55 },
      { lng: 118.0, lat: 24.4 },
    ]);
    expect(result.regions[0]?.boundaries[1]).toEqual([
      { lng: 118.3, lat: 24.42 },
      { lng: 118.36, lat: 24.42 },
      { lng: 118.36, lat: 24.48 },
      { lng: 118.3, lat: 24.42 },
    ]);
    expect(provider.DistrictSearch).not.toHaveBeenCalled();
  });

  it("GCJ-02 display transform 同步作用于 polygon path 和 labelPoint", async () => {
    setAdministrativeBoundaryPersistentCacheAdapterForTests(
      createPersistentCacheAdapter(),
    );
    const createdPolygonOptions: Array<Record<string, unknown>> = [];
    const createdMarkerOptions: Array<Record<string, unknown>> = [];
    const Polygon = vi.fn(function MockPolygon(options: Record<string, unknown>) {
      createdPolygonOptions.push(options);
      return {
        setMap: vi.fn(),
        on: vi.fn(),
      };
    }) as unknown as AMapPolygonConstructor;
    const Polyline = vi.fn(function MockPolyline() {
      return {
        setMap: vi.fn(),
        on: vi.fn(),
      };
    }) as unknown as AMapPolylineConstructor;
    const Marker = vi.fn(function MockMarker(options: Record<string, unknown>) {
      createdMarkerOptions.push(options);
      return {
        setMap: vi.fn(),
        setzIndex: vi.fn(),
      };
    }) as unknown as AMapMarkerConstructor;
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({
        ok: true,
        parentAdcode: "100000",
        level: "province",
        count: 1,
        features: [
          {
            adcode: "440000",
            name: "广东省",
            level: "province",
            adminType: "province",
            parentAdcode: "100000",
            provinceAdcode: "440000",
            prefectureAdcode: null,
            center: [113.28, 23.13],
            labelPoint: [113.28, 23.13],
            bbox: [113, 23, 114, 24],
            geometry: {
              type: "MultiPolygon",
              coordinates: [[[
                [113, 23],
                [114, 23],
                [114, 24],
                [113, 23],
              ]]],
            },
            source: "reviewed_local_geojson_2025_admin_division",
            sourceUpdatedAt: "2025-01-01T00:00:00.000Z",
            confidence: null,
          },
        ],
        sourceSummary: {
          sources: ["reviewed_local_geojson_2025_admin_division"],
          missingGeometry: 0,
          generatedAt: "2026-10-07T00:00:00.000Z",
        },
      }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const loaded = new Promise<void>((resolve) => {
      createAmapAdministrativeBoundaryLayer(
        { Polygon, Polyline, Marker },
        { destroy: vi.fn() },
        {
          query: {
            keyword: "中国",
            adcode: "100000",
            parentAdcodes: ["100000"],
            parentNames: ["中国"],
            targetLevel: "province",
            searchLevel: "country",
            subdistrict: 1,
            center: { lat: 35.8617, lng: 104.1954 },
            zoom: 4,
          },
          adminGeometryDisplayMode: "gcj02",
          onLoaded: () => resolve(),
        },
      );
    });

    await loaded;

    const expectedFirstPoint = transformLngLatForAmap(113, 23, {
      displayMode: "gcj02",
      adcode: "440000",
      parentAdcode: "100000",
    });
    const expectedLabelPoint = transformLngLatForAmap(113.28, 23.13, {
      displayMode: "gcj02",
      adcode: "440000",
      parentAdcode: "100000",
    });

    expect((createdPolygonOptions[0]?.path as unknown[])[0]).toEqual([
      expect.closeTo(expectedFirstPoint[0], 6),
      expect.closeTo(expectedFirstPoint[1], 6),
    ]);
    expect(createdMarkerOptions[0]?.position).toEqual([
      expect.closeTo(expectedLabelPoint[0], 6),
      expect.closeTo(expectedLabelPoint[1], 6),
    ]);
    expect(createdMarkerOptions[0]?.position).not.toEqual([113.28, 23.13]);
  });

  it("市级行政区渲染时额外绘制更高层级的省界叠层", async () => {
    const createdPolygonOptions: Array<Record<string, unknown>> = [];
    const createdPolylineOptions: Array<Record<string, unknown>> = [];
    const Polygon = vi.fn(function MockPolygon(options: Record<string, unknown>) {
      createdPolygonOptions.push(options);

      return {
        setMap: vi.fn(),
        on: vi.fn(),
      };
    }) as unknown as AMapPolygonConstructor;
    const Polyline = vi.fn(function MockPolyline(options: Record<string, unknown>) {
      createdPolylineOptions.push(options);

      return {
        setMap: vi.fn(),
        on: vi.fn(),
      };
    }) as unknown as AMapPolylineConstructor;
    const Marker = vi.fn(function MockMarker() {
      return {
        setMap: vi.fn(),
        setzIndex: vi.fn(),
      };
    }) as unknown as AMapMarkerConstructor;
    const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
      const href = String(url);

      return new Response(JSON.stringify(
        href.includes("parentAdcode=100000")
          ? createProvinceApiResponse()
          : {
              ok: true,
              parentAdcode: "440000",
              level: "prefecture",
              count: 1,
              features: [
                {
                  adcode: "440100",
                  name: "广州市",
                  level: "prefecture",
                  adminType: "prefecture_city",
                  parentAdcode: "440000",
                  provinceAdcode: "440000",
                  prefectureAdcode: "440100",
                  center: [113.2644, 23.1291],
                  labelPoint: [113.28, 23.13],
                  bbox: [112.95, 22.55, 114.05, 23.95],
                  geometry: {
                    type: "Polygon",
                    coordinates: [[
                      [113.0, 23.0],
                      [113.8, 23.0],
                      [113.8, 23.6],
                      [113.0, 23.0],
                    ]],
                  },
                  source: "reviewed_local_geojson_2025_admin_division",
                  sourceUpdatedAt: "2025-01-01T00:00:00.000Z",
                  confidence: null,
                },
              ],
              sourceSummary: {
                sources: ["reviewed_local_geojson_2025_admin_division"],
                missingGeometry: 0,
                generatedAt: "2026-10-07T00:00:00.000Z",
              },
            },
      ), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const map: AMapMapInstance = {
      destroy: vi.fn(),
    };
    const loaded = new Promise<void>((resolve) => {
      createAmapAdministrativeBoundaryLayer(
        { Polygon, Polyline, Marker },
        map,
        {
          query: {
            keyword: "广东省",
            adcode: "440000",
            targetLevel: "city",
            searchLevel: "province",
            subdistrict: 1,
            center: { lat: 23.13, lng: 113.27 },
            zoom: 7,
          },
          onLoaded: () => resolve(),
        },
      );
    });

    await loaded;

    const getOverlayType = (options: Record<string, unknown>) => {
      const extData = options.extData;

      return typeof extData === "object" && extData !== null
        ? (extData as { overlayType?: unknown }).overlayType
        : undefined;
    };
    const childBoundary = createdPolygonOptions.find((options) =>
      getOverlayType(options) === "administrative-boundary",
    );
    const parentBoundary = createdPolylineOptions.find((options) =>
      getOverlayType(options) === "administrative-parent-boundary",
    );

    expect(childBoundary).toBeDefined();
    expect(parentBoundary).toBeDefined();
    expect(Number(parentBoundary?.zIndex)).toBeGreaterThan(Number(childBoundary?.zIndex));
    expect(Number(parentBoundary?.strokeWeight)).toBeGreaterThan(
      Number(childBoundary?.strokeWeight),
    );
    expect(parentBoundary?.strokeColor).toBe("rgba(86,72,52,0.48)");
    expect(Number(parentBoundary?.strokeOpacity)).toBeLessThanOrEqual(0.5);
    expect(parentBoundary?.lineJoin).toBe("round");
    expect(parentBoundary?.lineCap).toBe("round");
    expect(parentBoundary?.extData).toEqual(expect.objectContaining({
      adminBoundaryAudit: expect.objectContaining({
        level: "province",
        source: "parentBoundary",
        strokeOpacity: parentBoundary?.strokeOpacity,
        strokeWeight: parentBoundary?.strokeWeight,
      }),
    }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("render-time 会按 viewport bbox 过滤区县，不把视窗外 county 画进当前图幅", () => {
    const inside = createLoadedAdminRegion({
      id: "admin-440305",
      name: "南山区",
      adcode: "440305",
      bbox: {
        minLat: 22.49,
        maxLat: 22.58,
        minLng: 113.88,
        maxLng: 113.98,
      },
    });
    const outside = createLoadedAdminRegion({
      id: "admin-440304",
      name: "福田区",
      adcode: "440304",
      center: { lat: 23.5, lng: 115.5 },
      labelPosition: { lat: 23.5, lng: 115.5 },
      bbox: {
        minLat: 23.45,
        maxLat: 23.55,
        minLng: 115.45,
        maxLng: 115.55,
      },
      boundaries: [[
        { lat: 23.45, lng: 115.45 },
        { lat: 23.55, lng: 115.45 },
        { lat: 23.55, lng: 115.55 },
        { lat: 23.45, lng: 115.45 },
      ]],
    });

    const prepared = prepareAdminBoundaryRegionsForRender([inside, outside], {
      targetLevel: "district",
      parentAdcode: "440300",
      zoom: 10,
      bounds: shenzhenSmallBounds,
      viewportPaddingRatio: 0.15,
    });

    expect(prepared.stats.rawFeatureCount).toBe(2);
    expect(prepared.stats.viewportFilteredFeatureCount).toBe(1);
    expect(prepared.regions.map((region) => region.adcode)).toEqual(["440305"]);
  });

  it("render-time 会简化长边界并在低 zoom 隐藏小碎片，但保留主 polygon", () => {
    const longPath: Array<{ lat: number; lng: number }> = [];

    for (let index = 0; index < 80; index += 1) {
      longPath.push({
        lat: 22.5 + Math.sin(index / 5) * 0.008,
        lng: 113.8 + index * 0.01,
      });
    }
    longPath.push(longPath[0]!);

    const tinyIsland = [
      { lat: 22.2, lng: 113.2 },
      { lat: 22.2004, lng: 113.2 },
      { lat: 22.2004, lng: 113.2004 },
      { lat: 22.2, lng: 113.2 },
    ];
    const region = createLoadedAdminRegion({
      boundaries: [longPath, tinyIsland],
      bbox: {
        minLat: 22.19,
        maxLat: 22.6,
        minLng: 113.19,
        maxLng: 114.6,
      },
    });

    const prepared = prepareAdminBoundaryRegionsForRender([region], {
      targetLevel: "district",
      parentAdcode: "440300",
      zoom: 9,
      bounds: {
        minLat: 22.0,
        maxLat: 22.8,
        minLng: 113.0,
        maxLng: 114.8,
      },
    });

    expect(prepared.stats.rawRingCount).toBe(2);
    expect(prepared.stats.filteredRingCount).toBe(1);
    expect(prepared.stats.simplifiedPointCount).toBeLessThan(
      prepared.stats.rawPointCount,
    );
    expect(prepared.regions[0]?.boundaries).toHaveLength(1);
  });

  it("label 密度控制只隐藏过密文字，不影响 polygon 渲染候选", () => {
    const regions = Array.from({ length: 12 }, (_item, index) =>
      createLoadedAdminRegion({
        id: `admin-label-${index}`,
        name: `测试区${index}`,
        adcode: `4403${String(index).padStart(2, "0")}`,
        center: { lat: 22.5 + index * 0.002, lng: 114.0 + index * 0.002 },
        labelPosition: { lat: 22.5 + index * 0.002, lng: 114.0 + index * 0.002 },
      }),
    );

    const labels = selectAdminBoundaryLabelRegionsForRender(regions, {
      targetLevel: "district",
      center: { lat: 22.51, lng: 114.01 },
      zoom: 9.5,
    });

    expect(labels.length).toBeLessThan(regions.length);
    expect(regions).toHaveLength(12);
  });

  it("多 parent cache-first 会合并 memory、IndexedDB 和 Data Hub，且不调用 AMap", async () => {
    const guangdongEntry = createAdminBoundaryCacheEntry({
      parentAdcode: "440000",
      parentName: "广东省",
      targetLevel: "city",
      source: "datahub",
      features: [
        {
          ...createAdminBoundaryCacheEntry().features[0]!,
          adcode: "440100",
          name: "广州市",
          level: "city",
          parentAdcode: "440000",
        },
      ],
    });
    const hunanEntry = createAdminBoundaryCacheEntry({
      parentAdcode: "430000",
      parentName: "湖南省",
      targetLevel: "city",
      source: "datahub",
      features: [
        {
          ...createAdminBoundaryCacheEntry().features[0]!,
          adcode: "430100",
          name: "长沙市",
          level: "city",
          parentAdcode: "430000",
        },
      ],
    });
    setMemoryAdminBoundary(
      getAdminBoundaryCacheKey("440000", "city"),
      guangdongEntry,
    );
    setAdministrativeBoundaryPersistentCacheAdapterForTests(
      createPersistentCacheAdapter({
        [getAdminBoundaryCacheKey("430000", "city")]: hunanEntry,
      }),
    );
    const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
      const href = String(url);

      if (href.includes("parentAdcode=100000")) {
        return new Response(JSON.stringify(createProvinceApiResponse()), {
          status: 200,
        });
      }

      expect(href).toContain("parentAdcode=450000");
      return new Response(JSON.stringify({
        ok: true,
        parentAdcode: "450000",
        level: "prefecture",
        count: 1,
        features: [
          {
            adcode: "450300",
            name: "桂林市",
            level: "prefecture",
            adminType: "prefecture_city",
            parentAdcode: "450000",
            provinceAdcode: "450000",
            prefectureAdcode: "450300",
            center: [110.29, 25.27],
            labelPoint: [110.29, 25.27],
            bbox: [109.9, 24.9, 110.7, 25.6],
            geometry: {
              type: "Polygon",
              coordinates: [[
                [109.9, 24.9],
                [110.7, 24.9],
                [110.7, 25.6],
                [109.9, 24.9],
              ]],
            },
            source: "reviewed_local_geojson_2025_admin_division",
            sourceUpdatedAt: "2025-01-01T00:00:00.000Z",
            confidence: null,
          },
        ],
        sourceSummary: {
          sources: ["reviewed_local_geojson_2025_admin_division"],
          missingGeometry: 0,
          generatedAt: "2026-10-07T00:00:00.000Z",
        },
      }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const provider = createDistrictSearchAmapMock();

    const result = await loadAdministrativeBoundaries(provider.amap, {
      query: {
        keyword: "广东省、广西壮族自治区、湖南省",
        adcode: "440000",
        parentAdcodes: ["440000", "450000", "430000"],
        parentNames: ["广东省", "广西壮族自治区", "湖南省"],
        targetLevel: "city",
        searchLevel: "province",
        subdistrict: 1,
        center: { lat: 24, lng: 112 },
        zoom: 6.5,
      },
      requestId: 35,
    });

    expect(result.regions.map((region) => region.name)).toEqual([
      "长沙市",
      "广州市",
      "桂林市",
    ]);
    expect(result.parentBoundaryRegions?.map((region) => region.adcode)).toEqual([
      "440000",
      "450000",
      "430000",
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(provider.DistrictSearch).not.toHaveBeenCalled();
  });

  it("多 parent 中单个 Data Hub miss 只 fallback 该 parent，不影响其他 parent", async () => {
    const guangzhouEntry = createAdminBoundaryCacheEntry({
      parentAdcode: "440100",
      parentName: "广州市",
      targetLevel: "district",
      source: "datahub",
      features: [
        {
          ...createAdminBoundaryCacheEntry().features[0]!,
          adcode: "440104",
          name: "越秀区",
          level: "district",
          parentAdcode: "440100",
        },
      ],
    });
    setMemoryAdminBoundary(
      getAdminBoundaryCacheKey("440100", "district"),
      guangzhouEntry,
    );
    setAdministrativeBoundaryPersistentCacheAdapterForTests(
      createPersistentCacheAdapter(),
    );
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      parentAdcode: "440300",
      level: "county",
      count: 0,
      features: [],
      sourceSummary: {
        sources: [],
        missingGeometry: 0,
        generatedAt: "2026-10-07T00:00:00.000Z",
      },
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const provider = createDistrictSearchAmapMock();

    const result = await loadAdministrativeBoundaries(provider.amap, {
      query: {
        keyword: "广州市、深圳市",
        adcode: "440100",
        parentAdcodes: ["440100", "440300"],
        parentNames: ["广州市", "深圳市"],
        targetLevel: "district",
        searchLevel: "city",
        subdistrict: 1,
        center: { lat: 22.9, lng: 113.7 },
        zoom: 10,
      },
      requestId: 36,
    });

    expect(result.regions.map((region) => region.name)).toEqual([
      "越秀区",
      "南山区",
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(provider.DistrictSearch).toHaveBeenCalled();
  });

  it("Data Hub miss 时才调用 AMap fallback", async () => {
    setAdministrativeBoundaryPersistentCacheAdapterForTests(
      createPersistentCacheAdapter(),
    );
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      parentAdcode: "440300",
      level: "county",
      count: 0,
      features: [],
      sourceSummary: {
        sources: [],
        missingGeometry: 0,
        generatedAt: "2026-10-07T00:00:00.000Z",
      },
    }), { status: 200 })));
    const provider = createDistrictSearchAmapMock();

    const result = await loadAdministrativeBoundaries(provider.amap, {
      query: shenzhenDistrictQuery,
      requestId: 32,
    });

    expect(result.cacheSource).toBe("amap");
    expect(provider.DistrictSearch).toHaveBeenCalled();
  });

  it("同一个 Data Hub cacheKey 的 inflight request 会复用，不重复请求 Data Hub 或 AMap", async () => {
    setAdministrativeBoundaryPersistentCacheAdapterForTests(
      createPersistentCacheAdapter(),
    );
    let resolveFetch!: (response: Response) => void;
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    const fetchMock = vi.fn((url: RequestInfo | URL) => {
      const href = String(url);

      if (href.includes("parentAdcode=100000")) {
        return Promise.resolve(new Response(JSON.stringify(createProvinceApiResponse()), {
          status: 200,
        }));
      }

      return fetchPromise;
    });
    vi.stubGlobal("fetch", fetchMock);
    const provider = createDistrictSearchAmapMock();
    const query = resolveAdministrativeBoundaryQuery({
      zoom: 7,
      center: { lat: 23.13, lng: 113.27 },
      bounds: guangdongBounds,
    });

    const first = loadAdministrativeBoundaries(provider.amap, {
      query,
      requestId: 33,
    });
    const second = loadAdministrativeBoundaries(provider.amap, {
      query,
      requestId: 34,
    });
    resolveFetch(new Response(JSON.stringify({
      ok: true,
      parentAdcode: "440000",
      level: "prefecture",
      count: 1,
      features: [
        {
          adcode: "440100",
          name: "广州市",
          level: "prefecture",
          adminType: "prefecture_city",
          parentAdcode: "440000",
          provinceAdcode: "440000",
          prefectureAdcode: "440100",
          center: [113.2644, 23.1291],
          labelPoint: [113.28, 23.13],
          bbox: [112.95, 22.55, 114.05, 23.95],
          geometry: {
            type: "MultiPolygon",
            coordinates: [[[[113, 23], [114, 23], [114, 24], [113, 23]]]],
          },
          source: "reviewed_local_geojson_2025_admin_division",
          sourceUpdatedAt: "2025-01-01T00:00:00.000Z",
          confidence: null,
        },
      ],
      sourceSummary: {
        sources: ["reviewed_local_geojson_2025_admin_division"],
        missingGeometry: 0,
        generatedAt: "2026-10-07T00:00:00.000Z",
      },
    }), { status: 200 }));

    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(firstResult.cacheSource).toBe("datahub");
    expect(secondResult.cacheSource).toBe("datahub");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(provider.DistrictSearch).not.toHaveBeenCalled();
  });

  it("同一个 parentAdcode + targetLevel 的 inflight request 会复用 provider Promise", async () => {
    setAdministrativeBoundaryPersistentCacheAdapterForTests(
      createPersistentCacheAdapter(),
    );
    const provider = createDistrictSearchAmapMock({ asyncCallbacks: true });

    const first = loadAdministrativeBoundaries(provider.amap, {
      query: shenzhenDistrictQuery,
      requestId: 4,
    });
    const second = loadAdministrativeBoundaries(provider.amap, {
      query: shenzhenDistrictQuery,
      requestId: 5,
    });

    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(firstResult.cacheSource).toBe("amap");
    expect(secondResult.cacheSource).toBe("amap");
    expect(provider.DistrictSearch).toHaveBeenCalledTimes(2);
    expect(provider.search.search).toHaveBeenCalledTimes(2);
  });

  it("stale cache 会先返回旧缓存，再后台 refresh provider", async () => {
    const cacheKey = getAdministrativeBoundaryCacheKey(shenzhenDistrictQuery);
    const staleEntry = createAdminBoundaryCacheEntry({
      fetchedAt: "2020-01-01T00:00:00.000Z",
      features: [
        {
          ...createAdminBoundaryCacheEntry().features[0]!,
          name: "旧南山区",
        },
      ],
    });
    const adapter = createPersistentCacheAdapter({
      [cacheKey]: staleEntry,
    });
    setAdministrativeBoundaryPersistentCacheAdapterForTests(adapter);
    const provider = createDistrictSearchAmapMock({
      asyncCallbacks: true,
      childName: "刷新南山区",
    });

    const result = await loadAdministrativeBoundaries(provider.amap, {
      query: shenzhenDistrictQuery,
      requestId: 6,
    });

    expect(result.cacheSource).toBe("stale-cache");
    expect(result.isStale).toBe(true);
    expect(result.regions[0]?.name).toBe("旧南山区");

    await flushAdministrativeLayerPromises();
    await new Promise((resolve) => setTimeout(resolve, 10));
    await flushAdministrativeLayerPromises();

    expect(provider.DistrictSearch).toHaveBeenCalledTimes(2);
    expect(adapter.set).toHaveBeenCalledWith(
      cacheKey,
      expect.objectContaining({
        features: [
          expect.objectContaining({
            name: "刷新南山区",
          }),
        ],
      }),
    );
  });

  it("新行政区图层加载失败时不会清掉已经显示的旧图层", async () => {
    const createdPolygons: AMapPolygonInstance[] = [];
    const Polygon = vi.fn(function MockPolygon() {
      const polygon: AMapPolygonInstance = {
        setMap: vi.fn(),
      };
      createdPolygons.push(polygon);
      return polygon;
    }) as unknown as AMapPolygonConstructor;
    const search: AMapDistrictSearchInstance = {
      search: vi.fn((_keyword, callback) => {
        callback("complete", {
          districtList: [
            {
              name: "深圳市",
              districtList: [
                {
                  name: "南山区",
                  adcode: "440305",
                  level: "district",
                  center: "113.9304,22.5333",
                  boundaries: [[
                    [113.88, 22.58],
                    [113.98, 22.58],
                    [113.98, 22.49],
                    [113.88, 22.49],
                  ]],
                },
              ],
            },
          ],
        });
      }),
    };
    const DistrictSearch = vi.fn(function MockDistrictSearch() {
      return search;
    }) as unknown as AMapDistrictSearchConstructor;
    const map: AMapMapInstance = {
      destroy: vi.fn(),
    };
    const oldLayer = createAmapAdministrativeBoundaryLayer(
      { DistrictSearch, Polygon },
      map,
      {
        center: { lat: 22.5431, lng: 114.0579 },
        zoom: 10,
      },
    );
    await flushAdministrativeLayerPromises();
    expect(createdPolygons[0]?.setMap).toHaveBeenLastCalledWith(map);

    clearAdministrativeBoundaryRuntimeCache();
    const failedLayer = createAmapAdministrativeBoundaryLayer({ Polygon }, map, {
      center: { lat: 22.5431, lng: 114.0579 },
      zoom: 10,
    });
    await flushAdministrativeLayerPromises();

    expect(createdPolygons[0]?.setMap).toHaveBeenLastCalledWith(map);

    failedLayer.cancel();
    oldLayer.cancel();
  });

  it("缺少高德构造器或路径点不足时返回空 overlay", () => {
    const amap: AMapGlobal = {};
    const map: AMapMapInstance = {
      destroy: vi.fn(),
    };

    expect(createAmapPolygonInstances(amap, map, [polygonRegion])).toEqual([]);
    expect(createAmapPolylineInstances(amap, map, [polylineRoute])).toEqual([]);
    expect(
      createAmapPolygonInstances(
        { Polygon: vi.fn() as unknown as AMapPolygonConstructor },
        map,
        [{ ...polygonRegion, paths: [[{ lat: 1, lng: 1 }]] }],
      ),
    ).toEqual([]);
    expect(
      createAmapPolylineInstances(
        { Polyline: vi.fn() as unknown as AMapPolylineConstructor },
        map,
        [{ ...polylineRoute, path: [{ lat: 1, lng: 1 }] }],
      ),
    ).toEqual([]);
  });
});
