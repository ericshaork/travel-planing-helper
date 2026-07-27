import { NextResponse } from "next/server";
import { z } from "zod";

import { cloneDefaultUserSettings } from "../../../../../lib/settings/defaults";
import { loadOrCreateUserSettingsRow, mapUserSettingsRowToSettings } from "../../../../../lib/settings/server";
import { createFlowService } from "../../../../../lib/projects/flow/flow-service";
import { createProposalService } from "../../../../../lib/projects/proposal/proposal-service";
import { projectIdParamSchema } from "../../../../../lib/projects/schema";
import { resolveAuthenticatedProjectContext } from "../../../../../lib/projects/server";
import { createSupabaseAccessTokenClient } from "../../../../../lib/supabase/server";
import { planTrip } from "../../../../../lib/trip/planner";
import { AppError, toApiErrorResponse } from "../../../../../lib/utils/errors";

const proposalActionSchema = z
  .object({
    action: z.enum(["adjust", "generate"]),
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
        return 500;
    }
  }

  return 500;
}

export function createProjectProposalPostHandler(
  createClient = createSupabaseAccessTokenClient,
  createProposal = createProposalService,
) {
  return async function POST(
    request: Request,
    context: { params: Promise<{ projectId: string }> },
  ) {
    try {
      const params = projectIdParamSchema.parse(await context.params);
      const body = proposalActionSchema.parse(await request.json());
      const projectContext = await resolveAuthenticatedProjectContext(
        request,
        createClient,
      );
      const flowService = createFlowService(projectContext.service);
      const proposalService = createProposal(
        projectContext.service,
        flowService,
        {
          planner: planTrip,
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
        },
      );

      if (body.action === "adjust") {
        await proposalService.markProposalAdjusting(params.projectId);

        return NextResponse.json({
          success: true,
          projectId: params.projectId,
          stage: "proposal_adjusting",
        });
      }

      const result = await proposalService.generateFromProposal(params.projectId);

      return NextResponse.json({
        proposal: result.proposal,
        tripRequest: result.tripRequest,
        tripPlan: result.tripPlan,
        versionId: result.versionId,
        stage: "workspace_ready",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          toApiErrorResponse(
            new AppError("INVALID_INPUT", "Proposal action is missing or invalid."),
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

export const POST = createProjectProposalPostHandler();
