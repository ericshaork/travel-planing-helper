import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  mapAdminRegionToImportRow,
  normalizeAdminRegionInput,
  prepareAdminRegionImportRows,
} from "../../../src/server/data-hub/admin/importer";
import { normalizeAdminLevel } from "../../../src/server/data-hub/admin/normalize-admin-level";
import { validateNormalizedAdminRegions } from "../../../src/server/data-hub/admin/validate-admin-regions";
import type { RawAdminRegionInput } from "../../../src/server/data-hub/admin/import-types";

function loadGuangdongSample() {
  const samplePath = path.resolve(
    process.cwd(),
    "data/admin/samples/guangdong-admin-regions.sample.json",
  );
  const parsed = JSON.parse(readFileSync(samplePath, "utf8")) as {
    regions: RawAdminRegionInput[];
  };

  return parsed.regions;
}

function loadGuangdongGeometry() {
  const geometryPath = path.resolve(
    process.cwd(),
    "data/admin/normalized/guangdong-admin-regions.geometry.json",
  );
  const parsed = JSON.parse(readFileSync(geometryPath, "utf8")) as {
    regions: RawAdminRegionInput[];
  };

  return parsed.regions;
}

function loadChinaPrefectureGeometry() {
  const geometryPath = path.resolve(
    process.cwd(),
    "data/admin/normalized/china-prefecture-admin-regions.geometry.json",
  );
  const parsed = JSON.parse(readFileSync(geometryPath, "utf8")) as {
    regions: RawAdminRegionInput[];
    warnings?: string[];
  };

  return parsed;
}

function loadChinaCountyGeometry() {
  const geometryPath = path.resolve(
    process.cwd(),
    "data/admin/normalized/china-county-admin-regions.geometry.json",
  );
  const parsed = JSON.parse(readFileSync(geometryPath, "utf8")) as {
    regions: RawAdminRegionInput[];
    coverage?: {
      directCountyUnderProvince?: number;
      skippedTownshipLike?: number;
      skippedDirectAdminPrefectures?: number;
    };
    warnings?: string[];
  };

  return parsed;
}

