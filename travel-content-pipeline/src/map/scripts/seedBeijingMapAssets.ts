import "dotenv/config";

import path from "node:path";

import { writeJsonFile } from "../../format.js";
import { AmapMapAssetClient } from "../amapClient.js";
import type { MapPOIAsset, RouteFact } from "../types.js";

interface BeijingPoiSeedDefinition {
  canonical_name: string;
  query: string;
}

interface BeijingRouteSeedDefinition {
  from: string;
  to: string;
  mode: "walking";
}

const beijingPoiSeeds: BeijingPoiSeedDefinition[] = [
  { canonical_name: "故宫博物院", query: "故宫博物院" },
  { canonical_name: "景山公园", query: "景山公园" },
  { canonical_name: "什刹海", query: "什刹海" },
  { canonical_name: "前门", query: "前门" },
  { canonical_name: "牛街", query: "牛街" },
  { canonical_name: "鼓楼", query: "鼓楼" },
  { canonical_name: "南锣鼓巷", query: "南锣鼓巷" },
  { canonical_name: "798艺术区", query: "798艺术区" },
  { canonical_name: "天坛公园", query: "天坛公园" },
];

const beijingRouteSeeds: BeijingRouteSeedDefinition[] = [
  { from: "故宫博物院", to: "景山公园", mode: "walking" },
  { from: "景山公园", to: "什刹海", mode: "walking" },
  { from: "牛街", to: "前门", mode: "walking" },
  { from: "牛街", to: "鼓楼", mode: "walking" },
  { from: "鼓楼", to: "南锣鼓巷", mode: "walking" },
  { from: "鼓楼", to: "798艺术区", mode: "walking" },
];

const REQUEST_INTERVAL_MS = 350;
const RETRY_DELAYS_MS = [1200, 2500, 4000];

async function main(): Promise<void> {
  const client = new AmapMapAssetClient();
  const poiAssets = await seedPoiAssets(client);
  const routeFacts = await seedRouteFacts(client, poiAssets);

  const outputDir = path.resolve(process.cwd(), "input", "maps_v1", "beijing");
  const poiFilePath = path.join(outputDir, "poi_assets.json");
  const routeFilePath = path.join(outputDir, "route_facts.json");

  await writeJsonFile(poiFilePath, poiAssets);
  await writeJsonFile(routeFilePath, routeFacts);

  console.log(
    JSON.stringify(
      {
        poi_count: poiAssets.length,
        route_count: routeFacts.length,
        poi_assets_path: poiFilePath,
        route_facts_path: routeFilePath,
      },
      null,
      2,
    ),
  );
}

async function seedPoiAssets(client: AmapMapAssetClient): Promise<MapPOIAsset[]> {
  const assets: MapPOIAsset[] = [];

  for (const seed of beijingPoiSeeds) {
    const records = await withAmapRetry(() =>
      client.searchPoi({
        city: "北京",
        name: seed.query,
        asset_type: "anchor_poi",
        limit: 5,
      }),
    );

    const selected = selectBestPoiRecord(seed, records);
    assets.push({
      ...selected,
      name: seed.canonical_name,
      city: normalizeCityName(selected.city),
      asset_type: "anchor_poi",
      source_provider: "amap",
      confidence: "verified",
    });
    await delay(REQUEST_INTERVAL_MS);
  }

  return assets;
}

async function seedRouteFacts(client: AmapMapAssetClient, poiAssets: MapPOIAsset[]): Promise<RouteFact[]> {
  const poiByName = new Map(poiAssets.map((asset) => [asset.name, asset]));
  const routes: RouteFact[] = [];

  for (const seed of beijingRouteSeeds) {
    const fromPoi = poiByName.get(seed.from);
    const toPoi = poiByName.get(seed.to);

    if (!fromPoi || !toPoi) {
      throw new Error(`Cannot seed route fact because POI is missing: ${seed.from} -> ${seed.to}`);
    }

    const route = await withAmapRetry(() =>
      client.searchRoute({
        from: fromPoi,
        to: toPoi,
        mode: seed.mode,
      }),
    );

    routes.push({
      ...route,
      from: fromPoi.name,
      to: toPoi.name,
      mode: seed.mode,
      source_provider: "amap",
      confidence: "verified",
    });
    await delay(REQUEST_INTERVAL_MS);
  }

  return routes;
}

function selectBestPoiRecord(seed: BeijingPoiSeedDefinition, candidates: MapPOIAsset[]): MapPOIAsset {
  if (candidates.length === 0) {
    throw new Error(`No Amap POI result found for ${seed.canonical_name}.`);
  }

  const exactMatch = candidates.find((candidate) => normalize(candidate.name) === normalize(seed.canonical_name));
  if (exactMatch) {
    return exactMatch;
  }

  const partialMatch = candidates.find((candidate) => normalize(candidate.name).includes(normalize(seed.canonical_name)));
  if (partialMatch) {
    return partialMatch;
  }

  return candidates[0];
}

function normalizeCityName(value: string): string {
  return value.trim() || "北京";
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

async function withAmapRetry<T>(run: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await run();
    } catch (error: unknown) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!isAmapLimitError(message) || attempt === RETRY_DELAYS_MS.length) {
        throw error;
      }

      await delay(RETRY_DELAYS_MS[attempt]);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function isAmapLimitError(message: string): boolean {
  return message.includes("EXCEEDED_THE_LIMIT") || message.includes("10021");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`seed:beijing-map-assets failed: ${message}`);
  process.exitCode = 1;
});
