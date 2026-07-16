import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  loadOrCreateUserSettingsRow,
  mapUserSettingsRowToSettings,
} from "../../../lib/settings/server";
import { createSupabaseAccessTokenClient } from "../../../lib/supabase/server";
import { planTrip } from "../../../lib/trip/planner";
import { generateTripRequestSchema } from "../../../lib/trip/schema";
import type { UserSettings } from "../../../lib/settings/types";
import { AppError, toApiErrorResponse } from "../../../lib/utils/errors";

type TripPlanner = typeof planTrip;

function getBearerToken(request: Request) {
  const authorizationHeader = request.headers.get("authorization");

  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token?.trim()) {
    return null;
  }

  return token.trim();
}

export async function resolveOptionalUserSettings(
  request: Request,
  createClient = createSupabaseAccessTokenClient,
): Promise<UserSettings | null> {
  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return null;
  }

  try {
    const client = createClient(accessToken);
    const {
      data: { user },
      error,
    } = await client.auth.getUser(accessToken);

    if (error || !user) {
      return null;
    }

    const row = await loadOrCreateUserSettingsRow(client as never, user.id);
    return mapUserSettingsRowToSettings(row as never);
  } catch {
    return null;
  }
}

function errorStatus(error: AppError): number {
  if (error.code === "INVALID_INPUT") {
    return 400;
  }

  if (
    error.code === "AI_GENERATION_FAILED" ||
    error.code === "AI_OUTPUT_INVALID" ||
    error.code === "WEATHER_API_FAILED"
  ) {
    return 502;
  }

  return 500;
}

export function createGenerateTripHandler(
  planner: TripPlanner = planTrip,
  resolveUserSettings: (
    request: Request,
  ) => Promise<UserSettings | null> = resolveOptionalUserSettings,
) {
  return async function POST(request: Request) {
    let input: unknown;

    try {
      const body = (await request.json()) as unknown;
      input = generateTripRequestSchema.parse(body);
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof ZodError) {
        const invalidInputError = new AppError(
          "INVALID_INPUT",
          "旅行信息还没填完整，检查一下再试。",
        );

        return NextResponse.json(toApiErrorResponse(invalidInputError), {
          status: 400,
        });
      }

      return NextResponse.json(toApiErrorResponse(error), {
        status: 500,
      });
    }

    try {
      let userSettings: UserSettings | null = null;

      try {
        userSettings = await resolveUserSettings(request);
      } catch {
        userSettings = null;
      }

      const result = await planner(input, {
        userSettings,
      });
      return NextResponse.json(result);
    } catch (error) {
      if (error instanceof AppError) {
        return NextResponse.json(toApiErrorResponse(error), {
          status: errorStatus(error),
        });
      }

      return NextResponse.json(toApiErrorResponse(error), {
        status: 500,
      });
    }
  };
}

export const POST = createGenerateTripHandler();
