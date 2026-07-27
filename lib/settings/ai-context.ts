import { cloneDefaultUserSettings } from "./defaults";
import {
  loadOrCreateUserSettingsRow,
  mapUserSettingsRowToSettings,
} from "./server";
import { buildUserPreferenceContext, type UserPreferenceContext } from "../ai/user-preference-context";

interface ResolveUserPreferenceContextInput {
  client: {
    from: (table: "user_settings") => unknown;
  } | null;
  userId: string;
  useDefaultSettings?: boolean;
}

export async function resolveUserPreferenceContext(
  input: ResolveUserPreferenceContextInput,
): Promise<UserPreferenceContext | null> {
  if (input.useDefaultSettings) {
    return buildUserPreferenceContext(cloneDefaultUserSettings());
  }

  if (!input.client) {
    return null;
  }

  try {
    const row = await loadOrCreateUserSettingsRow(input.client as never, input.userId);
    return buildUserPreferenceContext(mapUserSettingsRowToSettings(row));
  } catch {
    return null;
  }
}
