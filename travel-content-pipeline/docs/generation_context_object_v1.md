# Generation Context Object V1

## Purpose

This document defines the V3.4 Step5 draft for the future minimal `GenerationContext` object in `travel-content-pipeline`.

It is a design document only.

It does not:

- modify code
- modify schema
- modify prompts
- modify batch generation
- modify city JSON files
- modify the live generation flow

The goal is to define the minimum object boundary that should exist before calling DeepSeek in a future formal generation pipeline.

## 1. What `GenerationContext` Is For

`GenerationContext` is not the final output schema.

It is not `plan.json`.

It is not the external request object.

It is the intermediate generation-time context object that exists before model invocation.

Its job is to organize the most relevant facts, strategy, and quality constraints into one clean model-ready input.

In other words, it should gather:

- user request
- city knowledge
- city content strategy
- travel motivation
- plan theme
- generation guidance
- map facts
- quality rules

and convert them into one bounded, coherent generation input.

### Why this object matters

Without a clean `GenerationContext`, the future system will tend to pass:

- raw city files
- raw strategy documents
- raw API payloads
- prompt-only logic
- mixed factual and editorial material

directly into generation.

That makes the system:

- noisy
- fragile
- harder to validate
- harder to scale

So `GenerationContext` should become the one pre-generation object that says:

- this is what the model needs
- this is what the model may trust
- this is what the model must respect

## 2. Minimal Object Structure Suggestion

The future minimal object should stay compact and layered.

Suggested shape:

```json
{
  "request_context": {},
  "content_context": {},
  "city_strategy_context": {},
  "generation_guidance": {},
  "map_context": {},
  "quality_context": {}
}
```

### Design principle

This object should be:

- smaller than raw source material
- richer than a plain request
- more stable than prompt text
- easier to validate than free-form notes

## 3. Module-Level Field Design

### 1. `request_context`

This module should represent the user-facing trip request after normalization.

It should contain:

- `city`
- `traveler_type`
- `days`
- `season`
- `budget`
- `pace`
- `motivation`
- `theme`

### Role of `request_context`

- define what trip is being requested
- define who the trip is for
- define what kind of trip this should become

### Example

```json
{
  "city": "beijing",
  "traveler_type": "couple",
  "days": 3,
  "season": "autumn",
  "budget": "medium",
  "pace": "balanced",
  "motivation": "First Visit",
  "theme": "First-Time City Signature / Romance and Atmosphere"
}
```

### 2. `content_context`

This module should represent filtered premium content knowledge relevant to the request.

It should contain:

- `city_personality`
- `relevant_districts`
- `relevant_scenes`
- `relevant_pois`
- `relevant_food_knowledge`

### Role of `content_context`

- provide city-specific editorial truth
- give the model a strong city slice
- avoid passing the full city knowledge base when only part of it is relevant

### Design rule

This should be filtered content, not the entire city document.

### 3. `city_strategy_context`

This module should represent city-level strategy for the selected combination.

It should contain:

- `city_positioning`
- `priority_combination`
- `not_recommended_patterns`

### Role of `city_strategy_context`

- explain what kind of city product should be generated
- make strong combination strategy visible
- make weak or dangerous combination patterns visible

### Example role

For Beijing, this module should help the model know whether it is producing:

- a first-time capital impression
- a food-first winter route
- a revisit texture route

rather than a generic city guide.

### 4. `generation_guidance`

This module should represent the most direct generation constraints.

It should contain:

- `route_bias`
- `must_include`
- `avoid`
- `food_strategy`
- `memory_strategy`

### Role of `generation_guidance`

- shape route assembly
- shape food role
- shape memory design
- enforce active trade-offs

### Design rule

This module should be short and actionable.

It should contain generation instructions, not long explanation documents.

### 5. `map_context`

This module should follow [generation_context_map_data_v1.md](/C:/Users/10200/Desktop/travel-content-pipeline/docs/generation_context_map_data_v1.md).

It should contain:

- `verified_pois`
- `route_facts`
- `transfer_burden`
- `cluster_warnings`
- `route_feasibility_notes`

### Role of `map_context`

- provide movement truth
- prevent fake low-friction claims
- protect family, couple, and slow routes from hidden route burden

### Design rule

This module should contain normalized facts, not raw Amap responses.

### 6. `quality_context`

This module should represent the minimum quality rules relevant at generation time.

It should contain:

- `active_tradeoff_rules`
- `daily_storyline_rules`
- `food_depth_rules`
- `memory_point_rules`
- `anti_template_rules`

### Role of `quality_context`

- make premium quality non-optional
- keep the model aligned with V3.3 standards
- provide generation-time editorial guardrails

### Design rule

This should be short quality instructions, not the full review manual.

## 4. Suggested Minimal Example

