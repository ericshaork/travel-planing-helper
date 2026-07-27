import { z } from "zod";

import type { ConversationAction, ConversationIntent } from "../conversation/conversation-types";
import { projectIdParamSchema } from "../schema";
import type { GenerateTripResponse, TripPlan, TripRequest } from "../../trip/types";

export const workspaceAiRequestSchema = z
  .object({
    versionId: z.string().trim().min(1).max(120),
    modificationRequest: z.string().trim().min(1).max(2000),
  })
  .strict();

export const workspaceAiResponseSchema = z
  .object({
    success: z.literal(true),
    projectId: projectIdParamSchema.shape.projectId,
    versionId: z.string().trim().min(1).max(120),
    previousVersionId: z.string().trim().min(1).max(120),
    stage: z.literal("workspace_ready"),
    reply: z.string().trim().min(1),
    tripPlan: z.custom<TripPlan>(),
    tripRequest: z.custom<TripRequest>(),
    appliedChanges: z.array(z.string()).optional(),
    warnings: z.array(z.string()).optional(),
    intent: z.custom<ConversationIntent>(),
    action: z.custom<ConversationAction>(),
  })
  .strict();

export interface WorkspaceAiVersionMetadata {
  parentVersionId: string;
  changeReason: string;
  assistantReply: string;
  conversationIntent: ConversationIntent;
  conversationAction: ConversationAction;
}

export interface WorkspaceAiGenerationResult extends GenerateTripResponse {
  success: true;
  projectId: string;
  versionId: string;
  previousVersionId: string;
  stage: "workspace_ready";
  reply: string;
  tripRequest: TripRequest;
  intent: ConversationIntent;
  action: ConversationAction;
}

export type WorkspaceAiRequestInput = z.infer<typeof workspaceAiRequestSchema>;
