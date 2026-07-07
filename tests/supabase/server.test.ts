import { readFileSync } from "node:fs";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const createClientMock = vi.fn((url: string, key: string, options: unknown) => ({
  url,
  key,
  options,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe("supabase server helpers", () => {
  it('server helper file explicitly imports "server-only"', () => {
    const filePath = path.resolve(process.cwd(), "lib", "supabase", "server.ts");
    const file = readFileSync(filePath, "utf8");

    expect(file).toContain('import "server-only"');
  });

  it("createSupabaseServerClient uses anon key with non-persistent auth", async () => {
    const { createSupabaseServerClient } = await import(
      "../../lib/supabase/server"
    );

    createSupabaseServerClient({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
    });

    expect(createClientMock).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "anon-key",
      expect.objectContaining({
        auth: expect.objectContaining({
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        }),
      }),
    );
  });

  it("createSupabaseAccessTokenClient attaches a bearer token header", async () => {
    const { createSupabaseAccessTokenClient } = await import(
      "../../lib/supabase/server"
    );

    createSupabaseAccessTokenClient("token-123", {
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
    });

    expect(createClientMock).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "anon-key",
      expect.objectContaining({
        global: {
          headers: {
            Authorization: "Bearer token-123",
          },
        },
      }),
    );
  });

  it("createSupabaseServiceRoleClient only uses the service role key", async () => {
    const { createSupabaseServiceRoleClient } = await import(
      "../../lib/supabase/server"
    );

    createSupabaseServiceRoleClient({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
    });

    expect(createClientMock).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "service-role-key",
      expect.objectContaining({
        auth: expect.objectContaining({
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        }),
      }),
    );
  });

  it("throws a clear error when service role key is missing", async () => {
    const { createSupabaseServiceRoleClient } = await import(
      "../../lib/supabase/server"
    );

    expect(() =>
      createSupabaseServiceRoleClient({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      }),
    ).toThrowError(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(createClientMock).not.toHaveBeenCalled();
  });
});
