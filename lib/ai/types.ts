import "server-only";

import type { ZodType } from "zod";

import type {
  GenerateTripResponse,
  ParseTripResponse,
  TripPlan,
  TripRequest,
} from "../trip/types";
import type { WeatherForecast } from "../weather/types";

export interface ParseTripInput {
  text: string;
}

export interface GenerateTripInput {
  tripRequest: TripRequest;
  weatherForecast?: WeatherForecast;
  weatherWarning?: string;
  preferenceSummary?: string;
}

export interface RegenerateTripInput extends GenerateTripInput {
  previousPlan: TripPlan;
  modificationRequest: string;
}

export interface RepairJsonInput<T> {
  rawOutput: unknown;
  targetSchema: ZodType<T>;
  fallbackValue?: T;
  instructions?: string;
}

export type ParseTripOutput = ParseTripResponse;
export type GenerateTripOutput = GenerateTripResponse | string;
export type RegenerateTripOutput = GenerateTripResponse | string;
