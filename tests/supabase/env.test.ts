import { afterEach, describe, expect, it, vi } from "vitest";

import { SupabaseConfigError } from "../../lib/supabase/errors";
import {
  assertSupabaseBrowserEnv,
  assertSupabaseServiceRoleEnv,
  getSupabaseBrowserEnv,
  getSupabaseConfigStatus,
  getSupabaseServerEnv,
} from "../../lib/supabase/env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("supabase env", () => {
  it("browser env 只读取 NEXT_PUBLIC_SUPABASE_*", () => {
    const env = getSupabaseBrowserEnv({
      NEXT_PUBLIC_SUPABASE_URL: " https://example.supabase.co ",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: " anon-key ",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
    });

    expect(env).toEqual({
      url: "https://example.supabase.co",
      anonKey: "anon-key",
      isConfigured: true,
    });
  });

  it("默认读取路径直接使用 process.env.NEXT_PUBLIC_SUPABASE_*", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", " https://example.supabase.co ");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", " anon-key ");

    expect(getSupabaseBrowserEnv()).toEqual({
      url: "https://example.supabase.co",
      anonKey: "anon-key",
      isConfigured: true,
    });
  });

  it("缺少 URL 时给出明确错误且不泄露 key", () => {
    expect(() =>
      assertSupabaseBrowserEnv({
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "secret-anon-key",
      }),
    ).toThrowError(SupabaseConfigError);

    try {
      assertSupabaseBrowserEnv({
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "secret-anon-key",
      });
    } catch (error) {
      expect(error).toBeInstanceOf(SupabaseConfigError);
      expect((error as Error).message).toMatch(/NEXT_PUBLIC_SUPABASE_URL/);
      expect((error as Error).message).not.toContain("secret-anon-key");
    }
  });

  it("缺少 anon key 时给出明确错误且不读取 service role key", () => {
    expect(() =>
      assertSupabaseBrowserEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      }),
    ).toThrowError(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });

  it("service role helper 要求 service role key", () => {
    expect(() =>
      assertSupabaseServiceRoleEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      }),
    ).toThrowError(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it("service role env 允许注入 source object", () => {
    expect(
      assertSupabaseServiceRoleEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      }),
    ).toEqual({
      url: "https://example.supabase.co",
      serviceRoleKey: "service-role-key",
    });
  });

  it("状态摘要能区分 browser 和 service role 是否就绪", () => {
    expect(
      getSupabaseConfigStatus({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      }),
    ).toEqual({
      hasUrl: true,
      hasAnonKey: true,
      hasServiceRoleKey: false,
      browserReady: true,
      serviceRoleReady: false,
    });
  });

  it("server env 会包含 service role 状态，但不会要求 anon key 才能读取 service role 原始值", () => {
    expect(
      getSupabaseServerEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      }),
    ).toEqual({
      url: "https://example.supabase.co",
      anonKey: null,
      serviceRoleKey: "service-role-key",
      isConfigured: false,
      isServiceRoleConfigured: true,
    });
  });
});
