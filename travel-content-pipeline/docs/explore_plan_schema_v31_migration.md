# Explore Plan Schema V3.1 Migration

## Purpose

This document explains the migration from the current Explore plan schema to the new V3.1 product-grade schema.

It focuses on:

- what changed
- why the new fields were added
- how future prompts should use them

This document does not change runtime code by itself.

## Files

- Current schema: [schemas/explore_archive_schema_v1.json](/C:/Users/10200/Desktop/travel-content-pipeline/schemas/explore_archive_schema_v1.json)
- New schema: [schemas/explore_plan_schema_v31.json](/C:/Users/10200/Desktop/travel-content-pipeline/schemas/explore_plan_schema_v31.json)

## 1. Old vs New Schema

## V1 shape

The current plan schema is route-oriented but relatively flat.

Its main strengths are:

- stable top-level identity
- basic city and traveler metadata
- structured `daily_itinerary`
- structured POI and food arrays

Its main limitations are:

- no product homepage layer
- no explicit pre-trip preparation module
- no timeline with visible transfer logic
- no route-design explanation layer
- no operational notes or fallback strategy
- no explicit distinction between “editorial summary” and “execution detail”

## V3.1 shape

The new schema is product-oriented and layered.

It introduces the following top-level blocks:

- `plan_meta`
- `hero`
- `pre_trip`
- `day_overview`
- `daily_route_details`
- `route_design_reasoning`
- `experience_tips`
- `poi_reference`
- `food_reference`
- `operational_notes`
- `fallback_options`

The key difference is conceptual:

- V1 stores a structured itinerary
- V3.1 stores a usable travel product

## 2. Why These Fields Were Added

## `plan_meta`

Why:

- keeps machine identity and classification stable
- separates structural metadata from user-facing narrative blocks

## `hero`

Why:

- current outputs often open with a title and summary only
- premium plans need a proper first-screen value proposition

What it adds:

- quick facts
- route signature
- save-worthy highlights

## `pre_trip`

Why:

- users need preparation guidance before they start the route
- current outputs often start too late, after the trip has already “begun”

What it adds:

- booking checklist
- transport setup
- packing/wear guidance
- budget expectation
- arrival-day or day-zero advice

## `day_overview`

Why:

- users need a skim-friendly version before reading full details
- long route products are easier to save and understand when there is a fast summary layer

What it adds:

- theme by day
- district grouping by day
- energy level per day

## `daily_route_details`

Why:

- the old `daily_itinerary` structure is too light for true execution
- “morning / afternoon / evening” alone is not enough for a premium travel product

What it adds:

- `theme`
- `why_today_matters`
- `route_summary`
- `timeline`
- `district_flow`
- `meal_plan`
- `energy_notes`
- `backup_options`

## `timeline`

Why:

- the user needs time logic, not only route prose
- current plans often do not explain when to go, how long to stay, or why the order works

What it adds:

- `time_range`
- `location`
- `activity`
- `stay_duration_minutes`
- `transport_to_next`
- `why_this_slot`

This is one of the most important V3.1 changes because it turns itinerary blocks into route instructions.

## `route_design_reasoning`

Why:

- users and editors both need to understand why the route is arranged this way
- otherwise the output still feels like “AI selected places”

What it adds:

- why this route exists
- why this order is used
- why these districts were chosen
- why it fits the target traveler

## `experience_tips`

Why:

- premium plans need small but meaningful guidance beyond the base route
- these tips make the plan feel guided, not merely generated

What it adds:

- photo timing tips
- queue protection tips
- pacing tips
- when-to-slow-down notes

## `poi_reference` and `food_reference`

Why:

- the old `pois` and `food` arrays are useful, but V3.1 needs richer reference blocks tied to execution value

What they add:

- budget signals
- booking needs
- transport mode
- queue and walking notes
- dining scenarios

## `operational_notes`

Why:

- premium plans need one place where friction is made visible
- users should know the operational risks before starting

What it adds:

- booking notes
- queue notes
- walking notes
- transport notes
- weather notes

## `fallback_options`

Why:

- real travel plans fail if reality changes and there is no fallback logic
- premium products should anticipate things going wrong

What it adds:

- what to trim
- what to swap
- what to protect if time, weather, or queues break the intended route

## 3. Schema Philosophy Shift

The migration is not just a field expansion.

It is a shift from:

- structured route output

to:

- structured route product output

This means V3.1 is expected to produce content that is:

- readable
- actionable
- time-aware
- traveler-specific
- operationally transparent

## 4. How Future Prompts Should Use V3.1

The schema is only useful if prompt design changes with it.

## Prompt direction

Future prompts should stop asking for:

- a nice itinerary

and start asking for:

- a save-worthy and executable travel product

## Prompt responsibilities by field

### `hero`

Prompt should require:

- a value proposition
- target traveler clarity
- route signature
- quick facts for immediate trust

### `pre_trip`

Prompt should require:

- advance booking reminders
- realistic transit setup
- gear or packing hints tied to the route

### `day_overview`

Prompt should require:

- one line per day
- clear day identity
- visible energy progression across days

### `daily_route_details`

Prompt should require:

- exact route purpose for each day
- district clustering
- timeline sequence
- meal role by route phase
- energy and fallback logic

### `timeline`

Prompt should require each segment to explain:

- when it happens
- how long it lasts
- how to move next
- why this slot is chosen

### `route_design_reasoning`

Prompt should require explicit justification.

Not optional justification.

The model should explain:

- why this order
- why this district flow
- why this route is better than a generic checklist

### `experience_tips`

Prompt should require:

- practical, non-generic guidance
- no filler phrases
- no empty “enjoy the city” style copy

### `operational_notes` and `fallback_options`

Prompt should require:

- queue risk visibility
- weather and fatigue logic
- one or more fallback moves that keep the trip coherent

## 5. Migration Strategy Recommendation

V3.1 should not replace V1 in one step.

Recommended staged path:

1. Keep the current V1 schema for existing generation and batch pipelines
2. Use `explore_plan_schema_v31.json` as a parallel target for premium sample work
3. Validate a few hand-picked city/traveler combinations first
4. Upgrade prompts and generation flow only after V3.1 output quality is editorially acceptable

This allows:

- lower rollout risk
- easier comparison
- cleaner premium sample experiments

## 6. Expected Outcome

If V3.1 is used correctly, future plans should feel less like:

- AI route recommendation

and more like:

- professional travel editor output

The user should understand:

- what kind of trip this is
- why the route is arranged this way
- when to go
- how to move
- what to book
- what to do if reality changes

That is the real purpose of the schema upgrade.
