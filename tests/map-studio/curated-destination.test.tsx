import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { MapStudio } from "../../components/map-studio/MapStudio";
import {
  buildMapStudioMarkerPoints,
  buildMapStudioPolygonRegions,
  buildMapStudioRegionLabels,
  resolveMapStudioAmapFeatures,
  resolveMapStudioAmapShowLabel,
  resolveMapStudioAmapStyle,
} from "../../components/map-studio/MapStudioCanvas";
import {
  buildShenzhenDestinationMapProject,
  buildShenzhenCuratedMapProject,
  SHENZHEN_CURATED_DESTINATION,
} from "../../lib/map-studio/curated-destinations";
import {
  CHINA_CITY_ENTRIES,
  getDestinationProfile,
} from "../../lib/map-studio/destination-profiles";
import { mapProjectSchema } from "../../lib/map-studio/schema";
import type { TripPlan } from "../../lib/trip/types";

function createBlankTripPlan(): TripPlan {
  return {
    tripTitle: "空白旅行计划",
    summary: "还没有安排。",
    destination: "待定目的地",
    days: 1,
    travelStyleSummary: "待定",
    weatherSummary: {
      available: false,
      overview: "暂无实时天气。",
      dailyForecast: [],
      alerts: [],
      reminders: [],
      dataNote: "测试数据。",
    },
    budgetSummary: {
      totalEstimate: "待定",
      transport: "待定",
      hotel: "待定",
      food: "待定",
      tickets: "待定",
      localTransport: "待定",
      flexibleSpending: "待定",
      note: "测试数据。",
    },
    hotelAreaAdvice: [],
    transportAdvice: {
      summary: "待定。",
      options: [],
      suggestedPlatforms: [],
      note: "测试数据。",
    },
    dailyItinerary: [
      {
        day: 1,
        theme: "待定",
        routeOrder: [],
        routeReason: "还没有正式安排。",
        morning: [],
        afternoon: [],
        evening: [],
        dailyTips: [],
      },
    ],
    generalTips: [],
    warnings: [],
  };
}

function getPolygonBounds(points: Array<{ lat: number; lng: number }>) {
  return points.reduce(
    (bounds, point) => ({
      minLat: Math.min(bounds.minLat, point.lat),
      maxLat: Math.max(bounds.maxLat, point.lat),
      minLng: Math.min(bounds.minLng, point.lng),
      maxLng: Math.max(bounds.maxLng, point.lng),
    }),
    {
      minLat: Number.POSITIVE_INFINITY,
      maxLat: Number.NEGATIVE_INFINITY,
      minLng: Number.POSITIVE_INFINITY,
      maxLng: Number.NEGATIVE_INFINITY,
    },
  );
}

function getBoundsArea(bounds: ReturnType<typeof getPolygonBounds>) {
  return Math.max(0, bounds.maxLat - bounds.minLat) *
    Math.max(0, bounds.maxLng - bounds.minLng);
}

function getOverlapRatio(
  left: ReturnType<typeof getPolygonBounds>,
  right: ReturnType<typeof getPolygonBounds>,
) {
  const overlapLat = Math.max(
    0,
    Math.min(left.maxLat, right.maxLat) - Math.max(left.minLat, right.minLat),
  );
  const overlapLng = Math.max(
    0,
    Math.min(left.maxLng, right.maxLng) - Math.max(left.minLng, right.minLng),
  );
  const overlapArea = overlapLat * overlapLng;
  const smallerArea = Math.min(getBoundsArea(left), getBoundsArea(right));

  return smallerArea > 0 ? overlapArea / smallerArea : 0;
}

