import "server-only";

import { z } from "zod";

import {
  extractJsonObject,
  resolveChatCompletionsEndpoint,
} from "../../openai-compatible";
import { AppError } from "../../../utils/errors";
import type { AIProvider, ConversationProviderInput } from "../provider-types";

const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_TOKENS = 1_200;

const chatCompletionResponseSchema = z
  .object({
    choices: z
      .array(
        z.object({
          message: z.object({
            content: z.string(),
          }),
        }),
      )
      .min(1),
  })
  .passthrough();

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export interface OpenAICompatibleConversationProviderOptions {
  providerName: "qwen" | "deepseek" | "openai-compatible";
  baseUrl: string;
  apiKey: string;
  model: string;
  fetcher?: FetchLike;
  timeoutMs?: number;
  maxTokens?: number;
}

export class OpenAICompatibleConversationProvider implements AIProvider {
  readonly providerName: OpenAICompatibleConversationProviderOptions["providerName"];

  private readonly endpoint: URL;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fetcher: FetchLike;
  private readonly timeoutMs: number;
  private readonly maxTokens: number;

  constructor(options: OpenAICompatibleConversationProviderOptions) {
    this.providerName = options.providerName;
    this.endpoint = resolveChatCompletionsEndpoint(options.baseUrl);
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.fetcher = options.fetcher ?? fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
  }

  async generateConversationResponse(
    input: ConversationProviderInput,
  ): Promise<unknown> {
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
          messages: [
            {
              role: "system",
              content: input.systemPrompt,
            },
            {
              role: "user",
              content: input.userPrompt,
            },
          ],
          temperature: 0.3,
          max_tokens: this.maxTokens,
          response_format: {
            type: "json_object",
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new AppError(
          "AI_GENERATION_FAILED",
          `Conversation provider request failed with HTTP ${response.status}.`,
        );
      }

      const payload = chatCompletionResponseSchema.parse(
        (await response.json()) as unknown,
      );

      return extractJsonObject(payload.choices[0].message.content);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      if (error instanceof z.ZodError) {
        throw new AppError(
          "AI_OUTPUT_INVALID",
          "Conversation provider returned an invalid completion payload.",
          error.issues,
        );
      }

      if (
        error instanceof Error &&
        (error.name === "AbortError" || controller.signal.aborted)
      ) {
        throw new AppError(
          "AI_GENERATION_FAILED",
          "Conversation provider request timed out.",
        );
      }

      throw new AppError(
        "AI_GENERATION_FAILED",
        "Conversation provider request failed.",
        error,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
