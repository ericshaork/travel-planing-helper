# Context Selection Strategy V1

## Purpose

This document defines the V3.4 Step8 design for a future `Context Selector` in `travel-content-pipeline`.

It is a design document only.

It does not:

- modify code
- modify schema
- modify prompts
- modify batch generation
- modify city JSON files
- modify the live generation flow

The goal is to define how the system should choose the right pre-generation context for a request before calling the model.

This step exists because `GenerationContext` is already proving useful, but the current builder is still manually fixed to one Beijing combination.

The future system needs a selector layer that can choose different content slices automatically for different request types.

## Why This Step Is Needed

V3.4 already proved one important thing:

- if the model receives cleaner context, it generates better plans

But the current setup still has a major limitation:

- the context is hand-assembled for one fixed case

That means the system still lacks the mechanism to answer:

- which districts are relevant for this traveler
- which POIs should be selected for this motivation
- which food knowledge matters for this theme
- which map facts are worth injecting
- which quality rules should be emphasized for this request

So V1 must define a future `Context Selector` that sits before generation and decides what should enter `GenerationContext`.

## 1. What `Context Selector` Is

`Context Selector` is not the generator.

It does not directly write `plan.json`.

It does not replace DeepSeek.

It is the pre-generation context filtering layer.

Its job is to select the most relevant material from:

- city knowledge
- city content strategy
- content matrix logic
- map facts
- quality rules

and assemble only the best-matching subset into `GenerationContext`.

### Core positioning

The future generation system should not work like this:

```text
request
↓
full city knowledge
↓
full strategy docs
↓
full map facts
↓
model
```

It should work like this:

```text
request
↓
Context Selector
↓
selected generation context
↓
model
```

### Why this matters

Without a selector, the system will eventually face two bad options:

- pass too much information and create noise
- pass too little information and lose editorial control

`Context Selector` exists to solve that middle-layer problem.

## 2. What `Context Selector` Should Select

The selector should not output raw documents.

It should output filtered, generation-relevant context fragments.

At minimum, it should select:

- `relevant_districts`
- `relevant_scenes`
- `relevant_pois`
- `relevant_food_knowledge`
- `generation_guidance`
- `map_context`
- `quality_context`

### 1. `relevant_districts`

Purpose:

- define the best city slice for this request
- limit route spread
- create stronger district identity

### 2. `relevant_scenes`

Purpose:

- define what kind of moments the trip should create
- provide route mood anchors
- help daily storyline design

### 3. `relevant_pois`

Purpose:

- provide the editorially chosen route components
- reduce generic landmark dumping
- enforce active trade-offs

### 4. `relevant_food_knowledge`

Purpose:

- define how food participates in route value
- support food-first or food-aware design
- prevent dining from becoming filler

### 5. `generation_guidance`

Purpose:

- provide short and binding route-generation instructions
- define `route_bias`, `must_include`, `avoid`, `food_strategy`, and `memory_strategy`

### 6. `map_context`

Purpose:

- inject movement truth only where it matters
- protect pacing and transfer realism
- prevent false low-friction writing

### 7. `quality_context`

Purpose:

- reinforce the specific quality rules most relevant to the request
- prevent template-like writing
- keep V3.3 standards active at generation time

## 3. Selection Dimensions

The selector should not choose context from city only.

It should choose context from a structured request profile.

At minimum, the selection dimensions should include:

- `traveler_type`
- `motivation`
- `theme`
- `season`
- `pace`
- `budget`
- `days`

### Why these dimensions matter

Different requests do not just need different wording.

They need different:

- density
- districts
- food anchors
- emotional pacing
- transfer tolerance
- memory design

For example:

- the same Beijing autumn trip should not choose the same context for `couple` and `student`
- the same Beijing couple trip should not choose the same context for `First Visit` and `Revisit / Deep Exploration`

## 4. Traveler-Type Selection Tendencies

Different traveler types should bias the selector toward different context shapes.

### `couple`

Selection tendency:

- dusk value
- atmosphere
- photo memory
- low-friction route flow
- one dinner worth ending the day around

Likely selector bias:

- prefer districts with evening value
- prefer smoother transitions
- penalize hard transfer jumps
- elevate memory scenes and emotional closure

