# REAL_MANIFEST_COMPATIBILITY_REPORT

## 1. Validation Scope

This report records real integration validation between upstream Wanderly manifests and the current Image Pipeline manifest runner.

Validation date:
- July 17, 2026

Validation rule:
- no code changes
- no upstream schema changes
- no synthetic replacement manifest

Validation goal:
- confirm whether Image Manifest v1 can directly drive Image Pipeline

## 2. Real Input Files Used

All validation runs used these real fixture files:

- `C:\Users\10200\Desktop\image-pipeline\image-pipeline\test\fixtures\upstream_manifest\beijing_couple_image_manifest_v1.json`
- `C:\Users\10200\Desktop\image-pipeline\image-pipeline\test\fixtures\upstream_manifest\beijing_solo_image_manifest_v1.json`
- `C:\Users\10200\Desktop\image-pipeline\image-pipeline\test\fixtures\upstream_manifest\beijing_student_image_manifest_v1.json`

## 3. Commands Actually Executed

```bash
node run_manifest_pipeline.js test/fixtures/upstream_manifest/beijing_couple_image_manifest_v1.json
```

```bash
node run_manifest_pipeline.js test/fixtures/upstream_manifest/beijing_solo_image_manifest_v1.json
```

```bash
node run_manifest_pipeline.js test/fixtures/upstream_manifest/beijing_student_image_manifest_v1.json
```

## 4. Actual Run Results

### 4.1 `beijing_couple_image_manifest_v1.json`

- reader: failed
- task builder: not reached
- executor: not reached
- first failure position: `readImageManifest`
- failure reason:

```text
imageManifest must contain assets[] or items[] with at least one entry.
```

### 4.2 `beijing_solo_image_manifest_v1.json`

- reader: failed
- task builder: not reached
- executor: not reached
- first failure position: `readImageManifest`
- failure reason:

```text
imageManifest must contain assets[] or items[] with at least one entry.
```

### 4.3 `beijing_student_image_manifest_v1.json`

- reader: failed
- task builder: not reached
- executor: not reached
- first failure position: `readImageManifest`
- failure reason:

```text
imageManifest must contain assets[] or items[] with at least one entry.
```

## 5. Upstream Actual Fields

Observed top-level fields in all three upstream manifests:

- `trip_id`
- `city`
- `images`

Observed item fields:

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

Observed item counts:

- `beijing_couple_image_manifest_v1.json`: 7 items
- `beijing_solo_image_manifest_v1.json`: 5 items
- `beijing_student_image_manifest_v1.json`: 5 items

## 6. Current Image Pipeline Supported Fields

Current `readImageManifest(...)` expects:

### Top-level

- `manifest_id` or `id`
- `assets[]` or `items[]`
- optional:
  - `created_at`
  - `schema_version`
  - `trip_id`
  - `document_id`

### Item-level

- `asset_id`
- `image_slot`
- `type`
- `source_preference`
- `generation_mode`
- `decision_reason`
- `prompt`
- optional `metadata`

Current executor routing supports:

- `real_photo`
- `ai_generated`
- `hybrid`

## 7. Differences

### 7.1 Top-level container mismatch

Upstream provides:

- `images[]`

Current pipeline supports:

- `assets[]`
- `items[]`

Impact:
- hard blocker
- reader fails before task creation

### 7.2 Manifest identity mismatch

Upstream provides:

- `trip_id`

Current pipeline prefers:

- `manifest_id`

Impact:
- not the first failure
- but still a traceability mismatch

### 7.3 Generation mode enum mismatch

Upstream provides:

- `real_first`
- `mixed`

Current executor supports:

- `real_photo`
- `ai_generated`
- `hybrid`

Impact:
- second hard blocker
- even after reader compatibility, executor dispatch would still fail or misroute

### 7.4 Extra upstream fields not consumed yet

Upstream item contains:

- `asset_name`
- `status`

Current pipeline does not consume them.

Impact:
- not a blocker
- but currently ignored

## 8. Minimum Compatibility Plan

Without redesigning the schema, the minimum compatibility path is:

### Option A: Minimal upstream normalization

At top-level:

- expose `assets[]` as an alias of `images[]`
- add `manifest_id`

At item-level:

- normalize `generation_mode`
  - `real_first` -> `real_photo`
  - `mixed` -> `hybrid`

### Option B: Minimal downstream compatibility patch

At reader level:

- accept `images[]` as a valid top-level array

At executor routing level:

- map `real_first` to `real_photo`
- map `mixed` to `hybrid`

This is the smallest compatibility surface.

## 9. Direct Answer

Can Image Manifest v1 directly drive the current Image Pipeline?

- No

Why not?

- reader cannot consume `images[]`
- executor model does not recognize `real_first` and `mixed`

So the current incompatibility is real and confirmed by actual runs, not assumption.

## 10. Next Recommendation

Before changing any deeper pipeline logic, the next thing to confirm with upstream is only this:

1. should top-level canonical field be `images[]` or `assets[]`
2. should canonical generation modes be:
   - `real_photo`
   - `ai_generated`
   - `hybrid`

Once those two compatibility points are aligned, a second real integration run can verify whether task building and executor routing work end to end.
