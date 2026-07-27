import { buildGenerationContext } from "./context/buildGenerationContext.js";
import { resolveMapContext } from "./context/mapContextResolver.js";
import { selectContext, toSelectContextRequest } from "./context/selectContext.js";
import type { ContentContext, MapContext, RequestContext } from "./context/types.js";

async function main(): Promise<void> {
  const projectRoot = process.cwd();

  const verifiedContext = await buildGenerationContext({
    projectRoot,
    request: {
      city: "beijing",
      traveler_type: "couple",
      days: 3,
      season: "autumn",
      budget: "medium",
      pace: "balanced",
      motivation: "首次到访",
      theme: "首次北京印象 / 情侣氛围路线",
    },
  });

  const verifiedRoute = verifiedContext.map_context.route_facts.find(
    (route) =>
      route.from === "故宫博物院" &&
      route.to === "景山公园" &&
      route.transport_mode === "walking",
  );

  if (!verifiedRoute) {
    throw new Error("Map context integration test failed: verified route 故宫博物院 -> 景山公园 was not added.");
  }

  const fallbackRequest: RequestContext = {
    city: "beijing",
    traveler_type: "couple",
    days: 3,
    season: "autumn",
    budget: "medium",
    pace: "balanced",
    motivation: "首次到访",
    theme: "首次北京印象 / 情侣氛围路线",
  };

  const fallbackSelected = selectContext(toSelectContextRequest(fallbackRequest));
  const fallbackMapContext: MapContext = {
    ...fallbackSelected.selected_map_context,
    route_facts: [
      ...fallbackSelected.selected_map_context.route_facts,
      {
        from: "不存在地点A",
        to: "不存在地点B",
        transport_mode: "walking",
        distance_meters: 999,
        duration_minutes: 15,
        source_provider: "selector_estimate",
        confidence: "estimated",
      },
    ],
  };

  const fallbackResolved = await resolveMapContext({
    projectRoot,
    requestContext: fallbackRequest,
    contentContext: fallbackSelected.selected_content_context as ContentContext,
    selectedMapContext: fallbackMapContext,
  });

  const fallbackRoute = fallbackResolved.route_facts.find(
    (route) => route.from === "不存在地点A" && route.to === "不存在地点B",
  );

  if (!fallbackRoute || fallbackRoute.source_provider !== "selector_estimate") {
    throw new Error("Map context integration test failed: unresolved route did not fall back to selector_estimate.");
  }

  console.log(
    JSON.stringify(
      {
        case_1_verified_route: verifiedRoute,
        case_2_fallback_route: fallbackRoute,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`test:map-context-integration failed: ${message}`);
  process.exitCode = 1;
});
