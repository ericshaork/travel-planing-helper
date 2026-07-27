import "server-only";

import { z } from "zod";

import {
  generateTripResponseSchema,
  tripPlanSchema,
} from "../trip/schema";
import { isValidIsoDate } from "../trip/validators";
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
  preferenceSummary?: string;
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

const ITINERARY_TYPE_ENUM = new Set([
  "attraction",
  "food",
  "transport",
  "hotel",
  "free_time",
  "shopping",
  "other",
]);

function mapItineraryType(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "other";
  }

  const lower = trimmed.toLowerCase().replace(/[\s-]+/g, "_");
  if (ITINERARY_TYPE_ENUM.has(lower)) {
    return lower;
  }

  if (lower === "attractions" || lower === "sightseeing" || lower === "landmark") {
    return "attraction";
  }
  if (lower === "meal" || lower === "restaurant" || lower === "dining") {
    return "food";
  }
  if (lower === "commute" || lower === "transit") {
    return "transport";
  }
  if (lower === "lodging" || lower === "stay" || lower === "accommodation") {
    return "hotel";
  }
  if (lower === "free" || lower === "leisure" || lower === "freetime") {
    return "free_time";
  }
  if (lower === "shop" || lower === "market") {
    return "shopping";
  }

  const zh = trimmed;
  if (
    zh.includes("景点") ||
    zh.includes("景区") ||
    zh.includes("景观") ||
    zh.includes("参观") ||
    zh.includes("游览") ||
    zh.includes("打卡") ||
    zh.includes("博物馆") ||
    zh.includes("公园")
  ) {
    return "attraction";
  }
  if (
    zh.includes("美食") ||
    zh.includes("餐饮") ||
    zh.includes("用餐") ||
    zh.includes("饮食") ||
    zh.includes("餐厅") ||
    zh.includes("小吃") ||
    zh.includes("早餐") ||
    zh.includes("午餐") ||
    zh.includes("晚餐") ||
    zh.includes("下午茶") ||
    zh.includes("夜宵")
  ) {
    return "food";
  }
  if (
    zh.includes("交通") ||
    zh.includes("接送") ||
    zh.includes("出行") ||
    zh.includes("换乘") ||
    zh.includes("车站")
  ) {
    return "transport";
  }
  if (
    zh.includes("酒店") ||
    zh.includes("住宿") ||
    zh.includes("民宿") ||
    zh.includes("旅馆") ||
    zh.includes("入住") ||
    zh.includes("退房")
  ) {
    return "hotel";
  }
  if (
    zh.includes("自由活动") ||
    zh.includes("自由时间") ||
    zh.includes("自由安排") ||
    zh.includes("休息") ||
    zh.includes("闲逛") ||
    zh.includes("漫步") ||
    zh.includes("散步")
  ) {
    return "free_time";
  }
  if (
    zh.includes("购物") ||
    zh.includes("逛街") ||
    zh.includes("采购") ||
    zh.includes("商场") ||
    zh.includes("市场")
  ) {
    return "shopping";
  }

  return "other";
}

function coerceStringToArray(value: unknown): unknown {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  return value;
}

function coerceStringArrayFields(
  record: Record<string, unknown>,
  keys: readonly string[],
): Record<string, unknown> {
  const next = { ...record };
  for (const key of keys) {
    if (key in next) {
      next[key] = coerceStringToArray(next[key]);
    }
  }
  return next;
}

const FALLBACK_WEATHER_DAY_LABEL = "天气数据待补充";

function computeFallbackIsoDate(offsetDays: number): string {
  const base = new Date();
  base.setUTCHours(0, 0, 0, 0);
  base.setUTCDate(base.getUTCDate() + Math.max(0, offsetDays));
  const year = base.getUTCFullYear();
  const month = String(base.getUTCMonth() + 1).padStart(2, "0");
  const day = String(base.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function resolveWeatherDayDate(
  modelDate: unknown,
  fallbackDate: string | undefined,
  dayOffset: number,
): string {
  if (typeof modelDate === "string") {
    const trimmed = modelDate.trim();
    if (trimmed && isValidIsoDate(trimmed)) {
      return trimmed;
    }
  }
  if (fallbackDate && isValidIsoDate(fallbackDate)) {
    return fallbackDate;
  }
  return computeFallbackIsoDate(dayOffset);
}

function normalizeWeatherDayCandidate(
  value: unknown,
  fallbackDay?: WeatherDay,
  dayOffset = 0,
): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  const record = value as Record<string, unknown>;

  const resolvedDate = resolveWeatherDayDate(
    record.date,
    fallbackDay?.date,
    dayOffset,
  );

  const modelDayWeather =
    typeof record.dayWeather === "string" && record.dayWeather.trim()
      ? record.dayWeather.trim()
      : undefined;
  const dayWeather =
    modelDayWeather ?? fallbackDay?.dayWeather ?? FALLBACK_WEATHER_DAY_LABEL;

  const modelSummary =
    typeof record.summary === "string" && record.summary.trim()
      ? record.summary.trim()
      : undefined;
  const summary =
    modelSummary ?? fallbackDay?.summary ?? FALLBACK_WEATHER_SUMMARY;

  return {
    ...record,
    date: resolvedDate,
    dayWeather,
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
    summary,
  };
}

function normalizeItineraryItem(item: unknown): unknown {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    return item;
  }

  const record = { ...(item as Record<string, unknown>) };

  if ("type" in record) {
    record.type = mapItineraryType(record.type);
  }

  return coerceStringArrayFields(record, ["guide", "matchedInterests"]);
}

