import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildTripPlanDraftFromExplore } from "../../lib/explore/to-trip-draft";
import { adaptTripPackageToExploreContent } from "../../lib/trip-packages/adapter";
import { loadAvailableTripPackages } from "../../lib/trip-packages/loader";

describe("trip package adapter", () => {
  it("adapts all five packages to ExploreTripContent", async () => {
    const result = await loadAvailableTripPackages();
    const contents = result.packages.map(adaptTripPackageToExploreContent);

    expect(contents).toHaveLength(5);
    expect(contents.map((item) => item.externalId)).toEqual([
      "beijing_couple_golden_v2",
      "hangzhou_couple_golden_v1",
      "chengdu_couple_golden_v1",
      "shanghai_couple_v1",
      "xian_couple_v1",
    ]);
    expect(contents.every((item) => item.status === "published")).toBe(true);
    expect(contents.every((item) => item.reviewStatus === "approved")).toBe(true);
    expect(
      contents.every((item) =>
        item.coverImageUrl?.startsWith(
          `/images/trip-packages/${item.externalId}/`,
        ),
      ),
    ).toBe(true);
    expect(
      contents.every(
        (item) =>
          Array.isArray(item.rawContent.imageBindings) &&
          item.rawContent.validation &&
          item.rawContent.package,
      ),
    ).toBe(true);
  });

  it("keeps Explore to Workspace import usable with display place names", async () => {
    const result = await loadAvailableTripPackages();
    const beijing = result.packages.find(
      (item) => item.packageId === "beijing_couple_golden_v2",
    );

    expect(beijing).toBeTruthy();

    const content = adaptTripPackageToExploreContent(beijing!);
    const draft = buildTripPlanDraftFromExplore(content);
    const firstMorningStop =
      draft.tripPlanSeed.dailyItinerary[0]?.morning[0]?.placeName;

    expect(draft.sourceType).toBe("explore_archive");
    expect(draft.tripPlanSeed.destination).toBe("北京");
    expect(firstMorningStop).toBeTruthy();
    expect(firstMorningStop).not.toMatch(/^poi_/);
  });
});
