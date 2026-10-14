import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createDataHubService, type DataHubRepository } from "../../src/server/data-hub/dataHubService";
import { getDataHubEnv, getDataHubEnvStatus } from "../../src/server/data-hub/env";
import { BaseDataHubProvider, buildSourceSummary, createMissingFieldNotice, type DataHubProviderAdapter } from "../../src/server/data-hub/providers/providerTypes";
import type { NormalizedPlace, NormalizedPlaceDetail, PlaceRecord, RouteCacheRecord, RouteMode } from "../../src/server/data-hub/types";
import { createDataHubRouteEstimatePostHandler } from "../../app/api/data-hub/routes/estimate/route";

class MemoryRepository implements DataHubRepository {
  places = new Map<string, PlaceRecord>();
  route: RouteCacheRecord | null = null;
  writtenDetails: NormalizedPlaceDetail[] = [];
  writtenFacts: NormalizedPlaceDetail[] = [];

  async findPlacesByQuery(): Promise<PlaceRecord[]> {
    return [];
  }

  async getPlaceBundle(placeId: string) {
    const place = this.places.get(placeId);
    return place ? { place, detail: null, sources: [] } : null;
  }

  async getPlace(placeId: string) {
    return this.places.get(placeId) ?? null;
  }

  async upsertPlacesFromNormalized(_places: NormalizedPlace[]) {
    return [];
  }

  async upsertPlaceDetail(detail: NormalizedPlaceDetail) {
    this.writtenDetails.push(detail);
  }

  async upsertPlaceFactsFromDetail(detail: NormalizedPlaceDetail) {
    this.writtenFacts.push(detail);
  }

  async insertPlaceSources() {}

  async getRouteCache(_originPlaceId: string, _destinationPlaceId: string, _mode: RouteMode) {
    return this.route;
  }

  async upsertRouteCache() {}
}

function createRegistry(providers: DataHubProviderAdapter[]) {
  return {
    providers,
    byId(id: string) {
      return providers.find((provider) => provider.id === id) ?? null;
    },
    supporting(capability: keyof DataHubProviderAdapter["capabilities"]) {
      return providers.filter((provider) => provider.capabilities[capability]);
    },
  };
}

function makePlace(id: string): PlaceRecord {
  return {
    id,
    destination_id: null,
    region_id: null,
    name: id === "origin" ? "起点" : "终点",
    name_en: null,
    lat: id === "missing" ? null : 22.5,
    lng: id === "missing" ? null : 114.0,
    address: null,
    category: "attraction",
    tags: [],
    source_provider: "wanderly_curated",
    source_external_id: id,
    status: "active",
    created_at: "2026-09-30T00:00:00.000Z",
    updated_at: "2026-09-30T00:00:00.000Z",
  };
}

