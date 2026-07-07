import type {
  Session,
  SupabaseClient,
  User,
} from "@supabase/supabase-js";

import { createSupabaseBrowserClient } from "./browser";

export interface AuthUserSnapshot {
  id: string;
  email: string | null;
}

export type AuthStatusState =
  | {
      status: "loading";
      user: null;
      error: null;
    }
  | {
      status: "anonymous";
      user: null;
      error: string | null;
    }
  | {
      status: "authenticated";
      user: AuthUserSnapshot;
      error: null;
    };

export const AUTH_LOADING_STATE: AuthStatusState = {
  status: "loading",
  user: null,
  error: null,
};

function getFriendlyAuthMessage(fallback: string, error?: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export function mapSupabaseUser(user: Pick<User, "id" | "email"> | null | undefined) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? null,
  } satisfies AuthUserSnapshot;
}

export function resolveAuthStatusFromUser(
  user: Pick<User, "id" | "email"> | null | undefined,
): AuthStatusState {
  const mappedUser = mapSupabaseUser(user);

  if (!mappedUser) {
    return {
      status: "anonymous",
      user: null,
      error: null,
    };
  }

  return {
    status: "authenticated",
    user: mappedUser,
    error: null,
  };
}

export function resolveAuthStatusFromSession(
  session: Pick<Session, "user"> | null | undefined,
): AuthStatusState {
  return resolveAuthStatusFromUser(session?.user);
}

export async function getBrowserAuthStatus(
  client: Pick<SupabaseClient, "auth"> = createSupabaseBrowserClient(),
): Promise<AuthStatusState> {
  const { data, error } = await client.auth.getUser();

  if (error) {
    return {
      status: "anonymous",
      user: null,
      error: getFriendlyAuthMessage("暂时无法确认登录状态。", error),
    };
  }

  return resolveAuthStatusFromUser(data.user);
}

export async function getBrowserAccessToken(
  client: Pick<SupabaseClient, "auth"> = createSupabaseBrowserClient(),
) {
  const { data, error } = await client.auth.getSession();

  if (error) {
    throw new Error(getFriendlyAuthMessage("暂时拿不到登录凭证，请稍后再试。", error));
  }

  return data.session?.access_token ?? null;
}

export async function signInWithMagicLink(
  email: string,
  emailRedirectTo: string,
  client: Pick<SupabaseClient, "auth"> = createSupabaseBrowserClient(),
) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error("先填一个常用邮箱，我再把登录链接发过去。");
  }

  const { error } = await client.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      emailRedirectTo,
      shouldCreateUser: true,
    },
  });

  if (error) {
    throw new Error(getFriendlyAuthMessage("登录链接暂时没发出去，请稍后再试。", error));
  }

  return {
    email: normalizedEmail,
  };
}

export async function signOutBrowserSession(
  client: Pick<SupabaseClient, "auth"> = createSupabaseBrowserClient(),
) {
  const { error } = await client.auth.signOut();

  if (error) {
    throw new Error(getFriendlyAuthMessage("暂时无法退出登录，请稍后再试。", error));
  }
}
