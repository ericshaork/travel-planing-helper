import { existsSync, readFileSync } from "node:fs";
import { open } from "node:fs/promises";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { featureFilter } from "@maplibre/maplibre-gl-style-spec";
import { PMTiles } from "pmtiles";

import {
  AdminPmtilesOverlay,
  adaptAdminPmtilesStyleZoom,
  applyAdminPmtilesPrecision,
  buildAdminPmtilesPerfDebugSnapshot,
  buildAdminPmtilesOffsetDebugSnapshot,
  buildAdminPmtilesRuntimeFeatureDebugSnapshot,
  cleanupAdminPmtilesOverlayMap,
  createAdminPmtilesMapOptions,
  createAdminPmtilesStyle,
  getAdminPmtilesProtocolDebugState,
  getAdminPmtilesOverlayEventNames,
  getVisibleAdminPmtilesLayers,
  isAdminPmtilesFatalMapLibreError,
  isHkMoSpecialAdminRuntimeEnabled,
  isAdminPmtilesOffsetDebugEnabled,
  isAdminPmtilesDebugLabelsEnabled,
  isMacauDatavDisplaySubdivisionEnabled,
  isAdminPmtilesOnlyModeEnabled,
  isAdminPmtilesOverlayEnabled,
  registerPmtilesProtocol,
  resolveAdminPmtilesCoordinateState,
  resolveAdminPmtilesSyncedViewport,
  resolveAdminPmtilesUrl,
  warnAdminPmtilesOverlayDisabled,
} from "../../components/map/AdminPmtilesOverlay";
import { resolveMapStudioAdminOverlayMode } from "../../components/map-studio/MapStudioCanvas";
import {
  MAPLIBRE_WORKER_URL,
  setupMapLibreWorker,
} from "../../lib/map/maplibreWorker";

