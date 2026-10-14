import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

import type {
  DataSourceSummary,
  MissingFieldNotice,
  NormalizedPlace,
  NormalizedPlaceDetail,
  NormalizedRouteEstimate,
  PlaceDetailRecord,
  PlaceRecord,
  PlaceSourceRecord,
  RouteCacheRecord,
  RouteMode,
  JsonValue,
} from "./types";
import { createProviderRegistry, type DataHubProviderRegistry } from "./providers/providerRegistry";
import {
  buildSourceSummary,
  createMissingFieldNotice,
  mapPlaceRecordToNormalized,
  type DataHubProviderAdapter,
} from "./providers/providerTypes";

export interface DataHubSearchOptions {
  city?: string;
  countryCode?: string;
  limit?: number;
}

export interface DataHubRouteInput {
  originPlaceId: string;
  destinationPlaceId: string;
  mode: RouteMode;
}

export interface DataHubEnrichPlaceInput {
  placeId?: string;
  name?: string;
  lat?: number;
  lng?: number;
  address?: string | null;
  category?: string | null;
  destinationId?: string | null;
  regionId?: string | null;
  sourceProvider?: string | null;
  sourceExternalId?: string | null;
}

export interface DataHubSearchResponse {
  places: NormalizedPlace[];
  missingFields: MissingFieldNotice[];
  sources: DataSourceSummary[];
}

export interface DataHubPlaceDetailResponse {
  detail: NormalizedPlaceDetail | null;
  missingFields: MissingFieldNotice[];
  sources: DataSourceSummary[];
}

export interface DataHubRouteResponse {
  route: NormalizedRouteEstimate | null;
  missingFields: MissingFieldNotice[];
  sources: DataSourceSummary[];
}

export interface DataHubPlaceBundle {
  place: PlaceRecord;
  detail: PlaceDetailRecord | null;
  sources: PlaceSourceRecord[];
}

export interface DataHubRepository {
  findPlacesByQuery(query: string, options: DataHubSearchOptions): Promise<PlaceRecord[]>;
  getPlaceBundle(placeId: string): Promise<DataHubPlaceBundle | null>;
  getPlace(placeId: string): Promise<PlaceRecord | null>;
  upsertPlacesFromNormalized(places: NormalizedPlace[]): Promise<PlaceRecord[]>;
  upsertPlaceDetail(detail: NormalizedPlaceDetail): Promise<void>;
  upsertPlaceFactsFromDetail(detail: NormalizedPlaceDetail): Promise<void>;
  insertPlaceSources(placeId: string, sources: DataSourceSummary[]): Promise<void>;
  getRouteCache(originPlaceId: string, destinationPlaceId: string, mode: RouteMode): Promise<RouteCacheRecord | null>;
  upsertRouteCache(route: NormalizedRouteEstimate): Promise<void>;
}

type SupabaseResult<T> = Promise<{ data: T | null; error: unknown }>;
interface SupabaseQueryBuilder<T> {
  select(columns?: string): SupabaseQueryBuilder<T>;
  eq(column: string, value: unknown): SupabaseQueryBuilder<T>;
  ilike(column: string, value: string): SupabaseQueryBuilder<T>;
  limit(count: number): SupabaseQueryBuilder<T>;
  maybeSingle(): SupabaseResult<T>;
  single(): SupabaseResult<T>;
  order(column: string, options?: { ascending?: boolean }): SupabaseQueryBuilder<T>;
  upsert(payload: unknown, options?: unknown): SupabaseQueryBuilder<T>;
  insert(payload: unknown): SupabaseQueryBuilder<T>;
}
interface SupabaseClientLike {
  from<T = unknown>(table: string): SupabaseQueryBuilder<T>;
}

function nonExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return true;
  const timestamp = Date.parse(expiresAt);
  return Number.isFinite(timestamp) ? timestamp > Date.now() : false;
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

