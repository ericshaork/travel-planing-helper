import "server-only";

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

  const { LLM_BASE_URL, LLM_API_KEY, LLM_MODEL } = environment;

  return new OpenAICompatibleProvider({
    baseUrl: LLM_BASE_URL!,
    apiKey: LLM_API_KEY!,
    model: LLM_MODEL!,
    timeoutMs: environment.LLM_TIMEOUT_MS,
  });
}

export function getLLMProvider(): LLMProvider {
  return createLLMProvider();
}
