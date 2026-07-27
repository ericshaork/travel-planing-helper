import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  loadAvailableTripPackages,
  loadTripPackage,
} from "../../lib/trip-packages/loader";
import { AVAILABLE_TRIP_PACKAGE_IDS } from "../../lib/trip-packages/types";

describe("trip package loader", () => {
  it("loads the five available trip packages without mutating package files", async () => {
    const result = await loadAvailableTripPackages();

    expect(result.issues).toEqual([]);
    expect(result.packages.map((item) => item.packageId)).toEqual(
      AVAILABLE_TRIP_PACKAGE_IDS,
    );
    expect(result.packages).toHaveLength(5);
    expect(
      result.packages.every((item) => item.assemblyReport.status === "passed"),
    ).toBe(true);
  });

  it("loads a single package by package id", async () => {
    const tripPackage = await loadTripPackage("beijing_couple_golden_v2");

    expect(tripPackage.packageId).toBe("beijing_couple_golden_v2");
    expect(tripPackage.manifest.package_id).toBe("beijing_couple_golden_v2");
    expect(tripPackage.explorePlan.daily_itinerary?.length).toBeGreaterThan(0);
    expect(tripPackage.imageManifest.images?.length).toBeGreaterThan(0);
    expect(tripPackage.imageAssetFiles.length).toBeGreaterThan(0);
  });
});
