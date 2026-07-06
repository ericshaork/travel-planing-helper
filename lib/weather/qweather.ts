import "server-only";

import { z } from "zod";

import { weatherForecastSchema, weatherQuerySchema } from "../trip/schema";
import { AppError } from "../utils/errors";
import type { WeatherDay, WeatherForecast, WeatherQuery } from "./types";
import {
  WEATHER_WARNINGS,
  type WeatherProvider,
  unavailableWeatherForecast,
} from "./provider";

const DEFAULT_QWEATHER_BASE_URL = "https://devapi.qweather.com";
const DEFAULT_TIMEOUT_MS = 8_000;
const MAX_FORECAST_DAYS = 30;
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

const qWeatherLocationResponseSchema = z
  .object({
    code: z.string(),
    location: z
      .array(
        z
          .object({
            id: z.string(),
            name: z.string(),
          })
          .passthrough(),
      )
      .optional(),
  })
  .passthrough();

const qWeatherDailyResponseSchema = z
  .object({
    code: z.string(),
    daily: z
      .array(
        z
          .object({
            fxDate: z.string(),
            tempMax: z.string().optional(),
            tempMin: z.string().optional(),
            textDay: z.string(),
            textNight: z.string().optional(),
            precip: z.string().optional(),
            windDirDay: z.string().optional(),
            windScaleDay: z.string().optional(),
          })
          .passthrough(),
      )
      .optional(),
  })
  .passthrough();

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export interface QWeatherProviderOptions {
  apiKey?: string;
  baseUrl?: string;
  fetcher?: FetchLike;
  timeoutMs?: number;
  now?: Date;
}

function parseIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addDays(value: Date, days: number): Date {
  return new Date(value.getTime() + days * DAY_IN_MILLISECONDS);
}

