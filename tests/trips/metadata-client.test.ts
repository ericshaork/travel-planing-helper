import { describe, expect, it, vi } from "vitest";

import {
  markSavedTripOpened,
  patchSavedTripMetadata,
} from "../../lib/trips/metadata-client";
import { validateSavedTripTitle } from "../../lib/trips/metadata";

describe("patchSavedTripMetadata", () => {
  it("calls PATCH /api/trips/[tripId] for rename", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        ok: true,
        trip: {
          id: "trip-1",
          title: "新的标题",
        },
      }),
    });

    const trip = await patchSavedTripMetadata(
      "trip-1",
      { title: "新的标题" },
      {
        fetchImpl,
        getAccessToken: async () => "token-123",
      },
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/trips/trip-1",
      expect.objectContaining({
        method: "PATCH",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
        }),
        body: JSON.stringify({ title: "新的标题" }),
      }),
    );
    expect(trip.title).toBe("新的标题");
  });

  it("requires login before patching metadata", async () => {
    await expect(
      patchSavedTripMetadata("trip-1", { title: "新的标题" }, {
        getAccessToken: async () => null,
      }),
    ).rejects.toThrow("请先登录");
  });
});

describe("markSavedTripOpened", () => {
  it("patches last_opened_at with the provided timestamp", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        ok: true,
        trip: {
          id: "trip-1",
          last_opened_at: "2026-07-16T10:00:00.000Z",
        },
      }),
    });

    await markSavedTripOpened("trip-1", {
      fetchImpl,
      getAccessToken: async () => "token-123",
      now: () => "2026-07-16T10:00:00.000Z",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/trips/trip-1",
      expect.objectContaining({
        body: JSON.stringify({
          last_opened_at: "2026-07-16T10:00:00.000Z",
        }),
      }),
    );
  });
});

describe("validateSavedTripTitle", () => {
  it("returns chinese validation error for blank titles", () => {
    expect(validateSavedTripTitle("   ")).toBe("标题不能为空。");
  });
});
