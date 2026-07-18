# ASSET_SOURCE_DECISION_SPEC

## 1. Purpose

This document defines the `asset_source_decision` contract for Wanderly Image Pipeline.

Its position is:

```text
image_request
    ->
asset_source_decision
    ->
generated | external | existing
```

The goal of this layer is to answer four questions before any execution happens:

1. where this asset should come from
2. why that source is preferred
3. what alternative sources are acceptable
4. whether fallback is allowed

This document is design only.
It does not:

- call providers
- search stock libraries
- import existing assets
- download files
- generate images

## 2. Position In Pipeline

The current architecture already has:

- `image_request`: what image is needed
- provider or source adapters: how to get it
- `asset_manifest`: what asset was finally recorded

What is missing is the decision layer in between.

That layer should be:

- provider-independent
- storage-independent
- execution-independent

Its only job is to decide source strategy.

## 3. Responsibility Boundary

### `image_request` is responsible for:

- what asset is needed
- what the subject is
- what style or usage requirements exist

### `asset_source_decision` is responsible for:

- which source strategy should be used
- which source types are candidates
- why this decision was made
- what fallback behavior is allowed

### source adapters are responsible for:

- how to acquire the asset
- how to translate source strategy into execution behavior

Examples:

- generated adapter
- external library adapter
- existing asset resolver

### `asset_manifest` is responsible for:

- recording the final asset
- preserving provenance
- preserving status and lifecycle

## 4. Core Contract

Recommended shape:

```json
{
  "decision_id": "src_decision_cover_hangzhou_001",
  "asset_request_id": "req_cover_hangzhou_001",
  "asset_role": "cover",
  "subject": {
    "subject_type": "trip_cover",
    "title": "Hangzhou slow travel cover",
    "destination": "Hangzhou"
  },
  "source_strategy": "generated_first",
  "candidate_sources": [
    {
      "source_type": "generated",
      "priority": 1,
      "enabled": true
    },
    {
      "source_type": "existing",
      "priority": 2,
      "enabled": true
    },
    {
      "source_type": "external",
      "priority": 3,
      "enabled": false
    }
  ],
  "decision_reason": [
    "cover is a brand-facing editorial asset",
    "style consistency is more important than strict realism"
  ],
  "fallback_policy": {
    "allow_fallback": true,
    "fallback_order": ["existing", "external"],
    "manual_review_required_on_fallback": true
  },
  "constraints": {
    "realism_requirement": "medium",
    "style_requirement": "high",
    "license_requirement": "commercial_safe",
    "must_preserve_brand_style": true
  }
}
```

## 5. Field Definitions

### 5.1 `decision_id`

- unique identifier for the source decision record
- useful for tracing later execution and manifest records

### 5.2 `asset_request_id`

- stable link back to the originating `image_request`

### 5.3 `asset_role`

Recommended values:

- `cover`
- `place`
- `food`
- `scene`
- `experience`

### 5.4 `subject`

This is a compact view of the request subject, not the full request payload.

Suggested fields:

```json
{
  "subject_type": "string",
  "title": "string",
  "destination": "string",
  "entity_ref": "optional"
}
```

Its job is to make source policy readable without requiring the full request body.

### 5.5 `source_strategy`

Recommended vocabulary:

- `generated_first`
- `external_first`
- `existing_first`
- `hybrid`
- `manual_editorial_selection`

This field answers the primary selection direction.

### 5.6 `candidate_sources`

This field lists which source types are valid candidates and in what order.

Suggested item shape:

```json
{
  "source_type": "generated | external | existing",
  "priority": 1,
  "enabled": true,
  "notes": "optional"
}
```

This is useful because:

- strategy alone is not enough
- fallback order must be explicit
- some source types may be intentionally disabled

### 5.7 `decision_reason`

This field should record concise human-readable reasons.

Examples:

- `cover requires strong editorial style consistency`
- `subject has high external photo coverage`
- `approved legacy asset already exists`

This helps:

- debugging
- editorial review
- later automation audits

### 5.8 `fallback_policy`

Suggested shape:

```json
{
  "allow_fallback": true,
  "fallback_order": ["existing", "generated"],
  "manual_review_required_on_fallback": true,
  "max_fallback_steps": 2
}
```

This field answers:

- whether fallback is allowed at all
- which source types can be tried next
- whether manual approval is required when switching source class

### 5.9 `constraints`

This field carries decision-level constraints that matter to later adapters.

Suggested fields:

```json
{
  "realism_requirement": "low | medium | high",
  "style_requirement": "low | medium | high",
  "license_requirement": "commercial_safe | attribution_required | internal_only",
  "must_preserve_brand_style": true,
  "allow_legacy_asset_reuse": true,
  "allow_external_asset_search": true
}
```

These are not execution instructions yet.
They are selection-time guardrails.

## 6. Strategy Rules

The decision layer should be able to evaluate at least these inputs:

- `asset_role`
- `destination`
- `subject type`
- `realism requirement`
- `style requirement`
- `existing asset availability`
- `external coverage likelihood`
- `manual override`

Below are the recommended default rules.

### 6.1 Cover

Default:

```json
{
  "source_strategy": "generated_first"
}
```

Reason:

- cover is editorial
- cover carries Wanderly brand language
- style consistency is usually more important than documentary realism

Common fallback:

- `existing`
- rarely `external`

### 6.2 Place

Default:

```json
{
  "source_strategy": "external_first"
}
```

Reason:

- place imagery should help destination recognition
- realism and trust usually matter most

Common fallback:

- `existing`
- then `generated`

### 6.3 Food

Default:

```json
{
  "source_strategy": "external_first"
}
```

Reason:

- food texture and atmosphere benefit from real photography
- generated can be used when stock coverage is weak or style support is needed

Common fallback:

- `generated`
- `existing`

### 6.4 Scene

Default:

```json
{
  "source_strategy": "generated_first"
}
```

Reason:

- scene assets are usually mood-driven
- exact stock matches are harder to guarantee

Common fallback:

- `existing`

### 6.5 Experience

Default:

```json
{
  "source_strategy": "hybrid"
}
```

Reason:

- some experiences should feel real
- some experiences should feel immersive and editorial

This role should depend more heavily on context.

### 6.6 Legacy Approved Asset Present

If an approved matching asset is already available:

```json
{
  "source_strategy": "existing_first"
}
```

Reason:

- no need to regenerate or resource a good existing asset
- reuse reduces cost and review overhead

## 7. Typical Cases

### 7.1 Hangzhou Cover

```json
{
  "asset_request_id": "req_cover_hangzhou_001",
  "asset_role": "cover",
  "subject": {
    "subject_type": "trip_cover",
    "title": "Hangzhou editorial cover",
    "destination": "Hangzhou"
  },
  "source_strategy": "generated_first",
  "candidate_sources": [
    { "source_type": "generated", "priority": 1, "enabled": true },
    { "source_type": "existing", "priority": 2, "enabled": true },
    { "source_type": "external", "priority": 3, "enabled": false }
  ],
  "decision_reason": [
    "cover requires Wanderly watercolor journal style",
    "editorial composition is more important than documentary realism"
  ],
  "fallback_policy": {
    "allow_fallback": true,
    "fallback_order": ["existing"],
    "manual_review_required_on_fallback": true
  }
}
```

### 7.2 Xi'an Terracotta Warriors Place Image

```json
{
  "asset_request_id": "req_place_terracotta_warriors_001",
  "asset_role": "place",
  "subject": {
    "subject_type": "poi",
    "title": "Terracotta Warriors",
    "destination": "Xi'an",
    "entity_ref": "poi_terracotta_warriors"
  },
  "source_strategy": "external_first",
  "candidate_sources": [
    { "source_type": "external", "priority": 1, "enabled": true },
    { "source_type": "existing", "priority": 2, "enabled": true },
    { "source_type": "generated", "priority": 3, "enabled": true }
  ],
  "decision_reason": [
    "POI image should prioritize recognition and realism",
    "subject likely has strong external photo coverage"
  ],
  "fallback_policy": {
    "allow_fallback": true,
    "fallback_order": ["existing", "generated"],
    "manual_review_required_on_fallback": true
  }
}
```

### 7.3 Chengdu Hotpot Food Image

```json
{
  "asset_request_id": "req_food_chengdu_hotpot_001",
  "asset_role": "food",
  "subject": {
    "subject_type": "food_entity",
    "title": "Chengdu hotpot",
    "destination": "Chengdu",
    "entity_ref": "food_chengdu_hotpot"
  },
  "source_strategy": "external_first",
  "candidate_sources": [
    { "source_type": "external", "priority": 1, "enabled": true },
    { "source_type": "generated", "priority": 2, "enabled": true },
    { "source_type": "existing", "priority": 3, "enabled": true }
  ],
  "decision_reason": [
    "food benefits from believable texture and real dining atmosphere",
    "external photography is usually better for appetizing detail"
  ],
  "fallback_policy": {
    "allow_fallback": true,
    "fallback_order": ["generated", "existing"],
    "manual_review_required_on_fallback": true
  }
}
```

### 7.4 Legacy Existing Asset

```json
{
  "asset_request_id": "req_cover_hangzhou_legacy_reuse_001",
  "asset_role": "cover",
  "subject": {
    "subject_type": "trip_cover",
    "title": "Hangzhou family trip cover",
    "destination": "Hangzhou"
  },
  "source_strategy": "existing_first",
  "candidate_sources": [
    { "source_type": "existing", "priority": 1, "enabled": true },
    { "source_type": "generated", "priority": 2, "enabled": true },
    { "source_type": "external", "priority": 3, "enabled": false }
  ],
  "decision_reason": [
    "approved matching legacy asset is already available",
    "reuse is preferred over regeneration when quality is sufficient"
  ],
  "fallback_policy": {
    "allow_fallback": true,
    "fallback_order": ["generated"],
    "manual_review_required_on_fallback": false
  }
}
```

## 8. Relationship To Existing Modules

### `image_request`

Question answered:

- what image do we need

Output character:

- demand description

### `asset_source_decision`

Question answered:

- where should we get it from

Output character:

- source strategy and fallback contract

### source adapters

Question answered:

- how do we actually obtain it

Output character:

- execution result

### `asset_manifest`

Question answered:

- what asset finally exists and how should it be recorded

Output character:

- final asset record

## 9. Suggested Future Flow

```text
plan.json
    ->
image_request
    ->
asset_source_decision
    ->
generated adapter | external adapter | existing resolver
    ->
asset_manifest
```

This keeps the pipeline clean:

- request layer stays semantic
- decision layer stays strategic
- execution layer stays operational
- manifest stays authoritative

## 10. Design Principles

- Do not default every request to generation.
- Keep source decision separate from source execution.
- Make fallback explicit instead of implicit.
- Preserve human-readable decision reasons.
- Keep legacy reuse as a first-class strategy.
- Let one manifest consume all source types later.

## 11. Recommended Next Step

The best next design step is:

- define a lightweight `asset_source_selector` rule spec

That document can describe:

- rule inputs
- rule priority
- override behavior
- how City Knowledge, Scene, and source availability influence the decision

That would make the future implementation path much cleaner without yet touching providers or stock media integrations.
