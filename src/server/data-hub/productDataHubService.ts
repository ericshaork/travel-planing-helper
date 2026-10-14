import { createSupabaseServiceRoleClient } from "../../../lib/supabase/server.ts";

import { DataHubNormalizedReadService } from "./normalizedReadService.ts";
import { buildSourceSummary, createMissingFieldNotice, mapPlaceRecordToNormalized } from "./providers/providerTypes.ts";
import type {
  DataSourceSummary,
  JsonObject,
  MissingFieldNotice,
  NormalizedOpeningHours,
  NormalizedPlaceDetail,
  NormalizedPlaceFact,
  NormalizedRouteEstimate,
  NormalizedTicketInfo,
  NormalizedWeatherSnapshot,
  PlaceDetailRecord,
  PlaceRecord,
  PlaceSourceRecord,
} from "./types";

interface QueryBuilder<T> {
  select(columns?: string): QueryBuilder<T>;
  eq(column: string, value: unknown): QueryBuilder<T>;
  order(column: string, options?: { ascending?: boolean }): QueryBuilder<T>;
  limit(count: number): QueryBuilder<T>;
  maybeSingle(): Promise<{ data: T | null; error: unknown }>;
}

interface DataHubProductReadClient {
  from<T = unknown>(table: string): QueryBuilder<T>;
}

export interface ProductDataHubRepository {
  getPlace(placeId: string): Promise<PlaceRecord | null>;
  getPlaceByExternalId(provider: string, externalId: string): Promise<PlaceRecord | null>;
  getPlaceDetail(placeId: string): Promise<PlaceDetailRecord | null>;
  getPlaceSources(placeId: string): Promise<PlaceSourceRecord[]>;
}

export interface ProductPlaceProfile {
  detail: NormalizedPlaceDetail;
  facts: NormalizedPlaceFact[];
  weatherContext: NormalizedWeatherSnapshot[];
  routeContext: NormalizedRouteEstimate[];
  sourceSummary: DataSourceSummary[];
  missingFields: MissingFieldNotice[];
}

export interface WeatherContextQuery {
  destinationId?: string | null;
  placeId?: string | null;
  lat?: number | null;
  lng?: number | null;
  limit?: number;
}

export class SupabaseProductDataHubRepository implements ProductDataHubRepository {
  private readonly client: DataHubProductReadClient;

  constructor(
    client: DataHubProductReadClient = createSupabaseServiceRoleClient() as unknown as DataHubProductReadClient,
  ) {
    this.client = client;
  }

  async getPlace(placeId: string): Promise<PlaceRecord | null> {
    const result = await this.client.from<PlaceRecord>("places").select("*").eq("id", placeId).maybeSingle();
    if (result.error) throw new Error("database_error: places lookup failed");
    return result.data;
  }

  async getPlaceByExternalId(provider: string, externalId: string): Promise<PlaceRecord | null> {
    const result = await this.client
      .from<PlaceRecord>("places")
      .select("*")
      .eq("source_provider", provider)
      .eq("source_external_id", externalId)
      .maybeSingle();
    if (result.error) throw new Error("database_error: places external id lookup failed");
    return result.data;
  }

  async getPlaceDetail(placeId: string): Promise<PlaceDetailRecord | null> {
    const result = await this.client.from<PlaceDetailRecord>("place_details").select("*").eq("place_id", placeId).maybeSingle();
    if (result.error) throw new Error("database_error: place_details lookup failed");
    return result.data;
  }

  async getPlaceSources(placeId: string): Promise<PlaceSourceRecord[]> {
    const result = await this.client
      .from<PlaceSourceRecord[]>("place_sources")
      .select("id,place_id,field_name,provider,source_url,raw_external_id,confidence,fetched_at,expires_at")
      .eq("place_id", placeId)
      .order("fetched_at", { ascending: false }) as unknown as { data: PlaceSourceRecord[] | null; error: unknown };
    if (result.error) throw new Error("database_error: place_sources lookup failed");
    return result.data ?? [];
  }
}

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

