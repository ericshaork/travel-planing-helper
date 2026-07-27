# Explore Archive Schema v1

## Purpose

This project keeps its own Explore content schema so generator work does not depend on documents in `travel_planing`.

The canonical machine-readable schema is:

- [schemas/explore_archive_schema_v1.json](/C:/Users/10200/Desktop/travel-content-pipeline/schemas/explore_archive_schema_v1.json)

This schema reflects the current JSON shape produced by `travel-content-pipeline` and stored under `output/explore_plans_production/`.

## Scope

- Applies to AI-generated Explore travel plan JSON in this repository
- Applies to local validation, batch review, and downstream content normalization
- Does not define frontend rendering contracts for `travel_planing`

## Required Top-Level Fields

- `id`
- `slug`
- `title`
- `summary`
- `city`
- `trip_type`
- `days`
- `budget`
- `pace`
- `tags`
- `image_prompt`
- `daily_itinerary`
- `pois`
- `food`

## Field Constraints

### Identity

- `id` must be stable and unique per plan
- `slug` must be lowercase, hyphenated, and stable
- Do not use random suffixes unless collision handling is explicitly required by a later normalization layer

### City

- `city.code`, `city.name`, and `city.region_name` are all required
- City data should remain internally consistent across title, summary, POIs, and food sections

### Audience and framing

- `trip_type` must be one of: `family`, `couple`, `student`, `solo`
- `days` must be an integer from `1` to `14`
- `budget.level` must be one of: `low`, `medium`, `high`
- `pace` must be one of: `slow`, `balanced`, `dense`

### Content blocks

- `daily_itinerary` must contain at least one day
- Each itinerary day must contain `day`, `title`, `summary`, and `activities`
- Each activity must contain `time_block`, `description`, `poi_refs`, and `food_refs`
- `pois` must contain structured place records, not plain strings
- `food` must contain structured food recommendation records, not plain strings

### Language

- `title`, `summary`, itinerary text, POI reasons, and food reasons should be readable Chinese
- `image_prompt` is the only field that may reasonably stay in English prompt style if needed for image workflows

## Non-Goals

- No requirement here to mirror the main site archive schema one-to-one
- No requirement here to add frontend-only fields
- No requirement here to change generator code

## Quality Guardrails

- No broken placeholders such as `{activity.description}`
- No `undefined`, `null`, or `NaN` as rendered text
- No generic filler that could apply to any city
- No unstructured “攻略大段文本” replacing itinerary objects

## Source of Truth

For implementation reality, this document aligns with:

- [src/schema.ts](/C:/Users/10200/Desktop/travel-content-pipeline/src/schema.ts)
- [src/types.ts](/C:/Users/10200/Desktop/travel-content-pipeline/src/types.ts)
