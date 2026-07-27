import type {
  TravelProject,
  TravelProjectFlowStage,
  TravelProjectMessage,
  TravelProjectSource,
} from "../types";

export type AIFlowStage = TravelProjectFlowStage;

export interface FlowTransition {
  from: AIFlowStage;
  to: AIFlowStage;
}

export interface FlowTransitionResult {
  ok: boolean;
  from: AIFlowStage;
  to: AIFlowStage;
  reason?: string;
}

export interface FlowRuntimeMetadata {
  resumedFromAbandoned?: boolean;
  sourceCount?: number;
  messageCount?: number;
  [key: string]: unknown;
}

export interface FlowRuntimeContext {
  project: TravelProject;
  currentStage: AIFlowStage;
  messages: TravelProjectMessage[];
  sources: TravelProjectSource[];
  metadata?: FlowRuntimeMetadata;
}
