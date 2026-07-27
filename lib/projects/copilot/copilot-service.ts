import { createConversationContext } from "../conversation/conversation-context";
import { createConversationService } from "../conversation/conversation-service";
import type { ConversationService } from "../conversation/conversation-service";
import type { AIFlowStage } from "../flow/flow-types";
import { createProposalService } from "../proposal/proposal-service";
import type { UserPreferenceContext } from "../../ai/user-preference-context";
import { AppError } from "../../utils/errors";
import type { FlowService } from "../flow/flow-service";
import type { ProjectService } from "../service";
import type { CopilotResponsePayload } from "./copilot-types";

export interface CopilotService {
  handleMessage(
    projectId: string,
    message: string,
    options?: {
      userPreferenceContext?: UserPreferenceContext | null;
    },
  ): Promise<CopilotResponsePayload>;
}

function toProjectNotFound(projectId: string) {
  return new AppError(
    "UNKNOWN_ERROR",
    `Travel project not found: ${projectId}`,
  );
}

function getCurrentStage(
  stage: AIFlowStage | null | undefined,
): AIFlowStage {
  return stage ?? "source_received";
}

export function createCopilotService(
  projectService: ProjectService,
  flowService: FlowService,
  conversationService: ConversationService = createConversationService(),
): CopilotService {
  return {
    async handleMessage(projectId, message, options) {
      const trimmedMessage = message.trim();

      if (!trimmedMessage) {
        throw new AppError("INVALID_INPUT", "Copilot message cannot be empty.");
      }

      const detail = await projectService.getProject(projectId);

      if (!detail) {
        throw toProjectNotFound(projectId);
      }

      await projectService.appendProjectMessage(projectId, {
        role: "user",
        content: trimmedMessage,
      });

      const currentStage = getCurrentStage(detail.project.currentFlowStage);
      let effectiveStage: AIFlowStage = currentStage;

      if (currentStage === "abandoned") {
        const resumeResult = await flowService.resumeFlow(projectId);

        if (resumeResult.resumeStage !== resumeResult.currentStage) {
          const resumedContext = await flowService.moveFlowStage(
            projectId,
            resumeResult.resumeStage,
          );
          effectiveStage = resumedContext.currentStage;
        } else {
          effectiveStage = resumeResult.currentStage;
        }
      } else if (currentStage === "source_received") {
        const nextContext = await flowService.moveFlowStage(
          projectId,
          "source_review",
        );
        effectiveStage = nextContext.currentStage;
      }

      const recentMessages = await projectService.listProjectMessages(projectId, {
        limit: 12,
      });
      const conversationContext = createConversationContext({
        project: {
          ...detail.project,
          currentFlowStage: effectiveStage,
        },
        currentStage: effectiveStage,
        recentMessages,
        sources: detail.sources,
        userPreferenceContext: options?.userPreferenceContext ?? null,
      });
      const response = await conversationService.processMessage(
        trimmedMessage,
        conversationContext,
      );

      if (response.nextStage && response.nextStage !== effectiveStage) {
        const movedContext = await flowService.moveFlowStage(
          projectId,
          response.nextStage,
        );
        effectiveStage = movedContext.currentStage;
      }

      if (
        response.action === "create_proposal" &&
        response.nextStage === "proposal_ready" &&
        currentStage !== "proposal_ready" &&
        effectiveStage === "proposal_ready"
      ) {
        const proposalService = createProposalService(projectService, flowService);
        await proposalService.createProposal(projectId);
      }

      await projectService.appendProjectMessage(projectId, {
        role: "assistant",
        content: response.reply,
      });

      return {
        success: true,
        projectId,
        stage: effectiveStage,
        reply: response.reply,
      };
    },
  };
}
