import { MapResolver } from "./map/index.js";

async function main(): Promise<void> {
  const resolver = new MapResolver();

  const forbiddenCity = await resolver.resolvePoi("故宫博物院");
  const routeFact = await resolver.resolveRoute("故宫博物院", "景山公园", "walking");

  if (!forbiddenCity) {
    throw new Error("Map resolver test failed: POI lookup returned no result for 故宫博物院.");
  }

  if (!routeFact) {
    throw new Error("Map resolver test failed: route lookup returned no result for 故宫博物院 -> 景山公园.");
  }

  console.log(
    JSON.stringify(
      {
        poi_lookup: {
          id: forbiddenCity.id,
          name: forbiddenCity.name,
          city: forbiddenCity.city,
          latitude: forbiddenCity.latitude,
          longitude: forbiddenCity.longitude,
          source_provider: forbiddenCity.source_provider,
          confidence: forbiddenCity.confidence,
        },
        route_lookup: {
          id: routeFact.id,
          from: routeFact.from,
          to: routeFact.to,
          mode: routeFact.mode,
          distance_m: routeFact.distance_m,
          duration_min: routeFact.duration_min,
          source_provider: routeFact.source_provider,
          confidence: routeFact.confidence,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`test:map-resolver failed: ${message}`);
  process.exitCode = 1;
});
