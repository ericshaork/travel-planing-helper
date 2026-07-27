import { z } from "zod";

export const conversationIntentSchema = z.enum([
  "unknown_destination",
  "destination_provided",
  "preference_collection",
  "ready_for_proposal",
  "modification_request",
]);

export const conversationActionSchema = z.enum([
  "continue_chat",
  "ask_question",
  "create_proposal",
  "modify_proposal",
]);

export const aiConversationResponseSchema = z
  .object({
    reply: z.string().trim().min(1).max(2000),
    intent: conversationIntentSchema,
    action: conversationActionSchema,
    nextStage: z
      .enum([
        "source_received",
        "source_review",
        "clarifying",
        "proposal_ready",
        "proposal_adjusting",
        "generating",
        "workspace_ready",
        "abandoned",
      ])
      .nullable(),
    missingInfo: z.array(z.string().trim().min(1).max(120)).max(10).default([]),
  })
  .strict();

export type AIConversationResponse = z.infer<
  typeof aiConversationResponseSchema
>;
