import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createLLMProvider } from "../../../lib/ai/client";
import { OpenAICompatibleProvider } from "../../../lib/ai/openai-compatible";
import { parseTrip } from "../../../lib/ai/parseTrip";
import {
  getServerEnvironment,
  type ServerEnvironment,
} from "../../../lib/utils/env";
import { AppError, toApiErrorResponse } from "../../../lib/utils/errors";

function errorStatus(error: AppError): number {
  if (error.code === "INVALID_INPUT") {
    return 400;
  }

  if (
    error.code === "AI_GENERATION_FAILED" ||
    error.code === "AI_OUTPUT_INVALID"
  ) {
    return 502;
  }

  return 500;
}

function summarizeBaseUrl(baseUrl?: string) {
  if (!baseUrl) {
    return undefined;
  }

  try {
    const url = new URL(baseUrl);
    return {
      origin: url.origin,
      pathname: url.pathname,
    };
  } catch {
    return {
      invalid: true,
    };
  }
}

function logParseTripRouteDiagnostics(options: {
  environment?: ServerEnvironment;
  providerName?: string;
  requestUrl?: { origin: string; pathname: string };
  error?: unknown;
}) {
  const { environment, providerName, requestUrl, error } = options;

  console.error("[parse-trip] route diagnostics", {
    useMockAi: environment?.USE_MOCK_AI,
    provider: providerName,
    hasLlmBaseUrl: Boolean(environment?.LLM_BASE_URL),
    llmBaseUrl: summarizeBaseUrl(environment?.LLM_BASE_URL),
    hasLlmModel: Boolean(environment?.LLM_MODEL),
    requestUrl,
    errorCode: error instanceof AppError ? error.code : undefined,
    errorMessage: error instanceof Error ? error.message : "unknown error",
  });
}

export async function POST(request: Request) {
  let environment: ServerEnvironment | undefined;
  let providerName: string | undefined;
  let requestUrl:
    | {
        origin: string;
        pathname: string;
      }
    | undefined;

  try {
    environment = getServerEnvironment();
    const provider = createLLMProvider(environment);
    providerName = provider.providerName;

    if (provider instanceof OpenAICompatibleProvider) {
      requestUrl = provider.getSafeEndpointSummary();
    }

    const body = (await request.json()) as unknown;
    const result = await parseTrip(body, provider);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      const invalidInputError = new AppError(
        "INVALID_INPUT",
        "这段旅行需求还没法解析，检查一下内容和长度再试试。",
      );

      return NextResponse.json(toApiErrorResponse(invalidInputError), {
        status: 400,
      });
    }

    logParseTripRouteDiagnostics({
      environment,
      providerName,
      requestUrl,
      error,
    });

    if (error instanceof AppError) {
      return NextResponse.json(toApiErrorResponse(error), {
        status: errorStatus(error),
      });
    }

    return NextResponse.json(toApiErrorResponse(error), {
      status: 500,
    });
  }
}