### `student`

Selection tendency:

- budget friendliness
- snacks and casual meals
- metro-accessible clusters
- high value-for-time
- youthful social energy

Likely selector bias:

- prefer walkable or transit-friendly zones
- elevate affordable food anchors
- reduce high-cost prestige dining
- favor lively and low-barrier scenes

### `solo`

Selection tendency:

- sense of safety
- free pauses
- observation-led routes
- café / bookstore / gallery moments

Likely selector bias:

- prefer routes with flexible rhythm
- elevate reflective or texture-rich scenes
- allow more personal stopping points
- reduce over-scripted couple-style payoff logic

### `family`

Selection tendency:

- low physical burden
- restability
- stable dining
- low queue risk

Likely selector bias:

- prefer compact clustering
- penalize long walking burden
- reduce narrow high-friction experiences
- elevate predictable meals and recovery space

### `parents / multi-generation`

Selection tendency:

- comfort
- fewer transfers
- seating and rest
- symbolic value without overload

Likely selector bias:

- elevate emblematic places with lower exertion
- reduce dense citywalk segments
- reduce transfer complexity
- prefer smoother route sequencing

## 5. Motivation-Based Selection Tendencies

Motivation should change what context is selected, not just how the output is described.

### `First Visit`

Selection tendency:

- city representativeness
- recognition value
- not too niche
- one strong anchor

Selector implications:

- allow one signature landmark
- protect first-impression clarity
- avoid overly insider-only routes
- keep editorial selectivity visible

### `Weekend Escape`

Selection tendency:

- low movement cost
- half-day clusters
- restorative mood

Selector implications:

- prefer compact route slices
- penalize excessive cross-city movement
- elevate easy-payoff scenes
- reduce coverage pressure

### `Food Hunting`

Selection tendency:

- food as route backbone
- at least one dining anchor each day
- no filler-food writing

Selector implications:

- elevate food knowledge aggressively
- let meals influence POI selection
- reduce non-essential scenic detours
- require stronger food-memory logic

### `Anniversary / Special Moment`

Selection tendency:

- dusk
- dinner
- visual memory
- low friction

Selector implications:

- elevate evening payoff
- penalize rushed movement
- prefer route scenes with memory design value
- strengthen closure-oriented sequencing

### `Revisit / Deep Exploration`

Selection tendency:

- avoid routine landmarks
- prefer neighborhood texture
- prefer deeper city slices

Selector implications:

- reduce mainstream anchor dependence
- elevate streets, side texture, and local contrasts
- penalize repeated city-signature defaults
- allow more specific district logic

## 6. Context Size Control Rules

`Context Selector` should not maximize volume.

It should maximize usefulness per token.

Recommended bounds:

- `relevant_districts`: 2-4
- `relevant_scenes`: 3-6
- `relevant_pois`: 4-8
- `relevant_food_knowledge`: 2-5
- `route_facts`: keep only key transfer segments
- `quality_rules`: 5-8 rules total

### Why this matters

If too much context is selected:

- the model becomes noisy
- priorities blur
- route identity weakens
- prompt cost increases

If too little context is selected:

- route logic becomes under-supported
- traveler differentiation weakens
- quality rules become generic

So V1 should aim for:

- compact
- high-signal
- route-relevant
- request-specific

## 7. Context Selector Algorithm V1

V1 should not use a complex learning system.

The first version should stay interpretable and controllable.

Recommended V1 components:

- Rule-based Filtering
- Weighted Scoring
- Top-K Selection
- Map Constraint Checking
- Simple Route Sequencing

### 1. Rule-based Filtering

Use hard filters first to remove obvious mismatches.

Examples:

- remove family-unfriendly content for `family`
- remove high-friction long-walk slices for `slow` pace
- remove repeated mainstream anchor overload for `Revisit / Deep Exploration`
- remove budget-mismatched high-cost experiences for `low` budget

### 2. Weighted Scoring

After filtering, score the remaining candidates.

Suggested scoring structure:

```text
score =
themeFit * 4
+ travelerFit * 3
+ motivationFit * 3
+ seasonFit * 2
+ paceFit
+ budgetFit
+ memoryValue * 2
+ citySignatureValue * 2
- transferBurdenPenalty
- repetitionRiskPenalty
- mismatchPenalty
```

