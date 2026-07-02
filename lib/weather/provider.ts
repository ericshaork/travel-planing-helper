import "server-only";

import type { WeatherForecast, WeatherQuery } from "./types";

export interface WeatherProvider {
  getForecast(input: WeatherQuery): Promise<WeatherForecast>;
}

export const WEATHER_WARNINGS = {
  unavailable: "天气接口刚刚没接上，先按不含实时天气的方式继续。",
  missingKey: "没有配置天气服务密钥，先按不含实时天气的方式继续。",
  cityNotFound: "暂时没认出这个城市，先不加入实时天气。",
  datesMissing: "还没有具体日期，以下天气只按近期情况作演示。",
  mockData: "当前使用演示天气，不代表实时预报，出发前记得再确认。",
  outOfRange: "这次出行超出当前可预报范围，临近出发时再看会更准。",
  partialForecast: "天气服务只返回了部分日期，剩余日期请临近出发时再确认。",
} as const;

export function unavailableWeatherForecast(
  city: string,
  warning: string = WEATHER_WARNINGS.unavailable,
): WeatherForecast {
  return {
    city: city.trim() || "目的地",
    available: false,
    forecastDays: [],
    alerts: [],
    warnings: [warning],
  };
}