function detailFromRecords(bundle: DataHubPlaceBundle): NormalizedPlaceDetail {
  const sources = bundle.sources.map(sourceFromPlaceSource);
  const source = sources[0] ?? buildSourceSummary({ provider: bundle.place.source_provider ?? "supabase", externalId: bundle.place.source_external_id, confidence: null, fetchedAt: bundle.place.updated_at });
  const place = mapPlaceRecordToNormalized(bundle.place, { source });
  const missingFields: MissingFieldNotice[] = [];
  if (!bundle.detail?.opening_hours) {
    missingFields.push(createMissingFieldNotice({ fieldName: "openingHours", reason: "not_returned", message: "开放时间暂缺。", provider: "supabase" }));
  }
  if (!bundle.detail?.ticket_info) {
    missingFields.push(createMissingFieldNotice({ fieldName: "ticketInfo", reason: "not_returned", message: "门票/预约信息暂缺。", provider: "supabase" }));
  }

  return {
    place,
    intro: bundle.detail?.intro ?? null,
    openingHours: null,
    ticketInfo: null,
    phone: bundle.detail?.phone ?? null,
    website: bundle.detail?.website ?? null,
    recommendedDurationMinutes: bundle.detail?.recommended_duration_minutes ?? null,
    crowdLevel: bundle.detail?.crowd_level ?? null,
    bestTimeToVisit: bundle.detail?.best_time_to_visit ?? null,
    tips: bundle.detail?.tips ?? null,
    imageUrls: [],
    sources,
    confidence: source.confidence,
    lastVerifiedAt: bundle.detail?.last_verified_at ?? source.lastVerifiedAt ?? null,
    missingFields,
  };
}

function sourceForFact(detail: NormalizedPlaceDetail, fieldName: string): DataSourceSummary {
  return (
    detail.sources.find((source) => source.fieldName === fieldName) ??
    detail.sources[0] ??
    detail.place.source
  );
}

function detailFactPayload(input: {
  detail: NormalizedPlaceDetail;
  factType: string;
  value: JsonValue;
  text?: string | null;
  language?: string | null;
  source?: DataSourceSummary;
}) {
  const source = input.source ?? sourceForFact(input.detail, input.factType);
  return {
    place_id: input.detail.place.id,
    fact_type: input.factType,
    value_json: input.value,
    value_text: input.text ?? null,
    language: input.language ?? null,
    source_provider: String(source.provider),
    source_external_id: source.externalId ?? null,
    source_url: source.sourceUrl ?? null,
    source_name: source.notes ?? null,
    confidence: source.confidence ?? input.detail.confidence ?? 0.5,
    verification_status: "unverified",
    fetched_at: source.fetchedAt ?? new Date().toISOString(),
    last_verified_at: source.lastVerifiedAt ?? source.fetchedAt ?? input.detail.lastVerifiedAt ?? null,
    expires_at: source.expiresAt ?? null,
    metadata: { fromDetailFallback: true },
  };
}

function factsFromDetail(detail: NormalizedPlaceDetail) {
  const facts = [];
  if (detail.intro) {
    facts.push(detailFactPayload({
      detail,
      factType: "intro",
      value: { text: detail.intro },
      text: detail.intro,
      language: "zh-CN",
    }));
  }
  if (detail.openingHours) {
    facts.push(detailFactPayload({
      detail,
      factType: "opening_hours",
      value: detail.openingHours as unknown as JsonValue,
      text: detail.openingHours.weeklyText?.join(" / ") ?? null,
      source: detail.openingHours.source,
    }));
  }
  if (detail.ticketInfo) {
    facts.push(detailFactPayload({
      detail,
      factType: "ticket_info",
      value: detail.ticketInfo as unknown as JsonValue,
      text: detail.ticketInfo.priceText ?? null,
      source: detail.ticketInfo.source,
    }));
  }
  if (detail.phone) {
    facts.push(detailFactPayload({ detail, factType: "phone", value: { phone: detail.phone }, text: detail.phone }));
  }
  if (detail.website) {
    facts.push(detailFactPayload({ detail, factType: "website", value: { website: detail.website }, text: detail.website }));
  }
  if (detail.recommendedDurationMinutes) {
    facts.push(detailFactPayload({
      detail,
      factType: "recommended_duration",
      value: { minutes: detail.recommendedDurationMinutes },
      text: `${detail.recommendedDurationMinutes} minutes`,
    }));
  }
  if (detail.crowdLevel) {
    facts.push(detailFactPayload({ detail, factType: "crowd_level", value: { crowdLevel: detail.crowdLevel }, text: detail.crowdLevel }));
  }
  if (detail.bestTimeToVisit) {
    facts.push(detailFactPayload({ detail, factType: "best_time_to_visit", value: { bestTimeToVisit: detail.bestTimeToVisit }, text: detail.bestTimeToVisit }));
  }
  for (const image of detail.imageUrls) {
    facts.push(detailFactPayload({
      detail,
      factType: "image",
      value: {
        image_url: image.url,
        alt: image.alt ?? null,
        license: image.license ?? null,
      },
      text: image.url,
      source: image.source,
    }));
  }
  return facts;
}

