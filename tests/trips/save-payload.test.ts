import { describe, expect, it } from "vitest";
import { vi } from "vitest";

vi.mock("server-only", () => ({}));

import { MockLLMProvider } from "../../lib/ai/mock";
import { planTrip } from "../../lib/trip/planner";
import type { TripRequest } from "../../lib/trip/types";
import { buildSavedTripInsert } from "../../lib/trips/save-payload";
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
});
