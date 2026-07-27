import type { AIFlowStage } from "../flow/flow-types";
import type { UserPreferenceContext } from "../../ai/user-preference-context";
import type {
  TravelProject,
  TravelProjectMessage,
  TravelProjectSource,
} from "../types";

export type ConversationIntent =
  | "unknown_destination"
  | "destination_provided"
  | "preference_collection"
  | "ready_for_proposal"
  | "modification_request";

export type ConversationAction =
  | "continue_chat"
  | "ask_question"
  | "create_proposal"
  | "modify_proposal";

export interface ConversationResponse {
  reply: string;
  intent: ConversationIntent;
  action: ConversationAction;
  nextStage: AIFlowStage | null;
  missingInfo: string[];
}

export interface ConversationContext {
  project: TravelProject;
  currentStage: AIFlowStage;
  recentMessages: TravelProjectMessage[];
  sources: TravelProjectSource[];
  userPreferenceContext?: UserPreferenceContext | null;
}
