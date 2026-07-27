import "dotenv/config";

import { AmapMapAssetClient } from "./map/index.js";

async function main(): Promise<void> {
  if (!process.env.AMAP_API_KEY) {
    console.log("Map asset test skipped: AMAP_API_KEY is not set.");
    return;
  }

  const client = new AmapMapAssetClient();
  const pois = await client.searchPoi({
    city: "北京",
    name: "故宫博物院",
    asset_type: "anchor_poi",
    limit: 1,
  });

  const target = pois[0];
  if (!target) {
    throw new Error("Map asset test failed: no POI returned for 故宫博物院.");
  }

  console.log(
    JSON.stringify(
      {
        poi_search_test: {
          id: target.id,
          name: target.name,
          city: target.city,
          latitude: target.latitude,
          longitude: target.longitude,
          asset_type: target.asset_type,
          source_provider: target.source_provider,
          confidence: target.confidence,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Map asset test failed: ${message}`);
  process.exitCode = 1;
});
