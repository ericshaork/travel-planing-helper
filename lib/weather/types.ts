export interface WeatherQuery {
  city: string;
  startDate?: string;
  endDate?: string;
  days: number;
}

export interface WeatherDay {
  date: string;
  dayWeather: string;
  nightWeather?: string;
  tempMax?: number;
  tempMin?: number;
  precipitationProbability?: number;
  wind?: string;
  summary: string;
}

export interface WeatherAlert {
  title: string;
  level?: string;
  description: string;
  startTime?: string;
  endTime?: string;
}

export interface WeatherForecast {
  city: string;
  available: boolean;
  forecastDays: WeatherDay[];
  alerts: WeatherAlert[];
  warnings: string[];
}

export type WeatherImpactLevel = "info" | "warning" | "critical";

export type WeatherImpactType =
  | "rain"
  | "heat"
  | "cold"
  | "wind"
  | "unavailable";

export interface WeatherImpact {
  id: string;
  date?: string;
  type: WeatherImpactType;
  level: WeatherImpactLevel;
  message: string;
}

export interface WeatherDaySummary {
  date: string;
  weatherText: string;
  temperatureText: string;
  summary: string;
  impacts: WeatherImpact[];
}

export interface TripWeatherSummary {
  city: string;
  available: boolean;
  overview: string;
  daySummaries: WeatherDaySummary[];
  impacts: WeatherImpact[];
  warnings: string[];
  alerts: WeatherAlert[];
}
