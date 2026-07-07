"use client";

import { useEffect, useState } from "react";

import {
  AUTH_LOADING_STATE,
  getBrowserAuthStatus,
  resolveAuthStatusFromSession,
  type AuthStatusState,
} from "../../lib/supabase/auth-client";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";

export function useAuthStatus(initialState: AuthStatusState = AUTH_LOADING_STATE) {
  const [state, setState] = useState<AuthStatusState>(() => {
    if (initialState.status !== "loading") {
      return initialState;
    }

    try {
      createSupabaseBrowserClient();
      return initialState;
    } catch {
      return {
        status: "anonymous",
        user: null,
        error: "auth_unavailable",
      };
    }
  });

  useEffect(() => {
    let active = true;
    let subscription: { unsubscribe: () => void } | undefined;

    try {
      const client = createSupabaseBrowserClient();

      void getBrowserAuthStatus(client).then((nextState) => {
        if (!active) {
          return;
        }

        setState(nextState);
      });

      const authSubscription = client.auth.onAuthStateChange((_event, session) => {
        if (!active) {
          return;
        }

        setState(resolveAuthStatusFromSession(session));
      });

      subscription = authSubscription.data.subscription;
    } catch {}

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  return state;
}
