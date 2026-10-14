import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createAdminBoundariesGetHandler } from "../../../app/api/data-hub/admin-boundaries/route";

const result = {
  parentAdcode: "440000",
  level: "prefecture",
  count: 1,
  features: [
    {
      adcode: "440100",
      name: "广州市",
      level: "prefecture",
      adminType: "prefecture_city",
      parentAdcode: "440000",
      provinceAdcode: "440000",
      prefectureAdcode: "440100",
      center: [113.2644, 23.1291],
      labelPoint: [113.28, 23.13],
      bbox: [112.95, 22.55, 114.05, 23.95],
      geometry: { type: "MultiPolygon", coordinates: [] },
      source: "official_surveyed_geojson_2025",
      sourceUpdatedAt: "2025-01-01T00:00:00.000Z",
      confidence: null,
    },
  ],
  sourceSummary: {
    sources: ["official_surveyed_geojson_2025"],
    missingGeometry: 0,
    generatedAt: "2026-10-07T00:00:00.000Z",
  },
};

describe("admin boundaries API", () => {
  it("returns normalized boundaries and does not leak secrets or raw payloads", async () => {
    const getAdminBoundaries = vi.fn().mockResolvedValue(result);
    const handler = createAdminBoundariesGetHandler(() => ({ getAdminBoundaries } as never));

    const response = await handler(
      new Request("http://localhost/api/data-hub/admin-boundaries?parentAdcode=440000&level=prefecture"),
    );
    const data = await response.json();
    const text = JSON.stringify(data);

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.count).toBe(1);
    expect(data.features[0].adminType).toBe("prefecture_city");
    expect(data.features[0].parent_adcode).toBeUndefined();
    expect(getAdminBoundaries).toHaveBeenCalledWith({
      parentAdcode: "440000",
      level: "prefecture",
      bbox: undefined,
      includeGeometry: true,
    });
    expect(text).not.toContain("raw_payload");
    expect(text).not.toContain("raw_json");
    expect(text).not.toContain("service_role");
    expect(text).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("passes includeGeometry=false through to the service", async () => {
    const getAdminBoundaries = vi.fn().mockResolvedValue({
      ...result,
      features: result.features.map(({ geometry: _geometry, ...feature }) => feature),
    });
    const handler = createAdminBoundariesGetHandler(() => ({ getAdminBoundaries } as never));

    const response = await handler(
      new Request("http://localhost/api/data-hub/admin-boundaries?parentAdcode=440000&level=prefecture&includeGeometry=false"),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.features[0]).not.toHaveProperty("geometry");
    expect(getAdminBoundaries).toHaveBeenCalledWith({
      parentAdcode: "440000",
      level: "prefecture",
      includeGeometry: false,
      bbox: undefined,
    });
  });

  it("passes bbox viewport queries through to the service", async () => {
    const getAdminBoundaries = vi.fn().mockResolvedValue({
      ...result,
      parentAdcode: null,
      bbox: [117.9, 24.3, 118.5, 24.9],
    });
    const handler = createAdminBoundariesGetHandler(() => ({ getAdminBoundaries } as never));

    const response = await handler(
      new Request("http://localhost/api/data-hub/admin-boundaries?level=county&bbox=117.9,24.3,118.5,24.9&includeGeometry=true"),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.parentAdcode).toBeNull();
    expect(getAdminBoundaries).toHaveBeenCalledWith({
      parentAdcode: undefined,
      level: "county",
      bbox: [117.9, 24.3, 118.5, 24.9],
      includeGeometry: true,
    });
  });

  it("returns 400 for invalid input", async () => {
    const handler = createAdminBoundariesGetHandler(() => ({ getAdminBoundaries: vi.fn() } as never));

    const response = await handler(
      new Request("http://localhost/api/data-hub/admin-boundaries?parentAdcode=44&level=city"),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.error.code).toBe("INVALID_INPUT");
  });

  it("returns 200 and count 0 for empty results", async () => {
    const handler = createAdminBoundariesGetHandler(() => ({
      getAdminBoundaries: vi.fn().mockResolvedValue({
        parentAdcode: "990000",
        level: "prefecture",
        count: 0,
        features: [],
        sourceSummary: {
          sources: [],
          missingGeometry: 0,
          generatedAt: "2026-10-07T00:00:00.000Z",
        },
      }),
    } as never));

    const response = await handler(
      new Request("http://localhost/api/data-hub/admin-boundaries?parentAdcode=990000&level=prefecture"),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.count).toBe(0);
    expect(data.features).toEqual([]);
  });
});
