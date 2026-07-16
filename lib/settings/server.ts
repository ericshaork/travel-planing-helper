import type { UserSettingsInsert, UserSettingsRow } from "../supabase/types";

import { cloneDefaultUserSettings } from "./defaults";
import {
  userSettingsSchema,
  type UserSettings,
  type UserSettingsUpdateInput,
} from "./types";

export const userSettingsSelectFields =
  "id,user_id,travel_preferences_json,workspace_preferences_json,ai_preferences_json,created_at,updated_at";

export function buildDefaultUserSettingsInsert(userId: string): UserSettingsInsert {
  const defaults = cloneDefaultUserSettings();

  return {
    user_id: userId,
    travel_preferences_json: defaults.travelPreferences,
    workspace_preferences_json: defaults.workspacePreferences,
    ai_preferences_json: defaults.aiPreferences,
  };
}

export function mapUserSettingsRowToSettings(row: UserSettingsRow): UserSettings {
  return userSettingsSchema.parse({
    travelPreferences: row.travel_preferences_json,
    workspacePreferences: row.workspace_preferences_json,
    aiPreferences: row.ai_preferences_json,
  });
}

export function mergeUserSettings(
  current: UserSettings,
  input: UserSettingsUpdateInput,
): UserSettings {
  return userSettingsSchema.parse({
    travelPreferences: {
      ...current.travelPreferences,
      ...(input.travelPreferences ?? {}),
    },
    workspacePreferences: {
      ...current.workspacePreferences,
      ...(input.workspacePreferences ?? {}),
    },
    aiPreferences: {
      ...current.aiPreferences,
      ...(input.aiPreferences ?? {}),
    },
  });
}

export function toUserSettingsUpdateRow(settings: UserSettings) {
  return {
    travel_preferences_json: settings.travelPreferences,
    workspace_preferences_json: settings.workspacePreferences,
    ai_preferences_json: settings.aiPreferences,
  };
}

export async function loadOrCreateUserSettingsRow(
  client: {
    from: (table: "user_settings") => {
      select: (fields: string) => {
        eq: (column: "user_id", value: string) => {
          maybeSingle: () => Promise<{
            data: UserSettingsRow | null;
            error: unknown;
          }>;
        };
      };
      insert: (payload: UserSettingsInsert) => {
        select: (fields: string) => {
          single: () => Promise<{
            data: UserSettingsRow | null;
            error: unknown;
          }>;
        };
      };
    };
  },
  userId: string,
) {
  const { data, error } = await client
    .from("user_settings")
    .select(userSettingsSelectFields)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error("LOAD_USER_SETTINGS_FAILED");
  }

  if (data) {
    return data;
  }

  const insertPayload = buildDefaultUserSettingsInsert(userId);
  const { data: createdRow, error: insertError } = await client
    .from("user_settings")
    .insert(insertPayload)
    .select(userSettingsSelectFields)
    .single();

  if (insertError || !createdRow) {
    throw new Error("LOAD_USER_SETTINGS_FAILED");
  }

  return createdRow;
}
