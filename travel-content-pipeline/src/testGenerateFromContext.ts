import "dotenv/config";

import path from "node:path";

import { buildGenerationContext } from "./context/buildGenerationContext.ts";
import { writeJsonFile } from "./format.js";
import { loadCityContext } from "./loadContext.js";
import { loadPrompt } from "./loadPrompt.js";
import { createLlmProvider } from "./providers/llm.js";
import { parseExplorePlan } from "./schema.js";

import type { CityContext, ExplorePlan, GenerateRequest, JsonGenerationInput } from "./types.js";
import type { GenerationContext } from "./context/types.js";

function buildOutputSchemaExample(): string {
  return JSON.stringify(
    {
      id: "exp_beijing_couple_3d_first-visit-romance-v34",
      slug: "beijing-couple-3d-first-visit-romance-v34",
      title: "北京 3 天首次到访情侣氛围路线",
      summary: "面向首次到访北京的情侣用户，保留一个地标主锚点，并用黄昏与晚餐完成情绪收尾。",
      city: {
        code: "beijing",
        name: "Beijing",
        region_name: "Beijing",
      },
      trip_type: "couple",
      days: 3,
      budget: {
        level: "medium",
        note: "中等预算更适合把一顿值得期待的晚餐留作情绪收尾，而不是把预算平均摊薄。",
      },
      pace: "balanced",
      tags: ["首次到访", "情侣", "老城", "黄昏氛围", "北京味道"],
      image_prompt: "Editorial travel cover for a Beijing couple trip with imperial city scale, autumn dusk, hutong atmosphere, and a premium but grounded mood.",
      daily_itinerary: [
        {
          day: 1,
          title: "皇城开场与黄昏过渡",
          summary: "用一个地标主锚点建立首次北京印象，再把情绪从庄重历史推进到更亲密的黄昏场景。",
          activities: [
            {
              time_block: "morning",
              description: "先把当天最重的历史片段放在上午，保留后续体力与情绪空间。",
              poi_refs: ["poi_forbidden_city"],
              food_refs: [],
            },
          ],
        },
      ],
      pois: [
        {
          id: "poi_forbidden_city",
          name: "故宫",
          district: "东城区",
          type: "皇城地标",
          reason: "作为首次北京印象的主锚点，它负责建立城市识别度，但不应再叠加过多重体力景点。",
          recommended_duration_minutes: 210,
        },
      ],
      food: [
        {
          id: "food_shichahai_hutong_dinner",
          name: "什刹海胡同晚餐",
          district: "西城区",
          category: "胡同晚餐",
          reason: "这顿饭不是填空，而是当天情绪收尾的主记忆点，要优先保留时间与氛围。",
        },
      ],
    },
    null,
    2,
  );
}

function buildExperimentalSystemPrompt(basePrompt: string): string {
  return `${basePrompt}

V3.4 GenerationContext experiment rules:

- You are receiving a GenerationContext object that exists before generation.
- GenerationContext is not the final output schema and must never appear as output fields.
- Treat GenerationContext as a binding constraint layer for route choice, pacing, food role, memory design, and movement burden.
- generation_guidance is mandatory.
- map_context.route_facts, map_context.transfer_burden, map_context.cluster_warnings, and map_context.route_feasibility_notes are mandatory operational constraints.
- If map context says a transfer is a long_walk, do not describe it as easy, relaxed, casual, or low-effort walking.
- Do not invent new top-level fields or schema extensions.
- Output must remain compatible with the existing Explore plan schema only.`;
}

