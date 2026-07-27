# City Context V2 Design

## Purpose

This document defines the design for a V2 city context layer in `travel-content-pipeline`.

It is a design-stage document only.

It does not:

- change `src`
- change schema files used by runtime
- change prompts
- generate plans

The goal is to design a richer city knowledge structure that can later support stronger Explore generation quality.

## Why V2 Is Needed

The current city context mainly provides:

- city summary
- transport notes
- budget notes
- trip type notes
- POI list
- food area list

This is useful, but not enough for:

- stronger route differences across `trip_type`
- district-level route combinations
- route planning logic
- city character expression
- lower POI repetition across batches

In practice, the current structure knows “what exists,” but it still lacks enough information about:

- what kind of city this is
- which district plays which role
- which areas combine well
- which route patterns work for which audience

## Design Principles

### 1. City context should model a city, not just list places

The V2 structure should describe:

- urban temperament
- district roles
- food culture
- route combinations
- traveler-type fit

### 2. Route strategy should become a first-class concept

The generator should eventually be able to reason about:

- low-friction district combinations
- good one-day anchors
- good two-day structures
- combinations to avoid

### 3. Trip-type differences should be encoded in data, not only inferred ad hoc

The V2 structure should directly describe:

- what works for `family`
- what works for `couple`
- what works for `student`
- what works for `solo`

### 4. Compatibility should remain practical

V2 should be able to coexist with the current generation chain.

That means:

- current required fields should still be derivable
- migration can be staged
- legacy readers can keep using a reduced subset

## Current V1 Structure

The current project-level `CityContext` in [src/types.ts](/C:/Users/10200/Desktop/travel-content-pipeline/src/types.ts) contains:

- `city_code`
- `city_name`
- `region_name`
- `summary`
- `transport_notes`
- `budget_notes`
- `trip_type_notes`
- `suggested_tags`
- `pois`
- `food_areas`

This remains a useful compatibility baseline for V2.

## Proposed V2 Structure

Suggested top-level structure:

```json
{
  "schema_version": "city_context_v2",
  "city_code": "beijing",
  "city_name": "Beijing",
  "region_name": "Beijing",
  "city_personality": {},
  "district_knowledge": [],
  "poi_knowledge": [],
  "food_knowledge": [],
  "traveler_type_guidance": {},
  "route_strategy": {},
  "season_timing_notes": {},
  "legacy_summary": {},
  "metadata": {}
}
```

## Field Design And Purpose

### `schema_version`

Purpose:

- Explicitly marks the data as V2
- Makes future migration and tooling safer

### `city_code`

Purpose:

- Stable machine key for city lookup
- Used for joins, filenames, and downstream routing

### `city_name`

Purpose:

- Human-readable city name
- Keeps context display friendly for editors and QA

### `region_name`

Purpose:

- Basic region grouping
- Useful for analysis and later batch planning

## 1. `city_personality`

Purpose:

- Encodes the city’s core temperament
- Helps generation express city character, not just famous attractions

Suggested structure:

```json
{
  "one_line_summary": "",
  "core_temperaments": [],
  "explore_strengths": [],
  "best_experience_modes": [],
  "signature_contrasts": [],
  "avoid_generic_framing": []
}
```

Field intent:

- `one_line_summary`: shortest useful description of how the city should feel
- `core_temperaments`: tags like historical, leisurely, scenic, youthful, dramatic
- `explore_strengths`: what the city is especially good at for Explore content
- `best_experience_modes`: ways the city is best experienced, such as citywalk, food crawl, heritage route, night stroll
- `signature_contrasts`: key dualities that make the city interesting
- `avoid_generic_framing`: patterns that flatten the city into generic tourism language

## 2. `district_knowledge`

Purpose:

- Encodes districts as route-building units
- Supports area-based itinerary differences
- Reduces repeated reliance on the same landmark set

Suggested structure per district:

