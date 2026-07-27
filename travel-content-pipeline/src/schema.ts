import { z } from "zod";

import { budgetLevels, paceLevels, preferenceTags, tripTypes, type CityContext, type ExplorePlan, type GenerateRequest } from "./types.js";

export const GenerateRequestSchema = z.object({
  city: z.string().min(1),
  days: z.number().int().min(1).max(14),
  trip_type: z.enum(tripTypes),
  budget: z.enum(budgetLevels),
  theme: z.string().min(1).optional(),
  preferences: z.array(z.enum(preferenceTags)).min(1),
  pace: z.enum(paceLevels),
});

const CityContextPoiSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  district: z.string().min(1),
  type: z.string().min(1),
  description: z.string().min(1),
  best_for: z.array(z.enum(tripTypes)).min(1),
  recommended_duration_minutes: z.number().int().min(30),
});

const CityContextFoodAreaSchema = z.object({
  name: z.string().min(1),
  district: z.string().min(1),
  specialties: z.array(z.string().min(1)).min(1),
  best_for: z.array(z.enum(tripTypes)).min(1),
  note: z.string().min(1),
});

export const CityContextSchema = z.object({
  city_code: z.string().min(1),
  city_name: z.string().min(1),
  region_name: z.string().min(1),
  summary: z.string().min(1),
  transport_notes: z.array(z.string().min(1)).min(1),
  budget_notes: z.object({
    low: z.string().min(1),
    medium: z.string().min(1),
    high: z.string().min(1),
  }),
  trip_type_notes: z
    .object({
      family: z.string().min(1).optional(),
      couple: z.string().min(1).optional(),
      student: z.string().min(1).optional(),
      solo: z.string().min(1).optional(),
    })
    .default({}),
  suggested_tags: z.array(z.string().min(1)).min(1),
  pois: z.array(CityContextPoiSchema).min(3),
  food_areas: z.array(CityContextFoodAreaSchema).min(1),
});

const PlanActivitySchema = z.object({
  time_block: z.enum(["morning", "afternoon", "evening"]),
  description: z.string().min(1),
  poi_refs: z.array(z.string().min(1)),
  food_refs: z.array(z.string().min(1)),
});

const DailyItineraryItemSchema = z.object({
  day: z.number().int().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  activities: z.array(PlanActivitySchema).min(1),
});

const PlanPoiSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  district: z.string().min(1),
  type: z.string().min(1),
  reason: z.string().min(1),
  recommended_duration_minutes: z.number().int().min(30),
});

const PlanFoodSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  district: z.string().min(1),
  category: z.string().min(1),
  reason: z.string().min(1),
});

export const ExplorePlanSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  city: z.object({
    code: z.string().min(1),
    name: z.string().min(1),
    region_name: z.string().min(1),
  }),
  trip_type: z.enum(tripTypes),
  days: z.number().int().min(1),
  budget: z.object({
    level: z.enum(budgetLevels),
    note: z.string().min(1),
  }),
  pace: z.enum(paceLevels),
  tags: z.array(z.string().min(1)).min(1),
  image_prompt: z.string().min(1),
  daily_itinerary: z.array(DailyItineraryItemSchema).min(1),
  pois: z.array(PlanPoiSchema).min(1),
  food: z.array(PlanFoodSchema).min(1),
});

export function parseGenerateRequest(raw: unknown): GenerateRequest {
  return GenerateRequestSchema.parse(raw);
}

export function parseCityContext(raw: unknown): CityContext {
  return CityContextSchema.parse(raw);
}

export function parseExplorePlan(raw: unknown): ExplorePlan {
  return ExplorePlanSchema.parse(raw);
}
