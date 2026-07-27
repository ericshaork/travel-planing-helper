# Phase 5 Step 3: TravelProject Entry Unification

## Scope

This step unified new trip entry paths so they write a consistent TravelProject session shape:

- `projectId`
- `versionId`
- `flowStage`
- `sourceType`

It kept legacy `trip_plans` and local-storage restore flows working as fallback paths.

## Modified Files

- `lib/projects/entry-client.ts`
- `lib/projects/session.ts`
- `lib/explore/project-source-client.ts`
- `app/create/page.tsx`
- `app/plan/page.tsx`
- `components/workspace/WorkspaceRoutePage.tsx`
- `lib/trips/open-flow.ts`
- `tests/create-flow.test.ts`
- `tests/explore-flow.test.ts`
- `tests/my-trips-project.test.ts`
- `tests/project-entry-unification.test.ts`

## Entry Unification Rules

### Unified session source types

- `ai_prompt`
- `explore_import`
- `blank_manual`
- `legacy_import`

These session-level source types now bridge into:

- TravelProject source records
- Workspace session metadata
- Workspace restore context

### Unified entry behavior

- AI create flow stores project session as `ai_prompt`
- Explore direct workspace flow creates a TravelProject version before entering Workspace
- Blank workspace entry creates a TravelProject + current version when auth is available
- My Trips project restore now also restores `sourceType`
- Legacy saved-trip restore remains separate and does not force a TravelProject session

## Compatibility Notes

- Existing `TripPlan`, `trip_plans`, and localStorage flows were preserved
- `/plan` now does a best-effort TravelProject/version write after successful generation
- If Project API/auth is unavailable, legacy Workspace flow still continues
- Existing older session values such as `blank_input` and `explore_archive` are still accepted during parsing for backward compatibility

## Validation

### Targeted tests

Command:

```bash
npm test -- --run tests/create-flow.test.ts tests/explore-flow.test.ts tests/my-trips-project.test.ts tests/project-entry-unification.test.ts
```

Result:

- 4 test files passed
- 15 tests passed

### Build

Command:

```bash
npm run build
```

Result:

- Passed
- Next.js production build completed successfully

## Not Included

- No Workspace UI redesign
- No planner or `generate-trip` core rewrite
- No AI Flow core redesign
- No new map behavior
- No removal of legacy `trip_plans` paths
