import "dotenv/config";

import { AmapClient } from "./integrations/maps/amapClient.js";
import { normalizeAmapPoi, normalizeAmapRoutePlan } from "./integrations/maps/normalizeAmap.js";

async function main(): Promise<void> {
  const client = new AmapClient();

  const forbiddenCity = await resolveFirstPoi(client, {
    city: "北京",
    keywords: "故宫博物院",
  });

  const shichahai = await resolveFirstPoi(client, {
    city: "北京",
    keywords: "什刹海",
  });

  const routeResponse = await client.planWalkingRoute({
    origin: {
      longitude: forbiddenCity.longitude,
      latitude: forbiddenCity.latitude,
    },
    destination: {
      longitude: shichahai.longitude,
      latitude: shichahai.latitude,
    },
  });

  const firstPath = routeResponse.route?.paths?.[0];
  if (!firstPath) {
    throw new Error("Amap route planning returned no route path.");
  }

  const normalizedRoutePlan = normalizeAmapRoutePlan({
    origin: forbiddenCity.name,
    destination: shichahai.name,
    path: firstPath,
  });

  console.log(
    JSON.stringify(
      {
        poi_search_test: forbiddenCity,
        route_test: {
          origin: normalizedRoutePlan.origin,
          destination: normalizedRoutePlan.destination,
          transport_mode: normalizedRoutePlan.transport_mode,
          route_distance_meters: normalizedRoutePlan.route_distance_meters,
          estimated_duration_minutes: normalizedRoutePlan.estimated_duration_minutes,
          source_provider: normalizedRoutePlan.source_provider,
        },
      },
      null,
      2,
    ),
  );
}

async function resolveFirstPoi(client: AmapClient, params: { city: string; keywords: string }) {
  const response = await client.searchPois(params);
  const firstRecord = response.pois?.[0];
  if (!firstRecord) {
    throw new Error(`Amap POI search returned no results for "${params.keywords}" in "${params.city}".`);
  }

  return normalizeAmapPoi(firstRecord);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Amap test failed: ${message}`);
  process.exitCode = 1;
});
