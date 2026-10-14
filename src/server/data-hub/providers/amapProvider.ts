import "server-only";

import type { JsonObject, NormalizedPlace, NormalizedPlaceDetail, NormalizedRouteEstimate, RouteMode } from "../types";
import {
  BaseDataHubProvider,
  buildSourceSummary,
  createMissingFieldNotice,
  providerUnavailableResult,
  type PlaceDetailsInput,
  type PlaceSearchInput,
  type ProviderResult,
  type RouteEstimateInput,
} from "./providerTypes";

const AMAP_TEXT_SEARCH_URL = "https://restapi.amap.com/v3/place/text";
const AMAP_DETAIL_URL = "https://restapi.amap.com/v3/place/detail";
const AMAP_DRIVING_ROUTE_URL = "https://restapi.amap.com/v3/direction/driving";
const AMAP_WALKING_ROUTE_URL = "https://restapi.amap.com/v3/direction/walking";
const EARTH_RADIUS_METERS = 6_371_000;

interface AmapProviderOptions {
  apiKey: string | null;
  fetchImplementation?: typeof fetch;
  now?: () => Date;
  textSearchUrl?: string;
  detailUrl?: string;
  drivingUrl?: string;
  walkingUrl?: string;
}

interface AmapPoi {
  id?: string;
  name?: string;
  address?: string | [];
  location?: string;
  type?: string;
  typecode?: string;
  cityname?: string;
  pname?: string;
  tel?: string | [];
  website?: string | [];
  photos?: Array<{ url?: string; title?: string }>;
  biz_ext?: {
    cost?: string;
    rating?: string;
    open_time?: string;
  };
}

interface AmapPoiResponse {
  status?: string;
  info?: string;
  pois?: AmapPoi[];
}

interface AmapRoutePath {
  distance?: string;
  duration?: string;
}

interface AmapRouteResponse {
  status?: string;
  info?: string;
  route?: {
    paths?: AmapRoutePath[];
  };
}

function nowIso(now: () => Date): string {
  return now().toISOString();
}

function parseAmapLocation(location?: string): { lat: number; lng: number } | null {
  if (!location) return null;
  const [lngText, latText] = location.split(",");
  const lng = Number.parseFloat(lngText ?? "");
  const lat = Number.parseFloat(latText ?? "");
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

function firstText(value: string | [] | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseInteger(value?: string): number | null {
  if (!value?.trim()) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function straightLineDistanceMeters(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }): number {
  const dLat = degreesToRadians(destination.lat - origin.lat);
  const dLng = degreesToRadians(destination.lng - origin.lng);
  const originLat = degreesToRadians(origin.lat);
  const destinationLat = degreesToRadians(destination.lat);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(originLat) * Math.cos(destinationLat) * Math.sin(dLng / 2) ** 2;
  return Math.max(0, Math.round(EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))));
}

function normalizeRouteMode(mode: RouteMode): Extract<RouteMode, "walking" | "driving"> {
  return mode === "walking" ? "walking" : "driving";
}

export class AmapDataHubProvider extends BaseDataHubProvider {
  id = "amap";
  displayName = "AMap / 高德";
  capabilities = {
    searchPlaces: true,
    getPlaceDetails: true,
    getRouteEstimate: true,
  };

  private readonly apiKey: string | null;
  private readonly fetchImplementation: typeof fetch;
  private readonly now: () => Date;
  private readonly textSearchUrl: string;
  private readonly detailUrl: string;
  private readonly drivingUrl: string;
  private readonly walkingUrl: string;

  constructor(options: AmapProviderOptions) {
    super();
    this.apiKey = options.apiKey?.trim() || null;
    this.fetchImplementation = options.fetchImplementation ?? fetch;
    this.now = options.now ?? (() => new Date());
    this.textSearchUrl = options.textSearchUrl ?? AMAP_TEXT_SEARCH_URL;
    this.detailUrl = options.detailUrl ?? AMAP_DETAIL_URL;
    this.drivingUrl = options.drivingUrl ?? AMAP_DRIVING_ROUTE_URL;
    this.walkingUrl = options.walkingUrl ?? AMAP_WALKING_ROUTE_URL;
  }

