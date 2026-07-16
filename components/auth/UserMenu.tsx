"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  AUTH_LOADING_STATE,
  type AuthStatusState,
} from "../../lib/supabase/auth-client";
import { buildLoginHref } from "../../lib/trips/save-client";

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
  const settingsLoginHref = buildLoginHref("/settings");
  const tripsLoginHref = buildLoginHref("/trips");

  const containerClass = minimal
    ? "flex min-w-0 items-center gap-2.5 rounded-[22px] border border-[rgba(193,181,158,0.22)] bg-[rgba(255,249,239,0.34)] px-3 py-2 shadow-[0_6px_14px_rgba(65,58,45,0.03)] backdrop-blur-[5px]"
    : "flex min-w-0 items-center gap-2 rounded-[18px] border border-[var(--line)] bg-[var(--paper-bright)] px-3 py-2";

  const labelClass = minimal
    ? "rounded-full border border-[rgba(112,130,108,0.16)] bg-[rgba(236,242,232,0.52)] px-2.5 py-1 text-[11px] font-semibold tracking-[0.12em] text-[var(--sage-deep)]"
    : "text-[11px] font-semibold tracking-[0.12em] text-[var(--ink-muted)]";

  const emailClass = minimal
    ? "hidden"
    : "truncate text-sm font-semibold text-[var(--ink)]";

  const tripsLinkClass = minimal
    ? "inline-flex min-h-9 items-center rounded-full border border-[rgba(204,193,171,0.28)] bg-[rgba(255,251,243,0.38)] px-3 py-1.5 text-xs font-semibold text-[rgba(88,69,52,0.92)] transition-colors hover:bg-[rgba(255,251,243,0.58)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(88,69,52,0.4)]"
    : "inline-flex min-h-9 items-center rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--paper-bright)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]";

  const settingsLinkClass = minimal
    ? "inline-flex min-h-9 items-center rounded-full border border-[rgba(204,193,171,0.28)] bg-[rgba(255,251,243,0.38)] px-3 py-1.5 text-xs font-semibold text-[rgba(88,69,52,0.92)] transition-colors hover:bg-[rgba(255,251,243,0.58)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(88,69,52,0.4)]"
    : "inline-flex min-h-9 items-center rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--paper-bright)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]";

  const signOutClass = minimal
    ? "inline-flex min-h-9 items-center rounded-full border border-[rgba(204,193,171,0.22)] bg-[rgba(255,251,243,0.22)] px-3 py-1.5 text-xs font-medium text-[rgba(101,84,67,0.82)] transition-colors hover:bg-[rgba(255,251,243,0.4)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(88,69,52,0.32)]"
    : "inline-flex min-h-9 items-center rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--paper-bright)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]";

  const signedOutClass = minimal
    ? "inline-flex min-h-10 items-center rounded-[26px] border border-[rgba(193,181,158,0.34)] bg-[rgba(255,249,239,0.5)] px-4 py-2.5 text-sm font-semibold text-[rgba(88,69,52,0.92)] shadow-[0_10px_20px_rgba(65,58,45,0.04)] transition-colors hover:bg-[rgba(255,249,239,0.64)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(88,69,52,0.4)]"
    : "inline-flex min-h-10 items-center rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-3 py-2 text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--paper-bright)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]";

  if (state.status === "authenticated") {
    return (
      <div className={containerClass}>
        <div className="min-w-0 text-right">
          <p className={labelClass}>当前账号</p>
          <p className={emailClass}>{state.user.email ?? "当前账号"}</p>
        </div>
        <Link href="/trips" className={tripsLinkClass}>
          我的行程
        </Link>
        <Link href="/settings" className={settingsLinkClass}>
          设置
        </Link>
        <SignOutButton className={signOutClass} />
      </div>
    );
  }

  return (
    <div className={minimal ? "flex items-center gap-2" : "flex items-center gap-2"}>
      <Link href={tripsLoginHref} className={signedOutClass}>
        我的行程
      </Link>
      <Link href={settingsLoginHref} className={signedOutClass}>
        设置
      </Link>
      <Link href={buildLoginHref(returnTo)} className={signedOutClass}>
        {state.status === "loading" ? "检查登录中…" : "注册 / 登录"}
      </Link>
    </div>
  );
}
