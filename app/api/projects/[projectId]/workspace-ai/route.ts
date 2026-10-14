import { NextResponse } from "next/server";
import { z } from "zod";

import { cloneDefaultUserSettings } from "../../../../../lib/settings/defaults";
import { createWorkspaceAiService } from "../../../../../lib/projects/workspace-ai/workspace-ai-service";
import {
  workspaceAiRequestSchema,
  type WorkspaceAiGenerationResult,
} from "../../../../../lib/projects/workspace-ai/workspace-ai-types";
import { projectIdParamSchema } from "../../../../../lib/projects/schema";
import { resolveAuthenticatedProjectContext } from "../../../../../lib/projects/server";
import { createSupabaseAccessTokenClient } from "../../../../../lib/supabase/server";
import {
  loadOrCreateUserSettingsRow,
  mapUserSettingsRowToSettings,
} from "../../../../../lib/settings/server";
import { AppError, toApiErrorResponse } from "../../../../../lib/utils/errors";

function getErrorStatus(error: unknown) {
  if (error instanceof AppError) {
    switch (error.code) {
      case "INVALID_INPUT":
        return 400;
      case "UNAUTHORIZED":
        return 401;
      default:
        return 404;
    }
  }

  return 500;
}

export function createProjectWorkspaceAiPostHandler(
  createClient = createSupabaseAccessTokenClient,
  createWorkspaceAi = createWorkspaceAiService,
) {
  return async function POST(
    request: Request,
    context: { params: Promise<{ projectId: string }> },
  ) {
    try {
      const params = projectIdParamSchema.parse(await context.params);
      const body = workspaceAiRequestSchema.parse(await request.json());
      const projectContext = await resolveAuthenticatedProjectContext(
        request,
        createClient,
      );
      const workspaceAiService = createWorkspaceAi(projectContext.service, {
        resolveUserSettings: async () => {
          if (projectContext.isDevelopmentGuest || !projectContext.client) {
            return cloneDefaultUserSettings();
          }

          try {
            const row = await loadOrCreateUserSettingsRow(
              projectContext.client as never,
              projectContext.user.id,
            );

            return mapUserSettingsRowToSettings(row as never);
          } catch {
            return cloneDefaultUserSettings();
          }
        },
      });

      const result = await workspaceAiService.applyModification(
        params.projectId,
        body.versionId,
        body.modificationRequest,
      );

      return NextResponse.json(result satisfies WorkspaceAiGenerationResult);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          toApiErrorResponse(
            new AppError(
              "INVALID_INPUT",
              "Workspace AI modification request is missing or invalid.",
            ),
          ),
          { status: 400 },
        );
      }

      return NextResponse.json(toApiErrorResponse(error), {
        status: getErrorStatus(error),
      });
    }
  };
}

export const POST = createProjectWorkspaceAiPostHandler();
