import { describe, expect, it } from "vitest";

import {
  loadParsedTripSession,
  loadTripPlanDraft,
  loadTripRequest,
  loadTripRequestDraft,
  PARSED_TRIP_STORAGE_KEY,
  saveParsedTripSession,
  saveTripPlanDraft,
  saveTripRequest,
  saveTripRequestDraft,
  TRIP_DRAFT_STORAGE_KEY,
  TRIP_PLAN_DRAFT_STORAGE_KEY,
  TRIP_REQUEST_STORAGE_KEY,
} from "../../lib/trip/storage";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

const parseResult = {
  parsed: {
    departureCity: "Shenzhen",
    destinationCity: "Xiamen",
    days: 3,
    budget: 2500,
    interests: ["sea"],
    travelStyles: ["relaxed"],
  },
  missingFields: [],
  followUpQuestions: [],
};

describe("trip storage", () => {
  it("returns null when there is no parsed session or draft", () => {
    const storage = new MemoryStorage();

    expect(loadParsedTripSession(storage)).toBeNull();
    expect(loadTripRequestDraft(storage)).toBeNull();
  });

  it("saves and restores a parsed session", () => {
    const storage = new MemoryStorage();

    saveParsedTripSession(
      {
        rawInput: "Go from Shenzhen to Xiamen for 3 days",
        selectedInterests: ["sea"],
        selectedTravelStyles: ["relaxed"],
        parseResult,
      },
      storage,
    );

    expect(loadParsedTripSession(storage)).toMatchObject({
      rawInput: "Go from Shenzhen to Xiamen for 3 days",
      selectedInterests: ["sea"],
      selectedTravelStyles: ["relaxed"],
      parseResult,
    });
  });

  it("clears invalid parsed-session JSON", () => {
    const storage = new MemoryStorage();
    storage.setItem(PARSED_TRIP_STORAGE_KEY, "{bad-json");

    expect(loadParsedTripSession(storage)).toBeNull();
    expect(storage.getItem(PARSED_TRIP_STORAGE_KEY)).toBeNull();
  });

  it("saves and restores a trip request draft", () => {
    const storage = new MemoryStorage();
    const draft = {
      ...parseResult.parsed,
      mustVisitPlaces: ["Gulangyu"],
      accommodationPreference: "Near transit",
    };

    expect(saveTripRequestDraft(draft, storage)).toBe(true);
    expect(loadTripRequestDraft(storage)).toEqual(draft);
  });

  it("saves and restores a normalized trip request", () => {
    const storage = new MemoryStorage();
    const tripRequest = {
      departureCity: "Shenzhen",
      destinationCity: "Xiamen",
      days: 3,
      budget: 2500,
      currency: "CNY",
      interests: ["sea"],
      travelStyles: ["relaxed"],
      mustVisitPlaces: [],
      avoidPlaces: [],
    };

    saveTripRequest(tripRequest, storage);
    expect(loadTripRequest(storage)).toEqual(tripRequest);
  });

  it("a new parsed session clears previous draft and request keys", () => {
    const storage = new MemoryStorage();
    storage.setItem(TRIP_DRAFT_STORAGE_KEY, JSON.stringify({ days: 2 }));
    storage.setItem(TRIP_REQUEST_STORAGE_KEY, JSON.stringify({ days: 2 }));
    storage.setItem(TRIP_PLAN_DRAFT_STORAGE_KEY, JSON.stringify({ tripTitle: "stale" }));

    saveParsedTripSession(
      {
        rawInput: "Go from Shenzhen to Xiamen for 3 days",
        selectedInterests: ["sea"],
        selectedTravelStyles: ["relaxed"],
        parseResult,
      },
      storage,
    );

    expect(storage.getItem(TRIP_DRAFT_STORAGE_KEY)).toBeNull();
    expect(storage.getItem(TRIP_REQUEST_STORAGE_KEY)).toBeNull();
    expect(storage.getItem(TRIP_PLAN_DRAFT_STORAGE_KEY)).toBeNull();
  });

  it("draft and request stay isolated in storage", () => {
    const storage = new MemoryStorage();
    const draft = {
      departureCity: "Shenzhen",
      destinationCity: "Xiamen",
      days: 4,
      budget: 3000,
      interests: ["sea"],
      travelStyles: ["relaxed"],
    };
    const tripRequest = {
      departureCity: "Shenzhen",
      destinationCity: "Xiamen",
      startDate: "2026-07-10",
      endDate: "2026-07-13",
      days: 4,
      budget: 3000,
      currency: "CNY",
      interests: ["sea"],
      travelStyles: ["relaxed"],
      mustVisitPlaces: [],
      avoidPlaces: [],
    };

    expect(saveTripRequestDraft(draft, storage)).toBe(true);
    saveTripRequest(tripRequest, storage);

    expect(loadTripRequestDraft(storage)).toEqual(draft);
    expect(loadTripRequest(storage)).toEqual(tripRequest);
  });

  it("stores and restores a trip plan draft with source metadata", () => {
    const storage = new MemoryStorage();
    const draft = {
      tripTitle: "Explore inspiration draft",
      sourceType: "explore_inspiration" as const,
      tripRequestDraft: {
        destinationCity: "Chengdu",
        days: 3,
        interests: ["spicy", "city"],
        travelStyles: ["couple", "summer"],
      },
      tripPlanSeed: {
        tripTitle: "Explore inspiration draft",
        summary: "summary",
        destination: "Chengdu",
        days: 1,
        travelStyleSummary: "couple · summer",
        weatherSummary: {
          available: false,
          overview: "overview",
          dailyForecast: [],
          alerts: [],
          reminders: ["reminder"],
          dataNote: "note",
        },
        budgetSummary: {
          totalEstimate: "TBD",
          transport: "TBD",
          hotel: "TBD",
          food: "TBD",
          tickets: "TBD",
          localTransport: "TBD",
          flexibleSpending: "TBD",
          note: "note",
        },
        hotelAreaAdvice: [],
        transportAdvice: {
          summary: "summary",
          options: [
            {
              mode: "other" as const,
              pros: ["pro"],
              cons: ["con"],
              recommendation: "recommendation",
            },
          ],
          suggestedPlatforms: [],
          note: "note",
        },
        dailyItinerary: [
          {
            day: 1,
            theme: "Draft",
            routeOrder: ["Chengdu"],
            routeReason: "summary",
            morning: [
              {
                placeName: "Chengdu",
                type: "other" as const,
                reason: "summary",
                guide: ["guide"],
              },
            ],
            afternoon: [],
            evening: [],
            dailyTips: ["tip"],
          },
        ],
        generalTips: ["tip"],
        warnings: ["warning"],
      },
    };

    saveTripPlanDraft(draft, storage);

    expect(loadTripPlanDraft(storage)).toEqual(draft);
    expect(loadTripRequestDraft(storage)).toEqual(draft.tripRequestDraft);
  });
});