```json
{
  "id": "",
  "name": "",
  "role": "",
  "vibe": [],
  "best_for": [],
  "best_time_of_day": [],
  "signature_experiences": [],
  "poi_ids": [],
  "food_area_ids": [],
  "pair_with_district_ids": [],
  "avoid_pairing_notes": [],
  "mobility_notes": [],
  "route_value": ""
}
```

Field intent:

- `role`: what this district contributes to a trip
- `vibe`: mood and urban texture
- `best_for`: which traveler types fit best
- `best_time_of_day`: when this area is strongest
- `signature_experiences`: what kind of experience this area creates
- `poi_ids`: POIs anchored in this district
- `food_area_ids`: food anchors tied to this district
- `pair_with_district_ids`: easy route combinations
- `avoid_pairing_notes`: high-friction combinations or weak pairings
- `mobility_notes`: practical movement constraints
- `route_value`: why this district matters in itinerary design

## 3. `poi_knowledge`

Purpose:

- Upgrades POIs from simple attraction records into route-aware content units
- Helps the generator select POIs by meaning, not just fame

Suggested structure per POI:

```json
{
  "id": "",
  "name": "",
  "district_id": "",
  "type": "",
  "landmark_level": "",
  "experience_tags": [],
  "best_for": [],
  "best_time_of_day": [],
  "recommended_duration_minutes": 90,
  "route_roles": [],
  "nearby_pairing_poi_ids": [],
  "nearby_food_area_ids": [],
  "strengths": [],
  "risks": [],
  "description": ""
}
```

Field intent:

- `landmark_level`: distinguishes iconic anchors from secondary character spots
- `experience_tags`: what kind of memory or scene the POI provides
- `route_roles`: whether it is a route anchor, scenic insert, flexible stop, or optional detour
- `strengths`: why this POI is valuable
- `risks`: crowding, transport friction, overuse risk, weak fit for some traveler types

## 4. `food_knowledge`

Purpose:

- Moves beyond generic food area recommendation
- Makes food culture part of route design and city identity

Suggested structure per food unit:

```json
{
  "id": "",
  "name": "",
  "district_id": "",
  "category": "",
  "food_styles": [],
  "meal_moments": [],
  "best_for": [],
  "budget_fit": [],
  "route_roles": [],
  "signature_value": [],
  "pair_with_poi_ids": [],
  "note": ""
}
```

Field intent:

- `food_styles`: what cuisine or eating mode this area represents
- `meal_moments`: breakfast, lunch, snack, dinner, late-night
- `budget_fit`: where this works for low, medium, high
- `route_roles`: meal anchor, snack stop, atmosphere dinner, quick refuel
- `signature_value`: why this area matters for city identity

## 5. `traveler_type_guidance`

Purpose:

- Encodes route strategy directly by traveler type
- Helps generation create meaningful differences between plans

Suggested structure:

```json
{
  "family": {},
  "couple": {},
  "student": {},
  "solo": {}
}
```

Suggested per-type fields:

```json
{
  "priority_dimensions": [],
  "recommended_district_ids": [],
  "recommended_poi_ids": [],
  "recommended_food_area_ids": [],
  "preferred_route_patterns": [],
  "avoid_patterns": [],
  "pace_notes": [],
  "value_notes": []
}
```

Field intent:

- `priority_dimensions`: what matters most for this traveler type
- `recommended_district_ids`: strongest area anchors
- `preferred_route_patterns`: route shapes that fit this audience
- `avoid_patterns`: patterns likely to create weak outputs
- `pace_notes`: how dense or relaxed the plan should feel
- `value_notes`: what counts as a “good outcome” for this traveler type

## 6. `route_strategy`

Purpose:

- Central place for route planning logic
- Lets future generator layers reason about combinations without inventing them from scratch

Suggested structure:

```json
{
  "half_day_anchors": [],
  "easy_district_pairs": [],
  "strong_one_day_patterns": [],
  "strong_two_day_patterns": [],
  "high_friction_combinations": [],
  "repeat_risk_notes": [],
  "diversification_levers": []
}
```

Field intent:

