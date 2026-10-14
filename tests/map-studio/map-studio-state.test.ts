import { describe, expect, it } from "vitest";

import {
  buildMapStudioMarkerPoints,
  buildMapStudioPolygonRegions,
  buildMapStudioRegionLabels,
} from "../../components/map-studio/MapStudioCanvas";
import { buildMapStudioViewProject } from "../../hooks/useMapStudioState";
import { createDefaultMapLayerState } from "../../lib/map-studio/layer-state";
import { createMockMapProject } from "../../lib/map-studio/mock-project";
import { createCandidateFromPlace } from "../../lib/map-studio/trip-adapter";
import type {
  CandidatePlace,
  MapPlaceCategory,
} from "../../lib/map-studio/types";
import type { TripPlan, TripRequest } from "../../lib/trip/types";

const tripRequest: TripRequest = {
  departureCity: "深圳",
  destinationCity: "杭州",
  days: 1,
  budget: 1500,
  currency: "CNY",
  interests: ["城市漫步"],
  travelStyles: ["轻松"],
  mustVisitPlaces: [],
  avoidPlaces: [],
};

const tripPlan: TripPlan = {
  tripTitle: "杭州 1 天轻松走",
  summary: "湖边慢慢走。",
  destination: "杭州",
  days: 1,
  travelStyleSummary: "轻松",
  weatherSummary: {
    available: false,
    overview: "暂无实时天气。",
    dailyForecast: [],
    alerts: [],
    reminders: [],
    dataNote: "测试数据。",
  },
  budgetSummary: {
    totalEstimate: "约 1500 元",
    transport: "500 元",
    hotel: "500 元",
    food: "250 元",
    tickets: "100 元",
    localTransport: "80 元",
    flexibleSpending: "70 元",
    note: "测试数据。",
  },
  hotelAreaAdvice: [],
  transportAdvice: {
    summary: "按需选择交通方式。",
    options: [],
    suggestedPlatforms: [],
    note: "测试数据。",
  },
  dailyItinerary: [
    {
      day: 1,
      theme: "湖边慢慢走",
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

function buildProjectView(input: {
  selectedRegionId?: string;
  hoveredRegionId?: string;
  selectedPlaceId?: string;
  activeCategoryIds?: MapPlaceCategory[];
  activeLayerIds?: string[];
  candidatePlaces?: CandidatePlace[];
} = {}) {
  const mapProject = createMockMapProject({
    tripPlan,
    tripRequest,
    now: "2026-09-24T00:00:00.000Z",
  });

  return buildMapStudioViewProject({
    mapProject,
    selectedRegionId: input.selectedRegionId,
    hoveredRegionId: input.hoveredRegionId,
    selectedPlaceId: input.selectedPlaceId,
    activeLayerIds:
      input.activeLayerIds ?? mapProject.layers.map((layer) => layer.id),
    activeCategoryIds: input.activeCategoryIds ?? [
      "attraction",
      "neighborhood",
      "museum",
      "nature",
      "food",
      "shopping",
      "experience",
    ],
    candidatePlaces: input.candidatePlaces ?? [],
    activeTool: "region",
    activeDayId: "1",
    mapZoom: mapProject.mapMode.zoomLevel,
    mapCenter: mapProject.mapMode.center,
  });
}

describe("Map Studio region state", () => {
  it("选中区域会高亮，其他区域变暗，并只显示该区域地点", () => {
    const selectedRegionId = "杭州-region-core";
    const project = buildProjectView({ selectedRegionId });
    const selectedRegion = project.regions.find(
      (region) => region.id === selectedRegionId,
    );
    const dimmedRegion = project.regions.find(
      (region) => region.id !== selectedRegionId,
    );

    expect(project.selectedRegionId).toBe(selectedRegionId);
    expect(selectedRegion?.state.isSelected).toBe(true);
    expect(selectedRegion?.state.isHighlighted).toBe(true);
    expect(dimmedRegion?.fillColor).toBe("rgba(67, 85, 81, 0.28)");
    expect(buildMapStudioMarkerPoints(project).map((point) => point.id)).toEqual(
      project.places
        .filter((place) => place.regionId === selectedRegionId)
        .map((place) => place.id),
    );
  });

  it("悬停区域使用 hover 样式，转成 polygon 时 zIndex 高于默认区域", () => {
    const hoveredRegionId = "杭州-region-culture";
    const project = buildProjectView({ hoveredRegionId });
    const polygons = buildMapStudioPolygonRegions(project);
    const hoveredPolygon = polygons.find((polygon) => polygon.id === hoveredRegionId);
    const defaultPolygon = polygons.find((polygon) => polygon.id !== hoveredRegionId);

    expect(
      project.regions.find((region) => region.id === hoveredRegionId)?.state
        .isHovered,
    ).toBe(true);
    expect(hoveredPolygon?.strokeWeight).toBe(2);
    expect(hoveredPolygon?.zIndex ?? 0).toBeGreaterThan(
      defaultPolygon?.zIndex ?? 0,
    );
  });

  it("城市级 zoom 会限制区域标签数量，避免热点标签全部堆叠", () => {
    const project = buildProjectView();

    expect(buildMapStudioRegionLabels(project).map((label) => label.shortName)).toEqual([
      "杭州",
      "文化体验区",
      "自然休闲区",
    ]);
  });

  it("清除选择状态后地图回到默认区域和全部地点", () => {
    const project = buildProjectView();

    expect(project.selectedRegionId).toBeUndefined();
    expect(project.regions.every((region) => !region.state.isSelected)).toBe(true);
    expect(buildMapStudioMarkerPoints(project)).toHaveLength(project.places.length);
  });

  it("类型筛选会影响可见地点", () => {
    const project = buildProjectView({
      selectedRegionId: "杭州-region-core",
      activeCategoryIds: ["food"],
    });

    expect(project.places.filter((place) => place.ui.isVisible)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "food",
          regionId: "杭州-region-core",
        }),
      ]),
    );
    expect(
      project.places.some(
        (place) => place.category !== "food" && place.ui.isVisible,
      ),
    ).toBe(false);
  });

  it("图层开关会影响 marker 输出", () => {
    const project = buildProjectView({
      activeLayerIds: ["layer-regions", "layer-routes", "layer-candidates"],
    });

    expect(buildMapStudioMarkerPoints(project)).toEqual([]);
  });

  it("候选图层可以单独显示已加入候选的地点", () => {
    const baseProject = createMockMapProject({
      tripPlan,
      tripRequest,
      now: "2026-09-24T00:00:00.000Z",
    });
    const candidate = createCandidateFromPlace(
      baseProject.places[0]!,
      "2026-09-24T00:00:00.000Z",
    );
    const project = buildMapStudioViewProject({
      mapProject: baseProject,
      selectedRegionId: undefined,
      hoveredRegionId: undefined,
      selectedPlaceId: candidate.placeId,
      activeLayerIds: ["layer-regions", "layer-routes", "layer-candidates"],
      activeCategoryIds: ["attraction", "food"],
      candidatePlaces: [candidate],
      activeTool: "place",
      activeDayId: "1",
      mapZoom: baseProject.mapMode.zoomLevel,
      mapCenter: baseProject.mapMode.center,
    });

    expect(project.candidatePlaceIds).toEqual([candidate.placeId]);
    expect(
      project.places.find((place) => place.id === candidate.placeId)?.isCandidate,
    ).toBe(true);
    expect(buildMapStudioMarkerPoints(project).map((point) => point.id)).toEqual([
      candidate.placeId,
    ]);
  });

  it("主视图状态控制行政区划、旅行区域和纯地图的互斥显示", () => {
    const project = buildProjectView();
    const adminLayerState = createDefaultMapLayerState();
    const travelRegionLayerState = {
      ...adminLayerState,
      primaryView: "travel_region" as const,
    };
    const cleanLayerState = {
      ...adminLayerState,
      primaryView: "clean" as const,
    };

    expect(adminLayerState.primaryView).toBe("admin");
    expect(buildMapStudioPolygonRegions(project, adminLayerState)).toEqual([]);
    expect(buildMapStudioRegionLabels(project, adminLayerState)).toEqual([]);
    expect(buildMapStudioPolygonRegions(project, travelRegionLayerState).length).toBeGreaterThan(0);
    expect(buildMapStudioRegionLabels(project, travelRegionLayerState).length).toBeGreaterThan(0);
    expect(buildMapStudioPolygonRegions(project, cleanLayerState)).toEqual([]);
    expect(buildMapStudioRegionLabels(project, cleanLayerState)).toEqual([]);
  });

  it("layer state 可以独立控制推荐、候选和行程 marker 显示", () => {
    const baseProject = createMockMapProject({
      tripPlan,
      tripRequest,
      now: "2026-09-24T00:00:00.000Z",
    });
    const candidate = createCandidateFromPlace(
      baseProject.places[0]!,
      "2026-09-24T00:00:00.000Z",
    );
    const project = buildMapStudioViewProject({
      mapProject: baseProject,
      selectedRegionId: undefined,
      hoveredRegionId: undefined,
      selectedPlaceId: undefined,
      activeLayerIds: baseProject.layers.map((layer) => layer.id),
      activeCategoryIds: [
        "attraction",
        "neighborhood",
        "museum",
        "nature",
        "food",
        "shopping",
        "experience",
      ],
      candidatePlaces: [candidate],
      activeTool: "layer",
      activeDayId: "1",
      mapZoom: baseProject.mapMode.zoomLevel,
      mapCenter: baseProject.mapMode.center,
    });
    const plannedPlaceId = project.places.find(
      (place) => !place.isCandidate && place.sourceType !== "candidate",
    )?.id;
    const projectWithPlannedPlace = {
      ...project,
      places: project.places.map((place) =>
        place.id === plannedPlaceId
          ? { ...place, sourceType: "plan" as const, assignedDayId: "1" }
          : place,
      ),
    };
    const layerState = {
      ...createDefaultMapLayerState(),
      explore: {
        ...createDefaultMapLayerState().explore,
        attractions: false,
        food: false,
        recommendedPlaces: false,
        plannedPlaces: false,
        candidatePlaces: true,
      },
    };

    expect(buildMapStudioMarkerPoints(projectWithPlannedPlace, layerState).map((point) => point.id)).toEqual([
      candidate.placeId,
    ]);
    expect(
      buildMapStudioMarkerPoints(projectWithPlannedPlace, {
        ...layerState,
        explore: {
          ...layerState.explore,
          candidatePlaces: false,
        },
      }),
    ).toEqual([]);
    expect(
      buildMapStudioMarkerPoints(projectWithPlannedPlace, {
        ...layerState,
        explore: {
          ...layerState.explore,
          candidatePlaces: false,
          plannedPlaces: true,
        },
      }).map((point) => point.id),
    ).toEqual(plannedPlaceId ? [plannedPlaceId] : []);
    expect(
      buildMapStudioMarkerPoints(projectWithPlannedPlace, {
        ...layerState,
        explore: {
          ...layerState.explore,
          attractions: true,
          recommendedPlaces: true,
          candidatePlaces: false,
          plannedPlaces: false,
        },
      }).length,
    ).toBeGreaterThan(0);
  });
});
