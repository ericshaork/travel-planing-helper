# VISUAL_ASSET_SOURCE_ARCHITECTURE

## 1. Positioning

This document defines the Asset Source Layer for Wanderly Image Pipeline.

Its purpose is to answer one architectural question before any provider or library integration:

- where a visual asset should come from
- why that source is appropriate
- how different sources can still enter one unified asset system

At this stage, Image Pipeline should no longer be understood as only an AI image generator.
It should be understood as a Visual Asset Pipeline that can manage:

- `generated` assets
- `external` assets
- `existing` assets

The pipeline may still keep the engineering name `image-pipeline`, but its product responsibility is broader:

- decide source strategy
- normalize asset references
- unify asset records
- preserve source provenance

This document is design only.
It does not introduce API integration, file downloading, or image generation.

## 2. Asset Source Layer

### 2.1 Core Definition

Every visual asset should have a `source_type`:

```json
{
  "source_type": "generated | external | existing"
}
```

This field answers where the asset came from, not how it is displayed.

### 2.2 Source Types

#### `generated`

Definition:
- assets produced by an image model

Examples:
- Seedream cover illustration
- OpenAI Image scene image
- Flux-generated editorial travel cover

Characteristics:
- strong style control
- easier brand consistency
- suitable for atmospheric or editorial assets
- requires provider execution and review flow

#### `external`

Definition:
- assets acquired from external licensed or approved photo sources

Examples:
- free commercial stock photo
- licensed editorial destination photo
- curated POI photo from a supported media source

Characteristics:
- strong realism
- useful for destination recognition and decision support
- requires attribution and license metadata
- may be harder to keep visually consistent with generated covers

#### `existing`

Definition:
- assets the team already owns or has already approved for production use

Examples:
- historical Wanderly GPT assets
- manually curated approved cover library
- approved internal image collection

Characteristics:
- already has production value
- may skip re-review depending on provenance policy
- should enter the same manifest and directory structure as new assets

## 3. Why This Layer Exists

Without an Asset Source Layer, the pipeline would incorrectly assume:

- every request should be solved by model generation
- every image is equivalent once a file exists
- asset management starts only after generation

That assumption is too narrow for Wanderly.

Wanderly needs to support:

- brand-led cover generation
- realistic place and food imagery
- legacy approved asset reuse
- future source expansion without rewriting the pipeline

Therefore the source decision must become an explicit layer, not an implicit side effect of provider choice.

## 4. Default Source Strategy by Asset Role

Each `asset_role` should have a default source preference, while still allowing override by policy or editorial decision.

### 4.1 `cover`

Default policy:
- `generated_first`

Fallbacks:
- `existing_second`
- `external_rare`

Reason:
- cover is a brand-facing editorial asset
- style consistency matters more than strict realism
- Wanderly cover needs watercolor journal identity

### 4.2 `place`

Default policy:
- `external_first`

Fallbacks:
- `existing_second`
- `generated_third`

Reason:
- place imagery should help users recognize and understand the destination
- realism is usually more important than artistic stylization

### 4.3 `food`

Default policy:
- `external_first`

Fallbacks:
- `generated_second`
- `existing_second`

Reason:
- food benefits from real texture and believable presentation
- AI may help when coverage is missing or style unification is needed

### 4.4 `scene`

Default policy:
- `generated_first`

Fallbacks:
- `existing_second`

Reason:
- scene assets are usually atmospheric rather than documentary
- scene images benefit from strong control over mood and composition

### 4.5 `experience`

Default policy:
- `hybrid`

Suggested order:
- `existing_first_when_available`
- `external_or_generated_based_on_goal`

Reason:
- some experiences need realism
- some experiences need immersive illustration
- this role depends more heavily on context than other roles

## 5. Asset Selection Policy

## 5.1 Goal

When an `image_request` arrives, the system should not immediately ask a provider to generate an image.
It should first decide which source strategy is appropriate.

This decision layer is called Asset Selection Policy.

### 5.2 Decision Output

A request should produce a source decision like:

```json
{
  "asset_request_id": "req_place_terracotta_warriors_001",
  "asset_role": "place",
  "source_strategy": "external_first",
  "candidate_source_types": ["external", "existing", "generated"],
  "decision_reason": [
    "place imagery prioritizes recognition and realism",
    "subject is a well-documented landmark with likely photo coverage"
  ]
}
```

### 5.3 Strategy Vocabulary

Recommended strategy labels:

- `generated_first`
- `external_first`
- `existing_first`
- `hybrid`
- `manual_editorial_selection`

These are strategy labels, not execution results.

### 5.4 Example Rules

Example A:

```json
{
  "asset_role": "place",
  "subject": "Terracotta Warriors"
}
```

Suggested decision:

```json
{
  "source_strategy": "external_first"
}
```

Reason:
- globally recognizable POI
- realism is valuable
- external image coverage is likely

Example B:

```json
{
  "asset_role": "cover",
  "subject": "Xi'an trip"
}
```

Suggested decision:

```json
{
  "source_strategy": "generated_first"
}
```

