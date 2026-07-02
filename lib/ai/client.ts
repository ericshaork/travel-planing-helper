import "server-only";

import { AppError } from "../utils/errors";
import {
  getServerEnvironment,
  type ServerEnvironment,
} from "../utils/env";
import { MockLLMProvider } from "./mock";
import { OpenAICompatibleProvider } from "./openai-compatible";
import type { LLMProvider } from "./provider";

export function createLLMProvider(
  environment: ServerEnvironment = getServerEnvironment(),
): LLMProvider {
  if (environment.USE_MOCK_AI) {
    return new MockLLMProvider();
  }

  if (
    !environment.LLM_BASE_URL ||
    !environment.LLM_API_KEY ||
    !environment.LLM_MODEL
  ) {
    throw new AppError(
      "AI_GENERATION_FAILED",
      "真实模型配置还不完整，请检查服务端环境变量。",
    );
  }

  return new OpenAICompatibleProvider({
    baseUrl: environment.LLM_BASE_URL,
    apiKey: environment.LLM_API_KEY,
    model: environment.LLM_MODEL,
  });
}

export function getLLMProvider(): LLMProvider {
  return createLLMProvider();
}
