# Generation Context Map Data V1

## Purpose

This document defines the V3.4 Step4 design for how map facts should enter `GenerationContext` in the future `travel-content-pipeline` system.

It is a design document only.

It does not:

- modify code
- modify schema
- modify prompts
- modify batch generation
- modify city JSON files
- inject map data into the live generation flow yet

The goal is to define:

- what map facts should be passed into generation
- how those facts should be normalized
- how those facts should constrain model behavior

This is a preparation step for future integration.

## Why This Step Is Needed

The Amap minimum test already proved that the map layer can provide useful movement truth.

For example:

- verified POI coordinates
- real walking distance
- real estimated duration

But successful API calling is not enough.

The next design problem is:

- how should map facts be packaged for generation

If this is not designed carefully, two bad outcomes are likely:

- too much raw provider data will pollute prompts
- too little route truth will fail to improve route quality

So V3.4 Step4 exists to define the correct middle layer.

## 1. Why Raw Amap Responses Should Not Be Passed Directly To DeepSeek

Raw provider responses should not be sent directly into `GenerationContext`.

### Reason 1: too long

Map API responses often contain:

- verbose fields
- repeated metadata
- nested structures
- provider-specific extras

Most of this is not useful for route generation.

### Reason 2: too noisy

The model does not need:

- every response field
- every route step detail
- every provider label
- every alternative candidate

Too much noise weakens reasoning quality.

### Reason 3: provider format is unstable

Provider response shapes may change over time.

If prompt construction depends on raw response shapes, the generation layer becomes fragile.

### Reason 4: prompt confusion risk

Raw API payloads contain too many irrelevant facts.

That can cause the model to:

- focus on low-value details
- overfit to provider wording
- lose the main trip-design objective

### Core rule

Map data should enter generation only after:

- verification
- normalization
- compression
- relevance filtering

## 2. What Map Facts Should Enter `GenerationContext`

The future `GenerationContext` should not carry raw map payloads.

It should carry compact, decision-useful map facts.

At minimum:

- `verified_pois`
- `route_facts`
- `transfer_burden`
- `cluster_warnings`
- `route_feasibility_notes`

## 3. Suggested `GenerationContext` Map Fields

### 1. `verified_pois`

Purpose:

- provide a clean list of verified places used in route building

Should include:

- verified place name
- district name
- latitude
- longitude
- source provider

Role in generation:

- confirm POI existence
- support district clustering logic
- reduce hallucinated place references

### 2. `route_facts`

Purpose:

- provide route-truth facts between important route nodes

Should include:

- from
- to
- transport_mode
- distance_meters
- duration_minutes
- source_provider

Role in generation:

- support transfer reasoning
- support pace control
- support “walk / taxi / metro” recommendation choice

### 3. `transfer_burden`

Purpose:

- convert raw distance/time facts into usable burden labels

Role in generation:

- stop the model from describing hard movement as easy
- protect slow, family, and atmosphere-led routes
- help explain why a transfer method changes

### 4. `cluster_warnings`

Purpose:

- identify route fragments that break spatial cohesion

Examples:

- east-west jump too large for one afternoon
- scenic route broken by distant meal choice
- family route contains high-friction district switch

Role in generation:

- protect route compactness
- surface where the route should be re-clustered

### 5. `route_feasibility_notes`

Purpose:

- provide summarized route risk notes derived from map facts

Examples:

- walking version is too long for a balanced family route
- this transfer is acceptable for solo but weak for couple atmosphere pacing
- route is feasible only if one stop is cut

Role in generation:

- create short model-facing guardrails
- avoid dumping raw map detail into prompt context

## 4. `route_facts` Standard Structure

The future normalized structure should stay compact and stable.

Suggested shape:

```json
{
  "from": "故宫博物院",
  "to": "什刹海",
  "transport_mode": "walking",
  "distance_meters": 3852,
  "duration_minutes": 51,
  "source_provider": "amap"
}
```

### Design rule

This structure should be:

- provider-agnostic enough for future extension
- short enough for generation use
- factual enough to constrain route wording

### What it should not include by default

- raw provider step arrays
- full provider response text
- every optional routing alternative
- verbose address metadata unless directly needed

## 5. `transfer_burden` Judgment Rules

Raw movement facts are useful, but model-facing burden labels are even more useful.

