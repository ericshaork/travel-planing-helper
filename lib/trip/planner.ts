import "server-only";

import {
  buildUserDefaultsFromSettings,
  extractTripSpecificPreferences,
  mergeTripPreferences,
  summarizeEffectivePreferences,
} from "../ai/preferences";
import { generateTripWithProvider } from "../ai/generateTrip";
import { getLLMProvider } from "../ai/client";
import type { LLMProvider } from "../ai/provider";
import type { UserSettings } from "../settings/types";
import { getWeatherForecast, getWeatherProvider } from "../weather/client";
import type { WeatherProvider } from "../weather/provider";
import type { WeatherForecast } from "../weather/types";
import {
  generateTripRequestSchema,
  generateTripResponseSchema,
} from "./schema";
import type {
  DailyItinerary,
  GenerateTripResponse,
  ItineraryItem,
  TripPlan,
  WeatherSummary,
} from "./types";

export interface TripPlannerDependencies {
  llmProvider?: LLMProvider;
  weatherProvider?: WeatherProvider;
  userSettings?: UserSettings | null;
}

const WEATHER_KEYWORDS = [
  "天气",
  "下雨",
  "降雨",
  "小雨",
  "中雨",
  "大雨",
  "暴雨",
  "阵雨",
  "雷阵雨",
  "雷暴",
  "台风",
  "大风",
  "高温",
  "寒潮",
  "降温",
  "升温",
  "冰雹",
  "沙尘",
  "强对流",
  "暴雪",
  "预警",
];

const SPECIFIC_ALERT_KEYWORDS = [
  "预警",
  "红色",
  "橙色",
  "黄色",
  "蓝色",
  "极端天气",
  "实时天气",
  "实时预警",
  "官方预警",
  "台风登陆",
  "即将登陆",
  "强对流",
  "雷暴大风",
  "高温红色",
  "高温橙色",
  "暴雨预警",
  "台风预警",
];

const REALTIME_MARKERS = [
  "实时",
  "当前",
  "目前",
  "今天",
  "明天",
  "后天",
  "今晚",
  "今早",
  "本周",
  "这几天",
  "周一",
  "周二",
  "周三",
  "周四",
  "周五",
  "周六",
  "周日",
  "周天",
  "周末",
];

const FORECAST_VERBS = [
  "有",
  "会有",
  "将有",
  "预计",
  "可能",
  "正在",
  "出现",
  "发布",
  "发布了",
  "会下",
  "要下",
];

const GENERIC_ADVICE_MARKERS = [
  "如果",
  "万一",
  "遇到",
  "雨天",
  "下雨时",
  "出发前",
  "再确认",
  "查看天气",
  "看天气",
  "带伞",
  "备用",
  "按当天",
  "以当天为准",
  "根据当天",
  "临近出发",
];

function uniqueMessages(messages: string[]): string[] {
  return [...new Set(messages.map((message) => message.trim()).filter(Boolean))];
}

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function isUnverifiedWeatherClaim(
  text: string,
  destinationCity: string,
): boolean {
  const normalized = text.trim();

  if (!normalized) {
    return false;
  }

  const hasWeatherKeyword = includesAny(normalized, WEATHER_KEYWORDS);

  if (!hasWeatherKeyword) {
    return false;
  }

  const hasSpecificAlert = includesAny(
    normalized,
    SPECIFIC_ALERT_KEYWORDS,
  );
  const hasRealtimeMarker = includesAny(normalized, REALTIME_MARKERS);
  const hasForecastVerb = includesAny(normalized, FORECAST_VERBS);
  const hasGenericAdvice = includesAny(normalized, GENERIC_ADVICE_MARKERS);
  const hasLocationMarker = destinationCity
    ? normalized.includes(destinationCity)
    : false;

  if (hasSpecificAlert) {
    return true;
  }

  if (hasGenericAdvice) {
    return false;
  }

  return hasWeatherKeyword && hasForecastVerb && (hasRealtimeMarker || hasLocationMarker);
}

function sanitizeStringList(
  values: string[],
  destinationCity: string,
): string[] {
  return uniqueMessages(
    values.filter((value) => !isUnverifiedWeatherClaim(value, destinationCity)),
  );
}

