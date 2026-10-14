import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createBasicRoutePlanningPostHandler } from "../../app/api/data-hub/planning/basic-route/route";
import { createDataHubService, type DataHubRepository } from "../../src/server/data-hub/dataHubService";
import { BaseDataHubProvider, buildSourceSummary, type DataHubProviderAdapter } from "../../src/server/data-hub/providers/providerTypes";
import type {
  DataSourceSummary,
  NormalizedPlace,
  NormalizedRouteEstimate,
  PlaceDetailRecord,
  PlaceRecord,
  PlaceSourceRecord,
  RouteCacheRecord,
  RouteMode,
} from "../../src/server/data-hub/types";
import { buildBasicRouteDraft } from "../../src/server/planning/basicRoutePlanner";

class MemoryRepository implements DataHubRepository {
  places = new Map<string, PlaceRecord>();
  details = new Map<string, PlaceDetailRecord>();
  sources = new Map<string, PlaceSourceRecord[]>();
  routes = new Map<string, RouteCacheRecord>();

  async findPlacesByQuery(): Promise<PlaceRecord[]> {
    return [];
  }

  async getPlaceBundle(placeId: string) {
    const place = this.places.get(placeId);
    if (!place) return null;
    return {
      place,
      detail: this.details.get(placeId) ?? null,
      sources: this.sources.get(placeId) ?? [],
    };
  }

  async getPlace(placeId: string) {
    return this.places.get(placeId) ?? null;
  }

  async upsertPlacesFromNormalized(_places: NormalizedPlace[]) {
    return [];
  }

  async upsertPlaceDetail() {}

  async insertPlaceSources() {}

