import type {
  TravelProjectFlowStage,
  TravelProjectLifecycleState,
  TravelProjectSourceType,
} from "../types";

export interface TravelProjectTripSummary {
  projectId: string;
  title: string;
  lifecycleState: TravelProjectLifecycleState;
  currentFlowStage: TravelProjectFlowStage | null;
  currentVersionId: string | null;
  sourceType: TravelProjectSourceType | null;
  destinationCity: string | null;
  startDate: string | null;
  endDate: string | null;
  days: number | null;
  budget: number | null;
  updatedAt: string;
  lastActivityAt: string;
  createdAt: string;
}

export interface ProjectTripsFilters {
  search?: string;
  status?: "draft" | "saved" | "archived" | "all";
  sourceType?:
    | "ai_generated"
    | "blank_manual"
    | "explore_import"
    | "file_import"
    | "all";
}
