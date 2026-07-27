import { createConversationContext } from "../conversation/conversation-context";
import { createConversationService } from "../conversation/conversation-service";
import type { ConversationService } from "../conversation/conversation-service";
import { createFlowService } from "../flow/flow-service";
import type { FlowService } from "../flow/flow-service";
import type { ProjectService } from "../service";
import { createProjectVersionService } from "../version/version-service";
import type { ProjectVersionService } from "../version/version-service";
import type { UserSettings } from "../../settings/types";
import { planTrip } from "../../trip/planner";
import type { GenerateTripResponse } from "../../trip/types";
import { AppError } from "../../utils/errors";
import type {
  WorkspaceAiGenerationResult,
  WorkspaceAiVersionMetadata,
} from "./workspace-ai-types";

type TripPlanner = typeof planTrip;

interface WorkspaceAiDependencies {
  planner?: TripPlanner;
  flowService?: FlowService;
  conversationService?: ConversationService;
  versionService?: ProjectVersionService;
  resolveUserSettings?: () => Promise<UserSettings | null>;
}

export interface WorkspaceAiService {
  applyModification(
    projectId: string,
    versionId: string,
    modificationRequest: string,
  ): Promise<WorkspaceAiGenerationResult>;
}

function buildAppliedChanges(modificationRequest: string) {
  return [modificationRequest.trim()].filter(Boolean);
}

function toProjectNotFound(projectId: string) {
  return new AppError(
    "UNKNOWN_ERROR",
    `Travel project not found: ${projectId}`,
  );
}

function toVersionNotFound(projectId: string, versionId: string) {
  return new AppError(
    "UNKNOWN_ERROR",
    `Travel project version not found: ${projectId}/${versionId}`,
  );
}

function toWorkspaceStage(stage: string | null | undefined) {
  return stage ?? "workspace_ready";
}

export function createWorkspaceAiService(
  projectService: ProjectService,
  dependencies: WorkspaceAiDependencies = {},
): WorkspaceAiService {
  const planner = dependencies.planner ?? planTrip;
  const flowService = dependencies.flowService ?? createFlowService(projectService);
  const conversationService =
    dependencies.conversationService ?? createConversationService();
  const versionService =
    dependencies.versionService ?? createProjectVersionService(projectService);
  const resolveUserSettings =
    dependencies.resolveUserSettings ?? (async () => null);

  return {
    async applyModification(projectId, versionId, modificationRequest) {
      const trimmedRequest = modificationRequest.trim();

      if (!trimmedRequest) {
        throw new AppError("INVALID_INPUT", "Modification request cannot be empty.");
      }

      const detail = await projectService.getProject(projectId);

      if (!detail) {
        throw toProjectNotFound(projectId);
      }

      const currentVersion = await versionService.getVersion(projectId, versionId);

      if (!currentVersion) {
        throw toVersionNotFound(projectId, versionId);
      }

      if (!currentVersion.tripRequestSnapshot) {
        throw new AppError(
          "INVALID_INPUT",
          "Current version is missing trip request context.",
        );
      }

      await projectService.appendProjectMessage(projectId, {
        role: "user",
        content: trimmedRequest,
      });

      const recentMessages = await projectService.listProjectMessages(projectId, {
        limit: 16,
      });
      const conversationContext = createConversationContext({
        project: detail.project,
        currentStage:
          (detail.project.currentFlowStage ?? "workspace_ready") === "abandoned"
            ? "workspace_ready"
            : (detail.project.currentFlowStage ?? "workspace_ready"),
        recentMessages,
        sources: detail.sources,
      });
      const conversationResponse = await conversationService.processMessage(
        trimmedRequest,
        conversationContext,
      );

      let effectiveStage = toWorkspaceStage(detail.project.currentFlowStage);

      if (detail.project.currentFlowStage === "abandoned") {
        const resumed = await flowService.resumeFlow(projectId);
        effectiveStage = resumed.resumeStage;
      }

      const generation = (await planner(
        {
          tripRequest: currentVersion.tripRequestSnapshot,
          previousPlan: currentVersion.tripPlan,
          modificationRequest: trimmedRequest,
        },
        {
          userSettings: await resolveUserSettings(),
        },
      )) as GenerateTripResponse;

      const versionMetadata: WorkspaceAiVersionMetadata = {
        parentVersionId: currentVersion.id,
        changeReason: trimmedRequest,
        assistantReply: conversationResponse.reply,
        conversationIntent: conversationResponse.intent,
        conversationAction: conversationResponse.action,
      };

      const nextVersion = await versionService.createVersion(projectId, {
        managedStatus: "active",
        createdFrom: "ai_adjust",
        tripPlan: generation.tripPlan,
        tripRequestSnapshot: currentVersion.tripRequestSnapshot,
        proposalSummary: {
          workspaceAi: versionMetadata,
        },
        createdBy: "assistant",
        setAsCurrent: true,
      });

      if (effectiveStage !== "workspace_ready") {
        await projectService.updateProjectState(projectId, {
          currentFlowStage: "workspace_ready",
          lifecycleState: "workspace",
          touchActivity: true,
        });
      } else {
        await projectService.updateProjectState(projectId, {
          currentVersionId: nextVersion.id,
          lifecycleState: "workspace",
          touchActivity: true,
        });
      }

      await projectService.appendProjectMessage(projectId, {
        role: "assistant",
        content: conversationResponse.reply,
      });

      return {
        success: true,
        projectId,
        versionId: nextVersion.id,
        previousVersionId: currentVersion.id,
        stage: "workspace_ready",
        reply: conversationResponse.reply,
        tripPlan: generation.tripPlan,
        tripRequest: currentVersion.tripRequestSnapshot,
        appliedChanges:
          generation.appliedChanges && generation.appliedChanges.length > 0
            ? generation.appliedChanges
            : buildAppliedChanges(trimmedRequest),
        warnings: generation.warnings,
        intent: conversationResponse.intent,
        action: conversationResponse.action,
      };
    },
  };
}
