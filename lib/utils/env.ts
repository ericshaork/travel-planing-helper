import "server-only";

import { z } from "zod";

import { AppError } from "./errors";

const DEFAULT_LLM_TIMEOUT_MS = 120_000;

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

const timeoutEnvironmentValue = z.preprocess((value) => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return DEFAULT_LLM_TIMEOUT_MS;
    }

    const parsed = Number.parseInt(trimmed, 10);

    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return DEFAULT_LLM_TIMEOUT_MS;
}, z.number().int().positive().default(DEFAULT_LLM_TIMEOUT_MS));

const serverEnvironmentSchema = z.object({
  LLM_BASE_URL: optionalUrl,
  LLM_API_KEY: optionalEnvironmentValue,
  LLM_MODEL: optionalEnvironmentValue,
  LLM_TIMEOUT_MS: timeoutEnvironmentValue,
  USE_MOCK_AI: booleanEnvironmentValue(true),
  WEATHER_PROVIDER: z.enum(["qweather"]).default("qweather"),
  QWEATHER_BASE_URL: optionalUrl,
  QWEATHER_API_KEY: optionalEnvironmentValue,
  USE_MOCK_WEATHER: booleanEnvironmentValue(true),
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

function ensureRealAiConfiguration(environment: ServerEnvironment) {
  if (environment.USE_MOCK_AI) {
    return;
  }

  if (!environment.LLM_BASE_URL) {
    throw new AppError(
      "AI_GENERATION_FAILED",
      "真实模型已开启，但缺少 LLM_BASE_URL，请检查服务端环境变量。",
    );
  }

  if (!environment.LLM_API_KEY) {
    throw new AppError(
      "AI_GENERATION_FAILED",
      "真实模型已开启，但缺少 LLM_API_KEY，请检查服务端环境变量。",
    );
  }

  if (!environment.LLM_MODEL) {
    throw new AppError(
      "AI_GENERATION_FAILED",
      "真实模型已开启，但缺少 LLM_MODEL，请检查服务端环境变量。",
    );
  }
}

export function getServerEnvironment(
  source: Readonly<Record<string, string | undefined>> = process.env,
): ServerEnvironment {
  const parsed = serverEnvironmentSchema.safeParse(source);

  if (!parsed.success) {
    const llmBaseUrlIssue = parsed.error.issues.find(
      (issue) => issue.path[0] === "LLM_BASE_URL",
    );

    if (llmBaseUrlIssue) {
      throw new AppError(
        "AI_GENERATION_FAILED",
        "LLM_BASE_URL 格式不正确，请填写 OpenAI-compatible Base URL。",
      );
    }

    throw new AppError(
      "UNKNOWN_ERROR",
      "服务端环境变量格式不正确，请检查部署配置。",
    );
  }

  ensureRealAiConfiguration(parsed.data);
  return parsed.data;
}
