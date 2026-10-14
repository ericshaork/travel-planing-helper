import { createSupabaseServiceRoleClient } from "../../../lib/supabase/server.ts";
import type { EvidencePack } from "../data-hub/evidencePackService";
import { stripUnsafeProductData } from "../data-hub/productDataHubService.ts";

interface InsertBuilderLike {
  insert(values: AiPlanEvidenceInsert[]): PromiseLike<{ error: unknown }>;
}

interface AiEvidenceClientLike {
  from(table: "ai_plan_evidence"): InsertBuilderLike;
}

export interface AiPlanEvidenceInsert {
  trip_id: string | null;
  place_id: string | null;
  source_type: string | null;
  source_id: string | null;
  reason: string | null;
}

export interface RecordAiPlanEvidenceInput {
  tripId?: string | null;
  evidencePack: EvidencePack | null;
  reason?: string;
}

export interface AiEvidenceRecorder {
  recordAiPlanEvidence(input: RecordAiPlanEvidenceInput): Promise<{
    attempted: number;
    inserted: number;
  }>;
}

function isUuid(value: string | null | undefined): value is string {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
  );
}

function uniqueRows(rows: AiPlanEvidenceInsert[]): AiPlanEvidenceInsert[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = [
      row.trip_id ?? "",
      row.place_id ?? "",
      row.source_type ?? "",
      row.source_id ?? "",
      row.reason ?? "",
    ].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildAiPlanEvidenceRows(
  input: RecordAiPlanEvidenceInput,
): AiPlanEvidenceInsert[] {
  const pack = input.evidencePack;
  if (!pack) return [];

  const reason = input.reason ?? "ai_plan_generation";
  const rows: AiPlanEvidenceInsert[] = [];

  for (const place of pack.places) {
    rows.push({
      trip_id: input.tripId ?? null,
      place_id: place.place.id,
      source_type: "place_profile",
      source_id: null,
      reason,
    });

    for (const source of place.sources) {
      rows.push({
        trip_id: input.tripId ?? null,
        place_id: place.place.id,
        source_type: String(source.provider),
        source_id: isUuid(source.externalId) ? source.externalId : null,
        reason: source.fieldName ? `${reason}:${source.fieldName}` : reason,
      });
    }
  }

  for (const source of pack.weatherContext.map((weather) => weather.source)) {
    rows.push({
      trip_id: input.tripId ?? null,
      place_id: null,
      source_type: String(source.provider),
      source_id: isUuid(source.externalId) ? source.externalId : null,
      reason: source.fieldName ? `${reason}:${source.fieldName}` : reason,
    });
  }

  for (const route of pack.routeEstimates) {
    rows.push({
      trip_id: input.tripId ?? null,
      place_id: route.originPlaceId || route.destinationPlaceId || null,
      source_type: String(route.provider),
      source_id: isUuid(route.source.externalId) ? route.source.externalId : null,
      reason: `${reason}:routeEstimate`,
    });
  }

  return stripUnsafeProductData(uniqueRows(rows)) as AiPlanEvidenceInsert[];
}

export class SupabaseAiEvidenceRecorder implements AiEvidenceRecorder {
  private readonly client: AiEvidenceClientLike;

  constructor(
    client: AiEvidenceClientLike = createSupabaseServiceRoleClient() as unknown as AiEvidenceClientLike,
  ) {
    this.client = client;
  }

  async recordAiPlanEvidence(input: RecordAiPlanEvidenceInput) {
    const rows = buildAiPlanEvidenceRows(input);
    if (rows.length === 0) {
      return { attempted: 0, inserted: 0 };
    }

    const result = await this.client.from("ai_plan_evidence").insert(rows);
    if (result.error) {
      throw new Error("database_error: ai_plan_evidence insert failed");
    }

    return { attempted: rows.length, inserted: rows.length };
  }
}

export function createAiEvidenceRecorder() {
  return new SupabaseAiEvidenceRecorder();
}
