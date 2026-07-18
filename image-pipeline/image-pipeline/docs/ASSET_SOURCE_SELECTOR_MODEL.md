# ASSET_SOURCE_SELECTOR_MODEL

## 1. Purpose

This document defines the conceptual decision model for Wanderly Asset Source Selector.

It builds on:

- `VISUAL_ASSET_SOURCE_ARCHITECTURE.md`
- `ASSET_SOURCE_DECISION_SPEC.md`
- `ASSET_SOURCE_DECISION_PRIORITY.md`

The goal is to move source selection one step forward:

- from descriptive priority rules
- toward a future executable decision model

This is still not an algorithm implementation.
It is a conceptual model for how the selector should think.

It does not:

- introduce code
- call providers
- search stock libraries
- import existing assets
- generate images

## 2. Position In The Pipeline

Future flow:

```text
image_request
    +
plan suggestion
    +
asset role
    +
existing asset evaluation
    +
city knowledge
    +
scene requirement
    +
brand/style requirement
    +
realism requirement
    ->
asset source selector model
    ->
asset_source_decision
```

The selector model should not directly return a file or a provider call.
It should return a strategic source choice.

## 3. Decision Evaluation Dimensions

The model should evaluate at least these dimensions.

### 3.1 Plan Suggestion Influence

Question answered:

- what source intent is already suggested by upstream `plan.json`

Possible values:

- `generated`
- `external`
- `existing`
- `hybrid`
- `unspecified`

Influence:

- strong positive signal toward the suggested source
- not absolute
- may be softened by quality, reuse, or brand constraints

### 3.2 Asset Role Preference

Question answered:

- what source type is normally best for this class of asset

Typical bias:

- `cover` -> generated bias
- `place` -> external bias
- `food` -> external bias
- `scene` -> generated bias
- `experience` -> hybrid bias

This is the base policy layer.

### 3.3 Existing Asset Quality

Question answered:

- is there already an approved asset that is good enough to reuse

This is more than simple availability.
It should measure:

- visual fit
- editorial fit
- destination fit
- freshness suitability

Suggested normalized states:

- `none`
- `weak_match`
- `strong_match`

### 3.4 City Knowledge Influence

Question answered:

- does the destination require realism, local specificity, or anti-generic safeguards

Examples:

- Xi'an Terracotta Warriors increases value of external realism
- Hangzhou cover may still stay generated, but City Knowledge may reduce generic lake imagery

City Knowledge usually changes source confidence, not just content phrasing.

### 3.5 Scene Requirement

Question answered:

- does the asset need a specific editorial moment or storytelling composition

Examples:

- “quiet canal morning” pushes toward generated or hybrid
- “recognizable museum exterior” pushes toward external

This dimension matters most when the image is not purely documentary.

### 3.6 Brand / Style Requirement

Question answered:

- how strongly must the image conform to Wanderly editorial identity

High brand/style requirement favors:

- `generated`
- `existing` if already on-brand

Low or medium brand/style requirement can allow:

- `external`

### 3.7 Realism Requirement

Question answered:

- how important is visual truthfulness versus stylized expression

High realism requirement favors:

- `external`
- sometimes `existing`

Low realism requirement favors:

- `generated`

Mixed realism requirement often points toward:

- `hybrid`

## 4. Conceptual Scoring Model

The selector does not need a final numeric algorithm yet.
But it should behave as if each source type is accumulating support signals.

Candidate source classes:

- `generated`
- `external`
- `existing`
- `hybrid`

Each evaluation dimension contributes positive or negative pressure to these candidates.

## 4.1 Model Principle

Think of the selector as building four conceptual scores:

- generated score
- external score
- existing score
- hybrid score

The winning strategy is not always the highest raw signal.
Priority rules still matter.

The better interpretation is:

- priority rules define authority
- scoring dimensions define suitability

## 4.2 Example Score Tendencies

### Cover

Typical tendency:

- generated score higher
- existing score moderate to high if on-brand approved asset exists
- external score lower unless explicitly required

Why:

- cover is editorial
- brand style is important
- composition control matters

### Place

Typical tendency:

- external score higher
- existing score moderate if there is an approved place asset
- generated score lower unless stock coverage is poor

Why:

- place images need recognition
- realism matters

### Food

Typical tendency:

- external score higher
- generated score medium
- hybrid score medium in some cases

Why:

- real food photography is persuasive
- generated can assist style consistency or fill gaps

### Scene

Typical tendency:

- generated score higher
- existing score moderate if an editorial atmospheric asset exists
- external score lower

Why:

- scene is mood-first
- exact stock matches are rare

### Legacy Approved Asset Present

Typical tendency:

- existing score becomes high

Why:

- reuse lowers cost and review effort
- approved assets are already production candidates

## 4.3 Conceptual Example

For a Hangzhou cover:

- plan suggestion: generated
- role preference: generated
- brand/style requirement: high
- scene requirement: high
- realism requirement: medium
- existing asset quality: weak

Likely interpretation:

- strong generated score
- low external score
- medium hybrid score
- low existing score

Final direction:

- `generated_first`

For a Xi'an place image:

- plan suggestion: unspecified
- role preference: external
- realism requirement: high
- city knowledge: strong landmark specificity
- existing asset quality: none

Likely interpretation:

- high external score
- medium existing score only if inventory appears later
- low generated score

