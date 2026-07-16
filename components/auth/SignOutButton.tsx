"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { signOutBrowserSession } from "../../lib/supabase/auth-client";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";

interface SignOutButtonProps {
  className?: string;
  onSignedOut?: () => void;
}

export function SignOutButton({
  className,
  onSignedOut,
}: SignOutButtonProps) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();

  async function handleSignOut() {
    setIsSigningOut(true);
    setSuccessMessage(undefined);
    setErrorMessage(undefined);

    try {
      await signOutBrowserSession(createSupabaseBrowserClient());
      setSuccessMessage("已退出登录。");
      onSignedOut?.();
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "暂时无法退出登录，请稍后再试。",
      );
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={() => void handleSignOut()}
        className={className}
        disabled={isSigningOut}
      >
        {isSigningOut ? "退出中…" : "退出登录"}
      </button>
      {successMessage ? (
        <p className="mt-1 text-xs leading-5 text-[var(--sage-deep)]">
          {successMessage}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="mt-1 text-xs leading-5 text-[var(--clay-deep)]">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
