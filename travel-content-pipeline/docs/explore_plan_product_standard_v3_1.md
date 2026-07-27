# Explore Plan Product Standard V3.1

## Purpose

This document defines the V3.1 product standard for premium Explore travel plans in `travel-content-pipeline`.

The goal is no longer only to generate better AI routes.

The goal is to generate travel plans that feel like a professional travel editor’s deliverable:

- worth saving
- worth sharing
- worth actually following

This document does not modify code or prompts by itself.
It defines the target product standard for future generation upgrades.

## Why V3.1 Is Needed

Current V3 output is stronger than earlier versions in:

- route structure
- traveler differentiation
- district-level logic
- city character

But it still has product gaps:

- routes can still read as broad editorial description
- execution value is not explicit enough
- the user still may not know:
  - what time to go
  - how to move
  - how long to stay
  - why this sequence is better than another sequence

V3.1 exists to bridge that gap.

It should turn a “good AI itinerary” into a “usable travel product.”

## 1. Final Product Structure

A premium Explore plan should no longer feel like one long itinerary JSON.

It should behave like a layered travel product with clear user value at each level.

Suggested final product structure:

```json
{
  "plan_meta": {},
  "hero": {},
  "pre_trip": {},
  "day_overview": [],
  "daily_route_details": [],
  "route_design_reasoning": {},
  "experience_tips": [],
  "poi_reference": [],
  "food_reference": [],
  "operational_notes": {},
  "fallback_options": []
}
```

### Structure intent

- `plan_meta`: machine-readable identity and classification
- `hero`: what the user sees first and why they should care
- `pre_trip`: how to prepare before leaving
- `day_overview`: fast skim version of the trip
- `daily_route_details`: actual usable route plan
- `route_design_reasoning`: why the route is built this way
- `experience_tips`: soft value and practical reminders
- `poi_reference`: lookup layer
- `food_reference`: dining lookup layer
- `operational_notes`: queue, timing, booking, transport constraints
- `fallback_options`: what to do if reality changes

## 2. Homepage Display Standard

The first screen should not only “look editorial.”
It must immediately explain why the user should trust and save the plan.

### Homepage must answer

- Who is this plan for?
- What kind of Beijing trip is this?
- How many days and what pace?
- What makes this route different from a normal攻略?
- What is the main route logic?

### Recommended homepage blocks

#### 1. Title

Should be:

- specific
- scene-based
- human-readable
- memorable

Bad:

- 北京3日游攻略
- 经典北京路线推荐

Better:

- 皇城与胡同之间：适合一个人慢慢走的北京三天

#### 2. One-paragraph value summary

This should state:

- target traveler
- route feeling
- key route logic
- why this route is worth doing

#### 3. Quick facts strip

Must include:

- days
- traveler type
- pace
- budget level
- best season or best timing
- walking intensity

#### 4. Route signature block

This should summarize:

- route identity
- main district combination
- one sentence on why the sequence works

#### 5. Save-worthy highlights

Use 3 to 5 short bullets:

- strongest route moment
- strongest district contrast
- strongest food memory
- strongest evening or photo payoff

## 3. Pre-Trip Preparation Module

Current outputs usually start too late, after the user has already “arrived.”
V3.1 should add a clear pre-trip preparation module.

### Purpose

Reduce execution uncertainty before the user starts the trip.

### Recommended fields

```json
{
  "best_start_time": "",
  "booking_checklist": [],
  "transport_setup": [],
  "what_to_wear_or_prepare": [],
  "budget_expectation": [],
  "day_zero_advice": []
}
```

### Required content

#### `best_start_time`

State when this route works best overall.

Examples:

- best for early starts
- first day should begin before the heritage crowd builds
- modern-day routes can start later

#### `booking_checklist`

Must call out:

- ticketed landmark booking needs
- time-sensitive entry logic
- what must be decided in advance

#### `transport_setup`

Should tell the user:

- whether metro is sufficient
- where taxi is useful
- when walking load becomes significant

#### `what_to_wear_or_prepare`

Should cover:

