# V3.5 Step1-E2-C1 Content Asset Selector Integration Design

## 1. Purpose

This document defines the future integration design for bringing:

- `Content Asset Library v1`

into the existing selector architecture.

It is a design-only step.

It does not:

- modify `src/context/selectContext.ts`
- modify `src/context/buildGenerationContext.ts`
- modify `src/context/types.ts`
- modify `src/schema.ts`
- modify `src/validation/*`
- modify prompt
- modify retry
- modify generation flow

The goal is to design how the current system can evolve from:

- rule-driven place selection

into:

- explainable editorial asset selection

without breaking the current pipeline.

## 2. Background

The current Wanderly pipeline already has:

```text
Request
-> Context Selector
-> GenerationContext
-> DeepSeek
-> Schema Validation
-> Structural Validation
-> Quality Validation
-> Output
```

It also already has a map-fact path:

```text
Map Asset
-> Repository
-> Map Resolver
-> GenerationContext
```

And it now has a growing editorial asset pool:

```text
Content Asset Library
-> input/content_assets_v1/beijing/
```

So the system now has three conceptually different kinds of information:

- user intent
- editorial content assets
- geographic truth

The missing step is a selection adapter that turns content assets into selector-ready route candidates.

## 3. Current Selector Problem Analysis

The current selector is still centered in:

- `src/context/selectContext.ts`

Today it correctly does one important job:

- understand the request well enough to shape route direction

Examples of what it currently interprets:

- traveler type
- season
- motivation
- theme
- days
- budget
- pace

That part should continue to exist.

### What the current selector is also doing today

It is also responsible for:

- selecting districts
- selecting POIs
- selecting food knowledge
- deciding route-supporting scenes
- applying hardcoded candidate scoring rules

This creates a scaling problem.

### Why this becomes a problem

As cities expand, the current file would have to carry more and more:

- city-specific candidates
- traveler-specific hardcoded place choices
- season-specific overrides
- route-specific place combinations

That means:

- rules become larger and harder to reason about
- cross-city reuse becomes weaker
- selection logic becomes less explainable
- route repetition becomes more likely

### Core diagnosis

`selectContext.ts` should continue to be a request interpreter.

It should not continue to be the long-term owner of:

- detailed asset judgment
- place role interpretation
- place combination logic

The selector needs to upgrade from:

- a place selector

to:

- a travel content selector

## 4. New Architecture Design

The future architecture should separate:

- request understanding
- editorial asset selection
- geographic truth enrichment

### Proposed future flow

```text
User Request
-> Context Selector
-> Content Asset Ranking
-> Selected Content Assets
-> Map Resolver
-> GenerationContext
-> DeepSeek
```

### Responsibility split

#### Context Selector

Responsible for understanding:

- traveler
- season
- purpose
- trip goal
- pace
- budget
- days

It should output a normalized request profile.

It should not be responsible for making final detailed decisions about:

- which exact Beijing asset wins
- which asset combinations make the best route cluster
- which editorial role a place plays

#### Content Asset Selector

Responsible for:

- loading city content assets
- scoring which assets fit the request
- selecting a compact editorial asset set
- preserving explainable selection reasons

It should output:

- selected assets
- ranked scores
- role balance
- simple nearby relationships

#### Map Resolver

Responsible for:

- coordinates
- distance
- travel duration
- route fact enrichment
- spatial feasibility truth

It should not decide why an asset is editorially strong.

#### GenerationContext

Responsible for carrying:

- request understanding
- selected editorial assets
- map truth
- generation guidance

This is the right boundary because it keeps:

- editorial reasoning
- movement reasoning

separate but composable.

## 5. Content Asset Loader Design

The future implementation should introduce a new module family such as:

- `src/contentAsset/`

### Suggested module shape

Example structure:

```text
src/contentAsset/
  types.ts
  loadAssets.ts
  validateAsset.ts
  assetPool.ts
```

### Loader responsibilities

The loader should be responsible for:

- reading JSON files from `input/content_assets_v1/{city}/`
- parsing JSON into `ContentAsset[]`
- basic field validation
- building city-specific asset pools
- returning stable, selector-ready data structures

### Loader output

Recommended output:

```ts
ContentAsset[]
```

Where each `ContentAsset` contains the JSON-defined fields such as:

- `id`
- `name`
- `category`
- `content_role`
- `traveler_fit`
- `season_fit`
- `best_time`
- `experience_value`
- `avoid_when`
- `nearby_assets`
- `map_asset_id`

### Loader non-responsibilities

The loader should not be responsible for:

- ranking
- recommendation
- final asset selection
- route sequencing
- map enrichment

The loader is an input boundary, not a decision layer.

## 6. Asset Ranking Design

The future selector adapter should rank assets against a normalized request profile.

### Example input

```json
{
  "traveler": "solo",
  "season": "spring",
  "purpose": "deep_exploration"
}
```

### Example output

```json
[
  {
    "name": "White Pagoda Temple",
    "score": 8.9
  },
  {
    "name": "Wudaoying",
    "score": 8.6
  }
]
```

### Ranking objective

The ranking model should answer:

- which assets best fit this traveler
- which assets best fit this season
- which assets best fit this trip goal
- which assets should be avoided
- which assets form better combinations together

### Recommended scoring dimensions

#### 6.1 Traveler Fit

This should have the highest weight.

Why:

- traveler mismatch is the fastest way to produce wrong route feel

Examples:

- `solo` should boost:
  - `slow_walk_anchor`
  - `solo_texture`
  - `browse_asset`
  - `reflection_space`
- `couple` should boost:
  - `sunset_anchor`
  - `mood_transition`
  - `evening_closure`
  - `waterfront_evening`
- `student` should boost:
  - `food_backbone`
  - `budget_value`
  - `social_energy`
  - `compact_half_day`

Suggested effect:

- strongest positive multiplier
- strongest negative penalty when fit is weak

#### 6.2 Season Fit

Season should be the second major weight.

Why:

- season should affect what gets selected, not just how copy is written

Examples:

- `spring` should boost:
  - parks
  - lighter outdoor assets
  - slower street wandering
- `winter` should boost:
  - warming food assets
  - lower-exposure urban blocks
  - compact movement segments
- `autumn` should boost:
  - view assets
  - water-edge walking
  - evening atmosphere assets

Suggested effect:

- moderate-to-high score multiplier

#### 6.3 Content Role Fit

This dimension should match trip purpose to editorial role.

Why:

- even the right traveler and season can still produce repetitive routes if role balance is ignored

Examples:

- `first_visit` should boost:
  - `signature_anchor`
  - `cultural_anchor`
  - `first_visit_support`
- `deep_exploration` should boost:
  - `historic_texture`
  - `slow_walk`
  - `browse_asset`
  - `local_life_anchor`
- `food_exploration` should boost:
  - `food_backbone`
  - `breakfast_anchor`
  - `food_history_connection`

Suggested effect:

- high positive weight, slightly below traveler fit

#### 6.4 Avoid Rule Penalty

Avoid rules should explicitly lower unsuitable assets.

Why:

- this is the future mechanism that prevents obvious selector mistakes

Examples:

- if request is:
  - one day
  - first visit

then deep browse hutong assets should not be ranked too high

- if request is:
  - highly compressed
  - budget-constrained

then distant or soft-payoff assets should be penalized

Suggested effect:

- hard penalty or downgrade multiplier

#### 6.5 Nearby Relationship Bonus

Nearby relationships should reward assets that form plausible route groups.

Why:

- good routes are not only good individual assets
- they are good clusters

Examples:

- `forbidden_city` and `jingshan_park` should strengthen each other
- `shichahai` and `gulou` should strengthen each other
- `qianmen_food` and `yangmeizhu_street` should strengthen each other

Suggested effect:

- smaller positive bonus than traveler fit
- used after base ranking to improve cluster coherence

### Recommended ranking shape

A practical V1 scoring model can be:

```text
asset_score =
traveler_fit * 4
+ season_fit * 3
+ content_role_fit * 3
+ nearby_bonus * 1.5
- avoid_penalty * 4
```

This is intentionally interpretable.

It is better for the current stage than a hidden or highly abstract model.

## 7. Candidate Selection Output

The ranking layer should not just return one flat sorted list.

It should ideally produce:

- ranked asset list
- selected top assets
- selection reasons
- category balance summary

### Suggested selection output shape

```json
{
  "selected_assets": [
    {
      "asset_id": "ca_beijing_jingshan_park",
      "score": 8.6,
      "selection_reason": [
        "high traveler fit for couple",
        "high autumn fit",
        "supports sunset closure logic"
      ],
      "editorial_roles": ["imperial_view", "sunset_anchor"]
    }
  ]
}
```