- `half_day_anchors`: useful building blocks for itinerary composition
- `easy_district_pairs`: combinations with low movement cost and good thematic flow
- `strong_one_day_patterns`: good full-day route shapes
- `strong_two_day_patterns`: good two-day plan structures
- `high_friction_combinations`: things the generator should avoid combining casually
- `repeat_risk_notes`: places likely to be overused across batches
- `diversification_levers`: alternative anchors to improve output variety

## 7. `season_timing_notes`

Purpose:

- Captures when city experiences work best
- Helps later generation avoid timing-blind recommendations

Suggested structure:

```json
{
  "all_year_notes": [],
  "seasonal_highlights": [],
  "weather_sensitive_notes": [],
  "day_vs_night_notes": [],
  "weekday_vs_weekend_notes": []
}
```

Field intent:

- `all_year_notes`: stable timing truths
- `seasonal_highlights`: when some district or experience becomes stronger
- `weather_sensitive_notes`: temperature, rain, wind, or seasonal crowd effects
- `day_vs_night_notes`: districts or POIs that change meaning by time
- `weekday_vs_weekend_notes`: crowd or rhythm differences when important

## 8. `legacy_summary`

Purpose:

- Provides a compatibility bridge back to the current V1 chain
- Makes staged adoption possible without immediate code change

Suggested structure:

```json
{
  "summary": "",
  "transport_notes": [],
  "budget_notes": {
    "low": "",
    "medium": "",
    "high": ""
  },
  "trip_type_notes": {},
  "suggested_tags": [],
  "pois": [],
  "food_areas": []
}
```

This can mirror the current `CityContext` shape closely enough that:

- old loaders can still read a reduced projection
- future migration can be incremental
- V2 authoring does not force immediate runtime adoption

## 9. `metadata`

Purpose:

- Records authorship, maintenance, and provenance information

Suggested structure:

```json
{
  "version": "",
  "last_updated": "",
  "source_method": "",
  "editor_notes": []
}
```

## Beijing Example Structure

Below is a simplified example showing how Beijing could look in V2.

