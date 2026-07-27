import "dotenv/config";

import path from "node:path";

import { buildGenerationContext } from "./context/buildGenerationContext.js";
import { writeJsonFile } from "./format.js";
import { loadCityContext } from "./loadContext.js";
import { loadPrompt } from "./loadPrompt.js";
import { createLlmProvider } from "./providers/llm.js";
import { parseExplorePlan } from "./schema.js";
import { validatePlanQuality } from "./validation/validatePlanQuality.js";
import { validatePlanStructure } from "./validation/validatePlanStructure.js";

import type { RequestContext } from "./context/types.js";
import type { CityContext, ExplorePlan, GenerateRequest, JsonGenerationInput, LlmProvider, PreferenceTag } from "./types.js";
import type { GenerationContext } from "./context/types.js";

interface GenerationCase {
  id: string;
  fileName: string;
  request: Partial<RequestContext>;
  preferences: PreferenceTag[];
  focusRules: string[];
}

interface GenerationResultSummary {
  outputPath: string;
  schemaPassed: boolean;
  structuralPassed: boolean;
  qualityPassed: boolean;
  title: string;
  tags: string[];
  respectsCoreConstraints: boolean;
  retryUsed: boolean;
  structuralErrors: string[];
  qualityErrors: string[];
  qualityWarnings: string[];
}

interface GeneratedPlanResult {
  plan: ExplorePlan;
  retryUsed: boolean;
}

const generationCases: GenerationCase[] = [
  {
    id: "couple_first_visit_autumn",
    fileName: "beijing_couple_first_visit_autumn_v35.json",
    request: {
      city: "beijing",
      traveler_type: "couple",
      days: 3,
      season: "autumn",
      budget: "medium",
      pace: "balanced",
      motivation: "首次到访",
      theme: "首次北京印象 / 情侣氛围路线",
    },
    preferences: ["history", "citywalk", "photo", "food", "local_culture"],
    focusRules: [
      "必须体现首次北京印象。",
      "必须保留一个地标主锚点。",
      "必须有黄昏过渡。",
      "必须有值得作为收尾的晚餐。",
      "不要把故宫到什刹海写成轻松步行。",
    ],
  },
  {
    id: "student_food_winter",
    fileName: "beijing_student_food_winter_v35.json",
    request: {
      city: "beijing",
      traveler_type: "student",
      days: 3,
      season: "winter",
      budget: "low",
      pace: "balanced",
      motivation: "美食探索",
      theme: "北京冬季美食 / 学生高性价比路线",
    },
    preferences: ["food", "citywalk", "local_culture", "photo"],
    focusRules: [
      "必须体现冬季美食和低预算逻辑。",
      "必须让牛街或类似南城食物主轴进入路线核心。",
      "必须有早餐型食物锚点。",
      "必须有暖胃主餐。",
      "不要高价精致餐厅。",
      "不要把食物写成景点之间的附属。",
    ],
  },
  {
    id: "solo_revisit_spring",
    fileName: "beijing_solo_revisit_spring_v35.json",
    request: {
      city: "beijing",
      traveler_type: "solo",
      days: 3,
      season: "spring",
      budget: "medium",
      pace: "slow",
      motivation: "深度探索",
      theme: "北京街区纹理 / 一个人的慢行路线",
    },
    preferences: ["citywalk", "local_culture", "photo", "museum"],
    focusRules: [
      "必须体现一个人的慢行和街区纹理。",
      "必须保留自由停顿。",
      "必须出现咖啡馆、书店或看展类停顿。",
      "不要情侣化晚餐收尾。",
      "不要写成打卡清单。",
    ],
  },
];

function buildOutputSchemaExample(): string {
  return JSON.stringify(
    {
      id: "exp_beijing_selected_context_v34",
      slug: "beijing-selected-context-v34",
      title: "北京 3 天精选上下文路线",
      summary: "一条基于上下文筛选后的北京 Explore 路线示例。",
      city: {
        code: "beijing",
        name: "Beijing",
        region_name: "Beijing",
      },
      trip_type: "couple",
      days: 3,
      budget: {
        level: "medium",
        note: "预算说明",
      },
      pace: "balanced",
      tags: ["北京", "Explore"],
      image_prompt: "Editorial travel cover prompt.",
      daily_itinerary: [
        {
          day: 1,
          title: "第一天标题",
          summary: "第一天摘要",
          activities: [
            {
              time_block: "morning",
              description: "上午安排",
              poi_refs: ["poi_id_here"],
              food_refs: ["food_id_here"],
            },
          ],
        },
      ],
      pois: [
        {
          id: "poi_id_here",
          name: "地点名称",
          district: "片区名称",
          type: "地点类型",
          reason: "为什么值得去",
          recommended_duration_minutes: 120,
        },
      ],
      food: [
        {
          id: "food_id_here",
          name: "食物点位",
          district: "片区名称",
          category: "餐饮类型",
          reason: "为什么值得吃",
        },
      ],
    },
    null,
    2,
  );
}

