import type {
  ExploreTripContent,
  ExploreTripContentInsert,
} from "@/lib/explore/types";

export const productionStatuses = [
  "draft_requested",
  "content_generating",
  "content_review_pending",
  "content_approved",
  "image_manifest_ready",
  "image_fetching",
  "visual_review_pending",
  "visual_approved",
  "publishing",
  "published",
  "rejected",
  "failed",
] as const;

export type ProductionStatus = (typeof productionStatuses)[number];

export type ProductionArtifactKind =
  | "generation_request"
  | "explore_plan"
  | "content_review"
  | "image_manifest"
  | "image_asset"
  | "visual_review"
  | "publish_payload"
  | "invalidation_report"
  | "publish_preflight";

export interface ProductionArtifactRef {
  kind: ProductionArtifactKind;
  path?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface ExploreProductionRequest {
  city: string;
  days: number;
  travelerType: "family" | "couple" | "student" | "solo";
  budget: "low" | "medium" | "high";
  pace: "slow" | "balanced" | "dense";
  season: string;
  theme: string;
  motivation: string;
  preferences: string[];
  extraRequirement?: string;
}

export interface ExploreProductionJob {
  jobId: string;
  status: ProductionStatus;
  request: ExploreProductionRequest;
  artifacts: ProductionArtifactRef[];
  lastError?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PipelineExplorePlan {
  id: string;
  slug: string;
  title: string;
  summary: string;
  city: {
    code: string;
    name: string;
    region_name: string;
  };
  trip_type: string;
  days: number;
  budget: {
    level: string;
    note: string;
  };
  pace: string;
  tags: string[];
  image_prompt: string;
  daily_itinerary: Array<{
    day: number;
    title: string;
    summary: string;
    activities: Array<{
      time_block: "morning" | "afternoon" | "evening";
      description: string;
      poi_refs: string[];
      food_refs: string[];
    }>;
  }>;
  pois: Array<{
    id: string;
    name: string;
    district: string;
    type: string;
    reason: string;
    recommended_duration_minutes: number;
  }>;
  food: Array<{
    id: string;
    name: string;
    district: string;
    category: string;
    reason: string;
  }>;
}

export interface ImageManifestTask {
  asset_instance_id: string;
  asset_id: string;
  asset_name: string;
  image_slot:
    | "explore_cover"
    | "trip_cover"
    | "day_cover"
    | "poi_gallery"
    | "food_gallery"
    | "detail_image";
  type: "hero" | "experience" | "detail" | "food";
  source_preference: "real_first" | "mixed" | "ai_first";
  generation_mode: "real_photo" | "hybrid" | "ai_generated";
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
  status: "pending" | "generated" | "approved";
}

export interface ImageManifest {
  trip_id: string;
  city: string;
  images: ImageManifestTask[];
}

export interface ImagePipelineAssetSummary {
  asset_id: string;
  asset_instance_id: string;
  file_path: string;
  status: "completed" | "failed" | "processing" | "pending" | string;
}

export interface ImagePipelineSummary {
  manifest_id: string;
  source_ref?: string;
  task_count: number;
  completed_count: number;
  created_at: string;
  run_dir: string;
  assets: ImagePipelineAssetSummary[];
}

export interface ImageAssetRecord {
  asset_id: string;
  asset_instance_id: string;
  image_slot: ImageManifestTask["image_slot"] | string;
  source: string;
  file_path: string;
  status: string;
  retry_count?: number;
  last_error?: unknown;
  download_status?: string;
  fallback_available?: boolean;
  selection?: {
    selected_candidate?: {
      source?: string;
      candidate_id?: string;
      image_url?: string;
    } | null;
    rank_score?: number;
    candidate_count?: number;
    rejected_count?: number;
  };
  metadata?: {
    title?: string;
    description?: string;
    author?: string;
    license?: string;
    source_url?: string;
    image_url?: string;
    admin_review_status?: "pending" | "approved" | "needs_edit" | "rejected";
    admin_review_note?: string;
    admin_hidden?: boolean;
    admin_use_as_cover?: boolean;
    width?: number;
    height?: number;
    mime_type?: string;
    score_reasons?: string[];
    source_runs?: Array<{
      source: string;
      priority?: number;
      candidate_count?: number;
      error?: string | null;
    }>;
  } & Record<string, unknown>;
}

export interface ImageAssetDetail {
  asset_id: string;
  asset_instance_id: string;
  file_path: string;
  status: string;
  image_asset: ImageAssetRecord;
}

export interface EditableImageAssetPayload {
  asset_id: string;
  asset_instance_id: string;
  file_path?: string;
  status: string;
  image_asset: ImageAssetRecord;
}

export interface VisualReviewRecord {
  decision: "approved" | "rejected";
  score: number;
  issues: string[];
  comment?: string;
  reviewedAt: string;
  imageStats: {
    taskCount: number;
    completedCount: number;
  };
  approvedAssets: Array<{
    asset_id: string;
    asset_instance_id: string;
    image_slot: string;
    source: string;
    file_path: string;
    title?: string;
  }>;
}

export interface PublishPreflightCheck {
  id: string;
  label: string;
  status: "passed" | "warning" | "failed";
  message: string;
}

export interface PublishPreflightReport {
  generatedAt: string;
  passed: boolean;
  checks: PublishPreflightCheck[];
  blockers: PublishPreflightCheck[];
  warnings: PublishPreflightCheck[];
}

export interface PublishPayloadRecord {
  generatedAt: string;
  status: "payload_prepared" | "published" | "failed";
  exploreTrip: ExploreTripContentInsert;
  visualReview: VisualReviewRecord;
  imageAssets: ImageAssetDetail[];
  preflight?: PublishPreflightReport;
  database: {
    attempted: boolean;
    success: boolean;
    error?: {
      code: string;
      message: string;
    };
    item?: Pick<
      ExploreTripContent,
      "id" | "externalId" | "slug" | "title" | "status" | "publishedAt"
    >;
  };
}
