import type {
  TravelProject,
  TravelProjectMessage,
  TravelProjectSource,
} from "../types";
import type { AIFlowStage, FlowRuntimeContext, FlowRuntimeMetadata } from "./flow-types";

export function createFlowContext(input: {
  project: TravelProject;
  messages?: TravelProjectMessage[];
  sources?: TravelProjectSource[];
  metadata?: FlowRuntimeMetadata;
}): FlowRuntimeContext {
  const currentStage = input.project.currentFlowStage ?? "source_received";

  return {
    project: input.project,
    currentStage: currentStage as AIFlowStage,
    messages: input.messages ?? [],
    sources: input.sources ?? [],
    metadata: input.metadata,
  };
}
