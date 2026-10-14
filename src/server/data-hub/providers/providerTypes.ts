import type {
  DataHubProvider,
  DataSourceSummary,
  MissingFieldNotice,
  NormalizedOpeningHours,
  NormalizedPlace,
  NormalizedPlaceDetail,
  NormalizedRouteEstimate,
  PlaceRecord,
  RouteMode,
} from "../types";

export type DataHubCapability =
  | "geocode"
  | "searchPlaces"
  | "getPlaceDetails"
  | "getOpeningHours"
  | "getImages"
  | "getRouteEstimate"
  | "getWeatherContext";

export type ProviderFailureReason =
  | "unsupported"
  | "providerUnavailable"
  | "providerError"
  | "invalidInput"
  | "notFound";

export type ProviderResult<T> =
  | {
      ok: true;
      provider: DataHubProvider | string;
      data: T;
      sources: DataSourceSummary[];
      missingFields: MissingFieldNotice[];
    }
  | {
      ok: false;
      provider: DataHubProvider | string;
      reason: ProviderFailureReason;
      message: string;
      missingFields: MissingFieldNotice[];
    };

export interface CoordinatesInput {
  lat: number;
  lng: number;
}

export interface GeocodeInput {
  address: string;
  city?: string;
  countryCode?: string;
}

export interface PlaceSearchInput {
  query: string;
  city?: string;
  countryCode?: string;
  limit?: number;
}

export interface PlaceDetailsInput {
  placeId?: string;
  externalId?: string;
  provider?: string;
  name?: string;
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
}

export interface OpeningHoursInput extends PlaceDetailsInput {}
export interface ImagesInput extends PlaceDetailsInput {}

export interface RouteEstimateInput {
  originPlaceId?: string;
  destinationPlaceId?: string;
  origin: CoordinatesInput;
  destination: CoordinatesInput;
  mode: RouteMode;
}

export interface WeatherContextInput {
  destinationName?: string;
  lat?: number;
  lng?: number;
  date?: string;
}

export interface WeatherContext {
  summary: string | null;
  provider: string;
  source: DataSourceSummary;
  missingFields: MissingFieldNotice[];
}

export interface DataHubProviderAdapter {
  id: DataHubProvider | string;
  displayName: string;
  capabilities: Partial<Record<DataHubCapability, boolean>>;
  geocode(input: GeocodeInput): Promise<ProviderResult<CoordinatesInput>>;
  searchPlaces(input: PlaceSearchInput): Promise<ProviderResult<NormalizedPlace[]>>;
  getPlaceDetails(input: PlaceDetailsInput): Promise<ProviderResult<NormalizedPlaceDetail>>;
  getOpeningHours(input: OpeningHoursInput): Promise<ProviderResult<NormalizedOpeningHours>>;
  getImages(input: ImagesInput): Promise<ProviderResult<NormalizedPlaceDetail["imageUrls"]>>;
  getRouteEstimate(input: RouteEstimateInput): Promise<ProviderResult<NormalizedRouteEstimate>>;
  getWeatherContext(input: WeatherContextInput): Promise<ProviderResult<WeatherContext>>;
}

export interface DataHubProviderOptions {
  fetchImplementation?: typeof fetch;
  now?: () => Date;
}

export function createMissingFieldNotice(input: {
  fieldName: string;
  reason: MissingFieldNotice["reason"];
  message: string;
  severity?: MissingFieldNotice["severity"];
  provider?: string;
  checkedAt?: string;
}): MissingFieldNotice {
  return {
    fieldName: input.fieldName,
    reason: input.reason,
    severity: input.severity ?? "warning",
    message: input.message,
    provider: input.provider,
    checkedAt: input.checkedAt,
  };
}

export function unsupportedProviderResult<T>(provider: string, capability: DataHubCapability): ProviderResult<T> {
  return {
    ok: false,
    provider,
    reason: "unsupported",
    message: `${provider} does not support ${capability}.`,
    missingFields: [
      createMissingFieldNotice({
        fieldName: capability,
        reason: "not_applicable",
        severity: "info",
        message: `${provider} 暂不支持 ${capability}。`,
        provider,
      }),
    ],
  };
}

