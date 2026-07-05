import "server-only";

import { z } from "zod";

import { parseTripResponseSchema } from "../trip/schema";
import { AppError } from "../utils/errors";
import {
  normalizeParseTripResponseCandidate,
  summarizeObjectFieldTypes,
  summarizeObjectKeys,
  summarizeZodIssues,
} from "./parse-trip-normalize";
import type { LLMProvider } from "./provider";
import {
  buildGenerateTripPrompt,
  buildRegenerateTripPrompt,
  buildRepairJsonPrompt,
  JSON_REPAIR_SYSTEM_PROMPT,
  PARSE_TRIP_SYSTEM_PROMPT,
  TRIP_PLAN_SYSTEM_PROMPT,
} from "./prompts";
import type {
  GenerateTripInput,
  GenerateTripOutput,
  ParseTripInput,
  ParseTripOutput,
  RegenerateTripInput,
  RegenerateTripOutput,
  RepairJsonInput,
} from "./types";

const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_TOKENS = 8_000;
const MAX_ERROR_SNIPPET_LENGTH = 300;
const CHAT_COMPLETIONS_SUFFIX = "/chat/completions";

const chatCompletionResponseSchema = z
  .object({
    choices: z
      .array(
        z
          .object({
            message: z
              .object({
                content: z.string(),
              })
              .passthrough(),
          })
          .passthrough(),
      )
      .min(1),
  })
  .passthrough();

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

type CompletionOperation =
  | "parse-trip"
  | "parse-trip-repair"
  | "generate-trip"
  | "regenerate-trip"
  | "repair-json";

interface ChatMessage {
  role: "system" | "user";
  content: string;
}

export interface OpenAICompatibleProviderOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  fetcher?: FetchLike;
  timeoutMs?: number;
  maxTokens?: number;
}

interface SafeUrlSummary {
  origin: string;
  pathname: string;
}

type ParseTripFailureStage =
  | "upstream_http"
  | "network"
  | "non_json"
  | "schema_invalid"
  | "repair_failed";

function summarizeResponseText(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, MAX_ERROR_SNIPPET_LENGTH);
}

function toSafeUrlSummary(url: URL): SafeUrlSummary {
  return {
    origin: url.origin,
    pathname: url.pathname,
  };
}

export function resolveChatCompletionsEndpoint(baseUrl: string): URL {
  const normalizedBaseUrl = baseUrl
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/chat\/completions$/i, "");

  return new URL(`${normalizedBaseUrl}${CHAT_COMPLETIONS_SUFFIX}`);
}

function createHttpError(status: number): AppError {
  if (status === 401) {
    return new AppError(
      "AI_GENERATION_FAILED",
      "真实模型鉴权失败，请检查 LLM_API_KEY 是否正确。",
      { httpStatus: status },
    );
  }

  if (status === 403) {
    return new AppError(
      "AI_GENERATION_FAILED",
      "真实模型没有调用权限，请检查账号、模型权限或 API Key。",
      { httpStatus: status },
    );
  }

  if (status === 404) {
    return new AppError(
      "AI_GENERATION_FAILED",
      "真实模型接口不存在，请检查 LLM_BASE_URL 或 LLM_MODEL 是否正确。",
      { httpStatus: status },
    );
  }

  if (status === 429) {
    return new AppError(
      "AI_GENERATION_FAILED",
      "真实模型当前请求过多，请检查额度或稍后再试。",
      { httpStatus: status },
    );
  }

  if (status >= 500) {
    return new AppError(
      "AI_GENERATION_FAILED",
      `真实模型服务暂时不可用（HTTP ${status}），请稍后再试。`,
      { httpStatus: status },
    );
  }

  return new AppError(
    "AI_GENERATION_FAILED",
    `真实模型请求失败（HTTP ${status}），请检查 Base URL、模型名或服务端配置。`,
    { httpStatus: status },
  );
}

function invalidParseTripJsonError(): AppError {
  return new AppError(
    "AI_OUTPUT_INVALID",
    "模型解析结果不是合法 JSON，请再试一次。",
  );
}

function invalidParseTripSchemaError(): AppError {
  return new AppError(
    "AI_OUTPUT_INVALID",
    "模型返回字段不符合预期，请再试一次。",
  );
}

function validateParseTripOutput(candidate: unknown) {
  return parseTripResponseSchema.safeParse(candidate);
}

export function extractJsonObject(content: string): unknown {
  const trimmed = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start === -1 || end < start) {
    throw new Error("No JSON object found.");
  }

  return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
}

export function unwrapCommonJsonEnvelope(candidate: unknown): unknown {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return candidate;
  }

  const record = candidate as Record<string, unknown>;

  if ("data" in record) {
    return record.data;
  }

  if ("result" in record) {
    return record.result;
  }

  return candidate;
}

export class OpenAICompatibleProvider implements LLMProvider {
  readonly providerName = "openai-compatible";

  private readonly endpoint: URL;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fetcher: FetchLike;
  private readonly timeoutMs: number;
  private readonly maxTokens: number;

