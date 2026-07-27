import type {
  TravelProjectMessageInsert,
  TravelProjectMessageRow,
  TravelProjectRow,
  TravelProjectSourceInsert,
  TravelProjectSourceRow,
  TravelProjectVersionInsert,
  TravelProjectVersionRow,
} from "../supabase/types";
import type {
  TravelProject,
  TravelProjectMessage,
  TravelProjectSource,
  TravelProjectVersion,
} from "./types";
import { tripPlanSchema, tripRequestSchema } from "../trip/schema";

export function projectRowToDomain(row: TravelProjectRow): TravelProject {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    lifecycleState: row.lifecycle_state,
    currentFlowStage: row.current_flow_stage,
    currentVersionId: row.current_version_id,
    lastActivityAt: row.last_activity_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function versionRowToDomain(
  row: TravelProjectVersionRow,
): TravelProjectVersion {
  return {
    id: row.id,
    projectId: row.project_id,
    versionNumber: row.version_number,
    versionStatus: row.version_status,
    createdFrom: row.created_from,
    tripPlan: tripPlanSchema.parse(row.trip_plan_json),
    tripRequestSnapshot: row.trip_request_snapshot_json
      ? tripRequestSchema.parse(row.trip_request_snapshot_json)
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function sourceRowToDomain(
  row: TravelProjectSourceRow,
): TravelProjectSource {
  return {
    id: row.id,
    projectId: row.project_id,
    sourceType: row.source_type,
    title: row.source_title,
    payload: row.source_payload_json,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function messageRowToDomain(
  row: TravelProjectMessageRow,
): TravelProjectMessage {
  return {
    id: row.id,
    projectId: row.project_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  };
}

export function buildVersionInsertRow(
  input: TravelProjectVersionInsert,
): TravelProjectVersionInsert {
  return {
    ...input,
    trip_plan_json: tripPlanSchema.parse(
      input.trip_plan_json,
    ) as unknown as Record<string, unknown>,
    trip_request_snapshot_json: input.trip_request_snapshot_json
      ? (tripRequestSchema.parse(
          input.trip_request_snapshot_json,
        ) as unknown as Record<string, unknown>)
      : input.trip_request_snapshot_json ?? null,
    proposal_summary_json: input.proposal_summary_json ?? null,
    created_by: input.created_by ?? null,
  };
}

export function buildSourceInsertRow(
  input: TravelProjectSourceInsert,
): TravelProjectSourceInsert {
  return {
    ...input,
    source_title: input.source_title ?? null,
    source_payload_json: input.source_payload_json ?? {},
  };
}

export function buildMessageInsertRow(
  input: TravelProjectMessageInsert,
): TravelProjectMessageInsert {
  return {
    ...input,
    content: input.content.trim(),
  };
}