function buildExperimentalUserPrompt(options: {
  request: GenerateRequest;
  cityContext: CityContext;
  generationContext: GenerationContext;
}): string {
  const { request, cityContext, generationContext } = options;

  return `请基于下面两层输入生成一份北京 Explore 计划 JSON。

第一层是现有城市 grounding，用来保证城市事实和既有 schema 兼容。
第二层是 V3.4 的 GenerationContext，用来约束这次生成的主题、路线取舍、地图负担、食物策略和记忆点设计。

重要说明：

1. GenerationContext 是生成前上下文，不是最终输出。
2. 最终输出必须严格符合当前既有 plan schema。
3. 不允许新增 schema 不支持的字段。
4. 必须遵守 generation_guidance。
5. 必须遵守 map_context 中的 route_facts 和 transfer_burden。
6. 必须遵守 quality_context。

本次请求：

- city: ${request.city}
- days: ${request.days}
- trip_type: ${request.trip_type}
- budget: ${request.budget}
- pace: ${request.pace}
- theme_hint: ${request.theme ?? "无"}
- preferences: ${request.preferences.join(", ")}

本次生成的硬性观察点：

- 不要把故宫到什刹海写成轻松步行。
- 必须处理 3852m / 51min 的移动负担。
- 必须体现“首次北京印象 / 情侣氛围路线”。
- 必须保留一个地标主锚点。
- 必须有黄昏过渡场景。
- 必须有值得作为收尾的晚餐。
- 文案必须是中文旅行编辑口吻。

现有城市 grounding JSON：
${JSON.stringify(cityContext, null, 2)}

GenerationContext JSON：
${JSON.stringify(generationContext, null, 2)}

输出要求：

- 只输出合法 JSON。
- 顶层字段必须与 schema example 完全兼容。
- 所有用户可见文案字段使用简体中文。
- 结构性枚举字段必须保持英文 schema 兼容值。

Schema example:
${buildOutputSchemaExample()}`;
}

function isSchemaValidationError(error: unknown): boolean {
  return error instanceof Error && error.name === "ZodError";
}

function buildRetryUserPrompt(originalPrompt: string, error: unknown): string {
  const validationMessage = error instanceof Error ? error.message : String(error);

  return `${originalPrompt}

重试要求：

- 你上一版输出没有通过 schema 校验。
- 请完整重写整份 JSON，不要只修补局部字段。
- 继续保留所有 V3.4 GenerationContext 约束。

校验错误摘要：
${validationMessage}`;
}

async function generateValidatedPlan(input: {
  modelInput: JsonGenerationInput;
}): Promise<ExplorePlan> {
  const provider = createLlmProvider();
  const rawPlan = await provider.generateJson(input.modelInput);

  try {
    return parseExplorePlan(rawPlan);
  } catch (error: unknown) {
    if (!isSchemaValidationError(error)) {
      throw error;
    }

    const retriedRawPlan = await provider.generateJson({
      systemPrompt: input.modelInput.systemPrompt,
      userPrompt: buildRetryUserPrompt(input.modelInput.userPrompt, error),
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

function buildExperimentRequest(context: GenerationContext): GenerateRequest {
  return {
    city: context.request_context.city,
    days: context.request_context.days,
    trip_type: "couple",
    budget: "medium",
    pace: "balanced",
    theme: context.request_context.theme,
    preferences: ["history", "citywalk", "photo", "food", "local_culture"],
  };
}

function analyzeMapUsage(plan: ExplorePlan): { mapContextInjected: boolean; burdenAwareWriting: boolean } {
  const text = JSON.stringify(plan);
  const mapContextInjected = true;
  const burdenAwareWriting =
    !text.includes("轻松步行") &&
    !text.includes("随意步行到什刹海") &&
    (text.includes("打车") || text.includes("地铁") || text.includes("移动负担") || text.includes("步行压力"));

  return { mapContextInjected, burdenAwareWriting };
}

async function main(): Promise<void> {
  const projectRoot = process.cwd();
  const outputPath = path.resolve(
    projectRoot,
    "output",
    "beijing_v34_context_test",
    "beijing_couple_first_visit_autumn_v34_context.json",
  );

  const generationContext = await buildGenerationContext({ projectRoot });
  const request = buildExperimentRequest(generationContext);
  const cityContext = await loadCityContext(projectRoot, request.city);
  const baseSystemPrompt = await loadPrompt(projectRoot, "prompts/system.txt");

  const modelInput: JsonGenerationInput = {
    systemPrompt: buildExperimentalSystemPrompt(baseSystemPrompt),
    userPrompt: buildExperimentalUserPrompt({
      request,
      cityContext,
      generationContext,
    }),
  };

  const parsedPlan = await generateValidatedPlan({ modelInput });
  const plan = normalizePlan(request, cityContext, parsedPlan);
  const schemaPassed = parseExplorePlan(plan);

  await writeJsonFile(outputPath, plan);

  const mapUsage = analyzeMapUsage(plan);

  console.log(`GenerationContext experiment completed:
- output: ${outputPath}
- schema_valid: ${schemaPassed ? "yes" : "no"}
- map_context_injected: ${mapUsage.mapContextInjected ? "yes" : "no"}
- map_burden_respected: ${mapUsage.burdenAwareWriting ? "yes" : "no"}
- formal_generation_flow_changed: no`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`GenerationContext experiment failed: ${message}`);
  process.exitCode = 1;
});
