# Phase 4 Step 2: TravelProject Version Management

## Modified files

- `lib/projects/schema.ts`
- `lib/projects/service.ts`

## Added files

- `lib/projects/version/version-types.ts`
- `lib/projects/version/version-service.ts`
- `tests/project-version.test.ts`

## Version capability changes

- Added a dedicated project version service layer for:
  - `createVersion`
  - `listVersions`
  - `getVersion`
  - `getCurrentVersion`
  - `setCurrentVersion`
- Version creation continues to reuse the existing `travel_project_versions` storage and preserves automatic `version_number` increments.
- Current version switching now updates `travel_projects.current_version_id` through the service layer.

## Version lifecycle mapping

- UI-facing managed statuses are:
  - `proposed`
  - `active`
  - `archived`
- They map onto the current persisted statuses without requiring a schema change:
  - `proposed -> proposed`
  - `active -> accepted`
  - `archived -> draft`

## Compatibility strategy

- No Workspace UI change
- No TripPlan schema change
- No planner / generate-trip change
- No project context still means old local Workspace fallback continues to work
- Explicit `versionId` context remains usable by Workspace restore logic
