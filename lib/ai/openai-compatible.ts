import "server-only";

import { z } from "zod";

import { parseTripResponseSchema } from "../trip/schema";
import { AppError } from "../utils/errors";
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

const DEFAULT_TIMEOUT_MS = 60_000;

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

export class OpenAICompatibleProvider implements LLMProvider {
  readonly providerName = "openai-compatible";

  private readonly endpoint: URL;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fetcher: FetchLike;
  private readonly timeoutMs: number;

  constructor(options: OpenAICompatibleProviderOptions) {
    const baseUrl = options.baseUrl.trim().replace(/\/+$/, "");

    this.endpoint = new URL(`${baseUrl}/chat/completions`);
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.fetcher = options.fetcher ?? fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  private async complete(messages: ChatMessage[]): Promise<string> {
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
          temperature: 0.3,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error("Compatible model request failed.");
      }

      const payload = chatCompletionResponseSchema.parse(
        (await response.json()) as unknown,
      );

      return payload.choices[0].message.content;
    } catch {
      throw new AppError(
        "AI_GENERATION_FAILED",
        "模型这次没有顺利返回结果，请稍后再试。",
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  async parseTrip(input: ParseTripInput): Promise<ParseTripOutput> {
    const content = await this.complete([
      {
        role: "system",
        content: PARSE_TRIP_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: input.text,
      },
    ]);

    try {
      return parseTripResponseSchema.parse(extractJsonObject(content));
    } catch {
      throw new AppError(
        "AI_OUTPUT_INVALID",
        "模型刚刚没吐出合格格式，再试一次。",
      );
    }
  }

  async generateTrip(
    input: GenerateTripInput,
  ): Promise<GenerateTripOutput> {
    return this.complete([
      {
        role: "system",
        content: TRIP_PLAN_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: buildGenerateTripPrompt(input),
      },
    ]);
  }

  async regenerateTrip(
    input: RegenerateTripInput,
  ): Promise<RegenerateTripOutput> {
    return this.complete([
      {
        role: "system",
        content: TRIP_PLAN_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: buildRegenerateTripPrompt(input),
      },
    ]);
  }

  async repairJson<T>(input: RepairJsonInput<T>): Promise<T> {
    const content = await this.complete([
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
    ]);

    try {
      return input.targetSchema.parse(extractJsonObject(content));
    } catch {
      throw new AppError(
        "AI_OUTPUT_INVALID",
        "模型刚刚没吐出合格格式，再试一次。",
      );
    }
  }
}
