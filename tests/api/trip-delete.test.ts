import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createTripDetailDeleteHandler } from "../../app/api/trips/[tripId]/route";

function deleteRequest(token?: string) {
  return new Request("http://localhost/api/trips/trip-1", {
    method: "DELETE",
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined,
  });
}

describe("DELETE /api/trips/[tripId]", () => {
  it("returns 401 when authorization header is missing", async () => {
    const DELETE = createTripDetailDeleteHandler(
      () =>
        ({
          auth: {
            getUser: vi.fn(),
          },
          from: vi.fn(),
        }) as never,
    );
    const response = await DELETE(deleteRequest(), {
      params: Promise.resolve({ tripId: "trip-1" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      code: "UNAUTHORIZED",
    });
  });

  it("deletes only the current user's trip", async () => {
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
      },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const eqUser = vi.fn().mockReturnValue({ select });
    const eqTrip = vi.fn().mockReturnValue({ eq: eqUser });
    const deleteFn = vi.fn().mockReturnValue({ eq: eqTrip });
    const from = vi.fn().mockReturnValue({ delete: deleteFn });
    const DELETE = createTripDetailDeleteHandler(
      () =>
        ({
          auth: {
            getUser,
          },
          from,
        }) as never,
    );
    const response = await DELETE(deleteRequest("token-123"), {
      params: Promise.resolve({ tripId: "trip-1" }),
    });

    expect(response.status).toBe(200);
    expect(getUser).toHaveBeenCalledWith("token-123");
    expect(eqTrip).toHaveBeenCalledWith("id", "trip-1");
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("returns 404 when the trip does not exist for this user", async () => {
    const DELETE = createTripDetailDeleteHandler(
      () =>
        ({
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: { id: "user-1" } },
              error: null,
            }),
          },
          from: vi.fn().mockReturnValue({
            delete: vi.fn().mockReturnValue({
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
    const response = await DELETE(deleteRequest("token-123"), {
      params: Promise.resolve({ tripId: "trip-1" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      code: "TRIP_NOT_FOUND",
    });
  });
});
