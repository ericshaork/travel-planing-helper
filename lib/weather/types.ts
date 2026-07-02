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
