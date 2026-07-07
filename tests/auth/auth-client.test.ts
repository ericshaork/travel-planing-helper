import { describe, expect, it, vi } from "vitest";

import {
  getBrowserAccessToken,
  getBrowserAuthStatus,
  resolveAuthStatusFromSession,
  resolveAuthStatusFromUser,
  signInWithMagicLink,
  signOutBrowserSession,
} from "../../lib/supabase/auth-client";

describe("supabase auth client helpers", () => {
  it("signInWithMagicLink calls signInWithOtp and normalizes email", async () => {
    const signInWithOtp = vi.fn().mockResolvedValue({ error: null });

    const result = await signInWithMagicLink(
      "  USER@Example.com ",
      "http://localhost:3000/",
      {
        auth: {
          signInWithOtp,
        },
      } as never,
    );

    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "user@example.com",
      options: {
        emailRedirectTo: "http://localhost:3000/",
        shouldCreateUser: true,
      },
    });
    expect(result).toEqual({
      email: "user@example.com",
    });
  });

  it("signInWithMagicLink surfaces a friendly error", async () => {
    const signInWithOtp = vi
      .fn()
      .mockResolvedValue({ error: new Error("rate limit") });

    await expect(
      signInWithMagicLink("user@example.com", "http://localhost:3000/", {
        auth: {
          signInWithOtp,
        },
      } as never),
    ).rejects.toThrow("rate limit");
  });

  it("signOutBrowserSession calls signOut", async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });

    await signOutBrowserSession({
      auth: {
        signOut,
      },
    } as never);

    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("getBrowserAuthStatus maps getUser result to authenticated", async () => {
    const status = await getBrowserAuthStatus({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "user-1",
              email: "user@example.com",
            },
          },
          error: null,
        }),
      },
    } as never);

    expect(status).toEqual({
      status: "authenticated",
      user: {
        id: "user-1",
        email: "user@example.com",
      },
      error: null,
    });
  });

  it("getBrowserAccessToken returns the current access token", async () => {
    const accessToken = await getBrowserAccessToken({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              access_token: "token-123",
            },
          },
          error: null,
        }),
      },
    } as never);

    expect(accessToken).toBe("token-123");
  });

  it("getBrowserAccessToken surfaces a friendly session error", async () => {
    await expect(
      getBrowserAccessToken({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: {
              session: null,
            },
            error: new Error("session unavailable"),
          }),
        },
      } as never),
    ).rejects.toThrow("session unavailable");
  });

  it("resolveAuthStatusFromUser and resolveAuthStatusFromSession handle anonymous users", () => {
    expect(resolveAuthStatusFromUser(null)).toEqual({
      status: "anonymous",
      user: null,
      error: null,
    });

    expect(resolveAuthStatusFromSession(null)).toEqual({
      status: "anonymous",
      user: null,
      error: null,
    });
  });
});
