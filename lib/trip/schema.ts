import { z } from "zod";

import { TRIP_INPUT_LIMITS } from "./defaults";
import type {
  BudgetSummary,
  DailyItinerary,
  GenerateTripRequest,
  GenerateTripResponse,
  HotelAreaAdvice,
  ItineraryItem,
  ParseTripRequest,
  ParseTripResponse,
  TransportAdvice,
  TransportOption,
  TripPlan,
  TripPlanDraft,
  TripRequest,
  TripRequestDraft,
  TripSourceMeta,
  WeatherSummary,
} from "./types";
import {
  calculateInclusiveTripDays,
  isValidDateRange,
  isValidIsoDate,
} from "./validators";
import type {
  WeatherAlert,
  WeatherDay,
  WeatherForecast,
  WeatherQuery,
} from "../weather/types";

const requiredShortText = z
  .string()
  .trim()
  .min(1, "不能为空")
  .max(TRIP_INPUT_LIMITS.shortText, "内容过长");

const requiredLongText = z
  .string()
  .trim()
  .min(1, "不能为空")
  .max(TRIP_INPUT_LIMITS.longText, "内容过长");

const optionalText = (maxLength: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().min(1).max(maxLength).optional(),
  );

const stringList = z
  .array(
    z
      .string()
      .trim()
      .min(1, "列表项不能为空")
      .max(TRIP_INPUT_LIMITS.listItem, "列表项过长"),
  )
  .max(TRIP_INPUT_LIMITS.listSize, "列表项过多");

const isoDate = z
  .string()
  .refine(isValidIsoDate, "日期必须是有效的 YYYY-MM-DD");

const optionalIsoDate = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  isoDate.optional(),
);

const positiveDays = z
  .number()
  .int("天数必须是整数")
  .positive("天数必须大于 0")
  .max(TRIP_INPUT_LIMITS.maxDays, `天数不能超过 ${TRIP_INPUT_LIMITS.maxDays}`);

const positiveBudget = z
  .number()
  .positive("预算必须大于 0")
  .max(
    TRIP_INPUT_LIMITS.maxBudget,
    `预算不能超过 ${TRIP_INPUT_LIMITS.maxBudget}`,
  );

const tripSourceTypeSchema = z.enum([
  "manual",
  "ai_generate",
  "ai_generated",
  "explore_archive",
  "explore_inspiration",
  "user_created",
]);

function validateRequestDates(
  request: Pick<TripRequestDraft, "startDate" | "endDate" | "days">,
  context: z.RefinementCtx,
  requireMatchingDays: boolean,
) {
  if (!isValidDateRange(request.startDate, request.endDate)) {
    context.addIssue({
      code: "custom",
      path: ["endDate"],
      message: "结束日期不能早于开始日期，且结束日期不能单独填写",
    });
    return;
  }

  if (
    requireMatchingDays &&
    request.startDate &&
    request.endDate &&
    request.days
  ) {
    const calculatedDays = calculateInclusiveTripDays(
      request.startDate,
      request.endDate,
    );

    if (calculatedDays !== request.days) {
      context.addIssue({
        code: "custom",
        path: ["days"],
        message: `天数应与日期区间一致，共 ${calculatedDays} 天`,
      });
    }
  }
}

export const tripRequestDraftSchema: z.ZodType<TripRequestDraft> = z
  .object({
    departureCity: optionalText(TRIP_INPUT_LIMITS.city),
    destinationCity: optionalText(TRIP_INPUT_LIMITS.city),
    startDate: optionalIsoDate,
    endDate: optionalIsoDate,
    days: positiveDays.optional(),
    budget: positiveBudget.optional(),
    currency: optionalText(12),
    interests: stringList.optional(),
    travelStyles: stringList.optional(),
    mustVisitPlaces: stringList.optional(),
    avoidPlaces: stringList.optional(),
    accommodationPreference: optionalText(TRIP_INPUT_LIMITS.shortText),
    localTransportPreference: optionalText(TRIP_INPUT_LIMITS.shortText),
    schedulePreference: optionalText(TRIP_INPUT_LIMITS.shortText),
    specialRequirements: optionalText(TRIP_INPUT_LIMITS.longText),
  })
  .strict()
  .superRefine((request, context) => {
    validateRequestDates(request, context, false);
  });

