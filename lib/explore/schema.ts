import { z } from "zod";

import type {
  ExploreImportOptions,
  ExploreTripContent,
  ExploreTripContentInsert,
  ExploreTripContentUpdate,
  ExploreTripDailyActivity,
  ExploreTripDayContent,
  ExploreTripFood,
  ExploreTripPoi,
  ExploreTripSourceMeta,
  ExploreCreatorType,
  PipelineExploreTripActivity,
  PipelineExploreTripBudget,
  PipelineExploreTripCity,
  PipelineExploreTripDay,
  PipelineExploreTripFood,
  PipelineExploreTripJson,
  PipelineExploreTripPoi,
} from "./types.ts";

const requiredText = z.string().trim().min(1);
const optionalText = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim().length === 0 ? undefined : value,
  z.string().trim().min(1).optional(),
);
const stringList = z.array(z.string().trim().min(1));
const optionalStringList = stringList.optional();
const statusSchema = z.enum(["draft", "reviewing", "published", "archived"]);
const reviewStatusSchema = z.enum(["pending", "approved", "rejected"]);
const creatorTypeSchema: z.ZodType<ExploreCreatorType> = z.enum([
  "ai_generated",
  "editorial",
  "community",
]);
const timestampSchema = z.string().datetime({ offset: true });

export const exploreTripDailyActivitySchema: z.ZodType<ExploreTripDailyActivity> =
  z
    .object({
      timeBlock: requiredText,
      description: requiredText,
      poiRefs: stringList,
      foodRefs: stringList,
    })
    .strict();

export const exploreTripDayContentSchema: z.ZodType<ExploreTripDayContent> = z
  .object({
    dayNumber: z.number().int().positive(),
    title: requiredText,
    summary: requiredText,
    activities: z.array(exploreTripDailyActivitySchema),
  })
  .strict();

export const exploreTripPoiSchema: z.ZodType<ExploreTripPoi> = z
  .object({
    id: requiredText,
    name: requiredText,
    district: optionalText,
    type: optionalText,
    reason: requiredText,
    recommendedDurationMinutes: z.number().int().positive().optional(),
  })
  .strict();

export const exploreTripFoodSchema: z.ZodType<ExploreTripFood> = z
  .object({
    id: requiredText,
    name: requiredText,
    district: optionalText,
    category: optionalText,
    reason: requiredText,
  })
  .strict();

export const exploreTripSourceMetaSchema: z.ZodType<ExploreTripSourceMeta> = z
  .object({
    pipeline: z.literal("travel-content-pipeline"),
    batchId: optionalText,
    sourceContentKey: optionalText,
    sourceFilePath: optionalText,
  })
  .strict();

export const exploreTripContentInsertSchema: z.ZodType<ExploreTripContentInsert> =
  z
    .object({
      externalId: requiredText,
      slug: requiredText,
      title: requiredText,
      summary: requiredText,
      city: requiredText,
      cityCode: requiredText,
      region: optionalText,
      tripType: requiredText,
      days: z.number().int().positive(),
      tags: stringList,
      theme: optionalText,
      pace: optionalText,
      budgetLevel: optionalText,
      budgetNote: optionalText,
      coverImageUrl: optionalText,
      imagePrompt: optionalText,
      archiveIntro: optionalText,
      featured: z.boolean().optional(),
      featuredReason: optionalText,
      creatorType: creatorTypeSchema.optional(),
      creatorId: optionalText,
      creator: optionalText,
      likes: z.number().int().nonnegative().optional(),
      views: z.number().int().nonnegative().optional(),
      savedCount: z.number().int().nonnegative().optional(),
      terrainTags: optionalStringList,
      cuisineTags: optionalStringList,
      seasonTags: optionalStringList,
      companionTags: optionalStringList,
      highlights: stringList,
      dailyItinerary: z.array(exploreTripDayContentSchema),
      pois: z.array(exploreTripPoiSchema),
      food: z.array(exploreTripFoodSchema),
      status: statusSchema.optional(),
      reviewStatus: reviewStatusSchema.optional(),
      source: exploreTripSourceMetaSchema,
      rawContent: z.record(z.string(), z.unknown()),
      publishedAt: timestampSchema.optional(),
    })
    .strict();

export const exploreTripContentUpdateSchema: z.ZodType<ExploreTripContentUpdate> =
  z
    .object({
      title: optionalText,
      summary: optionalText,
      city: optionalText,
      cityCode: optionalText,
      region: optionalText,
      tripType: optionalText,
      days: z.number().int().positive().optional(),
      tags: stringList.optional(),
      theme: optionalText,
      pace: optionalText,
      budgetLevel: optionalText,
      budgetNote: optionalText,
      coverImageUrl: optionalText,
      imagePrompt: optionalText,
      archiveIntro: optionalText,
      featured: z.boolean().optional(),
      featuredReason: optionalText,
      creatorType: creatorTypeSchema.optional(),
      creatorId: optionalText,
      creator: optionalText,
      likes: z.number().int().nonnegative().optional(),
      views: z.number().int().nonnegative().optional(),
      savedCount: z.number().int().nonnegative().optional(),
      terrainTags: optionalStringList,
      cuisineTags: optionalStringList,
      seasonTags: optionalStringList,
      companionTags: optionalStringList,
      highlights: stringList.optional(),
      dailyItinerary: z.array(exploreTripDayContentSchema).optional(),
      pois: z.array(exploreTripPoiSchema).optional(),
      food: z.array(exploreTripFoodSchema).optional(),
      status: statusSchema.optional(),
      reviewStatus: reviewStatusSchema.optional(),
      source: exploreTripSourceMetaSchema.optional(),
      rawContent: z.record(z.string(), z.unknown()).optional(),
      publishedAt: z.union([timestampSchema, z.null()]).optional(),
    })
    .strict();

