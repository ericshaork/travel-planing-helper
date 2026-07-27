import type {
  SavedTripMetadata,
  WorkspaceSessionMetadata,
} from "../trip/storage";
import type {
  TripPlan,
  TripPlanDraft,
  TripRequest,
  TripRequestDraft,
  TripSourceType,
} from "../trip/types";
import type {
  TravelProject,
  TravelProjectFlowStage,
  TravelProjectLifecycleState,
  TravelProjectSource,
  TravelProjectSourceType,
  TravelProjectVersion,
  TravelProjectVersionReason,
  TravelProjectVersionStatus,
} from "./types";

export interface TravelProjectCompatInput {
  tripPlan: TripPlan;
  tripRequest?: TripRequest | TripRequestDraft | null;
  tripPlanDraft?: TripPlanDraft | null;
  workspaceSession?: WorkspaceSessionMetadata | null;
  savedTripMetadata?: SavedTripMetadata | null;
  now?: string;
}

export interface TravelProjectCompatView {
  project: TravelProject;
  currentVersion: TravelProjectVersion;
  source: TravelProjectSource;
}

function buildLegacyProjectId(input: TravelProjectCompatInput) {
  const savedTripId = input.savedTripMetadata?.savedTripId?.trim();

  if (savedTripId) {
    return `legacy-saved-trip:${savedTripId}`;
  }

  const localDraftId = input.workspaceSession?.localDraftId?.trim();

  if (localDraftId) {
    return `legacy-workspace:${localDraftId}`;
  }

  return `legacy-plan:${slugifyTitle(input.tripPlan.tripTitle)}`;
}

function slugifyTitle(title: string) {
  const normalized = title.trim().toLowerCase().replace(/\s+/g, "-");
  return normalized || "untitled";
}

function buildLegacyVersionId(projectId: string) {
  return `${projectId}:version:1`;
}

function buildLegacySourceId(projectId: string) {
  return `${projectId}:source:1`;
}

function pickSourceType(
  tripPlanDraft?: TripPlanDraft | null,
  workspaceSession?: WorkspaceSessionMetadata | null,
): TravelProjectSourceType {
  const legacySource =
    tripPlanDraft?.sourceType ?? mapWorkspaceSourceType(workspaceSession);

  return mapLegacySourceTypeToProjectSourceType(legacySource);
}

function mapWorkspaceSourceType(
  workspaceSession?: WorkspaceSessionMetadata | null,
): TripSourceType {
  switch (workspaceSession?.sourceType) {
    case "blank_manual":
      return "blank_manual";
    case "explore_import":
      return "explore_archive";
    case "saved_trip":
      return "user_created";
    case "ai_generated":
    default:
      return "ai_generated";
  }
}

function pickLifecycleState(
  workspaceSession?: WorkspaceSessionMetadata | null,
): TravelProjectLifecycleState {
  if (workspaceSession?.sourceType === "blank_manual") {
    return "editing";
  }

  return "workspace";
}

function pickFlowStage(
  workspaceSession?: WorkspaceSessionMetadata | null,
): TravelProjectFlowStage {
  if (workspaceSession?.sourceType === "blank_manual") {
    return "workspace_ready";
  }

  return "workspace_ready";
}

function pickVersionStatus(
  workspaceSession?: WorkspaceSessionMetadata | null,
): TravelProjectVersionStatus {
  if (workspaceSession?.sourceType === "blank_manual") {
    return "draft";
  }

  return "accepted";
}

function pickVersionReason(
  sourceType: TravelProjectSourceType,
  workspaceSession?: WorkspaceSessionMetadata | null,
): TravelProjectVersionReason {
  if (workspaceSession?.sourceType === "blank_manual") {
    return "manual_edit";
  }

  switch (sourceType) {
    case "explore_archive":
      return "template_import";
    case "import_text":
    case "uploaded_file":
    case "existing_trip":
      return "import_transform";
    case "blank_input":
    default:
      return "ai_generate";
  }
}

function buildSourcePayload(
  input: TravelProjectCompatInput,
): Record<string, unknown> {
  return {
    tripRequest: input.tripRequest ?? null,
    sourceExploreId: input.tripPlanDraft?.sourceExploreId ?? null,
    sourceExploreSlug: input.tripPlanDraft?.sourceExploreSlug ?? null,
    savedTripId: input.savedTripMetadata?.savedTripId ?? null,
  };
}

export function mapLegacySourceTypeToProjectSourceType(
  sourceType?: TripSourceType | null,
): TravelProjectSourceType {
  switch (sourceType) {
    case "explore_archive":
    case "explore_inspiration":
      return "explore_archive";
    case "user_created":
      return "existing_trip";
    case "blank_manual":
    case "manual":
    case "ai_generate":
    case "ai_generated":
    default:
      return "blank_input";
  }
}

export function buildTravelProjectCompatView(
  input: TravelProjectCompatInput,
): TravelProjectCompatView {
  const now = input.now ?? new Date().toISOString();
  const projectId = buildLegacyProjectId(input);
  const versionId = buildLegacyVersionId(projectId);
  const sourceId = buildLegacySourceId(projectId);
  const sourceType = pickSourceType(
    input.tripPlanDraft,
    input.workspaceSession,
  );
  const lifecycleState = pickLifecycleState(input.workspaceSession);
  const flowStage = pickFlowStage(input.workspaceSession);
  const versionStatus = pickVersionStatus(input.workspaceSession);
  const versionReason = pickVersionReason(sourceType, input.workspaceSession);

  return {
    project: {
      id: projectId,
      userId: null,
      title: input.tripPlan.tripTitle,
      lifecycleState,
      currentFlowStage: flowStage,
      currentVersionId: versionId,
      lastActivityAt: now,
      createdAt: input.workspaceSession?.createdAt ?? now,
      updatedAt: now,
    },
    currentVersion: {
      id: versionId,
      projectId,
      versionNumber: 1,
      versionStatus,
      createdFrom: versionReason,
      tripPlan: input.tripPlan,
      tripRequestSnapshot:
        isCompleteTripRequest(input.tripRequest) ? input.tripRequest : null,
      createdAt: input.workspaceSession?.createdAt ?? now,
      updatedAt: now,
    },
    source: {
      id: sourceId,
      projectId,
      sourceType,
      title: input.tripPlan.tripTitle,
      payload: buildSourcePayload(input),
      createdAt: input.workspaceSession?.createdAt ?? now,
      updatedAt: now,
    },
  };
}

function isCompleteTripRequest(
  value: TripRequest | TripRequestDraft | null | undefined,
): value is TripRequest {
  if (!value) {
    return false;
  }

  return (
    typeof value.departureCity === "string" &&
    typeof value.destinationCity === "string" &&
    typeof value.days === "number" &&
    typeof value.budget === "number" &&
    typeof value.currency === "string" &&
    Array.isArray(value.interests) &&
    Array.isArray(value.travelStyles) &&
    Array.isArray(value.mustVisitPlaces) &&
    Array.isArray(value.avoidPlaces)
  );
}
