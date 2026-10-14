import { NextResponse } from "next/server";
import { z } from "zod";

import {
  projectIdParamSchema,
  updateProjectStateInputSchema,
  type ProjectDetailResponse,
  type ProjectResponse,
} from "../../../../lib/projects/schema";
import { createProjectTripsRepository } from "../../../../lib/projects/trips/repository";
import { createProjectTripsService } from "../../../../lib/projects/trips/service";
import { resolveAuthenticatedProjectContext } from "../../../../lib/projects/server";
import { createSupabaseAccessTokenClient } from "../../../../lib/supabase/server";
import { AppError, toApiErrorResponse } from "../../../../lib/utils/errors";

function getErrorStatus(error: unknown) {
  if (error instanceof AppError) {
    switch (error.code) {
      case "INVALID_INPUT":
        return 400;
      case "UNAUTHORIZED":
        return 401;
      case "UNKNOWN_ERROR":
        return error.message.toLowerCase().includes("not found") ? 404 : 500;
      default:
        return 500;
    }
  }

  return 500;
}

export function createProjectDetailGetHandler(
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
      const detail = await service.getProject(params.projectId);

      if (!detail) {
        return NextResponse.json(
          {
            error: {
              code: "UNKNOWN_ERROR",
              message: "这个旅行项目暂时不存在，或你没有权限打开它。",
            },
          },
          { status: 404 },
        );
      }

      return NextResponse.json(detail satisfies ProjectDetailResponse);
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

export function createProjectPatchHandler(
  createClient = createSupabaseAccessTokenClient,
) {
  return async function PATCH(
    request: Request,
    context: { params: Promise<{ projectId: string }> },
  ) {
    try {
      const params = projectIdParamSchema.parse(await context.params);
      const body = updateProjectStateInputSchema.parse(await request.json());
      const projectContext = await resolveAuthenticatedProjectContext(
        request,
        createClient,
      );
      const projectTripsService = createProjectTripsService(
        createProjectTripsRepository(projectContext.client as never),
      );

      if (body.title !== undefined) {
        await projectTripsService.renameProject(params.projectId, body.title);
      }

      if (body.lifecycleState !== undefined) {
        await projectTripsService.updateProjectLifecycle(
          params.projectId,
          body.lifecycleState,
        );
      }

      const shouldPatchState =
        body.currentFlowStage !== undefined ||
        body.currentVersionId !== undefined ||
        body.touchActivity === true;
      const project = shouldPatchState
        ? await projectContext.service.updateProjectState(params.projectId, {
            currentFlowStage: body.currentFlowStage,
            currentVersionId: body.currentVersionId,
            touchActivity: body.touchActivity,
          })
        : (await projectContext.service.getProject(params.projectId))?.project ?? null;

      if (!project) {
        return NextResponse.json(
          {
            error: {
              code: "UNKNOWN_ERROR",
              message: "这个旅行项目暂时不存在。",
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
            new AppError("INVALID_INPUT", "项目更新信息不完整，请检查后再试。"),
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

export const GET = createProjectDetailGetHandler();
export const PATCH = createProjectPatchHandler();