function buildExperimentalSystemPrompt(basePrompt: string): string {
  return `${basePrompt}

V3.4 selected-context experiment rules:

- You are receiving a selected GenerationContext that already reflects traveler, motivation, theme, and map-aware filtering.
- This selected context is binding. Do not flatten it back into a generic Beijing route.
- The final output must remain fully compatible with the existing Explore plan schema only.
- Do not expose GenerationContext as output fields.
- generation_guidance is mandatory.
- map_context.route_facts, map_context.transfer_burden, cluster_warnings, and route_feasibility_notes are operational constraints, not optional inspiration.
- If a movement is marked as long_walk or moderate_burden, describe it honestly and adjust route wording accordingly.
- Do not invent new top-level fields or schema extensions.`;
}

function buildUserPrompt(options: {
  request: GenerateRequest;
  cityContext: CityContext;
  generationContext: GenerationContext;
  generationCase: GenerationCase;
}): string {
  const { request, cityContext, generationContext, generationCase } = options;

  return `请基于下面的已筛选上下文，生成一篇北京 Explore 计划 JSON。

重要边界：

1. 这里提供的是生成前上下文，不是最终输出。
2. 最终输出必须严格符合当前 Explore plan schema。
3. 不允许新增 schema 不支持的字段。
4. 必须遵守 generation_guidance。
5. 必须遵守 map_context。
6. 必须遵守 quality_context。
7. 必须保留 traveler / motivation / theme 的分化，不要把三种路线写成同一个北京。

本次请求：

- city: ${request.city}
- days: ${request.days}
- trip_type: ${request.trip_type}
- budget: ${request.budget}
- pace: ${request.pace}
- theme_hint: ${request.theme ?? "无"}
- preferences: ${request.preferences.join(", ")}

本次核心约束：

${generationCase.focusRules.map((rule, index) => `${index + 1}. ${rule}`).join("\n")}

现有城市 grounding JSON：
${JSON.stringify(cityContext, null, 2)}

Selected GenerationContext JSON：
${JSON.stringify(generationContext, null, 2)}

输出要求：

- 只输出合法 JSON。
- 顶层字段必须与 schema example 完全兼容。
- 所有用户可见文案字段使用简体中文。
- 结构性枚举字段必须保持英文 schema 兼容值。

Schema example:
${buildOutputSchemaExample()}`;
}

function buildRetryUserPrompt(originalPrompt: string, error: unknown): string {
  const validationMessage = error instanceof Error ? error.message : String(error);

  return `${originalPrompt}

重试要求：

- 你上一版输出没有通过 schema 校验。
- 请完整重写整份 JSON，不要只修补局部字段。
- 继续保留当前上下文中的 traveler / motivation / theme / map / quality 约束。
- daily_itinerary[].activities[].time_block 只能使用 morning、afternoon、evening。

校验错误摘要：
${validationMessage}`;
}

function buildStructuralRetryUserPrompt(originalPrompt: string, errors: string[]): string {
  return `${originalPrompt}

结构质量重试要求：

- 你上一版虽然通过了 schema 字段校验，但没有通过结构质量校验。
- 必须完整重写整份 JSON，不要只修补局部字段。
- daily_itinerary 必须正好等于 days 天。
- day 编号必须唯一且连续。
- 不允许重复的 day title。
- 不允许重复的 day summary。
- poi_refs 必须存在于 pois 列表中。
- food_refs 必须存在于 food 列表中。

结构错误摘要：
${errors.map((error, index) => `${index + 1}. ${error}`).join("\n")}`;
}

