import { describe, expect, it, vi } from "vitest";

import {
  AdminBoundaryClientError,
  fetchAdminBoundaries,
} from "../../../src/lib/data-hub/adminBoundaryClient";

describe("adminBoundaryClient", () => {
  it("fetches normalized admin boundaries from the product API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
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
          source: "reviewed_local_geojson_2025_admin_division",
          sourceUpdatedAt: "2025-01-01T00:00:00.000Z",
          confidence: null,
        },
      ],
      sourceSummary: {
        sources: ["reviewed_local_geojson_2025_admin_division"],
        missingGeometry: 0,
        generatedAt: "2026-10-07T00:00:00.000Z",
      },
    }), { status: 200 }));

    const result = await fetchAdminBoundaries({
      parentAdcode: "440000",
      level: "prefecture",
      includeGeometry: true,
    }, fetchMock as unknown as typeof fetch);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/data-hub/admin-boundaries?parentAdcode=440000&level=prefecture&includeGeometry=true",
      expect.objectContaining({ method: "GET" }),
    );
    expect(result.count).toBe(1);
    expect(result.features[0]?.adminType).toBe("prefecture_city");
  });

  it("fetches viewport bbox admin boundaries without parentAdcode", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      parentAdcode: null,
      level: "county",
      bbox: [117.9, 24.3, 118.5, 24.9],
      count: 1,
      features: [
        {
          adcode: "350203",
          name: "思明区",
          level: "county",
          adminType: "district",
          parentAdcode: "350200",
          provinceAdcode: "350000",
          prefectureAdcode: "350200",
          center: [118.08, 24.45],
          labelPoint: [118.08, 24.45],
          bbox: [118.0, 24.4, 118.2, 24.55],
          geometry: { type: "MultiPolygon", coordinates: [] },
          source: "reviewed_local_geojson_2025_admin_division",
          sourceUpdatedAt: "2025-01-01T00:00:00.000Z",
          confidence: null,
        },
      ],
      sourceSummary: {
        sources: ["reviewed_local_geojson_2025_admin_division"],
        missingGeometry: 0,
        generatedAt: "2026-10-07T00:00:00.000Z",
      },
    }), { status: 200 }));

    const result = await fetchAdminBoundaries({
      level: "county",
      bbox: [117.9, 24.3, 118.5, 24.9],
      includeGeometry: true,
    }, fetchMock as unknown as typeof fetch);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/data-hub/admin-boundaries?level=county&bbox=117.9%2C24.3%2C118.5%2C24.9&includeGeometry=true",
      expect.objectContaining({ method: "GET" }),
    );
    expect(result.parentAdcode).toBeNull();
    expect(result.bbox).toEqual([117.9, 24.3, 118.5, 24.9]);
    expect(result.features[0]?.parentAdcode).toBe("350200");
  });

  it("throws a clear error for invalid API responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: false,
      error: { code: "INVALID_INPUT", message: "参数不正确。" },
    }), { status: 400 }));

    await expect(fetchAdminBoundaries({
      parentAdcode: "44",
      level: "prefecture",
    }, fetchMock as unknown as typeof fetch)).rejects.toMatchObject({
      code: "INVALID_INPUT",
      status: 400,
    });
  });

  it("guards against secret and raw payload leakage", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      parentAdcode: "440000",
      level: "prefecture",
      count: 1,
      features: [
        {
          adcode: "440100",
          name: "service_role leaked",
          level: "prefecture",
          adminType: null,
          parentAdcode: "440000",
          provinceAdcode: "440000",
          prefectureAdcode: "440100",
          center: null,
          labelPoint: null,
          bbox: null,
          source: null,
          sourceUpdatedAt: null,
          confidence: null,
        },
      ],
      sourceSummary: {
        sources: [],
        missingGeometry: 0,
        generatedAt: "2026-10-07T00:00:00.000Z",
      },
    }), { status: 200 }));

    await expect(fetchAdminBoundaries({
      parentAdcode: "440000",
      level: "prefecture",
    }, fetchMock as unknown as typeof fetch)).rejects.toBeInstanceOf(AdminBoundaryClientError);
  });
});
