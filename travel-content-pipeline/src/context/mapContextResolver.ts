import { MapResolver } from "../map/index.js";
import type { ContentContext, MapContext, RequestContext, RouteFact, TransferBurdenFact, VerifiedPoi } from "./types.js";

interface ResolveMapContextOptions {
  projectRoot?: string;
  requestContext: RequestContext;
  contentContext: ContentContext;
  selectedMapContext: MapContext;
}

interface CandidateRoute {
  from: string;
  to: string;
  mode: "walking";
}

const districtByCanonicalPoiName: Record<string, string> = {
  故宫博物院: "东城区",
  景山公园: "西城区",
  什刹海: "西城区",
  前门: "东城区",
  牛街: "西城区",
  鼓楼: "东城区",
  南锣鼓巷: "东城区",
  "798艺术区": "朝阳区",
  天坛公园: "东城区",
};

const canonicalPoiNameByRelevantPoiId: Record<string, string> = {
  poi_forbidden_city: "故宫博物院",
  poi_jingshan: "景山公园",
  poi_shichahai_lakeside: "什刹海",
  poi_dashilar_side_streets: "前门",
  poi_niujie: "牛街",
  poi_gulou_nanluo_walk: "鼓楼",
  poi_798_art: "798艺术区",
  poi_798_edge: "798艺术区",
  poi_temple_of_heaven: "天坛公园",
};

const derivedRouteRules: Array<{
  requiredPoiIds: string[];
  route: CandidateRoute;
}> = [
  {
    requiredPoiIds: ["poi_forbidden_city", "poi_jingshan"],
    route: { from: "故宫博物院", to: "景山公园", mode: "walking" },
  },
  {
    requiredPoiIds: ["poi_jingshan", "poi_shichahai_lakeside"],
    route: { from: "景山公园", to: "什刹海", mode: "walking" },
  },
  {
    requiredPoiIds: ["poi_niujie", "poi_dashilar_side_streets"],
    route: { from: "牛街", to: "前门", mode: "walking" },
  },
  {
    requiredPoiIds: ["poi_niujie", "poi_gulou_nanluo_walk"],
    route: { from: "牛街", to: "鼓楼", mode: "walking" },
  },
  {
    requiredPoiIds: ["poi_gulou_nanluo_walk"],
    route: { from: "鼓楼", to: "南锣鼓巷", mode: "walking" },
  },
  {
    requiredPoiIds: ["poi_gulou_nanluo_walk", "poi_798_art"],
    route: { from: "鼓楼", to: "798艺术区", mode: "walking" },
  },
];

export async function resolveMapContext(options: ResolveMapContextOptions): Promise<MapContext> {
  if (normalize(options.requestContext.city) !== "beijing") {
    return options.selectedMapContext;
  }

  const resolver = new MapResolver({
    projectRoot: options.projectRoot,
    city: options.requestContext.city,
  });

  const verifiedPois = await resolveVerifiedPois({
    resolver,
    contentContext: options.contentContext,
    selectedMapContext: options.selectedMapContext,
  });

  const routeFacts = await resolveRouteFacts({
    resolver,
    contentContext: options.contentContext,
    selectedMapContext: options.selectedMapContext,
  });

  const transferBurden = mergeTransferBurden({
    selectedMapContext: options.selectedMapContext,
    routeFacts,
  });

  const clusterWarnings = mergeClusterWarnings({
    selectedMapContext: options.selectedMapContext,
    transferBurden,
  });

  const routeFeasibilityNotes = mergeRouteFeasibilityNotes({
    selectedMapContext: options.selectedMapContext,
    transferBurden,
  });

  return {
    verified_pois: verifiedPois,
    route_facts: routeFacts,
    transfer_burden: transferBurden,
    cluster_warnings: clusterWarnings,
    route_feasibility_notes: routeFeasibilityNotes,
  };
}

async function resolveVerifiedPois(options: {
  resolver: MapResolver;
  contentContext: ContentContext;
  selectedMapContext: MapContext;
}): Promise<VerifiedPoi[]> {
  const names = new Set<string>();

  for (const poi of options.selectedMapContext.verified_pois) {
    names.add(poi.name);
  }

  for (const poi of options.contentContext.relevant_pois) {
    const canonical = canonicalPoiNameByRelevantPoiId[poi.id];
    if (canonical) {
      names.add(canonical);
    }
  }

  const resolved: VerifiedPoi[] = [];
  const seen = new Set<string>();

  for (const name of names) {
    const found = await options.resolver.resolvePoi(name);
    if (found) {
      const key = normalize(found.name);
      if (!seen.has(key)) {
        resolved.push({
          name: found.name,
          district_name: districtByCanonicalPoiName[found.name] ?? found.city,
          latitude: found.latitude,
          longitude: found.longitude,
          source_provider: found.source_provider,
          confidence: found.confidence,
          asset_id: found.id,
        });
        seen.add(key);
      }
      continue;
    }

    const fallback = options.selectedMapContext.verified_pois.find((poi) => normalize(poi.name) === normalize(name));
    if (fallback && !seen.has(normalize(fallback.name))) {
      resolved.push(fallback);
      seen.add(normalize(fallback.name));
    }
  }

  return resolved;
}

