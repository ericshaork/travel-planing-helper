import "server-only";

import { AppError } from "../utils/errors";
import type { PoiProvider } from "./provider";
import { POI_WARNINGS, unavailablePoiResult } from "./provider";
import type {
  Coordinates,
  PoiCandidate,
  PoiSearchRequest,
  PoiSearchResult,
} from "./types";

const AMAP_TEXT_SEARCH_URL = "https://restapi.amap.com/v3/place/text";
const DEFAULT_LIMIT = 5;

interface AmapPoiProviderOptions {
  apiKey: string;
  baseUrl?: string;
  fetchImplementation?: typeof fetch;
}

interface AmapTextSearchPoi {
  id?: string;
  name?: string;
  address?: string;
  location?: string;
  type?: string;
  typecode?: string;
  cityname?: string;
  pname?: string;
}

interface AmapTextSearchResponse {
  status?: string;
  info?: string;
  infocode?: string;
  pois?: AmapTextSearchPoi[];
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function parseCoordinates(location?: string): Coordinates | null {
  if (!location) {
    return null;
  }

  const [lngText, latText] = location.split(",");

  if (!lngText || !latText) {
    return null;
  }

  const lng = Number.parseFloat(lngText);
  const lat = Number.parseFloat(latText);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    return null;
  }

  return { lat, lng };
}

function buildStablePoiId(
  poi: AmapTextSearchPoi,
  coordinates: Coordinates,
  city: string,
): string {
  if (poi.id?.trim()) {
    return poi.id.trim();
  }

  const name = poi.name?.trim() || "poi";
  return `amap-${city}-${name}-${coordinates.lng}-${coordinates.lat}`;
}

function scoreConfidence(keyword: string, poi: AmapTextSearchPoi): number {
  const normalizedKeyword = normalize(keyword);
  const normalizedName = normalize(poi.name ?? "");
  const normalizedAddress = normalize(poi.address ?? "");
  const normalizedType = normalize(poi.type ?? poi.typecode ?? "");

  if (normalizedName === normalizedKeyword) {
    return 0.9;
  }

  if (normalizedName.includes(normalizedKeyword)) {
    return 0.75;
  }

  if (
    normalizedAddress.includes(normalizedKeyword) ||
    normalizedType.includes(normalizedKeyword)
  ) {
    return 0.5;
  }

  return 0.4;
}

function mapPoiCandidate(
  poi: AmapTextSearchPoi,
  keyword: string,
  fallbackCity: string,
): PoiCandidate | null {
  const coordinates = parseCoordinates(poi.location);

  if (!coordinates || !poi.name?.trim()) {
    return null;
  }

  const city = poi.cityname?.trim() || fallbackCity;
  return {
    id: buildStablePoiId(poi, coordinates, city),
    name: poi.name.trim(),
    address: poi.address?.trim() || "地址暂缺",
    city,
    coordinates,
    type: poi.type?.trim() || poi.typecode?.trim(),
    confidence: scoreConfidence(keyword, poi),
    provider: "amap",
  };
}

export class AmapPoiProvider implements PoiProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImplementation: typeof fetch;

  constructor(options: AmapPoiProviderOptions) {
    if (!options.apiKey.trim()) {
      throw new AppError(
        "UNKNOWN_ERROR",
        "POI_PROVIDER=amap 时缺少 AMAP_API_KEY，请检查服务端环境变量。",
      );
    }

    this.apiKey = options.apiKey.trim();
    this.baseUrl = options.baseUrl ?? AMAP_TEXT_SEARCH_URL;
    this.fetchImplementation = options.fetchImplementation ?? fetch;
  }

  async searchPoi(request: PoiSearchRequest): Promise<PoiSearchResult> {
    const city = request.city.trim();
    const keyword = request.keyword.trim();
    const limit = Math.max(1, request.limit ?? DEFAULT_LIMIT);

    if (!city) {
      return unavailablePoiResult(POI_WARNINGS.emptyCity);
    }

    if (!keyword) {
      return unavailablePoiResult(POI_WARNINGS.emptyKeyword);
    }

    const url = new URL(this.baseUrl);
    url.searchParams.set("keywords", keyword);
    url.searchParams.set("city", city);
    url.searchParams.set("offset", String(limit));
    url.searchParams.set("page", "1");
    url.searchParams.set("key", this.apiKey);

    let response: Response;
    try {
      response = await this.fetchImplementation(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });
    } catch {
      throw new AppError(
        "UNKNOWN_ERROR",
        "高德 POI 请求失败了，请稍后再试。",
      );
    }

    let data: AmapTextSearchResponse;
    try {
      data = (await response.json()) as AmapTextSearchResponse;
    } catch {
      throw new AppError(
        "UNKNOWN_ERROR",
        "高德 POI 返回格式异常，请稍后再试。",
      );
    }

    if (data.status !== "1") {
      return unavailablePoiResult(
        data.info?.trim() || POI_WARNINGS.amapInvalidStatus,
      );
    }

    if (!Array.isArray(data.pois) || data.pois.length === 0) {
      return unavailablePoiResult(POI_WARNINGS.amapNoResult);
    }

    const skippedWarnings: string[] = [];
    const candidates = data.pois
      .map((poi) => {
        const mapped = mapPoiCandidate(poi, keyword, city);

        if (!mapped) {
          skippedWarnings.push(POI_WARNINGS.amapInvalidCoordinate);
        }

        return mapped;
      })
      .filter((candidate): candidate is PoiCandidate => candidate !== null)
      .slice(0, limit);

    if (candidates.length === 0) {
      return {
        candidates: [],
        warnings: [POI_WARNINGS.amapInvalidCoordinate],
      };
    }

    return {
      candidates,
      ...(skippedWarnings.length === 0
        ? {}
        : { warnings: [POI_WARNINGS.amapInvalidCoordinate] }),
    };
  }
}
