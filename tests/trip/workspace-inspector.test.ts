import { describe, expect, it } from "vitest";

import type { DayRouteInsight } from "../../lib/trip/route-insight";
import {
  buildWorkspaceInsightStats,
  formatRouteDistance,
  formatRouteDuration,
  isFallbackLeg,
} from "../../lib/trip/workspace-inspector";

const insight: DayRouteInsight = {
  dayNumber: 2,
  dayTitle: "City Walk",
  date: "2026-07-12",
  routeSummary: {
    dayIndex: 2,
    totalDistanceMeters: 4200,
    totalDurationMinutes: 78,
    unresolvedPlaces: ["Museum Annex"],
    warnings: [],
    legs: [
      {
        fromName: "A",
        toName: "B",
        distanceMeters: 1200,
        durationMinutes: 16,
        mode: "walking",
        provider: "amap",
      },
      {
        fromName: "B",
        toName: "C",
        distanceMeters: 3000,
        durationMinutes: 62,
        mode: "transit",
        provider: "mock",
      },
    ],
  },
  mapPoints: [
    {
      id: "1",
      name: "A",
      dayIndex: 2,
      slot: "morning",
      itemIndex: 0,
      itemType: "attraction",
      resolved: true,
    },
    {
      id: "2",
      name: "B",
      dayIndex: 2,
      slot: "afternoon",
      itemIndex: 1,
      itemType: "food",
      resolved: false,
    },
  ],
  weatherImpacts: [],
};

describe("workspace inspector helpers", () => {
  it("formats route distance and duration for inspector cards", () => {
    expect(formatRouteDistance(980)).toBe("980 m");
    expect(formatRouteDistance(4200)).toBe("4.2 km");
    expect(formatRouteDuration(45)).toBe("45 分钟");
    expect(formatRouteDuration(78)).toBe("1 小时 18 分钟");
  });

  it("builds resolved and unresolved point counts safely", () => {
    expect(buildWorkspaceInsightStats(insight)).toEqual({
      resolvedPoints: 1,
      unresolvedPoints: 1,
      totalDistanceMeters: 4200,
      totalDurationMinutes: 78,
    });

    expect(buildWorkspaceInsightStats(undefined)).toEqual({
      resolvedPoints: 0,
      unresolvedPoints: 0,
      totalDistanceMeters: 0,
      totalDurationMinutes: 0,
    });
  });

  it("marks mock route legs as fallback estimates", () => {
    expect(isFallbackLeg(insight.routeSummary!.legs[0]!)).toBe(false);
    expect(isFallbackLeg(insight.routeSummary!.legs[1]!)).toBe(true);
  });
});
