import type { TripPlan, TripRequest, TripRequestDraft } from "../../trip/types";
import type { TravelProjectVersionReason } from "../types";

export interface TravelProposalDuration {
  days?: number;
  startDate?: string;
  endDate?: string;
}

export interface TravelProposal {
  destination: string;
  duration: TravelProposalDuration;
  preferences: string[];
  highlights: string[];
  notes: string[];
}

export interface ProposalBuildResult {
  proposal: TravelProposal;
  tripRequestDraft: TripRequestDraft;
}

export interface ProposalGenerationResult {
  proposal: TravelProposal;
  tripRequest: TripRequest;
  tripPlan: TripPlan;
  versionReason: TravelProjectVersionReason;
  versionId: string;
}
