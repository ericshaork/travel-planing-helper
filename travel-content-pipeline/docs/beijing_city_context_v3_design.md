# Beijing City Context V3 Design

## Purpose

This document defines the V3 design direction for Beijing city context in `travel-content-pipeline`.

V3 is not about expanding city coverage.

It is about building a first batch of premium Explore content samples that can later produce:

- executable travel plans
- stronger audience differentiation
- lower POI repetition
- more realistic route decisions

This is a design document only.

It does not:

- modify code
- modify prompts
- generate travel plans

## Why V3 Is Needed

V2 already improves:

- city personality
- district logic
- traveler-type differences
- basic route structure

But V2 is still mainly a knowledge and strategy layer.

To create premium sample plans, Beijing V3 must go one level deeper into:

- route execution constraints
- POI-level travel friction
- real-world timing and reservation requirements
- crowd and season effects
- reusable route templates by traveler type

In short:

V2 helps the system think like an editor.
V3 should help the system think like a route planner.

## V3 Design Principles

### 1. Every strong route needs operational logic

The route should not just be interesting.
It should be doable.

That means the context must support decisions like:

- Is this stop worth three hours or one hour?
- Does this place require advance booking?
- Is this morning-only or better at dusk?
- Is it realistic to combine these two zones in one day?
- Will this route collapse during peak season?

### 2. Districts are route units, not only style labels

A district should explain:

- what role it plays in the city
- who it suits
- when it is strongest
- what it pairs well with
- what it should not be paired with

### 3. POIs need real travel constraints

A landmark is not just a name and a vibe.

It should also describe:

- stay duration
- budget level
- reservation requirement
- transport mode
- walking intensity
- queue risk
- overuse risk

### 4. Templates should be route-shaped, not list-shaped

The template layer should eventually help generation produce:

- realistic day rhythm
- district clustering
- audience-specific pacing
- meaningful differences across student, couple, family, and solo routes

## V3 Structure Overview

Suggested Beijing V3 top-level shape:

```json
{
  "schema_version": "city_context_v3",
  "city_code": "beijing",
  "city_name": "Beijing",
  "region_name": "Beijing",
  "city_personality": {},
  "district_knowledge": [],
  "poi_experience_knowledge": [],
  "food_knowledge": [],
  "traveler_type_guidance": {},
  "real_travel_constraints": {},
  "route_strategy": {},
  "route_templates": [],
  "season_timing_notes": {},
  "metadata": {}
}
```

Compared with V2, the key additions are:

- richer district route logic
- POI execution constraints
- explicit real-world travel constraints
- traveler-facing route templates

## 1. District Route Logic

Each district should move from “area knowledge” to “route decision knowledge.”

### Required district fields

Suggested structure:

```json
{
  "id": "",
  "name": "",
  "city_role": "",
  "best_for": [],
  "best_time_of_day": [],
  "pair_with_district_ids": [],
  "avoid_pairing_district_ids": [],
  "signature_experiences": [],
  "mobility_notes": [],
  "route_use_cases": []
}
```

### Field purpose

#### `city_role`

Explains what this district contributes to Beijing as a whole.

Examples:

- imperial history anchor
- neighborhood texture anchor
- creative modern contrast anchor
- night lifestyle anchor

This prevents generation from treating every area as a generic sightseeing zone.

#### `best_for`

Defines which traveler types benefit most from this district.

This should not be a broad default field.
It should reflect actual route value.

#### `best_time_of_day`

Defines when the district is strongest in route planning.

Examples:

- morning for heritage sightseeing
- afternoon for galleries and citywalk
- dusk for lakeside atmosphere
- night for modern dining and social energy

#### `pair_with_district_ids`

Lists areas that combine naturally with low friction or strong thematic flow.

This supports itinerary building.

#### `avoid_pairing_district_ids`

Lists combinations that should usually be avoided.

Reasons may include:

- long transfer cost
- repeated experience type
- crowd overload
- weak route narrative

#### `mobility_notes`

Explains route friction in practical language.

Examples:

- not suitable after a heavy walking morning
- best used as a focused half day
- requires east-side clustering
- poor fit for family if combined with two distant zones

### Recommended Beijing district set

At minimum, V3 Beijing should continue to model:

- Imperial Core
- Hutong / Shichahai
- 798 Art District
- Sanlitun / Modern Urban Core

Potential future additions:

- Temple of Heaven and South Central heritage belt
- Qianmen / Dashilar heritage-food zone
- Olympic Park / broad family movement zone
- CBD skyline / business-urban modern contrast zone

## 2. POI Experience Knowledge

V3 POI design should move from descriptive knowledge to usable route constraints.

