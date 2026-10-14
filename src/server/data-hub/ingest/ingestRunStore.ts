import type { ProviderIngestInput, ProviderIngestResult } from "./ingestTypes.ts";
import { summarizeSupabaseError } from "./ingestLogger.ts";
import type { ProviderIngestTargetType } from "../types.ts";

interface SupabaseQueryBuilder<T> {
  insert(payload: unknown): SupabaseQueryBuilder<T>;
  upsert(payload: unknown, options?: unknown): SupabaseQueryBuilder<T>;
  update(payload: unknown): SupabaseQueryBuilder<T>;
  eq(column: string, value: unknown): SupabaseQueryBuilder<T>;
  select(columns?: string): SupabaseQueryBuilder<T>;
  maybeSingle(): Promise<{ data: T | null; error: unknown }>;
  single(): Promise<{ data: T | null; error: unknown }>;
}

export interface SupabaseWriteClientLike {
  from<T = unknown>(table: string): SupabaseQueryBuilder<T>;
}

export interface IngestRunStore {
  createIngestRun(input: ProviderIngestInput): Promise<string | null>;
  finishIngestRun(ingestRunId: string | null, result: ProviderIngestResult): Promise<void>;
}

export class DryRunIngestRunStore implements IngestRunStore {
  async createIngestRun(): Promise<string | null> {
    return null;
  }

  async finishIngestRun(): Promise<void> {
    return;
  }
}

export class SupabaseIngestRunStore implements IngestRunStore {
  private readonly client: SupabaseWriteClientLike;

  constructor(client: SupabaseWriteClientLike) {
    this.client = client;
  }

  private toRunTargetType(input: ProviderIngestInput): ProviderIngestTargetType | null {
    if (input.targetType === "place_detail" || input.targetType === "image") return "place";
    if (input.targetType === "admin_boundary") return "admin_area";
    if (input.targetType === "route_estimate") return "route";
    return input.targetType;
  }

  async createIngestRun(input: ProviderIngestInput): Promise<string | null> {
    const result = await this.client
      .from<{ id: string }>("provider_ingest_runs")
      .insert({
        provider: input.provider,
        run_type: "manual",
        target_type: this.toRunTargetType(input),
        target_id: input.targetId ?? input.placeId ?? input.destinationId ?? input.adminAreaId ?? null,
        status: "running",
        started_at: new Date().toISOString(),
        metadata: {
          mode: input.mode,
          locale: input.locale ?? null,
          region: input.region ?? null,
          queryProvided: Boolean(input.query),
          limit: input.limit ?? null,
        },
      })
      .select("id")
      .single();

    if (result.error || !result.data?.id) {
      throw new Error(`CREATE_INGEST_RUN_FAILED: ${summarizeSupabaseError(result.error)}`);
    }
    return result.data.id;
  }

  async finishIngestRun(ingestRunId: string | null, result: ProviderIngestResult): Promise<void> {
    if (!ingestRunId) return;
    const updateResult = await this.client
      .from("provider_ingest_runs")
      .update({
        status: result.status,
        finished_at: new Date().toISOString(),
        records_seen: result.recordsSeen,
        records_inserted: result.recordsStaged + result.recordsNormalized,
        records_updated: 0,
        records_skipped: result.recordsSkipped,
        error_code: result.errors[0]?.code ?? null,
        error_message: result.errors[0]?.message ?? null,
      })
      .eq("id", ingestRunId)
      .select("id")
      .single();
    if (updateResult.error) {
      throw new Error(`FINISH_INGEST_RUN_FAILED: ${summarizeSupabaseError(updateResult.error)}`);
    }
  }
}
