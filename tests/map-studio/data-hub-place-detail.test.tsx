import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { MapStudioLeftPanel } from "../../components/map-studio/MapStudioLeftPanel";
import { loadMapStudioPlaceDetail, type MapStudioPlaceDetailState, type MapStudioRegionDetailState } from "../../components/map-studio/MapStudio";
import { createMockMapProject } from "../../lib/map-studio/mock-project";
import { createCandidateFromPlace } from "../../lib/map-studio/trip-adapter";
import type { MapPlace, MapProject } from "../../lib/map-studio/types";
import type { NormalizedPlaceDetail } from "../../src/server/data-hub/types";
import type { TripPlan, TripRequest } from "../../lib/trip/types";

const tripRequest: TripRequest = {
  departureCity: "深圳",
  destinationCity: "深圳",
  days: 1,
  budget: 1500,
  currency: "CNY",
  interests: ["城市漫步"],
  travelStyles: ["轻松"],
  mustVisitPlaces: [],
  avoidPlaces: [],
};

const tripPlan: TripPlan = {
  tripTitle: "深圳 1 天轻松走",
  summary: "慢慢看海。",
  destination: "深圳",
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
      theme: "海边慢慢走",
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

function buildProject() {
  return createMockMapProject({
    tripPlan,
    tripRequest,
    now: "2026-09-30T00:00:00.000Z",
  });
}

function renderPanel({
  project,
  selectedPlace,
  detailState,
  regionDetailState = { status: "idle", missingFields: [] },
}: {
  project: MapProject;
  selectedPlace: MapPlace;
  detailState: MapStudioPlaceDetailState;
  regionDetailState?: MapStudioRegionDetailState;
}) {
  return renderToStaticMarkup(
    <MapStudioLeftPanel
      mapProject={project}
      tripRequest={tripRequest}
      selectedPlace={selectedPlace}
      regionDetailState={regionDetailState}
      placeDetailState={detailState}
      visibleRegionPlaces={[selectedPlace]}
      onPlaceSelect={vi.fn()}
      onAddCandidate={vi.fn()}
      onClearSelection={vi.fn()}
    />,
  );
}

function createDetail(place: MapPlace): NormalizedPlaceDetail {
  return {
    place: {
      id: "datahub-place-shenzhen-bay",
      name: place.displayName,
      lat: place.lat,
      lng: place.lng,
      address: "深圳市南山区深圳湾公园",
      category: place.category,
      tags: ["海边", "散步"],
      status: "active",
      source: {
        provider: "amap",
        fieldName: "base",
        externalId: "amap-poi-1",
        confidence: 0.82,
        fetchedAt: "2026-09-30T08:00:00.000Z",
        lastVerifiedAt: "2026-09-30T08:00:00.000Z",
      },
      confidence: 0.82,
      lastVerifiedAt: "2026-09-30T08:00:00.000Z",
      missingFields: [],
    },
    intro: null,
    openingHours: null,
    ticketInfo: null,
    recommendedDurationMinutes: 90,
    imageUrls: [],
    sources: [
      {
        provider: "amap",
        fieldName: "base",
        externalId: "amap-poi-1",
        confidence: 0.82,
        fetchedAt: "2026-09-30T08:00:00.000Z",
        lastVerifiedAt: "2026-09-30T08:00:00.000Z",
      },
      {
        provider: "wikimedia",
        fieldName: "intro",
        sourceUrl: "https://example.test/wiki/shenzhen-bay",
        confidence: 0.58,
        fetchedAt: "2026-09-30T08:01:00.000Z",
      },
    ],
    confidence: 0.74,
    lastVerifiedAt: "2026-09-30T08:00:00.000Z",
    missingFields: [
      {
        fieldName: "intro",
        reason: "not_returned",
        severity: "info",
        message: "简介暂缺",
        provider: "wikimedia",
      },
      {
        fieldName: "openingHours",
        reason: "not_returned",
        severity: "warning",
        message: "开放时间暂缺，建议出行前确认",
        provider: "amap",
      },
      {
        fieldName: "ticketInfo",
        reason: "not_returned",
        severity: "warning",
        message: "门票信息暂缺，价格可能随时间变化",
        provider: "amap",
      },
      {
        fieldName: "imageUrls",
        reason: "not_returned",
        severity: "info",
        message: "图片候选暂缺，先使用占位图。",
        provider: "wikimedia",
      },
    ],
  };
}

describe("Map Studio DataHub place detail panel", () => {

  it("根据 marker 的 dataHubPlaceId 选择 get detail 或 enrich endpoint", async () => {
    const project = buildProject();
    const basePlace = project.places[0]!;
    const getPlaceDetail = vi.fn().mockResolvedValue({
      ok: true,
      detail: null,
      missingFields: [],
    });
    const enrichPlace = vi.fn().mockResolvedValue({
      ok: true,
      detail: null,
      missingFields: [],
    });

    await loadMapStudioPlaceDetail(
      { ...basePlace, dataHubPlaceId: "place-from-datahub" },
      { getPlaceDetail, enrichPlace },
    );

    expect(getPlaceDetail).toHaveBeenCalledWith("place-from-datahub");
    expect(enrichPlace).not.toHaveBeenCalled();

    getPlaceDetail.mockClear();
    await loadMapStudioPlaceDetail(
      {
        ...basePlace,
        dataHubPlaceId: undefined,
        sourceProvider: "wanderly_curated",
        sourceExternalId: "seed-place-1",
      },
      { getPlaceDetail, enrichPlace },
    );

    expect(getPlaceDetail).not.toHaveBeenCalled();
    expect(enrichPlace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: basePlace.name || basePlace.displayName,
        lat: basePlace.lat,
        lng: basePlace.lng,
        regionId: basePlace.regionId,
        sourceProvider: "wanderly_curated",
        sourceExternalId: "seed-place-1",
      }),
    );
  });

  it("展示 DataHub partial 详情、缺失字段提示、来源和更新时间", () => {
    const project = buildProject();
    const basePlace = project.places[0]!;
    const detail = createDetail(basePlace);
    const selectedPlace: MapPlace = {
      ...basePlace,
      dataHubPlaceId: detail.place.id,
      dataHubDetail: detail,
      missingFields: detail.missingFields,
      lastVerifiedAt: detail.lastVerifiedAt,
      confidence: detail.confidence,
      ui: { ...basePlace.ui, isSelected: true },
    };

    const markup = renderPanel({
      project,
      selectedPlace,
      detailState: {
        placeId: selectedPlace.id,
        status: "partial",
        missingFields: detail.missingFields,
      },
    });

    expect(markup).toContain(selectedPlace.displayName);
    expect(markup).toContain("简介暂缺");
    expect(markup).toContain("开放时间暂缺，建议出行前确认");
    expect(markup).toContain("门票信息暂缺，价格可能随时间变化");
    expect(markup).toContain("图片候选");
    expect(markup).toContain("数据来源");
    expect(markup).toContain("高德 / Wikimedia");
    expect(markup).toContain("更新时间");
    expect(markup).toContain("可信度");
    expect(markup).toContain("暂缺字段");
    expect(markup).not.toContain("raw_json");
    expect(markup).not.toContain("raw_snapshot");
    expect(markup).not.toContain("AMAP_API_KEY");
  });

  it("DataHub 失败时仍展示 seed 基础信息和错误态", () => {
    const project = buildProject();
    const basePlace = project.places[0]!;
    const selectedPlace: MapPlace = {
      ...basePlace,
      shortDescription: "沿海慢行和看日落都很方便。",
      ui: { ...basePlace.ui, isSelected: true },
    };

    const markup = renderPanel({
      project,
      selectedPlace,
      detailState: {
        placeId: selectedPlace.id,
        status: "error",
        error: "地点资料暂时不可用，已保留现有地点信息。",
        missingFields: [
          {
            fieldName: "detail",
            reason: "provider_failed",
            severity: "warning",
            message: "地点资料暂时不可用",
          },
        ],
      },
    });

    expect(markup).toContain(selectedPlace.displayName);
    expect(markup).toContain("沿海慢行和看日落都很方便。");
    expect(markup).toContain("地点资料暂时不可用，已保留现有地点信息。");
    expect(markup).toContain("开放时间暂缺，建议出行前确认");
    expect(markup).toContain("门票信息暂缺，价格可能随时间变化");
  });

  it("加入候选时保留 DataHub placeId/source/missingFields/lastVerifiedAt", () => {
    const project = buildProject();
    const basePlace = project.places[0]!;
    const detail = createDetail(basePlace);
    const place: MapPlace = {
      ...basePlace,
      dataHubPlaceId: detail.place.id,
      sourceProvider: "amap",
      sourceExternalId: "amap-poi-1",
      missingFields: detail.missingFields,
      lastVerifiedAt: detail.lastVerifiedAt,
    };

    const candidate = createCandidateFromPlace(
      place,
      "2026-09-30T08:05:00.000Z",
    );

    expect(candidate.dataHubPlaceId).toBe("datahub-place-shenzhen-bay");
    expect(candidate.sourceProvider).toBe("amap");
    expect(candidate.sourceExternalId).toBe("amap-poi-1");
    expect(candidate.lastVerifiedAt).toBe("2026-09-30T08:00:00.000Z");
    expect(candidate.missingFields?.map((field) => field.fieldName)).toEqual(
      expect.arrayContaining(["intro", "openingHours", "ticketInfo"]),
    );
  });
});



