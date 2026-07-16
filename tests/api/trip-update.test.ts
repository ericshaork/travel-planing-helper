import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createTripDetailPatchHandler } from "../../app/api/trips/[tripId]/route";
import { MockLLMProvider } from "../../lib/ai/mock";
import { planTrip } from "../../lib/trip/planner";
import type { TripRequest } from "../../lib/trip/types";
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

async function createTripPlan() {
  const result = await planTrip(
    { tripRequest },
    {
      llmProvider: new MockLLMProvider(),
      weatherProvider: new MockWeatherProvider({
        now: new Date("2026-07-02T00:00:00.000Z"),
      }),
    },
  );

  return result.tripPlan;
}

function patchJson(body: unknown, token?: string) {
  return new Request("http://localhost/api/trips/trip-1", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/trips/[tripId]", () => {
  it("returns 401 when authorization header is missing", async () => {
    const PATCH = createTripDetailPatchHandler(
      () =>
        ({
          auth: {
            getUser: vi.fn(),
          },
          from: vi.fn(),
        }) as never,
    );
    const response = await PATCH(
      patchJson({
        tripRequest,
        tripPlan: await createTripPlan(),
      }),
      {
        params: Promise.resolve({ tripId: "trip-1" }),
      },
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      code: "UNAUTHORIZED",
    });
  });

  it("returns 400 when body is incomplete", async () => {
    const PATCH = createTripDetailPatchHandler(
      () =>
        ({
          auth: {
            getUser: vi.fn(),
          },
          from: vi.fn(),
        }) as never,
    );
    const response = await PATCH(
      patchJson(
        {
          tripPlan: await createTripPlan(),
        },
        "token-123",
      ),
      {
        params: Promise.resolve({ tripId: "trip-1" }),
      },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      code: "UPDATE_TRIP_FAILED",
    });
  });

  it("updates only the current user's trip and ignores body user_id", async () => {
    const tripPlan = await createTripPlan();
    const getUser = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: "user-1",
        },
      },
      error: null,
    });
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "trip-1",
        updated_at: "2026-07-08T09:00:00.000Z",
      },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const eqUser = vi.fn().mockReturnValue({ select });
    const eqTrip = vi.fn().mockReturnValue({ eq: eqUser });
    const update = vi.fn().mockReturnValue({ eq: eqTrip });
    const from = vi.fn().mockReturnValue({ update });
    const PATCH = createTripDetailPatchHandler(
      () =>
        ({
          auth: {
            getUser,
          },
          from,
        }) as never,
    );
    const response = await PATCH(
      patchJson(
        {
          user_id: "attacker-id",
          tripRequest,
          tripPlan,
        },
        "token-123",
      ),
      {
        params: Promise.resolve({ tripId: "trip-1" }),
      },
    );
    const payload = (await response.json()) as {
      ok: true;
      tripId: string;
      updatedAt: string;
    };

    expect(response.status).toBe(200);
    expect(getUser).toHaveBeenCalledWith("token-123");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        title: tripPlan.tripTitle,
        trip_request_json: tripRequest,
        trip_plan_json: tripPlan,
      }),
    );
    expect(eqTrip).toHaveBeenCalledWith("id", "trip-1");
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(payload.tripId).toBe("trip-1");
    expect(payload.updatedAt).toBe("2026-07-08T09:00:00.000Z");
  });

  it("returns 404 when the trip does not exist for this user", async () => {
    const PATCH = createTripDetailPatchHandler(
      () =>
        ({
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: { id: "user-1" } },
              error: null,
            }),
          },
          from: vi.fn().mockReturnValue({
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: null,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }) as never,
    );
    const response = await PATCH(
      patchJson(
        {
          tripRequest,
          tripPlan: await createTripPlan(),
        },
        "token-123",
      ),
      {
        params: Promise.resolve({ tripId: "trip-1" }),
      },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      code: "TRIP_NOT_FOUND",
    });
  });

  it("supports metadata patch for title, status, source_type, and last_opened_at", async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: "user-1",
        },
      },
      error: null,
    });
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "trip-1",
        title: "新的标题",
        destination_city: "厦门",
        start_date: "2026-07-10",
        end_date: "2026-07-12",
        days: 3,
        budget: 2500,
        trip_request_json: {},
        trip_plan_json: {},
        enrichment_json: null,
        weather_summary_json: null,
        cover_image_url: null,
        source_type: "blank_manual",
        status: "archived",
        trip_preferences_json: {},
        local_draft_id: "draft-1",
        last_opened_at: "2026-07-16T08:00:00.000Z",
        created_at: "2026-07-01T08:00:00.000Z",
        updated_at: "2026-07-08T09:00:00.000Z",
      },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const eqUser = vi.fn().mockReturnValue({ select });
    const eqTrip = vi.fn().mockReturnValue({ eq: eqUser });
    const update = vi.fn().mockReturnValue({ eq: eqTrip });
    const PATCH = createTripDetailPatchHandler(
      () =>
        ({
          auth: {
            getUser,
          },
          from: vi.fn().mockReturnValue({ update }),
        }) as never,
    );

    const response = await PATCH(
      patchJson(
        {
          title: "新的标题",
          status: "archived",
          source_type: "blank_manual",
          trip_preferences_json: {},
          local_draft_id: "draft-1",
          last_opened_at: "2026-07-16T08:00:00.000Z",
        },
        "token-123",
      ),
      {
        params: Promise.resolve({ tripId: "trip-1" }),
      },
    );
    const payload = (await response.json()) as {
      ok: true;
      trip: {
        title: string;
        status: string;
        source_type: string;
      };
    };

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "新的标题",
        status: "archived",
        source_type: "blank_manual",
        local_draft_id: "draft-1",
      }),
    );
    expect(eqTrip).toHaveBeenCalledWith("id", "trip-1");
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(payload.trip.title).toBe("新的标题");
    expect(payload.trip.status).toBe("archived");
    expect(payload.trip.source_type).toBe("blank_manual");
  });

  it("rejects invalid metadata status/source_type", async () => {
    const PATCH = createTripDetailPatchHandler(
      () =>
        ({
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: { id: "user-1" } },
              error: null,
            }),
          },
          from: vi.fn(),
        }) as never,
    );

    const response = await PATCH(
      patchJson(
        {
          status: "bad-status",
          source_type: "bad-source",
        },
        "token-123",
      ),
      {
        params: Promise.resolve({ tripId: "trip-1" }),
      },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      code: "UPDATE_TRIP_FAILED",
    });
  });
});
