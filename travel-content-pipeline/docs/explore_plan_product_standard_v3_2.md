# Explore Plan Product Standard V3.2

## Purpose

This document defines the V3.2 premium product standard for Explore travel plans in `travel-content-pipeline`.

V3.1 already improved:

- route logic
- time structure
- traveler differentiation
- execution clarity

V3.2 focuses on the next layer:

- emotional save-worthiness
- memorable trip moments
- stronger POI experience framing
- more decision-useful dining guidance
- a more editorial travel voice

The target reaction is:

- “这就是我想去北京的方式。”

not:

- “这是一份 AI 生成的攻略。”

This is a design document only.
It does not modify code, prompt, or generation output directly.

## Why V3.2 Is Needed

V3.1 made the output more executable.
But execution alone does not create a premium travel product.

The remaining gap is emotional and editorial:

- the route is usable, but not always irresistible
- the POIs are functional, but not always desire-inducing
- the food is practical, but not yet decision-rich
- the tone is clear, but can still read like a planning document

V3.2 should help the plan feel:

- more memorable
- more vivid
- more selective
- more worth saving

## Core V3.2 Shift

V3.1 asks:

- Can the user execute this route?

V3.2 asks:

- Will the user want to execute this route?

That means the plan must not only explain:

- where to go
- when to go
- how to move

It must also reveal:

- the moment worth remembering
- the image worth capturing
- the meal worth planning around
- the reason this route feels emotionally right

## 1. Day Memory Design

Each day should have a memory layer in addition to a route layer.

The route tells the user what happens.
The memory layer tells the user what they will remember.

### Suggested field

```json
{
  "day_memory": {
    "best_moment": "",
    "photo_spot": "",
    "local_experience": ""
  }
}
```

### Field purpose

#### `best_moment`

This is the emotional peak of the day.

It should answer:

- what is the single most memorable moment of this day?

Examples:

- climbing up to the city view just before sunset
- finishing a hutong walk with warm lights by the lake
- arriving in 798 when the afternoon light hits the industrial walls

This is not a slogan.
It is the day’s emotional anchor.

#### `photo_spot`

This is the most worthwhile image memory of the day.

It should answer:

- where should the user intentionally stop for a visual memory?

Good `photo_spot` guidance should be:

- specific
- visual
- rooted in timing

Bad version:

- “这里很适合拍照”

Better version:

- “景山万春亭在傍晚最值得停下来，红墙屋顶和城市天际线会一起进入画面。”

#### `local_experience`

This is the everyday-city moment that makes the route feel less tourist-generic.

It should answer:

- what makes this day feel like being in this city, not just visiting attractions?

Examples:

- the breakfast rhythm of south-city stalls
- the pause inside a smaller hutong lane after leaving the main road
- the contrast between gallery quiet and Sanlitun night noise

### V3.2 rule

Each day should give the user:

- one memory point
- one image point
- one local-life point

Without these, the plan may be executable but still not collectible.

## 2. POI `experience_details` Design

V3.1 POIs are still somewhat route-functional.
V3.2 POIs should become more like editorially chosen experiences.

### Suggested field

```json
{
  "experience_details": {
    "why_visit": "",
    "best_time": "",
    "photo_tip": "",
    "avoid_tip": ""
  }
}
```

### Field purpose

#### `why_visit`

This should answer:

- why is this POI worth your time in this specific plan?

Not:

- because it is famous

But:

- because it gives this route a specific emotional or structural payoff

Example:

- “它不是为了完成打卡，而是为了让第一天的北京印象真正建立起来。”

#### `best_time`

This should answer:

- when does this POI feel best in practice?

This can include:

- morning
- dusk
- weekday preference
- crowd-avoidance logic

The goal is to move from timeless attraction description to timing-aware recommendation.

#### `photo_tip`

This should answer:

- what kind of visual result is best here?

Examples:

- where to face
- what light works best
- what not to waste time shooting

This helps the plan feel personal and editorial rather than structural only.

#### `avoid_tip`

This should answer:

- what common mistake should the user avoid here?

Examples:

- overstay beyond the best window
- enter at the wrong hour
- follow only the main tourist corridor
- expect a quiet experience during peak time

This is a premium differentiator because it saves the user from low-quality behavior.

## 3. Food / Restaurant Enhancement Design

V3.1 still tends to describe dining as area logic or meal role.
V3.2 should make dining feel closer to a real consumer decision.

The plan does not need exact live restaurant accuracy for every item, but the structure should support restaurant-grade guidance.

### Suggested fields

```json
{
  "restaurant_name": "",
  "recommended_dishes": [],
  "price_range": "",
  "waiting_time": "",
  "reservation_needed": ""
}
```

### Field purpose

#### `restaurant_name`

