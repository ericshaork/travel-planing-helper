import { createHash } from "node:crypto";

import type {
  NormalizedProviderRecord,
  ProviderIngestError,
  ProviderIngestResult,
  ProviderIngestWarning,
  PublicNormalizedProviderRecord,
} from "./ingestTypes.ts";
import type { JsonObject, JsonValue } from "../types.ts";

const SENSITIVE_KEY_PATTERN = /(api[_-]?key|secret|token|authorization|password|service[_-]?role|client[_-]?secret|access[_-]?key|ak)$/i;
const SENSITIVE_QUERY_PATTERN = /([?&](?:key|api_key|apikey|token|access_token|secret|signature|sig|ak)=)[^&\s]+/gi;
const MAX_DRY_RUN_LIMIT = 5;

export function clampDryRunLimit(limit: number | undefined): number {
  if (!Number.isFinite(limit)) return MAX_DRY_RUN_LIMIT;
  return Math.max(1, Math.min(Math.trunc(limit ?? MAX_DRY_RUN_LIMIT), MAX_DRY_RUN_LIMIT));
}

export function stableHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function redactSensitiveText(value: string): string {
  return value.replace(SENSITIVE_QUERY_PATTERN, "$1<redacted>");
}

export function redactObject(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map((item) => redactObject(item));
  }
  if (value && typeof value === "object") {
    const output: JsonObject = {};
    for (const [key, item] of Object.entries(value)) {
      output[key] = SENSITIVE_KEY_PATTERN.test(key) ? "<redacted>" : redactObject(item);
    }
    return output;
  }
  return typeof value === "string" ? redactSensitiveText(value) : value;
}

export function warning(code: string, message: string, field?: string): ProviderIngestWarning {
  return { code, message, field };
}

export function error(code: string, message: string, retryable = false): ProviderIngestError {
  return { code, message, retryable };
}

export function publicSample(record: NormalizedProviderRecord): PublicNormalizedProviderRecord {
  const { rawSnapshotRedacted: _rawSnapshotRedacted, ...safeRecord } = record;
  return safeRecord;
}

export function result(input: {
  provider: string;
  mode: ProviderIngestResult["mode"];
  status: ProviderIngestResult["status"];
  recordsSeen?: number;
  recordsStaged?: number;
  recordsNormalized?: number;
  recordsSkipped?: number;
  warnings?: ProviderIngestWarning[];
  errors?: ProviderIngestError[];
  sampleRecords?: NormalizedProviderRecord[];
  ingestRunId?: string;
}): ProviderIngestResult {
  return {
    provider: input.provider,
    mode: input.mode,
    status: input.status,
    recordsSeen: input.recordsSeen ?? 0,
    recordsStaged: input.recordsStaged ?? 0,
    recordsNormalized: input.recordsNormalized ?? 0,
    recordsSkipped: input.recordsSkipped ?? 0,
    warnings: input.warnings ?? [],
    errors: input.errors ?? [],
    sampleRecords: (input.sampleRecords ?? []).map(publicSample),
    ingestRunId: input.ingestRunId,
    dryRun: input.mode === "dry_run",
  };
}

export function envHasValue(env: Readonly<Record<string, string | undefined>>, names: readonly string[]): boolean {
  return names.some((name) => typeof env[name] === "string" && env[name]?.trim() !== "");
}

export function envHasAllValues(env: Readonly<Record<string, string | undefined>>, names: readonly string[]): boolean {
  return names.every((name) => typeof env[name] === "string" && env[name]?.trim() !== "");
}

export function missingConfigResult(provider: string, mode: ProviderIngestResult["mode"], vars: readonly string[]): ProviderIngestResult {
  return result({
    provider,
    mode,
    status: "skipped",
    recordsSkipped: 1,
    warnings: [
      warning(
        "missing_config",
        `缺少 ${vars.map((name) => `\`${name}\``).join(" 或 ")}，本轮跳过 ${provider} dry-run。`,
        "env",
      ),
    ],
  });
}

export function summarizeSupabaseError(error: unknown): string {
  if (!error || typeof error !== "object") return "unknown";
  const record = error as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown };
  const code = typeof record.code === "string" ? record.code : "unknown";
  const message = typeof record.message === "string" ? record.message : "write failed";
  return `${code} ${message}`.slice(0, 240);
}
