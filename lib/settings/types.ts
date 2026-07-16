import { z } from "zod";

export const travelPreferencesSchema = z.object({
  budget: z.enum(["budget", "moderate", "comfort"]),
  pace: z.enum(["slow", "balanced", "packed"]),
  interests: z.array(
    z.enum([
      "history_culture",
      "nature",
      "city_walk",
      "food",
      "family",
      "hidden_gems",
    ]),
  ),
  companions: z.enum(["solo", "friends", "partner", "family", "parent_child"]),
  wakeUpPreference: z.enum(["early", "normal", "sleep_in"]),
  transportPreference: z.enum([
    "public_transport",
    "taxi_first",
    "walkable",
    "self_drive",
  ]),
});

export const workspacePreferencesSchema = z.object({
  defaultMode: z.enum(["read", "edit"]),
  mapLayout: z.enum(["balanced", "map_focus", "plan_focus"]),
  mapOverlay: z.enum(["expanded", "collapsed"]),
});

export const aiPreferencesSchema = z.object({
  detailLevel: z.enum(["brief", "standard", "detailed"]),
  useLongTermPreferences: z.boolean(),
  preferHiddenGems: z.boolean(),
  preferLessWalking: z.boolean(),
  preferConvenientTransport: z.boolean(),
});

export const userSettingsSchema = z.object({
  travelPreferences: travelPreferencesSchema,
  workspacePreferences: workspacePreferencesSchema,
  aiPreferences: aiPreferencesSchema,
});

export const userSettingsUpdateSchema = z
  .object({
    travelPreferences: travelPreferencesSchema.partial().optional(),
    workspacePreferences: workspacePreferencesSchema.partial().optional(),
    aiPreferences: aiPreferencesSchema.partial().optional(),
  })
  .refine(
    (value) =>
      Boolean(
        value.travelPreferences ||
          value.workspacePreferences ||
          value.aiPreferences,
      ),
    {
      message: "至少提交一个设置分区。",
      path: ["settings"],
    },
  );

export type TravelPreferences = z.infer<typeof travelPreferencesSchema>;
export type WorkspacePreferences = z.infer<typeof workspacePreferencesSchema>;
export type AiPreferences = z.infer<typeof aiPreferencesSchema>;
export type UserSettings = z.infer<typeof userSettingsSchema>;
export type UserSettingsUpdateInput = z.infer<typeof userSettingsUpdateSchema>;

export interface UserSettingsResponse {
  settings: UserSettings;
}
