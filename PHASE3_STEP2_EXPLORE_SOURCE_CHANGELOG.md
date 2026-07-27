# Phase 3 Step 2 Explore Source Changelog

## Modified Files

- `lib/projects/session.ts`
- `lib/projects/create-flow-client.ts`
- `lib/explore/flow.ts`
- `lib/explore/project-source-client.ts`
- `tests/create-flow.test.ts`
- `tests/explore-flow.test.ts`

## Explore Integration

- Explore archive actions now create a `TravelProject` when an auth token is available.
- The project source remains database-compatible as `explore_archive`.
- The imported source payload now includes `sourceOrigin: "explore_import"` so downstream logic can distinguish an Explore-origin project import.

## Two Supported Modes

- `AI完善`
  - saves the Explore draft locally
  - creates a project with planning state
  - bootstraps the existing Copilot flow
  - stores `projectId`, `sourceType`, and `flowStage` in project session
  - then continues to the existing `/create` entry

- `直接编辑`
  - creates a project with `workspace_ready`
  - saves the Explore draft and workspace-compatible `TripPlan`
  - stores `projectId`, `sourceType`, and `flowStage` in project session
  - then opens the existing `/workspace` route

## Compatibility Notes

- Explore visual UI was not changed.
- Workspace visual behavior was not changed.
- `TripPlan` structure was not changed.
- `generate-trip` and planner were not changed.
- If there is no auth token, Explore still falls back to the existing local draft behavior.

## Test Coverage

- Explore import creates a project
- Explore source payload is preserved
- AI enhance enters Copilot bootstrap
- Direct edit skips AI flow and goes straight to workspace-compatible state
