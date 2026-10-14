import { describe, expect, it } from "vitest";

import {
  computeGeometryBbox,
  isValidBbox,
  toMultiPolygonGeometry,
} from "../../../src/server/data-hub/admin/geometry";

describe("admin geography geometry utilities", () => {
  it("normalizes Polygon to MultiPolygon and computes bbox", () => {
    const result = toMultiPolygonGeometry({
      type: "Polygon",
      coordinates: [[
        [113, 22],
        [114, 22],
        [114, 23],
        [113, 22],
      ]],
    });

    expect(result.errors).toEqual([]);
    expect(result.geometry).toEqual({
      type: "MultiPolygon",
      coordinates: [[[
        [113, 22],
        [114, 22],
        [114, 23],
        [113, 22],
      ]]],
    });
    expect(result.bbox).toEqual([113, 22, 114, 23]);
    expect(result.center).toEqual({ lng: 113.5, lat: 22.5 });
  });

  it("keeps MultiPolygon geometry and validates bbox", () => {
    const geometry = {
      type: "MultiPolygon" as const,
      coordinates: [[[
        [113, 22],
        [114, 22],
        [114, 23],
        [113, 22],
      ]]],
    };

    expect(toMultiPolygonGeometry(geometry).geometry).toEqual(geometry);
    expect(computeGeometryBbox(geometry)).toEqual([113, 22, 114, 23]);
    expect(isValidBbox([113, 22, 114, 23])).toBe(true);
    expect(isValidBbox([114, 22, 113, 23])).toBe(false);
  });

  it("rejects invalid geometry coordinates", () => {
    const result = toMultiPolygonGeometry({
      type: "Polygon",
      coordinates: [[
        [181, 22],
        [114, 22],
        [114, 23],
        [181, 22],
      ]],
    });

    expect(result.geometry).toBeNull();
    expect(result.errors).toEqual(
      expect.arrayContaining(["coordinates[0][0][0] has invalid lng/lat"]),
    );
  });
});
