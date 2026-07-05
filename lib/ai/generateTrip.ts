import "server-only";

import { z } from "zod";

import {
  generateTripResponseSchema,
  tripPlanSchema,
} from "../trip/schema";
import type {
  GenerateTripRequest,
  GenerateTripResponse,
  TripPlan,
} from "../trip/types";
import { AppError } from "../utils/errors";
import type { WeatherDay, WeatherForecast } from "../weather/types";
import {
  extractJsonObject,
  OpenAICompatibleProvider,
} from "./openai-compatible";
import {
  summarizeObjectFieldTypes,
  summarizeObjectKeys,
  summarizeZodIssues,
} from "./parse-trip-normalize";
import { buildTripPlanRepairInstructions } from "./prompts";
import type { LLMProvider } from "./provider";

export interface GenerateTripWithContextInput extends GenerateTripRequest {
  weatherForecast?: WeatherForecast;
  weatherWarning?: string;
}

type GeneratePhase = "generate-trip" | "regenerate-trip";

const FALLBACK_WEATHER_SUMMARY = "当前使用演示天气，出发前请再次确认。";

interface DecodedProviderOutput {
  candidate: unknown;
  extracted?: unknown;
  jsonExtractSucceeded: boolean;
}

interface GenerateResponseMetadata {
  appliedChanges?: string[];
  warnings?: string[];
}

interface ValidationSuccess {
  response: GenerateTripResponse;
  normalizedCandidate: unknown;
}

interface ValidationFailure {
  normalizedCandidate: unknown;
  schemaIssues: Array<{
    path: string;
    expected?: unknown;
    received?: unknown;
    message: string;
  }>;
}

function decodeProviderOutput(rawOutput: unknown): DecodedProviderOutput {
  if (typeof rawOutput !== "string") {
    return {
      candidate: rawOutput,
      extracted: rawOutput,
      jsonExtractSucceeded: true,
    };
  }

  try {
    const extracted = extractJsonObject(rawOutput);

    return {
      candidate: extracted,
      extracted,
      jsonExtractSucceeded: true,
    };
  } catch {
    return {
      candidate: undefined,
      jsonExtractSucceeded: false,
    };
  }
}

function toOptionalStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const items = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : undefined;
}

function extractGenerateResponseMetadata(
  candidate: unknown,
): GenerateResponseMetadata {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return {};
  }

  const record = candidate as Record<string, unknown>;

  return {
    appliedChanges: toOptionalStringArray(record.appliedChanges),
    warnings: toOptionalStringArray(record.warnings),
  };
}

function buildGenerateTripResponse(
  tripPlan: TripPlan,
  metadata: GenerateResponseMetadata = {},
): GenerateTripResponse {
  return generateTripResponseSchema.parse({
    tripPlan,
    ...(metadata.appliedChanges ? { appliedChanges: metadata.appliedChanges } : {}),
    ...(metadata.warnings ? { warnings: metadata.warnings } : {}),
  });
}

function mapTransportMode(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return "other";
  }

  if (["flight", "train", "high_speed_rail", "bus", "ship", "other"].includes(normalized)) {
    return normalized;
  }

  if (
    normalized.includes("地铁") ||
    normalized.includes("打车") ||
    normalized.includes("出租车") ||
    normalized.includes("网约车") ||
    normalized.includes("步行")
  ) {
    return "other";
  }

  if (normalized.includes("高铁") || normalized.includes("动车")) {
    return "high_speed_rail";
  }

  if (normalized.includes("飞机") || normalized.includes("航班")) {
    return "flight";
  }

  if (normalized.includes("火车")) {
    return "train";
  }

  if (normalized.includes("公交") || normalized.includes("大巴")) {
    return "bus";
  }

  if (normalized.includes("船") || normalized.includes("轮渡")) {
    return "ship";
  }

  return "other";
}

function normalizeWeatherDayCandidate(
  value: unknown,
  fallbackDay?: WeatherDay,
): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  const record = value as Record<string, unknown>;

  return {
    ...record,
    date:
      typeof record.date === "string" && record.date.trim()
        ? record.date
        : fallbackDay?.date,
    dayWeather:
      typeof record.dayWeather === "string" && record.dayWeather.trim()
        ? record.dayWeather
        : fallbackDay?.dayWeather,
    nightWeather:
      typeof record.nightWeather === "string" && record.nightWeather.trim()
        ? record.nightWeather
        : fallbackDay?.nightWeather,
    tempMax:
      typeof record.tempMax === "number" ? record.tempMax : fallbackDay?.tempMax,
    tempMin:
      typeof record.tempMin === "number" ? record.tempMin : fallbackDay?.tempMin,
    precipitationProbability:
      typeof record.precipitationProbability === "number"
        ? record.precipitationProbability
        : fallbackDay?.precipitationProbability,
    wind:
      typeof record.wind === "string" && record.wind.trim()
        ? record.wind
        : fallbackDay?.wind,
    summary:
      typeof record.summary === "string" && record.summary.trim()
        ? record.summary
        : fallbackDay?.summary ?? FALLBACK_WEATHER_SUMMARY,
  };
}

