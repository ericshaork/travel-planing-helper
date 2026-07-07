import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createTripDetailGetHandler } from "../../app/api/trips/[tripId]/route";
import type { SavedTripDetail } from "../../lib/trips/types";

function getRequest(token?: string) {
  return new Request("http://localhost/api/trips/trip-1", {
    method: "GET",
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined,
  });
}

const savedTripDetail: SavedTripDetail = {
  id: "trip-1",
  title: "厦门 3 天慢慢玩",
  destination_city: "厦门",
  start_date: "2026-07-10",
  end_date: "2026-07-12",
  days: 3,
  budget: 2500,
  cover_image_url: null,
  created_at: "2026-07-01T08:00:00.000Z",
  updated_at: "2026-07-02T08:00:00.000Z",
  trip_request_json: {
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
  },
  trip_plan_json: {
    tripTitle: "厦门 3 天慢慢玩",
    summary: "给自由行新手的一版海边慢游路线。",
    destination: "厦门",
    days: 3,
    travelStyleSummary: "少折腾，留出发呆和吃饭时间。",
    weatherSummary: {
      available: true,
      overview: "有海风，午后注意防晒。",
      dailyForecast: [],
      alerts: [],
      reminders: [],
      dataNote: "mock",
    },
    budgetSummary: {
      totalEstimate: "约 2500 元",
      transport: "800 元",
      hotel: "900 元",
      food: "400 元",
      tickets: "200 元",
      localTransport: "100 元",
      flexibleSpending: "100 元",
      note: "按轻松玩估算。",
    },
    hotelAreaAdvice: [],
    transportAdvice: {
      summary: "步行加打车就够用。",
      options: [
        {
          mode: "other",
          pros: ["省心"],
          cons: ["高峰期会慢一些"],
          recommendation: "按当天节奏灵活调整。",
        },
      ],
      suggestedPlatforms: [],
      note: "mock",
    },
    dailyItinerary: [
      {
        day: 1,
        date: "2026-07-10",
        theme: "海边热身",
        routeOrder: ["沙坡尾"],
        routeReason: "第一天先走轻松路线。",
        morning: [],
        afternoon: [],
        evening: [],
        dailyTips: [],
      },
      {
        day: 2,
        date: "2026-07-11",
        theme: "城市散步",
        routeOrder: ["八市"],
        routeReason: "把吃和逛串起来。",
        morning: [],
        afternoon: [],
        evening: [],
        dailyTips: [],
      },
      {
        day: 3,
        date: "2026-07-12",
        theme: "收尾返程",
        routeOrder: ["中山路"],
        routeReason: "返程前留一段轻松时间。",
        morning: [],
        afternoon: [],
        evening: [],
        dailyTips: [],
      },
    ],
    generalTips: [],
    warnings: [],
  },
  enrichment_json: {
    daySummaries: [],
    mapPoints: [],
    warnings: [],
  },
  weather_summary_json: {
    available: true,
    overview: "有海风，午后注意防晒。",
    dailyForecast: [],
    alerts: [],
    reminders: [],
    dataNote: "mock",
  },
};

describe("GET /api/trips/[tripId]", () => {
  it("returns 401 when authorization header is missing", async () => {
    const GET = createTripDetailGetHandler(
      () =>
        ({
          auth: {
            getUser: vi.fn(),
          },
          from: vi.fn(),
        }) as never,
    );
    const response = await GET(getRequest(), {
      params: Promise.resolve({ tripId: "trip-1" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      code: "UNAUTHORIZED",
      message: "请先登录，再打开这条历史行程。",
    });
  });

  it("loads only the current user's trip with full JSON fields", async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: "user-1",
        },
      },
      error: null,
    });
    const maybeSingle = vi.fn().mockResolvedValue({
      data: savedTripDetail,
      error: null,
    });
    const eqUser = vi.fn().mockReturnValue({ maybeSingle });
    const eqTrip = vi.fn().mockReturnValue({ eq: eqUser });
    const select = vi.fn().mockReturnValue({ eq: eqTrip });
    const from = vi.fn().mockReturnValue({ select });
    const GET = createTripDetailGetHandler(
      () =>
        ({
          auth: {
            getUser,
          },
          from,
        }) as never,
    );
    const response = await GET(getRequest("token-123"), {
      params: Promise.resolve({ tripId: "trip-1" }),
    });
    const payload = (await response.json()) as {
      ok: true;
      trip: SavedTripDetail;
    };

    expect(response.status).toBe(200);
    expect(getUser).toHaveBeenCalledWith("token-123");
    expect(select).toHaveBeenCalledWith(
      "id,title,destination_city,start_date,end_date,days,budget,trip_request_json,trip_plan_json,enrichment_json,weather_summary_json,cover_image_url,created_at,updated_at",
    );
    expect(eqTrip).toHaveBeenCalledWith("id", "trip-1");
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(payload.ok).toBe(true);
    expect(payload.trip.trip_plan_json.tripTitle).toBe("厦门 3 天慢慢玩");
    expect(payload.trip.trip_request_json.destinationCity).toBe("厦门");
  });

  it("returns 404 when the trip does not exist for this user", async () => {
    const GET = createTripDetailGetHandler(
      () =>
        ({
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: { id: "user-1" } },
              error: null,
            }),
          },
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }) as never,
    );
    const response = await GET(getRequest("token-123"), {
      params: Promise.resolve({ tripId: "trip-1" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      code: "TRIP_NOT_FOUND",
      message: "这条行程不存在，或你暂时没有权限打开它。",
    });
  });
});