  async searchPlaces(input: PlaceSearchInput): Promise<ProviderResult<NormalizedPlace[]>> {
    if (!this.apiKey) {
      return providerUnavailableResult(this.id, "searchPlaces", "缺少 AMAP_API_KEY，无法调用高德地点搜索。");
    }

    const query = input.query.trim();
    if (!query) {
      return {
        ok: false,
        provider: this.id,
        reason: "invalidInput",
        message: "地点搜索关键词不能为空。",
        missingFields: [createMissingFieldNotice({ fieldName: "query", reason: "not_returned", message: "地点搜索关键词不能为空。", provider: this.id })],
      };
    }

    const url = new URL(this.textSearchUrl);
    url.searchParams.set("keywords", query);
    if (input.city?.trim()) url.searchParams.set("city", input.city.trim());
    url.searchParams.set("offset", String(Math.max(1, Math.min(input.limit ?? 10, 25))));
    url.searchParams.set("page", "1");
    url.searchParams.set("extensions", "all");
    url.searchParams.set("key", this.apiKey);

    const response = await this.fetchImplementation(url.toString(), { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" });
    const data = (await response.json()) as AmapPoiResponse;
    if (data.status !== "1") {
      return {
        ok: false,
        provider: this.id,
        reason: "providerError",
        message: data.info?.trim() || "高德地点搜索失败。",
        missingFields: [createMissingFieldNotice({ fieldName: "searchPlaces", reason: "provider_failed", message: data.info?.trim() || "高德地点搜索失败。", provider: this.id })],
      };
    }

    const fetchedAt = nowIso(this.now);
    const places = (data.pois ?? [])
      .map((poi) => this.mapPoiToPlace(poi, fetchedAt))
      .filter((place): place is NormalizedPlace => place !== null);

    return {
      ok: true,
      provider: this.id,
      data: places,
      sources: places.map((place) => place.source),
      missingFields: places.length ? [] : [createMissingFieldNotice({ fieldName: "places", reason: "not_returned", message: "高德未返回可用地点。", provider: this.id })],
    };
  }

  async getPlaceDetails(input: PlaceDetailsInput): Promise<ProviderResult<NormalizedPlaceDetail>> {
    if (!this.apiKey) {
      return providerUnavailableResult(this.id, "getPlaceDetails", "缺少 AMAP_API_KEY，无法调用高德地点详情。");
    }

    if (!input.externalId?.trim()) {
      return {
        ok: false,
        provider: this.id,
        reason: "invalidInput",
        message: "高德地点详情需要 externalId。",
        missingFields: [createMissingFieldNotice({ fieldName: "externalId", reason: "not_returned", message: "缺少高德 POI id。", provider: this.id })],
      };
    }

    const url = new URL(this.detailUrl);
    url.searchParams.set("id", input.externalId.trim());
    url.searchParams.set("extensions", "all");
    url.searchParams.set("key", this.apiKey);

    const response = await this.fetchImplementation(url.toString(), { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" });
    const data = (await response.json()) as AmapPoiResponse;
    if (data.status !== "1" || !data.pois?.[0]) {
      const message = data.info?.trim() || "高德未返回地点详情。";
      return {
        ok: false,
        provider: this.id,
        reason: data.status === "1" ? "notFound" : "providerError",
        message,
        missingFields: [createMissingFieldNotice({ fieldName: "placeDetails", reason: data.status === "1" ? "not_returned" : "provider_failed", message, provider: this.id })],
      };
    }

    const fetchedAt = nowIso(this.now);
    const place = this.mapPoiToPlace(data.pois[0], fetchedAt);
    if (!place) {
      return {
        ok: false,
        provider: this.id,
        reason: "providerError",
        message: "高德地点详情缺少名称或坐标。",
        missingFields: [createMissingFieldNotice({ fieldName: "coordinates", reason: "not_returned", message: "高德地点详情缺少名称或坐标。", provider: this.id })],
      };
    }

    const poi = data.pois[0];
    const sources = [place.source];
    const missingFields = [...place.missingFields];
    const openingText = firstText(poi.biz_ext?.open_time);
    if (!openingText) {
      missingFields.push(createMissingFieldNotice({ fieldName: "openingHours", reason: "not_returned", message: "高德未返回稳定开放时间。", provider: this.id, checkedAt: fetchedAt }));
    }
    if (!firstText(poi.biz_ext?.cost)) {
      missingFields.push(createMissingFieldNotice({ fieldName: "ticketInfo", reason: "not_returned", message: "高德未返回稳定门票/价格信息。", provider: this.id, checkedAt: fetchedAt }));
    }

    const detail: NormalizedPlaceDetail = {
      place,
      intro: null,
      openingHours: openingText
        ? {
            weeklyText: [openingText],
            todayOpenStatus: "unknown",
            source: buildSourceSummary({ provider: this.id, fieldName: "openingHours", externalId: input.externalId, confidence: 0.45, fetchedAt }),
            confidence: 0.45,
            lastVerifiedAt: fetchedAt,
            missingFields: [],
          }
        : null,
      ticketInfo: firstText(poi.biz_ext?.cost)
        ? {
            status: "unknown",
            priceText: firstText(poi.biz_ext?.cost),
            source: buildSourceSummary({ provider: this.id, fieldName: "ticketInfo", externalId: input.externalId, confidence: 0.35, fetchedAt }),
            confidence: 0.35,
            lastVerifiedAt: fetchedAt,
            missingFields: [],
          }
        : null,
      phone: firstText(poi.tel),
      website: firstText(poi.website),
      recommendedDurationMinutes: null,
      crowdLevel: null,
      bestTimeToVisit: null,
      tips: null,
      imageUrls: (poi.photos ?? [])
        .map((photo) => firstText(photo.url) ? { url: firstText(photo.url)!, alt: firstText(photo.title) ?? place.name, source: buildSourceSummary({ provider: this.id, fieldName: "imageUrls", externalId: input.externalId, confidence: 0.5, fetchedAt }) } : null)
        .filter((image): image is NonNullable<typeof image> => image !== null),
      sources,
      confidence: place.confidence,
      lastVerifiedAt: fetchedAt,
      missingFields,
    };

    return { ok: true, provider: this.id, data: detail, sources, missingFields };
  }

  async getRouteEstimate(input: RouteEstimateInput): Promise<ProviderResult<NormalizedRouteEstimate>> {
    if (!this.apiKey) {
      return providerUnavailableResult(this.id, "getRouteEstimate", "缺少 AMAP_API_KEY，无法调用高德路线估算。");
    }

    const mode = normalizeRouteMode(input.mode);
    const url = new URL(mode === "walking" ? this.walkingUrl : this.drivingUrl);
    url.searchParams.set("origin", `${input.origin.lng},${input.origin.lat}`);
    url.searchParams.set("destination", `${input.destination.lng},${input.destination.lat}`);
    url.searchParams.set("extensions", "base");
    url.searchParams.set("key", this.apiKey);

    const fetchedAt = nowIso(this.now);
    const source = buildSourceSummary({ provider: this.id, fieldName: "route", confidence: 0.82, fetchedAt });
    const response = await this.fetchImplementation(url.toString(), { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" });
    const data = (await response.json()) as AmapRouteResponse;

    const firstPath = data.route?.paths?.[0];
    const distanceMeters = parseInteger(firstPath?.distance);
    const durationSeconds = parseInteger(firstPath?.duration);
    const missingFields = [];

    if (data.status !== "1" || distanceMeters === null || durationSeconds === null) {
      missingFields.push(createMissingFieldNotice({ fieldName: "route", reason: data.status === "1" ? "not_returned" : "provider_failed", message: data.info?.trim() || "高德路线未返回有效距离或耗时，已使用直线距离降级。", provider: this.id, checkedAt: fetchedAt }));
    }

    const fallbackDistance = straightLineDistanceMeters(input.origin, input.destination);
    const route: NormalizedRouteEstimate = {
      originPlaceId: input.originPlaceId ?? "",
      destinationPlaceId: input.destinationPlaceId ?? "",
      mode,
      distanceMeters: distanceMeters ?? fallbackDistance,
      durationSeconds: durationSeconds ?? Math.max(60, Math.ceil(fallbackDistance / (mode === "walking" ? 1.2 : 8))),
      provider: this.id,
      source,
      confidence: missingFields.length ? 0.35 : 0.82,
      lastVerifiedAt: fetchedAt,
      missingFields,
    };

    return { ok: true, provider: this.id, data: route, sources: [source], missingFields };
  }

  private mapPoiToPlace(poi: AmapPoi, fetchedAt: string): NormalizedPlace | null {
    const name = firstText(poi.name);
    const coordinates = parseAmapLocation(poi.location);
    if (!name || !coordinates) return null;
    const source = buildSourceSummary({ provider: this.id, fieldName: "place", externalId: firstText(poi.id), confidence: 0.78, fetchedAt });
    const missingFields = [];
    if (!firstText(poi.address as string | [] | undefined)) {
      missingFields.push(createMissingFieldNotice({ fieldName: "address", reason: "not_returned", message: "高德未返回地址。", provider: this.id, checkedAt: fetchedAt }));
    }

    return {
      id: firstText(poi.id) ? `amap:${firstText(poi.id)}` : `amap:${name}:${coordinates.lng},${coordinates.lat}`,
      name,
      nameEn: null,
      lat: coordinates.lat,
      lng: coordinates.lng,
      address: firstText(poi.address),
      category: firstText(poi.type) ?? firstText(poi.typecode),
      tags: [firstText(poi.type), firstText(poi.cityname), firstText(poi.pname)].filter((tag): tag is string => tag !== null),
      status: "active",
      source,
      confidence: source.confidence,
      lastVerifiedAt: fetchedAt,
      missingFields,
    };
  }
}
