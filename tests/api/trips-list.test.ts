import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createTripsGetHandler } from "../../app/api/trips/route";

function getRequest(token?: string, query = "") {
  return new Request(`http://localhost/api/trips${query}`, {
    method: "GET",
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined,
  });
}

describe("GET /api/trips", () => {
  it("returns 401 when authorization header is missing", async () => {
    const GET = createTripsGetHandler(
      () =>
        ({
          auth: {
            getUser: vi.fn(),
          },
          from: vi.fn(),
        }) as never,
    );
    const response = await GET(getRequest());
    const payload = (await response.json()) as {
      ok: boolean;
      code?: string;
    };

    expect(response.status).toBe(401);
    expect(payload).toEqual({
      ok: false,
      code: "UNAUTHORIZED",
      message: "请先登录，再来看你保存过的行程。",
    });
  });

  it("lists only the current user's trips with metadata fields", async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: "user-1",
        },
      },
      error: null,
    });
    const orderCreatedAt = vi.fn().mockResolvedValue({
      data: [
        {
          id: "trip-2",
          title: "厦门 3 天慢慢玩",
          destination_city: "厦门",
          start_date: "2026-07-10",
          end_date: "2026-07-12",
          days: 3,
          budget: 2500,
          cover_image_url: null,
          source_type: "ai_generated",
          status: "saved",
          trip_preferences_json: {},
          local_draft_id: null,
          last_opened_at: null,
          created_at: "2026-07-01T08:00:00.000Z",
          updated_at: "2026-07-02T08:00:00.000Z",
        },
      ],
      error: null,
    });
    const orderUpdatedAt = vi.fn().mockReturnValue({ order: orderCreatedAt });
    const orderLastOpenedAt = vi.fn().mockReturnValue({ order: orderUpdatedAt });
    const eq = vi.fn().mockReturnValue({ order: orderLastOpenedAt });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    const GET = createTripsGetHandler(
      () =>
        ({
          auth: {
            getUser,
          },
          from,
        }) as never,
    );
    const response = await GET(getRequest("token-123", "?user_id=attacker-id"));
    const payload = (await response.json()) as {
      ok: true;
      trips: Array<{ id: string }>;
    };

    expect(response.status).toBe(200);
    expect(getUser).toHaveBeenCalledWith("token-123");
    expect(select).toHaveBeenCalledWith(
      "id,title,destination_city,start_date,end_date,days,budget,cover_image_url,source_type,status,trip_preferences_json,local_draft_id,last_opened_at,created_at,updated_at",
    );
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(orderLastOpenedAt).toHaveBeenCalledWith("last_opened_at", {
      ascending: false,
      nullsFirst: false,
    });
    expect(orderUpdatedAt).toHaveBeenCalledWith("updated_at", {
      ascending: false,
    });
    expect(orderCreatedAt).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
    expect(payload.ok).toBe(true);
    expect(payload.trips[0]?.id).toBe("trip-2");
  });

  it("does not request heavy JSON fields in the list query", async () => {
    const select = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      }),
    });
    const GET = createTripsGetHandler(
      () =>
        ({
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: { id: "user-1" } },
              error: null,
            }),
          },
          from: vi.fn().mockReturnValue({ select }),
        }) as never,
    );

    await GET(getRequest("token-123"));

    const selectedFields = select.mock.calls[0]?.[0] as string;
    expect(selectedFields).not.toContain("trip_plan_json");
    expect(selectedFields).not.toContain("trip_request_json");
    expect(selectedFields).not.toContain("enrichment_json");
    expect(selectedFields).not.toContain("weather_summary_json");
  });

  it("returns a friendly error when trip lookup fails", async () => {
    const GET = createTripsGetHandler(
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
                order: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({
                      data: null,
                      error: new Error("db failed"),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }) as never,
    );
    const response = await GET(getRequest("token-123"));
    const payload = (await response.json()) as {
      ok: boolean;
      code?: string;
      message?: string;
    };

    expect(response.status).toBe(500);
    expect(payload).toEqual({
      ok: false,
      code: "LIST_TRIPS_FAILED",
      message: "暂时没拉到你的行程列表，请稍后再试。",
    });
  });

  it("supports status and source_type filters plus title search", async () => {
    const orderCreatedAt = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });
    const orderUpdatedAt = vi.fn().mockReturnValue({ order: orderCreatedAt });
    const orderLastOpenedAt = vi.fn().mockReturnValue({ order: orderUpdatedAt });
    const ilike = vi.fn().mockReturnValue({ order: orderLastOpenedAt });
    const eqSourceType = vi.fn().mockReturnValue({ ilike });
    const eqStatus = vi.fn().mockReturnValue({ eq: eqSourceType });
    const eqUser = vi.fn().mockReturnValue({ eq: eqStatus });
    const select = vi.fn().mockReturnValue({ eq: eqUser });
    const GET = createTripsGetHandler(
      () =>
        ({
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: { id: "user-1" } },
              error: null,
            }),
          },
          from: vi.fn().mockReturnValue({ select }),
        }) as never,
    );

    const response = await GET(
      getRequest(
        "token-123",
        "?search=%E5%8E%A6%E9%97%A8&status=archived&source_type=blank_manual",
      ),
    );

    expect(response.status).toBe(200);
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqStatus).toHaveBeenCalledWith("status", "archived");
    expect(eqSourceType).toHaveBeenCalledWith("source_type", "blank_manual");
    expect(ilike).toHaveBeenCalledWith("title", "%厦门%");
  });
});