function buildQualityRetryUserPrompt(originalPrompt: string, errors: string[], warnings: string[]): string {
  const warningText =
    warnings.length > 0
      ? `\n尽量减少以下质量警告：\n${warnings.map((warning, index) => `${index + 1}. ${warning}`).join("\n")}`
      : "";

  return `${originalPrompt}

内容质量重试要求：

- 你上一版通过了 schema 和结构校验，但没有通过内容质量校验。
- 必须完整重写 JSON，不要只修补局部字段。
- 必须遵守 current GenerationContext。
- 必须让 traveler / motivation / theme / map / food / memory 的差异体现在成品里。

内容质量错误：
${errors.map((error, index) => `${index + 1}. ${error}`).join("\n")}${warningText}`;
}

function isSchemaValidationError(error: unknown): boolean {
  return error instanceof Error && error.name === "ZodError";
}

async function generateValidatedPlan(options: {
  provider: LlmProvider;
  modelInput: JsonGenerationInput;
}): Promise<GeneratedPlanResult> {
  const rawPlan = await options.provider.generateJson(options.modelInput);

  try {
    return {
      plan: parseExplorePlan(rawPlan),
      retryUsed: false,
    };
  } catch (error: unknown) {
    if (!isSchemaValidationError(error)) {
      throw error;
    }

    const retriedRawPlan = await options.provider.generateJson({
      systemPrompt: options.modelInput.systemPrompt,
      userPrompt: buildRetryUserPrompt(options.modelInput.userPrompt, error),
    });

    try {
      return {
        plan: parseExplorePlan(retriedRawPlan),
        retryUsed: true,
      };
    } catch (retryError: unknown) {
      if (!isSchemaValidationError(retryError)) {
        const retryMessage = retryError instanceof Error ? retryError.message : String(retryError);
        throw new Error(`Schema validation failed after retry: ${retryMessage}`);
      }

      const secondRetryRawPlan = await options.provider.generateJson({
        systemPrompt: options.modelInput.systemPrompt,
        userPrompt: `${buildRetryUserPrompt(options.modelInput.userPrompt, retryError)}

最终重试要求：

- 这是第二次重写。
- 所有 activity 的 time_block 必须严格使用英文枚举：morning / afternoon / evening。
- 不允许使用 late_morning、lunch、night、late_afternoon 等任何其他值。
- 保持其他 schema 字段完整。`,
      });

      try {
        return {
          plan: parseExplorePlan(secondRetryRawPlan),
          retryUsed: true,
        };
      } catch (secondRetryError: unknown) {
        const retryMessage = secondRetryError instanceof Error ? secondRetryError.message : String(secondRetryError);
        throw new Error(`Schema validation failed after second retry: ${retryMessage}`);
      }
    }
  }
}