function sanitizeRequiredText(
  value: string,
  fallback: string,
  destinationCity: string,
): string {
  const normalized = value.trim();

  if (!normalized) {
    return fallback;
  }

  return isUnverifiedWeatherClaim(normalized, destinationCity)
    ? fallback
    : normalized;
}

function sanitizeOptionalText(
  value: string | undefined,
  fallback: string | undefined,
  destinationCity: string,
): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();

  if (!normalized) {
    return undefined;
  }

  return isUnverifiedWeatherClaim(normalized, destinationCity)
    ? fallback
    : normalized;
}

function sanitizeItineraryItem(
  item: ItineraryItem,
  destinationCity: string,
): ItineraryItem {
  return {
    ...item,
    reason: sanitizeRequiredText(
      item.reason,
      "这一段以顺路、轻松和好执行为主。",
      destinationCity,
    ),
    guide: sanitizeStringList(item.guide, destinationCity),
    transportFromPrevious: sanitizeOptionalText(
      item.transportFromPrevious,
      "出发前再看当日交通和天气，现场灵活调整。",
      destinationCity,
    ),
    weatherImpact: sanitizeOptionalText(
      item.weatherImpact,
      "户外安排请按出发前天气再调整。",
      destinationCity,
    ),
    backupPlan: sanitizeOptionalText(
      item.backupPlan,
      "如果临近出发遇到天气变化，优先改成室内或留出休息时间。",
      destinationCity,
    ),
  };
}

function sanitizeDailyItinerary(
  day: DailyItinerary,
  destinationCity: string,
): DailyItinerary {
  return {
    ...day,
    theme: sanitizeRequiredText(
      day.theme,
      `第 ${day.day} 天按片区慢慢走`,
      destinationCity,
    ),
    routeReason: sanitizeRequiredText(
      day.routeReason,
      "把同片区活动放在一起，尽量少绕路。",
      destinationCity,
    ),
    morning: day.morning.map((item) =>
      sanitizeItineraryItem(item, destinationCity),
    ),
    afternoon: day.afternoon.map((item) =>
      sanitizeItineraryItem(item, destinationCity),
    ),
    evening: day.evening.map((item) =>
      sanitizeItineraryItem(item, destinationCity),
    ),
    dailyTips: sanitizeStringList(day.dailyTips, destinationCity),
  };
}

function sanitizeTripPlanWeatherClaims(
  tripPlan: TripPlan,
  forecast: WeatherForecast,
): TripPlan {
  const destinationCity = forecast.city || tripPlan.destination;

  return {
    ...tripPlan,
    tripTitle: sanitizeRequiredText(
      tripPlan.tripTitle,
      `${tripPlan.destination} ${tripPlan.days} 天游玩方案`,
      destinationCity,
    ),
    summary: sanitizeRequiredText(
      tripPlan.summary,
      "路线已经按片区整理，具体天气请在出发前再确认。",
      destinationCity,
    ),
    travelStyleSummary: sanitizeRequiredText(
      tripPlan.travelStyleSummary,
      "整体按轻松、少折返的思路安排，具体天气以出发前查询为准。",
      destinationCity,
    ),
    budgetSummary: {
      ...tripPlan.budgetSummary,
      note: sanitizeRequiredText(
        tripPlan.budgetSummary.note,
        "预算为估算，实时价格和天气请在出发前确认。",
        destinationCity,
      ),
    },
    hotelAreaAdvice: tripPlan.hotelAreaAdvice.map((item) => ({
      ...item,
      reason: sanitizeRequiredText(
        item.reason,
        "这一区更适合第一次自由行，少折返也更省心。",
        destinationCity,
      ),
      suitableFor: sanitizeRequiredText(
        item.suitableFor,
        "更适合想把路线走顺一点的自由行新手。",
        destinationCity,
      ),
      transportationConvenience: sanitizeRequiredText(
        item.transportationConvenience,
        "优先选择交通接驳更稳妥、步行压力更小的区域。",
        destinationCity,
      ),
      possibleDownside: sanitizeOptionalText(
        item.possibleDownside,
        "临近出发前请再确认天气和现场安排。",
        destinationCity,
      ),
    })),
    transportAdvice: {
      ...tripPlan.transportAdvice,
      summary: sanitizeRequiredText(
        tripPlan.transportAdvice.summary,
        "先比较总耗时、到达时间和进城便利度，再决定交通方式。",
        destinationCity,
      ),
      options: tripPlan.transportAdvice.options.map((option) => ({
        ...option,
        pros: sanitizeStringList(option.pros, destinationCity),
        cons: sanitizeStringList(option.cons, destinationCity),
        recommendation: sanitizeRequiredText(
          option.recommendation,
          "建议在官方或正规平台确认实时班次和出发条件。",
          destinationCity,
        ),
      })),
      note: sanitizeRequiredText(
        tripPlan.transportAdvice.note,
        "这里只提供安排行方向，实时班次、价格和天气请出发前确认。",
        destinationCity,
      ),
    },
    dailyItinerary: tripPlan.dailyItinerary.map((day) =>
      sanitizeDailyItinerary(day, destinationCity),
    ),
    generalTips: sanitizeStringList(tripPlan.generalTips, destinationCity),
    warnings: sanitizeStringList(tripPlan.warnings, destinationCity),
  };
}