function numberValue(value?: string): number | undefined {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function forecastEndpointDays(days: number): 3 | 7 | 10 | 15 | 30 {
  if (days <= 3) return 3;
  if (days <= 7) return 7;
  if (days <= 10) return 10;
  if (days <= 15) return 15;
  return 30;
}

function requestedHorizon(input: WeatherQuery, now: Date): number {
  if (!input.startDate) {
    return input.days;
  }

  const requestedEnd = input.endDate
    ? parseIsoDate(input.endDate)
    : addDays(parseIsoDate(input.startDate), input.days - 1);
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  return (
    Math.floor(
      (requestedEnd.getTime() - today.getTime()) / DAY_IN_MILLISECONDS,
    ) + 1
  );
}

function mapDailyForecast(
  value: z.infer<typeof qWeatherDailyResponseSchema>["daily"],
): WeatherDay[] {
  return (value ?? []).map((day) => {
    const tempMax = numberValue(day.tempMax);
    const tempMin = numberValue(day.tempMin);
    const precipitation = numberValue(day.precip);
    const wind =
      day.windDirDay && day.windScaleDay
        ? `${day.windDirDay} ${day.windScaleDay} 级`
        : day.windDirDay;
    const summaryParts = [day.textDay];

    if (tempMin !== undefined && tempMax !== undefined) {
      summaryParts.push(`${tempMin}~${tempMax}°C`);
    }

    if (wind) {
      summaryParts.push(wind);
    }

    return {
      date: day.fxDate,
      dayWeather: day.textDay,
      ...(day.textNight ? { nightWeather: day.textNight } : {}),
      ...(tempMax === undefined ? {} : { tempMax }),
      ...(tempMin === undefined ? {} : { tempMin }),
      ...(precipitation === undefined
        ? {}
        : {
            precipitationProbability: Math.max(
              0,
              Math.min(100, Math.round(precipitation)),
            ),
          }),
      ...(wind ? { wind } : {}),
      summary: `${summaryParts.join("，")}，出发前再确认临近预报。`,
    };
  });
}

export class QWeatherProvider implements WeatherProvider {
  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly fetcher: FetchLike;
  private readonly timeoutMs: number;
  private readonly now: Date;

  constructor(options: QWeatherProviderOptions = {}) {
    this.apiKey = options.apiKey?.trim() || undefined;
    this.baseUrl = (
      options.baseUrl?.trim() || DEFAULT_QWEATHER_BASE_URL
    ).replace(/\/+$/, "");
    this.fetcher = options.fetcher ?? fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.now = options.now ?? new Date();
  }

  private async request(url: URL): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetcher(url, {
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`QWeather request failed with ${response.status}`);
      }

      return (await response.json()) as unknown;
    } finally {
      clearTimeout(timeout);
    }
  }

  async getForecast(input: WeatherQuery): Promise<WeatherForecast> {
    const parsedQuery = weatherQuerySchema.safeParse(input);
    const city =
      parsedQuery.success && parsedQuery.data.city
        ? parsedQuery.data.city
        : input.city?.trim() || "目的地";

    if (!parsedQuery.success) {
      return weatherForecastSchema.parse(
        unavailableWeatherForecast(
          city,
          "天气查询信息还不完整，先按不含实时天气的方式继续。",
        ),
      );
    }

    const query = parsedQuery.data;

    if (!this.apiKey) {
      throw new AppError(
        "WEATHER_API_FAILED",
        "QWeatherProvider 缺少 QWEATHER_API_KEY，无法请求真实天气。",
      );
    }

    const horizon = requestedHorizon(query, this.now);

    if (horizon < 1 || horizon > MAX_FORECAST_DAYS) {
      return weatherForecastSchema.parse(
        unavailableWeatherForecast(query.city, WEATHER_WARNINGS.outOfRange),
      );
    }

    try {
      const locationUrl = new URL("/geo/v2/city/lookup", this.baseUrl);
      locationUrl.searchParams.set("location", query.city);
      locationUrl.searchParams.set("number", "1");
      locationUrl.searchParams.set("lang", "zh");
      locationUrl.searchParams.set("key", this.apiKey);

      const locationResponse = qWeatherLocationResponseSchema.parse(
        await this.request(locationUrl),
      );
      const location = locationResponse.location?.[0];

      if (locationResponse.code !== "200" || !location) {
        return weatherForecastSchema.parse(
          unavailableWeatherForecast(
            query.city,
            WEATHER_WARNINGS.cityNotFound,
          ),
        );
      }

      const endpointDays = forecastEndpointDays(horizon);
      const forecastUrl = new URL(
        `/v7/weather/${endpointDays}d`,
        this.baseUrl,
      );
      forecastUrl.searchParams.set("location", location.id);
      forecastUrl.searchParams.set("lang", "zh");
      forecastUrl.searchParams.set("unit", "m");
      forecastUrl.searchParams.set("key", this.apiKey);

      const forecastResponse = qWeatherDailyResponseSchema.parse(
        await this.request(forecastUrl),
      );

      if (forecastResponse.code !== "200") {
        return weatherForecastSchema.parse(
          unavailableWeatherForecast(query.city, WEATHER_WARNINGS.providerError),
        );
      }

      const allDays = mapDailyForecast(forecastResponse.daily);
      const firstDate = query.startDate ?? toIsoDate(this.now);
      const lastDate = query.endDate
        ? query.endDate
        : toIsoDate(addDays(parseIsoDate(firstDate), query.days - 1));
      const forecastDays = allDays
        .filter((day) => day.date >= firstDate && day.date <= lastDate)
        .slice(0, query.days);

      if (forecastDays.length === 0) {
        return weatherForecastSchema.parse(
          unavailableWeatherForecast(query.city, WEATHER_WARNINGS.outOfRange),
        );
      }

      const warnings = [
        ...(query.startDate ? [] : [WEATHER_WARNINGS.datesMissing]),
        ...(forecastDays.length < query.days
          ? [WEATHER_WARNINGS.partialForecast]
          : []),
      ];

      return weatherForecastSchema.parse({
        city: location.name || query.city,
        available: true,
        forecastDays,
        alerts: [],
        warnings,
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      return weatherForecastSchema.parse(
        unavailableWeatherForecast(query.city, WEATHER_WARNINGS.unavailable),
      );
    }
  }
}