export function providerUnavailableResult<T>(provider: string, capability: DataHubCapability, message: string): ProviderResult<T> {
  return {
    ok: false,
    provider,
    reason: "providerUnavailable",
    message,
    missingFields: [
      createMissingFieldNotice({
        fieldName: capability,
        reason: "not_configured",
        message,
        provider,
      }),
    ],
  };
}

export abstract class BaseDataHubProvider implements DataHubProviderAdapter {
  abstract id: DataHubProvider | string;
  abstract displayName: string;
  capabilities: Partial<Record<DataHubCapability, boolean>> = {};

  geocode(_input: GeocodeInput): Promise<ProviderResult<CoordinatesInput>> {
    return Promise.resolve(unsupportedProviderResult(this.id, "geocode"));
  }

  searchPlaces(_input: PlaceSearchInput): Promise<ProviderResult<NormalizedPlace[]>> {
    return Promise.resolve(unsupportedProviderResult(this.id, "searchPlaces"));
  }

  getPlaceDetails(_input: PlaceDetailsInput): Promise<ProviderResult<NormalizedPlaceDetail>> {
    return Promise.resolve(unsupportedProviderResult(this.id, "getPlaceDetails"));
  }

  getOpeningHours(_input: OpeningHoursInput): Promise<ProviderResult<NormalizedOpeningHours>> {
    return Promise.resolve(unsupportedProviderResult(this.id, "getOpeningHours"));
  }

  getImages(_input: ImagesInput): Promise<ProviderResult<NormalizedPlaceDetail["imageUrls"]>> {
    return Promise.resolve(unsupportedProviderResult(this.id, "getImages"));
  }

  getRouteEstimate(_input: RouteEstimateInput): Promise<ProviderResult<NormalizedRouteEstimate>> {
    return Promise.resolve(unsupportedProviderResult(this.id, "getRouteEstimate"));
  }

  getWeatherContext(_input: WeatherContextInput): Promise<ProviderResult<WeatherContext>> {
    return Promise.resolve(unsupportedProviderResult(this.id, "getWeatherContext"));
  }
}

export function buildSourceSummary(input: {
  provider: DataHubProvider | string;
  fieldName?: string;
  sourceUrl?: string | null;
  externalId?: string | null;
  confidence?: number | null;
  fetchedAt?: string | null;
  expiresAt?: string | null;
  lastVerifiedAt?: string | null;
  notes?: string;
}): DataSourceSummary {
  return {
    provider: input.provider,
    fieldName: input.fieldName,
    sourceUrl: input.sourceUrl ?? null,
    externalId: input.externalId ?? null,
    confidence: input.confidence ?? null,
    fetchedAt: input.fetchedAt ?? null,
    expiresAt: input.expiresAt ?? null,
    lastVerifiedAt: input.lastVerifiedAt ?? input.fetchedAt ?? null,
    notes: input.notes,
  };
}

export function mapPlaceRecordToNormalized(place: PlaceRecord, options?: { source?: DataSourceSummary; missingFields?: MissingFieldNotice[] }): NormalizedPlace {
  const source =
    options?.source ??
    buildSourceSummary({
      provider: place.source_provider ?? "unknown",
      externalId: place.source_external_id,
      confidence: null,
      fetchedAt: place.updated_at,
    });

  return {
    id: place.id,
    name: place.name,
    nameEn: place.name_en,
    lat: place.lat,
    lng: place.lng,
    address: place.address,
    category: place.category,
    tags: place.tags,
    destinationId: place.destination_id,
    regionId: place.region_id,
    status: place.status,
    source,
    confidence: source.confidence,
    lastVerifiedAt: source.lastVerifiedAt ?? null,
    missingFields: options?.missingFields ?? [],
  };
}
