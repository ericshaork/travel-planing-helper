import { describe, expect, it, vi } from "vitest";

vi.mock("../../lib/supabase/browser", () => ({
  createSupabaseBrowserClient: () => ({ auth: {} }),
}));

vi.mock("../../lib/supabase/auth-client", () => ({
  getBrowserAccessToken: vi.fn().mockResolvedValue("token-123"),
}));

import { postGenerateTrip } from "../../lib/ai/generate-client";

describe("postGenerateTrip", () => {
  it("已登录时会附带 Authorization header", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn(),
    });

    await postGenerateTrip(
      {
        tripRequest: {
          destinationCity: "厦门",
        },
      },
      {
        fetchImpl: fetchImpl as never,
      },
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/generate-trip",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
        }),
      }),
    );
  });

  it("取 token 失败时会退回匿名请求，不阻断生成", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn(),
    });

    await postGenerateTrip(
      {
        tripRequest: {
          destinationCity: "厦门",
        },
      },
      {
        fetchImpl: fetchImpl as never,
        getAccessToken: vi.fn().mockRejectedValue(new Error("session failed")),
      },
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/generate-trip",
      expect.objectContaining({
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );
  });
});
