# V3.5 Image Manifest Protocol v1

This document defines the upstream image manifest exported by `travel-content-pipeline` for downstream consumption by `image-pipeline`.

## Top-level shape

```json
{
  "trip_id": "beijing_couple_image_manifest_v1_1",
  "city": "beijing",
  "images": []
}
```

## Image task shape

Each `images[]` item must include:

- `asset_id`
- `asset_instance_id`
- `asset_name`
- `image_slot`
- `type`
- `location_context`
- `search_keywords`
- `visual_subject`
- `source_preference`
- `generation_mode`
- `decision_reason`
- `prompt`
- `status`

## Field semantics

`source_preference` means upstream sourcing preference. It expresses the editorial bias for how the image should be sourced before execution details are applied.

Allowed `source_preference` values:

- `real_first`
- `mixed`
- `ai_first`

`generation_mode` means downstream execution mode. It must be normalized to the runnable mode names expected by `image-pipeline`.

Allowed `generation_mode` values:

- `real_photo`
- `hybrid`
- `ai_generated`

## Mapping rule

The content pipeline must normalize strategy output using this mapping:

- `source_preference: "real_first"` -> `generation_mode: "real_photo"`
- `source_preference: "mixed"` -> `generation_mode: "hybrid"`
- `source_preference: "ai_first"` -> `generation_mode: "ai_generated"`

## Compatibility note

`image-pipeline` should treat `generation_mode` as the executable field.

`source_preference` is retained so the manifest still preserves upstream editorial intent, even when multiple preferences eventually map into a smaller downstream execution-mode set.
