import { AppError } from "../utils/errors";
import { createProjectRepository } from "./repository";
import {
  buildMessageInsertRow,
  buildSourceInsertRow,
  buildVersionInsertRow,
  messageRowToDomain,
  projectRowToDomain,
  sourceRowToDomain,
  versionRowToDomain,
} from "./rows";
import type {
  CreateMessageInput,
  CreateProjectInput,
  CreateSourceInput,
  CreateVersionInput,
  UpdateProjectStateInput,
} from "./schema";
import type {
  TravelProject,
  TravelProjectMessage,
  TravelProjectSource,
  TravelProjectVersion,
} from "./types";

type ProjectRepository = ReturnType<typeof createProjectRepository>;

export interface ProjectDetail {
  project: TravelProject;
  currentVersion: TravelProjectVersion | null;
  sources: TravelProjectSource[];
}

export interface ProjectService {
  createProject: (
    userId: string,
    input: CreateProjectInput,
  ) => Promise<TravelProject>;
  getProject: (projectId: string) => Promise<ProjectDetail | null>;
  updateProjectState: (
    projectId: string,
    input: UpdateProjectStateInput,
  ) => Promise<TravelProject | null>;
  createProjectVersion: (
    projectId: string,
    input: CreateVersionInput,
  ) => Promise<TravelProjectVersion>;
  listProjectVersions: (projectId: string) => Promise<TravelProjectVersion[]>;
  getProjectVersion: (
    projectId: string,
    versionId: string,
  ) => Promise<TravelProjectVersion | null>;
  addProjectSource: (
    projectId: string,
    input: CreateSourceInput,
  ) => Promise<TravelProjectSource>;
  listProjectSources: (projectId: string) => Promise<TravelProjectSource[]>;
  appendProjectMessage: (
    projectId: string,
    input: CreateMessageInput,
  ) => Promise<TravelProjectMessage>;
  listProjectMessages: (
    projectId: string,
    options?: { limit?: number },
  ) => Promise<TravelProjectMessage[]>;
}

function toUnknownError(error: unknown, fallback: string) {
  return error instanceof AppError
    ? error
    : new AppError("UNKNOWN_ERROR", fallback, error);
}

