import {
  buildShenzhenDestinationMapProject,
} from "./curated-destinations";
import type { BuildMapProjectInput, MapLayer, MapProject } from "./types";

export type DestinationProfileId = "cn-shenzhen";

export interface DestinationProfile {
  id: DestinationProfileId;
  country: "CN";
  countryName: "中国";
  city: "Shenzhen";
  cityName: "深圳";
  cityAdcode: "440300";
  available: true;
}

export interface ChinaCityEntry {
  id: string;
  country: "CN";
  cityName: string;
  cityNameEn: string;
  cityAdcode?: string;
  available: boolean;
  statusLabel: string;
  destinationProfileId?: DestinationProfileId;
}

export const SHENZHEN_DESTINATION_PROFILE: DestinationProfile = {
  id: "cn-shenzhen",
  country: "CN",
  countryName: "中国",
  city: "Shenzhen",
  cityName: "深圳",
  cityAdcode: "440300",
  available: true,
};

export const CHINA_CITY_ENTRIES: ChinaCityEntry[] = [
  {
    id: "cn-beijing",
    country: "CN",
    cityName: "北京",
    cityNameEn: "Beijing",
    available: false,
    statusLabel: "即将开放",
  },
  {
    id: "cn-shanghai",
    country: "CN",
    cityName: "上海",
    cityNameEn: "Shanghai",
    available: false,
    statusLabel: "即将开放",
  },
  {
    id: "cn-hangzhou",
    country: "CN",
    cityName: "杭州",
    cityNameEn: "Hangzhou",
    available: false,
    statusLabel: "即将开放",
  },
  {
    id: "cn-xian",
    country: "CN",
    cityName: "西安",
    cityNameEn: "Xi'an",
    available: false,
    statusLabel: "即将开放",
  },
  {
    id: "cn-chengdu",
    country: "CN",
    cityName: "成都",
    cityNameEn: "Chengdu",
    available: false,
    statusLabel: "即将开放",
  },
  {
    id: "cn-guangzhou",
    country: "CN",
    cityName: "广州",
    cityNameEn: "Guangzhou",
    available: false,
    statusLabel: "即将开放",
  },
  {
    id: "cn-shenzhen",
    country: "CN",
    cityName: "深圳",
    cityNameEn: "Shenzhen",
    cityAdcode: "440300",
    available: true,
    statusLabel: "可探索",
    destinationProfileId: "cn-shenzhen",
  },
  {
    id: "cn-xiamen",
    country: "CN",
    cityName: "厦门",
    cityNameEn: "Xiamen",
    available: false,
    statusLabel: "即将开放",
  },
];

const CHINA_OVERVIEW_LAYERS: MapLayer[] = [
  {
    id: "layer-districts",
    name: "行政区划",
    type: "districts",
    isVisible: true,
    opacity: 0.42,
    zIndex: 18,
    stylePreset: "amap-district-boundaries",
    controls: { canToggle: true, canAdjustOpacity: true },
  },
  {
    id: "layer-labels",
    name: "地名标签",
    type: "labels",
    isVisible: true,
    opacity: 1,
    zIndex: 58,
    stylePreset: "wanderly-map-labels",
    controls: { canToggle: true, canAdjustOpacity: false },
  },
  {
    id: "layer-hotspots",
    name: "热点区域",
    type: "hotspots",
    isVisible: true,
    opacity: 0.74,
    zIndex: 30,
    stylePreset: "wanderly-travel-hotspot-region",
    controls: { canToggle: true, canAdjustOpacity: true },
  },
  {
    id: "layer-plan-places",
    name: "行程地点",
    type: "plan_places",
    isVisible: true,
    opacity: 1,
    zIndex: 56,
    stylePreset: "phase2-plan-marker",
    controls: { canToggle: true, canAdjustOpacity: false },
  },
  {
    id: "layer-places",
    name: "推荐地点",
    type: "places",
    isVisible: true,
    opacity: 1,
    zIndex: 45,
    stylePreset: "wanderly-recommendation-marker",
    controls: { canToggle: true, canAdjustOpacity: false },
  },
  {
    id: "layer-candidates",
    name: "候选",
    type: "candidates",
    isVisible: true,
    opacity: 1,
    zIndex: 52,
    stylePreset: "wanderly-candidate-marker",
    controls: { canToggle: true, canAdjustOpacity: false },
  },
  {
    id: "layer-routes",
    name: "路线",
    type: "routes",
    isVisible: false,
    opacity: 0.84,
    zIndex: 40,
    stylePreset: "wanderly-route-layer",
    controls: { canToggle: true, canAdjustOpacity: true },
  },
  {
    id: "layer-traffic",
    name: "交通流量",
    type: "traffic",
    isVisible: false,
    opacity: 0.45,
    zIndex: 12,
    stylePreset: "amap-traffic-muted",
    controls: { canToggle: true, canAdjustOpacity: true },
  },
];

export function buildChinaOverviewMapProject(
  input: Partial<BuildMapProjectInput> = {},
): MapProject {
  return {
    id: `${input.projectId ?? "local"}-china-overview-map-project`,
    projectId: input.projectId,
    title: "中国地图探索",
    city: "中国",
    country: "中国",
    mapMode: {
      currentLayer: "layer-districts",
      zoomLevel: 4,
      center: { lat: 35.8617, lng: 104.1954 },
      activeTool: "region",
    },
    regions: [],
    places: [],
    routes: [],
    layers: CHINA_OVERVIEW_LAYERS,
    candidatePlaceIds: [],
    candidatePlaces: [],
    unresolvedPlaces: [],
    activeDayId: input.tripPlan?.dailyItinerary[0]
      ? String(input.tripPlan.dailyItinerary[0].day)
      : "1",
    tooltips: [],
    actions: [],
    updatedAt: input.now ?? new Date().toISOString(),
  };
}

export function getDestinationProfile(
  id: DestinationProfileId,
): DestinationProfile {
  switch (id) {
    case "cn-shenzhen":
      return SHENZHEN_DESTINATION_PROFILE;
  }
}

export function buildDestinationMapProject(
  profile: DestinationProfile,
  input: Partial<BuildMapProjectInput> = {},
): MapProject {
  switch (profile.id) {
    case "cn-shenzhen":
      return buildShenzhenDestinationMapProject(input);
  }
}
