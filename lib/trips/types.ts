import type { TripResultEnrichment } from "../trip/enrichment-types";
import type { TripPlan, TripRequest, WeatherSummary } from "../trip/types";
import type { TripWeatherSummary } from "../weather/types";

export interface SaveTripRequestPayload {
  tripRequest: TripRequest;
  tripPlan: TripPlan;
  tripEnrichment?: TripResultEnrichment | null;
}

export interface SavedTripInsert {
  user_id: string;
  title: string;
  destination_city: string;
  start_date: string | null;
  end_date: string | null;
  days: number;
  budget: number | null;
  trip_request_json: TripRequest;
  trip_plan_json: TripPlan;
  enrichment_json: TripResultEnrichment["enrichment"] | null;
  weather_summary_json: WeatherSummary | TripWeatherSummary;
}

export interface SaveTripResponse {
  tripId: string;
}

export interface UpdateTripResponse {
  ok: true;
  tripId: string;
  updatedAt: string;
}

export interface DeleteTripResponse {
  ok: true;
}

export interface SavedTripListItem {
  id: string;
  title: string;
  destination_city: string | null;
  start_date: string | null;
  end_date: string | null;
  days: number | null;
  budget: number | null;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export type ListTripsResponse =
  | {
      ok: true;
      trips: SavedTripListItem[];
    }
  | {
      ok: false;
      code: "UNAUTHORIZED" | "LIST_TRIPS_FAILED";
      message: string;
    };

export interface SavedTripDetail extends SavedTripListItem {
  trip_request_json: TripRequest;
  trip_plan_json: TripPlan;
  enrichment_json: TripResultEnrichment["enrichment"] | null;
  weather_summary_json: WeatherSummary | TripWeatherSummary | null;
}

export type LoadTripResponse =
  | {
      ok: true;
      trip: SavedTripDetail;
    }
  | {
      ok: false;
      code: "UNAUTHORIZED" | "TRIP_NOT_FOUND" | "LOAD_TRIP_FAILED";
      message: string;
    };

export interface RestoreSavedTripInput {
  trip: SavedTripDetail;
}
