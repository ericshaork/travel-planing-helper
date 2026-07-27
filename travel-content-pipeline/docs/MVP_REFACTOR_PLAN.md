# MVP Refactor Plan

## 1. Purpose

This document redefines the MVP refactor direction for `travel-content-pipeline`.

The project is now a low-frequency internal tool for one main job:

- generate Explore-ready travel plan data for `travel_planing`

The MVP should be intentionally narrow:

- accept structured trip-generation input
- call GPT-4.1 mini to generate one structured travel plan
- save the result locally
- support batch generation up to about 200 plans
- output a stable Explore import JSON format

The MVP should not become:

- a CMS
- a user-facing product
- a review platform
- a publishing system
- a database-heavy platform

## 2. Current Code Asset Evaluation

The current codebase is a workable prototype shell, but not a good production baseline in its current logic.

Some parts are useful as infrastructure.
Some parts should be frozen as legacy prototype code.

### 2.1 Code to Keep

These assets are worth preserving and adapting.

#### 1. CLI structure

Current value:

- The project already has a simple command-line entry flow in [src/run.ts](/C:/Users/10200/Desktop/travel-content-pipeline/src/run.ts:1)
- It supports single-run and batch-style invocation patterns

Why keep it:

- The MVP is an internal tool
- CLI is sufficient
- It avoids unnecessary UI and app complexity

Decision:

- keep the CLI-oriented operating model
- simplify the command surface around MVP use cases

#### 2. File output utilities

Current value:

- JSON and markdown write helpers already exist in [src/format.ts](/C:/Users/10200/Desktop/travel-content-pipeline/src/format.ts:1)

Why keep it:

- MVP should remain file-based
- output files are enough for internal usage and import preparation

Decision:

- keep file-based output
- adapt output format to the new Explore contract

#### 3. Input schema mindset

Current value:

- The project already validates generation input using zod in [src/schema.ts](/C:/Users/10200/Desktop/travel-content-pipeline/src/schema.ts:14)

Why keep it:

- Stable input validation is essential for repeatable generation
- This fits the MVP well

Decision:

- keep schema-first validation
- replace the old request schema with the new MVP request schema

#### 4. Type-definition approach

Current value:

- The project already centralizes many types in [src/types.ts](/C:/Users/10200/Desktop/travel-content-pipeline/src/types.ts:1)

Why keep it:

- The MVP needs a stable data contract
- Types are useful both for generation and export mapping

Decision:

- keep the central types pattern
- replace old prototype entity types with Explore-plan-centric types

#### 5. Batch processing pattern

Current value:

- The project already knows how to read multiple requests and process them in sequence in [src/run.ts](/C:/Users/10200/Desktop/travel-content-pipeline/src/run.ts:27)

Why keep it:

- The cold-start objective is around 200 plans
- Batch handling is a core MVP requirement

Decision:

- keep the batch execution pattern
- redesign batch input format and output manifest

### 2.2 Code to Delete or Freeze

These parts should not be used as the foundation of the MVP behavior.

#### 1. Rule-based content generation

Current code:

- [src/generate.ts](/C:/Users/10200/Desktop/travel-content-pipeline/src/generate.ts:1)

Why it should be removed from the active path:

- It is not AI generation
- It relies on hand-built heuristics and template assembly
- It cannot produce sufficiently rich, differentiated Explore content
- It is already tied to the old prototype structure

Decision:

- freeze as legacy reference only
- do not reuse as the main content generation engine

#### 2. Mock POI verification

Current code:

- [src/poiVerifier.ts](/C:/Users/10200/Desktop/travel-content-pipeline/src/poiVerifier.ts:1)

Why it should be frozen:

- It creates a false sense of validation
- It is based on local mock matching rather than authoritative grounding
- MVP does not need a separate fake POI verification stage

Decision:

- freeze entirely
- exclude from MVP flow

#### 3. Legacy city templates

Current code:

- [src/cityProfiles.ts](/C:/Users/10200/Desktop/travel-content-pipeline/src/cityProfiles.ts:1)

Why it should not be reused directly:

- Current content assets are corrupted by encoding issues
- The structure mixes content-writing hints with fake POI seeds
- It is optimized for rule assembly, not for AI context injection

Decision:

- do not reuse current file contents
- replace with small, clean, manually curated city context files

#### 4. Dedupe logic tied to old POI draft model

Current code:

- [src/dedupe.ts](/C:/Users/10200/Desktop/travel-content-pipeline/src/dedupe.ts:1)

Why it should be frozen:

- It is built around the old `PoiDraft` model
- MVP first needs stable generation and export, not local string-based dedupe tricks

Decision:

- freeze for now
- revisit only if batch duplicates become a real problem

#### 5. Review report generation

Current code:

- [src/review.ts](/C:/Users/10200/Desktop/travel-content-pipeline/src/review.ts:1)

Why it should be frozen:

- It reflects the old prototype workflow
- It assumes manual review documents and legacy entities
- MVP does not need a detailed markdown review system

Decision:

- freeze for now
- replace later only if a lightweight QA summary becomes necessary

