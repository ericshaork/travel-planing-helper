import "server-only";

import { getWeatherForecast, getWeatherProvider } from "../weather/client";
import { buildTripWeatherSummary } from "../weather/summary";
import type { WeatherProvider } from "../weather/provider";
import { enrichTripPlanWithRoutes } from "./enrichTripPlan";
import type { TripResultEnrichment } from "./enrichment-types";
import { buildEnrichmentWeatherQuery } from "./route-insight";
import type { TripPlan, TripRequest } from "./types";

export interface BuildTripResultEnrichmentInput {
  tripPlan: TripPlan;
  tripRequest?: TripRequest | null;
}

export interface BuildTripResultEnrichmentOptions {
  weatherProvider?: WeatherProvider;
}

export async function buildTripResultEnrichment(
  input: BuildTripResultEnrichmentInput,
  options: BuildTripResultEnrichmentOptions = {},
): Promise<TripResultEnrichment> {
  const weatherProvider = options.weatherProvider ?? getWeatherProvider();
  const weatherQuery = buildEnrichmentWeatherQuery(
    input.tripPlan,
    input.tripRequest,
  );

  const [enrichment, weatherForecast] = await Promise.all([
    enrichTripPlanWithRoutes(input.tripPlan, {
      city: input.tripPlan.destination,
    }),
    getWeatherForecast(weatherQuery, weatherProvider),
  ]);

  return {
    enrichment,
    weatherSummary: buildTripWeatherSummary(weatherForecast),
  };
}
