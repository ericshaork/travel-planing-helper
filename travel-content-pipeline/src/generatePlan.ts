import { loadPrompt } from "./loadPrompt.js";
import { parseExplorePlan } from "./schema.js";

import type { CityContext, ExplorePlan, GenerateRequest, LlmProvider, PromptInput } from "./types.js";

function buildOutputSchemaExample(): string {
  return JSON.stringify(
    {
      id: "exp_chengdu_student_3d_food_citywalk_v1",
      slug: "chengdu-student-3d-food-citywalk",
      title: "3 Days in Chengdu for Students",
      summary: "A concise city-specific summary for the Explore plan.",
      city: {
        code: "chengdu",
        name: "Chengdu",
        region_name: "Sichuan",
      },
      trip_type: "student",
      days: 3,
      budget: {
        level: "medium",
        note: "A brief budget positioning note.",
      },
      pace: "balanced",
      tags: ["food", "citywalk", "budget-friendly"],
      image_prompt: "Editorial travel cover prompt with city mood and trip-type fit.",
      daily_itinerary: [
        {
          day: 1,
          title: "Day title",
          summary: "One-sentence day summary.",
          activities: [
            {
              time_block: "morning",
              description: "What the traveler does in this time block.",
              poi_refs: ["poi_id_here"],
              food_refs: ["food_id_here"],
            },
          ],
        },
      ],
      pois: [
        {
          id: "poi_id_here",
          name: "POI name",
          district: "District name",
          type: "historic district",
          reason: "Why this POI is included.",
          recommended_duration_minutes: 120,
        },
      ],
      food: [
        {
          id: "food_id_here",
          name: "Food area or venue name",
          district: "District name",
          category: "snack street",
          reason: "Why this food recommendation is included.",
        },
      ],
    },
    null,
    2,
  );
}

function injectThemeContext(prompt: string, request: GenerateRequest): string {
  if (!request.theme) {
    return prompt;
  }

  const themeLine = `- theme: ${request.theme}`;

  if (prompt.includes("- pace:")) {
    return prompt.replace(`- pace: ${request.pace}`, `- pace: ${request.pace}\n${themeLine}`);
  }

  return `${prompt}\n\nTheme hint:\n${themeLine}`;
}

export function buildUserPrompt(input: PromptInput, template: string): string {
  const prompt = template
    .replace("{{CITY}}", input.request.city)
    .replace("{{DAYS}}", String(input.request.days))
    .replace("{{TRIP_TYPE}}", input.request.trip_type)
    .replace("{{BUDGET}}", input.request.budget)
    .replace("{{PREFERENCES}}", input.request.preferences.join(", "))
    .replace("{{PACE}}", input.request.pace)
    .replace("{{CITY_CONTEXT_JSON}}", JSON.stringify(input.cityContext, null, 2))
    .replace("{{OUTPUT_SCHEMA_EXAMPLE}}", input.outputSchemaExample);

  return injectThemeContext(prompt, input.request);
}

function isSchemaValidationError(error: unknown): boolean {
  return error instanceof Error && error.name === "ZodError";
}

function buildRetryUserPrompt(originalPrompt: string, error: unknown): string {
  const validationMessage = error instanceof Error ? error.message : String(error);

  return `${originalPrompt}

Retry instruction:
Your previous output did not pass structure validation. Regenerate the full JSON from scratch and ensure every required field is present.
Validation error summary:
${validationMessage}`;
}

async function generateValidatedPlan(options: {
  provider: LlmProvider;
  systemPrompt: string;
  userPrompt: string;
  allowRetry: boolean;
}): Promise<ExplorePlan> {
  const rawPlan = await options.provider.generateJson({
    systemPrompt: options.systemPrompt,
    userPrompt: options.userPrompt,
  });

  try {
    return parseExplorePlan(rawPlan);
  } catch (error: unknown) {
    if (!options.allowRetry || !isSchemaValidationError(error)) {
      throw error;
    }

    const retriedRawPlan = await options.provider.generateJson({
      systemPrompt: options.systemPrompt,
      userPrompt: buildRetryUserPrompt(options.userPrompt, error),
    });

    try {
      return parseExplorePlan(retriedRawPlan);
    } catch (retryError: unknown) {
      const retryMessage = retryError instanceof Error ? retryError.message : String(retryError);
      throw new Error(`Schema validation failed after retry: ${retryMessage}`);
    }
  }
}

function normalizePlan(request: GenerateRequest, cityContext: CityContext, plan: ExplorePlan): ExplorePlan {
  return {
    ...plan,
    city: {
      code: cityContext.city_code,
      name: cityContext.city_name,
      region_name: cityContext.region_name,
    },
    trip_type: request.trip_type,
    days: request.days,
    budget: {
      ...plan.budget,
      level: request.budget,
    },
    pace: request.pace,
  };
}

export async function generateExplorePlan(options: {
  projectRoot: string;
  request: GenerateRequest;
  cityContext: CityContext;
  provider: LlmProvider;
}): Promise<ExplorePlan> {
  const [systemPrompt, userPromptTemplate] = await Promise.all([
    loadPrompt(options.projectRoot, "prompts/system.txt"),
    loadPrompt(options.projectRoot, "prompts/generate_explore_plan.txt"),
  ]);

  const userPrompt = buildUserPrompt(
    {
      request: options.request,
      cityContext: options.cityContext,
      outputSchemaExample: buildOutputSchemaExample(),
    },
    userPromptTemplate,
  );

  const parsedPlan = await generateValidatedPlan({
    systemPrompt,
    userPrompt,
    provider: options.provider,
    allowRetry: true,
  });
  return normalizePlan(options.request, options.cityContext, parsedPlan);
}
