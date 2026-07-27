import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  buildCityGroundingPromptSection,
  findCityGrounding,
  listCityGroundingCatalogs,
} from "../../lib/trip/city-grounding";

describe("findCityGrounding", () => {
  it("matches the Beijing catalog by its Chinese label", () => {
    const catalog = findCityGrounding("北京");
    expect(catalog).not.toBeNull();
    expect(catalog?.cityCode).toBe("beijing");
    expect(catalog?.cityLabelZh).toBe("北京");
  });

  it("matches the Beijing catalog by its English label", () => {
    const catalog = findCityGrounding("Beijing");
    expect(catalog?.cityCode).toBe("beijing");
  });

  it("matches Xi'an by variant spellings", () => {
    const xianCatalog = findCityGrounding("Xi'an");
    expect(xianCatalog?.cityCode).toBe("xian");
    expect(findCityGrounding("西安市")?.cityCode).toBe("xian");
  });

  it("falls back to substring matching when the destination includes the alias", () => {
    const catalog = findCityGrounding("杭州西湖区");
    expect(catalog?.cityCode).toBe("hangzhou");
  });

  it("returns null for unknown destinations", () => {
    expect(findCityGrounding("苏州")).toBeNull();
    expect(findCityGrounding("")).toBeNull();
    expect(findCityGrounding(null)).toBeNull();
    expect(findCityGrounding(undefined)).toBeNull();
  });

  it("exposes catalogs for all five seeded cities", () => {
    const catalogs = listCityGroundingCatalogs();
    expect(catalogs.map((entry) => entry.cityCode).sort()).toEqual([
      "beijing",
      "chengdu",
      "hangzhou",
      "shanghai",
      "xian",
    ]);
  });

  it("exposes Chinese asset names inside every catalog", () => {
    for (const catalog of listCityGroundingCatalogs()) {
      expect(catalog.assets.length).toBeGreaterThan(0);
      for (const asset of catalog.assets) {
        expect(asset.nameZh).toMatch(/[一-鿿]/);
      }
    }
  });
});

describe("buildCityGroundingPromptSection", () => {
  it("lists Beijing anchor POIs with Chinese names, categories and time-of-day", () => {
    const catalog = findCityGrounding("北京");
    expect(catalog).not.toBeNull();
    const section = buildCityGroundingPromptSection(catalog!);

    expect(section).toContain("故宫博物院");
    expect(section).toContain("景山公园");
    expect(section).toContain("类型:place");
    expect(section).toContain("角色:first_anchor");
    expect(section).toContain("餐食参考：");
  });

  it("groups Hangzhou assets across place, food, experience and city_mood", () => {
    const catalog = findCityGrounding("Hangzhou");
    expect(catalog).not.toBeNull();
    const section = buildCityGroundingPromptSection(catalog!);

    expect(section).toContain("西湖");
    expect(section).toContain("龙井茶园");
    expect(section).toContain("小河直街");
    expect(section).toContain("城市氛围提示：");
  });
});
