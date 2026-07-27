import { createConversationAIProvider } from "../../ai/provider/provider";
import type { AIProvider } from "../../ai/provider/provider-types";
import { buildConversationSystemPrompt, buildConversationUserPrompt } from "./prompts/base-prompt";
import { aiConversationResponseSchema } from "./ai-response-schema";
import type { AIFlowStage } from "../flow/flow-types";
import type {
  ConversationAction,
  ConversationContext,
  ConversationIntent,
  ConversationResponse,
} from "./conversation-types";

export interface ConversationService {
  processMessage(
    message: string,
    context: ConversationContext,
  ): Promise<ConversationResponse>;
}

const UNKNOWN_DESTINATION_PATTERNS = [
  "不知道去哪",
  "不知道去哪里",
  "不确定去哪",
  "还没想好去哪",
  "where should i go",
  "i do not know where to go",
  "don't know where to go",
];

const MODIFICATION_PATTERNS = [
  "修改",
  "调整",
  "优化",
  "换一个",
  "改一下",
  "rework",
  "adjust",
  "modify",
];

const PREFERENCE_PATTERNS = [
  "美食",
  "风景",
  "文化",
  "放松",
  "探索",
  "预算",
  "慢慢体验",
  "平衡安排",
  "尽量体验",
  "food",
  "culture",
  "budget",
  "relax",
];

const PROPOSAL_READY_PATTERNS = [
  "开始规划",
  "可以生成",
  "继续生成",
  "给我方案",
  "出一版",
  "make a proposal",
  "generate a plan",
];

const DESTINATION_HINTS = ["去", "到", "in ", "to "];

function includesAny(content: string, patterns: string[]) {
  return patterns.some((pattern) => content.includes(pattern));
}

function hasDestinationSignal(message: string) {
  if (/(想去|去|到)[\u4e00-\u9fa5A-Za-z]{1,20}/.test(message)) {
    return true;
  }

  return DESTINATION_HINTS.some((hint) => message.includes(hint));
}

function hasEnoughPlanningSignals(message: string) {
  const hasDaySignal = /(\d+\s*天|[一二三四五六七八九十两]+\s*天|days?)/i.test(
    message,
  );
  const hasPreferenceSignal = includesAny(message, PREFERENCE_PATTERNS);

  return hasDaySignal && hasPreferenceSignal;
}

function getFallbackReply(intent: ConversationIntent) {
  switch (intent) {
    case "unknown_destination":
      return "你可以先告诉我更偏向哪种旅行感觉，比如美食、风景、文化、放松，或者预算范围。";
    case "destination_provided":
      return "目的地收到。接下来告诉我几天、想玩得多慢、以及更看重什么，我就能继续收紧方案。";
    case "ready_for_proposal":
      return "信息已经够我整理出一版旅行方向了，我先进入 proposal 阶段，给你一个可继续调整的版本。";
    case "modification_request":
      return "我会按你这次的修改方向继续调整 proposal，先把重点变化记下来。";
    case "preference_collection":
    default:
      return "再补一点旅行偏好给我吧，比如节奏、预算、想看的内容，这样我能更快推进到 proposal。";
  }
}

function getFallbackMissingInfo(intent: ConversationIntent) {
  switch (intent) {
    case "unknown_destination":
      return ["destination_preference", "budget_or_trip_style"];
    case "destination_provided":
      return ["days", "pace", "priorities"];
    case "ready_for_proposal":
      return [];
    case "modification_request":
      return ["change_focus"];
    case "preference_collection":
    default:
      return ["preferences"];
  }
}

function resolveIntent(message: string): ConversationIntent {
  const normalized = message.trim().toLowerCase();

  if (includesAny(normalized, MODIFICATION_PATTERNS)) {
    return "modification_request";
  }

  if (includesAny(normalized, UNKNOWN_DESTINATION_PATTERNS)) {
    return "unknown_destination";
  }

  if (
    includesAny(normalized, PROPOSAL_READY_PATTERNS) ||
    hasEnoughPlanningSignals(normalized)
  ) {
    return "ready_for_proposal";
  }

  if (hasDestinationSignal(normalized)) {
    return "destination_provided";
  }

  return "preference_collection";
}

function resolveNextStage(
  currentStage: AIFlowStage,
  intent: ConversationIntent,
): AIFlowStage | null {
  switch (intent) {
    case "unknown_destination":
      return currentStage === "source_received" ? "source_review" : null;
    case "destination_provided":
      if (currentStage === "source_review" || currentStage === "source_received") {
        return "clarifying";
      }
      return null;
    case "ready_for_proposal":
      if (currentStage === "clarifying" || currentStage === "proposal_adjusting") {
        return "proposal_ready";
      }
      return null;
    case "modification_request":
      return currentStage === "proposal_ready" ? "proposal_adjusting" : null;
    case "preference_collection":
    default:
      return currentStage === "source_review" ? "clarifying" : null;
  }
}

function resolveAction(
  intent: ConversationIntent,
  nextStage: AIFlowStage | null,
): ConversationAction {
  if (intent === "ready_for_proposal") {
    return "create_proposal";
  }

  if (intent === "modification_request") {
    return "modify_proposal";
  }

  if (nextStage === "clarifying" || intent === "unknown_destination") {
    return "ask_question";
  }

  return "continue_chat";
}

function buildFallbackResponse(
  message: string,
  context: ConversationContext,
): ConversationResponse {
  const intent = resolveIntent(message);
  const nextStage = resolveNextStage(context.currentStage, intent);
  const action = resolveAction(intent, nextStage);

  return {
    reply: getFallbackReply(intent),
    intent,
    action,
    nextStage,
    missingInfo: getFallbackMissingInfo(intent),
  };
}

export function createConversationService(
  provider: AIProvider = createConversationAIProvider(),
): ConversationService {
  return {
    async processMessage(message, context) {
      try {
        const result = await provider.generateConversationResponse({
          message,
          context,
          systemPrompt: buildConversationSystemPrompt(),
          userPrompt: buildConversationUserPrompt(message, context),
        });

        const parsed = aiConversationResponseSchema.safeParse(result);

        if (parsed.success) {
          return parsed.data;
        }
      } catch {
        // Fallback rules keep the conversation layer available even if the provider fails.
      }

      return buildFallbackResponse(message, context);
    },
  };
}