Reason:
- cover needs brand style
- editorial composition matters more than documentary accuracy

Example C:

```json
{
  "asset_role": "cover",
  "subject": "Hangzhou family slow travel",
  "legacy_asset_available": true
}
```

Suggested decision:

```json
{
  "source_strategy": "existing_first"
}
```

Reason:
- approved internal asset may already satisfy the need
- no need to regenerate if quality and fit are already high

## 6. Selection Inputs

Asset Selection Policy should be able to evaluate at least these dimensions:

- `asset_role`
- `subject type`
- `destination`
- `editorial goal`
- `style requirement`
- `realism requirement`
- `legacy asset availability`
- `external coverage likelihood`
- `manual override`

This policy layer should stay above providers and above storage.
It decides source direction, not transport details.

## 7. Unified Asset Reference

No matter where an asset comes from, the final manifest should use one normalized reference shape.

### 7.1 Reference Goal

The manifest consumer should be able to read assets consistently without knowing whether they came from:

- a model
- a stock library
- a historical approved archive

### 7.2 Suggested Shape

```json
{
  "asset_id": "asset_cover_xian_001",
  "asset_role": "cover",
  "source_type": "generated",
  "source": {
    "provider": "seedream",
    "model": "seedream-3.0"
  },
  "file": {
    "path": "images/trip_xian_001/cover/cover_001.png"
  }
}
```

External example:

```json
{
  "asset_id": "asset_place_terracotta_warriors_001",
  "asset_role": "place",
  "source_type": "external",
  "source": {
    "provider": "unsplash",
    "license": "free_commercial_use",
    "author": "example author"
  },
  "file": {
    "path": "images/trip_xian_001/places/terracotta_warriors_001.jpg"
  }
}
```

Existing example:

```json
{
  "asset_id": "asset_cover_hangzhou_legacy_001",
  "asset_role": "cover",
  "source_type": "existing",
  "source": {
    "provider": "wanderly_legacy_archive",
    "legacy_approved": true,
    "ingestion_mode": "manual_import"
  },
  "file": {
    "path": "images/trip_hangzhou_001/cover/cover_legacy_001.png"
  }
}
```

### 7.3 Manifest Principle

Manifest should unify consumption, not erase provenance.

That means:

- same manifest structure
- different source metadata retained
- same asset lifecycle entry point
- different review or attribution rules still preserved

## 8. Relationship With Existing Manifest Design

This architecture does not replace `asset_manifest`.
It strengthens what the manifest must eventually express.

Future manifest records should be able to retain:

- `source_type`
- `source.provider`
- `source.model` or `source.license`
- `ingestion_mode`
- `legacy_approved`
- attribution metadata when relevant

Generated, external, and existing assets should all become first-class manifest records.

## 9. Relationship With City Knowledge and Scene

City Knowledge × Scene Mapping remains valid and should not be removed.

The future decision model becomes:

```text
City Knowledge
    +
Scene
    +
Asset Source Strategy
    ->
Image or Visual Asset Decision
```

### 9.1 Different Roles of These Layers

`City Knowledge` provides:
- what is visually authentic to the destination
- what should not collapse into generic travel imagery

`Scene` provides:
- what specific story or thumbnail moment this asset should show
- what content differences should exist between candidate covers

`Asset Source Strategy` provides:
- whether this need should be generated, sourced externally, or reused from existing assets

These layers should cooperate, not replace each other.

### 9.2 Example

For a Hangzhou cover:

- City Knowledge says Hangzhou is not only West Lake
- Scene says this candidate should show canal-side daily life rather than pavilion-lotus imagery
- Source Strategy says cover should still be `generated_first`

For a Xi'an place image:

- City Knowledge says Terracotta Warriors is a core visual asset
- Scene may be unnecessary or lightweight
- Source Strategy says `external_first`

## 10. Integration With Current Image Pipeline

This design can fit into the current pipeline without changing the existing module boundary.

Future flow:

```text
plan.json
    ->
request_builder
    ->
image_request
    ->
asset source selector
    ->
generated path | external path | existing path
    ->
manifest builder
```

### 10.1 What Changes Later

When this architecture is implemented in code, the pipeline would likely gain:

- a source selection step after `image_request`
- adapters for `generated`, `external`, and `existing`
- unified manifest writing regardless of source

### 10.2 What Does Not Change

- `travel-content-pipeline` remains independent
- provider adapters remain focused on generation only
- manifest remains the unified asset record
- scene and city knowledge remain content-conditioning layers

## 11. Design Principles

- Do not assume generation is the default answer to every image need.
- Keep source decision above provider selection.
- Keep provider logic generation-only.
- Keep provenance visible in manifest.
- Prefer realism for documentary roles and style control for editorial roles.
- Treat legacy approved assets as production assets, not leftovers.

## 12. Recommended Next Step

After this document, the most valuable next design step is:

- define a `source_selection_spec` or `asset_source_decision` contract

That contract would sit between:

- `image_request`
- provider or sourcing execution

It would make source choice explicit before any future API integration for stock media, existing archives, or generation providers.