function weatherWarning(forecast: WeatherForecast): string | undefined {
  if (forecast.warnings.length > 0) {
    return forecast.warnings.join(" ");
  }

  return forecast.available
    ? undefined
    : "未接入实时天气，先按不含实时天气的方式安排行程。";
}

function weatherSummaryFromForecast(
  forecast: WeatherForecast,
): WeatherSummary {
  const warning = weatherWarning(forecast);

  if (!forecast.available || forecast.forecastDays.length === 0) {
    return {
      available: false,
      overview:
        warning ?? "未接入实时天气，先按不含实时天气的方式安排行程。",
      dailyForecast: [],
      alerts: [],
      reminders: ["临近出发时再确认天气，雨天别硬排太多户外活动。"],
      dataNote: "当前行程没有使用可用的实时天气数据。",
    };
  }

  return {
    available: true,
    overview: `已取得 ${forecast.city} 的天气数据，路线可结合每天情况调整。`,
    dailyForecast: forecast.forecastDays,
    alerts: forecast.alerts,
    reminders: uniqueMessages([
      ...forecast.warnings,
      "出发前再确认最新天气和官方预警。",
    ]),
    dataNote:
      forecast.warnings.join(" ") ||
      "天气数据来自当前服务端 WeatherProvider。",
  };
}

function applyTrustedWeather(
  response: GenerateTripResponse,
  forecast: WeatherForecast,
): GenerateTripResponse {
  const sanitizedTripPlan = sanitizeTripPlanWeatherClaims(
    response.tripPlan,
    forecast,
  );
  const modelWarnings = sanitizeStringList(
    [...(response.warnings ?? []), ...sanitizedTripPlan.warnings],
    sanitizedTripPlan.destination,
  );
  const warnings = uniqueMessages([...modelWarnings, ...forecast.warnings]);
  const tripPlan: TripPlan = {
    ...sanitizedTripPlan,
    weatherSummary: weatherSummaryFromForecast(forecast),
    warnings,
  };

  return generateTripResponseSchema.parse({
    ...response,
    tripPlan,
    warnings,
  });
}

export async function planTrip(
  input: unknown,
  dependencies: TripPlannerDependencies = {},
): Promise<GenerateTripResponse> {
  const request = generateTripRequestSchema.parse(input);
  const weatherProvider =
    dependencies.weatherProvider ?? getWeatherProvider();
  const llmProvider = dependencies.llmProvider ?? getLLMProvider();
  const forecast = await getWeatherForecast(
    {
      city: request.tripRequest.destinationCity,
      startDate: request.tripRequest.startDate,
      endDate: request.tripRequest.endDate,
      days: request.tripRequest.days,
    },
    weatherProvider,
  );
  const tripSpecificPreferences = extractTripSpecificPreferences(
    request.tripRequest,
  );
  const userDefaults = buildUserDefaultsFromSettings(
    dependencies.userSettings,
  );
  const effectivePreferences = mergeTripPreferences(
    userDefaults,
    tripSpecificPreferences,
  );
  const preferenceSummary = summarizeEffectivePreferences({
    userDefaults,
    tripSpecificPreferences,
    effectivePreferences,
  });
  const generated = await generateTripWithProvider(
    {
      ...request,
      weatherForecast: forecast,
      weatherWarning: weatherWarning(forecast),
      preferenceSummary,
    },
    llmProvider,
  );

  return applyTrustedWeather(generated, forecast);
}
