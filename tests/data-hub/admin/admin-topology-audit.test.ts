import { describe, expect, it } from "vitest";

import {
  auditAdminTopology,
  auditAdminTopologyLevel,
  extractAdminTopologySegments,
  formatAdminTopologyAuditMarkdown,
} from "../../../src/server/data-hub/admin/topologyAudit";
import type { NormalizedAdminRegion } from "../../../src/server/data-hub/admin/import-types";

function region(
  overrides: Partial<NormalizedAdminRegion> = {},
): NormalizedAdminRegion {
  return {
    adcode: overrides.adcode ?? "440300",
    name: overrides.name ?? "深圳市",
    level: overrides.level ?? "prefecture",
    adminType: overrides.adminType ?? "prefecture_city",
    parentAdcode: overrides.parentAdcode ?? "440000",
    provinceAdcode: overrides.provinceAdcode ?? "440000",
    prefectureAdcode: overrides.prefectureAdcode ?? null,
    center: overrides.center ?? null,
    labelPoint: overrides.labelPoint ?? null,
    geometry: overrides.geometry ?? {
      type: "MultiPolygon",
      coordinates: [[[
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ]]],
    },
    bbox: overrides.bbox ?? [0, 0, 1, 1],
    source: overrides.source ?? "test",
    sourceId: overrides.sourceId ?? null,
    sourceUpdatedAt: overrides.sourceUpdatedAt ?? null,
    metadata: overrides.metadata,
  };
}

describe("admin topology audit", () => {
  it("extracts exterior ring segments without connecting multipolygon parts or holes", () => {
    const input = region({
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [0, 0],
              [2, 0],
              [2, 2],
              [0, 2],
              [0, 0],
            ],
            [
              [0.5, 0.5],
              [1, 0.5],
              [1, 1],
              [0.5, 0.5],
            ],
          ],
          [[
            [3, 3],
            [4, 3],
            [4, 4],
            [3, 3],
          ]],
        ],
      },
    });

    const extracted = extractAdminTopologySegments([input], "prefecture", 0.001);

    expect(extracted.polygonCount).toBe(2);
    expect(extracted.exteriorRingCount).toBe(2);
    expect(extracted.ignoredInteriorRingCount).toBe(1);
    expect(extracted.segments).toHaveLength(7);
    expect(extracted.segments).not.toContainEqual(expect.objectContaining({
      start: { lng: 2, lat: 2 },
      end: { lng: 3, lat: 3 },
    }));
  });

  it("counts A-B and B-A as exact shared edge", () => {
    const left = region({
      adcode: "left",
      name: "左",
      geometry: {
        type: "MultiPolygon",
        coordinates: [[[
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 0],
        ]]],
      },
    });
    const right = region({
      adcode: "right",
      name: "右",
      geometry: {
        type: "MultiPolygon",
        coordinates: [[[
          [1, 1],
          [1, 0],
          [2, 1],
          [1, 1],
        ]]],
      },
    });

    const summary = auditAdminTopologyLevel({
      level: "prefecture",
      regions: [left, right],
      tolerance: 0.001,
    });

    expect(summary.rawSegmentCount).toBe(6);
    expect(summary.uniqueSegmentCount).toBe(5);
    expect(summary.exactSharedSegmentCount).toBe(2);
    expect(summary.exactSharedRatio).toBeCloseTo(2 / 6);
  });

  it("reports near duplicate segments without mutating geometry", () => {
    const left = region({
      adcode: "left",
      geometry: {
        type: "MultiPolygon",
        coordinates: [[[
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ]]],
      },
    });
    const right = region({
      adcode: "right",
      geometry: {
        type: "MultiPolygon",
        coordinates: [[[
          [1.0004, 0],
          [2, 0],
          [2, 1],
          [1.0004, 1],
          [1.0004, 0],
        ]]],
      },
    });

    const summary = auditAdminTopologyLevel({
      level: "prefecture",
      regions: [left, right],
      tolerance: 0.001,
    });

    expect(summary.exactSharedSegmentCount).toBe(0);
    expect(summary.nearDuplicateSegmentCount).toBeGreaterThan(0);
    expect(summary.nearDuplicatePairsSample.length).toBeGreaterThan(0);
    expect(right.geometry?.coordinates[0]?.[0]?.[0]?.[0]).toBe(1.0004);
  });

  it("builds focus pair and parent-child summaries", () => {
    const province = region({
      adcode: "440000",
      name: "广东省",
      level: "province",
      parentAdcode: "100000",
      provinceAdcode: "440000",
      prefectureAdcode: null,
    });
    const shenzhen = region({
      adcode: "440300",
      name: "深圳市",
      level: "prefecture",
      parentAdcode: "440000",
      provinceAdcode: "440000",
    });
    const dongguan = region({
      adcode: "441900",
      name: "东莞市",
      level: "prefecture",
      parentAdcode: "440000",
      provinceAdcode: "440000",
      geometry: {
        type: "MultiPolygon",
        coordinates: [[[
          [1, 0],
          [2, 0],
          [2, 1],
          [1, 1],
          [1, 0],
        ]]],
      },
    });
    const county = region({
      adcode: "440305",
      name: "南山区",
      level: "county",
      parentAdcode: "440300",
      provinceAdcode: "440000",
      prefectureAdcode: "440300",
    });

    const result = auditAdminTopology({
      provinceRegions: [province],
      prefectureRegions: [shenzhen, dongguan],
      countyRegions: [county],
      level: "all",
      sample: "focus",
      tolerance: 0.001,
    });

    expect(result.summaries.map((summary) => summary.level)).toEqual([
      "province",
      "prefecture",
      "county",
    ]);
    expect(result.focusPairs).toEqual(expect.arrayContaining([
      expect.objectContaining({
        label: "深圳 / 东莞",
        rawSegmentsA: 4,
        rawSegmentsB: 4,
      }),
    ]));
    expect(result.parentChildMismatches).toEqual(expect.arrayContaining([
      expect.objectContaining({
        label: "深圳市",
        parentLevel: "prefecture",
        childLevel: "county",
      }),
    ]));
  });

  it("formats markdown report without dumping full geometry", () => {
    const result = auditAdminTopology({
      provinceRegions: [region({ level: "province", adcode: "440000", name: "广东省" })],
      prefectureRegions: [region()],
      countyRegions: [],
      level: "all",
      sample: "focus",
      tolerance: 0.001,
    });
    const markdown = formatAdminTopologyAuditMarkdown(result);

    expect(markdown).toContain("## 各层级统计表");
    expect(markdown).toContain("## 重点区域统计");
    expect(markdown).toContain("Phase F.3");
    expect(markdown).not.toContain("\"coordinates\"");
    expect(markdown).not.toContain("[[[");
  });
});