export function createProjectService(
  repository: ProjectRepository,
): ProjectService {
  return {
    async createProject(userId, input) {
      try {
        const now = new Date().toISOString();
        const projectRow = await repository.insertProject({
          user_id: userId,
          title: input.title,
          lifecycle_state: input.initialMetadata?.lifecycleState ?? "new",
          current_flow_stage: input.initialMetadata?.flowStage ?? null,
          last_activity_at: now,
        });

        await repository.insertSource(
          buildSourceInsertRow({
            project_id: projectRow.id,
            source_type: input.sourceType,
            source_title: input.initialMetadata?.sourceTitle ?? null,
            source_payload_json: input.initialMetadata?.sourcePayload ?? {},
          }),
        );

        return projectRowToDomain(projectRow);
      } catch (error) {
        throw toUnknownError(error, "鏆傛椂杩樻病鍒涘缓鎴愬姛杩欎釜鏃呰椤圭洰銆?");
      }
    },

    async getProject(projectId) {
      try {
        const projectRow = await repository.getProjectById(projectId);

        if (!projectRow) {
          return null;
        }

        const currentVersionRow = projectRow.current_version_id
          ? await repository.getVersionById(projectId, projectRow.current_version_id)
          : null;
        const sourceRows = await repository.listSources(projectId);

        return {
          project: projectRowToDomain(projectRow),
          currentVersion: currentVersionRow
            ? versionRowToDomain(currentVersionRow)
            : null,
          sources: sourceRows.map(sourceRowToDomain),
        };
      } catch (error) {
        throw toUnknownError(error, "鏆傛椂鎷夸笉鍒拌繖涓棶琛岄」鐩€?");
      }
    },

    async updateProjectState(projectId, input) {
      try {
        const patch = {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.lifecycleState !== undefined
            ? { lifecycle_state: input.lifecycleState }
            : {}),
          ...(input.currentFlowStage !== undefined
            ? { current_flow_stage: input.currentFlowStage }
            : {}),
          ...(input.currentVersionId !== undefined
            ? { current_version_id: input.currentVersionId }
            : {}),
          ...(input.touchActivity ? { last_activity_at: new Date().toISOString() } : {}),
        };
        const row = await repository.updateProjectState(projectId, patch);

        return row ? projectRowToDomain(row) : null;
      } catch (error) {
        throw toUnknownError(error, "鏆傛椂鏇存柊涓嶄簡杩欎釜鏃呰椤圭洰鐨勭姸鎬併€?");
      }
    },

    async createProjectVersion(projectId, input) {
      try {
        const projectRow = await repository.getProjectById(projectId);

        if (!projectRow) {
          throw new AppError("UNKNOWN_ERROR", "杩欎釜鏃呰椤圭洰鏆傛椂涓嶅瓨鍦ㄣ€?");
        }

        const versions = await repository.listVersions(projectId);
        const maxVersionNumber = versions.reduce(
          (max, item) => Math.max(max, item.version_number),
          0,
        );
        const nextVersionNumber = maxVersionNumber + 1;
        const versionRow = await repository.insertVersion(
          buildVersionInsertRow({
            project_id: projectId,
            version_number: nextVersionNumber,
            version_status: input.versionStatus ?? "accepted",
            created_from: input.createdFrom ?? null,
            trip_plan_json: input.tripPlan as unknown as Record<string, unknown>,
            trip_request_snapshot_json: (input.tripRequestSnapshot ??
              null) as Record<string, unknown> | null,
            proposal_summary_json: input.proposalSummary ?? null,
            created_by: input.createdBy ?? null,
          }),
        );
        const shouldSetAsCurrent = input.setAsCurrent ?? true;

        await repository.updateProjectState(projectId, {
          ...(shouldSetAsCurrent ? { current_version_id: versionRow.id } : {}),
          last_activity_at: new Date().toISOString(),
        });

        return versionRowToDomain(versionRow);
      } catch (error) {
        throw toUnknownError(error, "鏆傛椂杩樻病淇濆瓨鎴愬姛杩欎釜鏃呰鐗堟湰銆?");
      }
    },

    async listProjectVersions(projectId) {
      try {
        const rows = await repository.listVersions(projectId);
        return rows.map(versionRowToDomain);
      } catch (error) {
        throw toUnknownError(error, "鏆傛椂鎷夸笉鍒拌繖涓」鐩殑鐗堟湰鍘嗗彶銆?");
      }
    },

    async getProjectVersion(projectId, versionId) {
      try {
        const row = await repository.getVersionById(projectId, versionId);
        return row ? versionRowToDomain(row) : null;
      } catch (error) {
        throw toUnknownError(error, "鏆傛椂鎵撲笉寮€杩欎釜鏃呰鐗堟湰銆?");
      }
    },

    async addProjectSource(projectId, input) {
      try {
        const row = await repository.insertSource(
          buildSourceInsertRow({
            project_id: projectId,
            source_type: input.sourceType,
            source_title: input.title ?? null,
            source_payload_json: input.payload ?? {},
          }),
        );

        return sourceRowToDomain(row);
      } catch (error) {
        throw toUnknownError(error, "鏆傛椂杩樻病璁板綍鎴愬姛杩欐潯鏉ユ簮淇℃伅銆?");
      }
    },

    async listProjectSources(projectId) {
      try {
        const rows = await repository.listSources(projectId);
        return rows.map(sourceRowToDomain);
      } catch (error) {
        throw toUnknownError(error, "鏆傛椂鎷夸笉鍒拌繖涓」鐩殑鏉ユ簮璁板綍銆?");
      }
    },

    async appendProjectMessage(projectId, input) {
      try {
        const row = await repository.insertMessage(
          buildMessageInsertRow({
            project_id: projectId,
            role: input.role,
            content: input.content,
          }),
        );

        await repository.updateProjectState(projectId, {
          last_activity_at: new Date().toISOString(),
        });

        return messageRowToDomain(row);
      } catch (error) {
        throw toUnknownError(error, "鏆傛椂杩樻病淇濆瓨鎴愬姛杩欐潯椤圭洰瀵硅瘽銆?");
      }
    },

    async listProjectMessages(projectId, options) {
      try {
        const rows = await repository.listMessages(projectId, options);
        return rows.map(messageRowToDomain);
      } catch (error) {
        throw toUnknownError(error, "鏆傛椂鎷夸笉鍒拌繖涓」鐩殑瀵硅瘽璁板綍銆?");
      }
    },
  };
}