function normalizeTripPlanCandidate(
  candidate: unknown,
  weatherForecast?: WeatherForecast,
): unknown {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return candidate;
  }

  const record = candidate as Record<string, unknown>;
  const weatherSummary =
    record.weatherSummary &&
    typeof record.weatherSummary === "object" &&
    !Array.isArray(record.weatherSummary)
      ? (record.weatherSummary as Record<string, unknown>)
      : undefined;
  const transportAdvice =
    record.transportAdvice &&
    typeof record.transportAdvice === "object" &&
    !Array.isArray(record.transportAdvice)
      ? (record.transportAdvice as Record<string, unknown>)
      : undefined;

  return {
    ...record,
    weatherSummary: weatherSummary
      ? {
          ...weatherSummary,
          dailyForecast: Array.isArray(weatherSummary.dailyForecast)
            ? weatherSummary.dailyForecast.map((day, index) =>
                normalizeWeatherDayCandidate(
                  day,
                  weatherForecast?.forecastDays[index],
                ),
              )
            : weatherSummary.dailyForecast,
        }
      : record.weatherSummary,
    transportAdvice: transportAdvice
      ? {
          ...transportAdvice,
          options: Array.isArray(transportAdvice.options)
            ? transportAdvice.options.map((option) => {
                if (!option || typeof option !== "object" || Array.isArray(option)) {
                  return option;
                }

                const optionRecord = option as Record<string, unknown>;

                return {
                  ...optionRecord,
                  mode: mapTransportMode(optionRecord.mode),
                };
              })
            : transportAdvice.options,
        }
      : record.transportAdvice,
  };
}

function normalizeGenerateTripCandidate(
  candidate: unknown,
  weatherForecast?: WeatherForecast,
): unknown {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return candidate;
  }

  const record = candidate as Record<string, unknown>;

  if ("data" in record) {
    return normalizeGenerateTripCandidate(record.data, weatherForecast);
  }

  if ("result" in record) {
    return normalizeGenerateTripCandidate(record.result, weatherForecast);
  }

  if ("plan" in record) {
    return normalizeGenerateTripCandidate(record.plan, weatherForecast);
  }

  if ("tripPlan" in record) {
    return {
      tripPlan: normalizeTripPlanCandidate(record.tripPlan, weatherForecast),
      ...extractGenerateResponseMetadata(record),
    };
  }

  return normalizeTripPlanCandidate(candidate, weatherForecast);
}

function validateGenerateTripOutput(
  candidate: unknown,
  weatherForecast?: WeatherForecast,
): ValidationSuccess | ValidationFailure {
  const normalizedCandidate = normalizeGenerateTripCandidate(
    candidate,
    weatherForecast,
  );
  const responseResult = generateTripResponseSchema.safeParse(normalizedCandidate);

  if (responseResult.success) {
    return {
      response: responseResult.data,
      normalizedCandidate,
    };
  }

  const metadata = extractGenerateResponseMetadata(normalizedCandidate);
  const tripPlanCandidate =
    normalizedCandidate &&
    typeof normalizedCandidate === "object" &&
    !Array.isArray(normalizedCandidate) &&
    "tripPlan" in (normalizedCandidate as Record<string, unknown>)
      ? (normalizedCandidate as Record<string, unknown>).tripPlan
      : normalizedCandidate;
  const tripPlanResult = tripPlanSchema.safeParse(tripPlanCandidate);

  if (tripPlanResult.success) {
    return {
      response: buildGenerateTripResponse(tripPlanResult.data, metadata),
      normalizedCandidate,
    };
  }

  const schemaError =
    tripPlanCandidate !== normalizedCandidate
      ? tripPlanResult.error
      : responseResult.error;

  return {
    normalizedCandidate,
    schemaIssues: summarizeZodIssues(schemaError),
  };
}

function invalidOutputError(): AppError {
  return new AppError(
    "AI_OUTPUT_INVALID",
    "模型刚刚没有返回合法 JSON 结果，请再试一次。",
  );
}

function logGenerateTripDiagnostics(
  provider: LLMProvider,
  phase: GeneratePhase,
  details: {
    error: AppError;
    jsonExtractSucceeded?: boolean;
    extractedTopLevelKeys?: string[];
    extractedFieldTypes?: Record<string, string>;
    normalizedTopLevelKeys?: string[];
    normalizedFieldTypes?: Record<string, string>;
    schemaIssues?: Array<{
      path: string;
      expected?: unknown;
      received?: unknown;
      message: string;
    }>;
    repairAttempted?: boolean;
    repairSucceeded?: boolean;
  },
) {
  const providerDetails =
    provider instanceof OpenAICompatibleProvider
      ? {
          provider: provider.providerName,
          model: provider.getModelName(),
          timeoutMs: provider.getTimeoutMs(),
          requestUrl: provider.getSafeEndpointSummary(),
        }
      : {
          provider: provider.providerName,
        };

  console.error("[generate-trip] diagnostics", {
    phase,
    ...providerDetails,
    errorCode: details.error.code,
    errorMessage: details.error.message,
    jsonExtractSucceeded: details.jsonExtractSucceeded,
    extractedTopLevelKeys: details.extractedTopLevelKeys,
    extractedFieldTypes: details.extractedFieldTypes,
    normalizedTopLevelKeys: details.normalizedTopLevelKeys,
    normalizedFieldTypes: details.normalizedFieldTypes,
    schemaIssues: details.schemaIssues,
    repairAttempted: details.repairAttempted,
    repairSucceeded: details.repairSucceeded,
  });
}

