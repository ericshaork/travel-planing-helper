import { createSupabaseBrowserClient } from "../supabase/browser";
import { getBrowserAccessToken } from "../supabase/auth-client";
import type {
  SaveTripRequestPayload,
  UpdateTripResponse,
} from "./types";

interface UpdateTripErrorResponse {
  ok?: false;
  message?: string;
  error?: {
    message?: string;
  };
}

export async function updateSavedTripInCloud(
  tripId: string,
  payload: SaveTripRequestPayload,
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
    throw new Error("请先登录，再更新这条已保存计划。");
  }

  const response = await fetchImpl(`/api/trips/${encodeURIComponent(tripId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
  const responseBody = (await response.json().catch(() => null)) as
    | UpdateTripResponse
    | UpdateTripErrorResponse
    | null;

  if (!response.ok) {
    throw new Error(
      (responseBody &&
      typeof responseBody === "object" &&
      "error" in responseBody
        ? responseBody.error?.message
        : undefined) ??
        (responseBody &&
        typeof responseBody === "object" &&
        "message" in responseBody
          ? responseBody.message
          : undefined) ??
        "暂时更新不了这条已保存计划，请稍后再试。",
    );
  }

  return responseBody as UpdateTripResponse;
}