### 2.3 Summary Judgment

Keep:

- project shell
- CLI execution model
- file-based workflow
- schema-first validation
- centralized types
- batch processing pattern

Freeze:

- old generator
- mock POI verifier
- old city templates
- old review reporting
- old draft/dedupe model

## 3. MVP Goal Definition

The MVP should implement one complete and stable loop:

Input:

```json
{
  "city": "Chengdu",
  "days": 3,
  "trip_type": "student",
  "budget": "medium",
  "preferences": ["food", "citywalk"],
  "pace": "balanced"
}
```

Output:

- one Explore-ready JSON record

The output must be stable enough for import into `travel_planing`.

### 3.1 MVP Output Contract

Each generated plan should include:

- `id`
- `slug`
- `title`
- `summary`
- `tags`
- `trip_type`
- `city`
- `days`
- `budget`
- `pace`
- `image_prompt`
- `daily_itinerary`
- `pois`
- `food`

### 3.2 Recommended MVP Explore JSON Shape

```json
{
  "id": "exp_chengdu_student_3d_food_citywalk_v1",
  "slug": "chengdu-student-3d-food-citywalk",
  "title": "3 Days in Chengdu for Students",
  "summary": "A budget-aware Chengdu plan focused on food, walkable neighborhoods, and relaxed daily pacing.",
  "city": {
    "code": "chengdu",
    "name": "Chengdu"
  },
  "trip_type": "student",
  "days": 3,
  "budget": {
    "level": "medium",
    "note": "Balanced budget with affordable food-heavy choices."
  },
  "pace": "balanced",
  "tags": ["food", "citywalk", "local-neighborhoods", "budget-friendly"],
  "image_prompt": "Chengdu food streets, youthful citywalk vibe, warm local atmosphere, editorial travel cover",
  "daily_itinerary": [
    {
      "day": 1,
      "title": "Old Streets and Easy Food Start",
      "summary": "Start with walkable core neighborhoods and accessible local food.",
      "activities": [
        {
          "time_block": "morning",
          "description": "Explore a central historic district and nearby snack streets.",
          "poi_refs": ["poi_kuanzhai_alley"]
        }
      ]
    }
  ],
  "pois": [
    {
      "id": "poi_kuanzhai_alley",
      "name": "Kuanzhai Alley",
      "district": "Qingyang",
      "reason": "Good fit for first-time student travelers because it is central, walkable, and food-adjacent."
    }
  ],
  "food": [
    {
      "name": "Local snack street near Kuanzhai area",
      "category": "snack",
      "reason": "Affordable and easy to fit into a student itinerary."
    }
  ]
}
```

### 3.3 MVP Output Requirements

- one plan must map to one importable Explore record
- output must be deterministic in shape, even if text varies
- all required fields must always exist
- no markdown prose blobs as the main output
- JSON must be the source of truth

## 4. First-Version Technical Plan

The MVP should stay simple and file-oriented.

Recommended top-level structure:

- `input/`
- `prompts/`
- `src/`
- `output/`

### 4.1 `input/`

Responsibility:

- store single-request examples
- store batch configuration files
- store lightweight city context files

Recommended contents:

- `input/request.example.json`
- `input/batch_config.example.json`
- `input/cities/*.json`

### 4.2 `prompts/`

Responsibility:

- hold reusable prompt templates
- separate prompt design from application logic

Recommended contents:

- `prompts/system.txt`
- `prompts/generate_explore_plan.txt`
- optional `prompts/repair_invalid_output.txt`

### 4.3 `src/`

Responsibility:

- all executable MVP logic

Recommended module responsibilities:

- `src/types.ts`
  - request and output types
- `src/schema.ts`
  - zod schemas for request and final output
- `src/run.ts`
  - CLI entrypoint
- `src/loadContext.ts`
  - load city context
- `src/loadPrompt.ts`
  - read prompt templates
- `src/generatePlan.ts`
  - call GPT-4.1 mini and request structured output
- `src/validatePlan.ts`
  - validate generated JSON
- `src/exportPlan.ts`
  - convert final validated output into Explore import JSON
- `src/batch.ts`
  - expand batch config into multiple generation jobs
- `src/files.ts`
  - shared file helpers

### 4.4 `output/`

Responsibility:

- store generated artifacts

Recommended contents:

- `output/single/*.json`
- `output/batch/*.json`
- `output/manifests/*.json`
- `output/explore_import/*.json`

## 5. AI Generation Plan

The first version should use:

- GPT-4.1 mini API

The MVP should avoid:

- complex RAG
- vector databases
- advanced retrieval pipelines
- agent chains

### 5.1 MVP Generation Formula

The first generation design should be:

- small manual city context
- prompt template
- structured output schema

Formula:

`city context + user request + output schema + GPT-4.1 mini`

### 5.2 City Context Design

The MVP may use hand-maintained city context JSON files.

Each city context should include only compact, high-value information:

- canonical city name and code
- short city summary
- top districts/areas
- recommended POI shortlist
- food area shortlist
- transport notes
- budget notes
- trip-type notes if needed
- common themes for the city

