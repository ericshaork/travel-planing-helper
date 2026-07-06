import type { WeatherImpact, WeatherQuery } from "../weather/types";
import type {
  DayRouteSummary,
  MapPoint,
  TripResultEnrichment,
} from "./enrichment-types";
import type { TripPlan, TripRequest } from "./types";
import { isValidIsoDate } from "./validators";

export interface DayRouteInsight {
  dayNumber: number;
  dayTitle: string;
  date?: string;
  routeSummary?: DayRouteSummary;
  mapPoints: MapPoint[];
  weatherImpacts: WeatherImpact[];
}

function findDay(tripPlan: TripPlan, dayNumber: number) {
  return tripPlan.dailyItinerary.find((day) => day.day === dayNumber);
}

export function resolveInsightDayNumber(
  tripPlan: TripPlan,
  requestedDay?: number,
): number {
  if (
    requestedDay &&
    Number.isInteger(requestedDay) &&
    requestedDay >= 1 &&
    requestedDay <= tripPlan.days
  ) {
    return requestedDay;
  }

  return tripPlan.dailyItinerary[0]?.day ?? 1;
}

export function buildEnrichmentWeatherQuery(
  tripPlan: TripPlan,
  tripRequest?: TripRequest | null,
): WeatherQuery {
  const firstDayDate = tripPlan.dailyItinerary[0]?.date;
  const lastDayDate =
    tripPlan.dailyItinerary[tripPlan.dailyItinerary.length - 1]?.date;
  const startDate = tripRequest?.startDate ?? firstDayDate;
  const endDate = tripRequest?.endDate ?? lastDayDate;

  return {
    city: tripPlan.destination,
    ...(startDate && isValidIsoDate(startDate) ? { startDate } : {}),
    ...(endDate && isValidIsoDate(endDate) ? { endDate } : {}),
    days: tripPlan.days,
  };
}

export function buildDayRouteInsight(
  tripPlan: TripPlan,
  result: TripResultEnrichment,
  requestedDay?: number,
): DayRouteInsight {
  const dayNumber = resolveInsightDayNumber(tripPlan, requestedDay);
  const day = findDay(tripPlan, dayNumber);
  const routeSummary = result.enrichment.daySummaries.find(
    (summary) => summary.dayIndex === dayNumber,
  );
  const mapPoints = result.enrichment.mapPoints.filter(
    (point) => point.dayIndex === dayNumber,
  );
  const weatherImpacts = result.weatherSummary.impacts.filter((impact) => {
    if (!impact.date) {
      return true;
    }

    return impact.date === day?.date;
  });

  return {
    dayNumber,
    dayTitle: day?.theme ?? `Day ${dayNumber}`,
    ...(day?.date ? { date: day.date } : {}),
    routeSummary,
    mapPoints,
    weatherImpacts,
  };
}