export const exploreTripContentSchema: z.ZodType<ExploreTripContent> = z
  .object({
    id: requiredText,
    externalId: requiredText,
    slug: requiredText,
    title: requiredText,
    summary: requiredText,
    city: requiredText,
    cityCode: requiredText,
    region: optionalText,
    tripType: requiredText,
    days: z.number().int().positive(),
    tags: stringList,
    theme: optionalText,
    pace: optionalText,
    budgetLevel: optionalText,
    budgetNote: optionalText,
    coverImageUrl: optionalText,
    imagePrompt: optionalText,
    archiveIntro: optionalText,
    featured: z.boolean().optional(),
    featuredReason: optionalText,
    creatorType: creatorTypeSchema.optional(),
    creatorId: optionalText,
    creator: optionalText,
    likes: z.number().int().nonnegative().optional(),
    views: z.number().int().nonnegative().optional(),
    savedCount: z.number().int().nonnegative().optional(),
    terrainTags: optionalStringList,
    cuisineTags: optionalStringList,
    seasonTags: optionalStringList,
    companionTags: optionalStringList,
    highlights: stringList,
    dailyItinerary: z.array(exploreTripDayContentSchema),
    pois: z.array(exploreTripPoiSchema),
    food: z.array(exploreTripFoodSchema),
    status: statusSchema,
    reviewStatus: reviewStatusSchema,
    source: exploreTripSourceMetaSchema,
    rawContent: z.record(z.string(), z.unknown()),
    publishedAt: optionalText,
    createdAt: requiredText,
    updatedAt: requiredText,
  })
  .strict();

export const pipelineExploreTripCitySchema: z.ZodType<PipelineExploreTripCity> =
  z
    .object({
      code: requiredText,
      name: requiredText,
      region_name: optionalText,
    })
    .strict();

export const pipelineExploreTripBudgetSchema: z.ZodType<PipelineExploreTripBudget> =
  z
    .object({
      level: requiredText,
      note: requiredText,
    })
    .strict();

export const pipelineExploreTripActivitySchema: z.ZodType<PipelineExploreTripActivity> =
  z
    .object({
      time_block: requiredText,
      description: requiredText,
      poi_refs: stringList.optional(),
      food_refs: stringList.optional(),
    })
    .strict();

export const pipelineExploreTripDaySchema: z.ZodType<PipelineExploreTripDay> = z
  .object({
    day: z.number().int().positive(),
    title: requiredText,
    summary: requiredText,
    activities: z.array(pipelineExploreTripActivitySchema),
  })
  .strict();

export const pipelineExploreTripPoiSchema: z.ZodType<PipelineExploreTripPoi> = z
  .object({
    id: requiredText,
    name: requiredText,
    district: optionalText,
    type: optionalText,
    reason: requiredText,
    recommended_duration_minutes: z.number().int().positive().optional(),
  })
  .strict();

export const pipelineExploreTripFoodSchema: z.ZodType<PipelineExploreTripFood> =
  z
    .object({
      id: requiredText,
      name: requiredText,
      district: optionalText,
      category: optionalText,
      reason: requiredText,
    })
    .strict();

export const pipelineExploreTripSchema: z.ZodType<PipelineExploreTripJson> = z
  .object({
    id: requiredText,
    slug: requiredText,
    title: requiredText,
    summary: requiredText,
    city: pipelineExploreTripCitySchema,
    trip_type: requiredText,
    days: z.number().int().positive(),
    budget: pipelineExploreTripBudgetSchema.optional(),
    pace: optionalText,
    tags: stringList.optional(),
    image_prompt: optionalText,
    theme: optionalText,
    archive_intro: optionalText,
    featured: z.boolean().optional(),
    featured_reason: optionalText,
    creator_type: creatorTypeSchema.optional(),
    creator_id: optionalText,
    creator: optionalText,
    likes: z.number().int().nonnegative().optional(),
    views: z.number().int().nonnegative().optional(),
    saved_count: z.number().int().nonnegative().optional(),
    terrain_tags: optionalStringList,
    cuisine_tags: optionalStringList,
    season_tags: optionalStringList,
    companion_tags: optionalStringList,
    daily_itinerary: z.array(pipelineExploreTripDaySchema).min(1),
    pois: z.array(pipelineExploreTripPoiSchema).optional(),
    food: z.array(pipelineExploreTripFoodSchema).optional(),
    raw: z.record(z.string(), z.unknown()),
  })
  .strict();

export const exploreImportOptionsSchema: z.ZodType<ExploreImportOptions> = z
  .object({
    batchId: optionalText,
    sourceContentKey: optionalText,
    sourceFilePath: optionalText,
    status: statusSchema.optional(),
    reviewStatus: reviewStatusSchema.optional(),
    publishedAt: timestampSchema.optional(),
  })
  .strict();
