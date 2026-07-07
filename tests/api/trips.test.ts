import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createTripsPostHandler } from "../../app/api/trips/route";
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

function postJson(body: unknown, token?: string) {
  return new Request("http://localhost/api/trips", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/trips", () => {
  it("uses auth user id instead of trusting body fields", async () => {
    const tripPlan = await createTripPlan();
    const getUser = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: "user-1",
        },
      },
      error: null,
    });
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "trip-1",
      },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    const from = vi.fn().mockReturnValue({ insert });
    const POST = createTripsPostHandler(
      () =>
        ({
          auth: {
            getUser,
          },
          from,
        }) as never,
    );
    const response = await POST(
      postJson(
        {
          user_id: "attacker-id",
          tripRequest,
          tripPlan,
        },
        "token-123",
      ),
    );
    const payload = (await response.json()) as {
      tripId: string;
    };

    expect(response.status).toBe(200);
    expect(getUser).toHaveBeenCalledWith("token-123");
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        trip_request_json: tripRequest,
        trip_plan_json: tripPlan,
      }),
    );
    expect(payload.tripId).toBe("trip-1");
  });

  it("returns 401 when authorization header is missing", async () => {
    const POST = createTripsPostHandler(
      () =>
        ({
          auth: {
            getUser: vi.fn(),
          },
          from: vi.fn(),
        }) as never,
    );
    const response = await POST(
      postJson({
        tripRequest,
        tripPlan: await createTripPlan(),
      }),
    );
    const payload = (await response.json()) as {
      error?: {
        code?: string;
      };
    };

    expect(response.status).toBe(401);
    expect(payload.error?.code).toBe("UNAUTHORIZED");
  });

  it("returns INVALID_INPUT when body is incomplete", async () => {
    const POST = createTripsPostHandler(
      () =>
        ({
          auth: {
            getUser: vi.fn(),
          },
          from: vi.fn(),
        }) as never,
    );
    const response = await POST(
      postJson(
        {
          tripPlan: await createTripPlan(),
        },
        "token-123",
      ),
    );
    const payload = (await response.json()) as {
      error?: {
        code?: string;
        message?: string;
      };
    };

    expect(response.status).toBe(400);
    expect(payload.error?.code).toBe("INVALID_INPUT");
    expect(payload.error?.message).toBe("当前方案内容不完整，暂时还不能保存。");
  });
});
