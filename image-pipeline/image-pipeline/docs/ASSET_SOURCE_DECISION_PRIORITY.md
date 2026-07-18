# ASSET_SOURCE_DECISION_PRIORITY

## 1. Purpose

This document defines the priority architecture for asset source decision in Wanderly Image Pipeline.

It extends the existing `asset_source_decision` design by adding one new reality:

- future `plan.json` may include image source suggestions

That means Image Pipeline should not behave like a fully autonomous source chooser.
It should behave like a structured decision layer that combines:

1. suggestion from `plan.json`
2. Image Pipeline default rules
3. City Knowledge
4. Scene requirements
5. existing approved assets
6. manual override

This document is rule design only.
It does not introduce:

- code changes
- provider execution
- stock library integration
- file downloads
- image generation

## 2. Position In The Pipeline

Future flow:

```text
plan.json
    ->
image_request
    ->
asset source decision inputs
    ->
priority evaluation
    ->
asset_source_decision
    ->
generated | external | existing adapters
```

The key change is that `asset_source_decision` is no longer derived only from internal defaults.
It is derived from a priority stack of inputs.

## 3. Source Decision Input Layer

The decision layer should accept these inputs.

### 3.1 `suggested_source_from_plan`

This is the upstream recommendation coming from future Travel Plan Generator V2.

Examples:

```json
{
  "asset_role": "cover",
  "suggested_source": "AI"
}
```

```json
{
  "asset_role": "place",
  "suggested_source": "external"
}
```

Interpretation:

- this is a recommendation from the content system
- it should influence the decision strongly
- it should not automatically erase downstream safeguards

Recommended normalized values:

- `generated`
- `external`
- `existing`
- `hybrid`
- `unspecified`

### 3.2 `asset_role`

This remains a core input because role strongly predicts source suitability.

Examples:

- `cover`
- `place`
- `food`
- `scene`
- `experience`

### 3.3 `subject_type`

The subject type helps determine whether realism or editorial control is more important.

Examples:

- `trip_cover`
- `poi`
- `food_entity`
- `itinerary_scene`
- `experience_entity`

### 3.4 `city_knowledge`

City Knowledge contributes:

- whether the subject is highly location-specific
- whether the destination tends to collapse into generic imagery
- whether visual authenticity matters more than stylization

This input should not directly pick a provider.
It should influence whether a source strategy is safe or risky.

### 3.5 `scene_requirement`

Scene contributes:

- whether the asset needs a specific editorial moment
- whether the image needs storytelling or exact realism
- whether a highly specific composition is required

This especially matters for:

- cover
- scene
- experience

### 3.6 `existing_asset_availability`

This input answers:

- does an approved matching asset already exist
- how strong the match is
- whether reuse is allowed by policy

Suggested evaluation values:

- `none`
- `weak_match`
- `strong_match`

### 3.7 `manual_override`

This input is the highest-priority human decision.

Examples:

- editor forces `existing`
- operator disables `external`
- manual review requires `generated` retry

Manual override exists because not every edge case should be solved by rules.

## 4. Recommended Decision Priority

Recommended priority stack:

```text
manual override
    >
plan.json suggestion
    >
existing approved assets
    >
asset role default strategy
    >
city/scene adjustment
    >
fallback
```

This section explains why.

### 4.1 `manual override` has highest priority

Reason:

- it represents explicit human judgment
- it is the safest way to handle exceptions
- it is necessary for editorial control and operational recovery

If a human has already made a decision, the system should not silently overrule it.

### 4.2 `plan.json suggestion` comes next

Reason:

- it comes from the upstream content system
- it may encode business intent known at content-generation time
- it helps Travel Plan Generator and Image Pipeline cooperate instead of competing

However, it is still a suggestion, not absolute truth.

It should guide the decision strongly, but remain subject to later conflict handling.

### 4.3 `existing approved assets` come before generic defaults

Reason:

- reusing an already approved asset often reduces cost and review load
- it avoids unnecessary generation or sourcing work
- legacy approved assets are part of production inventory, not leftovers

This priority is placed below plan suggestion because the upstream plan may intentionally request a new asset.

### 4.4 `asset role default strategy` remains the base policy

Reason:

- it is the stable default language of Image Pipeline
- it provides predictable behavior when no stronger signal exists

Examples:

- `cover -> generated_first`
- `place -> external_first`
- `food -> external_first`
- `scene -> generated_first`

### 4.5 `city/scene adjustment` refines but usually should not dominate

Reason:

- City Knowledge and Scene improve appropriateness
- they help reduce generic imagery and improve story fit
- but they are contextual refiners, not top-level business authority

Their role is usually to adjust ranking and fallback, not overturn a strong upstream or human instruction without cause.

### 4.6 `fallback` is last

Reason:

- fallback should only happen after the preferred path is unavailable or fails quality checks
- fallback is recovery logic, not primary strategy

## 5. How Priority Should Work In Practice

The system should not treat this stack as naive overwrite logic.
It should treat it as guided evaluation.

Recommended flow:

1. check for manual override
2. read `suggested_source_from_plan`
3. check whether strong approved existing assets are available
4. apply role default strategy
5. refine with City Knowledge and Scene
6. prepare fallback order