- shoes
- weather exposure
- walking load
- queue tolerance

#### `budget_expectation`

Should not just repeat `low/medium/high`.
It should explain:

- where money is spent
- where budget can be controlled

#### `day_zero_advice`

Useful for:

- arrival-day pacing
- neighborhood choice
- avoiding an overambitious start

## 4. Daily Route Detail Standard

This is the most important V3.1 upgrade.

Each day should stop reading like:

- “go here, then go there”

and start reading like:

- “here is how the day actually unfolds”

### Daily route should contain

```json
{
  "day": 1,
  "theme": "",
  "why_today_matters": "",
  "route_summary": "",
  "timeline": [],
  "district_flow": [],
  "meal_plan": [],
  "energy_notes": [],
  "backup_options": []
}
```

### Required daily components

#### `theme`

Give the day one clear identity.

Examples:

- 帝都初印象与湖边收束
- 创意北京与夜色收尾
- 家庭恢复日

#### `why_today_matters`

Explain why this day exists in the total trip.

Examples:

- establishes iconic Beijing first
- gives the route local texture after a heavy heritage day
- creates a lower-pressure recovery day

#### `route_summary`

One paragraph that explains:

- the day’s movement logic
- emotional rhythm
- practical route value

#### `district_flow`

Should clearly state:

- where the day starts
- where the center of gravity is
- where it ends

#### `meal_plan`

Should show:

- where the route expects food to happen
- what kind of meal it is
- whether it is a quick refuel or a destination meal

#### `energy_notes`

Should state:

- whether the day is heavy, medium, or light
- where the fatigue points are
- who may need to slow down

#### `backup_options`

Should tell the user:

- what to trim if time runs long
- what to skip if queues explode
- what to substitute if weather changes

## 5. Timeline Standard

V3.1 must move beyond vague `morning / afternoon / evening` blocks.

The final product should support a clearer time model.

### Recommended timeline shape

```json
{
  "start_time": "08:30",
  "end_time": "20:30",
  "segments": [
    {
      "time_range": "08:30-10:30",
      "location": "",
      "activity": "",
      "stay_duration_minutes": 120,
      "transport_to_next": "",
      "why_this_slot": ""
    }
  ]
}
```

### Timeline rules

#### 1. Use realistic time windows

Even if the model cannot guarantee exact live timing, it should still estimate:

- start
- stay duration
- transfer
- transition

#### 2. Every segment must justify timing

Each segment should implicitly answer:

- why here at this time?

Examples:

- avoid peak queue hours
- catch evening light
- put the heavy landmark first
- place the snack stop after the longer walk

#### 3. Transfers must become visible

The user should not feel that districts magically connect.

Show:

- walking
- metro
- taxi
- short transfer

#### 4. Do not fake excessive precision

Wrong standard:

- pretending all minutes are exact

Better standard:

- precise enough to execute
- flexible enough to remain believable

## 6. Route Design Reason Standard

Future Explore plans should explicitly explain the route logic.

Without this, the plan still feels like “AI picked some places.”

### Recommended module

```json
{
  "why_this_route": "",
  "why_this_order": "",
  "why_these_districts": "",
  "why_it_fits_this_traveler": ""
}
```

### What each part should do

#### `why_this_route`

Explain why this plan exists as a distinct product.

#### `why_this_order`

Explain why day order and within-day order are intentional.

Examples:

- heavy anchor first, softer texture later
- east-side modern contrast on a separate day
- recovery day inserted before fatigue compounds

#### `why_these_districts`

Explain why these parts of the city were chosen instead of a generic landmark bundle.

#### `why_it_fits_this_traveler`

Must explicitly reference:

- family comfort
- couple atmosphere
- student budget and energy
- solo freedom and observation

## 7. Experience Tip Standard

V3.1 should include small editorial and practical tips that make the product feel guided.

These are not filler lines.
They should improve execution and experience quality.

### Recommended tip types

- best photo moment
- best snack window
- where to slow down
- when to leave earlier than expected
- where not to overstay
- what not to expect

### Good tip examples

