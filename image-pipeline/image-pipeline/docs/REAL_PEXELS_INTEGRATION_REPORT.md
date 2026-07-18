# Real Pexels Integration Report

## Scope

This report records the first real integration attempt for `real_photo` production using:

- upstream manifest: `test/fixtures/upstream_manifest/beijing_couple_image_manifest_v1.json`
- run date: `2026-07-17`
- pipeline command:

```bash
node run_manifest_pipeline.js test\fixtures\upstream_manifest\beijing_couple_image_manifest_v1.json output\manifest_runs\pexels_real_validation
```

The goal of this run was not image quality tuning. It was only to verify the real execution chain:

`Image Manifest -> Image Pipeline -> Pexels Adapter -> image_asset`

## Environment Check

`load_env()` successfully read the local Pexels credential placeholder:

```json
{
  "hasPexelsApiKey": true,
  "pexelsApiKeyLength": 56,
  "defaultProvider": "seedream"
}
```

Conclusion:

- `PEXELS_API_KEY` is present in `.env`
- the failure was **not** caused by missing local credential loading

## Run Output Location

Actual output directory:

- `C:\Users\10200\Desktop\image-pipeline\image-pipeline\output\manifest_runs\pexels_real_validation\image_manifest`

Generated files:

- `image_manifest.input.json`
- `asset_tasks.json`
- `pipeline_summary.json`
- per-asset `image_asset.json`

Note:

The CLI wrapper still wrote to `image_manifest/` instead of `beijing_couple_image_manifest_v1/`. This is a known output-path behavior from the wrapper and did not affect the source execution result itself.

## Overall Result

- manifest items: `7`
- completed tasks: `2`
- failed tasks: `5`
- real downloaded photo assets: `0`
- completed tasks were both `hybrid` placeholders

Current conclusion:

The manifest-driven pipeline ran successfully, but `Pexels` did **not** yet drive real photo production because the adapter stopped at the search stage.

## Source Router Behavior

For all `real_photo` tasks, the source router used:

1. `wikimedia`
2. `pexels`

This confirms that the fallback order is active in the real run.

## Asset-Level Result

| asset_instance_id | mode | router path | Wikimedia results | Pexels results | final status | rank_score | download path | failure location |
| --- | --- | --- | ---: | ---: | --- | ---: | --- | --- |
| `ca_beijing_forbidden_city_explore_cover` | `real_photo` | `wikimedia -> pexels` | 0 | 0 | `failed` | 0 | `` | `Pexels search not implemented` |
| `ca_beijing_jingshan_park_explore_cover` | `real_photo` | `wikimedia -> pexels` | 0 | 0 | `failed` | 0 | `` | `Pexels search not implemented` |
| `ca_beijing_jingshan_park_poi_gallery` | `real_photo` | `wikimedia -> pexels` | 0 | 0 | `failed` | 0 | `` | `Pexels search not implemented` |
| `ca_beijing_beihai_park_explore_cover` | `real_photo` | `wikimedia -> pexels` | 0 | 0 | `failed` | 0 | `` | `Pexels search not implemented` |
| `ca_beijing_beihai_park_poi_gallery` | `real_photo` | `wikimedia -> pexels` | 0 | 0 | `failed` | 0 | `` | `Pexels search not implemented` |
| `ca_beijing_shichahai_poi_gallery` | `hybrid` | `N/A` | `N/A` | `N/A` | `completed` | `N/A` | `mock://image-assets/ca_beijing_shichahai_poi_gallery.hybrid.jpg` | `N/A` |
| `ca_beijing_liangma_river_day_cover` | `hybrid` | `N/A` | `N/A` | `N/A` | `completed` | `N/A` | `mock://image-assets/ca_beijing_liangma_river_day_cover.hybrid.jpg` | `N/A` |

## Real image_asset Output Example

Example output for `ca_beijing_forbidden_city_explore_cover`:

```json
{
  "asset_id": "ca_beijing_forbidden_city",
  "asset_instance_id": "ca_beijing_forbidden_city_explore_cover",
  "image_slot": "explore_cover",
  "source": "real_photo",
  "file_path": "",
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
      },
      {
        "source": "pexels",
        "priority": 2,
        "candidate_count": 0,
        "error": "pexels_live_api_not_implemented"
      }
    ]
  }
}
```

This output confirms:

1. the task entered `real_photo`
2. source routing worked
3. Wikimedia failed first
4. fallback to Pexels did happen
5. Pexels did not reach real search execution
6. no candidate entered validation, ranking, or download

## Failure Classification

### 1. API authentication

Result: **not the current blocker**

Reason:

- `PEXELS_API_KEY` was read successfully
- the adapter did not return `missing_pexels_api_key`

### 2. Search result empty

Result: **not the primary blocker**

Reason:

- the adapter never reached a live Pexels request
- the returned error was `pexels_live_api_not_implemented`, not a successful zero-result API response

### 3. Ranking failure

Result: **not reached**

Reason:

- no Pexels candidates were returned

### 4. Download failure

Result: **not reached**

Reason:

- no candidate survived into the download stage

### 5. Actual first failure point

Result: **Pexels adapter search implementation**

Reason:

- `pexels_adapter.search()` currently returns:
  - `missing_pexels_api_key` when key is absent
  - `pexels_live_api_not_implemented` when key exists

This run took the second branch.

## Saved image_asset Files

The real run produced these output files:

- `C:\Users\10200\Desktop\image-pipeline\image-pipeline\output\manifest_runs\pexels_real_validation\image_manifest\assets\ca_beijing_forbidden_city_explore_cover.image_asset.json`
- `C:\Users\10200\Desktop\image-pipeline\image-pipeline\output\manifest_runs\pexels_real_validation\image_manifest\assets\ca_beijing_jingshan_park_explore_cover.image_asset.json`
- `C:\Users\10200\Desktop\image-pipeline\image-pipeline\output\manifest_runs\pexels_real_validation\image_manifest\assets\ca_beijing_jingshan_park_poi_gallery.image_asset.json`
- `C:\Users\10200\Desktop\image-pipeline\image-pipeline\output\manifest_runs\pexels_real_validation\image_manifest\assets\ca_beijing_beihai_park_explore_cover.image_asset.json`
- `C:\Users\10200\Desktop\image-pipeline\image-pipeline\output\manifest_runs\pexels_real_validation\image_manifest\assets\ca_beijing_beihai_park_poi_gallery.image_asset.json`
- `C:\Users\10200\Desktop\image-pipeline\image-pipeline\output\manifest_runs\pexels_real_validation\image_manifest\assets\ca_beijing_shichahai_poi_gallery.image_asset.json`
- `C:\Users\10200\Desktop\image-pipeline\image-pipeline\output\manifest_runs\pexels_real_validation\image_manifest\assets\ca_beijing_liangma_river_day_cover.image_asset.json`

## Final Conclusion

This real integration validated:

- upstream manifest intake
- task generation
- source routing
- fallback orchestration
- per-asset output persistence

But it did **not** yet validate real Pexels image production, because the first blocking point is:

- `pexels_adapter.search()`

Current status:

- `Image Manifest -> Image Pipeline -> Pexels Adapter` is connected structurally
- `Pexels -> real search result -> candidate ranking -> download -> real image asset` is **not yet completed**
