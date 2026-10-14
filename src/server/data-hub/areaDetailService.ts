import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

import type {
  AdminAreaDetailRecord,
  AdminAreaRecord,
  AreaDetailSourceSummary,
  AreaMissingFieldNotice,
  DestinationDetailRecord,
  DestinationRecord,
  JsonObject,
  NormalizedAdminAreaDetail,
  NormalizedDestinationDetail,
  NormalizedTravelRegionDetail,
  PlaceRecord,
  RepresentativePlaceSummary,
  TravelRegionDetailRecord,
  TravelRegionRecord,
} from "./types";
import { buildSourceSummary, createMissingFieldNotice } from "./providers/providerTypes";

export interface AreaDetailResponse<T> {
  detail: T;
  missingFields: AreaMissingFieldNotice[];
  sources: AreaDetailSourceSummary[];
}

export interface DestinationDetailEnrichInput {
  destinationId?: string;
  name: string;
  intro?: string | null;
  travelSummary?: string | null;
  bestSeason?: string | null;
  primaryThemes?: string[];
  sourceProvider?: string | null;
  sourceExternalId?: string | null;
}

export interface AdminAreaDetailEnrichInput {
  adminAreaId?: string;
  name: string;
  intro?: string | null;
  travelSummary?: string | null;
  transportSummary?: string | null;
  suitableFor?: string[];
  sourceProvider?: string | null;
  sourceExternalId?: string | null;
}

export interface TravelRegionDetailEnrichInput {
  travelRegionId?: string;
  name: string;
  intro?: string | null;
  playStyle?: string | null;
  suggestedRoute?: string | null;
  suitableFor?: string[];
  crowdLevel?: string | null;
  representativePlaceIds?: string[];
  sourceProvider?: string | null;
  sourceExternalId?: string | null;
}

export type AreaDetailEnrichInput =
  | ({ targetType: "destination" } & DestinationDetailEnrichInput)
  | ({ targetType: "admin_area" } & AdminAreaDetailEnrichInput)
  | ({ targetType: "travel_region" } & TravelRegionDetailEnrichInput);

interface SupabaseQueryBuilder<T> {
  select(columns?: string): SupabaseQueryBuilder<T>;
  eq(column: string, value: unknown): SupabaseQueryBuilder<T>;
  maybeSingle(): Promise<{ data: T | null; error: unknown }>;
}

interface SupabaseClientLike {
  from<T = unknown>(table: string): SupabaseQueryBuilder<T>;
}

export interface AreaDetailRepository {
  getDestination(id: string): Promise<DestinationRecord | null>;
  getAdminArea(id: string): Promise<AdminAreaRecord | null>;
  getTravelRegion(id: string): Promise<TravelRegionRecord | null>;
  getDestinationDetail(destinationId: string): Promise<DestinationDetailRecord | null>;
  getAdminAreaDetail(adminAreaId: string): Promise<AdminAreaDetailRecord | null>;
  getTravelRegionDetail(travelRegionId: string): Promise<TravelRegionDetailRecord | null>;
  getRepresentativePlaces(placeIds: string[]): Promise<RepresentativePlaceSummary[]>;
}

export class SupabaseAreaDetailRepository implements AreaDetailRepository {
  constructor(private readonly client: SupabaseClientLike = createSupabaseServiceRoleClient() as unknown as SupabaseClientLike) {}

  async getDestination(id: string): Promise<DestinationRecord | null> {
    const result = await this.client.from<DestinationRecord>("destinations").select("*").eq("id", id).maybeSingle();
    return result.error ? null : result.data;
  }

  async getAdminArea(id: string): Promise<AdminAreaRecord | null> {
    const result = await this.client.from<AdminAreaRecord>("admin_areas").select("*").eq("id", id).maybeSingle();
    return result.error ? null : result.data;
  }

  async getTravelRegion(id: string): Promise<TravelRegionRecord | null> {
    const result = await this.client.from<TravelRegionRecord>("travel_regions").select("*").eq("id", id).maybeSingle();
    return result.error ? null : result.data;
  }

