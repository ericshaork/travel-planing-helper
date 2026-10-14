import { describe, expect, it, vi } from "vitest";

import {
  AdminBoundaryService,
  type AdminBoundaryRepository,
  type AdminRegionBoundaryRow,
} from "../../../src/server/data-hub/admin/adminBoundaryService";

const guangdongRows: AdminRegionBoundaryRow[] = [
  {
    adcode: "440100",
    name: "广州市",
    level: "prefecture",
    admin_type: "prefecture_city",
    parent_adcode: "440000",
    province_adcode: "440000",
    prefecture_adcode: "440100",
    center_lng: 113.2644,
    center_lat: 23.1291,
    label_lng: 113.28,
    label_lat: 23.13,
    bbox_min_lng: 112.95,
    bbox_min_lat: 22.55,
    bbox_max_lng: 114.05,
    bbox_max_lat: 23.95,
    boundary: {
      type: "MultiPolygon",
      crs: { type: "name", properties: { name: "EPSG:4326" } },
      coordinates: [[[[113, 23], [114, 23], [114, 24], [113, 23]]]],
    },
    source: "official_surveyed_geojson_2025",
    source_updated_at: "2025-01-01T00:00:00.000Z",
    metadata: { confidence: 0.94, raw_json: { should: "not leak" } },
  },
  {
    adcode: "440300",
    name: "深圳市",
    level: "prefecture",
    admin_type: "prefecture_city",
    parent_adcode: "440000",
    province_adcode: "440000",
    prefecture_adcode: "440300",
    center_lng: 114.0579,
    center_lat: 22.5431,
    label_lng: 114.06,
    label_lat: 22.55,
    bbox_min_lng: 113.75,
    bbox_min_lat: 22.39,
    bbox_max_lng: 114.65,
    bbox_max_lat: 22.87,
    boundary: {
      type: "MultiPolygon",
      coordinates: [[[[114, 22], [115, 22], [115, 23], [114, 22]]]],
    },
    source: "official_surveyed_geojson_2025",
    source_updated_at: "2025-01-01T00:00:00.000Z",
    metadata: {},
  },
];

function createRepository(rows: AdminRegionBoundaryRow[], missingGeometry = 0): AdminBoundaryRepository {
  return {
    async listChildren() {
      return rows;
    },
    async countMissingGeometry() {
      return missingGeometry;
    },
  };
}

describe("AdminBoundaryService", () => {
  it("returns normalized admin boundary features with camelCase fields", async () => {
    const service = new AdminBoundaryService(createRepository(guangdongRows));
    const result = await service.getAdminBoundaries({ parentAdcode: "440000", level: "prefecture" });

    expect(result.parentAdcode).toBe("440000");
    expect(result.level).toBe("prefecture");
    expect(result.count).toBe(2);
    expect(result.features[0]).toMatchObject({
      adcode: "440100",
      name: "广州市",
      adminType: "prefecture_city",
      parentAdcode: "440000",
      provinceAdcode: "440000",
      prefectureAdcode: "440100",
      center: [113.2644, 23.1291],
      labelPoint: [113.28, 23.13],
      bbox: [112.95, 22.55, 114.05, 23.95],
      geometry: {
        type: "MultiPolygon",
      },
      source: "official_surveyed_geojson_2025",
      sourceUpdatedAt: "2025-01-01T00:00:00.000Z",
      confidence: 0.94,
    });
    expect(result.features[0].geometry).not.toHaveProperty("crs");
    expect(result.sourceSummary.sources).toEqual(["official_surveyed_geojson_2025"]);
    expect(result.sourceSummary.missingGeometry).toBe(0);
  });

  it("omits geometry when includeGeometry is false", async () => {
    const service = new AdminBoundaryService(createRepository(guangdongRows));
    const result = await service.getAdminBoundaries({
      parentAdcode: "440000",
      level: "prefecture",
      includeGeometry: false,
    });

    expect(result.features[0]).not.toHaveProperty("geometry");
    expect(result.count).toBe(2);
  });

  it("returns count 0 for empty results", async () => {
    const service = new AdminBoundaryService(createRepository([]));
    const result = await service.getAdminBoundaries({ parentAdcode: "990000", level: "prefecture" });

    expect(result.count).toBe(0);
    expect(result.features).toEqual([]);
    expect(result.sourceSummary.missingGeometry).toBe(0);
  });

  it("counts missing geometry from repository statistics", async () => {
    const service = new AdminBoundaryService(createRepository(guangdongRows, 1));
    const result = await service.getAdminBoundaries({ parentAdcode: "440000", level: "prefecture" });

    expect(result.sourceSummary.missingGeometry).toBe(1);
  });

  it("supports viewport bbox queries without requiring parentAdcode", async () => {
    const listChildren = vi.fn(async () => guangdongRows);
    const countMissingGeometry = vi.fn(async () => 0);
    const service = new AdminBoundaryService({
      listChildren,
      countMissingGeometry,
    });
    const bbox = [112.9, 22.4, 114.7, 24.0] as [number, number, number, number];

    const result = await service.getAdminBoundaries({
      level: "prefecture",
      bbox,
      includeGeometry: true,
    });

    expect(result.parentAdcode).toBeNull();
    expect(result.bbox).toEqual(bbox);
    expect(result.count).toBe(2);
    expect(listChildren).toHaveBeenCalledWith({
      level: "prefecture",
      bbox,
      includeGeometry: true,
    });
    expect(countMissingGeometry).toHaveBeenCalledWith({
      level: "prefecture",
      bbox,
    });
  });
});
