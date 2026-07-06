import type { Coordinates } from "../poi/types";

export type RouteMode = "driving" | "walking" | "transit" | "other";

export interface RouteEstimateRequest {
  origin: Coordinates;
  destination: Coordinates;
  mode?: RouteMode;
}

export interface RouteLeg {
  fromName?: string;
  toName?: string;
  distanceMeters: number;
  durationMinutes: number;
  mode: RouteMode;
  provider: "mock" | "amap";
  summary?: string;
}

export interface RouteEstimateResult {
  leg: RouteLeg;
  warnings?: string[];
}
