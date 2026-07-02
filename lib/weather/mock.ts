import "server-only";

import { weatherForecastSchema, weatherQuerySchema } from "../trip/schema";
import type { WeatherDay, WeatherForecast, WeatherQuery } from "./types";
import {
  WEATHER_WARNINGS,
  type WeatherProvider,
  unavailableWeatherForecast,
} from "./provider";

export type MockWeatherScenario =
  | "normal"
  | "rain"
  | "unavailable"
  | "city-not-found"
  | "out-of-range";

export interface MockWeatherProviderOptions {
  scenario?: MockWeatherScenario;
  now?: Date;
  additionalWarnings?: string[];
}

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const MAX_FORECAST_DAYS = 30;
const UNRECOGNIZED_CITY_MARKERS = [
  "不存在",
  "无法识别",
  "未知城市",
  "火星",
] as const;

function parseIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addDays(value: Date, days: number): Date {
  return new Date(value.getTime() + days * DAY_IN_MILLISECONDS);
}

function exceedsForecastRange(input: WeatherQuery, now: Date): boolean {
  if (input.days > MAX_FORECAST_DAYS) {
    return true;
  }

  const lastForecastDate = addDays(now, MAX_FORECAST_DAYS - 1);
  const requestedEnd = input.endDate
    ? parseIsoDate(input.endDate)
    : input.startDate
      ? addDays(parseIsoDate(input.startDate), input.days - 1)
      : addDays(now, input.days - 1);

  return requestedEnd.getTime() > lastForecastDate.getTime();
}

function isClearlyUnrecognizedCity(city: string): boolean {
  return UNRECOGNIZED_CITY_MARKERS.some((marker) => city.includes(marker));
}

function mockDay(date: Date, index: number, rainy: boolean): WeatherDay {
  const isRainy = rainy && index === 1;

  return {
    date: toIsoDate(date),
    dayWeather: isRainy ? "阵雨" : index % 2 === 0 ? "多云" : "晴",
    nightWeather: isRainy ? "小雨" : "多云",
    tempMax: 27 + (index % 3),
    tempMin: 20 + (index % 2),
    precipitationProbability: isRainy ? 80 : 20,
    wind: "东南风 2—3 级",
    summary: isRainy
      ? "午后可能有阵雨，室内行程和雨具都留一手。"
      : "体感比较舒服，白天适合步行，午后注意防晒。",
  };
}

export class MockWeatherProvider implements WeatherProvider {
  private readonly scenario: MockWeatherScenario;
  private readonly now: Date;
  private readonly additionalWarnings: string[];

  constructor(options: MockWeatherProviderOptions = {}) {
    this.scenario = options.scenario ?? "normal";
    this.now = options.now ?? new Date();
    this.additionalWarnings = options.additionalWarnings ?? [];
  }

  async getForecast(input: WeatherQuery): Promise<WeatherForecast> {
    const query = weatherQuerySchema.parse(input);

    if (
      this.scenario === "city-not-found" ||
      isClearlyUnrecognizedCity(query.city)
    ) {
      return weatherForecastSchema.parse(
        unavailableWeatherForecast(
          query.city,
          WEATHER_WARNINGS.cityNotFound,
        ),
      );
    }

    if (this.scenario === "unavailable") {
      return weatherForecastSchema.parse(
        unavailableWeatherForecast(query.city),
      );
    }

    if (
      this.scenario === "out-of-range" ||
      exceedsForecastRange(query, this.now)
    ) {
      return weatherForecastSchema.parse(
        unavailableWeatherForecast(query.city, WEATHER_WARNINGS.outOfRange),
      );
    }

    const rainy = this.scenario === "rain";
    const firstDate = query.startDate
      ? parseIsoDate(query.startDate)
      : new Date(
          Date.UTC(
            this.now.getUTCFullYear(),
            this.now.getUTCMonth(),
            this.now.getUTCDate(),
          ),
        );
    const warnings = [
      WEATHER_WARNINGS.mockData,
      ...(query.startDate ? [] : [WEATHER_WARNINGS.datesMissing]),
      ...this.additionalWarnings,
    ];
    const forecastDays = Array.from({ length: query.days }, (_, index) =>
      mockDay(addDays(firstDate, index), index, rainy),
    );

    return weatherForecastSchema.parse({
      city: query.city,
      available: true,
      forecastDays,
      alerts: rainy
        ? [
            {
              title: "降雨提醒",
              level: "提示",
              description: "第二天午后可能有阵雨，别把全天都排在室外。",
            },
          ]
        : [],
      warnings,
    });
  }
}
