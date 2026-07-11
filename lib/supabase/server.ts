import "server-only";

import { createClient } from "@supabase/supabase-js";

import {
  assertSupabaseBrowserEnv,
  assertSupabaseServiceRoleEnv,
} from "./env.ts";

type EnvironmentSource = Readonly<Record<string, string | undefined>>;

export function createSupabaseServerClient(source?: EnvironmentSource) {
  const { url, anonKey } = assertSupabaseBrowserEnv(source);

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export function createSupabaseAccessTokenClient(
  accessToken: string,
  source?: EnvironmentSource,
) {
  const { url, anonKey } = assertSupabaseBrowserEnv(source);

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

export function createSupabaseServiceRoleClient(
  source: EnvironmentSource = process.env,
) {
  const { url, serviceRoleKey } = assertSupabaseServiceRoleEnv(source);

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
