import { tripRequestSchema } from "../../trip/schema";
import { AppError } from "../../utils/errors";
import type { ProjectTripsFilters, TravelProjectTripSummary } from "./types";
import { createProjectTripsRepository } from "./repository";

type ProjectTripsRepository = ReturnType<typeof createProjectTripsRepository>;

function mapProjectSourceType(
  sourceType: string | null | undefined,
): "ai_generated" | "blank_manual" | "explore_import" | "file_import" {
  switch (sourceType) {
    case "explore_archive":
      return "explore_import";
    case "import_text":
    case "uploaded_file":
      return "file_import";
    case "blank_input":
      return "ai_generated";
    case "existing_trip":
    default:
      return "blank_manual";
  }
}

function mapLifecycleToStatus(
  state: TravelProjectTripSummary["lifecycleState"],
): "draft" | "saved" | "archived" {
  if (state === "archived") {
    return "archived";
  }

  if (state === "new" || state === "exploring" || state === "planning") {
    return "draft";
  }

  return "saved";
}

function matchesSearch(summary: TravelProjectTripSummary, search?: string) {
  const normalized = search?.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return (
    summary.title.toLowerCase().includes(normalized) ||
    summary.destinationCity?.toLowerCase().includes(normalized) === true
  );
}

function matchesStatus(summary: TravelProjectTripSummary, status?: ProjectTripsFilters["status"]) {
  if (!status || status === "all") {
    return true;
  }

  return mapLifecycleToStatus(summary.lifecycleState) === status;
}

function matchesSource(
  summary: TravelProjectTripSummary,
  sourceType?: ProjectTripsFilters["sourceType"],
) {
  if (!sourceType || sourceType === "all") {
    return true;
  }

  return mapProjectSourceType(summary.sourceType) === sourceType;
}

export function createProjectTripsService(repository: ProjectTripsRepository) {
  async function buildSummaryFromProject(project: {
    id: string;
    title: string;
    lifecycle_state: TravelProjectTripSummary["lifecycleState"];
    current_flow_stage: TravelProjectTripSummary["currentFlowStage"];
    current_version_id: string | null;
    updated_at: string;
    last_activity_at: string;
    created_at: string;
  }): Promise<TravelProjectTripSummary> {
    const currentVersion = project.current_version_id
      ? await repository.getCurrentVersion(project.id, project.current_version_id)
      : null;
    const sources = await repository.listSources(project.id);
    const latestSource = sources[0] ?? null;
    const snapshot = currentVersion?.trip_request_snapshot_json
      ? tripRequestSchema.safeParse(currentVersion.trip_request_snapshot_json)
      : null;
    const destinationCity =
      snapshot?.success === true
        ? snapshot.data.destinationCity
        : (typeof currentVersion?.trip_plan_json?.destination === "string"
            ? currentVersion.trip_plan_json.destination
            : null);
    const days =
      snapshot?.success === true
        ? snapshot.data.days
        : (typeof currentVersion?.trip_plan_json?.days === "number"
            ? currentVersion.trip_plan_json.days
            : null);
    const budget = snapshot?.success === true ? snapshot.data.budget : null;

    return {
      projectId: project.id,
      title: project.title,
      lifecycleState: project.lifecycle_state,
      currentFlowStage: project.current_flow_stage,
      currentVersionId: project.current_version_id,
      sourceType: latestSource?.source_type ?? null,
      destinationCity,
      startDate: snapshot?.success === true ? snapshot.data.startDate ?? null : null,
      endDate: snapshot?.success === true ? snapshot.data.endDate ?? null : null,
      days,
      budget,
      updatedAt: project.updated_at,
      lastActivityAt: project.last_activity_at,
      createdAt: project.created_at,
    } satisfies TravelProjectTripSummary;
  }

  return {
    async listUserProjects(
      userId: string,
      filters: ProjectTripsFilters = {},
    ): Promise<TravelProjectTripSummary[]> {
      const projects = await repository.listProjectsByUser(userId);
      const summaries = await Promise.all(
        projects.map((project) => buildSummaryFromProject(project)),
      );

      return summaries.filter(
        (summary) =>
          matchesSearch(summary, filters.search) &&
          matchesStatus(summary, filters.status) &&
          matchesSource(summary, filters.sourceType),
      );
    },
    async renameProject(projectId: string, title: string) {
      const normalizedTitle = title.trim();

      if (!normalizedTitle) {
        throw new AppError("INVALID_INPUT", "Project title cannot be empty.");
      }

      const updatedProject = await repository.updateProject(projectId, {
        title: normalizedTitle,
        last_activity_at: new Date().toISOString(),
      });

      if (!updatedProject) {
        throw new AppError("UNKNOWN_ERROR", `Travel project not found: ${projectId}`);
      }

      return buildSummaryFromProject(updatedProject);
    },
    async updateProjectLifecycle(
      projectId: string,
      lifecycleState: TravelProjectTripSummary["lifecycleState"],
    ) {
      const updatedProject = await repository.updateProject(projectId, {
        lifecycle_state: lifecycleState,
        last_activity_at: new Date().toISOString(),
      });

      if (!updatedProject) {
        throw new AppError("UNKNOWN_ERROR", `Travel project not found: ${projectId}`);
      }

      return buildSummaryFromProject(updatedProject);
    },
    async archiveProject(projectId: string) {
      return this.updateProjectLifecycle(projectId, "archived");
    },
    mapProjectSourceType,
    mapLifecycleToStatus,
  };
}
