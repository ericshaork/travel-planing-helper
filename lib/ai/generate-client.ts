import { getBrowserAccessToken } from "../supabase/auth-client";
import { createSupabaseBrowserClient } from "../supabase/browser";

interface GenerateTripRequestBody {
  tripRequest: unknown;
  previousPlan?: unknown;
  modificationRequest?: string;
}

export async function postGenerateTrip(
  body: GenerateTripRequestBody,
  options?: {
    fetchImpl?: typeof fetch;
    getAccessToken?: () => Promise<string | null>;
  },
) {
  const fetchImpl = options?.fetchImpl ?? fetch;
  const getAccessToken =
    options?.getAccessToken ??
    (() => getBrowserAccessToken(createSupabaseBrowserClient()));

  let accessToken: string | null = null;

  try {
    accessToken = await getAccessToken();
  } catch {
    accessToken = null;
  }

  return fetchImpl("/api/generate-trip", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  });
}
