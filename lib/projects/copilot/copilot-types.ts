import type { AIFlowStage } from "../flow/flow-types";

export interface CopilotRequestInput {
  message: string;
}

export interface CopilotResponsePayload {
  success: true;
  projectId: string;
  stage: AIFlowStage;
  reply: string;
}

export interface CopilotReplyContext {
  stage: AIFlowStage;
  resumedFromAbandoned?: boolean;
}
