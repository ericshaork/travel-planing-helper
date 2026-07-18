# REAL_MANIFEST_INTEGRATION_REPORT

## 1. Validation Scope

This report records a real integration validation between:

- upstream Wanderly `image_manifest.json`
- current Image Pipeline manifest-driven runner

Validation date:
- July 17, 2026

Validation goal:
- verify whether Image Pipeline can directly consume upstream-generated `image_manifest.json`

Validation constraint:
- no schema changes
- no upstream field changes
- no new manifest invented for this step

## 2. Actual Manifest Used

Primary real manifest used:
- `C:\Users\10200\Desktop\travel-content-pipeline\output\image_manifest\beijing_couple_image_manifest_v1.json`

Secondary real manifest checked:
- `C:\Users\10200\Desktop\travel-content-pipeline\output\image_manifest\beijing_solo_image_manifest_v1.json`

Execution command used:

```bash
node run_manifest_pipeline.js C:\Users\10200\Desktop\travel-content-pipeline\output\image_manifest\beijing_couple_image_manifest_v1.json
```

## 3. Real Manifest Structure

Observed top-level fields:

```json
{
  "trip_id": "beijing_couple_image_manifest_v1",
  "city": "beijing",
  "images": [...]
}
```

Observed item fields:

```json
{
  "asset_id": "...",
  "asset_name": "...",
  "image_slot": "...",
  "type": "...",
  "source_preference": "...",
  "generation_mode": "...",
  "decision_reason": "...",
  "prompt": "...",
  "status": "pending"
}
```

Observed real values in `beijing_couple_image_manifest_v1.json`:

- top-level:
  - `trip_id`
  - `city`
  - `images`
- item-level:
  - `asset_id`
  - `asset_name`
  - `image_slot`
  - `type`
  - `source_preference`
  - `generation_mode`
  - `decision_reason`
  - `prompt`
  - `status`

Observed `generation_mode` values:

- `real_first`
- `mixed`

Observed `source_preference` values:

- `real_photo`
- `hybrid`

## 4. Current Image Pipeline Reader Expectations

Current `readImageManifest(...)` supports:

- top-level:
  - `manifest_id` or `id`
  - `assets[]` or `items[]`
- item-level:
  - `asset_id`
  - `image_slot`
  - `type`
  - `source_preference`
  - `generation_mode`
  - `decision_reason`
  - `prompt`
  - optional `metadata`

Current executor routing supports these `generation_mode` values:

- `real_photo`
- `ai_generated`
- `hybrid`

## 5. Pipeline Run Result

Actual run result:
- failed at manifest reader stage

Actual error:

```text
imageManifest must contain assets[] or items[] with at least one entry.
```

Conclusion:
- current Image Pipeline cannot directly consume the real upstream manifest yet

This is not a late-stage executor problem.
It fails at the first integration boundary.

## 6. Compatibility Findings

### 6.1 Compatible Fields

These real upstream item fields are already semantically aligned with the pipeline:

- `asset_id`
- `image_slot`
- `type`
- `source_preference`
- `generation_mode`
- `decision_reason`
- `prompt`

These do not appear to need a semantic redesign.

### 6.2 Incompatible Top-Level Structure

Current upstream uses:

- `images[]`

Current pipeline expects:

- `assets[]`
- or `items[]`

This is the first blocking incompatibility.

### 6.3 Incompatible Top-Level Identity Fields

Current upstream provides:

- `trip_id`
- `city`

Current pipeline prefers:

- `manifest_id`
- optional metadata fields

This is not the first blocker, but it is still a mismatch.

### 6.4 Incompatible `generation_mode` Vocabulary

Current upstream values:

- `real_first`
- `mixed`

Current pipeline values:

- `real_photo`
- `ai_generated`
- `hybrid`

This is the second blocking incompatibility.

Even if the reader accepted `images[]`, the executor dispatcher would still fail to route:

- `real_first`
- `mixed`

### 6.5 `source_preference` Is Not Yet Normalized

Current upstream values:

- `real_photo`
- `hybrid`

Current pipeline does not reject these values.
However, it also does not yet normalize or interpret them strategically.

So this is:

- not a hard blocker
- but still an integration inconsistency

## 7. Missing Or Ambiguous Fields

The real upstream manifest is enough to describe visual intent at a high level, but still lacks some production-critical fields for stronger downstream automation.

Most useful missing fields:

- `manifest_id`
  Reason:
  current runner uses manifest identity for output grouping and traceability

- `location`
  Reason:
  real photo search and ranking benefit from explicit place context instead of only prompt text

- `metadata`
  Reason:
  current pipeline already supports optional metadata pass-through and can use it for execution hints later

- normalized `generation_mode`
  Reason:
  current executor branching depends on stable mode labels

## 8. Integration Blockers

Current blockers to direct consumption:

1. Top-level array name mismatch
   Upstream uses `images[]`, pipeline expects `assets[]` or `items[]`

2. Generation mode enum mismatch
   Upstream uses `real_first` and `mixed`, pipeline expects `real_photo`, `ai_generated`, `hybrid`

3. Missing stable manifest identity field
   Upstream has `trip_id`, but current pipeline uses `manifest_id` semantics

## 9. Recommended Upstream Field Suggestions

Without redesigning the schema, the most valuable upstream additions or normalizations would be:

- add `manifest_id`
- rename or duplicate `images[]` as `assets[]`
- normalize `generation_mode` to one of:
  - `real_photo`
  - `ai_generated`
  - `hybrid`
- optionally add `metadata.location`
- optionally add `metadata.city`

If upstream wants to minimize changes, the smallest viable compatibility patch on their side would be:

```json
{
  "manifest_id": "beijing_couple_image_manifest_v1",
  "trip_id": "beijing_couple_image_manifest_v1",
  "city": "beijing",
  "assets": [...]
}
```

And item-level:

- `generation_mode: "real_photo"` instead of `real_first`
- `generation_mode: "hybrid"` instead of `mixed`

## 10. Supported Fields Today

Current pipeline can already consume these fields correctly once the top-level container and mode labels are aligned:

- `asset_id`
- `image_slot`
- `type`
- `source_preference`
- `generation_mode`
- `decision_reason`
- `prompt`

So the integration problem is narrow and fixable.
It is not a full schema mismatch.

## 11. Real Production Readiness For Beijing Golden Sample

Current distance from true Beijing Golden Sample production:

- reader must accept real upstream top-level shape
- generation mode values must be normalized
- real manifest should pass stable place context into downstream search
- Wikimedia real-photo flow still depends on external network stability
- `hybrid` executor is still placeholder
- `ai_generated` executor is still placeholder

That means:

- `real_photo` is closest to usable production
- `hybrid` and `ai_generated` are still skeleton-only

## 12. Final Conclusion

Current result:
- real upstream `image_manifest.json` cannot yet be directly consumed by Image Pipeline

Root causes:
- top-level `images[]` vs `assets[]` mismatch
- `generation_mode` enum mismatch

Good news:
- core semantic fields are already closely aligned
- the gap is mostly structural and enum-level, not conceptual

So this is a real integration mismatch, but a relatively small one.
