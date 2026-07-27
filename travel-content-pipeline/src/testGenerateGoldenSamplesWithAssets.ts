import "dotenv/config";

import path from "node:path";

import { buildGenerationContextWithAssets, type GenerationContextWithAssets } from "./context/buildGenerationContextWithAssets.js";
import { writeJsonFile } from "./format.js";
import { loadCityContext } from "./loadContext.js";
import { loadPrompt } from "./loadPrompt.js";
import { createLlmProvider } from "./providers/llm.js";
import { parseExplorePlan } from "./schema.js";
import { validatePlanQuality } from "./validation/validatePlanQuality.js";
import { validatePlanStructure } from "./validation/validatePlanStructure.js";

import { exportImageManifest, type CandidateSelectionRequest } from "./contentAsset/index.js";
import type { RequestContext } from "./context/types.js";
import type {
  CityContext,
  ExplorePlan,
  GenerateRequest,
  JsonGenerationInput,
  LlmProvider,
  PreferenceTag,
} from "./types.js";

interface GenerationCase {
  id: string;
  goldenRunId: string;
  fileName: string;
  request: RequestContext;
  contentAssetRequest: CandidateSelectionRequest;
  preferences: PreferenceTag[];
  focusRules: string[];
  requiredAssetIds: string[];
}

interface ContentAssetUsageRecord {
  asset_id: string;
  name: string;
  used: boolean;
  matched_in: string[];
}

interface ContentAssetUsageCheck {
  used_assets: ContentAssetUsageRecord[];
  unused_selected_assets: ContentAssetUsageRecord[];
  warnings: string[];
}

interface ImageRequirementOutput {
  asset_id: string;
  asset_name: string;
  type: string;
  image_slot: string;
  purpose: string;
  prompt: string;
  source_preference: string;
  generation_mode: string;
  decision_reason: string;
  confidence: string;
  placeholder: string;
  status: string;
}

interface GoldenSampleReport {
  case_id: string;
  generated_on: string;
  plan_output_path: string;
  image_manifest_output_path: string;
  schema_valid: boolean;
  structural_valid: boolean;
  quality_valid: boolean;
  retry_used: boolean;
  structural_errors: string[];
  quality_errors: string[];
  quality_warnings: string[];
  content_asset_usage_check: ContentAssetUsageCheck;
  image_requirements: ImageRequirementOutput[];
}

interface GenerationResultSummary {
  planOutputPath: string;
  imageManifestOutputPath: string;
  reportOutputPath: string;
  schemaValid: boolean;
  structuralValid: boolean;
  qualityValid: boolean;
  retryUsed: boolean;
  contentAssetUsageWarnings: string[];
  title: string;
}

const generationCases: GenerationCase[] = [
  {
    id: "couple_golden_v35",
    goldenRunId: "beijing_couple_v1",
    fileName: "beijing_couple_golden_v35.json",
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
    contentAssetRequest: {
      traveler: "couple",
      season: "autumn",
      purpose: "first_visit",
      days: 3,
    },
    preferences: ["history", "citywalk", "photo", "food", "local_culture"],
    focusRules: [
      "必须体现故宫、景山、北海或什刹海，并在黄昏体验后完成晚餐收尾。",
      "不要写成单纯景点列表。",
      "不要重复多次故宫。",
      "content_asset_context.selected_assets 必须真正进入 daily_itinerary、活动描述或 POI/food 设计。",
    ],
    requiredAssetIds: [
      "ca_beijing_forbidden_city",
      "ca_beijing_jingshan_park",
      "ca_beijing_beihai_park",
      "ca_beijing_shichahai",
      "ca_beijing_liangma_river",
    ],
  },
  {
    id: "student_golden_v35",
    goldenRunId: "beijing_student_v1",
    fileName: "beijing_student_golden_v35.json",
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
    contentAssetRequest: {
      traveler: "student",
      season: "winter",
      purpose: "food_exploration",
      days: 3,
    },
    preferences: ["food", "citywalk", "local_culture", "photo"],
    focusRules: [
      "必须体现牛街、护国寺、前门、鼓楼与美食价值。",
      "不要出现情侣氛围或高消费路线语言。",
      "content_asset_context.selected_assets 必须真正进入 daily_itinerary、活动描述或 POI/food 设计。",
    ],
    requiredAssetIds: [
      "ca_beijing_niujie",
      "ca_beijing_huguosi_food",
      "ca_beijing_qianmen_food",
      "ca_beijing_gulou",
    ],
  },
  {
    id: "solo_golden_v35",
    goldenRunId: "beijing_solo_v1",
    fileName: "beijing_solo_golden_v35.json",
    request: {
      city: "beijing",
      traveler_type: "solo",
      days: 3,
      season: "spring",
      budget: "medium",
      pace: "slow",
      motivation: "深度探索",
      theme: "北京街区纹理 / 一个人的慢节奏探索",
    },
    contentAssetRequest: {
      traveler: "solo",
      season: "spring",
      purpose: "deep_exploration",
      days: 3,
    },
    preferences: ["citywalk", "local_culture", "photo", "museum"],
    focusRules: [
      "必须体现白塔寺、五道营、胡同或街区、798、慢节奏探索。",
      "不要出现情侣收尾或打卡路线口吻。",
      "content_asset_context.selected_assets 必须真正进入 daily_itinerary、活动描述或 POI/food 设计。",
    ],
    requiredAssetIds: [
      "ca_beijing_baita_temple",
      "ca_beijing_wudaoying",
      "ca_beijing_culture_pause_asset",
      "ca_beijing_shichahai",
      "ca_beijing_798_art_district",
    ],
  },
];

