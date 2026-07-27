import "server-only";

import {
  getServerEnvironment,
  resolveAiRuntimeConfig,
  type ResolvedAiProviderName,
  type ServerEnvironment,
} from "../../utils/env";
import type { AIProvider, ConversationProviderInput } from "./provider-types";
import { OpenAICompatibleConversationProvider } from "./providers/openai-compatible-conversation-provider";

function detectIntent(message: string) {
  const normalized = message.trim().toLowerCase();

  if (
    normalized.includes("modify") ||
    normalized.includes("adjust") ||
    normalized.includes("修改") ||
    normalized.includes("调整")
  ) {
    return "modification_request" as const;
  }

  if (
    normalized.includes("不知道去哪") ||
    normalized.includes("不知道去哪里") ||
    normalized.includes("not sure where to go") ||
    normalized.includes("i do not know where to go") ||
    normalized.includes("don't know where to go")
  ) {
    return "unknown_destination" as const;
  }

  if (
    /(\d+\s*天|[一二三四五六七八九十两]+\s*天|days?)/i.test(normalized) &&
    (normalized.includes("美食") ||
      normalized.includes("风景") ||
      normalized.includes("文化") ||
      normalized.includes("放松") ||
      normalized.includes("food") ||
      normalized.includes("culture"))
  ) {
    return "ready_for_proposal" as const;
  }

  if (
    /(想去|去|到)[\u4e00-\u9fa5A-Za-z]{1,20}/.test(normalized) ||
    normalized.includes("to ")
  ) {
    return "destination_provided" as const;
  }

  return "preference_collection" as const;
}

function buildReply(intent: ReturnType<typeof detectIntent>) {
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

function buildMissingInfo(intent: ReturnType<typeof detectIntent>) {
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

function resolveNextStage(
  currentStage: ConversationProviderInput["context"]["currentStage"],
  intent: ReturnType<typeof detectIntent>,
) {
  switch (intent) {
    case "destination_provided":
      return currentStage === "source_received" || currentStage === "source_review"
        ? "clarifying"
        : null;
    case "ready_for_proposal":
      return currentStage === "clarifying" || currentStage === "proposal_adjusting"
        ? "proposal_ready"
        : null;
    case "modification_request":
      return currentStage === "proposal_ready" ? "proposal_adjusting" : null;
    case "unknown_destination":
      return currentStage === "source_received" ? "source_review" : null;
    case "preference_collection":
    default:
      return currentStage === "source_review" ? "clarifying" : null;
  }
}

function resolveAction(intent: ReturnType<typeof detectIntent>) {
  switch (intent) {
    case "unknown_destination":
    case "destination_provided":
    case "preference_collection":
      return "ask_question" as const;
    case "ready_for_proposal":
      return "create_proposal" as const;
    case "modification_request":
      return "modify_proposal" as const;
    default:
      return "continue_chat" as const;
  }
}

export function createMockAIProvider(): AIProvider {
  return {
    providerName: "mock-conversation-provider",
    async generateConversationResponse(input) {
      const intent = detectIntent(input.message);

      return {
        reply: buildReply(intent),
        intent,
        action: resolveAction(intent),
        nextStage: resolveNextStage(input.context.currentStage, intent),
        missingInfo: buildMissingInfo(intent),
      };
    },
  };
}

function createRealConversationProvider(
  providerName: Exclude<ResolvedAiProviderName, "mock">,
  environment: ServerEnvironment,
): AIProvider {
  const config = resolveAiRuntimeConfig(environment);

  return new OpenAICompatibleConversationProvider({
    providerName,
    baseUrl: config.baseUrl!,
    apiKey: config.apiKey!,
    model: config.model!,
    timeoutMs: config.timeoutMs,
  });
}

export function createConversationAIProvider(
  environment: ServerEnvironment = getServerEnvironment(),
): AIProvider {
  const config = resolveAiRuntimeConfig(environment);

  if (config.providerName === "mock") {
    return createMockAIProvider();
  }

  return createRealConversationProvider(config.providerName, environment);
}

export function getConversationAIProvider(): AIProvider {
  return createConversationAIProvider();
}
