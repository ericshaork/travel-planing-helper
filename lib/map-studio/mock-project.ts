import type { BuildMapProjectInput, MapLayer, MapPlace, MapProject, MapRegion } from "./types";

const DEFAULT_CENTER = {
  lat: 39.9042,
  lng: 116.4074,
};

const CITY_CENTERS: Record<string, { lat: number; lng: number; country?: string }> = {
  北京: { lat: 39.9042, lng: 116.4074, country: "中国" },
  西安: { lat: 34.3416, lng: 108.9398, country: "中国" },
  杭州: { lat: 30.2741, lng: 120.1551, country: "中国" },
  厦门: { lat: 24.4798, lng: 118.0894, country: "中国" },
  成都: { lat: 30.5728, lng: 104.0668, country: "中国" },
  上海: { lat: 31.2304, lng: 121.4737, country: "中国" },
};

const DEFAULT_LAYERS: MapLayer[] = [
  {
    id: "layer-regions",
    name: "区域",
    type: "regions",
    isVisible: true,
    opacity: 0.72,
    zIndex: 20,
    stylePreset: "phase1-region-fill",
    controls: {
      canToggle: true,
      canAdjustOpacity: true,
    },
  },
  {
    id: "layer-labels",
    name: "地名标签",
    type: "labels",
    isVisible: true,
    opacity: 1,
    zIndex: 55,
    stylePreset: "phase1-place-labels",
    controls: {
      canToggle: true,
      canAdjustOpacity: false,
    },
  },
  {
    id: "layer-plan-places",
    name: "行程地点",
    type: "plan_places",
    isVisible: true,
    opacity: 1,
    zIndex: 52,
    stylePreset: "phase2-plan-marker",
    controls: {
      canToggle: true,
      canAdjustOpacity: false,
    },
  },
  {
    id: "layer-places",
    name: "推荐地点",
    type: "places",
    isVisible: true,
    opacity: 1,
    zIndex: 40,
    stylePreset: "phase1-place-marker",
    controls: {
      canToggle: true,
      canAdjustOpacity: false,
    },
  },
  {
    id: "layer-routes",
    name: "路线",
    type: "routes",
    isVisible: true,
    opacity: 0.86,
    zIndex: 35,
    stylePreset: "phase1-route-line",
    controls: {
      canToggle: true,
      canAdjustOpacity: true,
    },
  },
  {
    id: "layer-candidates",
    name: "候选",
    type: "candidates",
    isVisible: true,
    opacity: 1,
    zIndex: 50,
    stylePreset: "phase1-candidate-marker",
    controls: {
      canToggle: true,
      canAdjustOpacity: false,
    },
  },
  {
    id: "layer-traffic",
    name: "交通流量",
    type: "traffic",
    isVisible: false,
    opacity: 0.45,
    zIndex: 12,
    stylePreset: "amap-traffic-muted",
    controls: {
      canToggle: true,
      canAdjustOpacity: true,
    },
  },
];

function slugify(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, "-")
    .replace(/^-+|-+$/g, "") || "city";
}

function buildPolygon(center: { lat: number; lng: number }, offsetLat: number, offsetLng: number) {
  return [
    { lat: center.lat + offsetLat + 0.028, lng: center.lng + offsetLng - 0.045 },
    { lat: center.lat + offsetLat + 0.046, lng: center.lng + offsetLng + 0.025 },
    { lat: center.lat + offsetLat - 0.012, lng: center.lng + offsetLng + 0.056 },
    { lat: center.lat + offsetLat - 0.048, lng: center.lng + offsetLng - 0.018 },
  ];
}

