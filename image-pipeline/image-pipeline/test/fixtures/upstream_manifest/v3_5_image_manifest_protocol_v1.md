# V3.5 Image Manifest Protocol v1

## Why This Layer Exists

The Wanderly content pipeline can already produce `image_context v2` inside `content_asset_context`, but that structure still lives inside the travel-plan generation flow. A future image pipeline should not need to understand full trip JSON, editorial route structure, or validation internals just to know which images to source or generate.

`Image Manifest v1` is the export contract between:

Content Pipeline  
-> Image Manifest  
-> Image Pipeline

Its job is to turn selected content assets into a compact list of image tasks.

## Responsibility Boundary

### Content Pipeline

Responsible for:

- deciding which content assets were selected
- defining why each image is needed
- defining prompt, slot, sourcing preference, and confidence

Not responsible for:

- downloading photos
- generating AI images
- storing image files
- website delivery

### Image Manifest

Responsible for:

- exporting standardized image tasks
- preserving image intent from content assets
- giving downstream systems a stable, trip-level input file

### Future Image Pipeline

Responsible for:

- reading the manifest
- executing sourcing or generation
- storing files or URLs
- managing approval workflow

## Manifest Shape

```json
{
  "trip_id": "beijing_couple_image_manifest_v1",
  "city": "beijing",
  "images": [
    {
      "asset_id": "ca_beijing_forbidden_city",
      "asset_name": "故宫博物院",
      "image_slot": "explore_cover",
      "type": "hero",
      "source_preference": "real_photo",
      "generation_mode": "real_first",
      "decision_reason": "具有明确地理真实性要求，真实图片更适合作为旅行入口展示。",
      "prompt": "春日上午的故宫博物院主视觉画面，保留真实地理与建筑信息……",
      "status": "pending"
    }
  ]
}
```

## Field Notes

- `trip_id`: stable trip-level manifest identifier
- `city`: city code for downstream routing
- `asset_id`: upstream content asset identity
- `asset_name`: reviewer-friendly asset name
- `image_slot`: future placement target such as `explore_cover` or `food_gallery`
- `type`: image task type such as `hero`, `experience`, `detail`, or `food`
- `source_preference`: preferred sourcing channel
- `generation_mode`: execution priority for sourcing vs generation
- `decision_reason`: human-readable explanation of the rule decision
- `prompt`: image-ready natural language scene description
- `status`: task state, currently exported as `pending`

## Export Rule

Input:

- `content_asset_context.selected_assets[*].image_context.images[*]`

Output:

- one manifest task per image entry

The exporter must preserve:

- `asset_id`
- `asset_name`
- `image_slot`
- `type`
- `source_preference`
- `generation_mode`
- `decision_reason`
- `prompt`
- `status`

## Validation Expectations

For each manifest:

- every image task must contain the required fields
- image count must stay within a reasonable editorial range
- asset coverage must match the selected content assets for that trip
- downstream systems should not need to open travel-plan JSON

## Current Scope

This protocol is currently frozen for:

- Beijing couple golden sample
- Beijing student golden sample
- Beijing solo golden sample

It does not yet include:

- image file URLs
- version history
- approval owner
- real-photo provider metadata
- generation provider metadata

Those belong to a later image-pipeline phase.