  constructor(options: OpenAICompatibleProviderOptions) {
    this.endpoint = resolveChatCompletionsEndpoint(options.baseUrl);
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.fetcher = options.fetcher ?? fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
  }

  getSafeEndpointSummary(): SafeUrlSummary {
    return toSafeUrlSummary(this.endpoint);
  }

  getTimeoutMs(): number {
    return this.timeoutMs;
  }

  getModelName(): string {
    return this.model;
  }

  private logParseTripDiagnostics(details: {
    upstreamStatus?: number;
    upstreamErrorSummary?: string;
    jsonExtractSucceeded?: boolean;
    schemaValidationFailed?: boolean;
    repairAttempted?: boolean;
    repairSucceeded?: boolean;
    extractedTopLevelKeys?: string[];
    extractedFieldTypes?: Record<string, string>;
    parsedFieldTypes?: Record<string, string>;
    schemaIssues?: Array<{
      path: string;
      expected?: unknown;
      received?: unknown;
      message: string;
    }>;
    stage: ParseTripFailureStage;
  }) {
    console.error("[parse-trip] provider diagnostics", {
      provider: this.providerName,
      model: this.model,
      timeoutMs: this.timeoutMs,
      requestUrl: this.getSafeEndpointSummary(),
      ...details,
    });
  }

  private async complete(
    messages: ChatMessage[],
    operation: CompletionOperation,
  ): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetcher(this.endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature:
            operation === "generate-trip" || operation === "regenerate-trip"
              ? 0.2
              : 0.3,
          max_tokens: this.maxTokens,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const responseText = summarizeResponseText(await response.text());

        console.error("[openai-compatible] upstream request failed", {
          operation,
          provider: this.providerName,
          model: this.model,
          timeoutMs: this.timeoutMs,
          requestUrl: this.getSafeEndpointSummary(),
          status: response.status,
          responseText,
        });

        throw createHttpError(response.status);
      }

      const payload = chatCompletionResponseSchema.parse(
        (await response.json()) as unknown,
      );

      return payload.choices[0].message.content;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      if (error instanceof z.ZodError) {
        console.error("[openai-compatible] invalid upstream payload", {
          operation,
          provider: this.providerName,
          model: this.model,
          timeoutMs: this.timeoutMs,
          requestUrl: this.getSafeEndpointSummary(),
          issues: error.issues,
        });

        throw new AppError(
          "AI_GENERATION_FAILED",
          "真实模型返回结构不符合 OpenAI-compatible 预期，请检查模型或 Base URL。",
        );
      }

      if (
        error instanceof Error &&
        (error.name === "AbortError" || controller.signal.aborted)
      ) {
        console.error("[openai-compatible] request timeout", {
          operation,
          provider: this.providerName,
          model: this.model,
          timeoutMs: this.timeoutMs,
          requestUrl: this.getSafeEndpointSummary(),
        });

        throw new AppError(
          "AI_GENERATION_FAILED",
          `真实模型请求超时（>${Math.round(this.timeoutMs / 1000)} 秒），请稍后再试。`,
        );
      }

      if (error instanceof Error) {
        console.error("[openai-compatible] request failed", {
          operation,
          provider: this.providerName,
          model: this.model,
          timeoutMs: this.timeoutMs,
          requestUrl: this.getSafeEndpointSummary(),
          name: error.name,
          message: error.message,
        });
      }

