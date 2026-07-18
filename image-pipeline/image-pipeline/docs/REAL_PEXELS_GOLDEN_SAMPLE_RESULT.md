# Real Pexels Golden Sample Result

## Scope

This report records the first real Pexels Golden Sample run using:

- input manifest: `test/fixtures/upstream_manifest/beijing_couple_image_manifest_v1.json`
- run date: `2026-07-17`
- command:

```bash
node run_manifest_pipeline.js test\fixtures\upstream_manifest\beijing_couple_image_manifest_v1.json output\manifest_runs\pexels_golden_sample
```

Goal:

Validate the real execution path:

`Image Manifest -> Image Pipeline -> Pexels API -> candidate -> ranking -> download -> image_asset`

## Environment

Before the run, `PEXELS_API_KEY` was confirmed to be present and readable through `load_env()`.

## Output Location

Actual output directory:

- `C:\Users\10200\Desktop\image-pipeline\image-pipeline\output\manifest_runs\pexels_golden_sample\image_manifest`

Generated image asset files:

- `C:\Users\10200\Desktop\image-pipeline\image-pipeline\output\manifest_runs\pexels_golden_sample\image_manifest\assets\ca_beijing_forbidden_city_explore_cover.image_asset.json`
- `C:\Users\10200\Desktop\image-pipeline\image-pipeline\output\manifest_runs\pexels_golden_sample\image_manifest\assets\ca_beijing_jingshan_park_explore_cover.image_asset.json`
- `C:\Users\10200\Desktop\image-pipeline\image-pipeline\output\manifest_runs\pexels_golden_sample\image_manifest\assets\ca_beijing_jingshan_park_poi_gallery.image_asset.json`
- `C:\Users\10200\Desktop\image-pipeline\image-pipeline\output\manifest_runs\pexels_golden_sample\image_manifest\assets\ca_beijing_beihai_park_explore_cover.image_asset.json`
- `C:\Users\10200\Desktop\image-pipeline\image-pipeline\output\manifest_runs\pexels_golden_sample\image_manifest\assets\ca_beijing_beihai_park_poi_gallery.image_asset.json`
- `C:\Users\10200\Desktop\image-pipeline\image-pipeline\output\manifest_runs\pexels_golden_sample\image_manifest\assets\ca_beijing_shichahai_poi_gallery.image_asset.json`
- `C:\Users\10200\Desktop\image-pipeline\image-pipeline\output\manifest_runs\pexels_golden_sample\image_manifest\assets\ca_beijing_liangma_river_day_cover.image_asset.json`

Note:

The CLI wrapper still outputs under `image_manifest/` rather than `beijing_couple_image_manifest_v1/`. This did not affect source execution.

## Overall Result

- total tasks: `7`
- completed tasks: `2`
- failed tasks: `5`
- completed tasks were both `hybrid` placeholders
- real downloaded photo assets: `0`

Conclusion:

The Golden Sample did not yet reach the `candidate -> ranking -> download` part of the Pexels real-photo chain.

## Asset-Level Result