### Required POI fields

Suggested structure:

```json
{
  "id": "",
  "name": "",
  "district_id": "",
  "landmark_level": "",
  "experience_tags": [],
  "best_for": [],
  "recommended_duration_minutes": 0,
  "budget_level": "",
  "reservation_requirement": "",
  "transport_mode": [],
  "route_roles": [],
  "walking_intensity": "",
  "queue_risk": "",
  "time_restriction_notes": [],
  "risks": [],
  "description": ""
}
```

### Field purpose

#### `recommended_duration_minutes`

Defines realistic stay time.

This is necessary because route quality often fails when POIs are treated as interchangeable stops.

#### `budget_level`

Explains whether the stop is mostly compatible with:

- low
- medium
- high

This does not mean ticket pricing only.
It should reflect total route fit and cost pressure.

#### `reservation_requirement`

Suggested values:

- none
- recommended
- required
- strongly_required_in_peak_season

This matters because some Beijing landmarks become operationally weak without planning.

#### `transport_mode`

Suggested values:

- walk
- metro
- taxi
- mixed

This helps route-building choose realistic transitions.

#### `route_roles`

Suggested route role types:

- day_opener
- primary_anchor
- scenic_insert
- transition_stop
- evening_closer
- optional_detour
- backup_choice

This gives the generator a functional reason for inclusion.

#### `walking_intensity`

Suggested values:

- low
- medium
- high

This is critical for family routes and for not overloading dense city days.

#### `queue_risk`

Suggested values:

- low
- medium
- high
- extreme_in_peak_season

This helps avoid building fantasy routes during busy periods.

#### `time_restriction_notes`

Captures opening-window or timing logic.

Examples:

- best in early morning
- weak in midday heat
- night value only
- avoid during peak queue hours when possible

#### `risks`

Should include real route risks, not only content risks.

Examples:

- overused across many Beijing routes
- weak payoff unless paired with nearby food or viewpoint
- tiring for children
- too crowded to function as a “relaxed” stop

## 3. Real Travel Constraints

V3 needs a dedicated layer for citywide operational constraints.

Suggested structure:

```json
{
  "peak_season_notes": [],
  "queue_behavior_notes": [],
  "walking_load_notes": [],
  "time_limit_notes": [],
  "booking_notes": [],
  "family_friction_notes": [],
  "night_mobility_notes": []
}
```

### What this layer should cover

#### Peak season issues

- major landmark crowd pressure
- route degradation during holidays
- districts that become less enjoyable when overloaded
- need for tighter district clustering when city movement becomes slower

#### Queue behavior

- which landmark types create heavy waiting cost
- which experiences lose value when queues dominate the day
- when a backup route or softer neighborhood layer is preferable

#### Walking intensity

- heritage-heavy days can become physically expensive
- lakeside and hutong routes may be pleasant but still walking-intensive
- family and senior-friendly logic should avoid cumulative walking traps

#### Time limits

- some stops need early entry logic
- some districts are low-value if visited at the wrong time
- some zones only become meaningful in the evening

### Example Beijing constraints

- Peak holiday landmark queues can distort the value of a heritage-heavy day
- Forbidden City style anchors may need advance planning and earlier starts
- Summer heat amplifies fatigue in open, walking-heavy heritage routes
- Hutong routes are charming but should not be mistaken for zero-effort walking
- Sanlitun is stronger as an evening close than a daytime identity anchor

## 4. Route Strategy In V3

V3 route strategy should become more executable than V2.

Suggested structure:

```json
{
  "half_day_combinations": [],
  "one_day_route_shapes": [],
  "multi_day_balance_rules": [],
  "avoid_combinations": [],
  "backup_logic": [],
  "diversification_rules": []
}
```

### New V3 expectations

#### Half-day combinations

Each half-day unit should explain:

- district cluster
- intended traveler types
- expected energy level
- whether it is heritage-heavy, walk-heavy, or food-heavy

#### One-day route shapes

Each route shape should define:

- start logic
- midday rhythm
- afternoon transition
- evening close

This matters because good Explore plans feel composed, not assembled.

#### Multi-day balance rules

Across 3-day or 5-day plans, V3 should prevent:

- repeating the same district logic daily
- stacking all heavy landmarks too early
- putting all atmospheric content at the end
- giving every traveler type the same day skeleton

#### Backup logic

Later versions should support route fallback patterns such as:

- if one iconic anchor is too risky, shift to neighborhood-led day
- if a family day is too heavy, replace modern contrast zone with softer local texture

## 5. Route Templates

V3 should explicitly define premium route templates for high-quality first samples.

These templates are not final plan outputs.
They are route design scaffolds.