This is important because future debugging should be able to answer:

- why was this chosen
- why was this not chosen

## 8. Compatibility Strategy With Old Selector

The system should not delete the old selector immediately.

That would be too risky and too disruptive.

Instead, migration should happen in phases.

### Phase 1

Keep the existing selector.

Its job remains:

- request understanding
- coarse route direction
- city-specific top-level framing

Then introduce:

- `Content Asset Ranking`

### Phase 1 flow

```text
Request
-> Old Selector
-> Candidate Asset Scope
-> Asset Ranking
-> Selected Assets
```

In this phase:

- old selector still produces macro intent
- new asset layer chooses which editorial assets best fit that intent

This is the safest first integration path.

### Phase 2

Gradually reduce hardcoded place rules inside:

- `selectContext.ts`

Specifically, it should stop owning:

- specific district defaults
- specific POI lists
- specific food picks

And increasingly own only:

- interpreted request profile
- selection constraints
- route goals

### Phase 3

Let asset selection become the primary content-selection mechanism.

At that point:

- `selectContext.ts` becomes a request-profile producer
- content asset ranking becomes the asset decision layer
- map resolver remains the geography truth layer

This phased strategy is preferable because it preserves:

- testability
- backward compatibility
- traceability

## 9. Future GenerationContext Change Design

In the future, `GenerationContext` will likely need a new module such as:

- `content_asset_context`

### Suggested future shape

```json
{
  "content_asset_context": {
    "selected_assets": [],
    "selection_reason": [],
    "editorial_roles": []
  }
}
```

This future module could contain:

- selected assets
- score summary
- reasons for inclusion
- editorial role balance

### Important constraint

This document does not propose changing:

- `src/context/types.ts`

yet.

This is design-only.

The point is to establish the future direction before changing production types.

## 10. Beijing Sample Mapping Examples

Below are examples of how future content asset selection could work for the three Beijing sample types.

These are not production outputs.

They are selector mapping examples.

### 10.1 Couple Example

Input:

```json
{
  "traveler": "couple",
  "purpose": "first_visit",
  "season": "autumn"
}
```

Recommended assets:

- `forbidden_city`
- `jingshan_park`
- `beihai_park`
- `shichahai`
- `liangma_river`

Why this set works:

- keeps first-visit symbolic clarity
- adds visual release
- adds softer royal-garden pacing
- adds old-city dusk atmosphere
- adds a modern couple closure option

### 10.2 Student Example

Input:

```json
{
  "traveler": "student",
  "purpose": "food_exploration",
  "season": "winter"
}
```

Recommended assets:

- `niujie`
- `huguosi_food`
- `qianmen_food`
- `gulou`

Why this set works:

- builds route value around food, not around landmark compromise
- supports winter appetite logic
- keeps budget-friendly memory points
- allows one street-energy connector without overcomplicating movement

### 10.3 Solo Example

Input:

```json
{
  "traveler": "solo",
  "purpose": "deep_exploration",
  "season": "spring"
}
```

Recommended assets:

- `baita_temple`
- `wudaoying`
- `culture_pause_asset`
- `art_798`

Why this set works:

- preserves slower cultural texture
- supports browsing and free pauses
- protects non-couple narrative rhythm
- gives a clean old/new contrast without forcing high-density coverage

## 11. Recommended Implementation Boundary

The future implementation should be split into:

### Request interpretation layer

Owned by:

- current selector family

Outputs:

- normalized trip profile

### Content asset selection layer

Owned by:

- future `src/contentAsset/`
- ranking and selection modules

Outputs:

- ranked assets
- selected content assets

### Geography enrichment layer

Owned by:

- map repository
- map resolver

Outputs:

- verified place facts
- route truth

This boundary keeps the architecture from collapsing back into one giant selector file.

## 12. Success Standard

This integration design is successful if the future implementation can clearly answer:

- who interpreted the request
- who selected the editorial assets
- who verified the geographic movement truth
- why a specific asset was selected
- why a specific asset combination produced a route cluster

It is not successful if future implementation still relies primarily on:

- large hardcoded place lists inside `selectContext.ts`
- opaque city-specific overrides
- non-explainable repeated route defaults

The purpose of this design is to make content selection:

- modular
- explainable
- scalable across cities
- compatible with the current system

