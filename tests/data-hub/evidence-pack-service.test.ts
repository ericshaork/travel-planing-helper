import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { EvidencePackService } from "../../src/server/data-hub/evidencePackService";
import { createEvidencePackPostHandler } from "../../app/api/data-hub/evidence-pack/route";
import type { ProductPlaceProfile } from "../../src/server/data-hub/productDataHubService";

const now = "2026-10-06T02:21:00.000Z";

const profile: ProductPlaceProfile = {
  detail: {
    place: {
      id: "place-1",
      name: "深圳湾公园",
      lat: 22.5096,
      lng: 113.9442,
      address: "深圳市南山区滨海大道",
      category: "park",
      tags: ["海边"],
      status: "active",
      source: { provider: "amap", fieldName: "place", externalId: "amap:1", confidence: 0.78, fetchedAt: now, lastVerifiedAt: now },
      confidence: 0.78,
      lastVerifiedAt: now,
      missingFields: [],
    },
    intro: "适合散步。",
    openingHours: null,
    ticketInfo: null,
    imageUrls: [],
    sources: [
      { provider: "amap", fieldName: "place", externalId: "amap:1", confidence: 0.78, fetchedAt: now, lastVerifiedAt: now },
    ],
    confidence: 0.78,
    lastVerifiedAt: now,
    missingFields: [
      {
        fieldName: "openingHours",
        reason: "not_returned",
        severity: "warning",
        message: "开放时间暂缺。",
        provider: "data_hub",
      },
    ],
  },
  facts: [],
  weatherContext: [],
  routeContext: [],
  sourceSummary: [
    { provider: "amap", fieldName: "place", externalId: "amap:1", confidence: 0.78, fetchedAt: now, lastVerifiedAt: now },
  ],
  missingFields: [
    {
      fieldName: "openingHours",
      reason: "not_returned",
      severity: "warning",
      message: "开放时间暂缺。",
      provider: "data_hub",
    },
  ],
};

class FakeProductService {
  async getPlaceProfile(placeId: string) {
    return placeId === "place-1" ? profile : null;
  }

  async getPlaceProfileByExternalId() {
    return null;
  }

  async getWeatherContext() {
    return [
      {
        id: "weather-1",
        provider: "qweather",
        destinationId: null,
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
    ];
  }

  async getRouteContext() {
    return [];
  }
}

describe("EvidencePackService", () => {
  it("builds source-backed evidence pack without generating a plan", async () => {
    const service = new EvidencePackService(new FakeProductService() as never);
    const pack = await service.buildEvidencePack({
      destination: "深圳",
      selectedPlaces: [{ placeId: "place-1" }],
      candidatePlaces: [{ placeId: "missing-place", name: "未知地点" }],
      userPreferences: ["轻松"],
    });

    expect(pack.places).toHaveLength(1);
    expect(pack.sourceList.map((source) => source.provider)).toEqual(expect.arrayContaining(["amap", "qweather"]));
    expect(pack.missingFields.map((field) => field.fieldName)).toEqual(expect.arrayContaining(["openingHours", "place"]));
    expect(pack.freshness.lastVerifiedAt).toBe(now);
    expect(pack.confidence).toBeGreaterThan(0);
    expect(JSON.stringify(pack)).not.toContain("raw_snapshot");
    expect(JSON.stringify(pack)).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("evidence pack API route does not leak raw payload or secrets", async () => {
    const handler = createEvidencePackPostHandler(() => new EvidencePackService(new FakeProductService() as never));
    const response = await handler(new Request("http://localhost/api/data-hub/evidence-pack", {
      method: "POST",
      body: JSON.stringify({ selectedPlaces: [{ placeId: "place-1" }] }),
    }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.evidencePack.places[0].place.name).toBe("深圳湾公园");
    expect(JSON.stringify(data)).not.toContain("raw_snapshot");
    expect(JSON.stringify(data)).not.toContain("service_role");
    expect(JSON.stringify(data)).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
});
