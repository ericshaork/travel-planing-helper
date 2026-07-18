# Real Image Golden Sample Report

## Scope

This report records the first Golden Sample production run using the real upstream manifest:

- Input manifest: `test/fixtures/upstream_manifest/beijing_couple_image_manifest_v1.json`
- Run date: 2026-07-17
- Pipeline entry: `node run_manifest_pipeline.js test/fixtures/upstream_manifest/beijing_couple_image_manifest_v1.json`

This run used the current local Image Pipeline implementation as-is:

- `manifest_normalizer`
- `reader`
- `task builder`
- `executor`
- `real_photo` via Wikimedia Commons
- `hybrid` placeholder executor

No new functionality was added for this run.

## Overall Result

- Total manifest items: `7`
- Completed tasks: `2`
- Failed tasks: `5`
- Real downloaded images: `0`
- Mock placeholder assets: `2`

Current conclusion:

The `real_photo` chain has **not yet reached** Wanderly's first-batch production standard. The primary blocker in this run is that all Wikimedia-backed `real_photo` tasks failed before any valid candidate entered ranking or download.

## Run Output

- Run output directory: `C:\Users\10200\Desktop\image-pipeline\image-pipeline\output\manifest_runs\image_manifest`
- Pipeline summary: `C:\Users\10200\Desktop\image-pipeline\image-pipeline\output\manifest_runs\image_manifest\pipeline_summary.json`
- Asset tasks: `C:\Users\10200\Desktop\image-pipeline\image-pipeline\output\manifest_runs\image_manifest\asset_tasks.json`
- Generated image assets directory: `C:\Users\10200\Desktop\image-pipeline\image-pipeline\output\manifest_runs\image_manifest\assets`

## Asset-by-Asset Result

| Manifest item | asset_id | image_slot | generation_mode | source router result | Wikimedia result count | final status | rank_score | download path | failure reason |
| --- | --- | --- | --- | --- | ---: | --- | ---: | --- | --- |
| 1 | `ca_beijing_forbidden_city` | `explore_cover` | `real_photo` | `wikimedia (priority=1)` | 0 | `failed` | 0 | `` | `no_photo_search_result` |
| 2 | `ca_beijing_jingshan_park` | `explore_cover` | `real_photo` | `wikimedia (priority=1)` | 0 | `failed` | 0 | `` | `no_photo_search_result` |
| 3 | `ca_beijing_jingshan_park` | `poi_gallery` | `real_photo` | `wikimedia (priority=1)` | 0 | `failed` | 0 | `` | `no_photo_search_result` |
| 4 | `ca_beijing_beihai_park` | `explore_cover` | `real_photo` | `wikimedia (priority=1)` | 0 | `failed` | 0 | `` | `no_photo_search_result` |
| 5 | `ca_beijing_beihai_park` | `poi_gallery` | `real_photo` | `wikimedia (priority=1)` | 0 | `failed` | 0 | `` | `no_photo_search_result` |
| 6 | `ca_beijing_shichahai` | `poi_gallery` | `hybrid` | `N/A` | `N/A` | `completed` | `N/A` | `mock://image-assets/ca_beijing_shichahai.hybrid.jpg` | `N/A` |
| 7 | `ca_beijing_liangma_river` | `day_cover` | `hybrid` | `N/A` | `N/A` | `completed` | `N/A` | `mock://image-assets/ca_beijing_liangma_river.hybrid.jpg` | `N/A` |

## Observed Real Failures

All five `real_photo` tasks returned the same result shape:

```json
{
  "status": "failed",
  "reason": "no_photo_search_result",
  "fallback_available": true,
  "selection": {
    "rank_score": 0,
    "candidate_count": 0,
    "rejected_count": 0
  },
  "metadata": {
    "source_runs": [
      {
        "source": "wikimedia",
        "priority": 1,
        "candidate_count": 0,
        "error": "AggregateError"
      }
    ]
  }
}
```

Interpretation:

- `source_router` is working at the routing level.
- `real_photo executor` correctly sent the task to `wikimedia`.
- The chain failed before candidate validation and ranking.
- No image reached download.
- `fallback_available: true` is correctly exposed for future multi-source fallback.

## Important Data Observation

This manifest contains duplicate `asset_id` values:

- `ca_beijing_jingshan_park` appears twice
- `ca_beijing_beihai_park` appears twice

Current output writing uses:

- `assets/{asset_id}.image_asset.json`

That means duplicated `asset_id` items write to the same output path, so later tasks overwrite earlier task results.

Observed collisions:

- `C:\Users\10200\Desktop\image-pipeline\image-pipeline\output\manifest_runs\image_manifest\assets\ca_beijing_jingshan_park.image_asset.json`
- `C:\Users\10200\Desktop\image-pipeline\image-pipeline\output\manifest_runs\image_manifest\assets\ca_beijing_beihai_park.image_asset.json`

This did not cause the Wikimedia failures, but it does mean the current Golden Sample output is not yet safe for production-grade per-slot asset persistence.

## Production Readiness Assessment

Current `real_photo` chain status against Wanderly first-batch production requirements:

- Manifest intake: pass
- Manifest normalization: pass
- Task building: pass
- Executor dispatch: pass
- Source routing: pass
- Wikimedia candidate acquisition: fail in this run
- Validation and ranking: blocked by zero candidates
- Download: blocked
- Per-asset output writing: partially blocked by duplicate `asset_id` collisions

## Conclusion

For this Golden Sample run, the Image Pipeline can already:

- consume the real upstream manifest
- convert it into tasks
- route `real_photo` tasks into the proper sourcing chain
- preserve failure state without crashing

But it is **not yet ready** for Wanderly's first real-photo production batch because:

1. All Wikimedia-backed `real_photo` tasks failed with zero candidates.
2. No real image was downloaded.
3. Duplicate `asset_id` values caused output file collisions for repeated slots.

## Saved Image Asset Files

The generated `image_asset.json` files from this run were saved under:

- `C:\Users\10200\Desktop\image-pipeline\image-pipeline\output\manifest_runs\image_manifest\assets\ca_beijing_forbidden_city.image_asset.json`
- `C:\Users\10200\Desktop\image-pipeline\image-pipeline\output\manifest_runs\image_manifest\assets\ca_beijing_jingshan_park.image_asset.json`
- `C:\Users\10200\Desktop\image-pipeline\image-pipeline\output\manifest_runs\image_manifest\assets\ca_beijing_beihai_park.image_asset.json`
- `C:\Users\10200\Desktop\image-pipeline\image-pipeline\output\manifest_runs\image_manifest\assets\ca_beijing_shichahai.image_asset.json`
- `C:\Users\10200\Desktop\image-pipeline\image-pipeline\output\manifest_runs\image_manifest\assets\ca_beijing_liangma_river.image_asset.json`

Note:

The manifest had 7 items, but only 5 unique output files exist because of the duplicate `asset_id` collisions described above.
