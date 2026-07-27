import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createProjectInputSchema,
  type ProjectResponse,
} from "../../../lib/projects/schema";
import { resolveAuthenticatedProjectContext } from "../../../lib/projects/server";
import { createSupabaseAccessTokenClient } from "../../../lib/supabase/server";
import { AppError, toApiErrorResponse } from "../../../lib/utils/errors";

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

export function createProjectsPostHandler(
  createClient = createSupabaseAccessTokenClient,
) {
  return async function POST(request: Request) {
    try {
      const body = createProjectInputSchema.parse(await request.json());
      const { user, service } = await resolveAuthenticatedProjectContext(
        request,
        createClient,
      );
      const project = await service.createProject(user.id, body);

      return NextResponse.json({
        project,
      } satisfies ProjectResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          toApiErrorResponse(
            new AppError(
              "INVALID_INPUT",
              "项目创建信息不完整，请检查后再试。",
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

export const POST = createProjectsPostHandler();
