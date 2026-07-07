"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  AUTH_LOADING_STATE,
  signInWithMagicLink,
  type AuthStatusState,
} from "../../lib/supabase/auth-client";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";

import { SignOutButton } from "./SignOutButton";
import { useAuthStatus } from "./useAuthStatus";

interface LoginFormProps {
  returnTo?: string;
  initialState?: AuthStatusState;
}

function normalizeReturnToPath(returnTo?: string) {
  if (!returnTo || !returnTo.startsWith("/")) {
    return "/";
  }

  return returnTo;
}

export function LoginForm({
  returnTo,
  initialState = AUTH_LOADING_STATE,
}: LoginFormProps) {
  const state = useAuthStatus(initialState);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const resolvedReturnTo = useMemo(() => normalizeReturnToPath(returnTo), [returnTo]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage(undefined);
    setErrorMessage(undefined);

    try {
      const redirectUrl = new URL(resolvedReturnTo, window.location.origin).toString();
      const result = await signInWithMagicLink(
        email,
        redirectUrl,
        createSupabaseBrowserClient(),
      );

      setSuccessMessage(`登录链接已发送到 ${result.email}，去邮箱里点开就能回来。`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "登录链接暂时没发出去，请稍后再试。",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (state.status === "authenticated") {
    return (
      <section className="workspace-panel px-6 py-6">
        <div className="relative z-[1]">
          <p className="workspace-kicker">ALREADY IN</p>
          <h2 className="mt-2 text-2xl font-semibold">你已经登录了。</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
            当前账号是 {state.user.email ?? "已登录用户"}。如果只是想继续规划，直接回工作台就行。
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={resolvedReturnTo}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--ink)] bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-[var(--paper-bright)] shadow-[4px_4px_0_var(--clay)]"
            >
              回到工作台
            </Link>
            <SignOutButton className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-5 py-2.5 text-sm font-semibold text-[var(--ink)]" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="workspace-panel px-6 py-6">
      <div className="relative z-[1]">
        <p className="workspace-kicker">MAGIC LINK</p>
        <h2 className="mt-2 text-2xl font-semibold">先用邮箱登录。</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
          这一步只加基础登录，不会拦住你创建计划。输入常用邮箱，我把登录链接发过去，点开就能回来。
        </p>

        <form className="mt-5 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[var(--ink)]">
              邮箱
            </span>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="min-h-12 w-full rounded-[18px] border border-[var(--line-strong)] bg-[var(--paper-bright)] px-4 py-3 text-sm text-[var(--ink)] outline-none transition-colors focus:border-[var(--clay-deep)]"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--ink)] bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-[var(--paper-bright)] shadow-[4px_4px_0_var(--clay)] disabled:translate-y-0 disabled:opacity-70"
          >
            {isSubmitting ? "发送中…" : "发送登录链接"}
          </button>
        </form>

        {successMessage ? (
          <p className="mt-4 rounded-[18px] border border-[var(--sage-deep)] bg-[var(--sage-soft)] px-4 py-3 text-sm leading-6 text-[var(--sage-deep)]">
            {successMessage}
          </p>
        ) : null}

        {errorMessage ? (
          <p className="mt-4 rounded-[18px] border border-[var(--clay-deep)] bg-[rgba(244,221,209,0.55)] px-4 py-3 text-sm leading-6 text-[var(--clay-deep)]">
            {errorMessage}
          </p>
        ) : null}

        <p className="mt-4 text-xs leading-5 text-[var(--ink-muted)]">
          登录后会回到 {resolvedReturnTo === "/" ? "首页" : resolvedReturnTo}。保存计划会放在 phase 4，再往后才是“我的行程”。
        </p>
      </div>
    </section>
  );
}
