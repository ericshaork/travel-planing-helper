import { readFile } from "node:fs/promises";
import path from "node:path";

import type { MapPOIAsset, RouteFact } from "../types.js";

interface ValidationReport {
  valid: boolean;
  checks: string[];
  errors: string[];
  summary: {
    poi_count: number;
    route_count: number;
    source_provider: string;
    confidence: string;
  };
}

const EXPECTED_POI_COUNT = 9;
const EXPECTED_ROUTE_COUNT = 6;

async function main(): Promise<void> {
  const report = await validateBeijingMapAssets();
  console.log(JSON.stringify(report, null, 2));

  if (!report.valid) {
    process.exitCode = 1;
  }
}

export async function validateBeijingMapAssets(): Promise<ValidationReport> {
  const poiFilePath = path.resolve(process.cwd(), "input", "maps_v1", "beijing", "poi_assets.json");
  const routeFilePath = path.resolve(process.cwd(), "input", "maps_v1", "beijing", "route_facts.json");

  const checks: string[] = [];
  const errors: string[] = [];

  const poiAssets = await readJsonFile<MapPOIAsset[]>(poiFilePath);
  const routeFacts = await readJsonFile<RouteFact[]>(routeFilePath);

  checks.push("poi_assets.json exists and is readable");
  checks.push("route_facts.json exists and is readable");

  if (poiAssets.length !== EXPECTED_POI_COUNT) {
    errors.push(`poi count must be ${EXPECTED_POI_COUNT}, got ${poiAssets.length}`);
  } else {
    checks.push(`poi count is ${EXPECTED_POI_COUNT}`);
  }

  if (routeFacts.length !== EXPECTED_ROUTE_COUNT) {
    errors.push(`route count must be ${EXPECTED_ROUTE_COUNT}, got ${routeFacts.length}`);
  } else {
    checks.push(`route count is ${EXPECTED_ROUTE_COUNT}`);
  }

  const poiNames = new Set<string>();
  for (const poi of poiAssets) {
    validatePoi(poi, errors);
    poiNames.add(poi.name);
  }
  checks.push("all POI fields, coordinates, asset_type, source_provider, and confidence validated");

  for (const route of routeFacts) {
    validateRoute(route, errors);
    if (!poiNames.has(route.from)) {
      errors.push(`route from must exist in poi assets: ${route.from}`);
    }
    if (!poiNames.has(route.to)) {
      errors.push(`route to must exist in poi assets: ${route.to}`);
    }
  }
  checks.push("all route fields, metrics, source_provider, confidence, and POI references validated");

  return {
    valid: errors.length === 0,
    checks,
    errors,
    summary: {
      poi_count: poiAssets.length,
      route_count: routeFacts.length,
      source_provider: "amap",
      confidence: "verified",
    },
  };
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content) as T;
}

function validatePoi(poi: MapPOIAsset, errors: string[]): void {
  requireNonEmptyString(poi.id, "poi.id", errors);
  requireNonEmptyString(poi.name, `poi.name (${poi.id})`, errors);
  requireNonEmptyString(poi.city, `poi.city (${poi.name})`, errors);
  requireNonEmptyString(poi.address, `poi.address (${poi.name})`, errors);

  if (!Number.isFinite(poi.latitude) || poi.latitude === 0) {
    errors.push(`poi latitude must be a non-zero number: ${poi.name}`);
  }

  if (!Number.isFinite(poi.longitude) || poi.longitude === 0) {
    errors.push(`poi longitude must be a non-zero number: ${poi.name}`);
  }

  if (poi.asset_type !== "anchor_poi") {
    errors.push(`poi asset_type must be anchor_poi: ${poi.name}`);
  }

  if (poi.source_provider !== "amap") {
    errors.push(`poi source_provider must be amap: ${poi.name}`);
  }

  if (poi.confidence !== "verified") {
    errors.push(`poi confidence must be verified: ${poi.name}`);
  }
}

function validateRoute(route: RouteFact, errors: string[]): void {
  requireNonEmptyString(route.id, "route.id", errors);
  requireNonEmptyString(route.from, `route.from (${route.id})`, errors);
  requireNonEmptyString(route.to, `route.to (${route.id})`, errors);

  if (!["walking", "driving", "transit"].includes(route.mode)) {
    errors.push(`route mode must be walking, driving, or transit: ${route.id}`);
  }

  if (!Number.isFinite(route.distance_m) || route.distance_m <= 0) {
    errors.push(`route distance_m must be > 0: ${route.from} -> ${route.to}`);
  }

  if (!Number.isFinite(route.duration_min) || route.duration_min <= 0) {
    errors.push(`route duration_min must be > 0: ${route.from} -> ${route.to}`);
  }

  if (route.source_provider !== "amap") {
    errors.push(`route source_provider must be amap: ${route.from} -> ${route.to}`);
  }

  if (route.confidence !== "verified") {
    errors.push(`route confidence must be verified: ${route.from} -> ${route.to}`);
  }
}

function requireNonEmptyString(value: string, label: string, errors: string[]): void {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`${label} must be a non-empty string`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`validate:beijing-map-assets failed: ${message}`);
  process.exitCode = 1;
});
