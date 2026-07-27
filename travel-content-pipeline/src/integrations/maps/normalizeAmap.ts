import type { AmapPoiRecord, AmapRouteStepRecord, AmapWalkingPathRecord } from "./amapClient.js";

export interface NormalizedPOI {
  name: string;
  address: string;
  district_name: string;
  latitude: number;
  longitude: number;
  source_provider: "amap";
}

export interface NormalizedRouteDistance {
  origin: string;
  destination: string;
  transport_mode: "walking";
  route_distance_meters: number;
  estimated_duration_minutes: number;
  source_provider: "amap";
}

export interface NormalizedRouteStep {
  instruction_summary: string;
  distance_meters: number;
  duration_minutes: number;
}

export interface NormalizedRoutePlan {
  origin: string;
  destination: string;
  transport_mode: "walking";
  route_distance_meters: number;
  estimated_duration_minutes: number;
  steps: NormalizedRouteStep[];
  source_provider: "amap";
}

export function normalizeAmapPoi(record: AmapPoiRecord): NormalizedPOI {
  const name = record.name?.trim();
  const location = record.location?.split(",");
  const longitude = Number(location?.[0]);
  const latitude = Number(location?.[1]);

  if (!name || !Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    throw new Error("Invalid Amap POI payload: missing name or location.");
  }

  return {
    name,
    address: record.address?.trim() ?? "",
    district_name: record.adname?.trim() || record.cityname?.trim() || "",
    latitude,
    longitude,
    source_provider: "amap",
  };
}

export function normalizeAmapRouteDistance(params: {
  origin: string;
  destination: string;
  path: AmapWalkingPathRecord;
}): NormalizedRouteDistance {
  return {
    origin: params.origin,
    destination: params.destination,
    transport_mode: "walking",
    route_distance_meters: parseRequiredInteger(params.path.distance, "route distance"),
    estimated_duration_minutes: secondsToRoundedMinutes(parseRequiredInteger(params.path.duration, "route duration")),
    source_provider: "amap",
  };
}

export function normalizeAmapRoutePlan(params: {
  origin: string;
  destination: string;
  path: AmapWalkingPathRecord;
}): NormalizedRoutePlan {
  return {
    ...normalizeAmapRouteDistance(params),
    steps: (params.path.steps ?? []).map(normalizeAmapRouteStep),
  };
}

function normalizeAmapRouteStep(step: AmapRouteStepRecord): NormalizedRouteStep {
  return {
    instruction_summary: step.instruction?.trim() || step.road?.trim() || "Walk to the next step.",
    distance_meters: parseRequiredInteger(step.distance, "route step distance"),
    duration_minutes: secondsToRoundedMinutes(parseRequiredInteger(step.duration, "route step duration")),
  };
}

function parseRequiredInteger(value: string | undefined, label: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid Amap payload: missing ${label}.`);
  }

  return Math.max(0, Math.round(parsed));
}

function secondsToRoundedMinutes(seconds: number): number {
  return Math.max(1, Math.round(seconds / 60));
}
