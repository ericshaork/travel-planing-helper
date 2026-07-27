import { NextResponse } from "next/server";
import { z } from "zod";

import {
  projectVersionParamsSchema,
  type ProjectVersionResponse,
} from "../../../../../../lib/projects/schema";
import { resolveAuthenticatedProjectContext } from "../../../../../../lib/projects/server";
import { createSupabaseAccessTokenClient } from "../../../../../../lib/supabase/server";
import { AppError, toApiErrorResponse } from "../../../../../../lib/utils/errors";

function getErrorStatus(error: unknown) {
  if (error instanceof AppError) {
    return error.code === "UNAUTHORIZED" ? 401 : 500;
  }

  return 500;
}

export function createProjectVersionDetailGetHandler(
  createClient = createSupabaseAccessTokenClient,
) {
  return async function GET(
    request: Request,
    context: { params: Promise<{ projectId: string; versionId: string }> },
  ) {
    try {
      const params = projectVersionParamsSchema.parse(await context.params);
      const { service } = await resolveAuthenticatedProjectContext(
        request,
        createClient,
      );
      const version = await service.getProjectVersion(
        params.projectId,
        params.versionId,
      );

      if (!version) {
        return NextResponse.json(
          {
            error: {
              code: "UNKNOWN_ERROR",
              message: "杩欎釜鏃呰鐗堟湰鏆傛椂涓嶅瓨鍦ㄦ垨鏃犳硶璁块棶銆?",
            },
          },
          { status: 404 },
        );
      }

      return NextResponse.json({
        version,
      } satisfies ProjectVersionResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          toApiErrorResponse(
            new AppError(
              "INVALID_INPUT",
              "项目版本 id 格式不正确，请检查后再试。",
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

export const GET = createProjectVersionDetailGetHandler();