async function resolveRouteFacts(options: {
  resolver: MapResolver;
  contentContext: ContentContext;
  selectedMapContext: MapContext;
}): Promise<RouteFact[]> {
  const routeMap = new Map<string, RouteFact>();

  for (const route of options.selectedMapContext.route_facts) {
    routeMap.set(buildPairKey(route.from, route.to), route);
  }

  const candidateRoutes = collectCandidateRoutes(options.contentContext, options.selectedMapContext);

  for (const candidate of candidateRoutes) {
    const resolved = await options.resolver.resolveRoute(candidate.from, candidate.to, candidate.mode);
    if (!resolved || resolved.source_provider !== "amap" || resolved.confidence !== "verified") {
      continue;
    }

    routeMap.set(
      buildPairKey(candidate.from, candidate.to),
      {
        from: resolved.from,
        to: resolved.to,
        transport_mode: resolved.mode,
        distance_meters: resolved.distance_m,
        duration_minutes: resolved.duration_min,
        source_provider: resolved.source_provider,
        confidence: resolved.confidence,
        id: resolved.id,
      },
    );
  }

  return Array.from(routeMap.values());
}

function collectCandidateRoutes(contentContext: ContentContext, selectedMapContext: MapContext): CandidateRoute[] {
  const selectedPoiIds = new Set(contentContext.relevant_pois.map((poi) => poi.id));
  const candidates = new Map<string, CandidateRoute>();

  for (const rule of derivedRouteRules) {
    if (rule.requiredPoiIds.every((poiId) => selectedPoiIds.has(poiId))) {
      candidates.set(buildPairKey(rule.route.from, rule.route.to), rule.route);
    }
  }

  for (const route of selectedMapContext.route_facts) {
    if (route.transport_mode === "walking") {
      candidates.set(buildPairKey(route.from, route.to), {
        from: route.from,
        to: route.to,
        mode: "walking",
      });
    }
  }

  return Array.from(candidates.values());
}

function mergeTransferBurden(options: {
  selectedMapContext: MapContext;
  routeFacts: RouteFact[];
}): TransferBurdenFact[] {
  const burdenMap = new Map<string, TransferBurdenFact>();

  for (const burden of options.selectedMapContext.transfer_burden) {
    burdenMap.set(buildPairKey(burden.from, burden.to), burden);
  }

  for (const route of options.routeFacts) {
    if (route.source_provider !== "amap" || route.transport_mode !== "walking") {
      continue;
    }

    burdenMap.set(buildPairKey(route.from, route.to), deriveWalkingTransferBurden(route));
  }

  return Array.from(burdenMap.values());
}

function mergeClusterWarnings(options: {
  selectedMapContext: MapContext;
  transferBurden: TransferBurdenFact[];
}): string[] {
  const warnings = [...options.selectedMapContext.cluster_warnings];

  for (const burden of options.transferBurden) {
    if (burden.transport_mode !== "walking") {
      continue;
    }

    if (burden.burden_level === "long_walk" || burden.burden_level === "not_recommended_walk") {
      const warning = `不要把${burden.from}到${burden.to}描述成轻松顺路的步行，需要明确说明移动负担。`;
      if (!warnings.includes(warning)) {
        warnings.push(warning);
      }
    }
  }

  return warnings;
}

function mergeRouteFeasibilityNotes(options: {
  selectedMapContext: MapContext;
  transferBurden: TransferBurdenFact[];
}): string[] {
  const notes = [...options.selectedMapContext.route_feasibility_notes];

  for (const burden of options.transferBurden) {
    if (burden.transport_mode !== "walking") {
      continue;
    }

    let note: string | undefined;
    if (burden.burden_level === "long_walk") {
      note = `${burden.from}到${burden.to}在空间上可连，但更适合说明为需要打车或地铁过渡，而不是默认步行。`;
    } else if (burden.burden_level === "not_recommended_walk") {
      note = `${burden.from}到${burden.to}不适合按步行直连处理，应显式提示改用地铁或打车降低移动压力。`;
    }

    if (note && !notes.includes(note)) {
      notes.push(note);
    }
  }

  return notes;
}

function deriveWalkingTransferBurden(route: RouteFact): TransferBurdenFact {
  let burdenLevel = "easy_walk";
  let reason = `这段步行距离较短，可以作为相邻片区之间的自然连接。`;

  if (route.distance_meters > 4000) {
    burdenLevel = "not_recommended_walk";
    reason = `这段步行距离过长，不应在生成中写成轻松步行，更适合明确建议地铁或打车。`;
  } else if (route.distance_meters > 2500) {
    burdenLevel = "long_walk";
    reason = `这段步行在地图上可行，但已经属于长距离步行，需要说明体力与时间负担。`;
  } else if (route.distance_meters > 1200) {
    burdenLevel = "acceptable_walk";
    reason = `这段步行可以成立，但不应被表述成毫无成本的顺路移动。`;
  }

  return {
    from: route.from,
    to: route.to,
    transport_mode: route.transport_mode,
    burden_level: burdenLevel,
    reason,
  };
}

function buildPairKey(from: string, to: string): string {
  return `${normalize(from)}->${normalize(to)}`;
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}
