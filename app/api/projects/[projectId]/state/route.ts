import { NextResponse } from "next/server";
import { z } from "zod";

import {
  projectIdParamSchema,
  updateProjectStateInputSchema,
  type ProjectResponse,
} from "../../../../../lib/projects/schema";
import { resolveAuthenticatedProjectContext } from "../../../../../lib/projects/server";
import { createSupabaseAccessTokenClient } from "../../../../../lib/supabase/server";
import { AppError, toApiErrorResponse } from "../../../../../lib/utils/errors";

function getErrorStatus(error: unknown) {
  if (error instanceof AppError) {
    switch (error.code) {
      case "INVALID_INPUT":
        return 400;
      case "UNAUTHORIZED":
        return 401;
      default:
        return 500;
    }
  }

  return 500;
}

export function createProjectStatePatchHandler(
  createClient = createSupabaseAccessTokenClient,
) {
  return async function PATCH(
    request: Request,
    context: { params: Promise<{ projectId: string }> },
  ) {
    try {
      const params = projectIdParamSchema.parse(await context.params);
      const body = updateProjectStateInputSchema.parse(await request.json());
      const { service } = await resolveAuthenticatedProjectContext(
        request,
        createClient,
      );
      const project = await service.updateProjectState(params.projectId, body);

      if (!project) {
        return NextResponse.json(
          {
            error: {
              code: "UNKNOWN_ERROR",
              message: "杩欎釜鏃呰椤圭洰鏆傛椂涓嶅瓨鍦ㄦ垨鏃犳硶鏇存柊銆?",
            },
          },
          { status: 404 },
        );
      }

      return NextResponse.json({
        project,
      } satisfies ProjectResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          toApiErrorResponse(
            new AppError(
              "INVALID_INPUT",
              "项目状态更新信息不完整，请检查后再试。",
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

export const PATCH = createProjectStatePatchHandler();