Final direction:

- `external_first`

## 5. Strong Match Definition

The selector needs a more concrete definition for existing asset quality.

### 5.1 `none`

Meaning:

- no approved relevant asset exists
- or existing assets are too weak to be reasonable candidates

Typical signs:

- wrong city
- wrong subject
- wrong visual role
- clearly outdated or low quality

### 5.2 `weak_match`

Meaning:

- an approved asset exists
- but fit is partial rather than confident

Typical signs:

- correct city but weak subject alignment
- visually usable but not ideal for current scene
- acceptable style but weak editorial specificity
- usable as fallback, not ideal as first choice

Recommended use:

- include `existing` in candidate list
- usually not enough to beat strong role or plan bias by itself

### 5.3 `strong_match`

Meaning:

- an approved asset exists and fits the request with high confidence

A `strong_match` should usually satisfy most of these:

- correct city or destination context
- correct asset role
- strong subject relevance
- acceptable freshness
- strong editorial fit
- approved quality
- safe for current product usage

Recommended use:

- `existing` becomes a top candidate
- may override default generation or sourcing when reuse is clearly efficient

## 6. Hybrid Trigger Conditions

`hybrid` should not be treated as a vague fallback bucket.
It should be a valid deliberate strategy.

Meaning:

- the final visual solution intentionally combines multiple source types
- or the decision expects two complementary asset classes for the same content need

## 6.1 Generated + External

Recommended when:

- realism and atmosphere are both important
- one asset type serves recognition, another serves emotion

Examples:

- `place`:
  real POI photo plus AI atmospheric support image
- `food`:
  real dish photo plus AI editorial mood card
- `experience`:
  real activity reference plus AI cover-like story visual

## 6.2 Existing + Generated

Recommended when:

- an approved asset partially solves the need
- but a new generated asset is still required for freshness, variation, or style fit

Examples:

- reuse an approved city cover for one article slot
- generate a new scene or alternate cover for the same trip

## 6.3 Existing + External

Recommended when:

- legacy assets cover some cases
- documentary gaps should be filled with external photos

Example:

- existing Wanderly cover plus external place photos

## 6.4 Experience Role As Natural Hybrid

`experience` is the most natural hybrid candidate because it often needs:

- real-world credibility
- human activity
- emotional storytelling

That combination may not be best served by only one source class.

## 6.5 Hybrid Guardrail

Use `hybrid` only when:

- the sources play different roles
- the combination is intentional
- manifest and review can still explain provenance clearly

Do not use `hybrid` just because the system is uncertain.

## 7. Decision Trace

Future selector output should preserve a trace of why the decision happened.

This trace is useful for:

- debugging
- editorial review
- future automation audits
- explaining why a source was not chosen

Suggested conceptual shape:

```json
{
  "winning_factors": [
    "high brand/style requirement",
    "cover role default bias",
    "plan suggested generated"
  ],
  "rejected_options": [
    {
      "source_type": "external",
      "reason": "insufficient editorial style control for cover"
    },
    {
      "source_type": "existing",
      "reason": "only weak legacy match available"
    }
  ],
  "final_strategy": "generated_first"
}
```

## 7.1 Suggested Trace Dimensions

The trace may later record:

- `winning_factors`
- `rejected_options`
- `priority_winner`
- `score_tendencies`
- `conflict_notes`
- `final_strategy`

This should remain readable by both systems and humans.

## 8. Example Decision Patterns

### 8.1 Hangzhou Cover

Pattern:

- generated high
- existing medium if strong approved cover exists
- external low

Likely strategy:

- `generated_first`
- or `existing_first` if a true strong on-brand legacy match exists

### 8.2 Xi'an Terracotta Warriors Place

Pattern:

- external high
- generated low
- existing depends on inventory

Likely strategy:

- `external_first`

### 8.3 Chengdu Hotpot Food

Pattern:

- external high
- generated medium
- hybrid possible if both documentary and editorial usage exist

Likely strategy:

- `external_first`
- or `hybrid` if paired food mood usage is needed

### 8.4 Experience Asset

Pattern:

- hybrid often high
- generated and external may both contribute

Likely strategy:

- `hybrid`

## 9. Relationship To Existing Docs

This document does not replace the earlier docs.

Roles remain:

- `VISUAL_ASSET_SOURCE_ARCHITECTURE`:
  defines source classes and overall architecture
- `ASSET_SOURCE_DECISION_SPEC`:
  defines output contract
- `ASSET_SOURCE_DECISION_PRIORITY`:
  defines authority order
- `ASSET_SOURCE_SELECTOR_MODEL`:
  defines conceptual evaluation logic

Together they describe:

- what sources exist
- what the decision object looks like
- which input wins when they conflict
- how the selector should reason before execution

## 10. Design Principles

- Separate authority from suitability.
- Treat scoring as conceptual, not yet algorithmic.
- Let role defaults anchor the model.
- Let existing strong matches materially influence decisions.
- Use City Knowledge and Scene to improve specificity, not to add noise.
- Treat hybrid as intentional strategy, not uncertainty fallback.
- Preserve decision trace for human review.

## 11. Recommended Next Step

The most useful next step is not more theory, but one of these two:

1. define a small set of selector test cases
2. design a future `decision_trace` field extension for `asset_source_decision`

That would make this model easier to verify later without yet writing source-selection code.
