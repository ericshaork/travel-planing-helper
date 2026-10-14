import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  ProductDataHubService,
  stripUnsafeProductData,
  type ProductDataHubRepository,
} from "../../src/server/data-hub/productDataHubService";
import type {
  NormalizedPlaceFact,
  NormalizedWeatherSnapshot,
  PlaceDetailRecord,
  PlaceRecord,
  PlaceSourceRecord,
} from "../../src/server/data-hub/types";

const now = "2026-10-06T02:21:00.000Z";

const place: PlaceRecord = {
  id: "place-shenzhen-bay",
  destination_id: "dest-shenzhen",
  region_id: "region-bay",
  name: "深圳湾公园",
  name_en: null,
  lat: 22.5096,
  lng: 113.9442,
  address: "深圳市南山区滨海大道",
  category: "park",
  tags: ["海边"],
  source_provider: "amap",
  source_external_id: "amap:shenzhen-bay-park",
  status: "active",
  created_at: now,
  updated_at: now,
};

const detail: PlaceDetailRecord = {
  id: "detail-1",
  place_id: place.id,
  intro: null,
  opening_hours: null,
  ticket_info: null,
  phone: null,
  website: null,
  recommended_duration_minutes: null,
  crowd_level: null,
  best_time_to_visit: null,
  tips: null,
  image_urls: [],
  source_summary: {},
  last_verified_at: null,
  created_at: now,
  updated_at: now,
};

function fact(input: Partial<NormalizedPlaceFact> & Pick<NormalizedPlaceFact, "factType" | "value" | "source">): NormalizedPlaceFact {
  return {
    id: `fact-${input.factType}`,
    placeId: place.id,
    text: null,
    language: null,
    confidence: 0.7,
    verificationStatus: "unverified",
    fetchedAt: now,
    lastVerifiedAt: now,
    expiresAt: null,
    missingFields: [],
    metadata: {},
    ...input,
  };
}

class FakeRepository implements ProductDataHubRepository {
  async getPlace(placeId: string) {
    return placeId === place.id ? place : null;
  }

  async getPlaceByExternalId(provider: string, externalId: string) {
    return provider === "amap" && externalId === "amap:shenzhen-bay-park" ? place : null;
  }

  async getPlaceDetail() {
    return detail;
  }

  async getPlaceSources(): Promise<PlaceSourceRecord[]> {
    return [
      {
        id: "source-1",
        place_id: place.id,
        field_name: "intro",
        provider: "wikipedia",
        source_url: "https://example.test/wiki",
        raw_external_id: "wikipedia:深圳湾公园",
        confidence: 0.58,
        fetched_at: now,
        expires_at: null,
        raw_snapshot: null,
      },
    ];
  }
}

class FakeReadService {
  async getPlaceFacts() {
    return [
      fact({
        factType: "intro",
        text: "深圳湾公园适合海边散步。",
        value: { text: "深圳湾公园适合海边散步。" },
        source: { provider: "wikipedia", fieldName: "intro", confidence: 0.58, fetchedAt: now, lastVerifiedAt: now },
      }),
      fact({
        factType: "address",
        text: "深圳市南山区滨海大道",
        value: { address: "深圳市南山区滨海大道" },
        source: { provider: "amap", fieldName: "address", confidence: 0.78, fetchedAt: now, lastVerifiedAt: now },
      }),
    ] satisfies NormalizedPlaceFact[];
  }

  async getWeather() {
    return [
      {
        id: "weather-1",
        provider: "qweather",
        destinationId: "dest-shenzhen",
        adminAreaId: null,
        placeId: null,
        lat: 22.54,
        lng: 114.05,
        snapshotType: "forecast",
        observedAt: null,
        forecastStartAt: now,
        forecastEndAt: now,
        temperatureC: null,
        feelsLikeC: null,
        conditionText: "sample-weather",
        precipitationProbability: null,
        windText: null,
        humidity: null,
        airQuality: { aqi: null },
        uv: { index: null },
        warning: { level: null, title: null },
        value: { sample: true },
        source: { provider: "qweather", fieldName: "weather", confidence: 0.55, fetchedAt: now, lastVerifiedAt: now },
        confidence: 0.55,
        fetchedAt: now,
        expiresAt: null,
        missingFields: [],
      },
    ] satisfies NormalizedWeatherSnapshot[];
  }

  async getRouteCache() {
    return [];
  }
}

describe("ProductDataHubService", () => {
  it("aggregates normalized facts into product-facing place profile DTO", async () => {
    const service = new ProductDataHubService(new FakeRepository(), new FakeReadService() as never);
    const profile = await service.getPlaceProfile(place.id);

    expect(profile?.detail.place.name).toBe("深圳湾公园");
    expect(profile?.detail.intro).toContain("海边散步");
    expect(profile?.detail.sources.map((source) => source.provider)).toEqual(
      expect.arrayContaining(["amap", "wikipedia"]),
    );
    expect(profile?.detail.missingFields.map((field) => field.fieldName)).toEqual(
      expect.arrayContaining(["openingHours", "ticketInfo", "imageUrls"]),
    );
    expect(profile?.detail.confidence).toBeGreaterThan(0);
    expect(profile?.detail.lastVerifiedAt).toBe(now);
    expect(profile?.weatherContext[0]?.provider).toBe("qweather");
    expect(() => stripUnsafeProductData(profile)).not.toThrow();
  });

  it("can resolve profile by provider external id", async () => {
    const service = new ProductDataHubService(new FakeRepository(), new FakeReadService() as never);
    const profile = await service.getPlaceProfileByExternalId("amap", "amap:shenzhen-bay-park");
    expect(profile?.detail.place.id).toBe(place.id);
  });
});