const DAY_SLOT_KEYS = ["morning", "afternoon", "evening"] as const;

function coerceSlotToArray(value: unknown): unknown[] {
  if (value === null || value === undefined) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.filter((item) => item !== null && item !== undefined);
  }
  if (typeof value === "object") {
    return [value];
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [{ placeName: trimmed }] : [];
  }
  return [];
}

function redistributeDaySlots(
  record: Record<string, unknown>,
): Record<string, unknown> {
  const slotItems: Record<(typeof DAY_SLOT_KEYS)[number], unknown[]> = {
    morning: [],
    afternoon: [],
    evening: [],
  };
  for (const slot of DAY_SLOT_KEYS) {
    const value = record[slot];
    slotItems[slot] = Array.isArray(value) ? value.filter(Boolean) : [];
  }

  const emptySlots = DAY_SLOT_KEYS.filter(
    (slot) => slotItems[slot].length === 0,
  );
  const overloadedSlots = DAY_SLOT_KEYS.filter(
    (slot) => slotItems[slot].length >= 2,
  );

  if (emptySlots.length === 0 || overloadedSlots.length === 0) {
    return record;
  }

  // Only auto-redistribute when there is exactly one non-empty slot that
  // holds 2+ items and one or two other slots are empty. This handles the
  // common LLM mistake of dumping all activities into `morning` without
  // touching `afternoon` / `evening`, without stepping on a plan where the
  // author intentionally left evening blank.
  const nonEmptySlots = DAY_SLOT_KEYS.filter(
    (slot) => slotItems[slot].length > 0,
  );
  if (nonEmptySlots.length !== 1) {
    return record;
  }
  const sourceSlot = nonEmptySlots[0];
  const sourceItems = [...slotItems[sourceSlot]];
  if (sourceItems.length < 2) {
    return record;
  }

  // Rebuild slot assignments: keep the first item in the source slot, hand
  // subsequent items to the empty slots in canonical order (morning →
  // afternoon → evening) so the earliest activity anchors the earliest slot.
  const rebuilt: Record<(typeof DAY_SLOT_KEYS)[number], unknown[]> = {
    morning: [],
    afternoon: [],
    evening: [],
  };
  const targetOrder: (typeof DAY_SLOT_KEYS)[number][] = [];
  for (const slot of DAY_SLOT_KEYS) {
    if (slot === sourceSlot || emptySlots.includes(slot)) {
      targetOrder.push(slot);
    }
  }
  for (let index = 0; index < sourceItems.length; index += 1) {
    const targetSlot = targetOrder[index] ?? targetOrder[targetOrder.length - 1];
    rebuilt[targetSlot].push(sourceItems[index]);
  }

  return {
    ...record,
    morning: rebuilt.morning,
    afternoon: rebuilt.afternoon,
    evening: rebuilt.evening,
  };
}

function normalizeItineraryDay(day: unknown): unknown {
  if (!day || typeof day !== "object" || Array.isArray(day)) {
    return day;
  }

  let record = { ...(day as Record<string, unknown>) };

  if (
    typeof record.date === "string" &&
    !isValidIsoDate(record.date.trim())
  ) {
    delete record.date;
  }

  record = coerceStringArrayFields(record, ["routeOrder", "dailyTips"]);

  for (const slot of DAY_SLOT_KEYS) {
    const coerced = coerceSlotToArray(record[slot]);
    record[slot] = coerced.map(normalizeItineraryItem);
  }

  record = redistributeDaySlots(record);

  return record;
}

function normalizeHotelAreaAdvice(item: unknown): unknown {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    return item;
  }

  const record = { ...(item as Record<string, unknown>) };
  return coerceStringArrayFields(record, ["suggestedPlatforms"]);
}

function normalizeTransportOption(option: unknown): unknown {
  if (!option || typeof option !== "object" || Array.isArray(option)) {
    return option;
  }

  const record = { ...(option as Record<string, unknown>) };
  record.mode = mapTransportMode(record.mode);
  return coerceStringArrayFields(record, ["pros", "cons"]);
}

