export type TravelerFitLevel = "high" | "medium" | "low" | "none";

export interface ContentAsset {
  id: string;
  name: string;
  asset_type: string;
  category: string[];
  content_role: string[];
  traveler_fit: {
    couple: string;
    student: string;
    solo: string;
    [key: string]: string;
  };
  season_fit: string[];
  best_time: string[];
  experience_value: string[];
  avoid_when: string[];
  nearby_assets: string[];
  map_asset_id: string;
}

export interface AssetValidationResult {
  valid: boolean;
  errors: string[];
}

export interface AssetLoadResult {
  assets: ContentAsset[];
  errors: string[];
}

export interface AssetRequestProfile {
  traveler: string;
  season: string;
  purpose: string;
}

export interface CandidateSelectionRequest extends AssetRequestProfile {
  days: number;
  target_asset_count?: number;
}

export type ImageRequirementType = "hero" | "experience" | "detail" | "food";

export type ImageRequirementStatus = "pending" | "generated" | "approved";

export type ImageSlot =
  | "explore_cover"
  | "trip_cover"
  | "day_cover"
  | "poi_gallery"
  | "food_gallery"
  | "detail_image";

export type ImageSourcePreference = "real_first" | "mixed" | "ai_first";

export type ImageGenerationMode = "real_photo" | "hybrid" | "ai_generated";

export type ImageDecisionConfidence = "high" | "medium" | "low";

export interface ImageRequirement {
  type: ImageRequirementType;
  image_slot: ImageSlot;
  purpose: string;
  prompt: string;
  source_preference: ImageSourcePreference;
  generation_mode: ImageGenerationMode;
  decision_reason: string;
  confidence: ImageDecisionConfidence;
  placeholder: string;
  status: ImageRequirementStatus;
}

export interface LegacyImageContext {
  required: boolean;
  image_role: string[];
  description: string;
}

export interface ImageContextV2 {
  required: boolean;
  images: ImageRequirement[];
}

export type ImageContextV1 = ImageContextV2;

export interface ImageManifestTask {
  asset_instance_id: string;
  asset_id: string;
  asset_name: string;
  image_slot: ImageSlot;
  type: ImageRequirementType;
  source_preference: ImageSourcePreference;
  generation_mode: ImageGenerationMode;
  decision_reason: string;
  prompt: string;
  location_context: {
    city: string;
    district: string;
    poi: string;
    keywords: string[];
  };
  search_keywords: string[];
  visual_subject: {
    main_subject: string;
    secondary_elements: string[];
  };
  image_usage_profile: "cover" | "place" | "food" | "experience";
  review_requirement: {
    required: boolean;
    reason: string;
  };
  status: ImageRequirementStatus;
}

export interface ImageManifest {
  trip_id: string;
  city: string;
  images: ImageManifestTask[];
}

export interface RankedContentAsset {
  asset: ContentAsset;
  score: number;
  breakdown: {
    traveler_fit: number;
    season_fit: number;
    content_role_fit: number;
    avoid_penalty: number;
    nearby_bonus: number;
    total: number;
  };
  reasons: string[];
}

export interface CandidateSelectionItem {
  asset: ContentAsset;
  ranking_score: number;
  selection_score: number;
  family: string;
  connected_asset_ids: string[];
  reasons: string[];
  image_context: ImageContextV2;
}

export interface CandidateSelectionResult {
  profile: CandidateSelectionRequest;
  target_asset_count: number;
  selected: CandidateSelectionItem[];
  rejected: CandidateSelectionItem[];
  summary: {
    roles: string[];
    families: Record<string, number>;
    connected_pairs: number;
    uncovered_priority_roles: string[];
  };
}
