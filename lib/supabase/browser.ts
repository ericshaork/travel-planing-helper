import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { assertSupabaseBrowserEnv } from "./env";

type EnvironmentSource = Readonly<Record<string, string | undefined>>;

let browserClientSingleton: SupabaseClient | null = null;

export function createSupabaseBrowserClient(source?: EnvironmentSource) {
  const { url, anonKey } = assertSupabaseBrowserEnv(source);

  if (!source && browserClientSingleton) {
    return browserClientSingleton;
  }

  const client = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  });

  if (!source) {
    browserClientSingleton = client;
  }

  return client;
}