  async getDestinationDetail(destinationId: string): Promise<DestinationDetailRecord | null> {
    const result = await this.client.from<DestinationDetailRecord>("destination_details").select("*").eq("destination_id", destinationId).maybeSingle();
    return result.error ? null : result.data;
  }

  async getAdminAreaDetail(adminAreaId: string): Promise<AdminAreaDetailRecord | null> {
    const result = await this.client.from<AdminAreaDetailRecord>("admin_area_details").select("*").eq("admin_area_id", adminAreaId).maybeSingle();
    return result.error ? null : result.data;
  }

  async getTravelRegionDetail(travelRegionId: string): Promise<TravelRegionDetailRecord | null> {
    const result = await this.client.from<TravelRegionDetailRecord>("travel_region_details").select("*").eq("travel_region_id", travelRegionId).maybeSingle();
    return result.error ? null : result.data;
  }

  async getRepresentativePlaces(placeIds: string[]): Promise<RepresentativePlaceSummary[]> {
    return placeIds.map((id) => ({ id, name: id }));
  }
}

export interface AreaDetailServiceOptions {
  repository?: AreaDetailRepository;
  now?: () => Date;
}

function sourceFromSummaryJson(sourceSummary: JsonObject | null | undefined, fallbackProvider = "supabase") {
  const rawSources = sourceSummary?.sources;
  if (Array.isArray(rawSources)) {
    return rawSources
      .filter((source): source is JsonObject => typeof source === "object" && source !== null && !Array.isArray(source))
      .map((source) => buildSourceSummary({
        provider: typeof source.provider === "string" ? source.provider : fallbackProvider,
        fieldName: typeof source.fieldName === "string" ? source.fieldName : undefined,
        sourceUrl: typeof source.sourceUrl === "string" ? source.sourceUrl : null,
        externalId: typeof source.externalId === "string" ? source.externalId : null,
        confidence: typeof source.confidence === "number" ? source.confidence : null,
        fetchedAt: typeof source.fetchedAt === "string" ? source.fetchedAt : null,
        expiresAt: typeof source.expiresAt === "string" ? source.expiresAt : null,
        lastVerifiedAt: typeof source.lastVerifiedAt === "string" ? source.lastVerifiedAt : null,
      }));
  }

  return [buildSourceSummary({ provider: fallbackProvider, fieldName: "area_detail", confidence: null, fetchedAt: null })];
}

function missingFromNames(fieldNames: string[], provider = "supabase") {
  return fieldNames.map((fieldName) => createMissingFieldNotice({
    fieldName,
    reason: "not_returned",
    message: `${fieldName} 资料暂缺 / 待核验。`,
    provider,
  }));
}

function addMissingWhenEmpty(missingFields: AreaMissingFieldNotice[], fieldName: string, value: unknown) {
  const isEmpty =
    value === null ||
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && value.length === 0);

  if (isEmpty && !missingFields.some((field) => field.fieldName === fieldName)) {
    missingFields.push(createMissingFieldNotice({
      fieldName,
      reason: "not_returned",
      message: `${fieldName} 资料暂缺 / 待核验。`,
      provider: "supabase",
    }));
  }
}

function makeCuratedSource(now: () => Date, externalId?: string | null) {
  return buildSourceSummary({
    provider: "wanderly_curated",
    fieldName: "area_detail",
    externalId: externalId ?? null,
    confidence: 0.55,
    fetchedAt: now().toISOString(),
  });
}