| asset_instance_id | query keywords used | Pexels returned count | final selected image | rank_score | download result | final status |
| --- | --- | ---: | --- | ---: | --- | --- |
| `ca_beijing_forbidden_city_explore_cover` | manifest metadata `asset_name` first, then `prompt` fallback. In this run the upstream `asset_name` value was garbled text (`鏁呭鍗氱墿闄?`) | 0 | none | 0 | none | failed |
| `ca_beijing_jingshan_park_explore_cover` | manifest metadata `asset_name` first, then `prompt` fallback. First keyword value was garbled upstream text (`鏅北鍏洯`) | 0 | none | 0 | none | failed |
| `ca_beijing_jingshan_park_poi_gallery` | manifest metadata `asset_name` first, then `prompt` fallback. First keyword value was garbled upstream text (`鏅北鍏洯`) | 0 | none | 0 | none | failed |
| `ca_beijing_beihai_park_explore_cover` | manifest metadata `asset_name` first, then `prompt` fallback. First keyword value was garbled upstream text (`鍖楁捣鍏洯`) | 0 | none | 0 | none | failed |
| `ca_beijing_beihai_park_poi_gallery` | manifest metadata `asset_name` first, then `prompt` fallback. First keyword value was garbled upstream text (`鍖楁捣鍏洯`) | 0 | none | 0 | none | failed |
| `ca_beijing_shichahai_poi_gallery` | N/A (`hybrid` placeholder) | N/A | placeholder only | N/A | `mock://image-assets/ca_beijing_shichahai_poi_gallery.hybrid.jpg` | completed |
| `ca_beijing_liangma_river_day_cover` | N/A (`hybrid` placeholder) | N/A | placeholder only | N/A | `mock://image-assets/ca_beijing_liangma_river_day_cover.hybrid.jpg` | completed |

## Source Execution Detail

For every `real_photo` asset, source routing was:

1. `wikimedia`
2. `pexels`

Observed `source_runs` for all five `real_photo` tasks:

```json
[
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
    "error": "AggregateError"
  }
]
```

This means:

- Wikimedia failed first
- fallback to Pexels did happen
- Pexels also failed before any candidate was returned

## Pipeline Stage Outcome

### Image Manifest -> Image Pipeline

Status: pass

Reason:

- manifest was read
- tasks were built
- per-asset output files were created

### Image Pipeline -> Pexels API

Status: attempted, but failed

Reason:

- `pexels` source run exists in every failed `real_photo` asset
- returned error was `AggregateError`

### Pexels API -> candidate

Status: failed

Reason:

- candidate count stayed `0` for every `real_photo` task

### candidate -> ranking

Status: not reached

Reason:

- no Pexels candidates were returned

### ranking -> download

Status: not reached

Reason:

- no ranked candidate existed

## Most Likely Real Blocking Point

For this Golden Sample run, the first real blocking point is:

- network/API access during Pexels search

Why:

- the adapter no longer reports `missing_pexels_api_key`
- the adapter no longer reports `pexels_live_api_not_implemented`
- instead, real source execution reports `AggregateError`
- candidate count remains `0`

So this run got further than the previous one, but still stopped inside the real search request path.

## Final image_asset Example

Example for `ca_beijing_forbidden_city_explore_cover`:

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
        "error": "AggregateError"
      }
    ]
  }
}
```

## Manual Image Quality Review Suggestions

Once Pexels starts returning real candidates, manual review should focus on:

1. Check landmark identity:
   - Is the selected image clearly the intended Beijing location, not a generic palace/park/street image?

2. Check editorial usefulness:
   - Does the image work as a card or gallery image with clean composition and readable focal subject?

3. Check crowd density:
   - Reject images dominated by dense tourists, selfie framing, or noisy foreground clutter.

4. Check time-of-day mismatch:
   - Avoid night images for tasks whose content intent is clearly daytime documentary coverage.

5. Check aspect and crop safety:
   - Verify the chosen landscape image still works after Explore card cropping.

6. Check brand compatibility:
   - For Wanderly, prefer calm, location-forward, documentary images over highly commercial or over-edited travel marketing photos.

7. Check duplicate reuse risk:
   - For assets like `explore_cover` and `poi_gallery` on the same POI, confirm the selected candidates are not visually redundant if both later succeed.

## Final Conclusion

This first real Pexels Golden Sample validated:

- real manifest intake
- real task generation
- real router fallback to Pexels
- real per-asset output persistence

But it did **not** yet validate:

- successful Pexels candidate retrieval
- ranking on real Pexels results
- real image download
- completed `image_asset` for `real_photo`

Current status:

`Image Manifest -> Image Pipeline -> Pexels` is connected, but the Golden Sample is still blocked at the real search stage.