```json
{
  "schema_version": "city_context_v2",
  "city_code": "beijing",
  "city_name": "Beijing",
  "region_name": "Beijing",
  "city_personality": {
    "one_line_summary": "A layered capital city where imperial scale, hutong daily life, and neighborhood rhythm should be balanced rather than stacked blindly.",
    "core_temperaments": ["historical", "grand", "layered", "district-based"],
    "explore_strengths": ["heritage routes", "hutong texture", "city viewpoints", "old-city food rhythm"],
    "best_experience_modes": ["heritage walk", "hutong citywalk", "viewpoint plus neighborhood route", "evening lakeside stroll"],
    "signature_contrasts": ["imperial scale vs lived-in hutong life", "ceremonial landmarks vs neighborhood texture"],
    "avoid_generic_framing": ["Do not reduce Beijing to only Forbidden City plus Great Wall style checklist logic."]
  },
  "district_knowledge": [
    {
      "id": "district_old_core",
      "name": "Old Imperial Core",
      "role": "history anchor",
      "vibe": ["ceremonial", "iconic", "high-recognition"],
      "best_for": ["family", "couple", "student", "solo"],
      "best_time_of_day": ["morning", "afternoon"],
      "signature_experiences": ["imperial axis sightseeing", "major cultural landmark routing"],
      "poi_ids": ["poi_forbidden_city_edge", "poi_temple_of_heaven"],
      "food_area_ids": ["food_qianmen"],
      "pair_with_district_ids": ["district_hutong_lakeside"],
      "avoid_pairing_notes": ["Avoid chaining too many major landmarks in one day for family routes."],
      "mobility_notes": ["Distances are manageable only when the day stays in the historic core."],
      "route_value": "Best used as one strong anchor, then softened with a neighborhood layer."
    },
    {
      "id": "district_hutong_lakeside",
      "name": "Shichahai Hutong and Lakeside Belt",
      "role": "atmosphere and neighborhood texture anchor",
      "vibe": ["lived-in", "scenic", "walkable", "romantic"],
      "best_for": ["family", "couple", "student", "solo"],
      "best_time_of_day": ["afternoon", "evening"],
      "signature_experiences": ["hutong walk", "lakeside stroll", "soft evening route"],
      "poi_ids": ["poi_shichahai_hutong", "poi_jingshan"],
      "food_area_ids": ["food_shichahai"],
      "pair_with_district_ids": ["district_old_core", "district_nanluo"],
      "avoid_pairing_notes": ["Do not combine with far eastern art districts in a low-friction one-day plan."],
      "mobility_notes": ["Works best as a clustered walking-based half day."],
      "route_value": "Useful for giving Beijing warmth and local texture."
    }
  ],
  "poi_knowledge": [
    {
      "id": "poi_forbidden_city_edge",
      "name": "Forbidden City Outer Axis Visit",
      "district_id": "district_old_core",
      "type": "imperial landmark",
      "landmark_level": "iconic_anchor",
      "experience_tags": ["history", "scale", "capital identity"],
      "best_for": ["family", "couple", "student", "solo"],
      "best_time_of_day": ["morning"],
      "recommended_duration_minutes": 180,
      "route_roles": ["primary_anchor"],
      "nearby_pairing_poi_ids": ["poi_jingshan"],
      "nearby_food_area_ids": ["food_qianmen"],
      "strengths": ["Defines Beijing immediately.", "Strong historical weight."],
      "risks": ["High repeat risk across many plans.", "Can dominate the entire day if paired poorly."],
      "description": "Best used as one major heritage anchor rather than one stop among many heavy landmarks."
    }
  ],
  "food_knowledge": [
    {
      "id": "food_shichahai",
      "name": "Shichahai Hutong Food Area",
      "district_id": "district_hutong_lakeside",
      "category": "hutong dining zone",
      "food_styles": ["casual Beijing dishes", "hutong snacks", "atmosphere dining"],
      "meal_moments": ["lunch", "dinner"],
      "best_for": ["family", "couple", "student", "solo"],
      "budget_fit": ["low", "medium"],
      "route_roles": ["route meal anchor", "atmosphere dinner stop"],
      "signature_value": ["Connects food with neighborhood life and softer evening pacing."],
      "pair_with_poi_ids": ["poi_shichahai_hutong", "poi_jingshan"],
      "note": "Useful when Beijing plans need warmth, walkability, and a less formal food rhythm."
    }
  ],
  "traveler_type_guidance": {
    "family": {
      "priority_dimensions": ["comfort", "landmark clarity", "manageable movement", "easy meal access"],
      "recommended_district_ids": ["district_old_core", "district_hutong_lakeside"],
      "recommended_poi_ids": ["poi_forbidden_city_edge", "poi_temple_of_heaven", "poi_shichahai_hutong"],
      "recommended_food_area_ids": ["food_qianmen", "food_shichahai"],
      "preferred_route_patterns": ["one major landmark plus one nearby soft neighborhood layer"],
      "avoid_patterns": ["multiple heavy heritage anchors in a single day"],
      "pace_notes": ["Favor balanced pacing and shorter transfer chains."],
      "value_notes": ["A good family Beijing plan should feel clear, iconic, and not exhausting."]
    },
    "couple": {
      "priority_dimensions": ["atmosphere", "shared experience", "photo value", "evening mood"],
      "recommended_district_ids": ["district_hutong_lakeside"],
      "recommended_poi_ids": ["poi_jingshan", "poi_shichahai_hutong"],
      "recommended_food_area_ids": ["food_shichahai"],
      "preferred_route_patterns": ["viewpoint plus hutong walk plus evening dining"],
      "avoid_patterns": ["too many function-first landmarks with no emotional flow"],
      "pace_notes": ["Use softer afternoon-to-evening sequencing."],
      "value_notes": ["A good couple Beijing plan should soften the city’s grand scale with mood and texture."]
    }
  },
  "route_strategy": {
    "half_day_anchors": ["district_old_core", "district_hutong_lakeside"],
    "easy_district_pairs": [["district_old_core", "district_hutong_lakeside"]],
    "strong_one_day_patterns": ["imperial landmark morning plus hutong-lakeside afternoon and evening"],
    "strong_two_day_patterns": ["heritage-heavy day plus neighborhood-and-food day"],
    "high_friction_combinations": ["old core plus distant modern district plus lakeside in one dense family day"],
    "repeat_risk_notes": ["Forbidden City and Nanluoguxiang can become overused if not counterbalanced."],
    "diversification_levers": ["Use neighborhood texture routes, not only landmark-led routes."]
  },
  "season_timing_notes": {
    "all_year_notes": ["District clustering matters more than volume because Beijing travel distances can expand quickly."],
    "seasonal_highlights": ["Spring and autumn strengthen citywalk and lakeside experiences."],
    "weather_sensitive_notes": ["Summer heat can make over-dense heritage walking routes feel much heavier."],
    "day_vs_night_notes": ["Hutong and lakeside areas gain atmosphere at dusk and night."],
    "weekday_vs_weekend_notes": ["High-recognition heritage zones may need lighter pairing logic on crowded days."]
  },
  "legacy_summary": {
    "summary": "Beijing works best for layered travel that balances imperial history, broad city landmarks, hutong life, and clear district-based routing.",
    "transport_notes": [
      "Beijing distances can be large, so each day should stay clustered by area whenever possible."
    ],
    "budget_notes": {
      "low": "Prioritize hutong walks, public landmarks, and straightforward local food streets with metro access.",
      "medium": "Combine one major cultural site with one neighborhood exploration and one well-placed local dining area each day.",
      "high": "Use a more comfortable pace, stronger dining moments, and fewer heavy landmark transitions."
    },
    "trip_type_notes": {
      "family": "Family plans should focus on convenience, landmark clarity, manageable pacing, and enough rest between big sites."
    },
    "suggested_tags": ["heritage", "citywalk", "hutong-life"],
    "pois": [],
    "food_areas": []
  },
  "metadata": {
    "version": "draft_v2",
    "last_updated": "2026-07-15",
    "source_method": "manual design draft",
    "editor_notes": ["This is a structure example, not a runtime schema."]
  }
}
```