export async function generateTripWithProvider(
  input: GenerateTripWithContextInput,
  provider: LLMProvider,
): Promise<GenerateTripResponse> {
  let rawOutput: unknown;
  const phase: GeneratePhase =
    input.modificationRequest && input.previousPlan
      ? "regenerate-trip"
      : "generate-trip";

  try {
    rawOutput =
      phase === "regenerate-trip"
        ? await provider.regenerateTrip({
            tripRequest: input.tripRequest,
            previousPlan: input.previousPlan!,
            modificationRequest: input.modificationRequest!,
            weatherForecast: input.weatherForecast,
            weatherWarning: input.weatherWarning,
          })
        : await provider.generateTrip({
            tripRequest: input.tripRequest,
            weatherForecast: input.weatherForecast,
            weatherWarning: input.weatherWarning,
          });
  } catch (error) {
    if (error instanceof AppError) {
      logGenerateTripDiagnostics(provider, phase, {
        error,
      });
      throw error;
    }

    throw new AppError(
      "AI_GENERATION_FAILED",
      "暂时无法生成方案，请稍后重试。",
    );
  }

  const decoded = decodeProviderOutput(rawOutput);
  const firstValidation = validateGenerateTripOutput(
    decoded.candidate,
    input.weatherForecast,
  );

  if ("response" in firstValidation) {
    return firstValidation.response;
  }

  const invalidError = invalidOutputError();

  logGenerateTripDiagnostics(provider, phase, {
    error: invalidError,
    jsonExtractSucceeded: decoded.jsonExtractSucceeded,
    extractedTopLevelKeys: summarizeObjectKeys(decoded.extracted),
    extractedFieldTypes: summarizeObjectFieldTypes(decoded.extracted),
    normalizedTopLevelKeys: summarizeObjectKeys(firstValidation.normalizedCandidate),
    normalizedFieldTypes: summarizeObjectFieldTypes(
      firstValidation.normalizedCandidate,
    ),
    schemaIssues: firstValidation.schemaIssues,
    repairAttempted: false,
    repairSucceeded: false,
  });

  try {
    const repaired = await provider.repairJson({
      rawOutput,
      targetSchema: z.unknown(),
      instructions: buildTripPlanRepairInstructions(phase),
    });
    const repairedValidation = validateGenerateTripOutput(
      repaired,
      input.weatherForecast,
    );

    if ("response" in repairedValidation) {
      logGenerateTripDiagnostics(provider, phase, {
        error: invalidError,
        jsonExtractSucceeded: decoded.jsonExtractSucceeded,
        extractedTopLevelKeys: summarizeObjectKeys(decoded.extracted),
        extractedFieldTypes: summarizeObjectFieldTypes(decoded.extracted),
        normalizedTopLevelKeys: summarizeObjectKeys(
          repairedValidation.normalizedCandidate,
        ),
        normalizedFieldTypes: summarizeObjectFieldTypes(
          repairedValidation.normalizedCandidate,
        ),
        repairAttempted: true,
        repairSucceeded: true,
      });

      return repairedValidation.response;
    }

    logGenerateTripDiagnostics(provider, phase, {
      error: invalidError,
      jsonExtractSucceeded: decoded.jsonExtractSucceeded,
      extractedTopLevelKeys: summarizeObjectKeys(decoded.extracted),
      extractedFieldTypes: summarizeObjectFieldTypes(decoded.extracted),
      normalizedTopLevelKeys: summarizeObjectKeys(
        repairedValidation.normalizedCandidate,
      ),
      normalizedFieldTypes: summarizeObjectFieldTypes(
        repairedValidation.normalizedCandidate,
      ),
      schemaIssues: repairedValidation.schemaIssues,
      repairAttempted: true,
      repairSucceeded: false,
    });
  } catch {
    logGenerateTripDiagnostics(provider, phase, {
      error: invalidError,
      jsonExtractSucceeded: decoded.jsonExtractSucceeded,
      extractedTopLevelKeys: summarizeObjectKeys(decoded.extracted),
      extractedFieldTypes: summarizeObjectFieldTypes(decoded.extracted),
      normalizedTopLevelKeys: summarizeObjectKeys(firstValidation.normalizedCandidate),
      normalizedFieldTypes: summarizeObjectFieldTypes(
        firstValidation.normalizedCandidate,
      ),
      schemaIssues: firstValidation.schemaIssues,
      repairAttempted: true,
      repairSucceeded: false,
    });
  }

  throw invalidError;
}
