import type {
  AiPreferences,
  TravelPreferences,
  UserSettings,
  WorkspacePreferences,
} from "./types";

export const DEFAULT_TRAVEL_PREFERENCES: TravelPreferences = {
  budget: "moderate",
  pace: "balanced",
  interests: [],
  companions: "solo",
  wakeUpPreference: "normal",
  transportPreference: "public_transport",
};

export const DEFAULT_WORKSPACE_PREFERENCES: WorkspacePreferences = {
  defaultMode: "read",
  mapLayout: "balanced",
  mapOverlay: "expanded",
};

export const DEFAULT_AI_PREFERENCES: AiPreferences = {
  detailLevel: "standard",
  useLongTermPreferences: true,
  preferHiddenGems: false,
  preferLessWalking: false,
  preferConvenientTransport: true,
};

export const DEFAULT_USER_SETTINGS: UserSettings = {
  travelPreferences: DEFAULT_TRAVEL_PREFERENCES,
  workspacePreferences: DEFAULT_WORKSPACE_PREFERENCES,
  aiPreferences: DEFAULT_AI_PREFERENCES,
};

export function cloneDefaultUserSettings(): UserSettings {
  return {
    travelPreferences: {
      ...DEFAULT_TRAVEL_PREFERENCES,
      interests: [...DEFAULT_TRAVEL_PREFERENCES.interests],
    },
    workspacePreferences: {
      ...DEFAULT_WORKSPACE_PREFERENCES,
    },
    aiPreferences: {
      ...DEFAULT_AI_PREFERENCES,
    },
  };
}
