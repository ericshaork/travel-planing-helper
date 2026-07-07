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
}

export function UserMenu({
  initialState = AUTH_LOADING_STATE,
}: UserMenuProps) {
  const pathname = usePathname();
  const state = useAuthStatus(initialState);
  const returnTo = pathname && pathname !== "/login" ? pathname : "/";

  if (state.status === "authenticated") {
    return (
      <div className="flex min-w-0 items-center gap-2 rounded-[18px] border border-[var(--line)] bg-[var(--paper-bright)] px-3 py-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--ink-muted)]">
            已登录
          </p>
          <p className="truncate text-sm font-semibold text-[var(--ink)]">
            {state.user.email ?? "当前账号"}
          </p>
        </div>
        <SignOutButton className="inline-flex min-h-9 items-center rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--paper-bright)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]" />
      </div>
    );
  }

  return (
    <Link
      href={`/login?returnTo=${encodeURIComponent(returnTo)}`}
      className="inline-flex min-h-10 items-center rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-3 py-2 text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--paper-bright)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
    >
      {state.status === "loading" ? "检查登录中…" : "登录"}
    </Link>
  );
}
