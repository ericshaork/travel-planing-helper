# Wanderly v1.9.5 Legacy Boundary

## 1. Purpose

This document defines which legacy flows still exist after the v1.9 Project / Version migration, why they are kept, and what future work must not depend on them.

v1.9 primary model:

```text
TravelProject
  -> TravelProjectVersion
  -> Workspace / Revision / My Trips
```

Legacy model:

```text
TripRequest / TripPlan
  -> localStorage draft
  -> trip_plans
```

The legacy model is now a compatibility and recovery layer. It must not become the default persistence path for new v1.9 features.

## 2. Current Boundary Summary

| Area | Current Role | Keep / Deprecate | Rule |
|---|---|---|---|
| `TravelProject` | Project identity and lifecycle | Keep as primary | All new travel entries should create or reuse a project. |
| `TravelProjectVersion` | Accepted trip snapshots and version history | Keep as primary | AI generation, AI adjustment, import, Explore, and manual version save should create versions. |
| `TripPlan` | Workspace render contract | Keep | Do not replace it with a second render model. Store snapshots inside versions. |
| `localStorage` trip state | Browser draft, handoff, and fallback | Keep as compatibility | Do not treat it as long-term source of truth. |
| `trip_plans` | Legacy saved trips | Keep for migration compatibility | Do not use as the default save target when project/version context exists. |
| `/plan` | Classic form continuation and compatibility route | Keep temporarily | Do not promote as the main Create entry. |
| `/result` | Workspace compatibility alias | Keep temporarily | Do not add new behavior here; route users through `/workspace`. |
| `/api/generate-trip` | Shared generation engine | Keep | This is not legacy. Proposal, import, and classic flows may continue to reuse it. |

## 3. Primary Paths

### AI Create

```text
/create?source=ai
  -> submitCreateFlow()
  -> TravelProject
  -> Copilot / Proposal
  -> generate proposal
  -> TravelProjectVersion
  -> /workspace
```

Expected persistence:

- Project source type: `blank_input`
- Session source type: `ai_prompt`
- Version reason: `ai_generate`
- Workspace opens from `projectId + versionId`

### Explore Archive

```text
Explore archive
  -> TripPlanDraft bridge
  -> TravelProject
  -> TravelProjectVersion
  -> choice dialog
  -> Workspace or Revision
```

Expected persistence:

- Project source type: `explore_archive`
- Session source type: `explore_import`
- Version reason: `template_import`
- `tripPlanSeed` is a bridge object only. It should not become a second plan model.

### File Import MVP

```text
/create?source=file
  -> md/txt structured import
  -> TripRequest
  -> generate TripPlan
  -> TravelProject
  -> TravelProjectVersion
  -> choice dialog
  -> Workspace or Revision
```

Expected persistence:

- Project source type: `uploaded_file`
- Version reason: `import_transform`
- Source payload stores raw text, file metadata, and parsed request.

### Revision

```text
/create?source=revision&projectId=...&versionId=...
  -> load selected TravelProjectVersion
  -> revision-chat
  -> workspace-ai
  -> TravelProjectVersion V(n+1)
  -> Workspace handoff using selected version
```

Expected persistence:

- AI suggestions do not overwrite existing versions.
- Applying a suggestion creates a new version.
- Workspace handoff must use the selected version, not always `current_version_id`.

### Workspace Manual Save

```text
Workspace with project/version context
  -> local edits
  -> save as new version
  -> TravelProjectVersion created_from = manual_edit
```

Current rule:

- Auto-save and local edit state may use `localStorage`.
- Explicit "save version" must create a new project version when project/version context exists.
- If project/version context is missing, legacy cloud save may write to `trip_plans`.

## 4. Legacy Layers That Must Stay for Now

### Browser Storage

Important keys are defined in `lib/trip/storage.ts`.

Keep for:

- Create draft restoration.
- Workspace handoff from generation, Explore, file import, My Trips, and Revision.
- Anonymous or degraded flows where project restore is not available.
- Local edit protection before the user explicitly saves a new version.

Do not use for:

- Long-term project identity.
- Version history.
- AI conversation history.
- New source records.

### `trip_plans`

Current access points:

- `app/api/trips/route.ts`
- `app/api/trips/[tripId]/route.ts`
- `lib/trips/*`
- `components/trips/SaveCurrentTripButton.tsx`

Keep for:

- Existing saved trips.
- My Trips legacy list items.
- Legacy open / update / delete.
- No-project fallback save.

Do not use for:

- New AI Create default persistence.
- Explore archive imports.
- File import MVP.
- Revision-generated versions.
- Workspace AI-generated versions.

### `/plan`

Current role:

- Classic form continuation route.
- Reads old draft/session storage.
- Generates via `/api/generate-trip`.
- Attempts to create a Project / Version through `ensureWorkspaceProjectEntry()`.

Keep for:

- Old draft/session recovery.
- Compatibility with old links.

Do not use for:

- Main Create navigation.
- New AI Copilot product work.
- New import or Explore flows.

### `/result`

Current role:

- Compatibility alias that renders `WorkspaceRoutePage`.

Keep for:

- Old links and old saved login redirects.

Do not use for:

- New post-generation navigation.
- New feature branching.

## 5. Known Boundary Risks

### P1: Legacy Save Can Still Write `trip_plans`

`SaveCurrentTripButton` writes through `persistCurrentTrip()` into `trip_plans`. `SaveStatus` should only render it when no project/version context exists.

Required guard:

- New Project/Version workspaces should render `WorkspaceVersionSaveButton`.
- Tests should assert that project-context workspaces do not call legacy cloud save.

### P1: `/plan` Can Still Generate from Old Drafts

This is acceptable for compatibility, but it should not be advertised as the default route.

Required guard:

- Landing and `/create` should prefer `/create?source=ai`.
- New features should not add behavior to `/plan`.

### P1: Workspace Metadata Source Is Less Expressive Than Project Source

`WorkspaceSessionSourceType` does not fully represent file import source types. `uploaded_file` and `import_text` may degrade to generic workspace metadata even when project session is accurate.

Required guard:

- Use Project session/source for source-sensitive features.
- Treat workspace metadata as display/fallback only.

### P1: Explore Client Logging and Encoding Cleanup

The Explore Project client no longer logs source payloads or raw API responses. Its fallback errors and the Explore Workspace draft fallback copy are readable Chinese.

Remaining guard:

- Continue the encoding sweep in other modules before declaring the whole application free of mojibake.
- Keep Project / Version creation behavior unchanged while cleaning user-facing copy.

### P2: Old Components Need Dead-Code Review

Potential compatibility-only components:

- `components/trip/NaturalLanguageInput.tsx`
- `components/trip/CreateCopilotPanel.tsx`
- `components/trip/CreateModeSelector.tsx`

Required guard:

- Confirm runtime references before removal.
- Keep tests updated if these components remain as compatibility shells.

## 6. Rules for Future Work

### Must Do

- Create `TravelProject` for every new travel source.
- Create `TravelProjectVersion` for every accepted plan snapshot.
- Store `TripPlan` as the Workspace render snapshot inside versions.
- Use `projectId + versionId` for Workspace and Revision handoff.
- Keep localStorage writes as recovery/fallback only.

### Must Not Do

- Do not create new long-term state only in localStorage.
- Do not add new fields to `trip_plans` for v1.9+ Project features.
- Do not make `/plan` the default Create experience again.
- Do not introduce another trip render model beside `TripPlan`.
- Do not overwrite existing versions when applying AI or manual changes.

## 7. Removal Conditions

### `trip_plans` Can Be Retired When

- All legacy rows have a migration or export path.
- My Trips can show migrated projects only.
- No active route depends on `app/api/trips/[tripId]`.
- `SaveCurrentTripButton` has no runtime usage outside an explicit legacy mode.

### `/plan` Can Be Retired When

- No public navigation points to it.
- Old draft recovery has a replacement inside `/create`.
- Saved login redirects no longer rely on `/plan`.

### `/result` Can Be Retired When

- Old shared links and login redirects are no longer expected.
- `/workspace` fully handles all read-mode entry cases.

## 8. Step 3B Test Targets

Recommended next tests:

- Project-context Workspace renders `WorkspaceVersionSaveButton`, not `SaveCurrentTripButton`.
- No-project Workspace still renders legacy save and can write `trip_plans`.
- My Trips returns both project items and legacy trip items.
- Opening a project item writes `projectId + versionId` and navigates to `/workspace`.
- Opening a legacy item restores local trip state without creating a Project.
- `/plan` generation creates Project/Version when auth is available, but still falls back safely when unavailable.
