export interface SupabaseConfigStatus {
  hasUrl: boolean;
  hasAnonKey: boolean;
  hasServiceRoleKey: boolean;
  browserReady: boolean;
  serviceRoleReady: boolean;
}

export interface SupabaseBrowserEnv {
  url: string | null;
  anonKey: string | null;
  isConfigured: boolean;
}

export interface SupabaseServerEnv extends SupabaseBrowserEnv {
  serviceRoleKey: string | null;
  isServiceRoleConfigured: boolean;
}

export interface ProfileRow {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface TripPlanRow {
  id: string;
  user_id: string;
  title: string;
  destination_city: string | null;
  start_date: string | null;
  end_date: string | null;
  days: number | null;
  budget: number | null;
  trip_request_json: Record<string, unknown>;
  trip_plan_json: Record<string, unknown>;
  enrichment_json: Record<string, unknown> | null;
  weather_summary_json: Record<string, unknown> | null;
  cover_image_url: string | null;
  source_type: "ai_generated" | "blank_manual" | "explore_import";
  status: "draft" | "saved" | "archived";
  trip_preferences_json: Record<string, unknown>;
  local_draft_id: string | null;
  last_opened_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TripPlanInsert {
  user_id: string;
  title: string;
  destination_city?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  days?: number | null;
  budget?: number | null;
  trip_request_json: Record<string, unknown>;
  trip_plan_json: Record<string, unknown>;
  enrichment_json?: Record<string, unknown> | null;
  weather_summary_json?: Record<string, unknown> | null;
  cover_image_url?: string | null;
  source_type?: "ai_generated" | "blank_manual" | "explore_import";
  status?: "draft" | "saved" | "archived";
  trip_preferences_json?: Record<string, unknown>;
  local_draft_id?: string | null;
  last_opened_at?: string | null;
}

export interface TripPlanUpdate {
  title?: string;
  destination_city?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  days?: number | null;
  budget?: number | null;
  trip_request_json?: Record<string, unknown>;
  trip_plan_json?: Record<string, unknown>;
  enrichment_json?: Record<string, unknown> | null;
  weather_summary_json?: Record<string, unknown> | null;
  cover_image_url?: string | null;
  source_type?: "ai_generated" | "blank_manual" | "explore_import";
  status?: "draft" | "saved" | "archived";
  trip_preferences_json?: Record<string, unknown>;
  local_draft_id?: string | null;
  last_opened_at?: string | null;
}

export interface UserSettingsRow {
  id: string;
  user_id: string;
  travel_preferences_json: Record<string, unknown>;
  workspace_preferences_json: Record<string, unknown>;
  ai_preferences_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface UserSettingsInsert {
  user_id: string;
  travel_preferences_json?: Record<string, unknown>;
  workspace_preferences_json?: Record<string, unknown>;
  ai_preferences_json?: Record<string, unknown>;
}

export interface UserSettingsUpdate {
  travel_preferences_json?: Record<string, unknown>;
  workspace_preferences_json?: Record<string, unknown>;
  ai_preferences_json?: Record<string, unknown>;
}

export interface TravelProjectRow {
  id: string;
  user_id: string;
  title: string;
  lifecycle_state:
    | "new"
    | "exploring"
    | "planning"
    | "proposed"
    | "generating"
    | "workspace"
    | "editing"
    | "archived";
  current_flow_stage:
    | "source_received"
    | "source_review"
    | "clarifying"
    | "proposal_ready"
    | "proposal_adjusting"
    | "generating"
    | "workspace_ready"
    | "abandoned"
    | null;
  current_version_id: string | null;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
}

export interface TravelProjectInsert {
  user_id: string;
  title: string;
  lifecycle_state?: TravelProjectRow["lifecycle_state"];
  current_flow_stage?: TravelProjectRow["current_flow_stage"];
  current_version_id?: string | null;
  last_activity_at?: string;
}

export interface TravelProjectUpdate {
  title?: string;
  lifecycle_state?: TravelProjectRow["lifecycle_state"];
  current_flow_stage?: TravelProjectRow["current_flow_stage"];
  current_version_id?: string | null;
  last_activity_at?: string;
}

export interface TravelProjectVersionRow {
  id: string;
  project_id: string;
  version_number: number;
  version_status: "draft" | "proposed" | "accepted";
  created_from:
    | "ai_generate"
    | "ai_adjust"
    | "manual_edit"
    | "template_import"
    | "import_transform"
    | null;
  trip_plan_json: Record<string, unknown>;
  trip_request_snapshot_json: Record<string, unknown> | null;
  proposal_summary_json: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TravelProjectVersionInsert {
  project_id: string;
  version_number: number;
  version_status?: TravelProjectVersionRow["version_status"];
  created_from?: TravelProjectVersionRow["created_from"];
  trip_plan_json: Record<string, unknown>;
  trip_request_snapshot_json?: Record<string, unknown> | null;
  proposal_summary_json?: Record<string, unknown> | null;
  created_by?: string | null;
}

export interface TravelProjectVersionUpdate {
  version_status?: TravelProjectVersionRow["version_status"];
  created_from?: TravelProjectVersionRow["created_from"];
  trip_plan_json?: Record<string, unknown>;
  trip_request_snapshot_json?: Record<string, unknown> | null;
  proposal_summary_json?: Record<string, unknown> | null;
  created_by?: string | null;
}

export interface TravelProjectSourceRow {
  id: string;
  project_id: string;
  source_type:
    | "blank_input"
    | "explore_archive"
    | "import_text"
    | "uploaded_file"
    | "existing_trip";
  source_title: string | null;
  source_payload_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TravelProjectSourceInsert {
  project_id: string;
  source_type: TravelProjectSourceRow["source_type"];
  source_title?: string | null;
  source_payload_json?: Record<string, unknown>;
}

export interface TravelProjectMessageRow {
  id: string;
  project_id: string;
  role: "system" | "user" | "assistant";
  content: string;
  created_at: string;
}

export interface TravelProjectMessageInsert {
  project_id: string;
  role: TravelProjectMessageRow["role"];
  content: string;
}

export interface ExploreTripContentRow {
  id: string;
  external_id: string;
  slug: string;
  title: string;
  summary: string;
  city: string;
  city_code: string;
  region: string | null;
  trip_type: string;
  theme: string | null;
  days: number;
  tags: string[];
  pace: string | null;
  budget_level: string | null;
  budget_note: string | null;
  status: "draft" | "reviewing" | "published" | "archived";
  review_status: "pending" | "approved" | "rejected";
  image_prompt: string | null;
  cover_image_url: string | null;
  source_pipeline: string;
  source_batch_id: string | null;
  source_content_key: string | null;
  source_file_path: string | null;
  highlights_json: unknown[];
  itinerary_days_json: unknown[];
  poi_highlights_json: unknown[];
  food_highlights_json: unknown[];
  raw_content_json: Record<string, unknown>;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExploreTripContentInsert {
  external_id: string;
  slug: string;
  title: string;
  summary: string;
  city: string;
  city_code: string;
  region?: string | null;
  trip_type: string;
  theme?: string | null;
  days: number;
  tags: string[];
  pace?: string | null;
  budget_level?: string | null;
  budget_note?: string | null;
  status: "draft" | "reviewing" | "published" | "archived";
  review_status: "pending" | "approved" | "rejected";
  image_prompt?: string | null;
  cover_image_url?: string | null;
  source_pipeline: string;
  source_batch_id?: string | null;
  source_content_key?: string | null;
  source_file_path?: string | null;
  highlights_json: unknown[];
  itinerary_days_json: unknown[];
  poi_highlights_json: unknown[];
  food_highlights_json: unknown[];
  raw_content_json: Record<string, unknown>;
  published_at?: string | null;
}

export interface ExploreTripContentUpdate {
  title?: string;
  summary?: string;
  city?: string;
  city_code?: string;
  region?: string | null;
  trip_type?: string;
  theme?: string | null;
  days?: number;
  tags?: string[];
  pace?: string | null;
  budget_level?: string | null;
  budget_note?: string | null;
  status?: "draft" | "reviewing" | "published" | "archived";
  review_status?: "pending" | "approved" | "rejected";
  image_prompt?: string | null;
  cover_image_url?: string | null;
  source_pipeline?: string;
  source_batch_id?: string | null;
  source_content_key?: string | null;
  source_file_path?: string | null;
  highlights_json?: unknown[];
  itinerary_days_json?: unknown[];
  poi_highlights_json?: unknown[];
  food_highlights_json?: unknown[];
  raw_content_json?: Record<string, unknown>;
  published_at?: string | null;
}
