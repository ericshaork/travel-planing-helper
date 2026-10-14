import "server-only";

import { createProductDataHubService, type ProductDataHubService, stripUnsafeProductData } from "./productDataHubService";
import type {
  DataSourceSummary,
  MissingFieldNotice,
  NormalizedPlace,
  NormalizedPlaceDetail,
  NormalizedRouteEstimate,
  NormalizedWeatherSnapshot,
} from "./types";

export interface EvidencePackPlaceInput {
  placeId?: string;
  provider?: string;
  externalId?: string;
  name?: string;
}

export interface BuildEvidencePackInput {
  destination?: string | null;
  city?: string | null;
  selectedPlaces?: EvidencePackPlaceInput[];
  candidatePlaces?: EvidencePackPlaceInput[];
  travelDates?: {
    startDate?: string | null;
    endDate?: string | null;
  } | null;
  userPreferences?: string[];
}

export interface PlaceEvidenceItem {
  place: NormalizedPlace;
  detail: NormalizedPlaceDetail;
  sources: DataSourceSummary[];
  missingFields: MissingFieldNotice[];
  confidence: number | null;
  freshness: {
    lastVerifiedAt: string | null;
    fetchedAt: Array<string | null | undefined>;
  };
}

export interface EvidencePack {
  destination: string | null;
  city: string | null;
  travelDates: BuildEvidencePackInput["travelDates"];
  userPreferences: string[];
  places: PlaceEvidenceItem[];
  weatherContext: NormalizedWeatherSnapshot[];
  routeEstimates: NormalizedRouteEstimate[];
  sourceList: DataSourceSummary[];
  missingFields: MissingFieldNotice[];
  freshness: {
    lastVerifiedAt: string | null;
    fetchedAt: Array<string | null | undefined>;
  };
  confidence: number | null;
}

function uniquePlaceInputs(input: EvidencePackPlaceInput[]): EvidencePackPlaceInput[] {
  const seen = new Set<string>();
  return input.filter((place) => {
    const key = place.placeId ?? `${place.provider ?? "unknown"}:${place.externalId ?? place.name ?? "unknown"}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

function averageConfidence(values: Array<number | null | undefined>): number | null {
  const numbers = values.filter((value): value is number => typeof value === "number");
  if (!numbers.length) return null;
  return Number((numbers.reduce((sum, value) => sum + value, 0) / numbers.length).toFixed(2));
}

function latestTimestamp(values: Array<string | null | undefined>): string | null {
  return values.filter((value): value is string => Boolean(value)).sort().at(-1) ?? null;
}

function missingPlace(input: EvidencePackPlaceInput): MissingFieldNotice {
  return {
    fieldName: "place",
    reason: "unresolved_place",
    severity: "warning",
    message: input.name
      ? `${input.name} 暂时没有匹配到 Data Hub normalized 地点。`
      : "候选地点暂时没有匹配到 Data Hub normalized 地点。",
    provider: input.provider,
  };
}

export class EvidencePackService {
  constructor(private readonly productService: ProductDataHubService = createProductDataHubService()) {}

  async buildEvidencePack(input: BuildEvidencePackInput): Promise<EvidencePack> {
    const placeInputs = uniquePlaceInputs([
      ...(input.selectedPlaces ?? []),
      ...(input.candidatePlaces ?? []),
    ]);
    const places: PlaceEvidenceItem[] = [];
    const missingFields: MissingFieldNotice[] = [];

    for (const placeInput of placeInputs) {
      const profile = placeInput.placeId
        ? await this.productService.getPlaceProfile(placeInput.placeId)
        : placeInput.provider && placeInput.externalId
          ? await this.productService.getPlaceProfileByExternalId(placeInput.provider, placeInput.externalId)
          : null;

      if (!profile) {
        missingFields.push(missingPlace(placeInput));
        continue;
      }

      places.push({
        place: profile.detail.place,
        detail: profile.detail,
        sources: profile.sourceSummary,
        missingFields: profile.missingFields,
        confidence: profile.detail.confidence,
        freshness: {
          lastVerifiedAt: profile.detail.lastVerifiedAt,
          fetchedAt: profile.sourceSummary.map((source) => source.fetchedAt),
        },
      });
      missingFields.push(...profile.missingFields);
    }

    const weatherContext = places[0]
      ? await this.productService.getWeatherContext({
          destinationId: places[0].place.destinationId,
          placeId: places[0].place.id,
          lat: places[0].place.lat,
          lng: places[0].place.lng,
          limit: 5,
        })
      : [];

    const routeEstimates: NormalizedRouteEstimate[] = [];
    for (let index = 0; index < places.length - 1; index += 1) {
      routeEstimates.push(...await this.productService.getRouteContext(places[index]!.place.id, places[index + 1]!.place.id));
    }

    const sourceList = uniqueSources([
      ...places.flatMap((place) => place.sources),
      ...weatherContext.map((weather) => weather.source),
      ...routeEstimates.map((route) => route.source),
    ]);
    const fetchedAt = sourceList.map((source) => source.fetchedAt);
    const pack: EvidencePack = {
      destination: input.destination ?? null,
      city: input.city ?? null,
      travelDates: input.travelDates ?? null,
      userPreferences: input.userPreferences ?? [],
      places,
      weatherContext,
      routeEstimates,
      sourceList,
      missingFields,
      freshness: {
        lastVerifiedAt: latestTimestamp(sourceList.map((source) => source.lastVerifiedAt ?? source.fetchedAt)),
        fetchedAt,
      },
      confidence: averageConfidence([
        ...places.map((place) => place.confidence),
        ...weatherContext.map((weather) => weather.confidence),
        ...routeEstimates.map((route) => route.confidence),
      ]),
    };
    return stripUnsafeProductData(pack) as EvidencePack;
  }
}

export function createEvidencePackService(productService?: ProductDataHubService) {
  return new EvidencePackService(productService);
}