### Interpretation of score factors

- `themeFit`: how strongly the candidate supports the requested trip experience type
- `travelerFit`: how well it fits this traveler group
- `motivationFit`: how well it fits why this trip begins
- `seasonFit`: whether the season strengthens or weakens the candidate
- `paceFit`: whether the route density matches the request rhythm
- `budgetFit`: whether cost positioning is aligned
- `memoryValue`: whether it can create a stable memory point
- `citySignatureValue`: whether it contributes the right level of city identity
- `transferBurdenPenalty`: penalize movement friction
- `repetitionRiskPenalty`: penalize overused defaults
- `mismatchPenalty`: penalize logic conflicts

### 3. Top-K Selection

After scoring, take only the best few items per category.

This keeps context bounded.

Examples:

- top 3 districts
- top 5 POIs
- top 3 food knowledge items
- top 4 scenes

Top-K should be category-aware, not one global ranking list.

### 4. Map Constraint Checking

Before finalizing the context, apply map-aware checks.

Examples:

- remove or downgrade clusters with high transfer burden
- flag pairs that break spatial cohesion
- reduce scenic-walk language candidates when the burden is high
- protect couple, family, and slow routes from fake low-friction combinations

### 5. Simple Route Sequencing

V1 does not need full route optimization.

It only needs a basic sequencing pass that:

- groups nearby candidates
- checks obvious opener / build / close logic
- protects evening payoff
- prevents geographically incoherent selection

## 8. What V1 Should Not Use Yet

At the current stage, the selector should not use:

- machine learning recommendation systems
- reinforcement learning
- genetic algorithms
- ant colony optimization
- complex TSP solving

### Why not

There is not enough behavior data yet.

The system still lacks:

- stable feedback loops
- enough user interaction history
- enough plan-performance labels
- enough city-level route outcomes

Also, premium travel route design is not a pure shortest-path problem.

It depends on:

- memory quality
- editorial trade-offs
- food timing
- emotional pacing
- district identity

So early-stage selector design should prefer:

- interpretability
- editability
- predictable behavior
- easier debugging

## 9. Output Form For `GenerationContext`

The final selector should not output raw scoring tables.

It should output selected context modules in the shape future builders can use directly.

Suggested output form:

- `selected_content_context`
- `selected_city_strategy_context`
- `selected_generation_guidance`
- `selected_map_context`
- `selected_quality_context`

### `selected_content_context`

Should contain:

- selected `relevant_districts`
- selected `relevant_scenes`
- selected `relevant_pois`
- selected `relevant_food_knowledge`

### `selected_city_strategy_context`

Should contain:

- the selected city positioning
- the matching priority combination
- matching not-recommended patterns

### `selected_generation_guidance`

Should contain:

- selected `route_bias`
- selected `must_include`
- selected `avoid`
- selected `food_strategy`
- selected `memory_strategy`

### `selected_map_context`

Should contain:

- only the route facts and warnings that matter to the chosen route slice

### `selected_quality_context`

Should contain:

- only the most relevant editorial rules for this request
- not the entire long-form quality document

## 10. Recommended Future Flow

The future flow should eventually look like this:

```text
request
↓
normalize request dimensions
↓
load city knowledge
↓
load city strategy
↓
load matrix guidance
↓
load available map facts
↓
run Context Selector
↓
output selected context modules
↓
build GenerationContext
↓
call model
```

### Why this split matters

This keeps responsibilities clean:

- selector decides what context is relevant
- builder decides how selected context is packaged
- generator decides how to turn packaged context into a plan

That is a healthier architecture than letting one function do everything.

## 11. Success Standard

Context Selection Strategy V1 is successful if the future system can clearly answer:

- why these districts were selected
- why these POIs were included
- why these food items were elevated
- why these map facts were injected
- why these quality rules were emphasized

It is not successful if future implementation still behaves like:

- one fixed hand-written context
- same city slice for all travelers
- same POI defaults for all motivations
- same guidance regardless of pace, season, or budget

The point of this document is to define the missing layer between:

- raw source material
- and model-ready generation context

That layer should become the system's editorial selector, not another prompt workaround.
