"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  AUTH_LOADING_STATE,
  type AuthStatusState,
} from "../../lib/supabase/auth-client";

import { SignOutButton } from "./SignOutButton";
import { useAuthStatus } from "./useAuthStatus";

interface UserMenuProps {
  initialState?: AuthStatusState;
  minimal?: boolean;
}

export function UserMenu({
  initialState = AUTH_LOADING_STATE,
  minimal = false,
}: UserMenuProps) {
  const pathname = usePathname();
  const state = useAuthStatus(initialState);
  const returnTo = pathname && pathname !== "/login" ? pathname : "/";

  const containerClass = minimal
    ? "flex min-w-0 items-center gap-3 bg-transparent"
    : "flex min-w-0 items-center gap-2 rounded-[18px] border border-[var(--line)] bg-[var(--paper-bright)] px-3 py-2";

  const labelClass = minimal
    ? "text-[11px] font-semibold tracking-[0.12em] text-[rgba(116,97,77,0.82)]"
    : "text-[11px] font-semibold tracking-[0.12em] text-[var(--ink-muted)]";

  const emailClass = minimal
    ? "max-w-[14rem] truncate text-sm font-semibold text-[rgba(74,60,45,0.96)]"
    : "truncate text-sm font-semibold text-[var(--ink)]";

  const signOutClass = minimal
    ? "inline-flex min-h-9 items-center rounded-full border border-[rgba(125,105,85,0.22)] bg-[rgba(255,253,247,0.72)] px-3 py-1.5 text-xs font-semibold text-[rgba(88,69,52,0.92)] backdrop-blur-[4px] transition-colors hover:bg-[rgba(255,253,247,0.84)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(88,69,52,0.4)]"
    : "inline-flex min-h-9 items-center rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--paper-bright)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]";

  const signedOutClass = minimal
    ? "inline-flex min-h-10 items-center rounded-full border border-[rgba(125,105,85,0.22)] bg-[rgba(255,253,247,0.72)] px-3 py-2 text-sm font-semibold text-[rgba(88,69,52,0.92)] backdrop-blur-[4px] transition-colors hover:bg-[rgba(255,253,247,0.84)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(88,69,52,0.4)]"
    : "inline-flex min-h-10 items-center rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-3 py-2 text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--paper-bright)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]";

  if (state.status === "authenticated") {
    return (
      <div className={containerClass}>
        <div className="min-w-0 text-right">
          <p className={labelClass}>已登录</p>
          <p className={emailClass}>{state.user.email ?? "当前账号"}</p>
        </div>
        <SignOutButton className={signOutClass} />
      </div>
    );
  }

  return (
    <Link
      href={`/login?returnTo=${encodeURIComponent(returnTo)}`}
      className={signedOutClass}
    >
      {state.status === "loading" ? "检查登录中…" : "登录"}
    </Link>
  );
}
