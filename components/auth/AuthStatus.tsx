"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  AUTH_LOADING_STATE,
  type AuthStatusState,
} from "../../lib/supabase/auth-client";
import { buildLoginHref } from "../../lib/trips/save-client";

import { useAuthStatus } from "./useAuthStatus";

interface AuthStatusProps {
  initialState?: AuthStatusState;
}

export function AuthStatus({
  initialState = AUTH_LOADING_STATE,
}: AuthStatusProps) {
  const pathname = usePathname();
  const state = useAuthStatus(initialState);
  const returnTo = pathname && pathname !== "/login" ? pathname : "/";

  if (state.status === "authenticated") {
    return (
      <Link
        href="/login"
        className="inline-flex min-h-10 items-center rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-3 py-2 text-xs font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--paper-bright)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] sm:text-sm"
      >
        {state.user.email ?? "已登录"}
      </Link>
    );
  }

  return (
    <Link
      href={buildLoginHref(returnTo)}
      className="inline-flex min-h-10 items-center rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-3 py-2 text-xs font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--paper-bright)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] sm:text-sm"
    >
      {state.status === "loading" ? "检查登录中…" : "注册 / 登录"}
    </Link>
  );
}
