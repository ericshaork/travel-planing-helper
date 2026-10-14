import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createDataHubPlaceDetailGetHandler } from "../../app/api/data-hub/places/[id]/route";

const profile = {
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
      source: { provider: "amap", fieldName: "place", externalId: "amap:1", confidence: 0.78, fetchedAt: "2026-10-06T00:00:00.000Z" },
      confidence: 0.78,
      lastVerifiedAt: "2026-10-06T00:00:00.000Z",
      missingFields: [],
    },
    intro: "适合海边散步。",
    imageUrls: [],
    sources: [{ provider: "amap", fieldName: "place", externalId: "amap:1", confidence: 0.78, fetchedAt: "2026-10-06T00:00:00.000Z" }],
    confidence: 0.78,
    lastVerifiedAt: "2026-10-06T00:00:00.000Z",
    missingFields: [],
  },
  facts: [],
  weatherContext: [],
  routeContext: [],
  sourceSummary: [{ provider: "amap", fieldName: "place", externalId: "amap:1", confidence: 0.78, fetchedAt: "2026-10-06T00:00:00.000Z" }],
  missingFields: [],
};

describe("product Data Hub profile API", () => {
  it("returns normalized profile and does not leak raw payload or service role", async () => {
    const handler = createDataHubPlaceDetailGetHandler(() => ({
      getPlaceProfile: vi.fn().mockResolvedValue(profile),
    } as never));

    const response = await handler(
      new Request("http://localhost/api/data-hub/places/place-1"),
      { params: Promise.resolve({ id: "place-1" }) },
    );
    const data = await response.json();
    const text = JSON.stringify(data);

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.detail.place.name).toBe("深圳湾公园");
    expect(data.sources[0].provider).toBe("amap");
    expect(text).not.toContain("raw_snapshot");
    expect(text).not.toContain("raw_payload");
    expect(text).not.toContain("service_role");
    expect(text).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("uses not_found when normalized place does not exist", async () => {
    const handler = createDataHubPlaceDetailGetHandler(() => ({
      getPlaceProfile: vi.fn().mockResolvedValue(null),
    } as never));

    const response = await handler(
      new Request("http://localhost/api/data-hub/places/missing"),
      { params: Promise.resolve({ id: "missing" }) },
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error.code).toBe("not_found");
  });
});
