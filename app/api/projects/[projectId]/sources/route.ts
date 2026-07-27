import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createSourceInputSchema,
  projectIdParamSchema,
  type ProjectSourcesResponse,
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

export function createProjectSourcesPostHandler(
  createClient = createSupabaseAccessTokenClient,
) {
  return async function POST(
    request: Request,
    context: { params: Promise<{ projectId: string }> },
  ) {
    try {
      const params = projectIdParamSchema.parse(await context.params);
      const body = createSourceInputSchema.parse(await request.json());
      const { service } = await resolveAuthenticatedProjectContext(
        request,
        createClient,
      );
      const source = await service.addProjectSource(params.projectId, body);

      return NextResponse.json({
        sources: [source],
      } satisfies ProjectSourcesResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          toApiErrorResponse(
            new AppError("INVALID_INPUT", "来源信息不完整，请检查后再试。"),
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

export function createProjectSourcesGetHandler(
  createClient = createSupabaseAccessTokenClient,
) {
  return async function GET(
    request: Request,
    context: { params: Promise<{ projectId: string }> },
  ) {
    try {
      const params = projectIdParamSchema.parse(await context.params);
      const { service } = await resolveAuthenticatedProjectContext(
        request,
        createClient,
      );
      const sources = await service.listProjectSources(params.projectId);

      return NextResponse.json({
        sources,
      } satisfies ProjectSourcesResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          toApiErrorResponse(
            new AppError("INVALID_INPUT", "项目 id 格式不正确，请检查后再试。"),
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

export const POST = createProjectSourcesPostHandler();
export const GET = createProjectSourcesGetHandler();
