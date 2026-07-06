import { describe, expect, it } from "vitest";

import {
  formatWorkspaceDateRange,
  getWorkspaceEnrichmentStatusMeta,
} from "../../lib/trip/workspace-topbar";

describe("workspace top bar helpers", () => {
  it("formats date ranges from trip request first", () => {
    expect(
      formatWorkspaceDateRange(
        {
          departureCity: "深圳",
          destinationCity: "厦门",
          startDate: "2026-07-10",
          endDate: "2026-07-13",
          days: 4,
          budget: 3000,
          currency: "CNY",
          interests: ["海边"],
          travelStyles: ["轻松"],
          mustVisitPlaces: [],
          avoidPlaces: [],
        },
        {
          days: 4,
          dailyItinerary: [],
        },
      ),
    ).toContain("2026");
  });

  it("falls back to trip plan dates or day count", () => {
    expect(
      formatWorkspaceDateRange(null, {
        days: 3,
        dailyItinerary: [
          {
            day: 1,
            theme: "A",
            routeOrder: [],
            routeReason: "",
            morning: [],
            afternoon: [],
            evening: [],
            dailyTips: [],
            date: "2026-08-01",
          },
        ],
      }),
    ).toContain("2026");

    expect(
      formatWorkspaceDateRange(null, {
        days: 2,
        dailyItinerary: [],
      }),
    ).toBe("2 天，日期待确认");
  });

  it("maps enrichment states to compact status copy", () => {
    expect(getWorkspaceEnrichmentStatusMeta("ready")).toEqual({
      label: "路线洞察已加载",
      tone: "ready",
    });
    expect(getWorkspaceEnrichmentStatusMeta("error").tone).toBe("warning");
    expect(getWorkspaceEnrichmentStatusMeta("loading").label).toBe(
      "路线洞察整理中",
    );
  });
});
