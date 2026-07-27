import { buildGenerationContext } from "./buildGenerationContext.js";
import { resolveMapContext } from "./mapContextResolver.js";
import { selectContext, toSelectContextRequest } from "./selectContext.js";
import type { ContentContext, MapContext, RequestContext } from "./types.js";

async function main(): Promise<void> {
  const projectRoot = process.cwd();

  const case1Request: RequestContext = {
    city: "beijing",
    traveler_type: "couple",
    days: 3,
    season: "autumn",
    budget: "medium",
    pace: "balanced",
    motivation: "首次到访",
    theme: "首次北京印象 / 情侣氛围路线",
  };

  const case1Context = await buildGenerationContext({
    projectRoot,
    request: case1Request,
  });

  const verifiedPoiNames = ["故宫博物院", "景山公园"];
  const tracedPois = case1Context.map_context.verified_pois.filter((poi) => verifiedPoiNames.includes(poi.name));
  const tracedRoute = case1Context.map_context.route_facts.find(
    (route) =>
      route.from === "故宫博物院" &&
      route.to === "景山公园" &&
      route.transport_mode === "walking",
  );

  if (!tracedRoute) {
    throw new Error("Trace case 1 failed: verified route 故宫博物院 -> 景山公园 was not found in GenerationContext.");
  }

  const fallbackSelected = selectContext(toSelectContextRequest(case1Request));
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
    requestContext: case1Request,
    contentContext: fallbackSelected.selected_content_context as ContentContext,
    selectedMapContext: fallbackMapContext,
  });

  const fallbackRoute = fallbackResolved.route_facts.find(
    (route) => route.from === "不存在地点A" && route.to === "不存在地点B",
  );

  if (!fallbackRoute || fallbackRoute.source_provider !== "selector_estimate") {
    throw new Error("Trace case 2 failed: unresolved route did not remain as selector_estimate fallback.");
  }

  printCase1(tracedPois, tracedRoute);
  printCase2(fallbackRoute);
}

function printCase1(
  pois: Array<{
    name: string;
    source_provider: string;
    confidence?: string;
  }>,
  route: {
    from: string;
    to: string;
    transport_mode: string;
    distance_meters: number;
    duration_minutes: number;
    source_provider: string;
    confidence?: string;
  },
): void {
  console.log("CASE 1: VERIFIED TRACE");
  for (const poi of pois) {
    console.log("POI:");
    console.log(`name: ${poi.name}`);
    console.log(`source_provider: ${poi.source_provider}`);
    console.log(`confidence: ${poi.confidence ?? "unknown"}`);
  }

  console.log("ROUTE:");
  console.log(`from: ${route.from}`);
  console.log(`to: ${route.to}`);
  console.log(`mode: ${route.transport_mode}`);
  console.log(`distance_m: ${route.distance_meters}`);
  console.log(`duration_min: ${route.duration_minutes}`);
  console.log(`source_provider: ${route.source_provider}`);
  console.log(`confidence: ${route.confidence ?? "unknown"}`);
}

function printCase2(route: {
  from: string;
  to: string;
  source_provider: string;
}): void {
  console.log("CASE 2: FALLBACK TRACE");
  console.log("FALLBACK:");
  console.log(`from: ${route.from}`);
  console.log(`to: ${route.to}`);
  console.log(`source: ${route.source_provider}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`test:map-context-trace failed: ${message}`);
  process.exitCode = 1;
});