This is enough for MVP because:

- the project is low-frequency
- city count is limited
- manual context is cheaper than building retrieval infrastructure

### 5.3 Prompt Design

The prompt should have three parts:

#### 1. System prompt

Defines:

- role as Explore content generator
- must output structured JSON only
- no unsupported factual claims
- no fabricated transportation precision
- no unsupported price precision

#### 2. Task prompt

Provides:

- city
- days
- trip type
- budget
- preferences
- pace

#### 3. Context block

Provides:

- city knowledge
- POI shortlist
- food signals
- transport and budget notes

### 5.4 Structured Output Strategy

The model should return a fixed JSON object matching the MVP schema.

The application should:

- validate with zod
- reject malformed outputs
- optionally retry once with a repair prompt if shape is invalid

### 5.5 Content Quality Rules for MVP

The MVP should enforce only lightweight but useful safeguards:

- itinerary day count must match input
- city must match input
- trip type must match input
- all required arrays must exist
- each day must contain at least one activity
- POIs must be referenced consistently
- budget note must not be empty
- image prompt must not be empty

This is enough for MVP without overengineering.

## 6. Batch Generation Plan

The MVP must support generation of about 200 plans.

The simplest design is a batch config file.

### 6.1 Batch Config Idea

Example:

```json
{
  "cities": ["chengdu", "hangzhou", "xiamen"],
  "trip_types": ["family", "couple", "student", "solo"],
  "days": [2, 3, 4],
  "budgets": ["low", "medium"],
  "preferences": [
    ["food", "citywalk"],
    ["nature", "relaxed"],
    ["history", "local-culture"]
  ],
  "pace": ["slow", "balanced"]
}
```

### 6.2 Batch Expansion Strategy

The batch runner should:

1. read batch config
2. expand combinations
3. optionally skip invalid combinations
4. generate one plan per combination
5. save each plan as its own JSON
6. produce one manifest summarizing success and failure

### 6.3 200-Plan Control Strategy

Do not generate a fully exploded combination space blindly.

Recommended approach:

- define a curated matrix
- prioritize top cities
- mix trip types intentionally
- keep day lengths concentrated on 2 to 4 days
- keep budget tiers narrow in MVP

This prevents waste and near-duplicates.

### 6.4 Batch Output

Recommended output artifacts:

- one JSON per plan
- one manifest file
- one combined Explore import JSON array

Example:

- `output/batch/plan_001.json`
- `output/batch/plan_002.json`
- `output/manifests/batch_manifest.json`
- `output/explore_import/explore_plans_batch.json`

## 7. Deferred Scope

The following should be explicitly postponed until after MVP.

### Phase 2+ only

- database
- review backend
- POI API integration
- automated publishing
- advanced scoring systems
- duplicate clustering engine
- human approval workflow system
- multi-environment deployment management
- analytics dashboards
- content operations platform

The MVP should stay file-based and operator-driven.

## 8. Development Order

The MVP should be built in one focused pass, not split into a long roadmap.

### Step 1: Run single-plan generation

Goal:

- input one request
- load one city context
- call GPT-4.1 mini
- validate JSON
- save result

Success condition:

- one valid Explore plan JSON can be produced on demand

### Step 2: Support batch generation

Goal:

- read batch config
- generate multiple plans
- save per-plan outputs and manifest

Success condition:

- the tool can reliably produce a large set of plans with consistent structure

### Step 3: Export Explore data

Goal:

- output a clean import-ready JSON collection for `travel_planing`

Success condition:

- generated plans can be consumed by a downstream import script without hand-editing

## 9. Recommended MVP Operating Model

The MVP should be run like this:

1. operator prepares single request or batch config
2. tool loads city context and prompt template
3. tool calls GPT-4.1 mini
4. tool validates and saves structured JSON
5. tool exports final Explore import payload

This matches the project’s real business purpose and avoids unnecessary systems.

## 10. Final Output Summary

### A. MVP Scope

- single request input
- GPT-4.1 mini generation
- manual city context files
- structured JSON validation
- batch generation
- Explore import JSON export

### B. Code to Keep

- CLI project shell
- file output helpers
- schema-first validation approach
- centralized types pattern
- batch execution pattern

### C. Code to Delete or Freeze

- mock POI verification
- rule-based generator
- old city template content
- old POI draft model
- old markdown review reporting
- old dedupe logic

### D. Next Development Task List

1. define the new MVP request schema
2. define the new Explore output schema
3. define the city context file format
4. define prompt template files
5. replace old generator path with GPT-4.1 mini generation flow
6. implement single-plan validation and save flow
7. implement batch config expansion
8. implement final Explore export bundle

## 11. Bottom Line

The MVP should not try to preserve the old prototype behavior.

It should preserve only the useful shell:

- CLI
- files
- schemas
- batch execution

Everything content-related should be rebuilt around one narrow objective:

- produce stable Explore-ready travel plan JSON with GPT-4.1 mini

That is the simplest version that satisfies the actual business goal.