function buildOutputSchemaExample(): string {
  return JSON.stringify(
    {
      id: "exp_beijing_golden_sample_v35",
      slug: "beijing-golden-sample-v35",
      title: "北京 3 天精品 Explore 路线",
      summary: "一条可用于 Wanderly Explore 的高质量旅行计划。",
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

V3.5 golden-sample-with-assets experiment rules:

- You are receiving a GenerationContext With Assets.
- content_asset_context is binding editorial guidance, not optional inspiration.
- map_context remains operationally binding for movement facts.
- The final output must remain fully compatible with the existing Explore plan schema only.
- Do not expose GenerationContext or content_asset_context as output fields.
- Every selected content asset should appear at least once through daily itinerary language, POI naming, food design, or activity description.
- Preserve traveler differentiation strongly.`;
}

function buildUserPrompt(options: {
  request: GenerateRequest;
  cityContext: CityContext;
  generationContext: GenerationContextWithAssets;
  generationCase: GenerationCase;
}): string {
  const { request, cityContext, generationContext, generationCase } = options;

  return `请基于下面的北京 GenerationContext With Assets，生成一份 Wanderly Explore 计划 JSON。

重要边界：
1. 最终输出必须严格符合现有 Explore plan schema。
2. 不允许新增 schema 之外的字段。
3. 必须同时遵守 generation_guidance、map_context、quality_context、content_asset_context。
4. content_asset_context.selected_assets 不是装饰信息，必须真正进入 itinerary 内容。
5. 保持 traveler / season / purpose 的差异，不要把三个样板写成同一条路线。

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

输出要求：
- 只输出合法 JSON。
- 所有用户可见文案字段使用简体中文。
- time_block 只能使用 morning / afternoon / evening。
- 如果 selected asset 适合做 POI 或 food，请在 pois / food 中显式体现并在 daily_itinerary 中引用。

城市 grounding JSON：
${JSON.stringify(cityContext, null, 2)}

GenerationContext With Assets JSON：
${JSON.stringify(generationContext, null, 2)}

Schema example:
${buildOutputSchemaExample()}`;
}

function buildRetryUserPrompt(originalPrompt: string, error: unknown): string {
  const validationMessage = error instanceof Error ? error.message : String(error);

  return `${originalPrompt}

重试要求：
- 你上一版输出没有通过 schema 校验。
- 请完整重写整份 JSON，不要只修补局部字段。
- 保持 content_asset_context.selected_assets 的真实使用。
校验错误摘要：
${validationMessage}`;
}

function buildStructuralRetryUserPrompt(originalPrompt: string, errors: string[]): string {
  return `${originalPrompt}

结构重试要求：
- 上一版虽然通过了 schema，但没有通过结构校验。
- 必须完整重写整份 JSON。
- daily_itinerary 必须正好等于 days 天。
- day 编号必须唯一且连续。
- poi_refs 必须引用已存在的 pois。
- food_refs 必须引用已存在的 food。
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
- 上一版通过了 schema 和结构校验，但没有通过内容质量校验。
- 必须完整重写整份 JSON。
- traveler 差异、map burden、food strategy、memory strategy 必须更清晰。
- content_asset_context.selected_assets 不能只出现在摘要里，必须进入 itinerary 设计。
内容质量错误：
${errors.map((error, index) => `${index + 1}. ${error}`).join("\n")}${warningText}`;
}

function buildUsageRetryUserPrompt(originalPrompt: string, unusedAssets: ContentAssetUsageRecord[]): string {
  return `${originalPrompt}

Content Asset 使用重试要求：
- 上一版没有真正使用所有 selected assets。
- 请完整重写整份 JSON。
- 以下 selected assets 必须至少一次出现在 daily_itinerary 标题、summary、activity description，或被设计成 POI / food 并被引用：
${unusedAssets.map((item, index) => `${index + 1}. ${item.name} (${item.asset_id})`).join("\n")}
- 不要只在 summary 里轻描淡写提到，必须形成实际 itinerary 内容。`;
}

function isSchemaValidationError(error: unknown): boolean {
  return error instanceof Error && error.name === "ZodError";
}

async function generateValidatedPlan(options: {
  provider: LlmProvider;
  modelInput: JsonGenerationInput;
}): Promise<{ plan: ExplorePlan; retryUsed: boolean }> {
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

    return {
      plan: parseExplorePlan(retriedRawPlan),
      retryUsed: true,
    };
  }
}

function toGenerateRequest(
  context: GenerationContextWithAssets,
  preferences: PreferenceTag[],
): GenerateRequest {
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

function buildContentAssetUsageCheck(
  plan: ExplorePlan,
  generationContext: GenerationContextWithAssets,
): ContentAssetUsageCheck {
  const dayTexts = plan.daily_itinerary.flatMap((day) => [
    day.title,
    day.summary,
    ...day.activities.map((activity) => activity.description),
  ]);
  const poiTexts = plan.pois.flatMap((poi) => [poi.name, poi.reason]);
  const foodTexts = plan.food.flatMap((food) => [food.name, food.reason]);

  const records = generationContext.content_asset_context.selected_assets.map((asset) => {
    const aliases = buildAssetAliases(asset.name);
    const matchedIn = new Set<string>();

    if (textListContains(dayTexts, aliases)) {
      matchedIn.add("daily_itinerary");
    }

    const matchedPoiIds = plan.pois
      .filter((poi) => aliases.some((alias) => normalizeText(poi.name).includes(alias)))
      .map((poi) => poi.id);
    if (matchedPoiIds.length > 0) {
      matchedIn.add("pois");
    }

    const matchedFoodIds = plan.food
      .filter((food) => aliases.some((alias) => normalizeText(food.name).includes(alias)))
      .map((food) => food.id);
    if (matchedFoodIds.length > 0) {
      matchedIn.add("food");
    }

    const activityRefHit = plan.daily_itinerary.some((day) =>
      day.activities.some(
        (activity) =>
          activity.poi_refs.some((ref) => matchedPoiIds.includes(ref)) ||
          activity.food_refs.some((ref) => matchedFoodIds.includes(ref)),
      ),
    );
    if (activityRefHit) {
      matchedIn.add("activity_refs");
    }

    const used = matchedIn.size > 0;

    return {
      asset_id: asset.asset_id,
      name: asset.name,
      used,
      matched_in: [...matchedIn],
    };
  });

  const unusedSelectedAssets = records.filter((record) => !record.used);

  return {
    used_assets: records,
    unused_selected_assets: unusedSelectedAssets,
    warnings: unusedSelectedAssets.map((record) => `unused_selected_asset: ${record.asset_id}`),
  };
}

function buildImageRequirements(context: GenerationContextWithAssets): ImageRequirementOutput[] {
  return context.content_asset_context.selected_assets.flatMap((asset) =>
    asset.image_context.images.map((image) => ({
      asset_id: asset.asset_id,
      asset_name: asset.name,
      type: image.type,
      image_slot: image.image_slot,
      purpose: image.purpose,
      prompt: image.prompt,
      source_preference: image.source_preference,
      generation_mode: image.generation_mode,
      decision_reason: image.decision_reason,
      confidence: image.confidence,
      placeholder: image.placeholder,
      status: image.status,
    })),
  );
}

function validateImageRequirements(imageRequirements: ImageRequirementOutput[], caseId: string): void {
  if (imageRequirements.length === 0) {
    throw new Error(`Image requirements missing for ${caseId}`);
  }

  for (const imageRequirement of imageRequirements) {
    if (
      !imageRequirement.type ||
      !imageRequirement.image_slot ||
      !imageRequirement.purpose ||
      !imageRequirement.prompt ||
      !imageRequirement.source_preference ||
      !imageRequirement.generation_mode ||
      !imageRequirement.decision_reason ||
      !imageRequirement.confidence ||
      imageRequirement.status !== "pending"
    ) {
      throw new Error(`Incomplete image requirement detected for ${caseId}: ${imageRequirement.asset_id}`);
    }
  }
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase();
}

function textListContains(values: string[], aliases: string[]): boolean {
  return values.some((value) => {
    const normalized = normalizeText(value);
    return aliases.some((alias) => normalized.includes(alias));
  });
}

function buildAssetAliases(name: string): string[] {
  const normalized = normalizeText(name);
  const candidates = new Set<string>([normalized]);
  const suffixes = ["公园", "博物院", "夜景", "传统美食区", "小吃", "胡同", "资产", "艺术区", "斜街"];

  for (const suffix of suffixes) {
    if (name.endsWith(suffix)) {
      candidates.add(normalizeText(name.slice(0, -suffix.length)));
    }
  }

  if (normalized.includes("798艺术区")) {
    candidates.add("798");
  }

  return [...candidates].filter((value) => value.length > 0);
}

async function main(): Promise<void> {
  const projectRoot = process.cwd();
  const provider = createLlmProvider();
  const baseSystemPrompt = await loadPrompt(projectRoot, "prompts/system.txt");
  const results: GenerationResultSummary[] = [];

  for (const generationCase of generationCases) {
    const generationContext = await buildGenerationContextWithAssets({
      projectRoot,
      request: generationCase.request,
      contentAssetRequest: generationCase.contentAssetRequest,
    });
    const request = toGenerateRequest(generationContext, generationCase.preferences);
    const cityContext = await loadCityContext(projectRoot, request.city);
    const goldenRunDir = path.resolve(
      projectRoot,
      "output",
      "golden_runs",
      generationCase.goldenRunId,
    );
    const outputPath = path.resolve(goldenRunDir, "explore_plan.json");
    const imageManifestOutputPath = path.resolve(goldenRunDir, "image_manifest.json");
    const reportOutputPath = path.resolve(goldenRunDir, "generation_report.json");

    const modelInput: JsonGenerationInput = {
      systemPrompt: buildExperimentalSystemPrompt(baseSystemPrompt),
      userPrompt: buildUserPrompt({
        request,
        cityContext,
        generationContext,
        generationCase,
      }),
    };

    const generated = await generateValidatedPlan({ provider, modelInput });
    let retryUsed = generated.retryUsed;
    let normalizedPlan = normalizePlan(request, cityContext, generated.plan);
    let schemaCheckedPlan = parseExplorePlan(normalizedPlan);
    let structuralValidation = validatePlanStructure(normalizedPlan);
    let qualityValidation = validatePlanQuality({
      plan: normalizedPlan,
      generationContext,
    });
    let contentAssetUsageCheck = buildContentAssetUsageCheck(normalizedPlan, generationContext);

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
      contentAssetUsageCheck = buildContentAssetUsageCheck(normalizedPlan, generationContext);
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
      contentAssetUsageCheck = buildContentAssetUsageCheck(normalizedPlan, generationContext);
      retryUsed = true;
    }

    if (
      structuralValidation.valid &&
      qualityValidation.valid &&
      contentAssetUsageCheck.unused_selected_assets.length > 0
    ) {
      const usageRetryRaw = await provider.generateJson({
        systemPrompt: modelInput.systemPrompt,
        userPrompt: buildUsageRetryUserPrompt(
          modelInput.userPrompt,
          contentAssetUsageCheck.unused_selected_assets,
        ),
      });
      const usageRetryPlan = parseExplorePlan(usageRetryRaw);
      normalizedPlan = normalizePlan(request, cityContext, usageRetryPlan);
      schemaCheckedPlan = parseExplorePlan(normalizedPlan);
      structuralValidation = validatePlanStructure(normalizedPlan);
      qualityValidation = validatePlanQuality({
        plan: normalizedPlan,
        generationContext,
      });
      contentAssetUsageCheck = buildContentAssetUsageCheck(normalizedPlan, generationContext);
      retryUsed = true;
    }

    const imageRequirements = buildImageRequirements(generationContext);
    validateImageRequirements(imageRequirements, generationCase.id);

    if (!schemaCheckedPlan) {
      throw new Error(`Schema validation did not produce a plan for ${generationCase.id}`);
    }

    if (!structuralValidation.valid) {
      throw new Error(
        `Structural validation failed for ${generationCase.id}: ${structuralValidation.errors.join(" | ")}`,
      );
    }

    if (!qualityValidation.valid) {
      throw new Error(
        `Quality validation failed for ${generationCase.id}: ${qualityValidation.errors.join(" | ")}`,
      );
    }

    if (contentAssetUsageCheck.unused_selected_assets.length > 0) {
      throw new Error(
        `Content asset usage check failed for ${generationCase.id}: ${contentAssetUsageCheck.warnings.join(" | ")}`,
      );
    }

    const selectedAssetIds = generationContext.content_asset_context.selected_assets.map((asset) => asset.asset_id);
    const missingRequiredAssets = generationCase.requiredAssetIds.filter((assetId) => !selectedAssetIds.includes(assetId));
    if (missingRequiredAssets.length > 0) {
      throw new Error(
        `GenerationContext with assets is missing expected selected assets for ${generationCase.id}: ${missingRequiredAssets.join(", ")}`,
      );
    }

    await writeJsonFile(outputPath, normalizedPlan);

    const imageManifest = exportImageManifest({
      trip_id: generationCase.id,
      city: generationCase.request.city,
      content_asset_context: generationContext.content_asset_context,
    });
    await writeJsonFile(imageManifestOutputPath, imageManifest);

    const report: GoldenSampleReport = {
      case_id: generationCase.id,
      generated_on: new Date().toISOString(),
      plan_output_path: outputPath,
      image_manifest_output_path: imageManifestOutputPath,
      schema_valid: true,
      structural_valid: true,
      quality_valid: true,
      retry_used: retryUsed,
      structural_errors: structuralValidation.errors,
      quality_errors: qualityValidation.errors,
      quality_warnings: qualityValidation.warnings,
      content_asset_usage_check: contentAssetUsageCheck,
      image_requirements: imageRequirements,
    };

    await writeJsonFile(reportOutputPath, report);

    results.push({
      planOutputPath: outputPath,
      imageManifestOutputPath,
      reportOutputPath,
      schemaValid: true,
      structuralValid: true,
      qualityValid: true,
      retryUsed,
      contentAssetUsageWarnings: contentAssetUsageCheck.warnings,
      title: normalizedPlan.title,
    });
  }

  console.log("Golden samples with assets generation completed:");
  for (const result of results) {
    console.log(`- output: ${result.planOutputPath}`);
    console.log(`  image_manifest: ${result.imageManifestOutputPath}`);
    console.log(`  report: ${result.reportOutputPath}`);
    console.log(`  schema_valid: ${result.schemaValid ? "yes" : "no"}`);
    console.log(`  structural_valid: ${result.structuralValid ? "yes" : "no"}`);
    console.log(`  quality_valid: ${result.qualityValid ? "yes" : "no"}`);
    console.log(`  retry_used: ${result.retryUsed ? "yes" : "no"}`);
    console.log(`  title: ${result.title}`);
    if (result.contentAssetUsageWarnings.length > 0) {
      console.log(`  content_asset_usage_warnings: ${result.contentAssetUsageWarnings.join(" | ")}`);
    }
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Golden sample generation with assets failed: ${message}`);
  process.exitCode = 1;
});
