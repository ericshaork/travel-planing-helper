import { describe, expect, it, vi } from "vitest";

import {
  buildMagicLinkRedirectUrl,
  getBrowserAccessToken,
  getBrowserAuthStatus,
  normalizeMagicLinkRedirectUrl,
  resolveMagicLinkBaseUrl,
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

  it("buildMagicLinkRedirectUrl uses NEXT_PUBLIC_SITE_URL when configured", () => {
    expect(
      buildMagicLinkRedirectUrl("/workspace", {
        NEXT_PUBLIC_SITE_URL: "https://wanderly.example.com",
      }),
    ).toBe("https://wanderly.example.com/workspace");
  });

  it("buildMagicLinkRedirectUrl falls back to localhost in non-browser tests", () => {
    expect(buildMagicLinkRedirectUrl("/login")).toBe("http://localhost:3000/login");
  });

  it("buildMagicLinkRedirectUrl sanitizes unsafe returnTo values", () => {
    expect(
      buildMagicLinkRedirectUrl("https://evil.example.com" as never, {
        NEXT_PUBLIC_SITE_URL: "https://wanderly.example.com/app",
      }),
    ).toBe("https://wanderly.example.com/");
  });

  it("buildMagicLinkRedirectUrl keeps path slashes unencoded", () => {
    const redirectUrl = buildMagicLinkRedirectUrl("/explore", {
      NEXT_PUBLIC_SITE_URL: "https://wanderly.example.com",
    });

    expect(redirectUrl).toBe("https://wanderly.example.com/explore");
    expect(redirectUrl).not.toContain("%2F");
  });

  it("normalizeMagicLinkRedirectUrl repairs encoded path segments", () => {
    expect(
      normalizeMagicLinkRedirectUrl("https://wanderly.example.com%2Fexplore"),
    ).toBe("https://wanderly.example.com/explore");
  });

  it("resolveMagicLinkBaseUrl ignores invalid NEXT_PUBLIC_SITE_URL values", () => {
    expect(
      resolveMagicLinkBaseUrl({
        NEXT_PUBLIC_SITE_URL: "not-a-url",
      }),
    ).toBe("http://localhost:3000");
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

  it("signInWithMagicLink normalizes malformed encoded redirect URLs before sending", async () => {
    const signInWithOtp = vi.fn().mockResolvedValue({ error: null });

    await signInWithMagicLink(
      "user@example.com",
      "https://wanderly.example.com%2Fexplore",
      {
        auth: {
          signInWithOtp,
        },
      } as never,
    );

    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "user@example.com",
      options: {
        emailRedirectTo: "https://wanderly.example.com/explore",
        shouldCreateUser: true,
      },
    });
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
