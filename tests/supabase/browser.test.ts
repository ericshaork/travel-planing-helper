import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("createSupabaseBrowserClient", () => {
  it("使用 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY 创建 client", async () => {
    const { createSupabaseBrowserClient } = await import(
      "../../lib/supabase/browser"
    );

    const client = createSupabaseBrowserClient({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
    });

    expect(createClientMock).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "anon-key",
      expect.objectContaining({
        auth: expect.objectContaining({
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true,
        }),
      }),
    );
    expect(client).toMatchObject({
      url: "https://example.supabase.co",
      key: "anon-key",
    });
  });

  it("缺少 browser env 时不会创建 client", async () => {
    const { createSupabaseBrowserClient } = await import(
      "../../lib/supabase/browser"
    );

    expect(() =>
      createSupabaseBrowserClient({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      }),
    ).toThrowError(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("默认读取路径不依赖 service role key", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");

    const { createSupabaseBrowserClient } = await import(
      "../../lib/supabase/browser"
    );

    createSupabaseBrowserClient();

    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(createClientMock.mock.calls[0]?.[1]).toBe("anon-key");
    expect(createClientMock.mock.calls[0]?.[1]).not.toBe("service-role-key");
  });
});