This should allow the plan to name:

- a specific venue
- a representative format
- or a more exact dining target when confidence is sufficient

The point is to reduce vague “eat somewhere here” feeling.

#### `recommended_dishes`

This should answer:

- what should the user actually order here?

This makes food guidance actionable and more collectible.

Bad:

- “这里适合吃京味菜”

Better:

- “如果只点两样，优先点铜锅涮肉和烧饼夹肉，节奏更适合晚间收尾。”

#### `price_range`

This should answer:

- roughly how much will this meal feel like?

Not exact price.
But a usable decision frame such as:

- `low`
- `low_to_medium`
- `medium`
- `medium_to_high`

Or a readable range later if product design allows.

#### `waiting_time`

This should answer:

- is this a quick meal, moderate wait, or queue-risk stop?

This matters because food is part of route execution, not just content flavor.

#### `reservation_needed`

This should answer:

- does the user need to decide ahead of time?

Suggested values:

- `none`
- `recommended`
- `needed_for_peak_hours`

### V3.2 dining standard

A strong dining recommendation should help the user decide:

- whether to go
- what to eat
- whether it is worth waiting
- whether it suits the route’s energy and budget

## 4. Travel Editor Voice Standard

V3.2 needs a voice upgrade.

The output should move:

- from “planning report”

to:

- “professional travel editor recommendation”

### What changes in voice

#### From report-like writing

- highly functional
- structurally correct
- rational but emotionally flat

#### To editor-like writing

- selective
- decisive
- elegant but grounded
- vivid without becoming empty

### Editorial voice requirements

#### 1. Be confident, not vague

The plan should sound like a human who made choices.

Not:

- “可以考虑”
- “如果有时间可以顺便”
- “也许适合”

Unless uncertainty is actually important.

#### 2. Be specific, not lyrical

Do not replace useful detail with soft poetic language.

Bad:

- “在这座城市的脉搏里慢慢感受时间”

Better:

- “把傍晚留给什刹海，比把它用在第二个大景点上更值得。”

#### 3. Use feeling only when tied to route logic

Emotion is welcome when it is earned by:

- timing
- district choice
- traveler identity
- route contrast

#### 4. Write like someone who knows what to cut

Premium editorial guidance is often about exclusion, not inclusion.

The tone should occasionally imply:

- this is worth keeping
- this is not worth overdoing
- this is the right version of Beijing for this user

### Voice benchmark

The reader should feel:

- “有人替我筛选过了。”

not:

- “AI 尽量写得很丰富。”

## 5. V3.1 → V3.2 Field Change Summary

V3.2 is not a full rebuild.
It is a premium enrichment layer on top of V3.1.

### New or enriched concepts

#### Daily layer

V3.1:

- `theme`
- `why_today_matters`
- `route_summary`
- `timeline`
- `district_flow`
- `meal_plan`
- `energy_notes`
- `backup_options`

V3.2 adds:

- `day_memory.best_moment`
- `day_memory.photo_spot`
- `day_memory.local_experience`

Why:

- makes each day emotionally memorable, not only functionally clear

#### POI layer

V3.1:

- reason
- duration
- queue and walking signals

V3.2 adds:

- `experience_details.why_visit`
- `experience_details.best_time`
- `experience_details.photo_tip`
- `experience_details.avoid_tip`

Why:

- turns POIs into premium experience recommendations

#### Food layer

V3.1:

- district
- budget
- dining scenarios
- route roles

V3.2 adds:

- `restaurant_name`
- `recommended_dishes`
- `price_range`
- `waiting_time`
- `reservation_needed`

Why:

- helps the user make real dining decisions

## Suggested future structure direction

Example future daily shape:

```json
{
  "day": 1,
  "theme": "",
  "why_today_matters": "",
  "route_summary": "",
  "day_memory": {
    "best_moment": "",
    "photo_spot": "",
    "local_experience": ""
  },
  "timeline": [],
  "district_flow": [],
  "meal_plan": [],
  "energy_notes": [],
  "backup_options": []
}
```

Example future POI shape:

```json
{
  "id": "",
  "name": "",
  "reason": "",
  "experience_details": {
    "why_visit": "",
    "best_time": "",
    "photo_tip": "",
    "avoid_tip": ""
  }
}
```

Example future food shape:

```json
{
  "id": "",
  "restaurant_name": "",
  "recommended_dishes": [],
  "price_range": "",
  "waiting_time": "",
  "reservation_needed": "",
  "route_role": ""
}
```

## Final Standard

V3.2 premium Explore output should make the user feel:

- this route understands my trip
- this route knows which moment matters
- this route helps me decide where to eat
- this route tells me what is actually worth doing

The final benchmark is:

The user should not merely understand the plan.

The user should want the plan.
