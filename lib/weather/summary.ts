import type {
  TripWeatherSummary,
  WeatherDay,
  WeatherForecast,
  WeatherImpact,
  WeatherImpactLevel,
  WeatherImpactType,
} from "./types";

const RAIN_KEYWORDS = [
  "\u96e8",
  "\u9635\u96e8",
  "\u96f7",
  "\u96f7\u96e8",
  "\u66b4\u96e8",
  "\u96ea",
];
const WIND_KEYWORDS = [
  "\u5927\u98ce",
  "\u5f3a\u98ce",
  "\u9635\u98ce",
  "\u70c8\u98ce",
];

function createImpact(
  type: WeatherImpactType,
  level: WeatherImpactLevel,
  message: string,
  date?: string,
): WeatherImpact {
  return {
    id: `${date ?? "trip"}-${type}-${level}-${message}`,
    ...(date ? { date } : {}),
    type,
    level,
    message,
  };
}

function uniqueImpacts(impacts: WeatherImpact[]): WeatherImpact[] {
  const seen = new Set<string>();

  return impacts.filter((impact) => {
    const key = `${impact.date ?? "trip"}-${impact.type}-${impact.message}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function includesKeyword(value: string | undefined, keywords: string[]): boolean {
  if (!value) {
    return false;
  }

  return keywords.some((keyword) => value.includes(keyword));
}

function parseWindScale(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const matches = value.match(/\d+/g);

  if (!matches || matches.length === 0) {
    return undefined;
  }

  const scale = Number.parseInt(matches[matches.length - 1] ?? "", 10);
  return Number.isFinite(scale) ? scale : undefined;
}

function formatTemperature(day: WeatherDay): string {
  if (day.tempMin !== undefined && day.tempMax !== undefined) {
    return `${day.tempMin}~${day.tempMax}\u00b0C`;
  }

  if (day.tempMax !== undefined) {
    return `\u6700\u9ad8\u7ea6 ${day.tempMax}\u00b0C`;
  }

  if (day.tempMin !== undefined) {
    return `\u6700\u4f4e\u7ea6 ${day.tempMin}\u00b0C`;
  }

  return "\u6c14\u6e29\u5f85\u786e\u8ba4";
}

function formatWeatherText(day: WeatherDay): string {
  return day.nightWeather
    ? `${day.dayWeather}\uff0c\u591c\u95f4 ${day.nightWeather}`
    : day.dayWeather;
}

function analyzeDayWeather(day: WeatherDay): WeatherImpact[] {
  const impacts: WeatherImpact[] = [];
  const weatherText = `${day.dayWeather} ${day.nightWeather ?? ""}`.trim();
  const hasRain =
    (day.precipitationProbability ?? 0) >= 60 ||
    includesKeyword(weatherText, RAIN_KEYWORDS);

  if (hasRain) {
    impacts.push(
      createImpact(
        "rain",
        "warning",
        `${day.date} \u53ef\u80fd\u6709\u96e8\uff0c\u6237\u5916\u70b9\u5c3d\u91cf\u7559\u4e2a\u524d\u540e\u8c03\u6362\u7a7a\u95f4\u3002`,
        day.date,
      ),
    );
  }

  if ((day.tempMax ?? Number.NEGATIVE_INFINITY) >= 35) {
    impacts.push(
      createImpact(
        "heat",
        "critical",
        `${day.date} \u504f\u70ed\uff0c\u5348\u540e\u522b\u6392\u592a\u6ee1\uff0c\u6ce8\u610f\u8865\u6c34\u548c\u9632\u6652\u3002`,
        day.date,
      ),
    );
  } else if ((day.tempMax ?? Number.NEGATIVE_INFINITY) >= 32) {
    impacts.push(
      createImpact(
        "heat",
        "warning",
        `${day.date} \u6709\u70b9\u70ed\uff0c\u5348\u540e\u5c3d\u91cf\u591a\u7559\u5ba4\u5185\u6216\u4f11\u606f\u70b9\u3002`,
        day.date,
      ),
    );
  }

  if ((day.tempMin ?? Number.POSITIVE_INFINITY) <= 5) {
    impacts.push(
      createImpact(
        "cold",
        "warning",
        `${day.date} \u65e9\u665a\u504f\u51b7\uff0c\u5916\u51fa\u8bb0\u5f97\u591a\u5e26\u4e00\u5c42\u3002`,
        day.date,
      ),
    );
  }

  const windScale = parseWindScale(day.wind);
  if (
    (windScale !== undefined && windScale >= 6) ||
    includesKeyword(day.wind, WIND_KEYWORDS) ||
    includesKeyword(weatherText, WIND_KEYWORDS)
  ) {
    impacts.push(
      createImpact(
        "wind",
        "warning",
        `${day.date} \u98ce\u4f1a\u6bd4\u8f83\u660e\u663e\uff0c\u4e34\u6d77\u548c\u9ad8\u5904\u884c\u7a0b\u5148\u4fdd\u5b88\u4e00\u70b9\u3002`,
        day.date,
      ),
    );
  }

  return impacts;
}

export function analyzeWeatherImpact(
  forecast: WeatherForecast,
): WeatherImpact[] {
  if (!forecast.available || forecast.forecastDays.length === 0) {
    return [
      createImpact(
        "unavailable",
        "info",
        "\u6682\u65f6\u6ca1\u6709\u53ef\u7528\u5929\u6c14\u6570\u636e\uff0c\u51fa\u53d1\u524d\u518d\u786e\u8ba4\u5f53\u5929\u9884\u62a5\u3002",
      ),
    ];
  }

  return uniqueImpacts(forecast.forecastDays.flatMap(analyzeDayWeather));
}

export function buildTripWeatherSummary(
  forecast: WeatherForecast,
): TripWeatherSummary {
  const impacts = analyzeWeatherImpact(forecast);

  if (!forecast.available || forecast.forecastDays.length === 0) {
    return {
      city: forecast.city,
      available: false,
      overview:
        forecast.warnings[0] ??
        "\u6682\u65f6\u6ca1\u6709\u62ff\u5230\u53ef\u7528\u5929\u6c14\uff0c\u5148\u6309\u4fdd\u5b88\u7248\u672c\u5b89\u6392\u884c\u7a0b\u3002",
      daySummaries: [],
      impacts,
      warnings: [...forecast.warnings],
      alerts: forecast.alerts,
    };
  }

  return {
    city: forecast.city,
    available: true,
    overview: `\u5df2\u6574\u7406 ${forecast.city} \u672a\u6765 ${forecast.forecastDays.length} \u5929\u7684\u5929\u6c14\uff0c\u53ef\u636e\u6b64\u5fae\u8c03\u6237\u5916\u5b89\u6392\u3002`,
    daySummaries: forecast.forecastDays.map((day) => ({
      date: day.date,
      weatherText: formatWeatherText(day),
      temperatureText: formatTemperature(day),
      summary: day.summary,
      impacts: analyzeDayWeather(day),
    })),
    impacts,
    warnings: [...forecast.warnings],
    alerts: forecast.alerts,
  };
}
