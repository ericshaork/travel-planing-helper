import { AppError } from "../../utils/errors";
import type { ProjectService } from "../service";
import type {
  TravelProjectVersion,
  TravelProjectVersionStatus,
} from "../types";
import type {
  CreateManagedVersionInput,
  ManagedTravelProjectVersion,
  ManagedTravelProjectVersionStatus,
  ProjectVersionCollection,
} from "./version-types";

export interface ProjectVersionService {
  createVersion(
    projectId: string,
    input: CreateManagedVersionInput,
  ): Promise<ManagedTravelProjectVersion>;
  listVersions(projectId: string): Promise<ManagedTravelProjectVersion[]>;
  getVersion(
    projectId: string,
    versionId: string,
  ): Promise<ManagedTravelProjectVersion | null>;
  getCurrentVersion(projectId: string): Promise<ManagedTravelProjectVersion | null>;
  setCurrentVersion(
    projectId: string,
    versionId: string,
  ): Promise<ProjectVersionCollection>;
}

function toManagedStatus(
  status: TravelProjectVersionStatus,
): ManagedTravelProjectVersionStatus {
  switch (status) {
    case "proposed":
      return "proposed";
    case "draft":
      return "archived";
    case "accepted":
    default:
      return "active";
  }
}

function toStorageStatus(
  status: ManagedTravelProjectVersionStatus,
): TravelProjectVersionStatus {
  switch (status) {
    case "proposed":
      return "proposed";
    case "archived":
      return "draft";
    case "active":
    default:
      return "accepted";
  }
}

function toManagedVersion(
  version: TravelProjectVersion,
): ManagedTravelProjectVersion {
  return {
    ...version,
    managedStatus: toManagedStatus(version.versionStatus),
  };
}

function toProjectNotFound(projectId: string) {
  return new AppError(
    "UNKNOWN_ERROR",
    `Travel project not found: ${projectId}`,
  );
}

export function createProjectVersionService(
  projectService: ProjectService,
): ProjectVersionService {
  return {
    async createVersion(projectId, input) {
      const detail = await projectService.getProject(projectId);

      if (!detail) {
        throw toProjectNotFound(projectId);
      }

      const version = await projectService.createProjectVersion(projectId, {
        versionStatus: toStorageStatus(input.managedStatus ?? "active"),
        createdFrom: input.createdFrom ?? null,
        tripPlan: input.tripPlan,
        tripRequestSnapshot: input.tripRequestSnapshot ?? null,
        proposalSummary: input.proposalSummary ?? null,
        createdBy: input.createdBy ?? null,
        setAsCurrent: input.setAsCurrent ?? input.managedStatus === "active",
      });

      return toManagedVersion(version);
    },

    async listVersions(projectId) {
      const detail = await projectService.getProject(projectId);

      if (!detail) {
        throw toProjectNotFound(projectId);
      }

      const versions = await projectService.listProjectVersions(projectId);
      return versions.map(toManagedVersion);
    },

    async getVersion(projectId, versionId) {
      const detail = await projectService.getProject(projectId);

      if (!detail) {
        throw toProjectNotFound(projectId);
      }

      const version = await projectService.getProjectVersion(projectId, versionId);
      return version ? toManagedVersion(version) : null;
    },

    async getCurrentVersion(projectId) {
      const detail = await projectService.getProject(projectId);

      if (!detail) {
        throw toProjectNotFound(projectId);
      }

      return detail.currentVersion ? toManagedVersion(detail.currentVersion) : null;
    },

    async setCurrentVersion(projectId, versionId) {
      const detail = await projectService.getProject(projectId);

      if (!detail) {
        throw toProjectNotFound(projectId);
      }

      const targetVersion = await projectService.getProjectVersion(projectId, versionId);

      if (!targetVersion) {
        throw new AppError(
          "UNKNOWN_ERROR",
          `Travel project version not found: ${projectId}/${versionId}`,
        );
      }

      const updatedProject = await projectService.updateProjectState(projectId, {
        currentVersionId: versionId,
        touchActivity: true,
      });

      if (!updatedProject) {
        throw toProjectNotFound(projectId);
      }

      const versions = await projectService.listProjectVersions(projectId);

      return {
        project: updatedProject,
        currentVersion: toManagedVersion(targetVersion),
        versions: versions.map(toManagedVersion),
      };
    },
  };
}