## Compatibility With Current Generation Chain

V2 should be designed to coexist with the current chain before any runtime migration.

### Compatibility strategy

1. Keep current required fields conceptually available

The current chain expects:

- summary
- transport notes
- budget notes
- trip type notes
- suggested tags
- POIs
- food areas

V2 should preserve a derivable or mirrored form of these through `legacy_summary`.

2. Treat V2 as a superset, not a replacement

V2 should enrich:

- district meaning
- traveler logic
- route combinations
- timing and seasonal behavior

But it should not require immediate removal of the current structure.

3. Allow staged adapter logic later

A future adapter can project:

- `district_knowledge`, `poi_knowledge`, and `food_knowledge`
- back into the current flatter `CityContext` structure

That means V2 authoring can begin before generation code changes.

4. Maintain stable POI and food identifiers

IDs introduced in V2 should be consistent enough that:

- route strategy can refer to them
- future prompt or planning layers can reference them safely
- backward projections remain deterministic

## Recommended Adoption Path

This document does not change implementation, but a practical future rollout could be:

1. Define V2 document shape and author one or two pilot city files
2. Add a projection rule from V2 to current V1-compatible context
3. Compare output quality between V1-only and V2-backed city knowledge
4. Gradually migrate more cities once route quality and differentiation improve

## Success Standard

V2 city context is successful if it later makes generation more likely to produce:

- stronger city identity
- less repeated POI usage
- clearer family/couple/student/solo differences
- more believable district-based routing
- more useful food placement within itinerary flow

If a proposed V2 city context still behaves like a POI catalog with minor notes attached, it is not rich enough yet.
