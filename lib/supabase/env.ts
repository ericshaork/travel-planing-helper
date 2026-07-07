import { SupabaseConfigError } from "./errors";
import type {
  SupabaseBrowserEnv,
  SupabaseConfigStatus,
  SupabaseServerEnv,
} from "./types";

type EnvironmentSource = Readonly<Record<string, string | undefined>>;

function normalizeEnvValue(value: string | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function getSupabaseBrowserEnv(
  source?: EnvironmentSource,
): SupabaseBrowserEnv {
  const url = source
    ? normalizeEnvValue(source.NEXT_PUBLIC_SUPABASE_URL)
    : normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = source
    ? normalizeEnvValue(source.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    : normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  return {
    url,
    anonKey,
    isConfigured: url !== null && anonKey !== null,
  };
}

export function getSupabaseServerEnv(
  source: EnvironmentSource = process.env,
): SupabaseServerEnv {
  const browserEnv = getSupabaseBrowserEnv(source);
  const serviceRoleKey = normalizeEnvValue(source.SUPABASE_SERVICE_ROLE_KEY);

  return {
    ...browserEnv,
    serviceRoleKey,
    isServiceRoleConfigured:
      browserEnv.url !== null && serviceRoleKey !== null,
  };
}

export function getSupabaseConfigStatus(
  source: EnvironmentSource = process.env,
): SupabaseConfigStatus {
  const environment = getSupabaseServerEnv(source);

  return {
    hasUrl: environment.url !== null,
    hasAnonKey: environment.anonKey !== null,
    hasServiceRoleKey: environment.serviceRoleKey !== null,
    browserReady: environment.isConfigured,
    serviceRoleReady: environment.isServiceRoleConfigured,
  };
}

export function assertSupabaseBrowserEnv(
  source?: EnvironmentSource,
): { url: string; anonKey: string } {
  const environment = getSupabaseBrowserEnv(source);

  if (!environment.url) {
    throw new SupabaseConfigError(
      "MISSING_SUPABASE_URL",
      "缺少 NEXT_PUBLIC_SUPABASE_URL，请检查 Supabase 前端环境变量配置。",
    );
  }

  if (!environment.anonKey) {
    throw new SupabaseConfigError(
      "MISSING_SUPABASE_ANON_KEY",
      "缺少 NEXT_PUBLIC_SUPABASE_ANON_KEY，请检查 Supabase 前端环境变量配置。",
    );
  }

  return {
    url: environment.url,
    anonKey: environment.anonKey,
  };
}

export function assertSupabaseServiceRoleEnv(
  source: EnvironmentSource = process.env,
): { url: string; serviceRoleKey: string } {
  const environment = getSupabaseServerEnv(source);

  if (!environment.url) {
    throw new SupabaseConfigError(
      "MISSING_SUPABASE_URL",
      "缺少 NEXT_PUBLIC_SUPABASE_URL，请检查 Supabase 服务端环境变量配置。",
    );
  }

  if (!environment.serviceRoleKey) {
    throw new SupabaseConfigError(
      "MISSING_SUPABASE_SERVICE_ROLE_KEY",
      "缺少 SUPABASE_SERVICE_ROLE_KEY，请检查服务端 secret 配置。",
    );
  }

  return {
    url: environment.url,
    serviceRoleKey: environment.serviceRoleKey,
  };
}