function createMockRegion(
  city: string,
  center: { lat: number; lng: number },
  index: number,
  input: {
    idSuffix: string;
    name: string;
    offsetLat: number;
    offsetLng: number;
    fillColor: string;
    tags: string[];
    bestFor: string[];
  },
): MapRegion {
  const fallbackCenter = {
    lat: center.lat + input.offsetLat,
    lng: center.lng + input.offsetLng,
  };

  return {
    id: `${slugify(city)}-region-${input.idSuffix}`,
    name: input.name,
    displayName: input.name,
    city,
    regionType: index === 0 ? "administrative" : "travel_area",
    boundary: {
      type: "polygon",
      coordinates: [buildPolygon(center, input.offsetLat, input.offsetLng)],
      source: "mock",
    },
    fallbackCenter,
    fillColor: input.fillColor,
    borderColor: "rgba(255, 236, 190, 0.72)",
    hoverColor: "rgba(255, 211, 126, 0.54)",
    selectedColor: "rgba(255, 217, 104, 0.76)",
    labelPosition: fallbackCenter,
    summary: `${input.name} 是 ${city} 地图探索的 Phase 1 占位区域，用来验证点击、高亮和详情面板。`,
    tags: input.tags,
    bestFor: input.bestFor,
    representativePlaceIds: [],
    routeIds: [],
    state: {
      isVisible: true,
      isHovered: false,
      isSelected: false,
      isHighlighted: false,
    },
    dataStatus: "mock",
  };
}

function createMockPlace(
  city: string,
  region: MapRegion,
  index: number,
  input: {
    name: string;
    category: MapPlace["category"];
    latOffset: number;
    lngOffset: number;
    tags: string[];
    bestFor: string[];
  },
): MapPlace {
  return {
    id: `${region.id}-place-${index + 1}`,
    name: input.name,
    displayName: input.name,
    city,
    regionId: region.id,
    lat: region.fallbackCenter.lat + input.latOffset,
    lng: region.fallbackCenter.lng + input.lngOffset,
    category: input.category,
    tags: input.tags,
    shortDescription: `${input.name} 是 ${region.displayName} 的 Phase 1 占位地点。`,
    longDescription: "用于验证地点 marker、详情面板、候选清单和写回行程，不代表实时开放信息。",
    suggestedDuration: input.category === "food" ? "1-1.5 小时" : "1.5-2 小时",
    bestFor: input.bestFor,
    openingHours: "建议出行前在官方平台再次确认。",
    ticketInfo: "暂无实时票价，建议出行前核实。",
    crowdLevel: "暂无实时拥挤度。",
    imagePlaceholder: "phase1-map-place-placeholder",
    source: {
      label: "Phase 1 mock",
    },
    sourceType: "mock",
    sourceStatus: "mock",
    dataStatus: "mock",
    isCandidate: false,
    relationshipToPlan: "可作为地图探索候选点，需用户确认后写入行程。",
    ui: {
      markerIcon: "star",
      markerColor: input.category === "food" ? "#d98445" : "#f2cf70",
      isVisible: true,
      isHovered: false,
      isSelected: false,
      isHighlighted: false,
    },
  };
}

function buildMockRegions(city: string, center: { lat: number; lng: number }) {
  return [
    createMockRegion(city, center, 0, {
      idSuffix: "core",
      name: "城市核心区",
      offsetLat: 0.01,
      offsetLng: -0.015,
      fillColor: "rgba(70, 112, 122, 0.58)",
      tags: ["第一次来", "城市漫步"],
      bestFor: ["经典路线", "轻松探索"],
    }),
    createMockRegion(city, center, 1, {
      idSuffix: "culture",
      name: "文化体验区",
      offsetLat: 0.075,
      offsetLng: 0.065,
      fillColor: "rgba(139, 107, 68, 0.56)",
      tags: ["博物馆", "街区"],
      bestFor: ["文化体验", "慢慢逛"],
    }),
    createMockRegion(city, center, 2, {
      idSuffix: "nature",
      name: "自然休闲区",
      offsetLat: -0.075,
      offsetLng: 0.075,
      fillColor: "rgba(85, 126, 88, 0.54)",
      tags: ["自然", "放松"],
      bestFor: ["不赶路", "半日安排"],
    }),
  ];
}