describe("AdminPmtilesOverlay", () => {
  it("feature flag off 时不渲染 overlay 容器", () => {
    const markup = renderToStaticMarkup(
      <AdminPmtilesOverlay amapMap={null} enabled={false} />,
    );

    expect(markup).toBe("");
  });

  it("feature flag on 时渲染透明 overlay 容器", () => {
    const markup = renderToStaticMarkup(
      <AdminPmtilesOverlay amapMap={null} enabled />,
    );

    expect(markup).toContain('data-testid="admin-pmtiles-overlay"');
    expect(markup).toContain("pointer-events-none");
  });

  it("解析 PMTiles overlay feature flags 和 source url", () => {
    expect(isAdminPmtilesOverlayEnabled(undefined)).toBe(true);
    expect(isAdminPmtilesOverlayEnabled("")).toBe(true);
    expect(isAdminPmtilesOverlayEnabled("1")).toBe(true);
    expect(isAdminPmtilesOverlayEnabled("on")).toBe(true);
    expect(isAdminPmtilesOverlayEnabled("false")).toBe(false);
    expect(isHkMoSpecialAdminRuntimeEnabled(undefined)).toBe(false);
    expect(isHkMoSpecialAdminRuntimeEnabled("")).toBe(false);
    expect(isHkMoSpecialAdminRuntimeEnabled("1")).toBe(false);
    expect(isHkMoSpecialAdminRuntimeEnabled("false")).toBe(false);
    expect(isMacauDatavDisplaySubdivisionEnabled("1")).toBe(false);
    expect(isMacauDatavDisplaySubdivisionEnabled("false")).toBe(false);
    expect(isAdminPmtilesOnlyModeEnabled(undefined)).toBe(true);
    expect(isAdminPmtilesOnlyModeEnabled("")).toBe(true);
    expect(isAdminPmtilesOnlyModeEnabled("true")).toBe(true);
    expect(isAdminPmtilesOffsetDebugEnabled("yes")).toBe(true);
    expect(isAdminPmtilesOffsetDebugEnabled("")).toBe(false);
    expect(isAdminPmtilesDebugLabelsEnabled("1")).toBe(true);
    expect(isAdminPmtilesDebugLabelsEnabled("false")).toBe(false);
    expect(resolveAdminPmtilesUrl()).toBe(
      "https://wanderly-map-public.oss-cn-shenzhen.aliyuncs.com/admin-tiles/china-admin-boundaries-gcj02-multilayer-g5-fallback-label.pmtiles",
    );
    expect(resolveAdminPmtilesUrl()).not.toContain("g5-hkmo-fallback");
    expect(resolveAdminPmtilesUrl(" /custom/admin.pmtiles ")).toBe(
      "/custom/admin.pmtiles",
    );
  });

  it.skipIf(!existsSync(resolve(process.cwd(), "public/admin-tiles/experimental/china-admin-boundaries-gcj02-multilayer-g5-fallback-label.pmtiles")))("当前默认归档实际包含省市区县文字，避免空 label source-layer", async () => {
    const file = await open(resolve(process.cwd(), "public/admin-tiles/experimental/china-admin-boundaries-gcj02-multilayer-g5-fallback-label.pmtiles"), "r");
    try {
      const archive = new PMTiles({
        getKey: () => "default-admin-label-archive",
        getBytes: async (offset, length) => {
          const bytes = new Uint8Array(length);
          await file.read(bytes, 0, length, offset);
          return {data:bytes.buffer};
        },
      });
      expect(await archive.getMetadata()).toEqual(expect.objectContaining({
        vector_layers: expect.arrayContaining([expect.objectContaining({id:"admin_label", fields:expect.objectContaining({displayLevel:"String", labelText:"String"})})]),
      }));
    } finally {
      await file.close();
    }
  });

  it("MapLibre worker 使用 public 静态文件并在浏览器侧显式配置", () => {
    const workerFile = resolve(process.cwd(), `public${MAPLIBRE_WORKER_URL}`);
    const setWorkerUrl = vi.fn();
    const getWorkerUrl = vi.fn(() => "");

    expect(existsSync(workerFile)).toBe(true);

    vi.stubGlobal("window", {});
    vi.stubGlobal("document", {});

    expect(setupMapLibreWorker({ getWorkerUrl, setWorkerUrl })).toEqual({
      configured: true,
      reason: "browser",
      workerUrl: MAPLIBRE_WORKER_URL,
    });
    expect(setWorkerUrl).toHaveBeenCalledWith(MAPLIBRE_WORKER_URL);

    getWorkerUrl.mockReturnValue(MAPLIBRE_WORKER_URL);
    expect(setupMapLibreWorker({ getWorkerUrl, setWorkerUrl })).toEqual({
      configured: false,
      reason: "already-configured",
      workerUrl: MAPLIBRE_WORKER_URL,
    });

    vi.unstubAllGlobals();
  });

  it("MapLibre worker setup 在 SSR 阶段不访问 window/document", () => {
    const setWorkerUrl = vi.fn();

    vi.unstubAllGlobals();

    expect(setupMapLibreWorker({ setWorkerUrl })).toEqual({
      configured: false,
      reason: "server",
      workerUrl: MAPLIBRE_WORKER_URL,
    });
    expect(setWorkerUrl).not.toHaveBeenCalled();
  });

  it("识别 MapLibre worker 加载错误并允许 overlay 降级不抛错", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(
      isAdminPmtilesFatalMapLibreError({
        error: new Error("Worker failed to load. Check that the worker URL is correct."),
      }),
    ).toBe(true);
    expect(
      isAdminPmtilesFatalMapLibreError({
        error: new Error("Some harmless tile failed"),
      }),
    ).toBe(false);
    expect(() =>
      warnAdminPmtilesOverlayDisabled("maplibre-worker-error", {
        error: new Error("Worker failed to load."),
      }),
    ).not.toThrow();

    warn.mockRestore();
  });

  it("创建包含全国三层边界线、行政 label 和 zoom LOD 的 MapLibre style", () => {
    const style = createAdminPmtilesStyle("/admin-tiles/test.pmtiles");
    const layers = style.layers.map((layer) => layer.id);

    expect(style.sources["admin-boundaries"]).toMatchObject({
      type: "vector",
      url: "pmtiles:///admin-tiles/test.pmtiles",
      minzoom: 3,
      maxzoom: 12,
    });
    expect(layers).toEqual([
      "admin-pmtiles-province-boundary",
      "admin-pmtiles-prefecture-boundary",
      "admin-pmtiles-county-boundary",
      "admin-pmtiles-province-label",
      "admin-pmtiles-prefecture-label",
      "admin-pmtiles-county-label",
      "admin_label_hk_mo_county",
    ]);
    expect(new Set(layers).size).toBe(layers.length);
    expect(Object.keys(style.sources)).toEqual(["admin-boundaries"]);
    expect(style.layers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "admin-pmtiles-province-boundary",
          type: "line",
          "source-layer": "province_boundary",
          minzoom: 3,
          maxzoom: 9,
        }),
        expect.objectContaining({
          id: "admin-pmtiles-county-boundary",
          type: "line",
          "source-layer": "county_boundary",
          minzoom: 6,
        }),
        expect.objectContaining({
          id: "admin-pmtiles-prefecture-boundary",
          type: "line",
          "source-layer": "prefecture_boundary",
          minzoom: 6,
        }),
        expect.objectContaining({
          id: "admin-pmtiles-prefecture-label",
          type: "symbol",
          "source-layer": "admin_label",
          minzoom: 6,
          maxzoom: 9,
        }),
      ]),
    );
  });

  it("港澳 runtime 旧开关开启时也不注册任何 runtime GeoJSON source/layer", () => {
    const style = createAdminPmtilesStyle("/admin-tiles/test.pmtiles", {
      adminPmtilesOverlay: false,
      hkMoSpecialRuntime: true,
      macauDatavSubdivisions: true,
    });
    const layerIds = style.layers.map((layer) => layer.id);
    const serializedStyle = JSON.stringify(style);

    expect(style.sources["admin-boundaries"]).toBeUndefined();
    expect(style.sources["hk_mo_special_admin_source"]).toBeUndefined();
    expect(style.sources["macau_datav_display_subdivision_source"]).toBeUndefined();
    expect(Object.keys(style.sources)).toEqual([]);
    expect(layerIds).toEqual([]);
    expect(serializedStyle).not.toContain("hk_mo_special_admin");
    expect(serializedStyle).not.toContain("macau_datav_display_subdivision");
    expect(serializedStyle).not.toContain("province_boundary");
    expect(serializedStyle).not.toContain("prefecture_boundary");
    expect(serializedStyle).not.toContain("county_boundary");
    expect(serializedStyle).not.toContain('"source-layer":"admin_label"');
    expect(serializedStyle).not.toContain("admin-pmtiles-");
    expect(serializedStyle).not.toContain("china-admin-boundaries");
  });

  it("全国 PMTiles overlay 关闭时不存在全国边界和全国 label 图层", () => {
    const style = createAdminPmtilesStyle("/admin-tiles/test.pmtiles", {
      adminPmtilesOverlay: false,
      hkMoSpecialRuntime: false,
    });

    expect(style.sources).toEqual({});
    expect(style.layers).toEqual([]);
  });

  it("边界和 label 过滤使用 displayLevel，而不是 sourceLevel", () => {
    const style = createAdminPmtilesStyle("/admin-tiles/test.pmtiles");
    const prefectureBoundary = getLayerById(style, "admin-pmtiles-prefecture-boundary");
    const countyBoundary = getLayerById(style, "admin-pmtiles-county-boundary");
    const prefectureLabel = getLayerById(style, "admin-pmtiles-prefecture-label");
    const countyLabel = getLayerById(style, "admin-pmtiles-county-label");
    const hkMoCountyLabel = getLayerById(style, "admin_label_hk_mo_county");

    expect(JSON.stringify(prefectureBoundary.filter)).toContain("displayLevel");
    expect(JSON.stringify(prefectureBoundary.filter)).toContain("prefecture");
    expect(JSON.stringify(prefectureBoundary.filter)).not.toContain("sourceLevel");
    expect(JSON.stringify(countyBoundary.filter)).toContain("displayLevel");
    expect(JSON.stringify(countyBoundary.filter)).toContain("county");
    expect(JSON.stringify(countyBoundary.filter)).not.toContain("sourceLevel");
    expect(JSON.stringify(prefectureLabel.filter)).toContain("displayLevel");
    expect(JSON.stringify(prefectureLabel.filter)).toContain("prefecture");
    expect(JSON.stringify(prefectureLabel.filter)).toContain("810000");
    expect(JSON.stringify(prefectureLabel.filter)).toContain("820000");
    expect(JSON.stringify(prefectureLabel.filter)).not.toContain("sourceLevel");
    expect(JSON.stringify(countyLabel.filter)).toContain("displayLevel");
    expect(JSON.stringify(countyLabel.filter)).not.toContain("sourceLevel");
    expect(JSON.stringify(hkMoCountyLabel.filter)).toContain("displayLevel");
    expect(JSON.stringify(hkMoCountyLabel.filter)).not.toContain("sourceLevel");
  });

  it("行政 label layer 使用 Wanderly admin_label source-layer", () => {
    const style = createAdminPmtilesStyle("/admin-tiles/test.pmtiles");
    const provinceLabel = getLayerById(style, "admin-pmtiles-province-label");
    const prefectureLabel = getLayerById(style, "admin-pmtiles-prefecture-label");
    const countyLabel = getLayerById(style, "admin-pmtiles-county-label");
    const hkMoCountyLabel = getLayerById(style, "admin_label_hk_mo_county");

    expect(provinceLabel["source-layer"]).toBe("admin_label");
    expect(prefectureLabel["source-layer"]).toBe("admin_label");
    expect(countyLabel["source-layer"]).toBe("admin_label");
    expect(hkMoCountyLabel["source-layer"]).toBe("admin_label");
    expect(prefectureLabel.layout["text-field"]).toEqual([
      "coalesce",
      ["get", "labelText"],
      ["get", "name"],
    ]);
    expect(prefectureLabel.paint["text-color"]).toBe("#6f6049");
  });

  it("港澳市级特殊 runtime source/layer 已从默认行政 style 移除", () => {
    const style = createAdminPmtilesStyle("/admin-tiles/test.pmtiles");
    const serializedStyle = JSON.stringify(style);

    expect(style.sources["hk_mo_special_admin_source"]).toBeUndefined();
    expect(style.layers.map((layer) => layer.id)).not.toContain(
      "hk_mo_special_admin_boundary",
    );
    expect(style.layers.map((layer) => layer.id)).not.toContain(
      "hk_mo_special_admin_label",
    );
    expect(serializedStyle).not.toContain("hk_mo_special_admin");
  });

  it("港澳 county label 仍只来自 PMTiles admin_label source-layer", () => {
    const style = createAdminPmtilesStyle("/admin-tiles/test.pmtiles");
    const countyLabel = getLayerById(style, "admin-pmtiles-county-label");
    const hkMoCountyLabel = getLayerById(style, "admin_label_hk_mo_county");

    expect(JSON.stringify(countyLabel.filter)).toContain("810101");
    expect(JSON.stringify(countyLabel.filter)).toContain("820000");
    expect(JSON.stringify(hkMoCountyLabel.filter)).toContain("810101");
    expect(JSON.stringify(hkMoCountyLabel.filter)).toContain("820000");
    expect(hkMoCountyLabel.layout["text-allow-overlap"]).toBe(true);
    expect(hkMoCountyLabel.layout["text-ignore-placement"]).toBe(true);
    expect(hkMoCountyLabel.layout["text-anchor"]).toBe("center");
  });

  it("澳门 DataV 实验文件保留但不接入 MapLibre runtime source/layer", () => {
    const style = createAdminPmtilesStyle("/admin-tiles/test.pmtiles", {
      macauDatavSubdivisions: true,
    });
    const layers = style.layers.map((layer) => layer.id);
    const hkMoCountyLabel = getLayerById(style, "admin_label_hk_mo_county");
    const file = resolve(
      process.cwd(),
      "public/admin-tiles/experimental/macau-datav-display-subdivisions-gcj02.geojson",
    );

    expect(existsSync(file)).toBe(true);
    expect(style.sources["macau_datav_display_subdivision_source"]).toBeUndefined();
    expect(layers).not.toContain("macau_datav_display_subdivision_boundary");
    expect(layers).not.toContain("macau_datav_display_subdivision_label");
    expect(JSON.stringify(hkMoCountyLabel.filter)).toContain("820000");
  });

  it("澳门 DataV 实验下级开关关闭时保留澳门整体 selfAsCounty fallback", () => {
    const style = createAdminPmtilesStyle("/admin-tiles/test.pmtiles", {
      macauDatavSubdivisions: false,
    });
    const layers = style.layers.map((layer) => layer.id);
    const hkMoCountyLabel = getLayerById(style, "admin_label_hk_mo_county");

    expect(style.sources["macau_datav_display_subdivision_source"]).toBeUndefined();
    expect(layers).not.toContain("macau_datav_display_subdivision_boundary");
    expect(layers).not.toContain("macau_datav_display_subdivision_label");
    expect(JSON.stringify(hkMoCountyLabel.filter)).toContain("820000");
  });

  it("澳门 DataV 实验 runtime GeoJSON 标记 8 个 display subdivisions", () => {
    const file = resolve(
      process.cwd(),
      "public/admin-tiles/experimental/macau-datav-display-subdivisions-gcj02.geojson",
    );
    const geojson = JSON.parse(readFileSync(file, "utf8")) as {
      features: Array<{ properties: Record<string, unknown> }>;
    };
    const boundaryFeatures = geojson.features.filter((feature) =>
      feature.properties.layer === "macau_datav_display_subdivision_boundary",
    );
    const labelFeatures = geojson.features.filter((feature) =>
      feature.properties.layer === "macau_datav_display_subdivision_label",
    );

    expect(boundaryFeatures).toHaveLength(8);
    expect(labelFeatures).toHaveLength(8);
    expect(boundaryFeatures.map((feature) => feature.properties.adcode)).toEqual([
      "820001",
      "820002",
      "820003",
      "820004",
      "820005",
      "820006",
      "820007",
      "820008",
    ]);
    for (const feature of geojson.features) {
      expect(feature.properties).toMatchObject({
        displayLevel: "county",
        source: "datav_geoatlas",
        productionApproved: false,
      });
      if (feature.properties.adcode === "820007") {
        expect(feature.properties.displaySubdivisionType).toBe(
          "reclaimed_or_display_subdivision",
        );
      } else {
        expect(feature.properties.displaySubdivisionType).toBe("parish");
      }
    }
  });

  it("debug label 模式下只增加 PMTiles 内的港澳边界高亮层", () => {
    const style = createAdminPmtilesStyle("/admin-tiles/test.pmtiles", {
      debugLabels: true,
    });
    const layerIds = style.layers.map((layer) => layer.id);
    const hkMoCountyBoundary = getLayerById(style, "admin-pmtiles-hk-mo-county-boundary-debug");

    expect(layerIds).not.toContain("hk_mo_special_admin_boundary");
    expect(layerIds).not.toContain("hk_mo_special_admin_label");
    expect(layerIds).not.toContain("macau_datav_display_subdivision_boundary");
    expect(layerIds).not.toContain("macau_datav_display_subdivision_label");
    expect(layerIds).toContain("admin-pmtiles-hk-mo-prefecture-boundary-debug");
    expect(layerIds).toContain("admin-pmtiles-hk-mo-county-boundary-debug");
    expect(JSON.stringify(hkMoCountyBoundary.filter)).toContain("displayLevel");
    expect(hkMoCountyBoundary.paint["line-color"]).toBe("#b84b2a");
  });

  it("增强 county_boundary 但保持 zoom LOD 和边界层级关系", () => {
    const style = createAdminPmtilesStyle("/admin-tiles/test.pmtiles");
    const province = getLayerById(style, "admin-pmtiles-province-boundary");
    const prefecture = getLayerById(style, "admin-pmtiles-prefecture-boundary");
    const county = getLayerById(style, "admin-pmtiles-county-boundary");

    expect(county.minzoom).toBe(6);
    expect(province.maxzoom).toBe(9);
    expect(prefecture.minzoom).toBe(6);
    expect(county.paint["line-color"]).toBe("#6f6049");
    expect(county.paint["line-opacity"]).toEqual([
      "interpolate",
      ["linear"],
      ["zoom"],
      9,
      0.38,
      10,
      0.52,
      11,
      0.64,
      12,
      0.7,
    ]);
    expect(county.paint["line-width"]).toEqual([
      "interpolate",
      ["linear"],
      ["zoom"],
      9,
      0.48,
      10,
      0.66,
      11,
      0.82,
      12,
      0.96,
    ]);
    expect(prefecture.paint["line-width"]).toEqual([
      "interpolate",
      ["linear"],
      ["zoom"],
      6,
      0.46,
      8,
      0.88,
      10,
      0.94,
      12,
      1.12,
    ]);
  });

  it("保留 zoom LOD 的父级边界和当前行政层级", () => {
    expect(getVisibleAdminPmtilesLayers(2.9)).toEqual([]);
    expect(getVisibleAdminPmtilesLayers(3)).toEqual(["province_boundary"]);
    expect(getVisibleAdminPmtilesLayers(5.9)).toEqual(["province_boundary"]);
    expect(getVisibleAdminPmtilesLayers(6)).toEqual(["province_boundary", "prefecture_boundary", "county_boundary"]);
    expect(getVisibleAdminPmtilesLayers(8.9)).toEqual(["province_boundary", "prefecture_boundary", "county_boundary"]);
    expect(getVisibleAdminPmtilesLayers(9)).toEqual(["prefecture_boundary", "county_boundary"]);
    expect(getVisibleAdminPmtilesLayers(12)).toEqual(["prefecture_boundary", "county_boundary"]);
  });

  it("创建低 fade 和较大 tile cache 的 MapLibre overlay options", () => {
    const style = createAdminPmtilesStyle("/admin-tiles/test.pmtiles");
    const options = createAdminPmtilesMapOptions({
      container: "map",
      style,
      center: { lng: 116.397, lat: 39.908 },
      zoom: 10,
    });

    expect(options).toMatchObject({
      container: "map",
      style: adaptAdminPmtilesStyleZoom(style),
      center: [116.397, 39.908],
      zoom: 9,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      maxTileCacheSize: 768,
      maxTileCacheZoomLevels: 8,
      refreshExpiredTiles: false,
      renderWorldCopies: false,
      trackResize: false,
    });
  });

  it("卸载清理 helper 会 remove MapLibre map instance", () => {
    const map = { remove: vi.fn() };

    cleanupAdminPmtilesOverlayMap(map);

    expect(map.remove).toHaveBeenCalledTimes(1);
  });

  it("整数和分数 zoom 均与高德保持同一世界像素尺寸", () => {
    for (const zoom of [3, 4, 6, 7.5, 8, 9, 12, 14]) {
      const viewport = resolveAdminPmtilesSyncedViewport({ center: {lng: 113.9, lat: 22.3}, zoom });
      expect(512 * 2 ** viewport.zoom).toBeCloseTo(256 * 2 ** zoom, 8);
      expect(createAdminPmtilesMapOptions({container: 'map', style: createAdminPmtilesStyle(), center: {lng:113.9,lat:22.3}, zoom}).zoom).toBe(viewport.zoom);
    }
  });

  it("相机比例适配保留省市区县 LOD、文字字号和单一 source", () => {
    const original = createAdminPmtilesStyle();
    const adapted = adaptAdminPmtilesStyleZoom(original);
    expect(adapted.sources).toBe(original.sources);
    expect(adapted.layers.map(layer => layer.id)).toEqual(original.layers.map(layer => layer.id));
    expect(getLayerById(adapted, 'admin-pmtiles-province-label')).toMatchObject({minzoom:2,maxzoom:5});
    expect(getLayerById(adapted, 'admin-pmtiles-prefecture-label')).toMatchObject({minzoom:5,maxzoom:8});
    expect(getLayerById(adapted, 'admin-pmtiles-county-label')).toMatchObject({minzoom:8});
    expect(getLayerById(adapted, 'admin-pmtiles-county-label').maxzoom).toBeUndefined();
    expect(getLayerById(adapted, 'admin-pmtiles-prefecture-label').layout['text-size']).toEqual(['interpolate',['linear'],['zoom'],5,10,7,12]);
    expect(getLayerById(original, 'admin-pmtiles-prefecture-label').minzoom).toBe(6);
  });

  it("手动省市区县精度同时切换边界和名字，并可恢复自动 LOD", () => {
    const style = adaptAdminPmtilesStyleZoom(createAdminPmtilesStyle());
    const map = { getLayer: vi.fn(() => ({})), setLayerZoomRange: vi.fn(), setLayoutProperty: vi.fn(), setFilter: vi.fn() };
    for (const precision of ["province", "prefecture", "county"] as const) {
      map.setLayoutProperty.mockClear();
      applyAdminPmtilesPrecision(map as unknown as Parameters<typeof applyAdminPmtilesPrecision>[0], style, precision);
      expect(map.setLayoutProperty).toHaveBeenCalledWith(`admin-pmtiles-${precision}-label`, "visibility", "visible");
      expect(map.setLayoutProperty).toHaveBeenCalledWith(`admin-pmtiles-${precision}-boundary`, "visibility", "visible");
      for (const other of ["province", "prefecture", "county"].filter(level => level !== precision)) {
        expect(map.setLayoutProperty).toHaveBeenCalledWith(`admin-pmtiles-${other}-label`, "visibility", "none");
      }
    }
    applyAdminPmtilesPrecision(map as unknown as Parameters<typeof applyAdminPmtilesPrecision>[0], style, "auto");
    expect(map.setLayerZoomRange).toHaveBeenCalledWith("admin-pmtiles-province-label", 2, 5);
    expect(map.setLayoutProperty).toHaveBeenCalledWith("admin-pmtiles-province-label", "visibility", "visible");
  });

  it("市级视图包含省直辖县级单位，但不显示普通区县或直辖市辖区", () => {
    const style = adaptAdminPmtilesStyleZoom(createAdminPmtilesStyle());
    const label = featureFilter(getLayerById(style, "admin-pmtiles-prefecture-label").filter, "filter");
    const boundary = featureFilter(getLayerById(style, "admin-pmtiles-county-boundary").filter, "filter");
    const match = (filter: typeof label, props: Record<string, string>, zoom = 7) =>
      filter.filter({zoom}, {type: 1, properties: props});
    for (const [adcode, parentAdcode] of [["469005", "460000"], ["429004", "420000"], ["419001", "410000"], ["659001", "650000"]]) {
      const props = {adcode, parentAdcode, displayLevel: "county"};
      expect(match(label, props)).toBe(true);
      expect(match(boundary, props)).toBe(true);
    }
    for (const props of [{adcode:"460105",parentAdcode:"460100",displayLevel:"county"}, {adcode:"110101",parentAdcode:"110000",displayLevel:"county"}, {adcode:"810101",parentAdcode:"810000",displayLevel:"county"}]) {
      expect(match(label, props)).toBe(false);
      expect(match(boundary, props)).toBe(false);
      expect(match(boundary, props, 8)).toBe(true);
    }
    expect(match(label, {adcode:"460100", displayLevel:"prefecture"})).toBe(true);
    expect(match(boundary, {displayLevel:"county", leftAdcode:"460105", rightAdcode:"469005"})).toBe(true);
  });

  it("同步监听 AMap move / zoom / resize 事件", () => {
    expect(getAdminPmtilesOverlayEventNames()).toEqual(
      expect.arrayContaining([
        "movestart",
        "moving",
        "moveend",
        "dragging",
        "dragend",
        "zoomstart",
        "zoomend",
        "mapmove",
        "zoomchange",
        "resize",
      ]),
    );
  });

  it("AMap -> MapLibre 使用相同世界像素尺度，同步 zoom 而不是复制数值", () => {
    expect(
      resolveAdminPmtilesSyncedViewport({
        center: { lng: 114.12466, lat: 22.35909 },
        zoom: 7,
      }),
    ).toEqual({
      center: [114.12466, 22.35909],
      zoom: 6,
      bearing: 0,
      pitch: 0,
    });
  });

  it("生成 PMTiles offset debug snapshot", () => {
    const snapshot = buildAdminPmtilesOffsetDebugSnapshot({
      reason: "amap:moveend",
      sourceUrl: "/admin-tiles/guangdong-admin-boundaries.pmtiles",
      overlaySyncCount: 3,
      amapCenter: { lng: 113.9, lat: 22.75 },
      amapZoom: 9,
      amapViewportBounds: {
        minLng: 113.5,
        maxLng: 114.2,
        minLat: 22.4,
        maxLat: 23,
      },
      mapLibreCenter: { lng: 113.9, lat: 22.75 },
      mapLibreEffectiveZoom: 9,
      pmtilesOverlayBounds: {
        minLng: 113.5,
        maxLng: 114.2,
        minLat: 22.4,
        maxLat: 23,
      },
    });

    expect(snapshot).toMatchObject({
      reason: "amap:moveend",
      currentMapCenter: { lng: 113.9, lat: 22.75 },
      currentMapZoom: 9,
      amapCenter: { lng: 113.9, lat: 22.75 },
      amapZoom: 9,
      mapLibreCenter: { lng: 113.9, lat: 22.75 },
      mapLibreEffectiveZoom: 9,
      usesWgs84Pmtiles: true,
      hasGcj02Transform: false,
      visiblePmtilesLayers: ["prefecture_boundary", "county_boundary"],
      pmtilesOnly: false,
      legacyAdminOverlayDisabled: false,
      mapLibreOverlayLoaded: false,
      overlaySyncCount: 3,
    });
    expect(snapshot.centerDelta?.approxMeters).toBe(0);
  });

  it("生成 PMTiles perf debug snapshot", () => {
    const snapshot = buildAdminPmtilesPerfDebugSnapshot({
      reason: "maplibre:idle",
      sourceUrl: "/admin-tiles/china-admin-boundaries-gcj02.pmtiles",
      zoom: 10,
      pmtilesOnly: true,
      state: {
        mapLibreOverlayLoaded: true,
        mapLibreOverlayIdle: true,
        mapLibreTilesLoaded: true,
        sourceCreateCount: 1,
        layerCreateCount: 3,
        styleCreateCount: 1,
        protocolRegisterCount: 1,
        protocolActiveUsers: 1,
        overlaySyncCount: 5,
        lastPanDurationMs: 842.4,
        lastMoveEndToIdleDurationMs: 126.3,
      },
    });

    expect(snapshot).toMatchObject({
      reason: "maplibre:idle",
      currentMapZoom: 10,
      visiblePmtilesLayers: ["prefecture_boundary", "county_boundary"],
      sourceUrl: "/admin-tiles/china-admin-boundaries-gcj02.pmtiles",
      pmtilesOnly: true,
      mapLibreOverlayLoaded: true,
      mapLibreOverlayIdle: true,
      mapLibreTilesLoaded: true,
      sourceCreateCount: 1,
      layerCreateCount: 3,
      styleCreateCount: 1,
      protocolRegisterCount: 1,
      protocolActiveUsers: 1,
      overlaySyncCount: 5,
      lastPanDurationMs: 842.4,
      lastMoveEndToIdleDurationMs: 126.3,
    });
  });

  it("runtime debug query 遇到 missing source / layer 时不崩溃", () => {
    const map = {
      querySourceFeatures: vi.fn(() => {
        throw new Error("missing source");
      }),
      queryRenderedFeatures: vi.fn(() => {
        throw new Error("missing layer");
      }),
      getStyle: vi.fn(() => {
        throw new Error("style not loaded");
      }),
      getZoom: vi.fn(() => 8),
      getBounds: vi.fn(() => ({
        getWest: () => 113.4,
        getEast: () => 114.4,
        getSouth: () => 21.9,
        getNorth: () => 22.8,
      })),
    } as unknown as Parameters<typeof buildAdminPmtilesRuntimeFeatureDebugSnapshot>[0]["map"];

    const snapshot = buildAdminPmtilesRuntimeFeatureDebugSnapshot({
      reason: "test:missing-source",
      map,
      sourceUrl: "/admin-tiles/test.pmtiles",
    });

    expect(snapshot).toMatchObject({
      currentMapZoom: 8,
      visibleStyleLayers: [],
      sourceFeatureCounts: {
        hkMoSpecialAdminBoundary: 0,
        hkMoSpecialAdminLabel: 0,
        macauDatavDisplaySubdivisionBoundary: 0,
        macauDatavDisplaySubdivisionLabel: 0,
        hongKongCountyBoundary: 0,
        macauCountyFallbackBoundary: 0,
        hongKongCountyLabel: 0,
        macauCountyFallbackLabel: 0,
      },
      renderedFeatureCounts: {
        hkMoSpecialAdminBoundary: 0,
        hkMoSpecialAdminLabel: 0,
        macauDatavDisplaySubdivisionBoundary: 0,
        macauDatavDisplaySubdivisionLabel: 0,
        hongKongCountyBoundary: 0,
        macauCountyFallbackBoundary: 0,
        hongKongCountyLabel: 0,
        macauCountyFallbackLabel: 0,
      },
    });
  });

  it("根据 source url 标记 PMTiles 坐标状态但不启用运行时 GCJ transform", () => {
    expect(
      resolveAdminPmtilesCoordinateState(
        "/admin-tiles/guangdong-admin-boundaries.pmtiles",
      ),
    ).toEqual({
      pmtilesCoordinateSystem: "WGS84",
      usesWgs84Pmtiles: true,
      hasGcj02Transform: false,
    });
    expect(
      resolveAdminPmtilesCoordinateState(
        "/admin-tiles/guangdong-admin-boundaries-gcj02.pmtiles",
      ),
    ).toEqual({
      pmtilesCoordinateSystem: "GCJ-02",
      usesWgs84Pmtiles: false,
      hasGcj02Transform: false,
    });
  });

  it("PMTILES_ONLY=1 时关闭旧 AMap admin overlay", () => {
    vi.stubEnv("NEXT_PUBLIC_MAP_STUDIO_ADMIN_PMTILES_OVERLAY", "1");
    vi.stubEnv("NEXT_PUBLIC_MAP_STUDIO_ADMIN_PMTILES_ONLY", "1");

    expect(resolveMapStudioAdminOverlayMode("admin")).toEqual({
      adminBoundaryVisible: false,
      adminPmtilesOverlayVisible: true,
      enableAdminPmtilesOverlay: true,
      enableHkMoSpecialRuntime: false,
      adminPmtilesOnlyMode: true,
    });

    vi.unstubAllEnvs();
  });

  it("行政区视图保留默认的单一 PMTiles 路径", () => {
    vi.unstubAllEnvs();

    expect(resolveMapStudioAdminOverlayMode("admin")).toEqual({
      adminBoundaryVisible: false,
      adminPmtilesOverlayVisible: true,
      enableAdminPmtilesOverlay: true,
      enableHkMoSpecialRuntime: false,
      adminPmtilesOnlyMode: true,
    });
  });

  it("PMTiles overlay 开启时不会同时创建旧 AMap admin overlay", () => {
    vi.stubEnv("NEXT_PUBLIC_MAP_STUDIO_ADMIN_PMTILES_OVERLAY", "1");
    vi.stubEnv("NEXT_PUBLIC_MAP_STUDIO_ADMIN_PMTILES_ONLY", "0");

    expect(resolveMapStudioAdminOverlayMode("admin")).toEqual({
      adminBoundaryVisible: false,
      adminPmtilesOverlayVisible: true,
      enableAdminPmtilesOverlay: true,
      enableHkMoSpecialRuntime: false,
      adminPmtilesOnlyMode: false,
    });

    vi.unstubAllEnvs();
  });

  it("港澳特殊 runtime layer 旧开关不会单独挂载 MapLibre overlay", () => {
    vi.stubEnv("NEXT_PUBLIC_MAP_STUDIO_ADMIN_PMTILES_OVERLAY", "0");
    vi.stubEnv("NEXT_PUBLIC_MAP_STUDIO_HK_MO_SPECIAL_ADMIN_RUNTIME", "1");
    vi.stubEnv("NEXT_PUBLIC_MAP_STUDIO_ADMIN_PMTILES_ONLY", "0");

    expect(resolveMapStudioAdminOverlayMode("admin")).toEqual({
      adminBoundaryVisible: true,
      adminPmtilesOverlayVisible: false,
      enableAdminPmtilesOverlay: false,
      enableHkMoSpecialRuntime: false,
      adminPmtilesOnlyMode: false,
    });

    vi.unstubAllEnvs();
  });

  it("clean 和 travel_region 模式下不挂载任何 MapLibre 行政 overlay", () => {
    vi.stubEnv("NEXT_PUBLIC_MAP_STUDIO_ADMIN_PMTILES_OVERLAY", "1");
    vi.stubEnv("NEXT_PUBLIC_MAP_STUDIO_HK_MO_SPECIAL_ADMIN_RUNTIME", "1");
    vi.stubEnv("NEXT_PUBLIC_MAP_STUDIO_ADMIN_PMTILES_ONLY", "1");

    expect(resolveMapStudioAdminOverlayMode("clean")).toEqual({
      adminBoundaryVisible: false,
      adminPmtilesOverlayVisible: false,
      enableAdminPmtilesOverlay: false,
      enableHkMoSpecialRuntime: false,
      adminPmtilesOnlyMode: false,
    });
    expect(resolveMapStudioAdminOverlayMode("travel_region")).toEqual({
      adminBoundaryVisible: false,
      adminPmtilesOverlayVisible: false,
      enableAdminPmtilesOverlay: false,
      enableHkMoSpecialRuntime: false,
      adminPmtilesOnlyMode: false,
    });

    vi.unstubAllEnvs();
  });

  it("港澳特殊 runtime layer 和 PMTiles overlay 都关闭时不挂 MapLibre overlay", () => {
    vi.stubEnv("NEXT_PUBLIC_MAP_STUDIO_ADMIN_PMTILES_OVERLAY", "0");
    vi.stubEnv("NEXT_PUBLIC_MAP_STUDIO_HK_MO_SPECIAL_ADMIN_RUNTIME", "0");
    vi.stubEnv("NEXT_PUBLIC_MAP_STUDIO_ADMIN_PMTILES_ONLY", "1");

    expect(resolveMapStudioAdminOverlayMode("admin")).toEqual({
      adminBoundaryVisible: false,
      adminPmtilesOverlayVisible: false,
      enableAdminPmtilesOverlay: false,
      enableHkMoSpecialRuntime: false,
      adminPmtilesOnlyMode: true,
    });

    vi.unstubAllEnvs();
  });

  it("PMTiles protocol 多个 overlay 复用同一次注册", () => {
    const addProtocol = vi.fn();
    const removeProtocol = vi.fn();
    const tile = vi.fn();
    const maplibregl = {
      addProtocol,
      removeProtocol,
    } as unknown as typeof import("maplibre-gl");
    class MockProtocol {
      tile = tile;
    }
    const Protocol = MockProtocol as unknown as typeof import("pmtiles").Protocol;

    const detachFirst = registerPmtilesProtocol(maplibregl, Protocol);
    const detachSecond = registerPmtilesProtocol(maplibregl, Protocol);

    expect(addProtocol).toHaveBeenCalledTimes(1);
    expect(addProtocol).toHaveBeenCalledWith("pmtiles", tile);
    expect(removeProtocol).not.toHaveBeenCalled();
    expect(getAdminPmtilesProtocolDebugState()).toMatchObject({
      activeUsers: 2,
      registered: true,
    });

    detachFirst();
    expect(removeProtocol).not.toHaveBeenCalled();
    expect(getAdminPmtilesProtocolDebugState()).toMatchObject({
      activeUsers: 1,
      registered: true,
    });

    detachSecond();
    expect(removeProtocol).toHaveBeenCalledTimes(1);
    expect(removeProtocol).toHaveBeenCalledWith("pmtiles");
    expect(getAdminPmtilesProtocolDebugState()).toMatchObject({
      activeUsers: 0,
      registered: false,
    });
  });
});

function getLayerById(style: ReturnType<typeof createAdminPmtilesStyle>, id: string) {
  const layer = style.layers.find((candidate) => candidate.id === id);

  expect(layer).toBeTruthy();

  return layer as {
    id: string;
    minzoom?: number;
    maxzoom?: number;
    filter?: unknown;
    layout: Record<string, unknown>;
    paint: Record<string, unknown>;
    source?: string;
    "source-layer"?: string;
  };
}
