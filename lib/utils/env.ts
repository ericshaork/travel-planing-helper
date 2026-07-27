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
  AI_PROVIDER: z
    .enum(["mock", "qwen", "deepseek", "openai-compatible"])
    .optional(),
  AI_BASE_URL: optionalUrl,
  AI_API_KEY: optionalEnvironmentValue,
  AI_MODEL: optionalEnvironmentValue,
  AI_TIMEOUT_MS: timeoutEnvironmentValue,
  LLM_BASE_URL: optionalUrl,
  LLM_API_KEY: optionalEnvironmentValue,
  LLM_MODEL: optionalEnvironmentValue,
  LLM_TIMEOUT_MS: timeoutEnvironmentValue,
  USE_MOCK_AI: booleanEnvironmentValue(true),
  USE_MOCK_POI: booleanEnvironmentValue(true),
  USE_MOCK_ROUTE: booleanEnvironmentValue(true),
  USE_MOCK_WEATHER: booleanEnvironmentValue(true),
  POI_PROVIDER: z.enum(["mock", "amap"]).default("mock"),
  ROUTE_PROVIDER: z.enum(["mock", "amap"]).default("mock"),
  WEATHER_PROVIDER: z.enum(["mock", "qweather"]).default("mock"),
  AMAP_API_KEY: optionalEnvironmentValue,
  AMAP_SECURITY_JS_CODE: optionalEnvironmentValue,
  QWEATHER_BASE_URL: optionalUrl,
  QWEATHER_API_KEY: optionalEnvironmentValue,
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

export type ResolvedAiProviderName =
  | "mock"
  | "qwen"
  | "deepseek"
  | "openai-compatible";

export interface ResolvedAiRuntimeConfig {
  providerName: ResolvedAiProviderName;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  timeoutMs: number;
}

export function shouldUseMockAi(environment: ServerEnvironment) {
  return environment.USE_MOCK_AI || environment.AI_PROVIDER === "mock";
}

export function resolveAiRuntimeConfig(
  environment: ServerEnvironment,
): ResolvedAiRuntimeConfig {
  if (shouldUseMockAi(environment)) {
    return {
      providerName: "mock",
      timeoutMs: environment.AI_TIMEOUT_MS ?? environment.LLM_TIMEOUT_MS,
    };
  }

  return {
    providerName: environment.AI_PROVIDER ?? "openai-compatible",
    baseUrl: environment.AI_BASE_URL ?? environment.LLM_BASE_URL,
    apiKey: environment.AI_API_KEY ?? environment.LLM_API_KEY,
    model: environment.AI_MODEL ?? environment.LLM_MODEL,
    timeoutMs: environment.AI_TIMEOUT_MS ?? environment.LLM_TIMEOUT_MS,
  };
}

function ensureRealAiConfiguration(environment: ServerEnvironment) {
  if (shouldUseMockAi(environment)) {
    return;
  }

  const config = resolveAiRuntimeConfig(environment);

  if (!config.baseUrl) {
    throw new AppError(
      "AI_GENERATION_FAILED",
      "Real AI is enabled, but AI_BASE_URL or LLM_BASE_URL is missing.",
    );
  }

  if (!config.apiKey) {
    throw new AppError(
      "AI_GENERATION_FAILED",
      "Real AI is enabled, but AI_API_KEY or LLM_API_KEY is missing.",
    );
  }

  if (!config.model) {
    throw new AppError(
      "AI_GENERATION_FAILED",
      "Real AI is enabled, but AI_MODEL or LLM_MODEL is missing.",
    );
  }
}

export function getServerEnvironment(
  source: Readonly<Record<string, string | undefined>> = process.env,
): ServerEnvironment {
  const parsed = serverEnvironmentSchema.safeParse(source);

  if (!parsed.success) {
    const aiBaseUrlIssue = parsed.error.issues.find(
      (issue) => issue.path[0] === "AI_BASE_URL",
    );
    const llmBaseUrlIssue = parsed.error.issues.find(
      (issue) => issue.path[0] === "LLM_BASE_URL",
    );

    if (aiBaseUrlIssue || llmBaseUrlIssue) {
      throw new AppError(
        "AI_GENERATION_FAILED",
        "AI base URL is invalid. Please provide a valid OpenAI-compatible endpoint.",
      );
    }

    throw new AppError(
      "UNKNOWN_ERROR",
      "Server environment variables are invalid.",
    );
  }

  ensureRealAiConfiguration(parsed.data);
  return parsed.data;
}
