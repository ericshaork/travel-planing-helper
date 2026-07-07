import { createSupabaseBrowserClient } from "../supabase/browser";
import { getBrowserAccessToken } from "../supabase/auth-client";
import type { ListTripsResponse, SavedTripListItem } from "./types";

export async function listSavedTrips(
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
    throw new Error("请先登录，再来看你保存过的行程。");
  }

  const response = await fetchImpl("/api/trips", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const payload = (await response.json().catch(() => null)) as
    | ListTripsResponse
    | null;

  if (!response.ok) {
    throw new Error(
      payload && typeof payload === "object" && "ok" in payload && !payload.ok
        ? payload.message
        : "暂时没拉到你的行程列表，请稍后再试。",
    );
  }

  if (!payload || !("ok" in payload) || !payload.ok) {
    throw new Error("暂时没拉到你的行程列表，请稍后再试。");
  }

  return payload.trips as SavedTripListItem[];
}