The system should classify route burden before generation.

### Walking burden

- `<= 1200m`: `easy_walk`
- `1200m - 2500m`: `acceptable_walk`
- `2500m - 4000m`: `long_walk`
- `> 4000m`: `not_recommended_walk`

### Driving / transit burden

- `<= 20min`: `low_burden`
- `20 - 40min`: `moderate_burden`
- `> 40min`: `high_burden`

### Why this matters

The model is better at using semantic warnings than interpreting raw transport numbers repeatedly.

For example:

- `51 minutes walking` is a fact
- `not_recommended_walk` is a route-design warning

Both are useful, but they serve different purposes.

### Suggested burden object

```json
{
  "from": "故宫博物院",
  "to": "什刹海",
  "transport_mode": "walking",
  "burden_level": "not_recommended_walk",
  "reason": "distance and duration are too high to describe as an easy scenic walk"
}
```

## 6. AI Usage Rules

DeepSeek should be allowed to use map facts actively, but only within a strict boundary.

### DeepSeek may use map facts to

- adjust transport suggestions
- avoid calling a route “轻松步行” when the burden is high
- explain why taxi or metro is better
- protect family routes
- protect couple atmosphere pacing
- protect slow routes from overload
- justify cutting a weak stop

### DeepSeek should use map facts as

- constraint
- explanation support
- trade-off evidence

Not as decorative detail.

## 7. DeepSeek Must Not

DeepSeek must not:

- modify provider-returned numeric facts
- invent its own distance and time
- ignore `high_burden` warnings
- ignore `not_recommended_walk` warnings

### This is a hard boundary

If map facts say:

- the route is too far to walk comfortably

the model may:

- change transport mode
- cut the route
- explain the trade-off

but it may not:

- pretend the walk is easy
- invent a shorter time
- silently ignore the warning

## 8. Suggested Future `GenerationContext` Fragment

The future system could eventually pass a compact fragment like this:

```json
{
  "map_context": {
    "verified_pois": [
      {
        "name": "故宫博物院",
        "district_name": "东城区",
        "latitude": 39.917839,
        "longitude": 116.397029,
        "source_provider": "amap"
      },
      {
        "name": "什刹海",
        "district_name": "西城区",
        "latitude": 39.940803,
        "longitude": 116.387581,
        "source_provider": "amap"
      }
    ],
    "route_facts": [
      {
        "from": "故宫博物院",
        "to": "什刹海",
        "transport_mode": "walking",
        "distance_meters": 3852,
        "duration_minutes": 51,
        "source_provider": "amap"
      }
    ],
    "transfer_burden": [
      {
        "from": "故宫博物院",
        "to": "什刹海",
        "transport_mode": "walking",
        "burden_level": "not_recommended_walk",
        "reason": "distance and duration are too high to present as an easy walk"
      }
    ],
    "cluster_warnings": [
      "Do not describe Forbidden City to Shichahai as a light casual walk for family, couple, or slow routes."
    ],
    "route_feasibility_notes": [
      "This pair is spatially valid in one day, but better with a transport segment or a route simplification."
    ]
  }
}
```

This is only a design example.
It is not a required runtime shape yet.

## 9. Why This Helps Premium Planning

Map facts in `GenerationContext` should improve generation in high-value ways:

- fewer fake low-friction routes
- fewer cross-district mistakes
- better family and slow-route protection
- more honest transport wording
- better fallback handling

This is especially useful for premium quality because premium plans fail fast when:

- walking is oversold
- route density is misjudged
- atmosphere routes are broken by long transfers

## 10. Not In Formal Generation Yet

This phase does not inject map data into the live generation pipeline.

It only defines:

- what data should enter
- what shape it should take
- how the model should behave around it

Formal integration should happen later, after:

- context shape is finalized
- burden rules are accepted
- prompt and generator update strategy is agreed

## 11. Success Standard

Generation Context Map Data V1 is successful if the future system becomes able to clearly separate:

- raw provider data
- normalized route facts
- model-facing burden warnings
- model-generated explanation

It is not successful if future integration still passes:

- raw Amap payloads directly into prompts
- long route steps without filtering
- route numbers without burden interpretation

The point of this document is to make the next step easier:

- map truth should enter generation as compact route facts, not as provider noise
