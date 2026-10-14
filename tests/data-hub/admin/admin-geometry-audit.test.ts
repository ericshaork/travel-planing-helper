import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  analyzeLabelPointQuality,
  compareLocalRemoteGeometry,
  computeGeometryComplexityStats,
  getCoordinateRangeIssues,
  isLikelyLngLatReversed,
} from "../../../src/server/data-hub/admin/geometryAudit";

describe("admin geometry audit utilities", () => {
  it("detects likely lat/lng reversed points and coordinate range issues", () => {
    expect(isLikelyLngLatReversed({ lng: 22.54, lat: 114.06 })).toBe(true);
    expect(getCoordinateRangeIssues({
      center: { lng: 22.54, lat: 114.06 },
      labelPoint: { lng: 0, lat: 0 },
      bbox: [22, 113, 23, 115],
    })).toEqual(expect.arrayContaining([
      "center:outside_china_range",
      "center:likely_lng_lat_reversed",
      "labelPoint:zero_point",
      "bbox:likely_lng_lat_reversed",
    ]));
  });

  it("counts Polygon and MultiPolygon vertices, rings, and interiors", () => {
    const polygonStats = computeGeometryComplexityStats({
      type: "Polygon",
      coordinates: [[
        [113, 22],
        [114, 22],
        [114, 23],
        [113, 22],
      ]],
    });
    const multiPolygonStats = computeGeometryComplexityStats({
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [113, 22],
            [114, 22],
            [114, 23],
            [113, 22],
          ],
          [
            [113.2, 22.2],
            [113.3, 22.2],
            [113.3, 22.3],
            [113.2, 22.2],
          ],
        ],
        [[
          [115, 23],
          [116, 23],
          [116, 24],
          [115, 23],
        ]],
      ],
    });

    expect(polygonStats).toMatchObject({
      polygonCount: 1,
      ringCount: 1,
      exteriorRingCount: 1,
      interiorRingCount: 0,
      vertexCount: 4,
      isMultiPolygon: false,
    });
    expect(multiPolygonStats).toMatchObject({
      polygonCount: 2,
      ringCount: 3,
      exteriorRingCount: 2,
      interiorRingCount: 1,
      vertexCount: 12,
      isMultiPolygon: true,
    });
  });

  it("flags labelPoint outside bbox or polygon", () => {
    const quality = analyzeLabelPointQuality({
      labelPoint: { lng: 115, lat: 25 },
      bbox: [113, 22, 114, 23],
      geometry: {
        type: "Polygon",
        coordinates: [[
          [113, 22],
          [114, 22],
          [114, 23],
          [113, 22],
        ]],
      },
    });

    expect(quality.hasLabelPoint).toBe(true);
    expect(quality.insideBbox).toBe(false);
    expect(quality.insidePolygon).toBe(false);
  });

  it("compares local normalized and remote sample geometry stats", () => {
    const geometry = {
      type: "MultiPolygon",
      coordinates: [[[
        [113, 22],
        [114, 22],
        [114, 23],
        [113, 22],
      ]]],
    };

    expect(compareLocalRemoteGeometry({
      adcode: "440300",
      local: {
        geometry,
        bbox: [113, 22, 114, 23],
        labelPoint: [113.5, 22.5],
      },
      remote: {
        geometry,
        bbox: [113, 22, 114, 23],
        labelPoint: [113.5, 22.5],
      },
    })).toMatchObject({
      adcode: "440300",
      localVertexCount: 4,
      remoteVertexCount: 4,
      vertexCountDelta: 0,
      bboxMatches: true,
      labelPointMatches: true,
    });
  });

  it("audit script does not print secrets and fails clearly without env", () => {
    const script = readFileSync(
      resolve(process.cwd(), "scripts/audit-admin-geometry-quality.ts"),
      "utf8",
    );
    expect(script).not.toMatch(/console\.log\([^)]*serviceRoleKey/);

    let output = "";
    try {
      execFileSync(
        process.execPath,
        [
          "--experimental-strip-types",
          "scripts/audit-admin-geometry-quality.ts",
          "--env=.missing-admin-audit-env",
        ],
        {
          cwd: process.cwd(),
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
    } catch (error) {
      output = `${(error as { stdout?: string }).stdout ?? ""}${(error as { stderr?: string }).stderr ?? ""}`;
    }

    expect(output).toContain("缺少 NEXT_PUBLIC_SUPABASE_URL");
    expect(output).not.toContain("service-secret-value");
    expect(output).not.toContain("SUPABASE_SERVICE_ROLE_KEY=");
  });
});
