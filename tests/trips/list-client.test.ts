import { describe, expect, it, vi } from "vitest";

import { listSavedTrips } from "../../lib/trips/list-client";

describe("listSavedTrips", () => {
  it("sends a bearer token when requesting /api/trips", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        ok: true,
        trips: [
          {
            id: "trip-1",
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
      }),
    });

    const trips = await listSavedTrips({
      fetchImpl,
      getAccessToken: async () => "token-123",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/trips",
      expect.objectContaining({
        method: "GET",
        headers: {
          Authorization: "Bearer token-123",
        },
      }),
    );
    expect(trips).toHaveLength(1);
  });

  it("includes search, status, and source_type query params", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        ok: true,
        trips: [],
      }),
    });

    await listSavedTrips({
      fetchImpl,
      getAccessToken: async () => "token-123",
      search: "厦门",
      status: "archived",
      sourceType: "explore_import",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/trips?search=%E5%8E%A6%E9%97%A8&status=archived&source_type=explore_import",
      expect.any(Object),
    );
  });

  it("requires login before listing trips", async () => {
    await expect(
      listSavedTrips({
        getAccessToken: async () => null,
      }),
    ).rejects.toThrow("请先登录");
  });

  it("surfaces unauthorized api messages", async () => {
    await expect(
      listSavedTrips({
        getAccessToken: async () => "token-123",
        fetchImpl: vi.fn().mockResolvedValue({
          ok: false,
          json: vi.fn().mockResolvedValue({
            ok: false,
            code: "UNAUTHORIZED",
            message: "请先登录，再来看你保存过的行程。",
          }),
        }),
      }),
    ).rejects.toThrow("请先登录，再来看你保存过的行程。");
  });

  it("surfaces generic list api errors", async () => {
    await expect(
      listSavedTrips({
        getAccessToken: async () => "token-123",
        fetchImpl: vi.fn().mockResolvedValue({
          ok: false,
          json: vi.fn().mockResolvedValue({
            ok: false,
            code: "LIST_TRIPS_FAILED",
            message: "暂时没拉到你的行程列表，请稍后再试。",
          }),
        }),
      }),
    ).rejects.toThrow("暂时没拉到你的行程列表，请稍后再试。");
  });
});
