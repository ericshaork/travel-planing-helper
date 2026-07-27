import { NextResponse } from "next/server";
import { z } from "zod";

import { createCopilotService } from "../../../../../lib/projects/copilot/copilot-service";
import type { CopilotResponsePayload } from "../../../../../lib/projects/copilot/copilot-types";
import { createFlowService } from "../../../../../lib/projects/flow/flow-service";
import { projectIdParamSchema } from "../../../../../lib/projects/schema";
import { resolveAuthenticatedProjectContext } from "../../../../../lib/projects/server";
import { resolveUserPreferenceContext } from "../../../../../lib/settings/ai-context";
import { createSupabaseAccessTokenClient } from "../../../../../lib/supabase/server";
import { AppError, toApiErrorResponse } from "../../../../../lib/utils/errors";

const copilotRequestSchema = z
  .object({
    message: z.string().trim().min(1).max(4000),
  })
  .strict();

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

export function createProjectCopilotPostHandler(
  createClient = createSupabaseAccessTokenClient,
  createCopilot = createCopilotService,
) {
  return async function POST(
    request: Request,
    context: { params: Promise<{ projectId: string }> },
  ) {
    try {
      const params = projectIdParamSchema.parse(await context.params);
      const body = copilotRequestSchema.parse(await request.json());
      const projectContext = await resolveAuthenticatedProjectContext(
        request,
        createClient,
      );
      const projectService = projectContext.service;
      const copilotService = createCopilot(
        projectService,
        createFlowService(projectService),
      );
      const userPreferenceContext = await resolveUserPreferenceContext({
        client: projectContext.client,
        userId: projectContext.user.id,
        useDefaultSettings: projectContext.isDevelopmentGuest,
      });
      const result = await copilotService.handleMessage(
        params.projectId,
        body.message,
        {
          userPreferenceContext,
        },
      );

      return NextResponse.json(result satisfies CopilotResponsePayload);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          toApiErrorResponse(
            new AppError(
              "INVALID_INPUT",
              "Copilot message is missing or invalid.",
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

export const POST = createProjectCopilotPostHandler();
