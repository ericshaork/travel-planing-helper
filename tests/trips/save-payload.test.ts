import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { MockLLMProvider } from "../../lib/ai/mock";
import { planTrip } from "../../lib/trip/planner";
import type { TripRequest } from "../../lib/trip/types";
import {
  buildSavedTripInsert,
  mapWorkspaceSourceTypeToTripSourceType,
} from "../../lib/trips/save-payload";
import type { SaveTripRequestPayload } from "../../lib/trips/types";
import { MockWeatherProvider } from "../../lib/weather/mock";

const tripRequest: TripRequest = {
  departureCity: "深圳",
  destinationCity: "厦门",
  startDate: "2026-07-10",
  endDate: "2026-07-12",
  days: 3,
  budget: 2500,
  currency: "CNY",
  interests: ["海边", "美食"],
  travelStyles: ["轻松"],
  mustVisitPlaces: [],
  avoidPlaces: [],
};

async function createPayload(): Promise<SaveTripRequestPayload> {
  const result = await planTrip(
    { tripRequest },
    {
      llmProvider: new MockLLMProvider(),
      weatherProvider: new MockWeatherProvider({
        now: new Date("2026-07-02T00:00:00.000Z"),
      }),
    },
  );

  return {
    tripRequest,
    tripPlan: result.tripPlan,
  };
}

describe("buildSavedTripInsert", () => {
  it("maps current request and plan into trip_plans insert payload", async () => {
    const payload = await createPayload();
    const insert = buildSavedTripInsert("user-1", payload);

    expect(insert).toMatchObject({
      user_id: "user-1",
      destination_city: "厦门",
      start_date: "2026-07-10",
      end_date: "2026-07-12",
      days: 3,
      budget: 2500,
      trip_request_json: payload.tripRequest,
      trip_plan_json: payload.tripPlan,
      enrichment_json: null,
      weather_summary_json: payload.tripPlan.weatherSummary,
      source_type: "ai_generated",
      status: "saved",
      local_draft_id: null,
    });
    expect(insert.title).toBe(payload.tripPlan.tripTitle);
  });

  it("stores enrichment and prefers enrichment weather summary when provided", async () => {
    const payload = await createPayload();
    const insert = buildSavedTripInsert("user-1", {
      ...payload,
      tripEnrichment: {
        enrichment: {
          daySummaries: [],
          mapPoints: [],
          warnings: [],
        },
        weatherSummary: {
          city: "厦门",
          available: true,
          overview: "下雨天别排太满",
          daySummaries: [],
          impacts: [],
          warnings: [],
          alerts: [],
        },
      },
    });

    expect(insert.enrichment_json).toEqual({
      daySummaries: [],
      mapPoints: [],
      warnings: [],
    });
    expect(insert.weather_summary_json).toEqual({
      city: "厦门",
      available: true,
      overview: "下雨天别排太满",
      daySummaries: [],
      impacts: [],
      warnings: [],
      alerts: [],
    });
  });

  it("writes source_type, status, and local_draft_id from save metadata", async () => {
    const payload = await createPayload();
    const insert = buildSavedTripInsert("user-1", {
      ...payload,
      saveMetadata: {
        sourceType: "blank_manual",
        status: "saved",
        localDraftId: "local-draft-1",
      },
    });

    expect(insert.source_type).toBe("blank_manual");
    expect(insert.status).toBe("saved");
    expect(insert.local_draft_id).toBe("local-draft-1");
  });
});

describe("mapWorkspaceSourceTypeToTripSourceType", () => {
  it("maps AI, blank, and explore workspace sources to database source_type", () => {
    expect(mapWorkspaceSourceTypeToTripSourceType("ai_generated")).toBe(
      "ai_generated",
    );
    expect(mapWorkspaceSourceTypeToTripSourceType("blank_manual")).toBe(
      "blank_manual",
    );
    expect(mapWorkspaceSourceTypeToTripSourceType("explore_import")).toBe(
      "explore_import",
    );
  });

  it("does not map saved_trip directly into trip_plans.source_type", () => {
    expect(mapWorkspaceSourceTypeToTripSourceType("saved_trip")).toBeUndefined();
  });
});
