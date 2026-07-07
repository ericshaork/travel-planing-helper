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
}
