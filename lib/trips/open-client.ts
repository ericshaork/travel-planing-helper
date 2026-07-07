import { createSupabaseBrowserClient } from "../supabase/browser";
import { getBrowserAccessToken } from "../supabase/auth-client";
import type { LoadTripResponse, SavedTripDetail } from "./types";

export async function openSavedTrip(
  tripId: string,
  options?: {
    fetchImpl?: typeof fetch;
    getAccessToken?: () => Promise<string | null>;
  },
) {
  const fetchImpl = options?.fetchImpl ?? fetch;
  const getAccessToken =
    options?.getAccessToken ??
    (() => getBrowserAccessToken(createSupabaseBrowserClient()));
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error("请先登录，再打开这条历史行程。");
  }

  const response = await fetchImpl(`/api/trips/${encodeURIComponent(tripId)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const payload = (await response.json().catch(() => null)) as
    | LoadTripResponse
    | null;

  if (!response.ok) {
    throw new Error(
      payload && typeof payload === "object" && "ok" in payload && !payload.ok
        ? payload.message
        : "暂时打不开这条历史行程，请稍后再试。",
    );
  }

  if (!payload || !("ok" in payload) || !payload.ok) {
    throw new Error("暂时打不开这条历史行程，请稍后再试。");
  }

  return payload.trip as SavedTripDetail;
}
