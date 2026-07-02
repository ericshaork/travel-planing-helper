import "server-only";

import {
  generateTripRequestSchema,
  generateTripResponseSchema,
  parseTripRequestSchema,
  parseTripResponseSchema,
  tripPlanSchema,
  tripRequestSchema,
} from "../trip/schema";
import { getMissingTripRequestFields } from "../trip/normalize";
import { simpleParseTripText } from "../trip/simpleParser";
import type {
  BudgetSummary,
  DailyItinerary,
  ItineraryItem,
  TripPlan,
  TripRequest,
  WeatherSummary,
} from "../trip/types";
import type { WeatherForecast } from "../weather/types";
import type { LLMProvider } from "./provider";
import type {
  GenerateTripInput,
  GenerateTripOutput,
  ParseTripInput,
  ParseTripOutput,
  RegenerateTripInput,
  RegenerateTripOutput,
  RepairJsonInput,
} from "./types";

function amountLabel(amount: number, currency: string): string {
  const unit = currency === "CNY" ? "元" : currency;
  return `约 ${Math.round(amount)} ${unit}`;
}

function createBudgetSummary(request: TripRequest): BudgetSummary {
  return {
    totalEstimate: amountLabel(request.budget, request.currency),
    transport: amountLabel(request.budget * 0.25, request.currency),
    hotel: amountLabel(request.budget * 0.3, request.currency),
    food: amountLabel(request.budget * 0.2, request.currency),
    tickets: amountLabel(request.budget * 0.1, request.currency),
    localTransport: amountLabel(request.budget * 0.05, request.currency),
    flexibleSpending: amountLabel(request.budget * 0.1, request.currency),
    note: "这是 Mock 模式下的分类估算，不代表实时票价或酒店价格。",
  };
}

function createWeatherSummary(
  forecast?: WeatherForecast,
  weatherWarning?: string,
): WeatherSummary {
  const hasForecast = Boolean(forecast?.forecastDays.length);

  if (hasForecast && forecast) {
    return {
      available: true,
      overview: `已载入 ${forecast.city} 的天气数据，排路线时应优先参考每日天气。`,
      dailyForecast: forecast.forecastDays,
      alerts: forecast.alerts ?? [],
      reminders: ["出发前再确认一次最新天气和官方预警。"],
      dataNote: "天气内容来自传入的 WeatherForecast，并非由 Mock AI 编造。",
    };
  }

  return {
    available: false,
    overview: weatherWarning ?? "当前演示没有接入实时天气。",
    dailyForecast: [],
    alerts: [],
    reminders: ["出发前再看一次天气，雨天不要硬排太多户外行程。"],
    dataNote: "当前方案未使用实时天气，不能据此判断天气预警。",
  };
}

