import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getTripPackageExploreContentById,
  getTripPackageExploreContents,
  toTripPackageExploreListItem,
} from "../../lib/trip-packages/source";

describe("trip package Explore source", () => {
  it("returns five package-backed Explore contents with Chinese city names", async () => {
    const result = await getTripPackageExploreContents();

    expect(result.issues).toEqual([]);
    expect(result.items).toHaveLength(5);
    expect(result.items.map((item) => item.city)).toEqual([
      "北京",
      "杭州",
      "成都",
      "上海",
      "西安",
    ]);
  });

  it("preserves the requested list limit", async () => {
    const result = await getTripPackageExploreContents({ limit: 2 });

    expect(result.items).toHaveLength(2);
  });

  it("loads detail by package id and slug", async () => {
    const byId = await getTripPackageExploreContentById("xian_couple_v1");

    expect(byId.item?.city).toBe("西安");

    const bySlug = await getTripPackageExploreContentById(byId.item?.slug ?? "");

    expect(bySlug.item?.externalId).toBe("xian_couple_v1");
  });

  it("builds list item shape with a usable cover fallback", async () => {
    const result = await getTripPackageExploreContents({ city: "北京" });
    const listItem = toTripPackageExploreListItem(result.items[0]!);

    expect(listItem.city).toBe("北京");
    expect(listItem.coverImageUrl).toMatch(
      /^\/images\/trip-packages\/beijing_couple_golden_v2\//,
    );
  });
});
