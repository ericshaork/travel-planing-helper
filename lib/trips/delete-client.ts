import { createSupabaseBrowserClient } from "../supabase/browser";
import { getBrowserAccessToken } from "../supabase/auth-client";
import type { DeleteTripResponse } from "./types";

interface DeleteTripErrorResponse {
  ok?: false;
  message?: string;
}

export async function deleteSavedTripFromCloud(
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
    throw new Error("请先登录，再删除这条已保存计划。");
  }

  const response = await fetchImpl(`/api/trips/${encodeURIComponent(tripId)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const responseBody = (await response.json().catch(() => null)) as
    | DeleteTripResponse
    | DeleteTripErrorResponse
    | null;

  if (!response.ok) {
    throw new Error(
      (responseBody &&
      typeof responseBody === "object" &&
      "message" in responseBody
        ? responseBody.message
        : undefined) ?? "暂时删不掉这条已保存计划，请稍后再试。",
    );
  }

  return responseBody as DeleteTripResponse;
}
