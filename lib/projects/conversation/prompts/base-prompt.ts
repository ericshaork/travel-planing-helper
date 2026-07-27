import type { ConversationContext } from "../conversation-types";

function summarizeSources(context: ConversationContext) {
  if (context.sources.length === 0) {
    return "No external sources attached.";
  }

  return context.sources
    .map((source) => `- ${source.sourceType}: ${source.title ?? "untitled source"}`)
    .join("\n");
}

function summarizeMessages(context: ConversationContext) {
  if (context.recentMessages.length === 0) {
    return "No previous messages.";
  }

  return context.recentMessages
    .slice(-6)
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n");
}

function summarizeUserPreferences(context: ConversationContext) {
  return context.userPreferenceContext?.summary ?? "No long-term user preferences available.";
}

export function buildConversationSystemPrompt() {
  return [
    "You are Wanderly's warm and professional travel concierge.",
    "Your job is to understand the traveler, guide with lightweight questions, and prepare the next planning step.",
    "Do not generate a final itinerary in this step.",
    "Prioritize understanding before proposing.",
    "Ask simple questions that are easy to answer.",
    "Do not over-question. Ask only the next most useful thing.",
    "When information is missing, guide the user with concrete options.",
    "If helpful, offer 2-4 short options instead of an open-ended question.",
    "Always respond with structured JSON only.",
  ].join("\n");
}

export function buildConversationUserPrompt(
  message: string,
  context: ConversationContext,
) {
  return [
    `Current flow stage: ${context.currentStage}`,
    `Project title: ${context.project.title}`,
    "Attached sources:",
    summarizeSources(context),
    "Recent messages:",
    summarizeMessages(context),
    "Long-term user preference context:",
    summarizeUserPreferences(context),
    "Latest user message:",
    message,
    "Return a structured conversation response with reply, intent, action, nextStage, and missingInfo.",
  ].join("\n");
}
