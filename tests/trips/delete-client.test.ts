import { describe, expect, it, vi } from "vitest";

import { deleteSavedTripFromCloud } from "../../lib/trips/delete-client";

describe("deleteSavedTripFromCloud", () => {
  it("deletes the trip with bearer token", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        ok: true,
      }),
    });

    const response = await deleteSavedTripFromCloud("trip-1", {
      fetchImpl,
      getAccessToken: async () => "token-123",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/trips/trip-1",
      expect.objectContaining({
        method: "DELETE",
        headers: {
          Authorization: "Bearer token-123",
        },
      }),
    );
    expect(response).toEqual({ ok: true });
  });

  it("requires login before deleting", async () => {
    await expect(
      deleteSavedTripFromCloud("trip-1", {
        getAccessToken: async () => null,
      }),
    ).rejects.toThrow("请先登录");
  });
});
