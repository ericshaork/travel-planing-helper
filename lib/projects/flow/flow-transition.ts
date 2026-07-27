import type { AIFlowStage, FlowTransitionResult } from "./flow-types";

const DIRECT_TRANSITIONS: Record<AIFlowStage, AIFlowStage[]> = {
  source_received: ["source_review", "abandoned"],
  source_review: ["clarifying", "abandoned"],
  clarifying: ["proposal_ready", "generating", "abandoned"],
  proposal_ready: ["proposal_adjusting", "generating", "abandoned"],
  proposal_adjusting: ["proposal_ready", "generating", "abandoned"],
  generating: ["workspace_ready", "abandoned"],
  workspace_ready: [],
  abandoned: [],
};

export function canTransition(
  currentStage: AIFlowStage,
  nextStage: AIFlowStage,
): FlowTransitionResult {
  if (currentStage === nextStage) {
    return {
      ok: true,
      from: currentStage,
      to: nextStage,
    };
  }

  const allowedStages = DIRECT_TRANSITIONS[currentStage] ?? [];

  if (allowedStages.includes(nextStage)) {
    return {
      ok: true,
      from: currentStage,
      to: nextStage,
    };
  }

  return {
    ok: false,
    from: currentStage,
    to: nextStage,
    reason: `Illegal flow transition: ${currentStage} -> ${nextStage}`,
  };
}

export function transitionStage(
  currentStage: AIFlowStage,
  nextStage: AIFlowStage,
): FlowTransitionResult {
  return canTransition(currentStage, nextStage);
}
