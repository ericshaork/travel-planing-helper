# Explore Content Matrix V1

## Purpose

This document defines the V3.3 content matrix standard for Explore in `travel-content-pipeline`.

It is a design document only.

It does not:

- modify code
- modify schema
- modify prompts
- generate plans directly

The goal is to solve one core problem:

Current Explore classification is too coarse.
It can help users browse, but it cannot reliably guide premium plan generation.

V1 should upgrade Explore from a simple filter system into a generation-oriented content matrix.

## Why V1 Is Needed

Current Explore dimensions mainly stop at:

- destination
- food
- season
- traveler group

These dimensions are useful for discovery, but too weak for editorial planning.

They do not answer:

- why this trip begins now
- what kind of travel desire is driving it
- what kind of trip experience should be created
- what should be deliberately included
- what should be deliberately excluded
- why two plans in the same city should still feel fundamentally different

So V1 must add layers above simple tag filtering:

- user-facing filter layer
- travel motivation layer
- plan theme layer
- generation matrix layer

The filter layer helps users browse.
The motivation layer explains why the trip starts.
The theme layer explains what kind of trip experience should be delivered.
The matrix layer decides what to generate and how to generate it.

## Core V1 Shift

Old logic asks:

- what tags does the user want to filter by

V1 asks:

- why is the user taking this trip
- what kind of experience are they actually seeking
- what kind of premium route should be built from that intention

That means Explore should no longer be built only around tags.
It should be built around travel intent and editorial propositions.

## 1. Explore User Filter Layer

This layer is user-facing.

Its role is:

- help browsing
- help entry selection
- help narrow interest quickly

It should stay simple, stable, and understandable.

### Required filter dimensions

#### `destination_interest`

Examples:

- landmark first
- local life
- food focused
- culture and museum
- citywalk and photography
- night vibe
- family-friendly
- relaxed vacation

#### `travel_companion`

Examples:

- solo
- couple
- friends
- family with kids
- parents
- multi-generation

#### `season`

Examples:

- spring
- summer
- autumn
- winter
- all season

#### `trip_length`

Examples:

- half day
- 1 day
- 2 days
- 3 days
- 5 days

#### `pace_preference`

Examples:

- relaxed
- balanced
- intensive

### Filter-layer rule

This layer must remain:

- easy to understand
- low-cognitive-load
- suitable for product UI
- not overloaded with editorial jargon

It should not directly carry generation complexity.

## 2. Travel Motivation Layer

This layer explains why the user is starting this trip.

This is a generation-facing layer.
It should influence route priorities, emotional framing, and editorial trade-offs.

Motivation is not the same as theme.

Motivation explains the trigger.
Theme explains the travel experience type.

For example:

- `Weekend Escape` explains why the user is traveling now
- `Local Texture Citywalk` explains how the trip should feel

Both are needed.

Without motivation, generation may produce routes that are structurally valid but emotionally under-motivated.

### Required motivation dimensions

#### `First Visit`

The user wants the city's strongest first impression.

Implications:

- higher tolerance for signature experiences
- stronger need for city identity clarity
- route should feel representative without becoming checklist-heavy

#### `Weekend Escape`

The user wants a short reset from regular life.

Implications:

- lower friction matters
- fast emotional payoff matters
- route should feel restorative rather than completion-oriented

#### `Anniversary / Special Moment`

The user is traveling for a meaningful occasion.

Implications:

- memory design matters more than coverage
- atmosphere and pacing matter more than throughput
- meals and evening scenes carry more weight

#### `Food Hunting`

The trip starts because of eating desire.

Implications:

- meals can anchor the route
- food should not be treated as support only
- movement should serve eating quality, not compete with it

#### `Family Holiday`

The trip begins as shared family leisure time.

Implications:

- comfort and group compatibility matter
- memory points should work across ages
- route should protect energy and recovery

#### `Seasonal Experience`

The trip begins because there is a time-limited seasonal reason.

Implications:

- season changes route priority
- timing logic matters more
- seasonal payoff must feel central, not decorative

#### `Revisit / Deep Exploration`

The user already knows the city at a surface level and wants a deeper version.

Implications:

- repetition risk is high
- mainstream coverage may need to be reduced
- local texture, contrast, or depth should increase

### Motivation-layer rule

A strong motivation layer should change generation logic in visible ways.

If `First Visit` and `Revisit / Deep Exploration` produce the same route shell with slightly different wording, the motivation layer has failed.