describe("admin geography importer", () => {
  it("normalizes ordinary province/prefecture/county records", () => {
    const normalized = normalizeAdminRegionInput({
      adcode: "440305",
      name: "南山区",
      parentAdcode: "440300",
      provinceAdcode: "440000",
      prefectureAdcode: "440300",
      geometry: {
        type: "Polygon",
        coordinates: [[
          [113.88, 22.58],
          [113.98, 22.58],
          [113.98, 22.49],
          [113.88, 22.58],
        ]],
      },
    });

    expect(normalized.level).toBe("county");
    expect(normalized.adminType).toBe("district");
    expect(normalized.geometry?.type).toBe("MultiPolygon");
    expect(normalized.bbox).toEqual([113.88, 22.49, 113.98, 22.58]);

    const row = mapAdminRegionToImportRow(normalized);
    expect(row.admin_type).toBe("district");
    expect(row.boundary_geojson?.type).toBe("MultiPolygon");
  });

  it("supports municipality province -> county without prefecture", () => {
    const prepared = prepareAdminRegionImportRows([
      {
        adcode: "110000",
        name: "北京市",
        level: "province",
        adminType: "municipality",
        provinceAdcode: "110000",
      },
      {
        adcode: "110105",
        name: "朝阳区",
        level: "county",
        adminType: "district",
        parentAdcode: "110000",
        provinceAdcode: "110000",
        prefectureAdcode: null,
      },
    ]);

    expect(prepared.validation.valid).toBe(true);
    expect(prepared.normalized[1]).toMatchObject({
      level: "county",
      parentAdcode: "110000",
      provinceAdcode: "110000",
      prefectureAdcode: null,
    });
  });

  it("classifies Dongguan and Zhongshan as direct-administered prefecture cities", () => {
    expect(normalizeAdminLevel({ adcode: "441900", name: "东莞市" })).toEqual({
      level: "prefecture",
      adminType: "prefecture_city_direct_township",
    });
    expect(normalizeAdminLevel({ adcode: "442000", name: "中山市" })).toEqual({
      level: "prefecture",
      adminType: "prefecture_city_direct_township",
    });
  });

  it("validates the Guangdong sample hierarchy without treating missing geometry as fatal", () => {
    const prepared = prepareAdminRegionImportRows(loadGuangdongSample());
    const dongguan = prepared.normalized.find((region) => region.adcode === "441900");
    const zhongshan = prepared.normalized.find((region) => region.adcode === "442000");
    const guangzhouChildren = prepared.normalized.filter(
      (region) => region.prefectureAdcode === "440100" && region.level === "county",
    );
    const shenzhenChildren = prepared.normalized.filter(
      (region) => region.prefectureAdcode === "440300" && region.level === "county",
    );

    expect(prepared.validation.valid).toBe(true);
    expect(prepared.validation.summary).toMatchObject({
      total: 144,
      province: 1,
      prefecture: 21,
      county: 122,
      missingGeometry: 144,
      failed: 0,
    });
    expect(dongguan?.adminType).toBe("prefecture_city_direct_township");
    expect(zhongshan?.adminType).toBe("prefecture_city_direct_township");
    expect(guangzhouChildren.map((region) => region.name)).toEqual(
      expect.arrayContaining(["越秀区", "天河区"]),
    );
    expect(shenzhenChildren.map((region) => region.name)).toEqual(
      expect.arrayContaining(["福田区", "罗湖区", "南山区"]),
    );
  });

  it("validates the Guangdong real-geometry fixture for province and prefecture levels", () => {
    const prepared = prepareAdminRegionImportRows(loadGuangdongGeometry());
    const province = prepared.normalized.find((region) => region.adcode === "440000");
    const prefectures = prepared.normalized.filter((region) => region.level === "prefecture");

    expect(prepared.validation.valid).toBe(true);
    expect(prepared.validation.summary).toMatchObject({
      total: 22,
      province: 1,
      prefecture: 21,
      county: 0,
      missingGeometry: 0,
      failed: 0,
    });
    expect(province?.geometry?.type).toBe("MultiPolygon");
    expect(prefectures).toHaveLength(21);
    expect(prefectures.every((region) => region.geometry?.type === "MultiPolygon")).toBe(true);
    expect(prefectures.map((region) => region.name)).toEqual(
      expect.arrayContaining(["广州市", "深圳市", "东莞市", "中山市"]),
    );
  });

  it("validates the nationwide prefecture real-geometry fixture without county records", () => {
    const fixture = loadChinaPrefectureGeometry();
    const prepared = prepareAdminRegionImportRows(fixture.regions, {
      externalAdcodes: [
        ...fixture.regions.map((region) => region.adcode),
        ...fixture.regions.map((region) => region.parentAdcode),
        ...fixture.regions.map((region) => region.provinceAdcode),
      ],
    });
    const names = new Set(prepared.normalized.map((region) => region.name));
    const byAdcode = new Map(prepared.normalized.map((region) => [region.adcode, region]));

    expect(prepared.validation.valid).toBe(true);
    expect(prepared.validation.summary).toMatchObject({
      total: 336,
      province: 0,
      prefecture: 336,
      county: 0,
      missingGeometry: 0,
      invalidParent: 0,
      failed: 0,
    });
    expect(prepared.normalized.every((region) => region.level === "prefecture")).toBe(true);
    expect(prepared.normalized.every((region) => region.geometry?.type === "MultiPolygon")).toBe(true);
    expect([...names]).toEqual(expect.arrayContaining([
      "杭州市",
      "宁波市",
      "温州市",
      "成都市",
      "西安市",
      "厦门市",
      "福州市",
      "南京市",
      "苏州市",
      "济南市",
      "青岛市",
      "东莞市",
      "中山市",
    ]));
    expect(byAdcode.get("441900")?.adminType).toBe("prefecture_city_direct_township");
    expect(byAdcode.get("442000")?.adminType).toBe("prefecture_city_direct_township");
    expect(byAdcode.has("110000")).toBe(false);
    expect(byAdcode.has("310000")).toBe(false);
    expect(fixture.warnings ?? []).toEqual(
      expect.arrayContaining([
        expect.stringContaining("110000:北京市"),
        expect.stringContaining("310000:上海市"),
      ]),
    );
  });

  it("validates the nationwide county real-geometry fixture and special hierarchy cases", () => {
    const fixture = loadChinaCountyGeometry();
    const prepared = prepareAdminRegionImportRows(fixture.regions, {
      externalAdcodes: [
        ...fixture.regions.map((region) => region.adcode),
        ...fixture.regions.map((region) => region.parentAdcode),
        ...fixture.regions.map((region) => region.provinceAdcode),
        ...fixture.regions.map((region) => region.prefectureAdcode),
      ],
    });
    const names = new Set(prepared.normalized.map((region) => region.name));
    const byAdcode = new Map(prepared.normalized.map((region) => [region.adcode, region]));

    expect(prepared.validation.valid).toBe(true);
    expect(prepared.validation.summary).toMatchObject({
      total: 2883,
      province: 0,
      prefecture: 0,
      county: 2883,
      missingGeometry: 0,
      invalidParent: 0,
      failed: 0,
    });
    expect(prepared.normalized.every((region) => region.level === "county")).toBe(true);
    expect(prepared.normalized.every((region) => region.geometry?.type === "MultiPolygon")).toBe(true);
    expect([...names]).toEqual(expect.arrayContaining([
      "东城区",
      "西城区",
      "朝阳区",
      "黄浦区",
      "浦东新区",
      "南山区",
      "上城区",
      "锦江区",
      "新城区",
      "思明区",
      "玄武区",
      "市南区",
    ]));
    expect(byAdcode.get("110105")).toMatchObject({
      name: "朝阳区",
      parentAdcode: "110000",
      provinceAdcode: "110000",
      prefectureAdcode: null,
      adminType: "district",
    });
    expect(byAdcode.get("429006")).toMatchObject({
      name: "天门市",
      parentAdcode: "420000",
      provinceAdcode: "420000",
      prefectureAdcode: null,
      adminType: "county_level_city",
    });
    expect(byAdcode.get("429006")?.metadata?.directCountyUnderProvince).toBe(true);
    expect(byAdcode.get("810101")).toMatchObject({
      name: "中西区",
      parentAdcode: "810000",
      provinceAdcode: "810000",
      prefectureAdcode: null,
    });
    expect(byAdcode.has("441900")).toBe(false);
    expect(byAdcode.has("442000")).toBe(false);
    expect(fixture.coverage).toMatchObject({
      directCountyUnderProvince: 70,
      skippedTownshipLike: 0,
      skippedDirectAdminPrefectures: 8,
    });
    expect(fixture.warnings ?? []).toEqual(
      expect.arrayContaining([
        expect.stringContaining("441900:东莞市"),
        expect.stringContaining("442000:中山市"),
      ]),
    );
  });

  it("allows partial province imports with an external country parent", () => {
    const prepared = prepareAdminRegionImportRows([
      {
        adcode: "100000",
        name: "中国",
        level: "country",
        adminType: "country",
        geometry: {
          type: "Polygon",
          coordinates: [[
            [73, 18],
            [135, 18],
            [135, 54],
            [73, 18],
          ]],
        },
      },
      {
        adcode: "440000",
        name: "广东省",
        level: "province",
        parentAdcode: "100000",
        provinceAdcode: "440000",
        geometry: {
          type: "Polygon",
          coordinates: [[
            [109.6, 20.0],
            [117.4, 20.0],
            [117.4, 25.6],
            [109.6, 20.0],
          ]],
        },
      },
    ], { externalAdcodes: ["100000"] });

    expect(prepared.validation.valid).toBe(true);
    expect(prepared.validation.summary).toMatchObject({
      country: 1,
      province: 1,
      failed: 0,
    });
  });

  it("allows Guangdong county-only imports with external province and prefecture ancestors", () => {
    const prepared = prepareAdminRegionImportRows([
      {
        adcode: "440305",
        name: "南山区",
        level: "county",
        parentAdcode: "440300",
        provinceAdcode: "440000",
        prefectureAdcode: "440300",
        geometry: {
          type: "Polygon",
          coordinates: [[
            [113.88, 22.58],
            [113.98, 22.58],
            [113.98, 22.49],
            [113.88, 22.58],
          ]],
        },
      },
    ], { externalAdcodes: ["440000", "440300"] });

    expect(prepared.validation.valid).toBe(true);
    expect(prepared.validation.summary).toMatchObject({
      county: 1,
      failed: 0,
    });
  });

  it("reports invalid parent and invalid bbox", () => {
    const validation = validateNormalizedAdminRegions([
      normalizeAdminRegionInput({
        adcode: "440305",
        name: "南山区",
        parentAdcode: "999999",
        provinceAdcode: "440000",
        prefectureAdcode: "440300",
        bbox: [114, 22, 113, 23],
      }),
    ]);

    expect(validation.valid).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "missing_parent",
        "missing_province",
        "missing_prefecture",
        "invalid_bbox",
      ]),
    );
  });
});
