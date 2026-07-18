# Photo Source Adapter Interface

## Purpose

`photo_source_router` decides **which sources to try**.

Each photo source adapter decides **how to search, validate, rank, and download** within that source.

The executor remains the orchestrator:

- build task context
- request source candidates from router
- call adapters in order
- continue fallback when one source fails
- produce the final `image_asset`

## Contract

Every adapter should expose the same interface:

```js
{
  source: "wikimedia",

  async search(task, context) => {
    return {
      source: "wikimedia",
      candidates: [],
      error: null
    };
  },

  validate(candidate) => {
    return {
      valid: true,
      reasons: []
    };
  },

  rank(candidates, task) => {
    return [];
  },

  async download(candidate, task) => {
    return "path-or-url";
  }
}
```

## Method Responsibilities

### `search(task, context)`

Input:

- `task`
- `context.queries`
- `context.source_candidate`

Output:

```json
{
  "source": "wikimedia",
  "candidates": [],
  "error": null
}
```

Rules:

- Search only inside the current source
- Do not mutate task state
- Do not write manifest
- Return empty candidates when no results are found
- Return `error` when the source fails but do not throw unless the adapter is broken

### `validate(candidate)`

Input:

- one raw candidate

Output:

```json
{
  "valid": true,
  "reasons": []
}
```

Rules:

- Apply source-agnostic quality gates where possible
- Keep output compatible with current validator conventions

### `rank(candidates, task)`

Input:

- validated candidates
- task context

Output:

- ranked candidates with score metadata

Rules:

- Ranking logic may remain shared across adapters
- Adapters should still expose the same method so executor does not special-case sources

### `download(candidate, task)`

Input:

- chosen candidate
- task context

Output:

- local file path or mock path

Rules:

- Download only the chosen asset
- Do not decide the final asset status
- Do not alter source routing behavior

## Current Adapters

### `wikimedia`

- Uses the existing Wikimedia Commons search adapter
- Remains the default real-photo source

### `pexels`

- Added as the second real-photo source candidate
- Uses task metadata first for search intent construction:
  - `location_context`
  - `search_keywords`
  - `visual_subject`
- Falls back to:
  - `asset_name`
  - `prompt`
- Current phase provides:
  - adapter contract
  - fixture-driven search
  - environment variable placeholder via `PEXELS_API_KEY`
- Current phase does not yet perform live Pexels API requests

### `mock_gallery`

- Local-only testing adapter
- Returns candidates from `task.metadata.mock_photo_sources`
- Used to verify fallback and multi-source orchestration without real network calls

## Future Source Targets

This contract is designed to support:

- Wikimedia
- Pexels
- Unsplash
- domestic Chinese stock-photo providers

No change is required to `image_manifest` or upstream protocol when new adapters are added.

## Executor Boundary

Adapters do not replace executor logic.

Executor still owns:

- source ordering
- fallback progression
- task status
- final `image_asset` structure
- failure semantics

This keeps adapter changes isolated from the rest of the pipeline.