export class SupabaseDataHubRepository implements DataHubRepository {
  constructor(private readonly client: SupabaseClientLike = createSupabaseServiceRoleClient() as unknown as SupabaseClientLike) {}

  async findPlacesByQuery(query: string, options: DataHubSearchOptions): Promise<PlaceRecord[]> {
    const result = await this.client
      .from<PlaceRecord[]>("places")
      .select("*")
      .ilike("name", `%${query}%`)
      .limit(Math.max(1, Math.min(options.limit ?? 10, 25))) as unknown as { data: PlaceRecord[] | null; error: unknown };
    return result.error ? [] : result.data ?? [];
  }

  async getPlaceBundle(placeId: string): Promise<DataHubPlaceBundle | null> {
    const place = await this.getPlace(placeId);
    if (!place) return null;
    const detailResult = await this.client.from<PlaceDetailRecord>("place_details").select("*").eq("place_id", placeId).maybeSingle();
    const sourcesResult = await this.client.from<PlaceSourceRecord[]>("place_sources").select("*").eq("place_id", placeId) as unknown as { data: PlaceSourceRecord[] | null; error: unknown };
    return {
      place,
      detail: detailResult.error ? null : detailResult.data,
      sources: sourcesResult.error ? [] : sourcesResult.data ?? [],
    };
  }

  async getPlace(placeId: string): Promise<PlaceRecord | null> {
    const result = await this.client.from<PlaceRecord>("places").select("*").eq("id", placeId).maybeSingle();
    return result.error ? null : result.data;
  }

  async upsertPlacesFromNormalized(places: NormalizedPlace[]): Promise<PlaceRecord[]> {
    if (!places.length) return [];
    const payload = places.map((place) => ({
      name: place.name,
      name_en: place.nameEn ?? null,
      lat: place.lat,
      lng: place.lng,
      address: place.address ?? null,
      category: place.category ?? null,
      tags: place.tags,
      source_provider: String(place.source.provider),
      source_external_id: place.source.externalId ?? place.id,
      status: place.status,
    }));
    const result = await this.client
      .from<PlaceRecord[]>("places")
      .upsert(payload, { onConflict: "source_provider,source_external_id", ignoreDuplicates: false })
      .select("*") as unknown as { data: PlaceRecord[] | null; error: unknown };
    return result.error ? [] : result.data ?? [];
  }

  async upsertPlaceDetail(detail: NormalizedPlaceDetail): Promise<void> {
    await this.client.from("place_details").upsert({
      place_id: detail.place.id,
      intro: detail.intro ?? null,
      opening_hours: detail.openingHours ?? null,
      ticket_info: detail.ticketInfo ?? null,
      phone: detail.phone ?? null,
      website: detail.website ?? null,
      recommended_duration_minutes: detail.recommendedDurationMinutes ?? null,
      crowd_level: detail.crowdLevel ?? null,
      best_time_to_visit: detail.bestTimeToVisit ?? null,
      tips: detail.tips ?? null,
      image_urls: detail.imageUrls,
      source_summary: { sources: detail.sources },
      last_verified_at: detail.lastVerifiedAt,
    }, { onConflict: "place_id" });
  }

  async upsertPlaceFactsFromDetail(detail: NormalizedPlaceDetail): Promise<void> {
    const facts = factsFromDetail(detail);
    if (!facts.length) return;
    await this.client
      .from("place_facts")
      .upsert(facts, {
        onConflict: "place_id,fact_type,source_provider,source_external_id,language",
        ignoreDuplicates: false,
      });
  }

