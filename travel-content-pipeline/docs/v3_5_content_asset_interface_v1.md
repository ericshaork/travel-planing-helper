# V3.5 Content Asset Interface v1

## Why This Interface Exists

Wanderly now has three adjacent but distinct layers:

1. Content Asset
2. Map Asset
3. Future Image Asset

The goal of this interface is to freeze how these layers talk to each other before they are formally wired into the production generation flow.

This document defines the stable protocol for:

- Content Asset -> GenerationContext experiment layer
- Content Asset -> future Image Pipeline
- Content Asset -> Map Asset association

This step does not introduce image generation, website integration, or production flow refactors.

## Content Asset Responsibility

Content Asset is responsible for:

- editorial value
- why an asset is worth selecting
- traveler fit
- seasonal fit
- editorial role in the route
- selection reason
- image requirement description

Content Asset is not responsible for:

- coordinates
- distance
- duration
- route computation
- movement burden calculation
- image file generation
- image hosting

In short:

- Content Asset answers: why this belongs in the story
- Map Asset answers: where it is and how movement works
- Image Asset answers: what visual artifact exists for it

## Map Asset Responsibility

Map Asset is responsible for:

- POI identity
- latitude
- longitude
- provider-backed route facts
- distance
- duration
- movement burden

Map Asset is not responsible for:

- editorial selection
- content role
- traveler resonance
- image requirement planning

## Future Image Asset Responsibility

Future Image Asset should be responsible for:

- generated image file
- image URL or local path
- image version tracking
- approval state
- asset-to-image linkage

Image Asset should not decide whether a Content Asset belongs in a route. It should fulfill already-defined image requirements from Content Asset context.

## Relationship Between The Three Layers

The relationship should remain:

Content Asset
-> references `map_asset_id`
-> Map Asset

Content Asset
-> declares `image_context`
-> Image Asset generation / storage workflow

GenerationContext should eventually consume both:

- content meaning from Content Asset context
- spatial facts from Map Asset context

without collapsing them into one mixed schema.

## image_context v1

`image_context` is the stable interface between Content Asset selection and the future image pipeline.

Structure:

```json
{
  "required": true,
  "images": [
    {
      "type": "hero",
      "purpose": "Explore card cover",
      "prompt": "Beijing Forbidden City in an autumn afternoon, red walls and glazed roofs carrying a strong first-visit imperial scale, with slow-moving visitors showing a ceremonial arrival experience.",
      "placeholder": "",
      "status": "pending"
    }
  ]
}
```

### Field Meaning

`required`

- Whether the selected asset needs visual support in downstream workflows.

`images`

- A list of required image deliverables for the asset.

`type`

- Allowed v1 values:
  - `hero`
  - `experience`
  - `detail`
  - `food`

`purpose`

- Reader-facing reason for why this image exists.
- Useful for reviewers, websites, and future asset management.

`prompt`

- Generator-facing scene description.
- Should describe:
  - scene
  - subject
  - atmosphere
  - experience emphasis

Prompt should not contain:

- model parameters
- rendering settings
- style-control tokens owned by the image system

`placeholder`

- Reserved for future local path, file id, or URL.

`status`

- Allowed v1 values:
  - `pending`
  - `generated`
  - `approved`

Default for this prototype stage is `pending`.

## Backward Compatibility

Current prototype work previously used a lighter placeholder:

```json
{
  "required": true,
  "image_role": ["hero"],
  "description": ""
}
```

That structure should be treated as a legacy prototype shape only.

The v1 interface is now:

```json
{
  "required": true,
  "images": [
    {
      "type": "hero",
      "purpose": "",
      "prompt": "",
      "placeholder": "",
      "status": "pending"
    }
  ]
}
```

Existing Beijing Content Asset JSON files do not need to be rewritten in this step because the image requirement is synthesized at Candidate Selection / Content Asset Context time rather than stored in every asset file today.

## Current Prototype Mapping

At the prototype layer:

- Candidate Selection decides that an asset needs image output
- Candidate Selection infers one or more image types from editorial role
- Content Asset Context carries that requirement forward

Example mappings:

- `signature_anchor` -> `hero`
- `historic_texture` -> `experience`
- `food_backbone` -> `food`
- `evening_closure` -> `experience` or mood-oriented hero framing depending on downstream system choice

This keeps image generation decoupled from the selector while still giving the next system a direct machine-readable contract.

## Stable Interface Summary

Content Asset v1 should expose:

- editorial roles
- selection reasons
- image requirement definitions

Map Asset v1 should expose:

- identity
- coordinates
- route facts

Future Image Asset v1 should expose:

- generated image outputs
- approval / version state

This separation keeps responsibilities clear while allowing controlled integration into GenerationContext experiments later.
