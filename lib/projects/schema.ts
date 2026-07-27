import { z } from "zod";

import type {
  TravelProject,
  TravelProjectMessage,
  TravelProjectSource,
  TravelProjectVersion,
} from "./types";
import { tripPlanSchema, tripRequestSchema } from "../trip/schema";

export const travelProjectLifecycleStateSchema =
  z.enum([
    "new",
    "exploring",
    "planning",
    "proposed",
    "generating",
    "workspace",
    "editing",
    "archived",
  ]);

export const travelProjectFlowStageSchema = z.enum([
  "source_received",
  "source_review",
  "clarifying",
  "proposal_ready",
  "proposal_adjusting",
  "generating",
  "workspace_ready",
  "abandoned",
]);

export const travelProjectSourceTypeSchema = z.enum([
  "blank_input",
  "explore_archive",
  "import_text",
  "uploaded_file",
  "existing_trip",
]);

export const travelProjectVersionStatusSchema =
  z.enum(["draft", "proposed", "accepted"]);

export const travelProjectVersionReasonSchema =
  z.enum([
    "ai_generate",
    "ai_adjust",
    "manual_edit",
    "template_import",
    "import_transform",
  ]);

export const travelProjectMessageRoleSchema = z.enum([
  "system",
  "user",
  "assistant",
]);

export const createProjectInputSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    sourceType: travelProjectSourceTypeSchema,
    initialMetadata: z
      .object({
        lifecycleState: travelProjectLifecycleStateSchema.optional(),
        flowStage: travelProjectFlowStageSchema.nullable().optional(),
        sourceTitle: z.string().trim().min(1).max(160).nullable().optional(),
        sourcePayload: z.record(z.string(), z.unknown()).nullable().optional(),
      })
      .optional(),
  })
  .strict();

export const updateProjectStateInputSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    lifecycleState: travelProjectLifecycleStateSchema.optional(),
    currentFlowStage: travelProjectFlowStageSchema.nullable().optional(),
    currentVersionId: z.string().trim().min(1).max(120).nullable().optional(),
    touchActivity: z.boolean().optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.title !== undefined ||
      value.lifecycleState !== undefined ||
      value.currentFlowStage !== undefined ||
      value.currentVersionId !== undefined ||
      value.touchActivity === true,
    {
      message: "鑷冲皯鎻愪氦涓€涓彲鏇存柊鐨勯」鐩姸鎬佸瓧娈点€?",
      path: ["state"],
    },
  );

export const createVersionInputSchema = z
  .object({
    versionStatus: travelProjectVersionStatusSchema.optional(),
    createdFrom: travelProjectVersionReasonSchema.nullable().optional(),
    tripPlan: tripPlanSchema,
    tripRequestSnapshot: tripRequestSchema.nullable().optional(),
    proposalSummary: z.record(z.string(), z.unknown()).nullable().optional(),
    createdBy: z.string().trim().min(1).max(80).nullable().optional(),
    setAsCurrent: z.boolean().optional(),
  })
  .strict();

export const createSourceInputSchema = z
  .object({
    sourceType: travelProjectSourceTypeSchema,
    title: z.string().trim().min(1).max(160).nullable().optional(),
    payload: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .strict();

export const createMessageInputSchema = z
  .object({
    role: travelProjectMessageRoleSchema,
    content: z.string().trim().min(1).max(4000),
  })
  .strict();

export const listMessagesQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).optional(),
  })
  .strict();

export const projectIdParamSchema = z.object({
  projectId: z.string().trim().min(1).max(120),
});

export const projectVersionParamsSchema = z.object({
  projectId: z.string().trim().min(1).max(120),
  versionId: z.string().trim().min(1).max(120),
});

export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;
export type UpdateProjectStateInput = z.infer<
  typeof updateProjectStateInputSchema
>;
export type CreateVersionInput = z.infer<typeof createVersionInputSchema>;
export type CreateSourceInput = z.infer<typeof createSourceInputSchema>;
export type CreateMessageInput = z.infer<typeof createMessageInputSchema>;
export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;

export interface ProjectResponse {
  project: TravelProject;
}

export interface ProjectDetailResponse {
  project: TravelProject;
  currentVersion: TravelProjectVersion | null;
  sources: TravelProjectSource[];
}

export interface ProjectVersionResponse {
  version: TravelProjectVersion;
}

export interface ProjectVersionsResponse {
  versions: TravelProjectVersion[];
}

export interface ProjectSourcesResponse {
  sources: TravelProjectSource[];
}

export interface ProjectMessagesResponse {
  messages: TravelProjectMessage[];
}
