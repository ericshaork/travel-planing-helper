# Real Golden Sample Success Report

## 1. Test Input

Manifest file:

- `test/fixtures/upstream_manifest/beijing_couple_image_manifest_v1.json`

Execution command:

```bash
node run_manifest_pipeline.js test\fixtures\upstream_manifest\beijing_couple_image_manifest_v1.json
```

## 2. Pipeline Verification

The real Golden Sample verified the end-to-end production path below:

- `manifest_normalizer`
  - accepted upstream `trip_id / city / images[]`
  - normalized the manifest into internal pipeline shape

- `task builder`
  - created per-asset tasks with `asset_instance_id`
  - avoided output overwrite for repeated `asset_id`

- `source router`
  - routed `real_photo` tasks through ordered source candidates
  - used Wikimedia first, then Pexels fallback where needed

- `Wikimedia adapter`
  - returned real candidates for supported place queries
  - successfully completed the `forbidden_city` case

- `Pexels adapter`
  - returned real fallback candidates
  - successfully took over when Wikimedia returned no usable result

- `ranking`
  - selected the final candidate from returned source candidates
  - preserved selected source and candidate metadata in `image_asset`

- `downloader`
  - produced real local image files
  - wrote final `file_path` into completed `image_asset`

- `image_asset output`
  - wrote completed per-asset output records
  - preserved source, selected candidate, score, file path, and download status

## 3. Real Asset Result

Representative successful results:

| asset | source | status |
|---|---|---|
| `ca_beijing_forbidden_city_explore_cover` | `wikimedia` | `completed` |
| `ca_beijing_jingshan_park_explore_cover` | `pexels` | `completed` |
| `ca_beijing_beihai_park_explore_cover` | `pexels` | `completed` |

Pipeline summary:

- manifest id: `beijing_couple_image_manifest_v1`
- total tasks: `7`
- completed tasks: `7`

Example completed asset outputs:

- `forbidden_city`
  - source: `wikimedia`
  - file: `C:\Users\10200\Desktop\image-pipeline\image-pipeline\assets\external\ca_beijing_forbidden_city.jpg`

- `jingshan_park`
  - source: `pexels`
  - file: `C:\Users\10200\Desktop\image-pipeline\image-pipeline\assets\external\ca_beijing_jingshan_park.jpeg`

- `beihai_park`
  - source: `pexels`
  - file: `C:\Users\10200\Desktop\image-pipeline\image-pipeline\assets\external\ca_beijing_beihai_park.jpeg`

## 4. Fallback Verification

Fallback behavior was verified in the real run:

- Wikimedia succeeded directly for `forbidden_city`
- Wikimedia returned no usable candidate for `jingshan_park`, and Pexels automatically took over
- Wikimedia returned one candidate for `beihai_park`, but that candidate failed validation
- After Wikimedia validation failure, Pexels automatically took over and completed the asset

This confirms:

- source fallback is active
- source fallback is not limited to hard request failure
- fallback also works when the first source returns no valid candidate

## 5. Test Status

Latest local test status:

```text
node --test
49 passed
0 failed
```
