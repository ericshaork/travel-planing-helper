import { describe, expect, it } from "vitest";

import {
  assertMacauDisplaySubdivisionType,
  buildAdminLabelFeatures,
  buildHierarchyFallbackRules,
  displaySubdivisionTypeForFallbackRole,
} from "../../../scripts/build-china-admin-multilayer-pmtiles-g5";

const provinces = [
  { adcode: "440000", name: "广东省", level: "province", adminType: "province", parentAdcode: "100000", provinceAdcode: "440000", labelPoint: { lng: 113.3, lat: 23.1 } },
  { adcode: "810000", name: "香港特别行政区", level: "province", adminType: "special_administrative_region", parentAdcode: "100000", provinceAdcode: "810000", labelPoint: { lng: 114.17, lat: 22.32 } },
  { adcode: "820000", name: "澳门特别行政区", level: "province", adminType: "special_administrative_region", parentAdcode: "100000", provinceAdcode: "820000", labelPoint: { lng: 113.55, lat: 22.19 } },
  { adcode: "110000", name: "北京市", level: "province", adminType: "municipality", parentAdcode: "100000", provinceAdcode: "110000", labelPoint: { lng: 116.4, lat: 39.9 } },
  { adcode: "710000", name: "台湾省", level: "province", adminType: "province", parentAdcode: "100000", provinceAdcode: "710000", labelPoint: { lng: 121, lat: 23.8 } },
];

const prefectures = [
  { adcode: "440300", name: "深圳市", level: "prefecture", adminType: "prefecture_city", parentAdcode: "440000", provinceAdcode: "440000", labelPoint: { lng: 114.1, lat: 22.55 } },
  { adcode: "440400", name: "珠海市", level: "prefecture", adminType: "prefecture_city", parentAdcode: "440000", provinceAdcode: "440000", labelPoint: { lng: 113.57, lat: 22.27 } },
  { adcode: "441900", name: "东莞市", level: "prefecture", adminType: "prefecture_city", parentAdcode: "440000", provinceAdcode: "440000", labelPoint: { lng: 113.75, lat: 23.04 } },
  { adcode: "442000", name: "中山市", level: "prefecture", adminType: "prefecture_city", parentAdcode: "440000", provinceAdcode: "440000", labelPoint: { lng: 113.38, lat: 22.52 } },
];

const counties = [
  { adcode: "810101", name: "中西区", level: "county", adminType: "district", parentAdcode: "810000", provinceAdcode: "810000", labelPoint: { lng: 114.14, lat: 22.28 } },
  { adcode: "110101", name: "东城区", level: "county", adminType: "district", parentAdcode: "110000", provinceAdcode: "110000", labelPoint: { lng: 116.42, lat: 39.93 } },
  { adcode: "710001", name: "高雄市", level: "county", adminType: "county_level_city", parentAdcode: "710000", provinceAdcode: "710000", labelPoint: { lng: 120.3, lat: 22.64 } },
];

describe("G5 hierarchy display fallback rules", () => {
  const rules = buildHierarchyFallbackRules({ provinces, prefectures, counties });

  it("keeps Hong Kong and Macau non-empty in prefecture display without fake prefecture records", () => {
    expect(rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          adcode: "810000",
          sourceLevel: "province",
          displayLevel: "prefecture",
          fallbackRole: "selfAsPrefecture",
        }),
        expect.objectContaining({
          adcode: "820000",
          sourceLevel: "province",
          displayLevel: "prefecture",
          fallbackRole: "selfAsPrefecture",
        }),
      ]),
    );
  });

  it("keeps Macau visible in county display when no county children exist", () => {
    expect(rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          adcode: "820000",
          sourceLevel: "province",
          displayLevel: "county",
          fallbackRole: "selfAsCounty",
          childCount: 0,
        }),
      ]),
    );
    expect(rules.some((rule) => rule.adcode === "810000" && rule.displayLevel === "county")).toBe(false);
  });

  it("does not cover Hong Kong real county children with selfAsCounty fallback", () => {
    expect(counties.some((county) => county.parentAdcode === "810000")).toBe(true);
    expect(rules).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          adcode: "810000",
          displayLevel: "county",
          fallbackRole: "selfAsCounty",
        }),
      ]),
    );
  });

  it("keeps municipalities non-empty in prefecture display and leaves real county children intact", () => {
    expect(rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          adcode: "110000",
          sourceLevel: "province",
          displayLevel: "prefecture",
          fallbackRole: "selfAsPrefecture",
        }),
      ]),
    );
    expect(rules.some((rule) => rule.adcode === "110000" && rule.displayLevel === "county")).toBe(false);
  });

  it("uses Taiwan county-level data as prefecture display fallback when prefecture source is absent", () => {
    expect(rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          adcode: "710000",
          sourceLevel: "county",
          displayLevel: "prefecture",
          fallbackRole: "countyAsPrefecture",
        }),
      ]),
    );
  });

  it("does not convert ordinary provinces with real prefecture children into self fallback", () => {
    expect(rules.some((rule) => rule.adcode === "440000")).toBe(false);
  });

  it("builds prefecture display labels for Hong Kong, Macau, and municipalities", () => {
    const labels = buildAdminLabelFeatures({ provinces, prefectures, counties, fallbackRules: rules });

    expect(labels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          properties: expect.objectContaining({
            adcode: "810000",
            displayLevel: "prefecture",
            sourceLevel: "province",
            fallbackRole: "selfAsPrefecture",
            labelText: "香港特别行政区",
          }),
        }),
        expect.objectContaining({
          properties: expect.objectContaining({
            adcode: "820000",
            displayLevel: "prefecture",
            sourceLevel: "province",
            fallbackRole: "selfAsPrefecture",
            labelText: "澳门特别行政区",
          }),
        }),
        expect.objectContaining({
          properties: expect.objectContaining({
            adcode: "110000",
            displayLevel: "prefecture",
            sourceLevel: "province",
            fallbackRole: "selfAsPrefecture",
          }),
        }),
      ]),
    );
  });

  it("builds Macau self county fallback label only when county children are absent", () => {
    const labels = buildAdminLabelFeatures({ provinces, prefectures, counties, fallbackRules: rules });

    expect(labels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          properties: expect.objectContaining({
            adcode: "820000",
            displayLevel: "county",
            sourceLevel: "province",
            fallbackRole: "selfAsCounty",
            displaySubdivisionType: "fallbackSelf",
          }),
        }),
      ]),
    );
    expect(labels.some((feature) =>
      feature.properties.adcode === "810000" &&
      feature.properties.displayLevel === "county" &&
      feature.properties.fallbackRole === "selfAsCounty",
    )).toBe(false);
  });

  it("marks Macau self fallback and future parish display subdivisions explicitly", () => {
    expect(displaySubdivisionTypeForFallbackRole("selfAsCounty")).toBe("fallbackSelf");
    expect(displaySubdivisionTypeForFallbackRole("none")).toBe("administrative");

    expect(() => assertMacauDisplaySubdivisionType({
      adcode: "820000",
      fallbackRole: "selfAsCounty",
      displaySubdivisionType: "fallbackSelf",
    })).not.toThrow();
    expect(() => assertMacauDisplaySubdivisionType({
      adcode: "820001",
      source: "osm_parish_boundary",
      fallbackRole: "none",
      displaySubdivisionType: "administrative",
    })).toThrow(/parish/);
    expect(() => assertMacauDisplaySubdivisionType({
      adcode: "820001",
      source: "osm_parish_boundary",
      fallbackRole: "none",
      displaySubdivisionType: "parish",
    })).not.toThrow();
  });
});