- “If the morning landmark queue expands too quickly, shorten the second museum-like stop and protect the lakeside evening.”
- “This hutong section is better when you allow detours instead of trying to walk straight through.”
- “Do not schedule a heavy destination meal before the longest walking block.”

### Bad tip examples

- “Remember to enjoy the city.”
- “Take beautiful photos.”
- “Try local food.”

## 8. Anti-Template Rules

V3.1 must explicitly prevent premium plans from sounding like AI travel copy.

### Prohibited template habits

- repeating the same praise structure across all cities
- vague emotional lines with no route logic
- every summary using the same “old and new collide” phrase
- every day ending with “you can slow down and feel the city”
- every food stop described as “authentic local taste”

### Strong anti-template standards

#### 1. Every district mention must do work

It must provide at least one of:

- route reason
- timing reason
- traveler-fit reason
- experience difference

#### 2. Every POI reason must be route-specific

Not:

- “this is a famous landmark”

But:

- “this works here because it gives day one a clear capital-history anchor before the route softens into walkable hutong texture”

#### 3. Food must be tied to route function

Not:

- “recommended for local flavor”

But:

- “placed here because the route needs a short low-cost refuel before the longest walking segment”

#### 4. Each traveler type must visibly read differently

If `student`, `couple`, `family`, and `solo` plans can swap titles and still work, the plan fails the V3.1 standard.

## 9. Suggested New Fields

The current generation schema is still too light for a true product-grade plan.

Suggested future additions:

### Top-level fields

- `hero_reason`
- `best_for`
- `walking_intensity`
- `best_season`
- `booking_required`
- `route_signature`
- `route_design_reason`
- `pre_trip_notes`

### Daily fields

- `day_theme`
- `why_today_matters`
- `start_time`
- `end_time`
- `district_flow`
- `energy_level`
- `backup_plan`

### Activity fields

- `time_range`
- `stay_duration_minutes`
- `transport_to_next`
- `budget_hint`
- `booking_hint`
- `why_this_slot`
- `experience_tip`

### POI fields

- `budget_level`
- `reservation_requirement`
- `transport_mode`
- `walking_intensity`
- `queue_risk`
- `best_time_to_visit`

### Food fields

- `meal_moment`
- `meal_role`
- `budget_level`
- `why_here_in_route`

## 10. Prompt V3.1 Upgrade Direction

This document does not change prompts now, but it should guide the next prompt revision.

### Prompt should shift from

- “write a good plan”

to

- “deliver a usable travel product”

### Prompt V3.1 should require

#### 1. Product layering

The model should generate:

- title
- hero summary
- quick facts
- pre-trip notes
- day overview
- detailed day timelines
- route reasoning

#### 2. Time-aware generation

The prompt should require:

- estimated start time
- stay duration
- transfer hint
- energy-aware sequencing

#### 3. Route justification

The prompt should force the model to explain:

- why this order
- why this district pairing
- why this plan fits this traveler type

#### 4. Food as route function

Prompt should require food to serve one of:

- quick refuel
- neighborhood immersion
- evening close
- family rest point
- budget-control stop

#### 5. Anti-generic writing checks

Prompt should explicitly reject:

- empty travel-magazine language
- generic city praise
- untimed route blocks
- food and POI recommendations detached from movement logic

### Recommended prompt quality test

After V3.1 prompt upgrade, a reviewer should be able to answer:

- Do I know how this day unfolds?
- Do I know why this order is chosen?
- Do I know what to prepare in advance?
- Do I know what to cut if reality goes wrong?
- Would a real user save this instead of just reading it once?

If the answer is still “mostly no,” the output is still too close to an AI travel recommendation instead of a travel product.

## Final Standard

A V3.1 premium Explore plan should feel like:

- editorial in taste
- operational in detail
- disciplined in route logic
- specific in traveler fit
- useful enough to execute

The final benchmark is simple:

The user should not only think “this looks nice.”

The user should think:

- “I can follow this.”
- “I understand why it is arranged this way.”
- “This feels made for someone like me.”
- “I want to save this for a real trip.”