export const tripRequestSchema: z.ZodType<TripRequest> = z
  .object({
    departureCity: requiredShortText.max(TRIP_INPUT_LIMITS.city),
    destinationCity: requiredShortText.max(TRIP_INPUT_LIMITS.city),
    startDate: optionalIsoDate,
    endDate: optionalIsoDate,
    days: positiveDays,
    budget: positiveBudget,
    currency: requiredShortText.max(12),
    interests: stringList.min(1, "至少选择一个兴趣"),
    travelStyles: stringList.min(1, "至少选择一种出行风格"),
    mustVisitPlaces: stringList,
    avoidPlaces: stringList,
    accommodationPreference: optionalText(TRIP_INPUT_LIMITS.shortText),
    localTransportPreference: optionalText(TRIP_INPUT_LIMITS.shortText),
    schedulePreference: optionalText(TRIP_INPUT_LIMITS.shortText),
    specialRequirements: optionalText(TRIP_INPUT_LIMITS.longText),
  })
  .strict()
  .superRefine((request, context) => {
    validateRequestDates(request, context, true);
  });

export const weatherQuerySchema: z.ZodType<WeatherQuery> = z
  .object({
    city: requiredShortText.max(TRIP_INPUT_LIMITS.city),
    startDate: optionalIsoDate,
    endDate: optionalIsoDate,
    days: positiveDays,
  })
  .strict()
  .superRefine((request, context) => {
    validateRequestDates(request, context, true);
  });

export const weatherDaySchema: z.ZodType<WeatherDay> = z
  .object({
    date: isoDate,
    dayWeather: requiredShortText,
    nightWeather: optionalText(TRIP_INPUT_LIMITS.shortText),
    tempMax: z.number().optional(),
    tempMin: z.number().optional(),
    precipitationProbability: z.number().min(0).max(100).optional(),
    wind: optionalText(TRIP_INPUT_LIMITS.shortText),
    summary: requiredLongText,
  })
  .strict();

export const weatherAlertSchema: z.ZodType<WeatherAlert> = z
  .object({
    title: requiredShortText,
    level: optionalText(TRIP_INPUT_LIMITS.shortText),
    description: requiredLongText,
    startTime: optionalText(TRIP_INPUT_LIMITS.shortText),
    endTime: optionalText(TRIP_INPUT_LIMITS.shortText),
  })
  .strict();

export const weatherForecastSchema: z.ZodType<WeatherForecast> = z
  .object({
    city: requiredShortText.max(TRIP_INPUT_LIMITS.city),
    available: z.boolean(),
    forecastDays: z.array(weatherDaySchema).max(TRIP_INPUT_LIMITS.maxDays),
    alerts: z.array(weatherAlertSchema),
    warnings: stringList,
  })
  .strict();

export const weatherSummarySchema: z.ZodType<WeatherSummary> = z
  .object({
    available: z.boolean(),
    overview: requiredLongText,
    dailyForecast: z
      .array(weatherDaySchema)
      .max(TRIP_INPUT_LIMITS.maxDays),
    alerts: z.array(weatherAlertSchema),
    reminders: stringList,
    dataNote: requiredLongText,
  })
  .strict();

export const budgetSummarySchema: z.ZodType<BudgetSummary> = z
  .object({
    totalEstimate: requiredShortText,
    transport: requiredShortText,
    hotel: requiredShortText,
    food: requiredShortText,
    tickets: requiredShortText,
    localTransport: requiredShortText,
    flexibleSpending: requiredShortText,
    note: requiredLongText,
  })
  .strict();

export const hotelAreaAdviceSchema: z.ZodType<HotelAreaAdvice> = z
  .object({
    area: requiredShortText,
    reason: requiredLongText,
    suitableFor: requiredShortText,
    transportationConvenience: requiredLongText,
    possibleDownside: optionalText(TRIP_INPUT_LIMITS.longText),
    suggestedPlatforms: stringList,
  })
  .strict();

export const transportOptionSchema: z.ZodType<TransportOption> = z
  .object({
    mode: z.enum([
      "flight",
      "train",
      "high_speed_rail",
      "bus",
      "ship",
      "other",
    ]),
    pros: stringList,
    cons: stringList,
    recommendation: requiredLongText,
  })
  .strict();

export const transportAdviceSchema: z.ZodType<TransportAdvice> = z
  .object({
    summary: requiredLongText,
    options: z.array(transportOptionSchema).min(1),
    suggestedPlatforms: stringList,
    note: requiredLongText,
  })
  .strict();

