import { NextResponse } from "next/server";
import { z } from "zod";

import {
  loadOrCreateUserSettingsRow,
  mapUserSettingsRowToSettings,
  mergeUserSettings,
  toUserSettingsUpdateRow,
} from "../../../lib/settings/server";
import {
  userSettingsUpdateSchema,
  type UserSettingsResponse,
} from "../../../lib/settings/types";
import type { UserSettingsRow } from "../../../lib/supabase/types";
import { createSupabaseAccessTokenClient } from "../../../lib/supabase/server";
import { AppError, toApiErrorResponse } from "../../../lib/utils/errors";

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

function getErrorStatus(error: unknown) {
  if (error instanceof AppError) {
    switch (error.code) {
      case "INVALID_INPUT":
        return 400;
      case "UNAUTHORIZED":
        return 401;
      case "LOAD_USER_SETTINGS_FAILED":
      case "UPDATE_USER_SETTINGS_FAILED":
      default:
        return 500;
    }
  }

  return 500;
}

async function resolveAuthenticatedUser(
  accessToken: string,
  createClient = createSupabaseAccessTokenClient,
) {
  const client = createClient(accessToken);
  const {
    data: { user },
    error,
  } = await client.auth.getUser(accessToken);

  if (error || !user) {
    throw new AppError(
      "UNAUTHORIZED",
      "登录状态刚刚失效了，请重新登录后再试。",
    );
  }

  return {
    client,
    user,
  };
}

async function loadCurrentUserSettings(
  client: ReturnType<typeof createSupabaseAccessTokenClient>,
  userId: string,
) {
  try {
    return (await loadOrCreateUserSettingsRow(
      client as never,
      userId,
    )) as UserSettingsRow;
  } catch {
    throw new AppError(
      "LOAD_USER_SETTINGS_FAILED",
      "暂时没拉到你的默认设置，请稍后再试。",
    );
  }
}

export function createUserSettingsGetHandler(
  createClient = createSupabaseAccessTokenClient,
) {
  return async function GET(request: Request) {
    try {
      const accessToken = getBearerToken(request);

      if (!accessToken) {
        throw new AppError("UNAUTHORIZED", "请先登录，再查看你的默认设置。");
      }

      const { client, user } = await resolveAuthenticatedUser(
        accessToken,
        createClient,
      );
      const row = await loadCurrentUserSettings(client, user.id);

      return NextResponse.json({
        settings: mapUserSettingsRowToSettings(row),
      } satisfies UserSettingsResponse);
    } catch (error) {
      return NextResponse.json(toApiErrorResponse(error), {
        status: getErrorStatus(error),
      });
    }
  };
}

export function createUserSettingsPatchHandler(
  createClient = createSupabaseAccessTokenClient,
) {
  return async function PATCH(request: Request) {
    try {
      const accessToken = getBearerToken(request);

      if (!accessToken) {
        throw new AppError("UNAUTHORIZED", "请先登录，再更新你的默认设置。");
      }

      const body = userSettingsUpdateSchema.parse(await request.json());
      const { client, user } = await resolveAuthenticatedUser(
        accessToken,
        createClient,
      );
      const currentRow = await loadCurrentUserSettings(client, user.id);
      const currentSettings = mapUserSettingsRowToSettings(currentRow);
      const nextSettings = mergeUserSettings(currentSettings, body);
      const { data, error } = await client
        .from("user_settings")
        .update(toUserSettingsUpdateRow(nextSettings))
        .eq("user_id", user.id)
        .select(
          "id,user_id,travel_preferences_json,workspace_preferences_json,ai_preferences_json,created_at,updated_at",
        )
        .maybeSingle();

      if (error || !data) {
        throw new AppError(
          "UPDATE_USER_SETTINGS_FAILED",
          "暂时还没更新成功，请稍后再试。",
        );
      }

      return NextResponse.json({
        settings: mapUserSettingsRowToSettings(data as UserSettingsRow),
      } satisfies UserSettingsResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          toApiErrorResponse(
            new AppError("INVALID_INPUT", "这份默认设置还不完整，暂时不能这样保存。"),
          ),
          { status: 400 },
        );
      }

      return NextResponse.json(toApiErrorResponse(error), {
        status: getErrorStatus(error),
      });
    }
  };
}

export const GET = createUserSettingsGetHandler();
export const PATCH = createUserSettingsPatchHandler();
export const PUT = createUserSettingsPatchHandler();
