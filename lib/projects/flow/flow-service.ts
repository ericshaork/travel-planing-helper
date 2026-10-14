import type {
  CreateProjectInput,
  UpdateProjectStateInput,
} from "../schema";
import type { ProjectDetail, ProjectService } from "../service";
import { AppError } from "../../utils/errors";
import { createFlowContext } from "./flow-context";
import { transitionStage } from "./flow-transition";
import type { AIFlowStage, FlowRuntimeContext } from "./flow-types";

interface InitializeFlowInput {
  userId: string;
  title: string;
  sourceType: CreateProjectInput["sourceType"];
  sourceTitle?: string | null;
  sourcePayload?: Record<string, unknown> | null;
  lifecycleState?: CreateProjectInput["initialMetadata"] extends infer T
    ? T extends { lifecycleState?: infer U }
      ? U
      : never
    : never;
}

export interface FlowResumeResult {
  currentStage: AIFlowStage;
  resumeStage: AIFlowStage;
  resumedFromAbandoned: boolean;
}

export interface FlowService {
  initializeFlow(input: InitializeFlowInput): Promise<FlowRuntimeContext>;
  moveFlowStage(
    projectId: string,
    nextStage: AIFlowStage,
  ): Promise<FlowRuntimeContext>;
  abandonFlow(projectId: string): Promise<FlowRuntimeContext>;
  resumeFlow(projectId: string): Promise<FlowResumeResult>;
}

function getCurrentStage(detail: ProjectDetail): AIFlowStage {
  return (detail.project.currentFlowStage ?? "source_received") as AIFlowStage;
}

function toProjectNotFound(projectId: string) {
  return new AppError(
    "UNKNOWN_ERROR",
    `Travel project not found: ${projectId}`,
  );
}

function buildContext(detail: ProjectDetail, metadata?: Record<string, unknown>) {
  return createFlowContext({
    project: detail.project,
    messages: [],
    sources: detail.sources,
    metadata: {
      sourceCount: detail.sources.length,
      ...metadata,
    },
  });
}

function toStatePatch(stage: AIFlowStage): UpdateProjectStateInput {
  return {
    currentFlowStage: stage,
    touchActivity: true,
  };
}

function resolveResumeStage(stage: AIFlowStage): AIFlowStage {
  if (stage !== "abandoned") {
    return stage;
  }

  return "source_review";
}

export function createFlowService(projectService: ProjectService): FlowService {
  return {
    async initializeFlow(input) {
      const project = await projectService.createProject(input.userId, {
        title: input.title,
        sourceType: input.sourceType,
        initialMetadata: {
          lifecycleState: input.lifecycleState ?? "planning",
          flowStage: "source_received",
          sourceTitle: input.sourceTitle ?? null,
          sourcePayload: input.sourcePayload ?? {},
        },
      });

      const detail = await projectService.getProject(project.id);

      if (!detail) {
        throw toProjectNotFound(project.id);
      }

      return buildContext(detail);
    },

    async moveFlowStage(projectId, nextStage) {
      const detail = await projectService.getProject(projectId);

      if (!detail) {
        throw toProjectNotFound(projectId);
      }

      const currentStage = getCurrentStage(detail);
      const result = transitionStage(currentStage, nextStage);

      if (!result.ok) {
        throw new AppError(
          "INVALID_INPUT",
          result.reason ?? "Illegal flow transition.",
        );
      }

      const updatedProject = await projectService.updateProjectState(
        projectId,
        toStatePatch(nextStage),
      );

      if (!updatedProject) {
        throw toProjectNotFound(projectId);
      }

      return createFlowContext({
        project: updatedProject,
        messages: [],
        sources: detail.sources,
        metadata: {
          sourceCount: detail.sources.length,
        },
      });
    },

    async abandonFlow(projectId) {
      const detail = await projectService.getProject(projectId);

      if (!detail) {
        throw toProjectNotFound(projectId);
      }

      const currentStage = getCurrentStage(detail);
      const result = transitionStage(currentStage, "abandoned");

      if (!result.ok) {
        throw new AppError(
          "INVALID_INPUT",
          result.reason ?? "Flow cannot be abandoned from current stage.",
        );
      }

      const updatedProject = await projectService.updateProjectState(projectId, {
        currentFlowStage: "abandoned",
        touchActivity: true,
      });

      if (!updatedProject) {
        throw toProjectNotFound(projectId);
      }

      return createFlowContext({
        project: updatedProject,
        messages: [],
        sources: detail.sources,
        metadata: {
          sourceCount: detail.sources.length,
        },
      });
    },

    async resumeFlow(projectId) {
      const detail = await projectService.getProject(projectId);

      if (!detail) {
        throw toProjectNotFound(projectId);
      }

      const currentStage = getCurrentStage(detail);
      const resumeStage = resolveResumeStage(currentStage);

      return {
        currentStage,
        resumeStage,
        resumedFromAbandoned: currentStage === "abandoned",
      };
    },
  };
}
