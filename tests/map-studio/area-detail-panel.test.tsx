import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { MapStudioLeftPanel } from "../../components/map-studio/MapStudioLeftPanel";
import type { MapStudioRegionDetailState } from "../../components/map-studio/MapStudio";
import { createMockMapProject } from "../../lib/map-studio/mock-project";
import type { TripPlan, TripRequest } from "../../lib/trip/types";

const tripRequest: TripRequest = {
  departureCity: "深圳",
  destinationCity: "深圳",
  days: 1,
  budget: 1500,
  currency: "CNY",
  interests: ["海边"],
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
  weatherSummary: { available: false, overview: "暂无实时天气。", dailyForecast: [], alerts: [], reminders: [], dataNote: "测试数据。" },
  budgetSummary: { totalEstimate: "约 1500 元", transport: "500 元", hotel: "500 元", food: "250 元", tickets: "100 元", localTransport: "80 元", flexibleSpending: "70 元", note: "测试数据。" },
  hotelAreaAdvice: [],
  transportAdvice: { summary: "按需选择交通方式。", options: [], suggestedPlatforms: [], note: "测试数据。" },
  dailyItinerary: [{ day: 1, theme: "海边慢慢走", routeOrder: [], routeReason: "还没有正式安排。", morning: [], afternoon: [], evening: [], dailyTips: [] }],
  generalTips: [],
  warnings: [],
};

describe("Map Studio travel region detail panel", () => {
  it("点击 travel region 显示区域详情，而不是地点详情，并展示缺失字段", () => {
    const project = createMockMapProject({ tripPlan, tripRequest, now: "2026-09-30T00:00:00.000Z" });
    const region = project.regions[0]!;
    const regionPlaces = project.places.filter((place) => place.regionId === region.id);
    const regionDetailState: MapStudioRegionDetailState = {
      regionId: region.id,
      status: "partial",
      detail: {
        id: `travel-region-detail:${region.id}`,
        travelRegionId: region.id,
        name: region.displayName,
        intro: "这里适合把海边散步、拍照和轻餐安排在一起。",
        playStyle: "海边慢行 / 拍照",
        suggestedRoute: null,
        representativePlaces: [],
        suitableFor: ["海边", "拍照"],
        crowdLevel: null,
        sourceSummary: [
          {
            provider: "wanderly_curated",
            fieldName: "area_detail",
            confidence: 0.55,
            fetchedAt: "2026-09-30T00:00:00.000Z",
          },
        ],
        missingFields: [
          {
            fieldName: "suggestedRoute",
            reason: "not_returned",
            severity: "warning",
            message: "suggestedRoute 资料暂缺 / 待核验。",
            provider: "wanderly_curated",
          },
        ],
        lastVerifiedAt: "2026-09-30T00:00:00.000Z",
      },
      missingFields: [
        {
          fieldName: "suggestedRoute",
          reason: "not_returned",
          severity: "warning",
          message: "suggestedRoute 资料暂缺 / 待核验。",
          provider: "wanderly_curated",
        },
      ],
    };

    const markup = renderToStaticMarkup(
      <MapStudioLeftPanel
        mapProject={project}
        tripRequest={tripRequest}
        selectedRegion={region}
        regionDetailState={regionDetailState}
        placeDetailState={{ status: "idle", missingFields: [] }}
        visibleRegionPlaces={regionPlaces}
        onPlaceSelect={vi.fn()}
        onAddCandidate={vi.fn()}
        onClearSelection={vi.fn()}
      />,
    );

    expect(markup).toContain("区域详情");
    expect(markup).toContain("海边慢行 / 拍照");
    expect(markup).toContain("资料暂缺 / 待核验");
    expect(markup).toContain("Wanderly curated");
    expect(markup).not.toContain("地点详情</p>");
  });
});
