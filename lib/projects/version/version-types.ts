import type {
  TravelProject,
  TravelProjectVersion,
  TravelProjectVersionReason,
} from "../types";
import type { TripPlan, TripRequest } from "../../trip/types";

export type ManagedTravelProjectVersionStatus =
  | "proposed"
  | "active"
  | "archived";

export interface ManagedTravelProjectVersion extends TravelProjectVersion {
  managedStatus: ManagedTravelProjectVersionStatus;
}

export interface CreateManagedVersionInput {
  managedStatus?: ManagedTravelProjectVersionStatus;
  createdFrom?: TravelProjectVersionReason | null;
  tripPlan: TripPlan;
  tripRequestSnapshot?: TripRequest | null;
  proposalSummary?: Record<string, unknown> | null;
  createdBy?: string | null;
  setAsCurrent?: boolean;
}

export interface ProjectVersionCollection {
  project: TravelProject;
  currentVersion: ManagedTravelProjectVersion | null;
  versions: ManagedTravelProjectVersion[];
}
