import "server-only";

import { weatherForecastSchema, weatherQuerySchema } from "../trip/schema";
import {
  getServerEnvironment,
  type ServerEnvironment,
} from "../utils/env";
import { MockWeatherProvider } from "./mock";
import type { WeatherProvider } from "./provider";
import {
  unavailableWeatherForecast,
  WEATHER_WARNINGS,
} from "./provider";
import { QWeatherProvider } from "./qweather";
import type { WeatherForecast } from "./types";

const INVALID_WEATHER_QUERY_WARNING =
  "天气查询信息还不完整，先按不含实时天气的方式继续。";

function fallbackCity(input: unknown): string {
  if (typeof input !== "object" || input === null || !("city" in input)) {
    return "目的地";
  }

  const city = (input as { city?: unknown }).city;

  if (typeof city !== "string" || city.trim() === "") {
    return "目的地";
  }

  return city.trim().slice(0, 50);
}

export function createWeatherProvider(
  environment: ServerEnvironment = getServerEnvironment(),
): WeatherProvider {
  if (environment.USE_MOCK_WEATHER) {
    return new MockWeatherProvider();
  }

  if (!environment.QWEATHER_API_KEY) {
    return new MockWeatherProvider({
      additionalWarnings: [WEATHER_WARNINGS.missingKey],
    });
  }

  return new QWeatherProvider({
    apiKey: environment.QWEATHER_API_KEY,
    baseUrl: environment.QWEATHER_BASE_URL,
  });
}

export function getWeatherProvider(): WeatherProvider {
  return createWeatherProvider();
}

export async function getWeatherForecast(
  input: unknown,
  provider: WeatherProvider = getWeatherProvider(),
): Promise<WeatherForecast> {
  const parsedInput = weatherQuerySchema.safeParse(input);

  if (!parsedInput.success) {
    return weatherForecastSchema.parse(
      unavailableWeatherForecast(
        fallbackCity(input),
        INVALID_WEATHER_QUERY_WARNING,
      ),
    );
  }

  try {
    const result = await provider.getForecast(parsedInput.data);
    const parsedResult = weatherForecastSchema.safeParse(result);

    if (parsedResult.success) {
      return parsedResult.data;
    }
  } catch {
    // Weather failure must not block the trip-generation workflow.
  }

  return weatherForecastSchema.parse(
    unavailableWeatherForecast(
      parsedInput.data.city,
      WEATHER_WARNINGS.unavailable,
    ),
  );
}
