import { z } from "zod";

export const revisionChangeActionSchema = z.enum([
  "replace",
  "remove",
  "add",
  "modify",
]);

export const revisionChangeSchema = z
  .object({
    day: z.number().int().positive(),
    action: revisionChangeActionSchema,
    target: z.string().trim().min(1).max(200),
    replacement: z.string().trim().min(1).max(200).optional(),
    reason: z.string().trim().min(1).max(500),
  })
  .strict();

export const revisionModificationSuggestionSchema = z
  .object({
    type: z.literal("modification_suggestion"),
    message: z.string().trim().min(1).max(2000),
    changes: z.array(revisionChangeSchema).min(1).max(6),
  })
  .strict();

export const revisionReplySchema = z
  .object({
    type: z.literal("reply"),
    message: z.string().trim().min(1).max(2000),
  })
  .strict();

export const revisionChatResponseSchema = z.discriminatedUnion("type", [
  revisionModificationSuggestionSchema,
  revisionReplySchema,
]);

export type RevisionChangeAction = z.infer<typeof revisionChangeActionSchema>;
export type RevisionChange = z.infer<typeof revisionChangeSchema>;
export type RevisionModificationSuggestion = z.infer<
  typeof revisionModificationSuggestionSchema
>;
export type RevisionReply = z.infer<typeof revisionReplySchema>;
export type RevisionChatResponse = z.infer<typeof revisionChatResponseSchema>;

export type RevisionChatMessageRole = "user" | "assistant";

export interface RevisionChatHistoryMessage {
  role: RevisionChatMessageRole;
  content: string;
}

export const revisionChatRequestSchema = z
  .object({
    message: z.string().trim().min(1).max(2000),
    versionId: z.string().trim().min(1).max(120),
    history: z
      .array(
        z
          .object({
            role: z.enum(["user", "assistant"]),
            content: z.string().trim().min(1).max(4000),
          })
          .strict(),
      )
      .max(20)
      .optional(),
  })
  .strict();

export type RevisionChatRequest = z.infer<typeof revisionChatRequestSchema>;