describe("data hub provider skeleton", () => {
  it("unsupported 能力返回明确 unsupported，而不是抛错", async () => {
    class DummyProvider extends BaseDataHubProvider {
      id = "dummy";
      displayName = "Dummy";
    }

    const result = await new DummyProvider().searchPlaces({ query: "深圳湾" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("unsupported");
      expect(result.missingFields[0]?.reason).toBe("not_applicable");
    }
  });

  it("server env 读取兼容 Google / Wikimedia / OSM alias", () => {
    const env = getDataHubEnv({
      GOOGLE_PLACES_API_KEY: "google-secret-value",
      WIKIDATA_SPARQL_ENDPOINT: "https://query.wikidata.org/sparql",
      OSM_USER_AGENT: "WanderlyTest/1.0",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-secret-value",
    });
    const status = getDataHubEnvStatus({
      GOOGLE_PLACES_API_KEY: "google-secret-value",
      WIKIDATA_SPARQL_ENDPOINT: "https://query.wikidata.org/sparql",
      OSM_USER_AGENT: "WanderlyTest/1.0",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-secret-value",
    });

    expect(env.googleMapsApiKey).toBe("google-secret-value");
    expect(env.wikidataSparqlUrl).toBe("https://query.wikidata.org/sparql");
    expect(env.osmUserAgent).toBe("WanderlyTest/1.0");
    expect(status.googleConfigured).toBe(true);
    expect(status.wikimediaConfigured).toBe(true);
    expect(status.osmConfigured).toBe(true);
    expect(status.supabaseServiceConfigured).toBe(true);
  });
});

describe("dataHubService minimal loop", () => {
  it("无地点数据时返回 missingFields，不静默失败", async () => {
    const service = createDataHubService({ repository: new MemoryRepository(), registry: createRegistry([]) });

    const result = await service.getOrEnrichPlaceDetails("missing-place-id");

    expect(result.detail).toBeNull();
    expect(result.missingFields[0]?.fieldName).toBe("place");
    expect(result.missingFields[0]?.severity).toBe("blocking");
  });

  it("normalized place detail 不包含 raw key 或 raw provider response", async () => {
    const repository = new MemoryRepository();
    repository.places.set("origin", makePlace("origin"));
    const source = buildSourceSummary({ provider: "wanderly_curated", fieldName: "intro", confidence: 0.9, fetchedAt: "2026-09-30T00:00:00.000Z" });
    class TestProvider extends BaseDataHubProvider {
      id = "test_provider";
      displayName = "Test Provider";
      capabilities = { getPlaceDetails: true };

      async getPlaceDetails() {
        return {
          ok: true,
          provider: "test_provider",
          data: {
            place: {
              id: "origin",
              name: "起点",
              lat: 22.5,
              lng: 114,
              tags: [],
              status: "active",
              source,
              confidence: 0.9,
              lastVerifiedAt: source.lastVerifiedAt ?? null,
              missingFields: [],
            },
            intro: "可信简介。",
            imageUrls: [],
            sources: [source],
            confidence: 0.9,
            lastVerifiedAt: source.lastVerifiedAt ?? null,
            missingFields: [createMissingFieldNotice({ fieldName: "openingHours", reason: "not_returned", message: "开放时间暂缺。" })],
          },
          sources: [source],
          missingFields: [],
        };
      }
    }
    const provider: DataHubProviderAdapter = new TestProvider();
    const service = createDataHubService({ repository, registry: createRegistry([provider]) });

    const result = await service.getOrEnrichPlaceDetails("origin");
    const serialized = JSON.stringify(result);

    expect(result.detail?.intro).toBe("可信简介。");
    expect(repository.writtenFacts[0]?.intro).toBe("可信简介。");
    expect(serialized).not.toContain("AMAP_API_KEY");
    expect(serialized).not.toContain("GOOGLE_MAPS_API_KEY");
    expect(serialized).not.toContain("raw_snapshot");
    expect(serialized).not.toContain("raw_json");
  });

  it("route cache 类型能转换为 NormalizedRouteEstimate", async () => {
    const repository = new MemoryRepository();
    repository.route = {
      id: "route-1",
      origin_place_id: "origin",
      destination_place_id: "destination",
      mode: "walking",
      distance_meters: 1200,
      duration_seconds: 900,
      provider: "amap",
      raw_json: { hidden: "not returned" },
      fetched_at: "2026-09-30T00:00:00.000Z",
      expires_at: "2999-01-01T00:00:00.000Z",
    };
    const service = createDataHubService({ repository, registry: createRegistry([]) });

    const result = await service.getRouteEstimate("origin", "destination", "walking");

    expect(result.route?.mode).toBe("walking");
    expect(result.route?.distanceMeters).toBe(1200);
    expect(result.route?.durationSeconds).toBe(900);
    expect(JSON.stringify(result)).not.toContain("raw_json");
  });
});

describe("data hub API routes", () => {
  it("route estimate API 不输出 secret", async () => {
    const repository = new MemoryRepository();
    repository.route = {
      id: "route-1",
      origin_place_id: "origin",
      destination_place_id: "destination",
      mode: "walking",
      distance_meters: 500,
      duration_seconds: 360,
      provider: "amap",
      raw_json: { key: "SECRET_SHOULD_NOT_LEAK" },
      fetched_at: "2026-09-30T00:00:00.000Z",
      expires_at: "2999-01-01T00:00:00.000Z",
    };
    const handler = createDataHubRouteEstimatePostHandler(() => createDataHubService({ repository, registry: createRegistry([]) }));
    const response = await handler(
      new Request("http://localhost/api/data-hub/routes/estimate", {
        method: "POST",
        body: JSON.stringify({ originPlaceId: "origin", destinationPlaceId: "destination", mode: "walking" }),
      }),
    );
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).not.toContain("SECRET_SHOULD_NOT_LEAK");
    expect(text).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
});