  async insertPlaceSources(placeId: string, sources: DataSourceSummary[]): Promise<void> {
    if (!sources.length) return;
    await this.client.from("place_sources").insert(sources.map((source) => ({
      place_id: placeId,
      field_name: source.fieldName ?? "unknown",
      provider: String(source.provider),
      source_url: source.sourceUrl ?? null,
      raw_external_id: source.externalId ?? null,
      confidence: source.confidence,
      fetched_at: source.fetchedAt ?? new Date().toISOString(),
      expires_at: source.expiresAt ?? null,
      raw_snapshot: null,
    })));
  }

  async getRouteCache(originPlaceId: string, destinationPlaceId: string, mode: RouteMode): Promise<RouteCacheRecord | null> {
    const result = await this.client
      .from<RouteCacheRecord>("route_cache")
      .select("*")
      .eq("origin_place_id", originPlaceId)
      .eq("destination_place_id", destinationPlaceId)
      .eq("mode", mode)
      .maybeSingle();
    return result.error || !nonExpired(result.data?.expires_at) ? null : result.data;
  }

  async upsertRouteCache(route: NormalizedRouteEstimate): Promise<void> {
    await this.client.from("route_cache").upsert({
      origin_place_id: route.originPlaceId,
      destination_place_id: route.destinationPlaceId,
      mode: route.mode,
      distance_meters: route.distanceMeters,
      duration_seconds: route.durationSeconds,
      provider: String(route.provider),
      raw_json: null,
      fetched_at: route.source.fetchedAt ?? new Date().toISOString(),
      expires_at: route.expiresAt ?? null,
    }, { onConflict: "origin_place_id,destination_place_id,mode" });
  }
}

export interface DataHubServiceOptions {
  repository?: DataHubRepository;
  registry?: DataHubProviderRegistry;
}

