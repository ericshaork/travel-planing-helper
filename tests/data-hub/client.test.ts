import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildEvidencePack,
  enrichPlace,
  getPlaceDetail,
  planBasicRoute,
} from "../../src/lib/data-hub/client";

describe("frontend DataHub client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("已有 place_id 的地点只通过内部详情 API 读取", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          detail: null,
          missingFields: [],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await getPlaceDetail("place/with spaces");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/data-hub/places/place%2Fwith%20spaces",
      expect.objectContaining({
        method: "GET",
        headers: { Accept: "application/json" },
      }),
    );
  });

  it("seed/mock 推荐地点通过内部 enrich API 转换，不在前端触碰 provider key", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          detail: null,
          missingFields: [],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await enrichPlace({
      name: "深圳湾公园",
      lat: 22.5102,
      lng: 113.9464,
      category: "nature",
      sourceProvider: "wanderly_curated",
      sourceExternalId: "seed-shenzhen-bay",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/data-hub/places/enrich",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Accept: "application/json",
          "Content-Type": "application/json",
        }),
      }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(body).toMatchObject({
      name: "深圳湾公园",
      lat: 22.5102,
      lng: 113.9464,
      sourceProvider: "wanderly_curated",
      sourceExternalId: "seed-shenzhen-bay",
    });
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain("AMAP_API_KEY");
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain("GOOGLE_MAPS_API_KEY");
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("基础路线规划通过内部 planning API，不触碰 provider key", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          draft: {
            days: [],
            unresolved: [],
            evidence: [],
            missingFields: [],
            warnings: [],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await planBasicRoute({
      destinationId: "dest-shenzhen",
      dayCount: 1,
      candidatePlaceIds: ["place-1", "place-2"],
      pace: "balanced",
      transportMode: "walking",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/data-hub/planning/basic-route",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Accept: "application/json",
          "Content-Type": "application/json",
        }),
      }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(body).toMatchObject({
      destinationId: "dest-shenzhen",
      dayCount: 1,
      candidatePlaceIds: ["place-1", "place-2"],
      pace: "balanced",
      transportMode: "walking",
    });
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain("AMAP_API_KEY");
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("AI evidence pack 只通过内部证据 API，不生成最终行程", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          evidencePack: {
            places: [],
            weatherContext: [],
            routeEstimates: [],
            sourceList: [],
            missingFields: [],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await buildEvidencePack({
      destination: "深圳",
      selectedPlaces: [{ placeId: "place-1" }],
      userPreferences: ["轻松"],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/data-hub/evidence-pack",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Accept: "application/json",
          "Content-Type": "application/json",
        }),
      }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(body).toMatchObject({
      destination: "深圳",
      selectedPlaces: [{ placeId: "place-1" }],
      userPreferences: ["轻松"],
    });
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain("AMAP_API_KEY");
  });
});
