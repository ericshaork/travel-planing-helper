import "server-only";

import { getLLMProvider } from "./client";
import { normalizeParseTripResponseCandidate } from "./parse-trip-normalize";
import type { LLMProvider } from "./provider";
import {
  parseTripRequestSchema,
  parseTripResponseSchema,
} from "../trip/schema";
import type { ParseTripResponse } from "../trip/types";
import { AppError } from "../utils/errors";

export async function parseTrip(
  input: unknown,
  provider: LLMProvider = getLLMProvider(),
): Promise<ParseTripResponse> {
  const parsedInput = parseTripRequestSchema.parse(input);
  const providerResult = await provider.parseTrip(parsedInput);
  const normalizedResult = normalizeParseTripResponseCandidate(providerResult);
  const parsedResult = parseTripResponseSchema.safeParse(normalizedResult);

  if (!parsedResult.success) {
    throw new AppError(
      "AI_OUTPUT_INVALID",
      "模型返回字段不符合预期，请再试一次。",
    );
  }

  return parsedResult.data;
}
