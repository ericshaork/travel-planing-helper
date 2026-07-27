import type { ExploreTripContent } from "../explore/types";

export const AVAILABLE_TRIP_PACKAGE_IDS = [
  "beijing_couple_golden_v2",
  "hangzhou_couple_golden_v1",
  "chengdu_couple_golden_v1",
  "shanghai_couple_v1",
  "xian_couple_v1",
] as const;

export type TripPackageId = (typeof AVAILABLE_TRIP_PACKAGE_IDS)[number];

export interface TripPackageCity {
  code: string;
  name: string;
  region_name?: string;
}

export interface TripPackageImageAssetSummary {
  asset_instance_id: string;
  asset_id: string;
  asset_name?: string;
  image_slot: string;
  image_usage_profile?: "cover" | "place" | "experience" | "food" | string;
  source_preference?: string;
  generation_mode?: string;
  status?: string;
  source?: string;
  original_file_path?: string;
  packaged_file_path?: string;
  image_asset_path?: string;
  refinement?: Record<string, unknown>;
}

export interface TripPackageManifest {
  package_id: string;
  package_version?: string;
  generated_on?: string;
  trip_id?: string;
  golden_run_id?: string;
  content_trip_id?: string;
  image_manifest_id?: string;
  city?: TripPackageCity;
  title?: string;
  days?: number;
  source_outputs?: Record<string, unknown>;
  content?: {
    explore_plan_path?: string;
    image_manifest_path?: string;
  };
  images?: {
    files_dir?: string;
    image_assets_dir?: string;
    assets?: TripPackageImageAssetSummary[];
  };
  validation?: {
    assembly_report_path?: string;
    golden_review_path?: string;
    status?: string;
  };
  base_package_id?: string;
}

export interface TripPackageExplorePlanActivity {
  time_block?: string;
  description?: string;
  poi_refs?: string[];
  food_refs?: string[];
}

export interface TripPackageExplorePlanDay {
  day?: number;
  dayNumber?: number;
  title?: string;
  summary?: string;
  activities?: TripPackageExplorePlanActivity[];
}

export interface TripPackageExplorePlanPoi {
  id?: string;
  name?: string;
  district?: string;
  type?: string;
  reason?: string;
  recommended_duration_minutes?: number;
}

export interface TripPackageExplorePlanFood {
  id?: string;
  name?: string;
  district?: string;
  category?: string;
  reason?: string;
}

export interface TripPackageExplorePlan {
  id?: string;
  slug?: string;
  title?: string;
  summary?: string;
  description?: string;
  city?: TripPackageCity;
  trip_type?: string;
  days?: number;
  budget?: {
    level?: string;
    note?: string;
  };
  pace?: string;
  tags?: string[];
  image_prompt?: string;
  theme?: string;
  archive_intro?: string;
  featured?: boolean;
  featured_reason?: string;
  creator_type?: "ai_generated" | "editorial" | "community";
  creator_id?: string;
  creator?: string;
  likes?: number;
  views?: number;
  saved_count?: number;
  terrain_tags?: string[];
  cuisine_tags?: string[];
  season_tags?: string[];
  companion_tags?: string[];
  daily_itinerary?: TripPackageExplorePlanDay[];
  pois?: TripPackageExplorePlanPoi[];
  food?: TripPackageExplorePlanFood[];
}

export interface TripPackageImageManifestImage {
  asset_instance_id?: string;
  asset_id?: string;
  asset_name?: string;
  image_slot?: string;
  type?: string;
  source_preference?: string;
  generation_mode?: string;
  image_usage_profile?: string;
  status?: string;
  prompt?: string;
  location_context?: Record<string, unknown>;
  search_keywords?: string[];
  visual_subject?: Record<string, unknown>;
  decision_reason?: string;
  review_requirement?: Record<string, unknown>;
}

export interface TripPackageImageManifest {
  trip_id?: string;
  city?: string;
  images?: TripPackageImageManifestImage[];
}

export interface TripPackageAssemblyReport {
  trip_id?: string;
  manifest_id?: string;
  base_package_id?: string;
  status?: string;
  generated_on?: string;
  checks?: Record<string, unknown>;
  counts?: Record<string, unknown>;
  issues?: unknown;
  warnings?: unknown;
}

export interface TripPackageImageAssetFile {
  asset_id?: string;
  asset_instance_id?: string;
  image_slot?: string;
  source?: string;
  file_path?: string;
  status?: string;
  metadata?: Record<string, unknown>;
}

export interface TripPackageImageBinding {
  assetInstanceId: string;
  assetId: string;
  assetName?: string;
  imageSlot: string;
  usageProfile?: string;
  publicUrl?: string;
  packagedFilePath?: string;
  imageAssetPath?: string;
  source?: string;
  generationMode?: string;
  sourceUrl?: string;
  license?: string;
  note?: string;
}

export interface LoadedTripPackage {
  packageId: TripPackageId;
  manifest: TripPackageManifest;
  explorePlan: TripPackageExplorePlan;
  imageManifest: TripPackageImageManifest;
  assemblyReport: TripPackageAssemblyReport;
  goldenReview?: unknown;
  imageAssetFiles: TripPackageImageAssetFile[];
}

export interface TripPackageLoadIssue {
  packageId: TripPackageId;
  message: string;
  cause?: unknown;
}

export interface TripPackageLoadResult {
  packages: LoadedTripPackage[];
  issues: TripPackageLoadIssue[];
}

export interface TripPackageExploreSourceResult {
  items: ExploreTripContent[];
  issues: TripPackageLoadIssue[];
}