function sourceFromPlaceSource(record: PlaceSourceRecord): DataSourceSummary {
  return buildSourceSummary({
    provider: record.provider,
    fieldName: record.field_name,
    sourceUrl: record.source_url,
    externalId: record.raw_external_id,
    confidence: record.confidence,
    fetchedAt: record.fetched_at,
    expiresAt: record.expires_at,
  });
}

function pickLatestFact(facts: NormalizedPlaceFact[], factType: string): NormalizedPlaceFact | undefined {
  return facts.find((fact) => fact.factType === factType);
}

function factSource(fact: NormalizedPlaceFact | undefined): DataSourceSummary | undefined {
  return fact?.source;
}

function factText(fact: NormalizedPlaceFact | undefined): string | null {
  return fact?.text?.trim() || null;
}

function factNumber(fact: NormalizedPlaceFact | undefined, key: string): number | null {
  const value = asObject(fact?.value)[key];
  return typeof value === "number" ? value : null;
}

function mapOpeningHours(fact: NormalizedPlaceFact | undefined, detail: PlaceDetailRecord | null): NormalizedOpeningHours | null {
  const value = asObject(fact?.value ?? detail?.opening_hours);
  if (!fact && !detail?.opening_hours) return null;
  const weeklyText = Array.isArray(value.weeklyText)
    ? value.weeklyText.map(String)
    : fact?.text
      ? [fact.text]
      : undefined;
  return {
    weeklyText,
    timezone: typeof value.timezone === "string" ? value.timezone : undefined,
    todayOpenStatus: value.todayOpenStatus === "open" || value.todayOpenStatus === "closed" || value.todayOpenStatus === "temporarily_closed"
      ? value.todayOpenStatus
      : "unknown",
    source: factSource(fact),
    confidence: fact?.confidence ?? null,
    lastVerifiedAt: fact?.lastVerifiedAt ?? fact?.fetchedAt ?? detail?.last_verified_at ?? null,
    missingFields: [],
  };
}

function mapTicketInfo(fact: NormalizedPlaceFact | undefined, detail: PlaceDetailRecord | null): NormalizedTicketInfo | null {
  const value = asObject(fact?.value ?? detail?.ticket_info);
  if (!fact && !detail?.ticket_info) return null;
  const status = typeof value.status === "string" ? value.status : "unknown";
  return {
    status: status === "free" || status === "paid" || status === "reservation_required" || status === "not_applicable"
      ? status
      : "unknown",
    priceText: typeof value.priceText === "string" ? value.priceText : fact?.text ?? null,
    bookingUrl: typeof value.bookingUrl === "string" ? value.bookingUrl : null,
    source: factSource(fact),
    confidence: fact?.confidence ?? null,
    lastVerifiedAt: fact?.lastVerifiedAt ?? fact?.fetchedAt ?? detail?.last_verified_at ?? null,
    missingFields: [],
  };
}