They should encode:

- audience fit
- day-to-day structure
- district logic
- pacing
- experience rhythm

### Template A: Beijing Student 3D

Design goal:

- affordable
- iconic but not formal
- youthful
- walkable
- visibly different from couple/family logic

Suggested shape:

#### Day 1

- light iconic Beijing opener
- old-city texture without overloading ticketed landmarks
- snack-friendly evening

#### Day 2

- 798 contemporary contrast
- cafe/gallery rhythm
- lively modern urban evening

#### Day 3

- hutong or neighborhood-led exploration
- flexible low-cost citywalk
- optional scenic close

Route philosophy:

- one iconic layer is enough
- prioritize social and local-feeling movement
- keep food rhythm casual and affordable

### Template B: Beijing Couple 3D

Design goal:

- atmosphere
- photo value
- emotional route flow
- day-to-night transitions

Suggested shape:

#### Day 1

- scenic heritage opening
- viewpoint or soft visual release
- hutong and lakeside evening

#### Day 2

- modern creative contrast
- slower afternoon rhythm
- stylish dinner or urban evening close

#### Day 3

- lighter neighborhood-based day
- less checklist pressure
- stronger shared-experience emphasis

Route philosophy:

- each day should feel like a mood arc
- heritage should be softened with texture and evening payoff
- avoid turning the route into a museum list

### Template C: Beijing Family 5D

Design goal:

- iconic
- comfortable
- low-friction
- clear pacing
- recovery built into the schedule

Suggested shape:

#### Day 1

- simple city arrival rhythm
- easy-recognition area
- low-pressure evening

#### Day 2

- one major heritage anchor
- nearby meal and soft walk

#### Day 3

- more open-space or less dense culture day
- avoid back-to-back heavy ticket logic

#### Day 4

- city-character day with manageable movement
- family-friendly food and rest access

#### Day 5

- light closeout day
- no heavy cross-city transfers

Route philosophy:

- never stack multiple physically expensive days in a row
- landmark clarity matters more than route ambition
- comfort is part of quality, not a compromise

### Template D: Beijing Solo 3D

Design goal:

- flexible
- layered
- self-directed
- rich in city texture

Suggested shape:

#### Day 1

- one clear heritage anchor
- observation-heavy walking district after it

#### Day 2

- creative or contemporary contrast day
- independent cafe/gallery rhythm

#### Day 3

- looser citywalk day
- smaller discoveries
- scenic or reflective close

Route philosophy:

- the route should create room for wandering
- solo does not mean empty or generic
- independent exploration should still feel designed

## District Guidance For V3 Beijing

### Imperial Core

V3 role:

- primary history anchor
- high-recognition opener
- strongest when used intentionally, not automatically

Best for:

- all traveler types, but with different weight

Best time:

- morning first

Recommended combinations:

- Hutong / Shichahai
- Qianmen-style traditional food zone

Not recommended:

- pairing with too many other heavy heritage zones in one day
- stuffing it into a modern-east-side contrast route

### Hutong / Shichahai

V3 role:

- local-texture softener
- atmosphere and walking anchor
- evening value zone

Best for:

- all traveler types, especially couple and solo

Best time:

- afternoon to evening

Recommended combinations:

- Imperial Core
- light food-focused rhythm

Not recommended:

- treating it as a quick filler stop with no time to wander

### 798 / Art District

V3 role:

- contemporary contrast anchor
- creative half-day
- student/couple/solo differentiation lever

Best for:

- couple
- student
- solo

Best time:

- afternoon

Recommended combinations:

- Sanlitun / Modern Urban Core

Not recommended:

- forced combination with heavy old-city landmark day for family routes

### Sanlitun / Modern Urban Core

V3 role:

- evening closer
- modern lifestyle contrast
- social and dining energy

Best for:

- couple
- student
- solo

Best time:

- late afternoon to night

Recommended combinations:

- 798
- Hutong / Shichahai when the route wants old-vs-new contrast

Not recommended:

- serving as the sole identity of a Beijing plan

## What V3 Should Enable Later

If adopted well, Beijing V3 should later let the generator produce plans that are:

- more realistic in time use
- more distinct by traveler type
- less repetitive in landmark selection
- more aware of queue and fatigue cost
- more route-shaped than recommendation-shaped

The desired editorial outcome is:

- not “here are some Beijing places”
- but “here is a Beijing route you could actually follow”

## Success Standard

Beijing V3 is successful if future outputs become noticeably better on four dimensions:

- execution feasibility
- traveler differentiation
- city-specific route identity
- reduced dependence on generic landmark stacks

If the output still reads like a reordered POI list, V3 has not gone far enough.
