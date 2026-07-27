import type { AIFlowStage } from "../flow/flow-types";
import type { UserPreferenceContext } from "../../ai/user-preference-context";
import type {
  TravelProject,
  TravelProjectMessage,
  TravelProjectSource,
} from "../types";
import type { ConversationContext } from "./conversation-types";

interface CreateConversationContextInput {
  project: TravelProject;
  currentStage?: AIFlowStage | null;
  recentMessages?: TravelProjectMessage[];
  sources?: TravelProjectSource[];
  userPreferenceContext?: UserPreferenceContext | null;
}

export function createConversationContext(
  input: CreateConversationContextInput,
): ConversationContext {
  return {
    project: input.project,
    currentStage: input.currentStage ?? input.project.currentFlowStage ?? "source_received",
    recentMessages: input.recentMessages ?? [],
    sources: input.sources ?? [],
    userPreferenceContext: input.userPreferenceContext ?? null,
  };
}
