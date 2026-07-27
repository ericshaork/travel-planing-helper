import { NextResponse } from "next/server";
import { z } from "zod";

import { projectIdParamSchema } from "../../../../../lib/projects/schema";
import { resolveAuthenticatedProjectContext } from "../../../../../lib/projects/server";
import { resolveUserPreferenceContext } from "../../../../../lib/settings/ai-context";
import { createRevisionChatService } from "../../../../../lib/projects/revision-chat/revision-chat-service";
import { revisionChatRequestSchema } from "../../../../../lib/projects/revision-chat/revision-chat-types";
import type { RevisionChatResponse } from "../../../../../lib/projects/revision-chat/revision-chat-types";
import { createSupabaseAccessTokenClient } from "../../../../../lib/supabase/server";
import { AppError, toApiErrorResponse } from "../../../../../lib/utils/errors";

function getErrorStatus(error: unknown) {
  if (error instanceof AppError) {
    switch (error.code) {
      case "INVALID_INPUT":
        return 400;
      case "UNAUTHORIZED":
        return 401;
      case "AI_GENERATION_FAILED":
      case "AI_OUTPUT_INVALID":
        return 502;
      default:
        return 404;
    }
  }

  return 500;
}

export function createProjectRevisionChatPostHandler(
  createClient = createSupabaseAccessTokenClient,
  createService = createRevisionChatService,
) {
  return async function POST(
    request: Request,
    context: { params: Promise<{ projectId: string }> },
  ) {
    try {
      const params = projectIdParamSchema.parse(await context.params);
      const body = revisionChatRequestSchema.parse(await request.json());
      const projectContext = await resolveAuthenticatedProjectContext(
        request,
        createClient,
      );
      const service = createService(projectContext.service);
      const userPreferenceContext = await resolveUserPreferenceContext({
        client: projectContext.client,
        userId: projectContext.user.id,
        useDefaultSettings: projectContext.isDevelopmentGuest,
      });
      const result = await service.suggestModification({
        projectId: params.projectId,
        versionId: body.versionId,
        message: body.message,
        history: body.history,
        userPreferenceContext,
      });

      return NextResponse.json(result satisfies RevisionChatResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          toApiErrorResponse(
            new AppError(
              "INVALID_INPUT",
              "Revision chat request is missing or invalid.",
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

export const POST = createProjectRevisionChatPostHandler();