function addDays(startDate: string | undefined, offset: number): string | undefined {
  if (!startDate) {
    return undefined;
  }

  const date = new Date(`${startDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function createItineraryItem(
  request: TripRequest,
  placeName: string,
  type: ItineraryItem["type"],
  reason: string,
): ItineraryItem {
  return {
    placeName,
    type,
    reason,
    suggestedDuration: type === "food" ? "1-2 小时" : "2-3 小时",
    guide: [
      "开放时间、预约规则和现场状态请在出发前通过官方渠道确认。",
      "给移动和休息留一点余量，不要把时间卡得太死。",
    ],
    weatherImpact: "户外活动需要根据当天实际天气调整。",
    backupPlan: "天气或体力不合适时，改为附近室内活动或自由休息。",
    matchedInterests: request.interests,
  };
}

function createDailyItinerary(
  request: TripRequest,
  dayIndex: number,
): DailyItinerary {
  const day = dayIndex + 1;
  const focusPlace =
    request.mustVisitPlaces[dayIndex] ?? `${request.destinationCity}城市漫步区`;
  const foodArea = `${request.destinationCity}本地美食街区`;
  const accommodation = "住宿区域";

  return {
    day,
    date: addDays(request.startDate, dayIndex),
    theme: day === 1 ? "先熟悉城市，别排太满" : `第 ${day} 天按片区慢慢走`,
    routeOrder: [accommodation, focusPlace, foodArea, accommodation],
    routeReason: "把同一片区的活动放在一起，减少来回折腾。",
    morning: [
      createItineraryItem(
        request,
        focusPlace,
        "attraction",
        "优先安排用户明确想去的地方，或从轻松的城市漫步开始。",
      ),
    ],
    afternoon: [
      createItineraryItem(
        request,
        foodArea,
        "food",
        "留出完整时间吃饭和休息，不连续塞景点。",
      ),
    ],
    evening: [
      createItineraryItem(
        request,
        `${request.destinationCity}自由活动`,
        "free_time",
        "晚上留一点弹性，根据体力决定继续逛还是早点休息。",
      ),
    ],
    dailyTips: ["这天别安排太满。", "不确定的信息请在官方平台再次确认。"],
  };
}

function createMockTripPlan(
  request: TripRequest,
  forecast?: WeatherForecast,
  weatherWarning?: string,
): TripPlan {
  const warnings = [
    "当前行程由 MockLLMProvider 生成，仅用于演示网站完整流程。",
  ];

  if (!forecast?.forecastDays.length) {
    warnings.push(weatherWarning ?? "暂时无法获取实时天气。");
  }

  return tripPlanSchema.parse({
    tripTitle: `${request.destinationCity} ${request.days} 天轻松行程`,
    summary: `从 ${request.departureCity} 出发，按片区整理 ${request.destinationCity} 的每日路线，给吃饭、移动和休息留出余量。`,
    destination: request.destinationCity,
    days: request.days,
    travelStyleSummary: `主要按 ${request.travelStyles.join("、")} 的节奏安排，并结合 ${request.interests.join("、")} 等兴趣。`,
    weatherSummary: createWeatherSummary(forecast, weatherWarning),
    budgetSummary: createBudgetSummary(request),
    hotelAreaAdvice: [
      {
        area: "交通方便的中心区域",
        reason: "第一次自由行优先减少换乘和跨城区移动。",
        suitableFor: "希望路线清楚、出行省心的自由行新手",
        transportationConvenience: "优先选择靠近公共交通、餐饮和主要活动片区的位置。",
        possibleDownside: "热门日期可能更嘈杂，价格也可能偏高。",
        suggestedPlatforms: ["携程", "飞猪", "去哪儿"],
      },
    ],
    transportAdvice: {
      summary: `从 ${request.departureCity} 前往 ${request.destinationCity} 时，先比较总耗时、出发时段和市区接驳。`,
      options: [
        {
          mode: "other",
          pros: ["可以按预算和出发时间灵活比较"],
          cons: ["Mock 模式不提供实时班次和价格"],
          recommendation: "在 12306、航司或正规旅行平台核实实际班次和价格。",
        },
      ],
      suggestedPlatforms: ["12306", "携程", "飞猪", "去哪儿"],
      note: "这里只提供查询方向，不代表实时票价或余票。",
    },
    dailyItinerary: Array.from({ length: request.days }, (_, index) =>
      createDailyItinerary(request, index),
    ),
    generalTips: [
      "每天保留一点自由时间，临时想吃东西或休息都更从容。",
      "门票、开放时间和预约要求请在出发前通过官方平台确认。",
    ],
    warnings,
  });
}

function trimForSummary(value: string, maxLength = 240): string {
  const normalized = value.trim();
  return normalized.length <= maxLength
    ? normalized
    : `${normalized.slice(0, maxLength - 1)}…`;
}

export class MockLLMProvider implements LLMProvider {
  readonly providerName = "mock";

  async parseTrip(input: ParseTripInput): Promise<ParseTripOutput> {
    const { text } = parseTripRequestSchema.parse(input);
    const parsed = simpleParseTripText(text);
    const missing = getMissingTripRequestFields(parsed);

    return parseTripResponseSchema.parse({
      parsed,
      missingFields: missing.map(({ field }) => field),
      followUpQuestions: missing.map(({ message }) => message),
    });
  }

  async generateTrip(input: GenerateTripInput): Promise<GenerateTripOutput> {
    const tripRequest = tripRequestSchema.parse(input.tripRequest);
    const tripPlan = createMockTripPlan(
      tripRequest,
      input.weatherForecast,
      input.weatherWarning,
    );

    return generateTripResponseSchema.parse({
      tripPlan,
      warnings: tripPlan.warnings,
    });
  }

  async regenerateTrip(
    input: RegenerateTripInput,
  ): Promise<RegenerateTripOutput> {
    const validated = generateTripRequestSchema.parse({
      tripRequest: input.tripRequest,
      previousPlan: input.previousPlan,
      modificationRequest: input.modificationRequest,
    });
    const modification = trimForSummary(validated.modificationRequest ?? "");
    const previousPlan = tripPlanSchema.parse(validated.previousPlan);
    const updatedPlan = tripPlanSchema.parse({
      ...structuredClone(previousPlan),
      tripTitle: `${previousPlan.tripTitle.replace(/（已调整）$/, "")}（已调整）`,
      summary: `${previousPlan.summary} 已按你的补充要求调整：${modification}`,
      travelStyleSummary: `${previousPlan.travelStyleSummary} 本次额外要求：${modification}`,
      dailyItinerary: previousPlan.dailyItinerary.map((day, index) =>
        index === 0
          ? {
              ...day,
              dailyTips: [...day.dailyTips, `本次调整：${modification}`],
            }
          : day,
      ),
      generalTips: [...previousPlan.generalTips, `本次调整：${modification}`],
      warnings: [
        ...previousPlan.warnings,
        ...(input.weatherWarning ? [input.weatherWarning] : []),
      ],
    });

    return generateTripResponseSchema.parse({
      tripPlan: updatedPlan,
      appliedChanges: [modification],
      warnings: updatedPlan.warnings,
    });
  }

  async repairJson<T>(input: RepairJsonInput<T>): Promise<T> {
    let candidate = input.rawOutput;

    if (typeof candidate === "string") {
      try {
        candidate = JSON.parse(candidate) as unknown;
      } catch {
        candidate = undefined;
      }
    }

    const parsedCandidate = input.targetSchema.safeParse(candidate);

    if (parsedCandidate.success) {
      return parsedCandidate.data;
    }

    if (input.fallbackValue === undefined) {
      throw new Error("Mock repairJson needs a valid fallback value.");
    }

    return input.targetSchema.parse(input.fallbackValue);
  }
}
