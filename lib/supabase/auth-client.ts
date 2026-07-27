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

function normalizeRedirectPath(returnTo?: string) {
  if (!returnTo || !returnTo.startsWith("/")) {
    return "/";
  }

  return returnTo;
}

function repairEncodedPathUrl(value: string) {
  const trimmedValue = value.trim();
  const match = trimmedValue.match(/^(https?:\/\/[^/%?#]+)(%2F.*)$/i);

  if (!match) {
    return trimmedValue;
  }

  try {
    return `${match[1]}${decodeURIComponent(match[2])}`;
  } catch {
    return trimmedValue;
  }
}

function tryResolveUrlOrigin(value: string | null | undefined) {
  if (!value || !value.trim()) {
    return null;
  }

  try {
    return new URL(value.trim()).origin;
  } catch {
    return null;
  }
}

export function resolveMagicLinkBaseUrl(
  source: Readonly<Record<string, string | undefined>> = process.env,
) {
  const configuredOrigin = tryResolveUrlOrigin(source.NEXT_PUBLIC_SITE_URL);

  if (configuredOrigin) {
    return configuredOrigin;
  }

  if (typeof window !== "undefined") {
    const browserOrigin = tryResolveUrlOrigin(window.location.origin);

    if (browserOrigin) {
      return browserOrigin;
    }
  }

  return "http://localhost:3000";
}

export function buildMagicLinkRedirectUrl(
  returnTo?: string,
  source: Readonly<Record<string, string | undefined>> = process.env,
) {
  return new URL(
    normalizeRedirectPath(returnTo),
    `${resolveMagicLinkBaseUrl(source)}/`,
  ).toString();
}

export function normalizeMagicLinkRedirectUrl(
  value: string,
  source: Readonly<Record<string, string | undefined>> = process.env,
) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return buildMagicLinkRedirectUrl("/", source);
  }

  if (trimmedValue.startsWith("/")) {
    return buildMagicLinkRedirectUrl(trimmedValue, source);
  }

  const repairedValue = repairEncodedPathUrl(trimmedValue);

  try {
    return new URL(repairedValue).toString();
  } catch {
    return buildMagicLinkRedirectUrl("/", source);
  }
}

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

export async function requestLoginLink(
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
      emailRedirectTo: normalizeMagicLinkRedirectUrl(emailRedirectTo),
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

export const signInWithMagicLink = requestLoginLink;

export async function signOutBrowserSession(
  client: Pick<SupabaseClient, "auth"> = createSupabaseBrowserClient(),
) {
  const { error } = await client.auth.signOut();

  if (error) {
    throw new Error(getFriendlyAuthMessage("暂时无法退出登录，请稍后再试。", error));
  }
}