That means the output should preserve:

- final selected strategy
- what inputs were considered
- which priority actually determined the result

## 6. Conflict Handling

Because there are multiple inputs, conflicts are expected.

The system needs explicit conflict rules.

### 6.1 Case: plan suggests `AI`, but excellent existing asset already exists

Example:

- `plan.json` suggests `generated`
- existing approved cover is a strong match

Recommended handling:

- keep plan suggestion as primary intent
- evaluate whether the plan is explicitly asking for a new asset or only recommending source class
- if no explicit “must regenerate” rule exists, allow `existing_first` only when:
  - asset is high quality
  - editorial fit is strong
  - reuse is allowed by policy

Recommended outcome:

- if editorial reuse is acceptable: `existing_first`
- if the plan explicitly intends a fresh visual expression: `generated_first`

Design principle:

- “suggested” is not the same as “must”
- strong existing assets may override a recommendation when reuse is clearly better

### 6.2 Case: plan suggests `external`, but no suitable library image is found

Recommended handling:

- keep `external_first` as the chosen strategy
- record that external was attempted or assumed preferred
- move to fallback order

Typical fallback:

- `existing`
- then `generated`

Recommended outcome:

- final `asset_source_decision` still records external as preferred source strategy
- execution layer uses fallback when the preferred source is unavailable

Design principle:

- source preference and execution result are different things
- do not rewrite the intent just because fallback may later be needed

### 6.3 Case: plan suggests `external`, but the asset is a Wanderly editorial cover

Recommended handling:

- compare plan suggestion against role default and style requirement
- if cover requires strong brand style and no exceptional reason exists, `generated_first` may remain preferable

Recommended outcome:

- either accept external only with explicit manual/editorial approval
- or mark as conflict and resolve toward `generated_first`

Design principle:

- not every upstream suggestion should bypass strong brand constraints

### 6.4 Case: manual override conflicts with everything else

Recommended handling:

- manual override wins
- the decision record should preserve conflict notes

Reason:

- human operator should remain the final authority

### 6.5 Case: City Knowledge suggests realism, but scene requires strong atmospheric storytelling

Recommended handling:

- treat this as a hybrid or role-sensitive adjustment
- keep the role default as the base
- let City Knowledge shape authenticity constraints
- let Scene shape narrative need

Recommended outcome:

- often `generated_first` for cover/scene
- often `external_first` for place
- sometimes `hybrid` for experience

## 7. Compatibility With `ASSET_SOURCE_DECISION_SPEC`

This priority design should remain compatible with the existing `asset_source_decision` contract.

The output shape does not need a full redesign.
Instead, the decision record can be enriched by documenting:

- what source inputs were considered
- what input had highest decision authority
- what conflicts were resolved

Suggested compatible extension:

```json
{
  "decision_id": "src_decision_cover_hangzhou_001",
  "asset_request_id": "req_cover_hangzhou_001",
  "source_strategy": "generated_first",
  "candidate_sources": [],
  "decision_reason": [],
  "fallback_policy": {},
  "constraints": {},
  "decision_inputs": {
    "suggested_source_from_plan": "generated",
    "existing_asset_availability": "strong_match",
    "manual_override": null
  },
  "decision_priority_trace": {
    "winning_layer": "plan.json suggestion",
    "conflict_resolved": true,
    "conflict_notes": [
      "existing asset available but fresh cover generation remains preferred by plan intent"
    ]
  }
}
```

These fields can be optional design extensions.
The main contract remains recognizable.

## 8. Suggested Normalization Rules

To avoid ambiguity, upstream and internal terms should be normalized before decision.

Recommended mapping:

- `AI` -> `generated`
- `model` -> `generated`
- `external` -> `external`
- `stock` -> `external`
- `existing` -> `existing`
- `legacy` -> `existing`
- missing value -> `unspecified`

This normalized value should be used for rule evaluation.

## 9. Output Principle

The final output should still be one `asset_source_decision`.

That means:

- one selected `source_strategy`
- ordered `candidate_sources`
- clear `decision_reason`
- explicit `fallback_policy`
- optional input trace for transparency

The decision object should explain not just the result, but why the result won.

## 10. Recommended Future Flow

```text
image_request
    +
plan source suggestion
    +
existing asset check
    +
city knowledge
    +
scene requirement
    +
manual override
    ->
priority evaluation
    ->
asset_source_decision
```

This keeps roles clean:

- `image_request` describes need
- priority architecture resolves authority
- adapters execute
- manifest records result

## 11. Design Principles

- Treat upstream source suggestion as important, but not absolute.
- Keep manual override as final authority.
- Treat existing approved assets as first-class production candidates.
- Let asset role define the base policy.
- Use City Knowledge and Scene as refiners, not uncontrolled overrides.
- Keep fallback explicit and traceable.

## 12. Recommended Next Step

The best next design step is:

- define an `ASSET_SOURCE_SELECTOR_RULES.md`

That document can make the priority system more operational by specifying:

- scoring or rule precedence details
- what counts as `strong_match` existing asset
- when plan suggestion is advisory vs effectively mandatory
- when City Knowledge or Scene can promote `hybrid`
