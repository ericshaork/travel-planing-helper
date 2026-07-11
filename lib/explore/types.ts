export type ExploreTripContentStatus =
  | "draft"
  | "reviewing"
  | "published"
  | "archived";

export type ExploreTripReviewStatus =
  | "pending"
  | "approved"
  | "rejected";
export type ExploreCreatorType = "ai_generated" | "editorial" | "community";

export type ExploreArchiveSourceType = "explore_archive";
export type InspirationFacetKey =
  | "location"
  | "food"
  | "season"
  | "companion";

export interface ExploreTripDailyActivity {
  timeBlock: string;
  description: string;
  poiRefs: string[];
  foodRefs: string[];
}

export interface ExploreTripDayContent {
  dayNumber: number;
  title: string;
  summary: string;
  activities: ExploreTripDailyActivity[];
}

export interface ExploreTripPoi {
  id: string;
  name: string;
  district?: string;
  type?: string;
  reason: string;
  recommendedDurationMinutes?: number;
}

export interface ExploreTripFood {
  id: string;
  name: string;
  district?: string;
  category?: string;
  reason: string;
}

export interface ExploreTripSourceMeta {
  pipeline: "travel-content-pipeline";
  batchId?: string;
  sourceContentKey?: string;
  sourceFilePath?: string;
}