export function createAreaDetailService(options: AreaDetailServiceOptions = {}) {
  const repository = options.repository ?? new SupabaseAreaDetailRepository();
  const now = options.now ?? (() => new Date());

  async function getDestinationDetail(destinationId: string): Promise<AreaDetailResponse<NormalizedDestinationDetail>> {
    const [destination, detail] = await Promise.all([
      repository.getDestination(destinationId),
      repository.getDestinationDetail(destinationId),
    ]);
    const sources = sourceFromSummaryJson(detail?.source_summary, "supabase");
    const missingFields = missingFromNames(detail?.missing_fields ?? []);

    const normalized: NormalizedDestinationDetail = {
      id: detail?.id ?? `destination-detail:${destinationId}`,
      destinationId,
      name: destination?.name,
      intro: detail?.intro ?? null,
      travelSummary: detail?.travel_summary ?? null,
      bestSeason: detail?.best_season ?? null,
      suggestedDaysMin: detail?.suggested_days_min ?? null,
      suggestedDaysMax: detail?.suggested_days_max ?? null,
      primaryThemes: detail?.primary_themes ?? [],
      representativePlaces: await repository.getRepresentativePlaces(detail?.representative_place_ids ?? []),
      transportSummary: detail?.transport_summary ?? null,
      weatherSummary: detail?.weather_summary ?? null,
      sourceSummary: sources,
      missingFields,
      lastVerifiedAt: detail?.last_verified_at ?? sources[0]?.lastVerifiedAt ?? null,
    };

    addMissingWhenEmpty(missingFields, "intro", normalized.intro);
    addMissingWhenEmpty(missingFields, "travelSummary", normalized.travelSummary);
    addMissingWhenEmpty(missingFields, "bestSeason", normalized.bestSeason);
    return { detail: normalized, missingFields, sources };
  }

  async function getAdminAreaDetail(adminAreaId: string): Promise<AreaDetailResponse<NormalizedAdminAreaDetail>> {
    const [adminArea, detail] = await Promise.all([
      repository.getAdminArea(adminAreaId),
      repository.getAdminAreaDetail(adminAreaId),
    ]);
    const sources = sourceFromSummaryJson(detail?.source_summary, "supabase");
    const missingFields = missingFromNames(detail?.missing_fields ?? []);

    const normalized: NormalizedAdminAreaDetail = {
      id: detail?.id ?? `admin-area-detail:${adminAreaId}`,
      adminAreaId,
      name: adminArea?.name,
      intro: detail?.intro ?? null,
      travelSummary: detail?.travel_summary ?? null,
      representativePlaces: await repository.getRepresentativePlaces(detail?.representative_place_ids ?? []),
      transportSummary: detail?.transport_summary ?? null,
      suitableFor: detail?.suitable_for ?? [],
      sourceSummary: sources,
      missingFields,
      lastVerifiedAt: detail?.last_verified_at ?? sources[0]?.lastVerifiedAt ?? null,
    };

    addMissingWhenEmpty(missingFields, "intro", normalized.intro);
    addMissingWhenEmpty(missingFields, "travelSummary", normalized.travelSummary);
    addMissingWhenEmpty(missingFields, "representativePlaces", normalized.representativePlaces);
    return { detail: normalized, missingFields, sources };
  }

  async function getTravelRegionDetail(travelRegionId: string): Promise<AreaDetailResponse<NormalizedTravelRegionDetail>> {
    const [travelRegion, detail] = await Promise.all([
      repository.getTravelRegion(travelRegionId),
      repository.getTravelRegionDetail(travelRegionId),
    ]);
    const sources = sourceFromSummaryJson(detail?.source_summary, travelRegion?.source_type ?? "supabase");
    const missingFields = missingFromNames(detail?.missing_fields ?? []);

    const normalized: NormalizedTravelRegionDetail = {
      id: detail?.id ?? `travel-region-detail:${travelRegionId}`,
      travelRegionId,
      name: travelRegion?.name,
      intro: detail?.intro ?? travelRegion?.description ?? null,
      playStyle: detail?.play_style ?? null,
      suggestedRoute: detail?.suggested_route ?? null,
      representativePlaces: await repository.getRepresentativePlaces(detail?.representative_place_ids ?? []),
      suitableFor: detail?.suitable_for ?? travelRegion?.tags ?? [],
      crowdLevel: detail?.crowd_level ?? null,
      sourceSummary: sources,
      missingFields,
      lastVerifiedAt: detail?.last_verified_at ?? sources[0]?.lastVerifiedAt ?? null,
    };

    addMissingWhenEmpty(missingFields, "intro", normalized.intro);
    addMissingWhenEmpty(missingFields, "playStyle", normalized.playStyle);
    addMissingWhenEmpty(missingFields, "suggestedRoute", normalized.suggestedRoute);
    return { detail: normalized, missingFields, sources };
  }

  async function enrichDestinationDetail(input: DestinationDetailEnrichInput): Promise<AreaDetailResponse<NormalizedDestinationDetail>> {
    const source = makeCuratedSource(now, input.sourceExternalId ?? input.destinationId);
    const missingFields = missingFromNames([]);
    const detail: NormalizedDestinationDetail = {
      id: `destination-detail:${input.destinationId ?? input.name}`,
      destinationId: input.destinationId ?? input.name,
      name: input.name,
      intro: input.intro ?? null,
      travelSummary: input.travelSummary ?? null,
      bestSeason: input.bestSeason ?? null,
      suggestedDaysMin: null,
      suggestedDaysMax: null,
      primaryThemes: input.primaryThemes ?? [],
      representativePlaces: [],
      transportSummary: null,
      weatherSummary: null,
      sourceSummary: [source],
      missingFields,
      lastVerifiedAt: source.lastVerifiedAt ?? null,
    };
    addMissingWhenEmpty(missingFields, "intro", detail.intro);
    addMissingWhenEmpty(missingFields, "travelSummary", detail.travelSummary);
    return { detail, missingFields, sources: [source] };
  }

  async function enrichAdminAreaDetail(input: AdminAreaDetailEnrichInput): Promise<AreaDetailResponse<NormalizedAdminAreaDetail>> {
    const source = makeCuratedSource(now, input.sourceExternalId ?? input.adminAreaId);
    const missingFields = missingFromNames([]);
    const detail: NormalizedAdminAreaDetail = {
      id: `admin-area-detail:${input.adminAreaId ?? input.name}`,
      adminAreaId: input.adminAreaId ?? input.name,
      name: input.name,
      intro: input.intro ?? null,
      travelSummary: input.travelSummary ?? null,
      representativePlaces: [],
      transportSummary: input.transportSummary ?? null,
      suitableFor: input.suitableFor ?? [],
      sourceSummary: [source],
      missingFields,
      lastVerifiedAt: source.lastVerifiedAt ?? null,
    };
    addMissingWhenEmpty(missingFields, "intro", detail.intro);
    addMissingWhenEmpty(missingFields, "travelSummary", detail.travelSummary);
    return { detail, missingFields, sources: [source] };
  }

  async function enrichTravelRegionDetail(input: TravelRegionDetailEnrichInput): Promise<AreaDetailResponse<NormalizedTravelRegionDetail>> {
    const source = makeCuratedSource(now, input.sourceExternalId ?? input.travelRegionId);
    const missingFields = missingFromNames([]);
    const detail: NormalizedTravelRegionDetail = {
      id: `travel-region-detail:${input.travelRegionId ?? input.name}`,
      travelRegionId: input.travelRegionId ?? input.name,
      name: input.name,
      intro: input.intro ?? null,
      playStyle: input.playStyle ?? null,
      suggestedRoute: input.suggestedRoute ?? null,
      representativePlaces: (input.representativePlaceIds ?? []).map((id) => ({ id, name: id })),
      suitableFor: input.suitableFor ?? [],
      crowdLevel: input.crowdLevel ?? null,
      sourceSummary: [source],
      missingFields,
      lastVerifiedAt: source.lastVerifiedAt ?? null,
    };
    addMissingWhenEmpty(missingFields, "intro", detail.intro);
    addMissingWhenEmpty(missingFields, "playStyle", detail.playStyle);
    addMissingWhenEmpty(missingFields, "suggestedRoute", detail.suggestedRoute);
    return { detail, missingFields, sources: [source] };
  }

  async function enrichAreaDetail(input: AreaDetailEnrichInput) {
    if (input.targetType === "destination") return enrichDestinationDetail(input);
    if (input.targetType === "admin_area") return enrichAdminAreaDetail(input);
    return enrichTravelRegionDetail(input);
  }

  return {
    getDestinationDetail,
    getAdminAreaDetail,
    getTravelRegionDetail,
    enrichDestinationDetail,
    enrichAdminAreaDetail,
    enrichTravelRegionDetail,
    enrichAreaDetail,
  };
}
