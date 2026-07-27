import type { TripPlan, TripRequest } from "../trip/types";

export type TravelProjectLifecycleState =
  | "new"
  | "exploring"
  | "planning"
  | "proposed"
  | "generating"
  | "workspace"
  | "editing"
  | "archived";

export type TravelProjectFlowStage =
  | "source_received"
  | "source_review"
  | "clarifying"
  | "proposal_ready"
  | "proposal_adjusting"
  | "generating"
  | "workspace_ready"
  | "abandoned";

export type TravelProjectSourceType =
  | "blank_input"
  | "explore_archive"
  | "import_text"
  | "uploaded_file"
  | "existing_trip";

export type TravelProjectVersionStatus = "draft" | "proposed" | "accepted";

export type TravelProjectVersionReason =
  | "ai_generate"
  | "ai_adjust"
  | "manual_edit"
  | "template_import"
  | "import_transform";

export type TravelProjectMessageRole = "system" | "user" | "assistant";

export interface TravelProject {
  id: string;
  userId?: string | null;
  title: string;
  lifecycleState: TravelProjectLifecycleState;
  currentFlowStage?: TravelProjectFlowStage | null;
  currentVersionId?: string | null;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface TravelProjectVersion {
  id: string;
  projectId: string;
  versionNumber: number;
  versionStatus: TravelProjectVersionStatus;
  createdFrom?: TravelProjectVersionReason | null;
  tripPlan: TripPlan;
  tripRequestSnapshot?: TripRequest | null;
  createdAt: string;
  updatedAt: string;
}

export interface TravelProjectSource {
  id: string;
  projectId: string;
  sourceType: TravelProjectSourceType;
  title?: string | null;
  payload?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface TravelProjectMessage {
  id: string;
  projectId: string;
  role: TravelProjectMessageRole;
  content: string;
  createdAt: string;
}