export interface ExploreTripContent {
  id: string;
  externalId: string;
  slug: string;
  title: string;
  summary: string;
  city: string;
  cityCode: string;
  region?: string;
  tripType: string;
  days: number;
  tags: string[];
  theme?: string;
  pace?: string;
  budgetLevel?: string;
  budgetNote?: string;
  coverImageUrl?: string;
  imagePrompt?: string;
  archiveIntro?: string;
  featured?: boolean;
  featuredReason?: string;
  creatorType?: ExploreCreatorType;
  creatorId?: string;
  creator?: string;
  likes?: number;
  views?: number;
  savedCount?: number;
  terrainTags?: string[];
  cuisineTags?: string[];
  seasonTags?: string[];
  companionTags?: string[];
  highlights: string[];
  dailyItinerary: ExploreTripDayContent[];
  pois: ExploreTripPoi[];
  food: ExploreTripFood[];
  status: ExploreTripContentStatus;
  reviewStatus: ExploreTripReviewStatus;
  source: ExploreTripSourceMeta;
  rawContent: Record<string, unknown>;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExploreTripListItem {
  id: string;
  slug: string;
  title: string;
  summary: string;
  city: string;
  cityCode: string;
  region?: string;
  tripType: string;
  days: number;
  tags: string[];
  theme?: string;
  pace?: string;
  coverImageUrl?: string;
  archiveIntro?: string;
  featured?: boolean;
  featuredReason?: string;
  creatorType?: ExploreCreatorType;
  creatorId?: string;
  creator?: string;
  likes?: number;
  views?: number;
  savedCount?: number;
  terrainTags?: string[];
  cuisineTags?: string[];
  seasonTags?: string[];
  companionTags?: string[];
  highlights: string[];
}

export interface ExploreTripContentInsert {
  externalId: string;
  slug: string;
  title: string;
  summary: string;
  city: string;
  cityCode: string;
  region?: string;
  tripType: string;
  days: number;
  tags: string[];
  theme?: string;
  pace?: string;
  budgetLevel?: string;
  budgetNote?: string;
  coverImageUrl?: string;
  imagePrompt?: string;
  archiveIntro?: string;
  featured?: boolean;
  featuredReason?: string;
  creatorType?: ExploreCreatorType;
  creatorId?: string;
  creator?: string;
  likes?: number;
  views?: number;
  savedCount?: number;
  terrainTags?: string[];
  cuisineTags?: string[];
  seasonTags?: string[];
  companionTags?: string[];
  highlights: string[];
  dailyItinerary: ExploreTripDayContent[];
  pois: ExploreTripPoi[];
  food: ExploreTripFood[];
  status?: ExploreTripContentStatus;
  reviewStatus?: ExploreTripReviewStatus;
  source: ExploreTripSourceMeta;
  rawContent: Record<string, unknown>;
  publishedAt?: string;
}

export interface ExploreTripContentUpdate {
  title?: string;
  summary?: string;
  city?: string;
  cityCode?: string;
  region?: string;
  tripType?: string;
  days?: number;
  tags?: string[];
  theme?: string;
  pace?: string;
  budgetLevel?: string;
  budgetNote?: string;
  coverImageUrl?: string;
  imagePrompt?: string;
  archiveIntro?: string;
  featured?: boolean;
  featuredReason?: string;
  creatorType?: ExploreCreatorType;
  creatorId?: string;
  creator?: string;
  likes?: number;
  views?: number;
  savedCount?: number;
  terrainTags?: string[];
  cuisineTags?: string[];
  seasonTags?: string[];
  companionTags?: string[];
  highlights?: string[];
  dailyItinerary?: ExploreTripDayContent[];
  pois?: ExploreTripPoi[];
  food?: ExploreTripFood[];
  status?: ExploreTripContentStatus;
  reviewStatus?: ExploreTripReviewStatus;
  source?: ExploreTripSourceMeta;
  rawContent?: Record<string, unknown>;
  publishedAt?: string | null;
}

export interface ExploreTripListFilters {
  city?: string;
  tripType?: string;
  days?: number;
  tags?: string[];
  featured?: boolean;
  terrain?: string[];
  cuisine?: string[];
  season?: string[];
  companion?: string[];
  limit?: number;
  status?: ExploreTripContentStatus;
}

export interface InspirationSelection {
  location?: string[];
  food?: string[];
  season?: string[];
  companion?: string[];
}

export interface ExploreFacets {
  terrain: string[];
  cuisine: string[];
  season: string[];
  companion: string[];
}

export interface ExploreListResponse {
  ok: true;
  items: ExploreTripListItem[];
}

export interface ExploreFacetsResponse {
  ok: true;
  facets: ExploreFacets;
}

export interface ExploreDetailResponse {
  ok: true;
  item: ExploreTripContent;
}

export interface PipelineExploreTripCity {
  code: string;
  name: string;
  region_name?: string;
}

export interface PipelineExploreTripBudget {
  level: string;
  note: string;
}

export interface PipelineExploreTripActivity {
  time_block: string;
  description: string;
  poi_refs?: string[];
  food_refs?: string[];
}

export interface PipelineExploreTripDay {
  day: number;
  title: string;
  summary: string;
  activities: PipelineExploreTripActivity[];
}

export interface PipelineExploreTripPoi {
  id: string;
  name: string;
  district?: string;
  type?: string;
  reason: string;
  recommended_duration_minutes?: number;
}

export interface PipelineExploreTripFood {
  id: string;
  name: string;
  district?: string;
  category?: string;
  reason: string;
}

export interface PipelineExploreTripJson {
  id: string;
  slug: string;
  title: string;
  summary: string;
  city: PipelineExploreTripCity;
  trip_type: string;
  days: number;
  budget?: PipelineExploreTripBudget;
  pace?: string;
  tags?: string[];
  image_prompt?: string;
  theme?: string;
  archive_intro?: string;
  featured?: boolean;
  featured_reason?: string;
  creator_type?: ExploreCreatorType;
  creator_id?: string;
  creator?: string;
  likes?: number;
  views?: number;
  saved_count?: number;
  terrain_tags?: string[];
  cuisine_tags?: string[];
  season_tags?: string[];
  companion_tags?: string[];
  daily_itinerary: PipelineExploreTripDay[];
  pois?: PipelineExploreTripPoi[];
  food?: PipelineExploreTripFood[];
  raw: Record<string, unknown>;
}

export interface ExploreImportOptions {
  batchId?: string;
  sourceContentKey?: string;
  sourceFilePath?: string;
  status?: ExploreTripContentStatus;
  reviewStatus?: ExploreTripReviewStatus;
  publishedAt?: string;
}