export const itineraryItemSchema: z.ZodType<ItineraryItem> = z
  .object({
    timeLabel: optionalText(TRIP_INPUT_LIMITS.shortText),
    placeName: requiredShortText,
    type: z.enum([
      "attraction",
      "food",
      "transport",
      "hotel",
      "free_time",
      "shopping",
      "other",
    ]),
    reason: requiredLongText,
    suggestedDuration: optionalText(TRIP_INPUT_LIMITS.shortText),
    guide: stringList,
    transportFromPrevious: optionalText(TRIP_INPUT_LIMITS.longText),
    weatherImpact: optionalText(TRIP_INPUT_LIMITS.longText),
    backupPlan: optionalText(TRIP_INPUT_LIMITS.longText),
    matchedInterests: stringList.optional(),
  })
  .strict();

export const dailyItinerarySchema: z.ZodType<DailyItinerary> = z
  .object({
    day: positiveDays,
    date: optionalIsoDate,
    theme: requiredShortText,
    routeOrder: stringList.min(1, "每日路线至少包含一个地点"),
    routeReason: requiredLongText,
    morning: z.array(itineraryItemSchema),
    afternoon: z.array(itineraryItemSchema),
    evening: z.array(itineraryItemSchema),
    dailyTips: stringList,
  })
  .strict();

export const tripPlanSchema: z.ZodType<TripPlan> = z
  .object({
    tripTitle: requiredShortText,
    summary: requiredLongText,
    destination: requiredShortText.max(TRIP_INPUT_LIMITS.city),
    days: positiveDays,
    travelStyleSummary: requiredLongText,
    weatherSummary: weatherSummarySchema,
    budgetSummary: budgetSummarySchema,
    hotelAreaAdvice: z.array(hotelAreaAdviceSchema),
    transportAdvice: transportAdviceSchema,
    dailyItinerary: z.array(dailyItinerarySchema),
    generalTips: stringList,
    warnings: stringList,
  })
  .strict()
  .superRefine((plan, context) => {
    if (plan.dailyItinerary.length !== plan.days) {
      context.addIssue({
        code: "custom",
        path: ["dailyItinerary"],
        message: `每日行程数量必须与 ${plan.days} 天一致`,
      });
    }

    const dayNumbers = new Set(plan.dailyItinerary.map((item) => item.day));

    if (
      dayNumbers.size !== plan.dailyItinerary.length ||
      [...dayNumbers].some((day) => day < 1 || day > plan.days)
    ) {
      context.addIssue({
        code: "custom",
        path: ["dailyItinerary"],
        message: "每日行程编号必须唯一，并处于旅行天数范围内",
      });
    }
  });

export const tripSourceMetaSchema: z.ZodType<TripSourceMeta> = z
  .object({
    sourceType: tripSourceTypeSchema,
    sourceExploreId: optionalText(TRIP_INPUT_LIMITS.shortText),
    sourceExploreSlug: optionalText(TRIP_INPUT_LIMITS.shortText),
  })
  .strict();

export const tripPlanDraftSchema: z.ZodType<TripPlanDraft> = z
  .object({
    tripTitle: requiredShortText,
    sourceType: tripSourceTypeSchema,
    sourceExploreId: optionalText(TRIP_INPUT_LIMITS.shortText),
    sourceExploreSlug: optionalText(TRIP_INPUT_LIMITS.shortText),
    tripRequestDraft: tripRequestDraftSchema,
    tripPlanSeed: tripPlanSchema,
  })
  .strict();

export const parseTripRequestSchema: z.ZodType<ParseTripRequest> = z
  .object({
    text: z
      .string()
      .trim()
      .min(1, "请先写下旅行需求")
      .max(TRIP_INPUT_LIMITS.naturalLanguageText, "旅行需求过长"),
  })
  .strict();

export const parseTripResponseSchema: z.ZodType<ParseTripResponse> = z
  .object({
    parsed: tripRequestDraftSchema,
    missingFields: stringList,
    followUpQuestions: stringList,
  })
  .strict();

export const generateTripRequestSchema: z.ZodType<GenerateTripRequest> = z
  .object({
    tripRequest: tripRequestSchema,
    modificationRequest: optionalText(
      TRIP_INPUT_LIMITS.modificationRequest,
    ),
    previousPlan: tripPlanSchema.optional(),
  })
  .strict()
  .superRefine((request, context) => {
    const hasModification = Boolean(request.modificationRequest);
    const hasPreviousPlan = Boolean(request.previousPlan);

    if (hasModification !== hasPreviousPlan) {
      context.addIssue({
        code: "custom",
        path: hasModification ? ["previousPlan"] : ["modificationRequest"],
        message: "修改要求和上一版方案必须同时提供",
      });
    }
  });

export const generateTripResponseSchema: z.ZodType<GenerateTripResponse> = z
  .object({
    tripPlan: tripPlanSchema,
    appliedChanges: stringList.optional(),
    warnings: stringList.optional(),
  })
  .strict();