function toGenerateRequest(context: GenerationContext, preferences: PreferenceTag[]): GenerateRequest {
  return {
    city: context.request_context.city,
    days: context.request_context.days,
    trip_type: context.request_context.traveler_type as GenerateRequest["trip_type"],
    budget: context.request_context.budget as GenerateRequest["budget"],
    pace: context.request_context.pace as GenerateRequest["pace"],
    theme: context.request_context.theme,
    preferences,
  };
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

function respectsCaseConstraints(generationCase: GenerationCase, plan: ExplorePlan): boolean {
  const text = JSON.stringify(plan);

  if (generationCase.id === "couple_first_visit_autumn") {
    return (
      (text.includes("故宫") || text.includes("地标")) &&
      text.includes("黄昏") &&
      text.includes("晚餐") &&
      !text.includes("轻松步行") &&
      !text.includes("随意步行到什刹海")
    );
  }

  if (generationCase.id === "student_food_winter") {
    return (
      (text.includes("牛街") || text.includes("南城")) &&
      (text.includes("早餐") || text.includes("早晨")) &&
      (text.includes("涮肉") || text.includes("暖胃")) &&
      !text.includes("高价精致餐厅")
    );
  }

  return (
    (text.includes("慢行") || text.includes("街区")) &&
    (text.includes("咖啡") || text.includes("书店") || text.includes("看展")) &&
    !text.includes("情侣晚间收尾") &&
    !text.includes("情侣")
  );
}

async function main(): Promise<void> {
  const projectRoot = process.cwd();
  const provider = createLlmProvider();
  const baseSystemPrompt = await loadPrompt(projectRoot, "prompts/system.txt");
  const results: GenerationResultSummary[] = [];

  for (const generationCase of generationCases) {
    const generationContext = await buildGenerationContext({
      projectRoot,
      request: generationCase.request,
    });
    const request = toGenerateRequest(generationContext, generationCase.preferences);
    const cityContext = await loadCityContext(projectRoot, request.city);
    const outputPath = path.resolve(
      projectRoot,
      "output",
      "beijing_v35_map_resolver_test",
      generationCase.fileName,
    );

    const modelInput: JsonGenerationInput = {
      systemPrompt: buildExperimentalSystemPrompt(baseSystemPrompt),
      userPrompt: buildUserPrompt({
        request,
        cityContext,
        generationContext,
        generationCase,
      }),
    };

    const generated = await generateValidatedPlan({
      provider,
      modelInput,
    });
    let retryUsed = generated.retryUsed;
    let normalizedPlan = normalizePlan(request, cityContext, generated.plan);
    let schemaCheckedPlan = parseExplorePlan(normalizedPlan);
    let structuralValidation = validatePlanStructure(normalizedPlan);
    let qualityValidation = validatePlanQuality({
      plan: normalizedPlan,
      generationContext,
    });

    if (!structuralValidation.valid) {
      const structuralRetryRaw = await provider.generateJson({
        systemPrompt: modelInput.systemPrompt,
        userPrompt: buildStructuralRetryUserPrompt(modelInput.userPrompt, structuralValidation.errors),
      });
      const structuralRetryPlan = parseExplorePlan(structuralRetryRaw);
      normalizedPlan = normalizePlan(request, cityContext, structuralRetryPlan);
      schemaCheckedPlan = parseExplorePlan(normalizedPlan);
      structuralValidation = validatePlanStructure(normalizedPlan);
      qualityValidation = validatePlanQuality({
        plan: normalizedPlan,
        generationContext,
      });
      retryUsed = true;
    }

    if (structuralValidation.valid && !qualityValidation.valid) {
      const qualityRetryRaw = await provider.generateJson({
        systemPrompt: modelInput.systemPrompt,
        userPrompt: buildQualityRetryUserPrompt(
          modelInput.userPrompt,
          qualityValidation.errors,
          qualityValidation.warnings,
        ),
      });
      const qualityRetryPlan = parseExplorePlan(qualityRetryRaw);
      normalizedPlan = normalizePlan(request, cityContext, qualityRetryPlan);
      schemaCheckedPlan = parseExplorePlan(normalizedPlan);
      structuralValidation = validatePlanStructure(normalizedPlan);
      qualityValidation = validatePlanQuality({
        plan: normalizedPlan,
        generationContext,
      });
      retryUsed = true;
    }

    await writeJsonFile(outputPath, normalizedPlan);

    results.push({
      outputPath,
      schemaPassed: Boolean(schemaCheckedPlan),
      structuralPassed: structuralValidation.valid,
      qualityPassed: qualityValidation.valid,
      title: normalizedPlan.title,
      tags: normalizedPlan.tags,
      respectsCoreConstraints:
        structuralValidation.valid &&
        qualityValidation.valid &&
        respectsCaseConstraints(generationCase, normalizedPlan),
      retryUsed,
      structuralErrors: structuralValidation.errors,
      qualityErrors: qualityValidation.errors,
      qualityWarnings: qualityValidation.warnings,
    });
  }

  console.log("Selected context generation completed:");
  for (const result of results) {
    console.log(`- output: ${result.outputPath}`);
    console.log(`  schema_valid: ${result.schemaPassed ? "yes" : "no"}`);
    console.log(`  structural_valid: ${result.structuralPassed ? "yes" : "no"}`);
    console.log(`  quality_valid: ${result.qualityPassed ? "yes" : "no"}`);
    console.log(`  title: ${result.title}`);
    console.log(`  tags: ${result.tags.join(", ")}`);
    console.log(`  respects_core_constraints: ${result.respectsCoreConstraints ? "yes" : "no"}`);
    console.log(`  retry_used: ${result.retryUsed ? "yes" : "no"}`);
    if (result.structuralErrors.length > 0) {
      console.log(`  structural_errors: ${result.structuralErrors.join(" | ")}`);
    }
    if (result.qualityErrors.length > 0) {
      console.log(`  quality_errors: ${result.qualityErrors.join(" | ")}`);
    }
    if (result.qualityWarnings.length > 0) {
      console.log(`  quality_warnings: ${result.qualityWarnings.join(" | ")}`);
    }
  }
  console.log("- formal_generation_flow_changed: no");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Selected context generation failed: ${message}`);
  process.exitCode = 1;
});