export function createDataHubService(options: DataHubServiceOptions = {}) {
  const repository = options.repository ?? new SupabaseDataHubRepository();
  const registry = options.registry ?? createProviderRegistry();

  async function searchPlaces(query: string, searchOptions: DataHubSearchOptions = {}): Promise<DataHubSearchResponse> {
    const trimmed = query.trim();
    if (!trimmed) {
      return {
        places: [],
        sources: [],
        missingFields: [createMissingFieldNotice({ fieldName: "query", reason: "not_returned", message: "搜索关键词不能为空。" })],
      };
    }

    const cachedPlaces = await repository.findPlacesByQuery(trimmed, searchOptions);
    if (cachedPlaces.length) {
      const places = cachedPlaces.map((place) => mapPlaceRecordToNormalized(place));
      return { places, sources: places.map((place) => place.source), missingFields: [] };
    }

    const providers = registry.supporting("searchPlaces");
    const missingFields: MissingFieldNotice[] = [];
    for (const provider of providers) {
      const result = await provider.searchPlaces({ query: trimmed, ...searchOptions });
      if (result.ok && result.data.length) {
        await repository.upsertPlacesFromNormalized(result.data);
        return { places: result.data, sources: result.sources, missingFields: result.missingFields };
      }
      if (!result.ok) missingFields.push(...result.missingFields);
    }

    return {
      places: [],
      sources: [],
      missingFields: missingFields.length
        ? missingFields
        : [createMissingFieldNotice({ fieldName: "places", reason: "not_returned", message: "没有可用 provider 返回地点。" })],
    };
  }

  async function getOrEnrichPlaceDetails(placeId: string): Promise<DataHubPlaceDetailResponse> {
    const bundle = await repository.getPlaceBundle(placeId);
    if (!bundle) {
      return {
        detail: null,
        sources: [],
        missingFields: [createMissingFieldNotice({ fieldName: "place", reason: "not_returned", severity: "blocking", message: "数据底座中没有找到这个地点。" })],
      };
    }

    if (bundle.detail?.last_verified_at) {
      const detail = detailFromRecords(bundle);
      return { detail, sources: detail.sources, missingFields: detail.missingFields };
    }

    return enrichPlaceFromProviders(bundle.place);
  }

  async function enrichPlaceFromProviders(place: PlaceRecord): Promise<DataHubPlaceDetailResponse> {
    const missingFields: MissingFieldNotice[] = [];
    for (const provider of registry.supporting("getPlaceDetails")) {
      const result = await provider.getPlaceDetails({
        placeId: place.id,
        externalId: place.source_external_id ?? undefined,
        provider: place.source_provider ?? undefined,
        name: place.name,
        lat: place.lat,
        lng: place.lng,
        address: place.address,
      });
      if (result.ok) {
        const detail = {
          ...result.data,
          place: {
            ...result.data.place,
            id: place.id,
            destinationId: place.destination_id,
            regionId: place.region_id,
          },
        } satisfies NormalizedPlaceDetail;
        await repository.upsertPlaceDetail(detail);
        await repository.upsertPlaceFactsFromDetail(detail);
        await repository.insertPlaceSources(place.id, result.sources);
        return { detail, sources: result.sources, missingFields: result.missingFields };
      }
      missingFields.push(...result.missingFields);
    }

    const normalizedPlace = mapPlaceRecordToNormalized(place, { missingFields });
    return {
      detail: {
        place: normalizedPlace,
        imageUrls: [],
        sources: [normalizedPlace.source],
        confidence: normalizedPlace.confidence,
        lastVerifiedAt: normalizedPlace.lastVerifiedAt,
        missingFields,
      },
      sources: [normalizedPlace.source],
      missingFields: missingFields.length
        ? missingFields
        : [createMissingFieldNotice({ fieldName: "placeDetails", reason: "provider_failed", message: "没有 provider 能补全地点详情。" })],
    };
  }

  async function enrichPlace(input: DataHubEnrichPlaceInput): Promise<DataHubPlaceDetailResponse> {
    if (input.placeId?.trim()) {
      return getOrEnrichPlaceDetails(input.placeId.trim());
    }

    const placeName = input.name?.trim();
    if (!placeName) {
      return {
        detail: null,
        sources: [],
        missingFields: [
          createMissingFieldNotice({
            fieldName: "name",
            reason: "not_returned",
            severity: "blocking",
            message: "地点补全需要地点名称。",
          }),
        ],
      };
    }

    const fallbackSource = buildSourceSummary({
      provider: input.sourceProvider ?? "wanderly_curated",
      fieldName: "place",
      externalId: input.sourceExternalId ?? null,
      confidence: input.sourceProvider ? 0.55 : 0.45,
      fetchedAt: new Date().toISOString(),
    });
    const fallbackPlace = {
      id: input.sourceExternalId
        ? `${input.sourceProvider ?? "seed"}:${input.sourceExternalId}`
        : `seed:${placeName}:${input.lat ?? "no-lat"},${input.lng ?? "no-lng"}`,
      name: placeName,
      lat: typeof input.lat === "number" ? input.lat : null,
      lng: typeof input.lng === "number" ? input.lng : null,
      address: input.address ?? null,
      category: input.category ?? null,
      tags: input.category ? [input.category] : [],
      destinationId: input.destinationId ?? null,
      regionId: input.regionId ?? null,
      status: "active" as const,
      source: fallbackSource,
      confidence: fallbackSource.confidence,
      lastVerifiedAt: fallbackSource.lastVerifiedAt ?? null,
      missingFields: [],
    };

    const orderedProviders = [
      ...(input.sourceProvider ? [registry.byId(input.sourceProvider)].filter((provider): provider is DataHubProviderAdapter => provider !== null) : []),
      ...registry.supporting("getPlaceDetails").filter((provider) => provider.id !== input.sourceProvider),
    ];
    const missingFields: MissingFieldNotice[] = [];

    for (const provider of orderedProviders) {
      const result = await provider.getPlaceDetails({
        externalId: input.sourceExternalId ?? undefined,
        provider: input.sourceProvider ?? undefined,
        name: placeName,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
        address: input.address ?? null,
      });
      if (!result.ok) {
        missingFields.push(...result.missingFields);
        continue;
      }

      const inserted = await repository.upsertPlacesFromNormalized([
        {
          ...result.data.place,
          destinationId: input.destinationId ?? result.data.place.destinationId,
          regionId: input.regionId ?? result.data.place.regionId,
        },
      ]);
      const savedPlace = inserted[0];
      const detail: NormalizedPlaceDetail = {
        ...result.data,
        place: {
          ...result.data.place,
          id: savedPlace?.id ?? result.data.place.id,
          destinationId: input.destinationId ?? savedPlace?.destination_id ?? result.data.place.destinationId,
          regionId: input.regionId ?? savedPlace?.region_id ?? result.data.place.regionId,
        },
      };
      await repository.upsertPlaceDetail(detail);
      await repository.upsertPlaceFactsFromDetail(detail);
      await repository.insertPlaceSources(detail.place.id, result.sources);
      return { detail, sources: result.sources, missingFields: result.missingFields };
    }

    const fallbackMissingFields = [
      ...missingFields,
      createMissingFieldNotice({
        fieldName: "intro",
        reason: "provider_failed",
        message: "地点简介暂缺，数据源暂不可用。",
      }),
      createMissingFieldNotice({
        fieldName: "openingHours",
        reason: "provider_failed",
        message: "开放时间暂缺，建议出行前确认。",
      }),
      createMissingFieldNotice({
        fieldName: "ticketInfo",
        reason: "provider_failed",
        message: "门票信息暂缺，价格可能随时间变化。",
      }),
    ];
    return {
      detail: {
        place: fallbackPlace,
        intro: null,
        imageUrls: [],
        sources: [fallbackSource],
        confidence: fallbackSource.confidence,
        lastVerifiedAt: fallbackSource.lastVerifiedAt ?? null,
        missingFields: fallbackMissingFields,
      },
      sources: [fallbackSource],
      missingFields: fallbackMissingFields,
    };
  }

  async function getRouteEstimate(originPlaceId: string, destinationPlaceId: string, mode: RouteMode): Promise<DataHubRouteResponse> {
    const cached = await repository.getRouteCache(originPlaceId, destinationPlaceId, mode);
    if (cached) {
      const source = buildSourceSummary({ provider: cached.provider ?? "supabase", fieldName: "route", confidence: null, fetchedAt: cached.fetched_at, expiresAt: cached.expires_at });
      const route: NormalizedRouteEstimate = {
        originPlaceId,
        destinationPlaceId,
        mode: cached.mode,
        distanceMeters: cached.distance_meters,
        durationSeconds: cached.duration_seconds,
        provider: cached.provider ?? "supabase",
        source,
        confidence: source.confidence,
        lastVerifiedAt: cached.fetched_at,
        expiresAt: cached.expires_at,
        missingFields: [],
      };
      return { route, sources: [source], missingFields: [] };
    }

    const [origin, destination] = await Promise.all([repository.getPlace(originPlaceId), repository.getPlace(destinationPlaceId)]);
    const missingFields: MissingFieldNotice[] = [];
    const originHasCoordinates = typeof origin?.lat === "number" && typeof origin.lng === "number";
    const destinationHasCoordinates = typeof destination?.lat === "number" && typeof destination.lng === "number";
    if (!originHasCoordinates) missingFields.push(createMissingFieldNotice({ fieldName: "origin.coordinates", reason: "unresolved_place", severity: "blocking", message: "起点缺少坐标。" }));
    if (!destinationHasCoordinates) missingFields.push(createMissingFieldNotice({ fieldName: "destination.coordinates", reason: "unresolved_place", severity: "blocking", message: "终点缺少坐标。" }));
    if (!origin || !destination || missingFields.length) {
      return { route: null, sources: [], missingFields };
    }

    const originCoordinates = { lat: origin.lat as number, lng: origin.lng as number };
    const destinationCoordinates = { lat: destination.lat as number, lng: destination.lng as number };
    for (const provider of registry.supporting("getRouteEstimate")) {
      const result = await provider.getRouteEstimate({
        originPlaceId,
        destinationPlaceId,
        origin: originCoordinates,
        destination: destinationCoordinates,
        mode,
      });
      if (result.ok) {
        await repository.upsertRouteCache(result.data);
        return { route: result.data, sources: result.sources, missingFields: result.missingFields };
      }
      missingFields.push(...result.missingFields);
    }

    return { route: null, sources: [], missingFields };
  }

  return {
    searchPlaces,
    getOrEnrichPlaceDetails,
    enrichPlace,
    enrichPlaceFromProviders,
    getRouteEstimate,
  };
}
