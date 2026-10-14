import type {
  JsonObject,
  JsonValue,
  ProviderIngestStatus as DataHubProviderIngestStatus,
  ProviderIngestTargetType,
  ProviderRecordType,
  RouteMode,
} from "../types.ts";

export type ProviderIngestMode = "dry_run" | "write_staging" | "write_normalized";
export type ProviderIngestStatus = Extract<DataHubProviderIngestStatus, "success" | "partial" | "failed" | "skipped">;
export type ProviderIngestTarget =
  | ProviderIngestTargetType
  | "image"
  | "admin_boundary"
  | "place_detail"
  | "route_estimate";

export interface CoordinatesInput {
  lat: number;
  lng: number;
}

export interface ProviderIngestInput {
  provider: string;
  mode: ProviderIngestMode;
  targetType: ProviderIngestTarget;
  targetId?: string;
  query?: string;
  limit?: number;
  locale?: string;
  region?: string;
  destinationId?: string;
  adminAreaId?: string;
  placeId?: string;
  origin?: CoordinatesInput;
  destination?: CoordinatesInput;
  routeMode?: RouteMode;
}

export interface ProviderIngestWarning {
  code: string;
  message: string;
  field?: string;
}

export interface ProviderIngestError {
  code: string;
  message: string;
  retryable?: boolean;
}

export interface NormalizedProviderRecord {
  provider: string;
  externalId?: string;
  recordType: ProviderRecordType;
  sourceUrl?: string | null;
  sourceName?: string | null;
  rawHash: string;
  rawSnapshotRedacted?: JsonObject;
  normalized: JsonObject;
}

export type PublicNormalizedProviderRecord = Omit<NormalizedProviderRecord, "rawSnapshotRedacted">;

export interface ProviderIngestResult {
  provider: string;
  mode: ProviderIngestMode;
  status: ProviderIngestStatus;
  recordsSeen: number;
  recordsStaged: number;
  recordsNormalized: number;
  recordsSkipped: number;
  warnings: ProviderIngestWarning[];
  errors: ProviderIngestError[];
  sampleRecords: PublicNormalizedProviderRecord[];
  ingestRunId?: string;
  dryRun: boolean;
}

export interface ProviderIngestEnv {
  [name: string]: string | undefined;
}

export interface ProviderIngestContext {
  env: ProviderIngestEnv;
  now: () => Date;
}

export interface ProviderIngestAdapter {
  provider: string;
  supportedTargets: ProviderIngestTarget[];
  dryRun(input: ProviderIngestInput, context: ProviderIngestContext): Promise<ProviderIngestResult>;
  ingest(input: ProviderIngestInput, context: ProviderIngestContext): Promise<ProviderIngestResult>;
}

export interface StagingPayload {
  provider: string;
  external_id: string | null;
  record_type: ProviderRecordType;
  source_url: string | null;
  source_name: string | null;
  raw_hash: string;
  raw_snapshot: JsonValue;
  normalized_status: "pending" | "normalized" | "duplicate" | "rejected" | "failed";
  confidence: number | null;
  fetched_at: string;
  expires_at: string | null;
  ingest_run_id: string | null;
}