function mapImages(facts: NormalizedPlaceFact[], detail: PlaceDetailRecord | null): NormalizedPlaceDetail["imageUrls"] {
  const factImages = facts
    .filter((fact) => fact.factType === "image")
    .map((fact) => {
      const value = asObject(fact.value);
      const url = typeof value.image_url === "string" ? value.image_url : null;
      if (!url) return null;
      return {
        url,
        source: fact.source,
        alt: typeof value.alt === "string" ? value.alt : undefined,
        license: typeof value.license === "string" ? value.license : undefined,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (factImages.length) return factImages;
  return Array.isArray(detail?.image_urls)
    ? detail.image_urls
        .map((item) => asObject(item))
        .map((item) => typeof item.url === "string" ? { url: item.url } : null)
        .filter((item): item is { url: string } => item !== null)
    : [];
}

function uniqueSources(sources: DataSourceSummary[]): DataSourceSummary[] {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const key = [source.provider, source.fieldName ?? "", source.externalId ?? "", source.sourceUrl ?? ""].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function averageConfidence(sources: DataSourceSummary[]): number | null {
  const values = sources
    .map((source) => source.confidence)
    .filter((value): value is number => typeof value === "number");
  if (!values.length) return null;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

function latestVerifiedAt(sources: DataSourceSummary[]): string | null {
  const timestamps = sources
    .map((source) => source.lastVerifiedAt ?? source.fetchedAt)
    .filter((value): value is string => Boolean(value))
    .sort();
  return timestamps.at(-1) ?? null;
}

function missing(fieldName: string, message: string, provider = "data_hub"): MissingFieldNotice {
  return createMissingFieldNotice({
    fieldName,
    reason: "not_returned",
    severity: fieldName === "openingHours" || fieldName === "ticketInfo" ? "warning" : "info",
    message,
    provider,
  });
}

function buildDetailFromNormalized(input: {
  place: PlaceRecord;
  detail: PlaceDetailRecord | null;
  facts: NormalizedPlaceFact[];
  placeSources: PlaceSourceRecord[];
}): NormalizedPlaceDetail {
  const introFact = pickLatestFact(input.facts, "intro");
  const openingHoursFact = pickLatestFact(input.facts, "opening_hours");
  const ticketInfoFact = pickLatestFact(input.facts, "ticket_info");
  const durationFact = pickLatestFact(input.facts, "recommended_duration");
  const crowdFact = pickLatestFact(input.facts, "crowd_level");
  const bestTimeFact = pickLatestFact(input.facts, "best_time_to_visit");
  const websiteFact = pickLatestFact(input.facts, "website");
  const phoneFact = pickLatestFact(input.facts, "phone");
  const addressFact = pickLatestFact(input.facts, "address");
  const categoryFact = pickLatestFact(input.facts, "category");
  const coordinateFact = pickLatestFact(input.facts, "coordinate");

  const sourceSummary = uniqueSources([
    buildSourceSummary({
      provider: input.place.source_provider ?? "supabase",
      fieldName: "place",
      externalId: input.place.source_external_id,
      fetchedAt: input.place.updated_at,
    }),
    ...input.facts.map((fact) => fact.source),
    ...input.placeSources.map(sourceFromPlaceSource),
  ]);
  const missingFields: MissingFieldNotice[] = [];
  if (!introFact && !input.detail?.intro) missingFields.push(missing("intro", "简介暂缺。"));
  if (!openingHoursFact && !input.detail?.opening_hours) missingFields.push(missing("openingHours", "开放时间暂缺，建议出行前确认。"));
  if (!ticketInfoFact && !input.detail?.ticket_info) missingFields.push(missing("ticketInfo", "门票/预约信息暂缺，价格可能随时间变化。"));
  if (!mapImages(input.facts, input.detail).length) missingFields.push(missing("imageUrls", "图片候选暂缺，先使用占位图。"));

  const place = mapPlaceRecordToNormalized(
    {
      ...input.place,
      address: factText(addressFact) ?? input.place.address,
      category: factText(categoryFact) ?? input.place.category,
      lat: factNumber(coordinateFact, "lat") ?? input.place.lat,
      lng: factNumber(coordinateFact, "lng") ?? input.place.lng,
    },
    { source: sourceSummary[0], missingFields: [] },
  );

  return {
    place: {
      ...place,
      confidence: sourceSummary[0]?.confidence ?? averageConfidence(sourceSummary),
      lastVerifiedAt: latestVerifiedAt(sourceSummary),
    },
    intro: factText(introFact) ?? input.detail?.intro ?? null,
    openingHours: mapOpeningHours(openingHoursFact, input.detail),
    ticketInfo: mapTicketInfo(ticketInfoFact, input.detail),
    phone: factText(phoneFact) ?? input.detail?.phone ?? null,
    website: factText(websiteFact) ?? input.detail?.website ?? null,
    recommendedDurationMinutes: factNumber(durationFact, "minutes") ?? input.detail?.recommended_duration_minutes ?? null,
    crowdLevel: factText(crowdFact) ?? input.detail?.crowd_level ?? null,
    bestTimeToVisit: factText(bestTimeFact) ?? input.detail?.best_time_to_visit ?? null,
    tips: input.detail?.tips ?? null,
    imageUrls: mapImages(input.facts, input.detail),
    sources: sourceSummary,
    confidence: averageConfidence(sourceSummary),
    lastVerifiedAt: latestVerifiedAt(sourceSummary),
    missingFields,
  };
}

export class ProductDataHubService {
  private readonly repository: ProductDataHubRepository;
  private readonly normalizedReadService: DataHubNormalizedReadService;

  constructor(
    repository: ProductDataHubRepository = new SupabaseProductDataHubRepository(),
    normalizedReadService = new DataHubNormalizedReadService(),
  ) {
    this.repository = repository;
    this.normalizedReadService = normalizedReadService;
  }

  async getPlaceFacts(placeId: string): Promise<NormalizedPlaceFact[]> {
    return this.normalizedReadService.getPlaceFacts({ placeId, limit: 50 });
  }

  async getPlaceProfile(placeId: string): Promise<ProductPlaceProfile | null> {
    const place = await this.repository.getPlace(placeId);
    if (!place) return null;
    return this.buildProfile(place);
  }

  async getPlaceProfileByExternalId(provider: string, externalId: string): Promise<ProductPlaceProfile | null> {
    const place = await this.repository.getPlaceByExternalId(provider, externalId);
    if (!place) return null;
    return this.buildProfile(place);
  }

  async getWeatherContext(query: WeatherContextQuery): Promise<NormalizedWeatherSnapshot[]> {
    if (query.placeId) {
      const weather = await this.normalizedReadService.getWeather({ placeId: query.placeId, limit: query.limit ?? 5 });
      if (weather.length) return weather;
    }
    if (query.destinationId) {
      const weather = await this.normalizedReadService.getWeather({ destinationId: query.destinationId, limit: query.limit ?? 5 });
      if (weather.length) return weather;
    }
    return this.normalizedReadService.getWeather({ limit: query.limit ?? 5 });
  }

  async getRouteContext(originPlaceId: string, destinationPlaceId: string): Promise<NormalizedRouteEstimate[]> {
    return this.normalizedReadService.getRouteCache({ originPlaceId, destinationPlaceId, limit: 10 });
  }

  async buildPlaceEvidencePack(placeId: string) {
    const profile = await this.getPlaceProfile(placeId);
    if (!profile) return null;
    return {
      place: profile.detail.place,
      facts: profile.facts,
      detail: profile.detail,
      weatherContext: profile.weatherContext,
      routeContext: profile.routeContext,
      sources: profile.sourceSummary,
      missingFields: profile.missingFields,
      freshness: {
        lastVerifiedAt: profile.detail.lastVerifiedAt,
        fetchedAt: profile.sourceSummary.map((source) => source.fetchedAt).filter(Boolean),
      },
      confidence: profile.detail.confidence,
    };
  }

  private async buildProfile(place: PlaceRecord): Promise<ProductPlaceProfile> {
    const [detail, facts, placeSources, weatherContext] = await Promise.all([
      this.repository.getPlaceDetail(place.id),
      this.getPlaceFacts(place.id),
      this.repository.getPlaceSources(place.id),
      this.getWeatherContext({ destinationId: place.destination_id, placeId: place.id, lat: place.lat, lng: place.lng, limit: 5 }),
    ]);
    const normalizedDetail = buildDetailFromNormalized({ place, detail, facts, placeSources });
    return {
      detail: normalizedDetail,
      facts,
      weatherContext,
      routeContext: [],
      sourceSummary: normalizedDetail.sources,
      missingFields: normalizedDetail.missingFields,
    };
  }
}

export function createProductDataHubService(
  repository?: ProductDataHubRepository,
  normalizedReadService?: DataHubNormalizedReadService,
) {
  return new ProductDataHubService(repository, normalizedReadService);
}

export function stripUnsafeProductData(value: unknown): unknown {
  const text = JSON.stringify(value);
  if (/raw_snapshot|raw_payload|rawJson|service_role|SUPABASE_SERVICE_ROLE_KEY|authorization/i.test(text)) {
    throw new Error("Product Data Hub output contains unsafe provider payload or secret fields.");
  }
  return value;
}
