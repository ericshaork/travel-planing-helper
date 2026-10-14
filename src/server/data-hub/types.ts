export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export type DataHubProvider =
  | "amap"
  | "baidu"
  | "google_places"
  | "osm"
  | "nominatim"
  | "overpass"
  | "geonames"
  | "wikidata"
  | "wikimedia"
  | "wikipedia"
  | "qweather"
  | "hko"
  | "smg"
  | "lcsd"
  | "mgto"
  | "supabase"
  | "wanderly_curated"
  | "ai_assisted"
  | "unknown";

export type DestinationLevel = "global" | "country" | "province" | "state" | "city" | "district" | "region" | "custom";
export type AdminAreaLevel = "country" | "province" | "state" | "city" | "district" | "county" | "town" | "custom";
export type TravelRegionSourceType = "curated" | "imported" | "provider" | "user" | "ai_assisted";
export type PlaceStatus = "active" | "inactive" | "unresolved" | "duplicate" | "archived";
export type RouteMode = "walking" | "driving" | "transit" | "cycling" | "taxi" | "mixed";
export type MissingFieldSeverity = "info" | "warning" | "blocking";
export type ProviderIngestRunType = "manual" | "scheduled" | "enrich" | "backfill" | "health_check";
export type ProviderIngestTargetType = "destination" | "admin_area" | "travel_region" | "place" | "route" | "weather" | "event" | "traffic";
export type ProviderIngestStatus = "pending" | "running" | "success" | "partial" | "failed" | "skipped";
export type ProviderRecordType = "destination" | "admin_area" | "travel_region" | "place" | "place_detail" | "image" | "route" | "weather" | "event" | "traffic" | "hotel";
export type ProviderRecordNormalizedStatus = "pending" | "normalized" | "duplicate" | "rejected" | "failed";
export type PlaceExternalIdMatchMethod = "exact_provider" | "name_address" | "name_coordinate" | "wikidata_qid" | "manual" | "imported";
export type VerificationStatus = "unverified" | "verified" | "stale" | "conflicted" | "rejected";
export type PlaceExternalIdVerifiedStatus = "unverified" | "verified" | "conflicted" | "rejected";
export type PlaceFactType =
  | "intro"
  | "opening_hours"
  | "ticket_info"
  | "recommended_duration"
  | "best_time_to_visit"
  | "crowd_level"
  | "accessibility"
  | "phone"
  | "website"
  | "image"
  | "booking_url"
  | "official_notice"
  | "tags"
  | "suitability"
  | "address"
  | "coordinate"
  | "category";
export type EventType = "exhibition" | "performance" | "concert" | "festival" | "sports" | "lecture" | "workshop" | "market" | "other";
export type WeatherSnapshotType = "current" | "forecast" | "warning" | "air_quality" | "uv";
export type TrafficSnapshotType = "road" | "transit" | "walking" | "driving" | "parking" | "disruption";
export type TrafficStatus = "smooth" | "moderate" | "congested" | "severe" | "disrupted" | "unknown";

export interface DestinationRecord {
  id: string;
  name: string;
  name_en: string | null;
  country_code: string | null;
  level: DestinationLevel;
  parent_id: string | null;
  center_lat: number | null;
  center_lng: number | null;
  bounds: JsonValue | null;
  available: boolean;
  metadata: JsonObject;
  created_at: string;
  updated_at: string;
}