      throw new AppError(
        "AI_GENERATION_FAILED",
        "真实模型请求失败，请检查网络、Base URL 或服务端配置。",
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  async parseTrip(input: ParseTripInput): Promise<ParseTripOutput> {
    let content: string;

    try {
      content = await this.complete(
        [
          {
            role: "system",
            content: PARSE_TRIP_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: input.text,
          },
        ],
        "parse-trip",
      );
    } catch (error) {
      if (error instanceof AppError) {
        this.logParseTripDiagnostics({
          stage: "upstream_http",
          upstreamStatus:
            typeof error.details === "object" &&
            error.details !== null &&
            "httpStatus" in error.details
              ? (error.details as { httpStatus?: number }).httpStatus
              : undefined,
          upstreamErrorSummary: error.message,
        });
      } else {
        this.logParseTripDiagnostics({
          stage: "network",
          upstreamErrorSummary: "unknown upstream error",
        });
      }

      throw error;
    }

    let extracted: unknown;
    let normalizedCandidate: unknown;

    try {
      extracted = unwrapCommonJsonEnvelope(extractJsonObject(content));
      normalizedCandidate = normalizeParseTripResponseCandidate(extracted);
    } catch {
      this.logParseTripDiagnostics({
        stage: "non_json",
        jsonExtractSucceeded: false,
        repairAttempted: false,
        repairSucceeded: false,
      });
      extracted = undefined;
      normalizedCandidate = undefined;
    }

    const firstAttempt =
      normalizedCandidate === undefined
        ? undefined
        : validateParseTripOutput(normalizedCandidate);

    if (firstAttempt?.success) {
      return firstAttempt.data;
    }

    if (normalizedCandidate !== undefined) {
      this.logParseTripDiagnostics({
        stage: "schema_invalid",
        jsonExtractSucceeded: true,
        schemaValidationFailed: true,
        repairAttempted: false,
        repairSucceeded: false,
        extractedTopLevelKeys: summarizeObjectKeys(extracted),
        extractedFieldTypes: summarizeObjectFieldTypes(extracted),
        parsedFieldTypes: summarizeObjectFieldTypes(
          normalizedCandidate &&
            typeof normalizedCandidate === "object" &&
            !Array.isArray(normalizedCandidate) &&
            "parsed" in (normalizedCandidate as Record<string, unknown>)
            ? (normalizedCandidate as Record<string, unknown>).parsed
            : undefined,
        ),
        schemaIssues: firstAttempt ? summarizeZodIssues(firstAttempt.error) : [],
      });
    }

    try {
      const repaired = await this.repairJson({
        rawOutput: content,
        targetSchema: z.unknown(),
        instructions: [
          "请把下面的旅行需求解析结果修复为完整 ParseTripResponse。",
          "parsed 字段的目标结构是 TripRequestDraft，不是 TripPlan。",
          "只有用户提供完整年月日时，才返回 startDate 或 endDate。",
          "startDate 和 endDate 必须是合法 YYYY-MM-DD。",
          "如果用户只说“7月”“暑假”“明天”“下周”“月底”等不完整时间，不要返回 startDate 或 endDate。",
          "可以只保留 days，不要猜测具体日期。",
          "只返回一个合法 JSON 对象，不要 Markdown，不要代码块，不要解释文字。",
          "不要返回嵌套 data 或 result。",
          "顶层必须包含 parsed、missingFields、followUpQuestions 三个字段。",
          "parsed 里尽量使用英文 key：departureCity、destinationCity、days、startDate、endDate、budget、interests、travelStyles、mustVisitPlaces、avoidPlaces。",
          "字段缺失可以省略，不要编造。",
        ].join("\n"),
      });

      const repairedCandidate = normalizeParseTripResponseCandidate(repaired);
      const repairedResult = validateParseTripOutput(repairedCandidate);

      if (repairedResult.success) {
        this.logParseTripDiagnostics({
          stage: extracted === undefined ? "non_json" : "schema_invalid",
          jsonExtractSucceeded: extracted !== undefined,
          schemaValidationFailed: extracted !== undefined,
          repairAttempted: true,
          repairSucceeded: true,
        });

        return repairedResult.data;
      }

      this.logParseTripDiagnostics({
        stage: "repair_failed",
        jsonExtractSucceeded: extracted !== undefined,
        schemaValidationFailed: true,
        repairAttempted: true,
        repairSucceeded: false,
        extractedTopLevelKeys: summarizeObjectKeys(repaired),
        extractedFieldTypes: summarizeObjectFieldTypes(repaired),
        parsedFieldTypes: summarizeObjectFieldTypes(
          repairedCandidate &&
            typeof repairedCandidate === "object" &&
            !Array.isArray(repairedCandidate) &&
            "parsed" in (repairedCandidate as Record<string, unknown>)
            ? (repairedCandidate as Record<string, unknown>).parsed
            : undefined,
        ),
        schemaIssues: summarizeZodIssues(repairedResult.error),
      });
    } catch (error) {
      this.logParseTripDiagnostics({
        stage: extracted === undefined ? "non_json" : "repair_failed",
        jsonExtractSucceeded: extracted !== undefined,
        schemaValidationFailed: extracted !== undefined,
        repairAttempted: true,
        repairSucceeded: false,
        upstreamErrorSummary:
          error instanceof Error ? error.message : "repair failed",
      });
    }

    if (extracted === undefined) {
      throw invalidParseTripJsonError();
    }

    throw invalidParseTripSchemaError();
  }

  async generateTrip(input: GenerateTripInput): Promise<GenerateTripOutput> {
    return this.complete(
      [
        {
          role: "system",
          content: TRIP_PLAN_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: buildGenerateTripPrompt(input),
        },
      ],
      "generate-trip",
    );
  }

  async regenerateTrip(
    input: RegenerateTripInput,
  ): Promise<RegenerateTripOutput> {
    return this.complete(
      [
        {
          role: "system",
          content: TRIP_PLAN_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: buildRegenerateTripPrompt(input),
        },
      ],
      "regenerate-trip",
    );
  }

  async repairJson<T>(input: RepairJsonInput<T>): Promise<T> {
    const content = await this.complete(
      [
        {
          role: "system",
          content: JSON_REPAIR_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: buildRepairJsonPrompt(
            input.rawOutput,
            input.instructions,
          ),
        },
      ],
      "repair-json",
    );

    try {
      return input.targetSchema.parse(extractJsonObject(content));
    } catch {
      throw new AppError(
        "AI_OUTPUT_INVALID",
        "模型修复后的结果仍不是合法 JSON，请再试一次。",
      );
    }
  }
}
