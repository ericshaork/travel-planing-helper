# Phase 4 Step 1: Workspace Project Version Integration

## Modified files

- `components/workspace/WorkspaceRoutePage.tsx`
- `hooks/useTripSave.ts`

## Added files

- `lib/projects/workspace-context-client.ts`
- `tests/workspace-project-context.test.ts`

## Workspace loading changes

- Workspace now first checks whether a `TravelProject` session exists.
- If `projectId` and auth are available, it restores the active project version through the existing Project APIs.
- The restored `TripPlan` and `TripRequest` are written back into the current local Workspace storage contract so existing editor behavior keeps working.
- If no project context is available, Workspace falls back to the old localStorage-based flow.

## Project Version integration

- `projectId`, `versionId`, and `flowStage` are now actively used during Workspace restoration.
- If the stored `versionId` differs from the project `currentVersion`, Workspace loads the explicit version detail.

## Compatibility strategy

- No Workspace UI changes
- No new Trip model
- No version list UI
- Existing local `TripPlan` persistence remains the editor’s working source
- Workspace saves now also touch the existing project/version session context so that version identity is preserved across edits
