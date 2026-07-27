import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createMessageInputSchema,
  listMessagesQuerySchema,
  projectIdParamSchema,
  type ProjectMessagesResponse,
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

export function createProjectMessagesPostHandler(
  createClient = createSupabaseAccessTokenClient,
) {
  return async function POST(
    request: Request,
    context: { params: Promise<{ projectId: string }> },
  ) {
    try {
      const params = projectIdParamSchema.parse(await context.params);
      const body = createMessageInputSchema.parse(await request.json());
      const { service } = await resolveAuthenticatedProjectContext(
        request,
        createClient,
      );
      const message = await service.appendProjectMessage(params.projectId, body);

      return NextResponse.json({
        messages: [message],
      } satisfies ProjectMessagesResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          toApiErrorResponse(
            new AppError("INVALID_INPUT", "项目对话信息不完整，请检查后再试。"),
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

export function createProjectMessagesGetHandler(
  createClient = createSupabaseAccessTokenClient,
) {
  return async function GET(
    request: Request,
    context: { params: Promise<{ projectId: string }> },
  ) {
    try {
      const params = projectIdParamSchema.parse(await context.params);
      const query = listMessagesQuerySchema.parse(
        Object.fromEntries(new URL(request.url).searchParams.entries()),
      );
      const { service } = await resolveAuthenticatedProjectContext(
        request,
        createClient,
      );
      const messages = await service.listProjectMessages(params.projectId, query);

      return NextResponse.json({
        messages,
      } satisfies ProjectMessagesResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          toApiErrorResponse(
            new AppError(
              "INVALID_INPUT",
              "项目对话查询参数格式不正确，请检查后再试。",
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

export const POST = createProjectMessagesPostHandler();
export const GET = createProjectMessagesGetHandler();