  async getRouteCache(originPlaceId: string, destinationPlaceId: string, mode: RouteMode) {
    return this.routes.get(`${originPlaceId}:${destinationPlaceId}:${mode}`) ?? null;
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

function makePlace(input: {
  id: string;
  name: string;
  lat?: number | null;
  lng?: number | null;
  regionId?: string | null;
  category?: string;
}): PlaceRecord {
  return {
    id: input.id,
    destination_id: "dest-shenzhen",
    region_id: input.regionId ?? "region-a",
    name: input.name,
    name_en: null,
    lat: input.lat === undefined ? 22.5 : input.lat,
    lng: input.lng === undefined ? 114 : input.lng,
    address: null,
    category: input.category ?? "attraction",
    tags: [],
    source_provider: "wanderly_curated",
    source_external_id: input.id,
    status: "active",
    created_at: "2026-09-30T00:00:00.000Z",
    updated_at: "2026-09-30T00:00:00.000Z",
  };
}

function makeDetail(placeId: string, overrides: Partial<PlaceDetailRecord> = {}): PlaceDetailRecord {
  return {
    id: `detail-${placeId}`,
    place_id: placeId,
    intro: `${placeId} intro`,
    opening_hours: null,
    ticket_info: null,
    phone: null,
    website: null,
    recommended_duration_minutes: 80,
    crowd_level: null,
    best_time_to_visit: null,
    tips: null,
    image_urls: [],
    source_summary: {},
    last_verified_at: "2026-09-30T00:00:00.000Z",
    created_at: "2026-09-30T00:00:00.000Z",
    updated_at: "2026-09-30T00:00:00.000Z",
    ...overrides,
  };
}

function makeSource(placeId: string): PlaceSourceRecord {
  return {
    id: `source-${placeId}`,
    place_id: placeId,
    field_name: "base",
    provider: "wanderly_curated",
    source_url: null,
    raw_external_id: placeId,
    confidence: 0.8,
    fetched_at: "2026-09-30T00:00:00.000Z",
    expires_at: null,
    raw_snapshot: { shouldNotLeak: true },
  };
}

function seedRepository(ids = ["p1", "p2", "p3"]): MemoryRepository {
  const repository = new MemoryRepository();
  ids.forEach((id, index) => {
    repository.places.set(id, makePlace({ id, name: `地点${index + 1}`, regionId: index < 2 ? "region-a" : "region-b", lat: 22.5 + index * 0.01, lng: 114 + index * 0.01 }));
    repository.details.set(id, makeDetail(id));
    repository.sources.set(id, [makeSource(id)]);
  });
  return repository;
}

class CountingRouteProvider extends BaseDataHubProvider {
  id = "route-provider";
  displayName = "Route Provider";
  capabilities = { getRouteEstimate: true };
  calls = 0;

  async getRouteEstimate(): Promise<ReturnType<DataHubProviderAdapter["getRouteEstimate"]>> {
    this.calls += 1;
    const source: DataSourceSummary = buildSourceSummary({ provider: this.id, fieldName: "route", confidence: 0.6, fetchedAt: "2026-09-30T00:00:00.000Z" });
    return {
      ok: true,
      provider: this.id,
      data: {
        originPlaceId: "p1",
        destinationPlaceId: "p2",
        mode: "walking",
        distanceMeters: 1000,
        durationSeconds: 900,
        provider: this.id,
        source,
        confidence: 0.6,
        lastVerifiedAt: source.lastVerifiedAt ?? null,
        missingFields: [],
      } satisfies NormalizedRouteEstimate,
      sources: [source],
      missingFields: [],
    };
  }
}

describe("basicRoutePlanner", () => {
  it("候选地点可生成 basic route draft", async () => {
    const repository = seedRepository(["p1", "p2", "p3"]);
    const provider = new CountingRouteProvider();
    const dataHubService = createDataHubService({ repository, registry: createRegistry([provider]) });

    const draft = await buildBasicRouteDraft({
      destinationId: "dest-shenzhen",
      dayCount: 1,
      candidatePlaceIds: ["p1", "p2", "p3"],
      pace: "balanced",
      transportMode: "walking",
    }, { dataHubService });

    expect(draft.days).toHaveLength(1);
    expect(draft.days[0]?.slots.map((slot) => slot.name)).toHaveLength(3);
    expect(draft.evidence).toHaveLength(3);
  });

  it("坐标缺失的地点进入 unresolved，不参与路线计算", async () => {
    const repository = seedRepository(["p1", "missing"]);
    repository.places.set("missing", makePlace({ id: "missing", name: "无坐标地点", lat: null, lng: null }));
    repository.details.set("missing", makeDetail("missing"));
    const dataHubService = createDataHubService({ repository, registry: createRegistry([]) });

    const draft = await buildBasicRouteDraft({
      dayCount: 1,
      candidatePlaceIds: ["p1", "missing"],
      pace: "balanced",
      transportMode: "walking",
    }, { dataHubService });

    expect(draft.days[0]?.slots.map((slot) => slot.placeId)).toEqual(["p1"]);
    expect(draft.unresolved[0]).toMatchObject({
      placeId: "missing",
      reason: "缺少坐标",
    });
  });

  it("openingHours/ticketInfo 缺失会产生 warning，但不阻止规划", async () => {
    const repository = seedRepository(["p1"]);
    const dataHubService = createDataHubService({ repository, registry: createRegistry([]) });

    const draft = await buildBasicRouteDraft({
      dayCount: 1,
      candidatePlaceIds: ["p1"],
      pace: "relaxed",
      transportMode: "walking",
    }, { dataHubService });

    expect(draft.days[0]?.slots).toHaveLength(1);
    expect(draft.days[0]?.feasibilityWarnings.join(" ")).toContain("开放时间暂缺");
    expect(draft.days[0]?.feasibilityWarnings.join(" ")).toContain("门票/预约信息暂缺");
  });

  it("relaxed / balanced / intense 每天容量不同", async () => {
    const ids = Array.from({ length: 7 }, (_, index) => `p${index + 1}`);
    const repository = seedRepository(ids);
    const dataHubService = createDataHubService({ repository, registry: createRegistry([]) });

    const relaxed = await buildBasicRouteDraft({ dayCount: 1, candidatePlaceIds: ids, pace: "relaxed", transportMode: "walking" }, { dataHubService });
    const balanced = await buildBasicRouteDraft({ dayCount: 1, candidatePlaceIds: ids, pace: "balanced", transportMode: "walking" }, { dataHubService });
    const intense = await buildBasicRouteDraft({ dayCount: 1, candidatePlaceIds: ids, pace: "intense", transportMode: "walking" }, { dataHubService });

    expect(relaxed.days[0]?.slots).toHaveLength(3);
    expect(balanced.days[0]?.slots).toHaveLength(5);
    expect(intense.days[0]?.slots).toHaveLength(7);
  });

  it("route cache 命中时不重复调用 provider", async () => {
    const repository = seedRepository(["p1", "p2"]);
    repository.routes.set("p1:p2:walking", {
      id: "route-cache-1",
      origin_place_id: "p1",
      destination_place_id: "p2",
      mode: "walking",
      distance_meters: 900,
      duration_seconds: 600,
      provider: "amap",
      raw_json: { secret: "hidden" },
      fetched_at: "2026-09-30T00:00:00.000Z",
      expires_at: "2999-01-01T00:00:00.000Z",
    });
    const provider = new CountingRouteProvider();
    const dataHubService = createDataHubService({ repository, registry: createRegistry([provider]) });

    const draft = await buildBasicRouteDraft({ dayCount: 1, candidatePlaceIds: ["p1", "p2"], pace: "balanced", transportMode: "walking" }, { dataHubService });

    expect(provider.calls).toBe(0);
    expect(draft.days[0]?.slots[1]?.routeFromPrevious).toMatchObject({
      durationSeconds: 600,
      provider: "amap",
    });
  });
});

describe("basic route planning API", () => {
  it("API route 不输出 raw_json 或 API key", async () => {
    const handler = createBasicRoutePlanningPostHandler(async () => ({
      days: [],
      unresolved: [],
      evidence: [],
      missingFields: [],
      warnings: ["候选地点不足"],
    }));

    const response = await handler(new Request("http://localhost/api/data-hub/planning/basic-route", {
      method: "POST",
      body: JSON.stringify({ dayCount: 1, candidatePlaceIds: [], pace: "balanced", transportMode: "walking" }),
    }));
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).not.toContain("raw_json");
    expect(text).not.toContain("AMAP_API_KEY");
    expect(text).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
});

