import type { NormalizedProviderRecord, StagingPayload } from "./ingestTypes.ts";
import { redactObject, summarizeSupabaseError } from "./ingestLogger.ts";
import type { SupabaseWriteClientLike } from "./ingestRunStore.ts";
import type { JsonObject } from "../types.ts";

export interface StagingStore {
  stageProviderRecord(record: NormalizedProviderRecord, input: { ingestRunId?: string | null; fetchedAt?: string; expiresAt?: string | null; confidence?: number | null }): Promise<void>;
}

export class DryRunStagingStore implements StagingStore {
  async stageProviderRecord(): Promise<void> {
    return;
  }
}

export function toStagingPayload(
  record: NormalizedProviderRecord,
  input: { ingestRunId?: string | null; fetchedAt?: string; expiresAt?: string | null; confidence?: number | null } = {},
): StagingPayload {
  return {
    provider: record.provider,
    external_id: record.externalId ?? null,
    record_type: record.recordType,
    source_url: record.sourceUrl ?? null,
    source_name: record.sourceName ?? null,
    raw_hash: record.rawHash,
    raw_snapshot: record.rawSnapshotRedacted ? redactObject(record.rawSnapshotRedacted) : ({ redacted: true } satisfies JsonObject),
    normalized_status: "pending",
    confidence: input.confidence ?? null,
    fetched_at: input.fetchedAt ?? new Date().toISOString(),
    expires_at: input.expiresAt ?? null,
    ingest_run_id: input.ingestRunId ?? null,
  };
}

export class SupabaseStagingStore implements StagingStore {
  private readonly client: SupabaseWriteClientLike;

  constructor(client: SupabaseWriteClientLike) {
    this.client = client;
  }

  async stageProviderRecord(
    record: NormalizedProviderRecord,
    input: { ingestRunId?: string | null; fetchedAt?: string; expiresAt?: string | null; confidence?: number | null } = {},
  ): Promise<void> {
    const payload = toStagingPayload(record, input);
    let existingQuery = this.client
      .from<{ id: string }>("provider_records_staging")
      .select("id")
      .eq("provider", payload.provider)
      .eq("record_type", payload.record_type);

    existingQuery = payload.external_id
      ? existingQuery.eq("external_id", payload.external_id)
      : existingQuery.eq("raw_hash", payload.raw_hash);

    const existing = await existingQuery.maybeSingle();
    if (existing.error) {
      throw new Error(`STAGE_PROVIDER_RECORD_LOOKUP_FAILED: ${summarizeSupabaseError(existing.error)}`);
    }

    if (existing.data?.id) {
      const updated = await this.client
        .from("provider_records_staging")
        .update(payload)
        .eq("id", existing.data.id)
        .select("id")
        .single();
      if (updated.error) {
        throw new Error(`STAGE_PROVIDER_RECORD_UPDATE_FAILED: ${summarizeSupabaseError(updated.error)}`);
      }
      return;
    }

    const result = await this.client
      .from("provider_records_staging")
      .insert(payload)
      .select("id")
      .single();
    if (result.error) throw new Error(`STAGE_PROVIDER_RECORD_FAILED: ${summarizeSupabaseError(result.error)}`);
  }
}