## 3. Plan Theme Layer

This layer defines the travel experience type.

It is the core editorial layer.

A plan theme is not a tag.
It is a complete editorial proposition that defines:

- what kind of trip this is
- what emotional payoff it promises
- what route logic it prefers
- what food role it assigns
- what memory direction it prioritizes
- what it actively avoids

### Theme definition standard

Each theme should contain:

- a clear trip proposition
- a suitable traveler fit
- a suitable season fit
- a route rhythm preference
- a food role
- a memory direction
- an exclusion logic

### Theme should answer

- what kind of trip experience is being sold
- why the user would save this plan
- how this plan differs from other plans in the same city
- what should not be included even if it is popular

### Recommended first-phase theme families

#### 1. First-Time City Signature

For users who want the city's strongest first impression.

Characteristics:

- signature landmarks allowed
- route should feel representative but not checklist-like
- strong first-time memory points
- must avoid stuffing all famous places into one trip

#### 2. Local Texture Citywalk

For users who value neighborhood texture over landmark completion.

Characteristics:

- lighter route
- slower pace
- stronger street and daily-life scenes
- walking-based rhythm
- must avoid becoming generic lifestyle copy

#### 3. Food-Led Exploration

For users willing to organize the trip around eating.

Characteristics:

- meals are route anchors
- food is part of destination logic
- snacks, meals, and dining scene all matter
- must avoid famous-but-weak dining fillers

#### 4. Romance and Atmosphere

For mood-first travel.

Characteristics:

- visual tone matters
- day-to-night transitions matter
- dinner and evening scenes matter
- must avoid hard-core efficiency routing

#### 5. Family Ease and Shared Experience

For family travel.

Characteristics:

- restability matters
- route friction control matters
- memory points should be multi-age friendly
- must avoid adult-centric exhaustion routes

#### 6. Seasonal Limited-Time Experience

For users whose main motive is seasonal value.

Characteristics:

- season is not decoration
- season changes route priority
- timing and weather matter
- must avoid same-route-plus-seasonal-sentence outputs

#### 7. Urban Contrast Journey

For users who want to feel the city's internal contrast.

Characteristics:

- old and new
- grand and local
- daytime and nightlife
- mainstream and side texture
- must avoid random juxtaposition without narrative logic

### Theme-layer rule

A strong theme must create real generation divergence.

If two plans share the same city and same traveler but only change wording, the theme layer has failed.

## 4. City x Motivation x Theme x Traveler x Season Generation Matrix

This is the actual generation matrix.

The purpose is not to generate every combination blindly.
The purpose is to define which combinations are:

- premium-ready
- conditionally valid
- weak
- not recommended

### Matrix dimensions

- city
- motivation
- theme
- traveler
- season

### Matrix output role

For each combination, the matrix should determine:

- whether this combination is worth generating
- what kind of route bias it should take
- what must be included
- what should be actively avoided
- what food strategy it should take
- what memory strategy it should prioritize

### Combination decision standard

Each cell should be evaluated by five questions:

- Is this motivation natural for this city?
- Is this theme a good expression of that motivation?
- Does the traveler realistically fit this combination?
- Does the season strengthen or weaken it?
- Can it produce a premium route, not just a valid route?

### Cell status suggestion

- `A`: strong priority combination
- `B`: usable combination with clear constraints
- `C`: weak combination, only generate if needed
- `X`: do not prioritize

### Generation Guidance

The matrix should not stop at `A / B / C / X`.

Each cell should also define:

#### `route_bias`

What kind of route tendency should dominate.

Examples:

- signature-first but density-controlled
- meal-anchored and low-transfer
- slow citywalk with evening payoff
- one major seasonal anchor plus supporting texture

#### `must_include`

What this combination almost always needs in order to feel complete.

Examples:

- one city-signature arrival moment
- one meal worth planning around
- one evening atmosphere block
- one child-friendly restable segment
- one seasonal peak experience

#### `avoid`

What this combination should usually avoid.

Examples:

- overpacking famous landmarks
- forcing cross-city transfers
- adding generic museum filler
- weak dining placeholders
- same-day multiple heavy-ticket stops

#### `food_strategy`

How food should function in this combination.

Examples:

- practical support only
- snack plus one strong main meal
- destination-worthy dinner anchor
- family-safe and low-waiting configuration
- seasonal specialty insertion

#### `memory_strategy`

What kind of memory payoff should dominate the plan.

Examples:

