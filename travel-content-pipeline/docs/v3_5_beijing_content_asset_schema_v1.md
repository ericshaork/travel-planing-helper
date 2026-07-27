# V3.5 Step1-E1.5 Beijing Content Asset Library Schema V1

## 1. Purpose

This document defines the first schema design for:

`input/content_assets_v1/beijing/`

It is a design and seed-asset step only.

It does not:

- modify generation flow
- modify prompt
- modify retry
- modify schema validation
- modify `Context Selector` code
- modify `GenerationContext` code

The goal is to create a new editorial asset layer that future selector logic can consume.

## 2. Why Content Asset Library Is Needed

The current Wanderly content pipeline already has:

```text
Request
-> Context Selector
-> GenerationContext
-> DeepSeek
-> Validation
-> Output
```

It also already has a map fact layer:

```text
Map Asset
-> Map Resolver
-> GenerationContext
```

This means the system is beginning to carry more grounded factual structure.

But the current Beijing sample review exposed a different problem:

- traveler types differ
- route tone differs
- but the editorial building blocks still repeat too often

The problem is not only that the POI pool is limited.

The deeper problem is that the system still lacks a structured content-level asset layer that can answer:

- why this place matters
- which traveler it fits best
- in which season it becomes strong or weak
- what kind of experience value it creates
- when it should be avoided
- what neighboring assets it pairs with well

Without that layer, the selector is forced to over-rely on a small POI set and vague strategy text.

## 3. Current Problem

The three Beijing premium sample types:

- couple
- student
- solo

should not necessarily select the same city slice in the same way.

At the moment, differentiation is constrained because the selector mostly works from:

- city strategy
- route guidance
- a limited POI pool
- limited verified route facts

That creates several risks:

- the same landmark anchors recur too often
- “traveler differentiation” becomes mostly wording-level
- food, street texture, and secondary neighborhoods are harder to select intentionally
- the system knows where a place is, but not strongly enough what editorial role it should play

So V1 needs a structured asset layer between raw city knowledge and future selector scoring.

## 4. Asset vs Map Asset

`Content Asset` is not the same thing as `Map Asset`.

They solve different problems.

### Map Asset

Map Asset is responsible for movement truth and place verification.

Typical responsibilities:

- coordinates
- route distance
- route duration
- verified provider result
- route feasibility facts

Map Asset answers:

- where is it
- is it verified
- how far is it
- how long does movement take

### Content Asset

Content Asset is responsible for editorial selection value.

Typical responsibilities:

- why to go
- who it fits
- when it is strongest
- what kind of experience it creates
- when it should be avoided
- what it pairs with nearby

Content Asset answers:

- why this asset should enter a premium plan
- which traveler type benefits most
- which season or time window strengthens it
- what editorial role it plays in route composition

### Boundary

The clean boundary should be:

```text
Map Asset = geographic truth
Content Asset = editorial truth
```

Future selector logic should combine both, but they should remain separate assets.

## 5. Design Goal

The Beijing Content Asset Library V1 should:

- stay small
- stay interpretable
- stay manually editable
- remain separate from generation output schema
- remain separate from map truth schema

It is not meant to be a massive destination database.

It is meant to become a high-signal editorial library for premium Explore plan selection.

## 6. Proposed Schema

Each asset is a standalone JSON file under:

`input/content_assets_v1/beijing/`

Recommended fields:

### `id`

Stable internal content asset id.

Purpose:

- supports selector lookup
- supports future references between assets
- avoids coupling logic to display name

### `name`

Human-readable display name.

Purpose:

- editor readability
- future debugging
- future selector traces

### `asset_type`

High-level asset kind.

Recommended early values:

- `landmark`
- `district`
- `food_cluster`
- `creative_area`
- `street_texture`

Purpose:

- distinguishes editorial asset families
- helps selector apply type-specific logic

### `category`

More specific classification within the asset type.

Examples:

- `imperial_landmark`
- `hutong_culture`
- `halal_food_street`
- `contemporary_art_cluster`
- `local_life_texture`

Purpose:

- supports finer selector scoring
- keeps meaning more precise than `asset_type`

### `content_role`

Defines what job this asset can do inside a plan.

Recommended early values:

- `signature_anchor`
- `secondary_anchor`
- `texture_injector`
- `food_backbone`
- `mood_transition`
- `half_day_cluster`

Purpose:

- helps the selector build balanced route composition
- prevents every chosen place from behaving like a main landmark

### `traveler_fit`

Structured fit by traveler type.

Recommended shape:

```json
{
  "couple": "high",
  "student": "medium",
  "solo": "high",
  "family": "low"
}
```

Purpose:

- gives the selector explicit traveler differentiation signals

### `season_fit`

Structured fit by season.

Recommended shape:

```json
{
  "spring": "high",
  "summer": "medium",
  "autumn": "high",
  "winter": "low"
}
```

Purpose:

- lets future selection logic reduce weak seasonal defaults

### `best_time`

Editorially strongest visit time.

Recommended shape:

```json
{
  "time_of_day": ["morning", "late_afternoon"],
  "note": "Strongest when crowd pressure is lower and visual payoff is clearer."
}
```

Purpose:

- supports route sequencing
- helps opener / build / close decisions

### `experience_value`

Short structured explanation of the asset’s editorial value.

Recommended shape:

```json
{
  "primary": ["city_symbolism", "viewpoint_release"],
  "summary": "Why this matters in a premium route."
}
```

Purpose:

- makes the selector’s reasoning explainable
- converts vague city knowledge into usable asset semantics

### `avoid_when`

Defines known mismatch or downgrade conditions.

Recommended shape:

```json
[
  "peak_holiday_crowds",
  "low_energy_half_day",
  "ultra_low_budget_route"
]
```

Purpose:

- gives future selector hard or soft rejection conditions

### `nearby_assets`

References to other content assets that naturally pair nearby or rhythmically.

Recommended shape:

```json
[
  "ca_beijing_jingshan_park",
  "ca_beijing_shichahai_lakeside"
]
```

Purpose:

- supports future clustering
- supports route grouping before map-level validation

### `map_asset_id`

Reference to the related verified map asset when one exists.

Purpose:

- joins editorial assets with map truth
- keeps the two systems separate but connectable

Important rule:

- `map_asset_id` may be empty or omitted in the future if a content asset does not map cleanly to one POI
- but if a clean verified POI already exists, linking it is preferred

## 7. Recommended V1 File Shape

Suggested V1 single-file shape:

```json
{
  "id": "ca_beijing_example",
  "name": "Example Asset",
  "asset_type": "landmark",
  "category": "example_category",
  "content_role": ["signature_anchor"],
  "traveler_fit": {
    "couple": "high",
    "student": "medium",
    "solo": "medium",
    "family": "low"
  },
  "season_fit": {
    "spring": "high",
    "summer": "medium",
    "autumn": "high",
    "winter": "low"
  },
  "best_time": {
    "time_of_day": ["morning"],
    "note": "Short editorial timing note."
  },
  "experience_value": {
    "primary": ["city_symbolism"],
    "summary": "Short explanation of why it should be selected."
  },
  "avoid_when": ["peak_holiday_crowds"],
  "nearby_assets": [],
  "map_asset_id": "B000000000"
}
```

## 8. Why This Schema Is Useful

This schema gives future selector logic something it does not yet have:

- explicit asset role
- explicit traveler fit
- explicit seasonal fit
- explicit usage boundaries
- explicit neighbor relationships

That means future selection can move from:

- “pick from a small POI list”

toward:

- “compose from editorial assets with known role and fit”

This is the real reason the layer matters.

## 9. What V1 Should Not Do Yet

V1 should not try to solve:

- full selector implementation
- automatic scoring engine changes
- output schema redesign
- map resolver redesign
- prompt redesign
- large-scale destination expansion

This step is only about:

- asset structure
- file layout
- a few Beijing seed examples

## 10. Expansion Strategy

The expansion strategy should stay controlled.

### Phase 1

Seed only a few high-value examples.

Recommended first Beijing seed set:

- Forbidden City
- White Pagoda Temple
- Niujie
- 798 Art District

This gives four very different editorial roles:

- imperial signature anchor
- neighborhood texture / slower culture slice
- food backbone
- contemporary contrast anchor

### Phase 2

Expand by asset role, not by random place accumulation.

Recommended order:

1. add missing route anchors
2. add food-first assets
3. add texture injectors
4. add alternative non-first-visit assets

### Phase 3

Only after enough seed assets exist should the selector be upgraded to:

- score content assets directly
- cluster nearby content assets
- cross-check selected content assets with map assets

## 11. Relationship To Existing Architecture

The future desired layering should become:

```text
Request
-> Context Selector
   -> City Strategy
   -> Content Asset Library
   -> Map Asset Library
-> GenerationContext
-> DeepSeek
-> Validation
-> Output
```

In that structure:

- city strategy provides macro editorial direction
- content asset library provides selectable editorial building blocks
- map asset library provides geographic truth

That is a stronger separation of responsibilities than using POI alone to carry all meaning.

## 12. Success Standard

This schema design is successful if future selector work can clearly answer:

- why this asset was chosen
- what editorial role it fills
- why it fits this traveler
- why it is seasonally strong or weak
- which nearby asset it should pair with
- how it connects to verified map truth

If future implementation still treats all places as interchangeable POIs, then the asset library is not being used correctly.