export interface AdminAreaRecord {
  id: string;
  destination_id: string | null;
  name: string;
  adcode: string | null;
  level: AdminAreaLevel;
  parent_adcode: string | null;
  polygon: JsonValue | null;
  center_lat: number | null;
  center_lng: number | null;
  source_provider: string | null;
  source_external_id: string | null;
  source_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TravelRegionRecord {
  id: string;
  destination_id: string | null;
  name: string;
  description: string | null;
  polygon: JsonValue | null;
  center_lat: number | null;
  center_lng: number | null;
  tags: string[];
  suggested_duration_minutes: number | null;
  priority: number;
  source_type: TravelRegionSourceType;
  created_at: string;
  updated_at: string;
}

export interface PlaceRecord {
  id: string;
  destination_id: string | null;
  region_id: string | null;
  name: string;
  name_en: string | null;
  lat: number | null;
  lng: number | null;
  address: string | null;
  category: string | null;
  tags: string[];
  source_provider: string | null;
  source_external_id: string | null;
  status: PlaceStatus;
  created_at: string;
  updated_at: string;
}

export interface PlaceDetailRecord {
  id: string;
  place_id: string;
  intro: string | null;
  opening_hours: JsonValue | null;
  ticket_info: JsonValue | null;
  phone: string | null;
  website: string | null;
  recommended_duration_minutes: number | null;
  crowd_level: string | null;
  best_time_to_visit: string | null;
  tips: string | null;
  image_urls: JsonValue[];
  source_summary: JsonObject;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlaceSourceRecord {
  id: string;
  place_id: string;
  field_name: string;
  provider: string;
  source_url: string | null;
  raw_external_id: string | null;
  confidence: number | null;
  fetched_at: string;
  expires_at: string | null;
  raw_snapshot: JsonValue | null;
}

export interface RouteCacheRecord {
  id: string;
  origin_place_id: string | null;
  destination_place_id: string | null;
  mode: RouteMode;
  distance_meters: number | null;
  duration_seconds: number | null;
  provider: string | null;
  raw_json: JsonValue | null;
  fetched_at: string;
  expires_at: string | null;
}

export interface AiPlanEvidenceRecord {
  id: string;
  trip_id: string | null;
  place_id: string | null;
  source_type: string | null;
  source_id: string | null;
  reason: string | null;
  created_at: string;
}

export interface ProviderIngestRunRecord {
  id: string;
  provider: string;
  run_type: ProviderIngestRunType;
  target_type: ProviderIngestTargetType | null;
  target_id: string | null;
  status: ProviderIngestStatus;
  started_at: string | null;
  finished_at: string | null;
  records_seen: number;
  records_inserted: number;
  records_updated: number;
  records_skipped: number;
  error_code: string | null;
  error_message: string | null;
  metadata: JsonObject;
  created_at: string;
}

export interface ProviderRecordStagingRecord {
  id: string;
  provider: string;
  external_id: string | null;
  record_type: ProviderRecordType;
  source_url: string | null;
  source_name: string | null;
  raw_hash: string;
  raw_snapshot: JsonValue;
  normalized_status: ProviderRecordNormalizedStatus;
  confidence: number | null;
  fetched_at: string;
  expires_at: string | null;
  ingest_run_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlaceExternalIdRecord {
  id: string;
  place_id: string;
  provider: string;
  external_id: string;
  external_url: string | null;
  provider_place_type: string | null;
  match_method: PlaceExternalIdMatchMethod;
  confidence: number;
  verified_status: PlaceExternalIdVerifiedStatus;
  last_verified_at: string | null;
  metadata: JsonObject;
  created_at: string;
  updated_at: string;
}

export interface PlaceFactRecord {
  id: string;
  place_id: string;
  fact_type: PlaceFactType;
  value_json: JsonValue;
  value_text: string | null;
  language: string | null;
  source_provider: string;
  source_external_id: string | null;
  source_url: string | null;
  source_name: string | null;
  confidence: number;
  verification_status: VerificationStatus;
  fetched_at: string;
  last_verified_at: string | null;
  expires_at: string | null;
  metadata: JsonObject;
  created_at: string;
  updated_at: string;
}

export interface EventRecord {
  id: string;
  provider: string;
  external_id: string | null;
  title: string;
  description: string | null;
  event_type: EventType | null;
  destination_id: string | null;
  admin_area_id: string | null;
  place_id: string | null;
  venue_name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  starts_at: string | null;
  ends_at: string | null;
  timezone: string | null;
  ticket_url: string | null;
  official_url: string | null;
  image_url: string | null;
  price_text: string | null;
  source_url: string | null;
  source_name: string | null;
  confidence: number | null;
  fetched_at: string;
  expires_at: string | null;
  metadata: JsonObject;
  created_at: string;
  updated_at: string;
}

export interface WeatherSnapshotRecord {
  id: string;
  provider: string;
  destination_id: string | null;
  admin_area_id: string | null;
  place_id: string | null;
  latitude: number | null;
  longitude: number | null;
  snapshot_type: WeatherSnapshotType;
  observed_at: string | null;
  forecast_start_at: string | null;
  forecast_end_at: string | null;
  temperature_c: number | null;
  feels_like_c: number | null;
  condition_text: string | null;
  precipitation_probability: number | null;
  wind_text: string | null;
  humidity: number | null;
  aqi: number | null;
  uv_index: number | null;
  warning_level: string | null;
  warning_title: string | null;
  value_json: JsonObject;
  source_url: string | null;
  source_name: string | null;
  confidence: number | null;
  fetched_at: string;
  expires_at: string | null;
  metadata: JsonObject;
  created_at: string;
}

export interface TrafficSnapshotRecord {
  id: string;
  provider: string;
  destination_id: string | null;
  admin_area_id: string | null;
  place_id: string | null;
  route_cache_id: string | null;
  latitude: number | null;
  longitude: number | null;
  traffic_type: TrafficSnapshotType;
  status: TrafficStatus | null;
  summary: string | null;
  delay_minutes: number | null;
  value_json: JsonObject;
  source_url: string | null;
  source_name: string | null;
  confidence: number | null;
  observed_at: string | null;
  fetched_at: string;
  expires_at: string | null;
  metadata: JsonObject;
  created_at: string;
}

export interface DataSourceSummary {
  provider: DataHubProvider | string;
  fieldName?: string;
  sourceUrl?: string | null;
  externalId?: string | null;
  confidence: number | null;
  fetchedAt?: string | null;
  expiresAt?: string | null;
  lastVerifiedAt?: string | null;
  notes?: string;
}

export interface MissingFieldNotice {
  fieldName: string;
  reason: "not_configured" | "provider_failed" | "not_returned" | "not_verified" | "not_applicable" | "unresolved_place";
  severity: MissingFieldSeverity;
  message: string;
  provider?: DataHubProvider | string;
  checkedAt?: string;
}

export interface NormalizedOpeningHours {
  timezone?: string;
  weeklyText?: string[];
  periods?: Array<{
    day: number;
    openTime: string;
    closeTime: string;
  }>;
  todayOpenStatus?: "open" | "closed" | "unknown" | "temporarily_closed";
  source?: DataSourceSummary;
  confidence: number | null;
  lastVerifiedAt: string | null;
  missingFields: MissingFieldNotice[];
}

export interface NormalizedTicketInfo {
  status: "free" | "paid" | "reservation_required" | "unknown" | "not_applicable";
  priceText?: string | null;
  bookingUrl?: string | null;
  source?: DataSourceSummary;
  confidence: number | null;
  lastVerifiedAt: string | null;
  missingFields: MissingFieldNotice[];
}

export interface NormalizedPlace {
  id: string;
  name: string;
  nameEn?: string | null;
  lat: number | null;
  lng: number | null;
  address?: string | null;
  category?: string | null;
  tags: string[];
  destinationId?: string | null;
  regionId?: string | null;
  status: PlaceStatus;
  source: DataSourceSummary;
  confidence: number | null;
  lastVerifiedAt: string | null;
  missingFields: MissingFieldNotice[];
}

export interface NormalizedPlaceDetail {
  place: NormalizedPlace;
  intro?: string | null;
  openingHours?: NormalizedOpeningHours | null;
  ticketInfo?: NormalizedTicketInfo | null;
  phone?: string | null;
  website?: string | null;
  recommendedDurationMinutes?: number | null;
  crowdLevel?: string | null;
  bestTimeToVisit?: string | null;
  tips?: string | null;
  imageUrls: Array<{
    url: string;
    source?: DataSourceSummary;
    alt?: string;
    license?: string;
  }>;
  sources: DataSourceSummary[];
  confidence: number | null;
  lastVerifiedAt: string | null;
  missingFields: MissingFieldNotice[];
}

export interface NormalizedRouteEstimate {
  originPlaceId: string;
  destinationPlaceId: string;
  mode: RouteMode;
  distanceMeters: number | null;
  durationSeconds: number | null;
  polyline?: string | null;
  provider: DataHubProvider | string;
  source: DataSourceSummary;
  confidence: number | null;
  lastVerifiedAt: string | null;
  expiresAt?: string | null;
  missingFields: MissingFieldNotice[];
}

export interface ProviderIngestSummary {
  id: string;
  provider: string;
  runType: ProviderIngestRunType;
  targetType: ProviderIngestTargetType | null;
  targetId: string | null;
  status: ProviderIngestStatus;
  startedAt: string | null;
  finishedAt: string | null;
  recordsSeen: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsSkipped: number;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface NormalizedPlaceExternalId {
  id: string;
  placeId: string;
  provider: string;
  externalId: string;
  externalUrl: string | null;
  providerPlaceType: string | null;
  matchMethod: PlaceExternalIdMatchMethod;
  confidence: number;
  verifiedStatus: PlaceExternalIdVerifiedStatus;
  lastVerifiedAt: string | null;
  metadata: JsonObject;
}

export interface NormalizedPlaceFact {
  id: string;
  placeId: string;
  factType: PlaceFactType;
  value: JsonValue;
  text: string | null;
  language: string | null;
  source: DataSourceSummary;
  confidence: number;
  verificationStatus: VerificationStatus;
  fetchedAt: string;
  lastVerifiedAt: string | null;
  expiresAt: string | null;
  missingFields: MissingFieldNotice[];
  metadata: JsonObject;
}

export interface NormalizedEvent {
  id: string;
  provider: string;
  externalId: string | null;
  title: string;
  description: string | null;
  eventType: EventType | null;
  destinationId: string | null;
  adminAreaId: string | null;
  placeId: string | null;
  place?: RepresentativePlaceSummary | null;
  venueName: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  startsAt: string | null;
  endsAt: string | null;
  timezone: string | null;
  ticketUrl: string | null;
  officialUrl: string | null;
  imageUrl: string | null;
  priceText: string | null;
  source: DataSourceSummary;
  confidence: number | null;
  fetchedAt: string;
  expiresAt: string | null;
  missingFields: MissingFieldNotice[];
}

export interface NormalizedWeatherSnapshot {
  id: string;
  provider: string;
  destinationId: string | null;
  adminAreaId: string | null;
  placeId: string | null;
  lat: number | null;
  lng: number | null;
  snapshotType: WeatherSnapshotType;
  observedAt: string | null;
  forecastStartAt: string | null;
  forecastEndAt: string | null;
  temperatureC: number | null;
  feelsLikeC: number | null;
  conditionText: string | null;
  precipitationProbability: number | null;
  windText: string | null;
  humidity: number | null;
  airQuality?: {
    aqi: number | null;
  };
  uv?: {
    index: number | null;
  };
  warning?: {
    level: string | null;
    title: string | null;
  };
  value: JsonObject;
  source: DataSourceSummary;
  confidence: number | null;
  fetchedAt: string;
  expiresAt: string | null;
  missingFields: MissingFieldNotice[];
}

export interface NormalizedTrafficSnapshot {
  id: string;
  provider: string;
  destinationId: string | null;
  adminAreaId: string | null;
  placeId: string | null;
  routeCacheId: string | null;
  lat: number | null;
  lng: number | null;
  trafficType: TrafficSnapshotType;
  status: TrafficStatus | null;
  summary: string | null;
  delayMinutes: number | null;
  value: JsonObject;
  source: DataSourceSummary;
  confidence: number | null;
  observedAt: string | null;
  fetchedAt: string;
  expiresAt: string | null;
  missingFields: MissingFieldNotice[];
}

export type AreaDetailSourceSummary = DataSourceSummary;
export type AreaMissingFieldNotice = MissingFieldNotice;

export interface DestinationDetailRecord {
  id: string;
  destination_id: string;
  intro: string | null;
  travel_summary: string | null;
  best_season: string | null;
  suggested_days_min: number | null;
  suggested_days_max: number | null;
  primary_themes: string[];
  representative_place_ids: string[];
  transport_summary: string | null;
  weather_summary: string | null;
  source_summary: JsonObject;
  missing_fields: string[];
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminAreaDetailRecord {
  id: string;
  admin_area_id: string;
  intro: string | null;
  travel_summary: string | null;
  representative_place_ids: string[];
  transport_summary: string | null;
  suitable_for: string[];
  source_summary: JsonObject;
  missing_fields: string[];
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TravelRegionDetailRecord {
  id: string;
  travel_region_id: string;
  intro: string | null;
  play_style: string | null;
  suggested_route: string | null;
  representative_place_ids: string[];
  suitable_for: string[];
  crowd_level: string | null;
  source_summary: JsonObject;
  missing_fields: string[];
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RepresentativePlaceSummary {
  id: string;
  name: string;
  category?: string | null;
  lat?: number | null;
  lng?: number | null;
}

interface NormalizedAreaDetailBase {
  id: string;
  name?: string;
  sourceSummary: AreaDetailSourceSummary[];
  missingFields: AreaMissingFieldNotice[];
  lastVerifiedAt: string | null;
  representativePlaces: RepresentativePlaceSummary[];
}

export interface NormalizedDestinationDetail extends NormalizedAreaDetailBase {
  destinationId: string;
  intro: string | null;
  travelSummary: string | null;
  bestSeason: string | null;
  suggestedDaysMin: number | null;
  suggestedDaysMax: number | null;
  primaryThemes: string[];
  transportSummary: string | null;
  weatherSummary: string | null;
}

export interface NormalizedAdminAreaDetail extends NormalizedAreaDetailBase {
  adminAreaId: string;
  intro: string | null;
  travelSummary: string | null;
  transportSummary: string | null;
  suitableFor: string[];
}

export interface NormalizedTravelRegionDetail extends NormalizedAreaDetailBase {
  travelRegionId: string;
  intro: string | null;
  playStyle: string | null;
  suggestedRoute: string | null;
  suitableFor: string[];
  crowdLevel: string | null;
}