- first-impression landmark memory
- intimate shared-moment memory
- local texture retellable detail
- child-friendly family photo memory
- season-only limited-time memory

### Guidance rule

The matrix should therefore answer two different questions:

- should this combination be generated
- if generated, how should it behave

Without the second layer, the matrix remains a classification tool rather than a generation tool.

### Example logic

For Beijing:

- Beijing x First Visit x First-Time City Signature x solo x autumn = `A`
- Beijing x Weekend Escape x Local Texture Citywalk x couple x autumn = `A`
- Beijing x Food Hunting x Food-Led Exploration x friends x winter = `A`
- Beijing x Family Holiday x Local Texture Citywalk x family with kids x peak summer = `B`
- Beijing x Revisit / Deep Exploration x First-Time City Signature x solo x all season = `C`
- Beijing x Anniversary / Special Moment x Family Ease and Shared Experience x solo x all season = `X`

### Example guidance logic

For:

- Beijing x Weekend Escape x Local Texture Citywalk x couple x autumn

The matrix might guide:

- `route_bias`: low-transfer, mood-first, afternoon-to-night texture route
- `must_include`: one strong walkable district, one evening atmosphere close, one worthwhile meal
- `avoid`: morning overloading, iconic-checklist pressure, weak filler attractions
- `food_strategy`: one atmosphere-driven dinner plus one casual local snack stop
- `memory_strategy`: shared atmosphere and visual night memory

### Matrix rule

The matrix must be selective.

It should prevent:

- weak combinations being generated just because they are combinatorially possible
- all motivations collapsing into the same city highlights
- all themes collapsing into the same route shell
- all audiences receiving the same pacing logic

## 5. Theme-Level Generation Guidance

Each theme should define a reusable generation brief.

### Minimum required guidance

#### `travel_proposition`

What exact trip desire this theme solves.

#### `must_have_experiences`

What this theme should almost always include.

#### `avoid_elements`

What this theme should usually avoid even if popular.

#### `route_rhythm`

What the day should feel like.

Examples:

- one big anchor plus two lighter textures
- slow start and strong evening close
- meal-centered pacing
- half-day intensity plus half-day release

#### `food_role`

How food functions in the theme.

Examples:

- utility
- local texture
- destination-worthy
- emotional anchor
- night-scene completion

#### `memory_type`

What kind of memory should dominate.

Examples:

- first impression
- local belonging
- romance
- surprise contrast
- seasonal exclusivity

## 6. Matrix Quality Standard

A strong matrix should make downstream plans become:

- more motivation-led
- more theme-led
- more selective
- more memorable
- less template-like
- easier to expand across many cities

A weak matrix will still produce:

- destination lists
- tag permutations
- same-route different-title outputs

## 7. 1000-Article Expansion Strategy

The long-term purpose of the matrix is scale without flattening quality.

### Phase 1: Build core motivation and theme library

Start from a limited set of high-confidence motivations and themes.

Recommended principle:

- fewer categories
- stronger differences
- easier editorial control

Do not start with too many subtle subtypes.

### Phase 2: Build city-specific strong combinations

For each city, identify:

- flagship motivations
- flagship themes
- strong motivation-theme pairings
- weak pairings not worth forcing

This creates a city-specific generation map rather than a universal template.

### Phase 3: Expand by high-value cells, not by tag permutation

Expansion order should be:

1. strong city x motivation x theme combinations
2. traveler variants inside strong combinations
3. season variants only when season changes route value
4. niche editorial variants later

This prevents low-quality bulk generation.

### Phase 4: Build editorial franchises

When a combination proves strong, it can become a repeatable content franchise.

Examples:

- first-visit best version series
- weekend reset series
- food-first weekend series
- anniversary atmosphere series
- revisit deeper-cut series
- seasonal short-window series

This is better than expanding with random titles.

### Phase 5: Control duplication

As scale increases, the matrix must prevent:

- same-city same-route repetition
- same-motivation same-structure repetition
- same-theme same-summary repetition
- same-food recommendation repetition
- same-memory framing repetition

The matrix should be used as a differentiation system, not just a coverage system.

## V1 Success Standard

Explore Content Matrix V1 is successful if it helps future generation answer five questions clearly:

- why is this trip happening now
- what kind of experience is this plan selling
- how is this plan different from others in the same city
- what should this plan actively avoid
- why would the user want to save and execute it

If the output still feels like:
"same city, same route, different tags and titles"
then the matrix is not deep enough.