function buildMockPlaces(city: string, regions: MapRegion[]) {
  const placeInputs = [
    {
      name: `${city}城市地标`,
      category: "attraction" as const,
      latOffset: 0.006,
      lngOffset: -0.006,
      tags: ["地标", "拍照"],
      bestFor: ["第一次来", "路线锚点"],
    },
    {
      name: `${city}老街小吃`,
      category: "food" as const,
      latOffset: -0.006,
      lngOffset: 0.008,
      tags: ["美食", "街区"],
      bestFor: ["午后补给", "轻松体验"],
    },
    {
      name: `${city}博物馆片区`,
      category: "museum" as const,
      latOffset: 0.004,
      lngOffset: 0.006,
      tags: ["文化", "室内"],
      bestFor: ["下雨备选", "文化体验"],
    },
  ];

  return regions.flatMap((region, regionIndex) =>
    placeInputs.slice(0, regionIndex === 0 ? 2 : 1).map((input, index) =>
      createMockPlace(city, region, index, input),
    ),
  );
}

export function createMockMapProject(input: BuildMapProjectInput): MapProject {
  const city = input.tripPlan.destination || input.tripRequest?.destinationCity || "目的地";
  const centerConfig = CITY_CENTERS[city] ?? DEFAULT_CENTER;
  const center = {
    lat: centerConfig.lat,
    lng: centerConfig.lng,
  };
  const regions = buildMockRegions(city, center);
  const places = buildMockPlaces(city, regions);
  const routes = input.tripPlan.dailyItinerary.map((day) => {
    const dayPlaceIds = places.slice(0, Math.min(3, places.length)).map((place) => place.id);
    return {
      id: `${slugify(city)}-day-${day.day}-route`,
      name: `Day ${day.day} 占位路线`,
      routeType: "day_route" as const,
      dayId: String(day.day),
      placeIds: dayPlaceIds,
      path: {
        type: dayPlaceIds.length > 1 ? ("polyline" as const) : ("none" as const),
        coordinates: places
          .filter((place) => dayPlaceIds.includes(place.id))
          .map((place) => ({ lat: place.lat, lng: place.lng })),
        source: dayPlaceIds.length > 1 ? ("mock" as const) : ("none" as const),
      },
      estimatedDuration: "Phase 1 暂不计算真实时间",
      estimatedDistance: "Phase 1 暂不计算真实距离",
      transportMode: "mixed" as const,
      warnings: [],
      suggestions: ["这是占位路线，用于验证路线图层。"],
      animationState: "idle" as const,
      dataStatus: "mock" as const,
    };
  });

  const regionPlaceIds = new Map<string, string[]>();
  places.forEach((place) => {
    regionPlaceIds.set(place.regionId, [
      ...(regionPlaceIds.get(place.regionId) ?? []),
      place.id,
    ]);
  });

  const routeIds = routes.map((route) => route.id);
  const hydratedRegions = regions.map((region) => ({
    ...region,
    representativePlaceIds: regionPlaceIds.get(region.id) ?? [],
    routeIds,
  }));

  return {
    id: `${input.projectId ?? "local"}-${slugify(city)}-map-project`,
    projectId: input.projectId,
    title: `${city}地图探索`,
    city,
    country: centerConfig.country ?? "中国",
    mapMode: {
      currentLayer: "layer-regions",
      zoomLevel: 11,
      center,
      activeTool: "region",
    },
    regions: hydratedRegions,
    places,
    routes,
    layers: DEFAULT_LAYERS,
    candidatePlaceIds: [],
    candidatePlaces: [],
    unresolvedPlaces: [],
    activeDayId: input.tripPlan.dailyItinerary[0]
      ? String(input.tripPlan.dailyItinerary[0].day)
      : undefined,
    tooltips: [],
    actions: [],
    updatedAt: input.now ?? new Date().toISOString(),
  };
}
