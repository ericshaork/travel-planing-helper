import "server-only";

import { z } from "zod";

const optionalEnvironmentValue = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().optional(),
);

const optionalUrl = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().url().optional(),
);

const booleanEnvironmentValue = (defaultValue: boolean) =>
  z
    .enum(["true", "false"])
    .default(defaultValue ? "true" : "false")
    .transform((value) => value === "true");

const serverEnvironmentSchema = z
  .object({
    LLM_BASE_URL: optionalUrl,
    LLM_API_KEY: optionalEnvironmentValue,
    LLM_MODEL: optionalEnvironmentValue,
    USE_MOCK_AI: booleanEnvironmentValue(true),
    WEATHER_PROVIDER: z.enum(["qweather"]).default("qweather"),
    QWEATHER_BASE_URL: optionalUrl,
    QWEATHER_API_KEY: optionalEnvironmentValue,
    USE_MOCK_WEATHER: booleanEnvironmentValue(true),
  })
  .superRefine((environment, context) => {
    if (environment.USE_MOCK_AI) {
      return;
    }

    const requiredRealAiValues = [
      ["LLM_BASE_URL", environment.LLM_BASE_URL],
      ["LLM_API_KEY", environment.LLM_API_KEY],
      ["LLM_MODEL", environment.LLM_MODEL],
    ] as const;

    for (const [key, value] of requiredRealAiValues) {
      if (!value) {
        context.addIssue({
          code: "custom",
          path: [key],
          message: `${key} 在真实模型模式下不能为空`,
        });
      }
    }
  });

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

export function getServerEnvironment(
  source: Readonly<Record<string, string | undefined>> = process.env,
): ServerEnvironment {
  return serverEnvironmentSchema.parse(source);
}