```json
{
  "request_context": {
    "city": "beijing",
    "traveler_type": "couple",
    "days": 3,
    "season": "autumn",
    "budget": "medium",
    "pace": "balanced",
    "motivation": "First Visit",
    "theme": "First-Time City Signature / Romance and Atmosphere"
  },
  "content_context": {
    "city_personality": "Beijing is strongest as a layered capital-city journey combining imperial scale, hutong texture, food memory, and day-to-night contrast.",
    "relevant_districts": ["Imperial Core", "Hutong / Shichahai", "Qianmen / Dashilar"],
    "relevant_scenes": ["imperial opening", "hutong dusk walk", "old-city dinner close"],
    "relevant_pois": ["Forbidden City", "Jingshan Park", "Shichahai"],
    "relevant_food_knowledge": ["one atmosphere-led dinner", "one old-city daytime food pause"]
  },
  "city_strategy_context": {
    "city_positioning": "Beijing should not be packaged as a landmark pile, but as a selective first-impression capital route with emotional closure.",
    "priority_combination": "Beijing x First Visit x First-Time City Signature x Couple x Autumn",
    "not_recommended_patterns": ["efficiency-first museum stacking", "rushed east-west cross-city movement"]
  },
  "generation_guidance": {
    "route_bias": "city-signature route with stronger atmosphere and dusk emphasis",
    "must_include": ["one landmark anchor", "one scenic dusk transition", "one dinner-worthy finish"],
    "avoid": ["overly early closure", "generic shopping filler"],
    "food_strategy": "one atmosphere-led dinner plus one low-friction daytime food pause",
    "memory_strategy": "this is how we first saw Beijing together"
  },
  "map_context": {
    "verified_pois": [],
    "route_facts": [],
    "transfer_burden": [],
    "cluster_warnings": [],
    "route_feasibility_notes": []
  },
  "quality_context": {
    "active_tradeoff_rules": ["Do not try to include every famous landmark."],
    "daily_storyline_rules": ["Each day should have an opener, build, and close."],
    "food_depth_rules": ["At least one meal should feel worth planning around."],
    "memory_point_rules": ["Each day should leave one stable memory point."],
    "anti_template_rules": ["Do not repeat generic praise or interchangeable day summaries."]
  }
}
```

This is only a design example.
It is not a required runtime format yet.

## 5. Boundary Rules

`GenerationContext` may contain:

- facts
- strategy
- constraints
- filtered knowledge
- selected quality rules

`GenerationContext` should not contain:

- raw Amap responses
- full long-form documents
- unfiltered POI lists
- unverified real-time facts
- random extra fields unrelated to generation quality

### Specifically, it should not contain

#### 1. raw provider payloads

Examples:

- full Amap JSON
- full POI API raw responses
- raw route step trees unless already normalized

#### 2. full document dumps

Examples:

- entire city strategy markdown
- entire quality-rule document
- entire matrix design files

The model should receive distilled context, not archive material.

#### 3. unfiltered POI volume

Examples:

- every POI in a city
- every restaurant candidate
- all possible district combinations

This increases noise and weakens selectivity.

#### 4. unverified live facts

Examples:

- guessed route times
- guessed closures
- guessed restaurant status

#### 5. output-shaped clutter

`GenerationContext` should not try to pre-build the final `plan.json`.

It is an input object, not a hidden output schema.

## 6. Data Flow

The future system should move through this flow:

```text
request
↓
load city context
↓
load city strategy
↓
select relevant guidance
↓
fetch / attach map facts
↓
build GenerationContext
↓
call DeepSeek
↓
validate plan output
```

### Flow explanation

#### 1. request

Start from the raw generation request.

#### 2. load city context

Load premium city knowledge.

#### 3. load city strategy

Load the city-specific content strategy and combination logic.

#### 4. select relevant guidance

Filter only the strategy and content that match the request.

#### 5. fetch / attach map facts

Add normalized movement truth if available.

#### 6. build `GenerationContext`

Assemble one clean object for the model.

#### 7. call DeepSeek

Use the object as the structured basis for route composition and explanation.

#### 8. validate plan output

Validate the returned plan against schema, route, and quality expectations.

## 7. Why This Object Should Stay Minimal

The point of `GenerationContext` is not to become another giant knowledge database.

Its purpose is to be:

- focused
- model-readable
- generation-relevant
- bounded

If it grows too large, it will recreate the same problems this design is trying to solve:

- too much noise
- too much duplication
- unclear ownership
- unstable generation behavior

## 8. Not Implemented Yet

This phase does not implement:

- a `GenerationContext` builder
- prompt injection changes
- live map injection into generation
- generation pipeline updates

This phase only defines the object draft.

## 9. Success Standard

Generation Context Object V1 is successful if future implementation work can clearly answer:

- what should enter model input
- what should stay out
- which fields are factual
- which fields are strategic
- which fields are quality constraints

It is not successful if future work still tries to pass:

- raw city JSON
- raw API payloads
- long documents
- mixed output-shaped noise

The purpose of this document is to make the next generation step cleaner:

- DeepSeek should receive a compact generation-time object, not a pile of disconnected sources