describe("curated Shenzhen Map Studio destination", () => {
  it("uses a POI-free AMap base layer for Map Studio", () => {
    expect(resolveMapStudioAmapStyle()).toBe("amap://styles/whitesmoke");
    expect(resolveMapStudioAmapFeatures()).toEqual(["bg", "road", "building"]);
    expect(resolveMapStudioAmapShowLabel()).toBe(false);
  });

  it("filters point out of configured Map Studio AMap features", () => {
    vi.stubEnv("NEXT_PUBLIC_MAP_STUDIO_AMAP_FEATURES", "bg,road,point,building");

    expect(resolveMapStudioAmapFeatures()).toEqual(["bg", "road", "building"]);

    vi.unstubAllEnvs();
  });

  it("defines Shenzhen destination data without falling back to Beijing", () => {
    const destination = SHENZHEN_CURATED_DESTINATION;

    expect(destination.countryName).toBe("中国");
    expect(destination.cityName).toBe("深圳");
    expect(destination.cityCenter).toEqual({ lat: 22.5431, lng: 114.0579 });
    expect(destination.travelHotspots.map((hotspot) => hotspot.name)).toEqual([
      "大鹏滨海",
      "华侨城",
      "蛇口/海上世界",
      "深圳湾/后海",
      "福田中心",
      "盐田海滨",
      "罗湖东门",
    ]);
    expect(destination.travelHotspots.map((hotspot) => hotspot.id)).toEqual([
      "dapeng_coast",
      "oct_huaqiaocheng",
      "shekou_sea_world",
      "shenzhen_bay_houhai",
      "futian_center",
      "yantian_seaside",
      "luohu_dongmen",
    ]);
    expect(
      destination.travelHotspots.every(
        (hotspot) => hotspot.boundary[0] && hotspot.boundary[0].length >= 7,
      ),
    ).toBe(true);
    const hotspotBounds = destination.travelHotspots.map((hotspot) => ({
      id: hotspot.id,
      bounds: getPolygonBounds(hotspot.boundary[0] ?? []),
    }));
    for (let leftIndex = 0; leftIndex < hotspotBounds.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < hotspotBounds.length; rightIndex += 1) {
        expect(
          getOverlapRatio(
            hotspotBounds[leftIndex]!.bounds,
            hotspotBounds[rightIndex]!.bounds,
          ),
          `${hotspotBounds[leftIndex]!.id} overlaps ${hotspotBounds[rightIndex]!.id}`,
        ).toBeLessThan(0.32);
      }
    }
    expect(destination.administrativeDistricts.map((district) => district.name)).toEqual([
      "南山区",
      "福田区",
      "罗湖区",
      "盐田区",
      "龙岗区",
      "宝安区",
      "龙华区",
      "光明区",
      "坪山区",
      "大鹏新区",
    ]);
    expect(destination.places).toHaveLength(28);
    expect(
      destination.travelHotspots.every(
        (hotspot) =>
          destination.places.filter((place) => place.hotspotId === hotspot.id)
            .length >= 4,
      ),
    ).toBe(true);
  });

  it("defines China overview city entries with only Shenzhen available for now", () => {
    expect(CHINA_CITY_ENTRIES.map((city) => city.cityName)).toEqual([
      "北京",
      "上海",
      "杭州",
      "西安",
      "成都",
      "广州",
      "深圳",
      "厦门",
    ]);
    expect(
      CHINA_CITY_ENTRIES.filter((city) => city.available).map((city) => ({
        name: city.cityName,
        profileId: city.destinationProfileId,
        status: city.statusLabel,
      })),
    ).toEqual([
      {
        name: "深圳",
        profileId: "cn-shenzhen",
        status: "可探索",
      },
    ]);
    expect(
      CHINA_CITY_ENTRIES.filter((city) => !city.available).every(
        (city) => city.statusLabel === "即将开放",
      ),
    ).toBe(true);
    expect(getDestinationProfile("cn-shenzhen")).toMatchObject({
      country: "CN",
      countryName: "中国",
      cityName: "深圳",
      cityAdcode: "440300",
      available: true,
    });
  });

  it("builds a valid MapProject with districts, labels, hotspots, places, candidates on and traffic off", () => {
    const project = buildShenzhenCuratedMapProject({
      tripPlan: createBlankTripPlan(),
      now: "2026-09-26T00:00:00.000Z",
    });

    expect(() => mapProjectSchema.parse(project)).not.toThrow();
    expect(project.city).toBe("深圳");
    expect(project.title).toBe("深圳地图探索");
    expect(project.mapMode.center).toEqual({ lat: 22.58, lng: 114.15 });
    const hotspots = project.regions.filter((region) => region.regionType !== "administrative");
    expect(hotspots).toHaveLength(7);
    expect(
      hotspots.every(
        (region) =>
          region.priority &&
          region.minZoom &&
          region.maxZoom &&
          region.shortName &&
          region.labelAnchor &&
          region.suggestedDuration,
      ),
    ).toBe(true);
    expect(project.regions.filter((region) => region.regionType === "administrative")).toHaveLength(0);
    expect(project.regions.map((region) => region.displayName)).not.toEqual(
      expect.arrayContaining(["南山区", "福田区", "罗湖区"]),
    );
    expect(project.layers.map((layer) => [layer.type, layer.isVisible])).toEqual([
      ["hotspots", true],
      ["districts", true],
      ["labels", true],
      ["plan_places", true],
      ["places", true],
      ["candidates", true],
      ["routes", false],
      ["traffic", false],
    ]);
    expect(project.places.every((place) => place.dataStatus === "curated")).toBe(true);
    expect(project.places.every((place) => place.sourceType === "seed")).toBe(true);
    expect(project.places.every((place) => place.source.label !== "Wanderly curated sample")).toBe(true);
  });

  it("builds formal Shenzhen exploration from destination profile without mock project data", () => {
    const project = buildShenzhenDestinationMapProject({
      tripPlan: createBlankTripPlan(),
      now: "2026-09-26T00:00:00.000Z",
    });

    expect(project.title).toBe("深圳地图探索");
    expect(project.id).toContain("china-shenzhen-map-project");
    expect(project.places).not.toHaveLength(0);
    expect(project.places.every((place) => place.sourceType === "seed")).toBe(true);
    expect(project.places.some((place) => place.sourceType === "mock")).toBe(false);
    expect(project.regions.some((region) => region.regionType === "administrative")).toBe(false);
    expect(project.regions.map((region) => region.displayName)).not.toEqual(
      expect.arrayContaining(["南山区", "福田区", "罗湖区", "华侨城 / 行政区"]),
    );
  });

  it("keeps hotspot polygons separate from the DistrictSearch administrative layer", () => {
    const project = buildShenzhenCuratedMapProject({
      tripPlan: createBlankTripPlan(),
    });
    const defaultPolygons = buildMapStudioPolygonRegions(project);
    const hotspotsOffProject = {
      ...project,
      layers: project.layers.map((layer) =>
        layer.type === "hotspots" ? { ...layer, isVisible: false } : layer,
      ),
    };

    expect(defaultPolygons.map((polygon) => polygon.id)).toEqual(expect.arrayContaining([
      "dapeng_coast",
      "oct_huaqiaocheng",
      "shekou_sea_world",
      "shenzhen_bay_houhai",
      "futian_center",
      "yantian_seaside",
    ]));
    expect(defaultPolygons.some((polygon) => polygon.id.startsWith("sz-district-"))).toBe(false);
    expect(buildMapStudioPolygonRegions(hotspotsOffProject)).toEqual([]);
    expect(buildMapStudioMarkerPoints(project)).toEqual([]);
  });

  it("uses zoom-aware hotspot labels and reveals place markers only in detailed views", () => {
    const project = buildShenzhenCuratedMapProject({
      tripPlan: createBlankTripPlan(),
    });
    const labelsAtCityZoom = buildMapStudioRegionLabels(project);
    const detailedProject = {
      ...project,
      selectedRegionId: "futian_center",
      mapMode: {
        ...project.mapMode,
        zoomLevel: 12,
      },
      places: project.places.map((place) => ({
        ...place,
        ui: {
          ...place.ui,
          isVisible: place.regionId === "futian_center",
        },
      })),
    };

    expect(labelsAtCityZoom.map((label) => label.shortName)).toEqual([
      "深圳",
      "福田",
      "深圳湾",
      "大鹏",
      "华侨城",
      "蛇口",
    ]);
    expect(
      buildMapStudioRegionLabels({
        ...project,
        layers: project.layers.map((layer) =>
          layer.type === "labels" ? { ...layer, isVisible: false } : layer,
        ),
      }),
    ).toEqual([]);
    expect(buildMapStudioMarkerPoints(project)).toEqual([]);
    const detailedMarkers = buildMapStudioMarkerPoints(detailedProject);
    expect(detailedMarkers).toHaveLength(4);
    expect(detailedMarkers.every((marker) => marker.markerVariant === "dot")).toBe(true);
    expect(detailedMarkers.some((marker) => marker.showLabel === false)).toBe(true);
  });

  it("does not keep every place label permanently visible at high zoom", () => {
    const project = buildShenzhenCuratedMapProject({
      tripPlan: createBlankTripPlan(),
    });
    const highZoomProject = {
      ...project,
      mapMode: {
        ...project.mapMode,
        zoomLevel: 13,
      },
    };
    const markers = buildMapStudioMarkerPoints(highZoomProject);

    expect(markers).toHaveLength(project.places.length);
    expect(markers.every((marker) => marker.markerVariant === "dot")).toBe(true);
    expect(markers.some((marker) => marker.showLabel === false)).toBe(true);
    expect(markers.filter((marker) => marker.showLabel !== false).length).toBeLessThan(
      markers.length,
    );
  });

  it("renders China overview map for blank Map Studio instead of a Shenzhen entry gate", () => {
    const markup = renderToStaticMarkup(
      <MapStudio
        tripPlan={createBlankTripPlan()}
        tripRequest={null}
        mapProject={null}
        requiresDestinationSelection
        onWorkspaceModeChange={vi.fn()}
      />,
    );

    expect(markup).toContain("中国地图探索");
    expect(markup).not.toContain("进入中国地图探索");
    expect(markup).not.toContain("默认加载省级行政区划");
    expect(markup).not.toContain("北京");
    expect(markup).not.toContain("上海");
    expect(markup).not.toContain("即将开放");
    expect(markup).not.toContain("地图探索底图已就绪");
    expect(markup).not.toContain("打开地点图层后，候选地点会显示在地图上。");
    expect(markup).not.toContain("加载深圳样板探索");
    expect(markup).not.toContain("样板目的地");
    expect(markup).not.toContain("深圳样板");
  });
});