function normalizeTripPlanCandidate(
  candidate: unknown,
  weatherForecast?: WeatherForecast,
  fallbackDestination?: string,
): unknown {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return candidate;
  }

  let record = coerceStringArrayFields(
    { ...(candidate as Record<string, unknown>) },
    ["generalTips", "warnings"],
  );

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

  const destinationValue =
    typeof record.destination === "string" ? record.destination.trim() : "";
  const fallbackValue =
    typeof fallbackDestination === "string" ? fallbackDestination.trim() : "";
  const resolvedDestination =
    destinationValue.length === 0 && fallbackValue.length > 0
      ? fallbackValue
      : record.destination;

  const dailyItinerary = Array.isArray(record.dailyItinerary)
    ? record.dailyItinerary.map(normalizeItineraryDay)
    : record.dailyItinerary;

  const hotelAreaAdvice = Array.isArray(record.hotelAreaAdvice)
    ? record.hotelAreaAdvice.map(normalizeHotelAreaAdvice)
    : record.hotelAreaAdvice;

  const normalizedWeatherSummary = weatherSummary
    ? coerceStringArrayFields(
        {
          ...weatherSummary,
          dailyForecast: Array.isArray(weatherSummary.dailyForecast)
            ? weatherSummary.dailyForecast.map((day, index) =>
                normalizeWeatherDayCandidate(
                  day,
                  weatherForecast?.forecastDays[index],
                  index,
                ),
              )
            : weatherSummary.dailyForecast,
        },
        ["reminders"],
      )
    : record.weatherSummary;

  const normalizedTransportAdvice = transportAdvice
    ? coerceStringArrayFields(
        {
          ...transportAdvice,
          options: Array.isArray(transportAdvice.options)
            ? transportAdvice.options.map(normalizeTransportOption)
            : transportAdvice.options,
        },
        ["suggestedPlatforms"],
      )
    : record.transportAdvice;

  record = {
    ...record,
    destination: resolvedDestination,
    dailyItinerary,
    hotelAreaAdvice,
    weatherSummary: normalizedWeatherSummary,
    transportAdvice: normalizedTransportAdvice,
  };

  return record;
}

const FLAT_TRIP_PLAN_MARKER_KEYS = new Set([
  "tripTitle",
  "summary",
  "destination",
  "days",
  "travelStyleSummary",
  "dailyItinerary",
]);

function looksLikeFlatTripPlan(candidate: unknown): boolean {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return false;
  }

  const record = candidate as Record<string, unknown>;

  if ("tripPlan" in record) {
    return false;
  }

  let hits = 0;
  for (const key of FLAT_TRIP_PLAN_MARKER_KEYS) {
    if (key in record) {
      hits += 1;
    }
    if (hits >= 3) {
      return true;
    }
  }
  return false;
}

function normalizeGenerateTripCandidate(
  candidate: unknown,
  weatherForecast?: WeatherForecast,
  fallbackDestination?: string,
): unknown {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return candidate;
  }

  const record = candidate as Record<string, unknown>;

  if ("data" in record) {
    return normalizeGenerateTripCandidate(
      record.data,
      weatherForecast,
      fallbackDestination,
    );
  }

  if ("result" in record) {
    return normalizeGenerateTripCandidate(
      record.result,
      weatherForecast,
      fallbackDestination,
    );
  }

  if ("plan" in record) {
    return normalizeGenerateTripCandidate(
      record.plan,
      weatherForecast,
      fallbackDestination,
    );
  }

  if ("tripPlan" in record) {
    return {
      tripPlan: normalizeTripPlanCandidate(
        record.tripPlan,
        weatherForecast,
        fallbackDestination,
      ),
      ...extractGenerateResponseMetadata(record),
    };
  }

  if (looksLikeFlatTripPlan(candidate)) {
    return {
      tripPlan: normalizeTripPlanCandidate(
        candidate,
        weatherForecast,
        fallbackDestination,
      ),
      ...extractGenerateResponseMetadata(record),
    };
  }

  return normalizeTripPlanCandidate(
    candidate,
    weatherForecast,
    fallbackDestination,
  );
}

function validateGenerateTripOutput(
  candidate: unknown,
  weatherForecast?: WeatherForecast,
  fallbackDestination?: string,
): ValidationSuccess | ValidationFailure {
  const normalizedCandidate = normalizeGenerateTripCandidate(
    candidate,
    weatherForecast,
    fallbackDestination,
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

  // Prefer the deepest / most informative error. When we attempted the
  // flat-tripPlan fallback (tripPlanCandidate === normalizedCandidate) the
  // response-schema error is just "expected object at path tripPlan" which
  // obscures the real field-level issues; use the tripPlan-schema error in
  // both cases so diagnostics point at the actual failure.
  const schemaError = tripPlanResult.error;

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
  const payload = {
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
  };
  let serialized: string;
  try {
    serialized = JSON.stringify(payload, null, 2);
  } catch {
    serialized = "<unserializable diagnostics payload>";
  }

  console.error(`[generate-trip] diagnostics ${serialized}`);
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
  const fallbackDestination = input.tripRequest.destinationCity;
  const firstValidation = validateGenerateTripOutput(
    decoded.candidate,
    input.weatherForecast,
    fallbackDestination,
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
      fallbackDestination,
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
