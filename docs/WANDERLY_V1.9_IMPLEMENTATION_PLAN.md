# Wanderly v1.9 Implementation Plan

Date: 2026-07-22  
Audience: engineering + product + implementation planning  
Input baseline: `WANDERLY_AI_FLOW_V2_ARCHITECTURE_V4.md`  
Constraint: implementation plan only, no code changes, no UI design expansion

## 1. Planning Baseline

This plan translates the v2 architecture into the minimum viable v1.9 engineering path.

The implementation baseline is:

- keep `TravelProject` as the new identity layer
- keep `TripPlan` as the Workspace render contract
- reuse the current Workspace editor and result rendering as much as possible
- keep `/create`, `/plan`, `/workspace`, and `/result` usable during migration
- avoid building a parallel second planner beside the current `TripRequest -> TripPlan` chain

Recommended v1.9 delivery chain:

```text
source
  -> TravelProject
  -> source review
  -> clarifying
  -> proposal
  -> accepted version
  -> project-aware workspace
  -> My Trips project list
```

## 2. Current Code Audit

### 2.1 Current End-To-End Flows

#### Current AI generation flow

```text
/create
  -> components/trip/NaturalLanguageInput.tsx
  -> /api/parse-trip
  -> localStorage parsed draft
  -> /plan
  -> normalize TripRequestDraft
  -> /api/generate-trip
  -> localStorage tripRequest + tripPlan
  -> /workspace
```

#### Current Explore flow

```text
/explore or /explore/[id]
  -> lib/explore/archive-reader.ts
  -> lib/explore/to-trip-draft.ts
  -> lib/explore/flow.ts
  -> either /create?entry=explore
  -> or save draft directly into local workspace state
  -> /workspace
```

#### Current Workspace flow

```text
/workspace
  -> components/workspace/WorkspaceRoutePage.tsx
  -> load tripPlan from localStorage
  -> hooks/useTripWorkspaceState.ts
  -> local in-browser editing
  -> save current trip to Supabase trip_plans only when user clicks save
```

#### Current My Trips flow

```text
/trips
  -> /api/trips
  -> public.trip_plans list
  -> /api/trips/[tripId]
  -> restore trip into localStorage
  -> /workspace
```

### 2.2 Current App Structure

Current route shell is already close to the target product split:

- `app/create/page.tsx`
- `app/plan/page.tsx`
- `app/workspace/page.tsx`
- `app/result/page.tsx`
- `app/trips/page.tsx`
- `app/explore/page.tsx`
- `app/explore/[id]/page.tsx`
- `app/settings/page.tsx`

Current API surface is also reusable:

- `app/api/parse-trip/route.ts`
- `app/api/generate-trip/route.ts`
- `app/api/enrich-trip/route.ts`
- `app/api/explore/*`
- `app/api/trips/*`
- `app/api/user-settings/route.ts`

### 2.3 Current Data And Model Baseline

Current durable data model:

- `public.trip_plans`
- `public.user_settings`
- `public.explore_trip_contents`

Current front-end planning contract:

- `lib/trip/types.ts`
- `lib/trip/schema.ts`
- `TripRequestDraft`
- `TripRequest`
- `TripPlan`
- `GenerateTripResponse`

Current project identity is not durable.  
Today identity is split across:

- localStorage draft keys in `lib/trip/storage.ts`
- optional `trip_plans.id`
- current workspace session metadata

### 2.4 What Can Be Reused

#### Reuse as-is or near as-is

| Area | Reusable now | Why |
| --- | --- | --- |
| Trip render contract | `lib/trip/types.ts`, `lib/trip/schema.ts` | `TripPlan` is already the correct Workspace contract |
| AI generation core | `app/api/generate-trip/route.ts`, `lib/trip/planner.ts`, `lib/ai/generateTrip.ts`, `lib/ai/prompts.ts` | existing generation path already produces validated `TripPlan` |
| Parse flow core | `app/api/parse-trip/route.ts`, `lib/ai/parseTrip.ts` | still useful for blank-input source understanding |
| Explore normalization | `lib/explore/archive-reader.ts`, `lib/explore/to-trip-draft.ts`, `lib/explore/flow.ts` | already converts Explore content into structured travel seeds |
| Workspace renderer/editor | `components/workspace/*`, `hooks/useTripWorkspaceState.ts`, `hooks/useTripSave.ts` | this is the most expensive UI logic and should be wrapped, not rebuilt |
| Settings and AI preference storage | `app/api/user-settings/route.ts`, `lib/settings/*`, `supabase/migrations/005_user_settings.sql` | already supports user-level AI preferences and workspace defaults |

### 2.5 What Needs Refactor

#### Refactor required

| Area | Current issue | Why it must change |
| --- | --- | --- |
| Create and Plan | `/create` and `/plan` are local draft driven | v1.9 needs project-aware AI flow state |
| Workspace loader | `/workspace` only restores from localStorage | v1.9 needs `/workspace/[projectId]` and version loading |
| My Trips | lists `trip_plans` rows | v1.9 must list `TravelProject` |
| Save/update flow | `lib/trips/save-flow.ts` persists single mutable saved trip | v1.9 needs immutable accepted versions |
| Storage model | `lib/trip/storage.ts` is canonical today | v1.9 needs server-backed project identity, local storage only as session cache |
| Explore create branching | current Explore detail has only partial branch logic | v1.9 needs AI improve / direct edit / replan as explicit source behaviors |

### 2.6 What Must Be Added

#### New modules required

| Area | New addition | Why |
| --- | --- | --- |
| Core data model | `travel_projects`, `travel_project_versions`, `travel_project_sources`, `travel_project_messages` | foundational project architecture |
| Project APIs | `/api/projects/*` | app needs a project-aware backend surface |
| Project-aware workspace route | `/workspace/[projectId]` | canonical ownership route |
| Project-aware My Trips list | project list query and open behavior | support planning, editing, abandoned, archived states |
| AI flow state machine | source review, proposal, abandoned handling | architecture requires co-creation flow, not form-only generation |
| Import text source | text/Markdown/TXT input path | v1.9 source coverage requirement |

## 3. What Already Exists

The v1.9 plan should explicitly build on these existing flows instead of replacing them:

- `TripPlan` is already the single render contract for result and workspace
- `TripRequest` normalization already exists in `lib/trip/normalize.ts`
- the generator already handles first-generation and regeneration in the same API
- Explore already knows how to emit draft seeds for create and workspace paths
- Workspace already supports manual editing, quick modifications, AI-assisted regeneration, export, and save
- user settings already exist and already carry AI preference state

Opinionated recommendation:

```text
Do not rebuild the planner, result renderer, or Workspace editor.
Replace the identity, persistence, routing, and flow orchestration around them.
```

## 4. NOT In Scope For v1.9

- PDF parsing
- DOCX parsing
- image OCR
- full version diff UI
- rich version comparison
- advanced Workspace Copilot automation
- POI knowledge graph
- automatic route optimization engine
- collaborative editing
- booking, hotel, or ticket integrations
- full visual redesign implementation

Rationale:

v1.9 should land the new project backbone first.  
Everything above becomes safer after identity, versioning, and flow state are stable.

## 5. Target v1.9 Architecture

```text
Explore
  -> source layer

TravelProject
  -> durable identity
  -> lifecycle state
  -> current AI flow stage
  -> source records
  -> lightweight messages
  -> accepted versions

Workspace
  -> loads current TravelProjectVersion.trip_plan_json
  -> edits locally
  -> creates version checkpoints on accepted save
```

Target route direction for v1.9:

```text
/create
  -> public entry shell, still retained

/plan
  -> compatibility shell for project-aware copilot flow

/workspace/[projectId]
  -> canonical workspace route for new flows

/workspace
  -> compatibility loader

/result
  -> compatibility loader only

/trips
  -> TravelProject list
```

## 6. Phase Overview

```text
Phase 0  -> prepare types, compatibility, migration hooks
Phase 1  -> land TravelProject data model
Phase 2  -> refactor AI flow to project-aware copilot flow
Phase 3  -> unify blank / Explore / import entry paths
Phase 4  -> bind Workspace to TravelProject + versions
Phase 5  -> upgrade My Trips to TravelProject
Phase 6  -> hand off visual layer once architecture is stable
```

## 7. Phase 0: Foundation Preparation

### Goal

Prepare the codebase so project-backed state can be introduced without breaking existing `/create -> /plan -> /workspace` flows.

### Scope

- introduce shared `TravelProject` TypeScript types
- define compatibility adapters between legacy `trip_plans` and new project models
- extend session metadata so the browser can remember `projectId` and `versionId`
- keep legacy pages operational while new data model lands

### Modify Files

- `lib/trip/storage.ts`
- `lib/trip/types.ts`
- `lib/supabase/types.ts`
- `lib/trips/types.ts`
- `app/create/page.tsx`
- `app/plan/page.tsx`
- `app/workspace/page.tsx`
- new `lib/projects/types.ts`
- new `lib/projects/compat.ts`
- new `lib/projects/session.ts`

### Data Changes

- no production table creation yet
- add front-end compatibility types for:
  - `TravelProject`
  - `TravelProjectVersion`
  - `TravelProjectSource`
  - `TravelProjectMessage`
- extend local workspace session metadata shape to optionally carry:
  - `projectId`
  - `versionId`
  - `flowStage`

### Migration Strategy

- do not remove legacy localStorage keys
- do not remove `trip_plans` usage yet
- add project-aware metadata in backward-compatible optional form

### Risks

- local session metadata drift if old keys and new keys disagree
- accidental reliance on project fields before server schema exists

### Acceptance Criteria

- old `/create`, `/plan`, `/workspace`, and `/trips` still function
- new shared types compile without changing render behavior
- browser session metadata can carry project references without breaking legacy drafts

## 8. Phase 1: TravelProject Data Foundation

### Goal

Introduce the durable project model in Supabase and make it possible to represent a trip as a versioned project instead of a single mutable saved plan.

### Scope

Create the v1.9 core tables:

- `travel_projects`
- `travel_project_versions`
- `travel_project_sources`
- `travel_project_messages` light

### Recommended Schema Shape

#### `travel_projects`

Recommended fields:

- `id`
- `user_id`
- `title`
- `destination_city`
- `start_date`
- `end_date`
- `days`
- `lifecycle_state`
- `current_flow_stage`
- `current_version_id`
- `last_activity_at`
- `created_at`
- `updated_at`

#### `travel_project_versions`

Recommended fields:

- `id`
- `project_id`
- `version_number`
- `trip_request_json`
- `trip_plan_json`
- `enrichment_json`
- `weather_summary_json`
- `created_from` or `version_reason`
- `created_at`

#### `travel_project_sources`

Recommended fields:

- `id`
- `project_id`
- `source_type`
- `source_ref_id`
- `source_ref_slug`
- `raw_text`
- `source_payload_json`
- `parsed_trip_request_draft_json`
- `created_at`

#### `travel_project_messages`

Recommended light fields for v1.9:

- `id`
- `project_id`
- `role`
- `content`
- `created_at`

### Source Type Values

- `blank_input`
- `explore_archive`
- `import_text`
- `uploaded_file`
- `existing_trip`

### Flow Stage Values

- `source_received`
- `source_review`
- `clarifying`
- `proposal_ready`
- `proposal_adjusting`
- `generating`
- `workspace_ready`
- `abandoned`

### Lifecycle Values

- `NEW`
- `EXPLORING`
- `PLANNING`
- `PROPOSED`
- `GENERATING`
- `WORKSPACE`
- `EDITING`
- `ARCHIVED`

### Modify Files

- new `supabase/migrations/007_travel_projects_core.sql`
- `lib/supabase/types.ts`
- new `lib/projects/server.ts`
- new `lib/projects/repository.ts`
- new `lib/projects/list-format.ts`
- new `app/api/projects/route.ts`
- new `app/api/projects/[projectId]/route.ts`
- new `app/api/projects/[projectId]/versions/route.ts`
- new `app/api/projects/[projectId]/messages/route.ts`

### Data Changes

- add four new project tables
- add RLS policies matching current `trip_plans` and `user_settings`
- reserve version source field now even if only a minimal subset is used in v1.9

### Legacy Data Compatibility

Recommended compatibility strategy:

```text
existing trip_plans row
  -> backfill one TravelProject
  -> backfill one accepted TravelProjectVersion
  -> backfill one TravelProjectSource
```

Recommended mapping:

- `trip_plans.title` -> `travel_projects.title`
- `trip_plans.destination_city` -> `travel_projects.destination_city`
- `trip_plans.status` -> mapped lifecycle seed
- `trip_plans.trip_request_json` -> `travel_project_versions.trip_request_json`
- `trip_plans.trip_plan_json` -> `travel_project_versions.trip_plan_json`
- `trip_plans.source_type` -> `travel_project_sources.source_type`

Recommended migration implementation:

- add an idempotent backfill script or admin task
- keep `trip_plans` table untouched during v1.9 rollout
- stop treating `trip_plans` as the canonical model after backfill succeeds

### Risks

- backfill mapping may lose lifecycle nuance because legacy `trip_plans` only knows `draft/saved/archived`
- duplicate visibility if both legacy and project rows are queried at the same time
- cyclic dependency risk around `current_version_id`

### Acceptance Criteria

- new tables exist with indexes and RLS
- one legacy `trip_plans` record can be deterministically represented as one `TravelProject`
- new project rows can be created, loaded, versioned, and messaged through API

## 9. Phase 2: AI Flow Refactor

### Goal

Replace the current local form-first planner flow with a project-aware copilot flow while still reusing the current parse and generate capabilities.

### Scope

Implement the v1.9 AI flow state machine:

```text
source_received
  -> source_review
  -> clarifying
  -> proposal_ready
  -> proposal_adjusting
  -> generating
  -> workspace_ready
```

With recovery:

```text
planning/proposed
  -> abandoned
  -> resume back into flow
```

### Recommended Implementation Strategy

Use one project-scoped copilot service instead of many unrelated endpoints.

Recommended API shape:

```text
POST /api/projects/[projectId]/copilot
  action:
    - review_source
    - clarify
    - propose
    - generate
    - abandon
    - resume
```

This keeps:

- message append
- project state mutation
- proposal generation
- accepted version creation

inside one project-aware orchestration layer.

### Modify Files

- `app/create/page.tsx`
- `app/plan/page.tsx`
- `components/trip/NaturalLanguageInput.tsx`
- `components/trip/StepQuestionForm.tsx`
- `lib/ai/prompts.ts`
- `lib/ai/parseTrip.ts`
- `lib/trip/normalize.ts`
- new `lib/projects/flow-machine.ts`
- new `lib/projects/copilot.ts`
- new `lib/projects/proposal-schema.ts`
- new `app/api/projects/[projectId]/copilot/route.ts`

### Data Changes

- append user/assistant messages into `travel_project_messages`
- update `travel_projects.current_flow_stage`
- update `travel_projects.lifecycle_state`
- create first accepted version only at `generating -> workspace_ready`

### State Management Change

Current state source:

- localStorage draft keys

Target v1.9 state source:

- server-backed `TravelProject`
- local storage only as resume/session cache

### Risks

- proposal stage is new and has no direct equivalent in current implementation
- if project state and local cache drift, the user may resume from the wrong step
- `abandoned` handling can become noisy if inactivity logic is too aggressive

### Acceptance Criteria

- a blank-input project can be created without relying on local parsed session as the canonical source
- source review can run and persist project flow state
- clarification answers can be stored as lightweight messages
- proposal can be shown before full trip generation
- accepted generation creates a `TravelProjectVersion` and moves the project to `WORKSPACE`

## 10. Phase 3: Entry Consolidation

### Goal

Unify the three project creation sources under one TravelProject creation model:

- blank input
- Explore archive
- import text

### Scope

Support three creation behaviors:

- AI improve
- direct edit
- AI replan

### Recommended Route Strategy

Keep public entry stable:

```text
/create
  -> remains the main entry
```

Recommended v1.9 migration:

- keep `/create` as the public shell
- keep `/plan` as a compatibility shell
- avoid adding a fully separate public copilot surface unless needed later
- add import surface inside `/create` first
- reserve `/import` for later if the create shell becomes too crowded

### Explore Path Changes

Current Explore detail supports:

- create from archive
- direct workspace import

v1.9 needs explicit branching:

- AI improve
- direct edit
- AI replan

### Import Scope

v1.9 import only supports:

- text paste
- Markdown
- TXT

### Modify Files

- `app/create/page.tsx`
- `app/plan/page.tsx`
- `components/explore/CreateMyVersion.tsx`
- `lib/explore/flow.ts`
- `lib/explore/to-trip-draft.ts`
- `lib/explore/archive-reader.ts`
- `lib/trip/storage.ts`
- new `components/trip/ImportTextPanel.tsx`
- new `lib/projects/source-adapters.ts`

### Data Changes

- create `travel_project_sources` rows for each source path
- populate `source_type`
- persist source payload for source review and analytics

### Migration Of Existing `/create` And `/plan`

Recommended behavior:

```text
/create
  -> creates project-aware entries for all new flows

/plan
  -> if projectId exists, load project-aware copilot state
  -> else, rescue legacy local draft and convert it into a TravelProject
```

### Risks

- source adapters can diverge if blank input, Explore, and import each use different normalization logic
- direct edit path can bypass project creation if not enforced centrally
- import text quality may produce noisy source review output

### Acceptance Criteria

- blank input creates a project and enters AI flow
- Explore archive can branch into:
  - AI improve
  - direct edit
  - AI replan
- import text can create a project and enter source review
- `/create` and `/plan` still work for legacy drafts during transition

## 11. Phase 4: Workspace Projectization

### Goal

Bind Workspace to `TravelProject` and `TravelProjectVersion` without rebuilding the current editor.

### Scope

- add `/workspace/[projectId]`
- load current version from `TravelProject.current_version_id`
- keep local in-browser editing responsiveness
- create accepted version checkpoints through project APIs
- reserve the v1.9 `Ask Wanderly` AI entry

### Recommended Implementation Strategy

Keep the editor local-first, server-checkpoint-second:

```text
load current TravelProjectVersion
  -> hydrate TripWorkspace
  -> edit locally with existing hooks
  -> save accepted checkpoint explicitly
  -> create new TravelProjectVersion
  -> update TravelProject.current_version_id
```

This avoids rewriting the editor internals.

### Modify Files

- new `app/workspace/[projectId]/page.tsx`
- `app/workspace/page.tsx`
- `app/result/page.tsx`
- `components/workspace/WorkspaceRoutePage.tsx`
- `components/workspace/TripWorkspace.tsx`
- `components/workspace/WorkspaceTopBar.tsx`
- `components/workspace/ModificationPanel.tsx`
- `components/trips/SaveCurrentTripButton.tsx`
- `hooks/useTripSave.ts`
- `hooks/useTripWorkspaceState.ts`
- `lib/trips/save-flow.ts`
- new `lib/projects/version-client.ts`
- new `lib/projects/workspace-loader.ts`

### Data Changes

- save button no longer treats `trip_plans` as canonical
- accepted saves create new `travel_project_versions`
- current project row updates:
  - `current_version_id`
  - `lifecycle_state`
  - `last_activity_at`

### Workspace AI Entry Boundary

v1.9 should reserve:

- one fixed `Ask Wanderly` project-level entry
- access to:
  - current project
  - current accepted version
  - lightweight message history

v1.9 should not implement:

- autonomous complex plan rewrites
- advanced route optimization
- POI intelligence engine

### Risks

- local edits can diverge from the latest accepted version if save semantics are unclear
- version count can grow too quickly if every save action is treated as a version
- compatibility loader may reopen legacy local state instead of project state if precedence is wrong

### Acceptance Criteria

- `/workspace/[projectId]` opens a project-backed workspace
- `TripWorkspace` still renders the existing `TripPlan` contract
- explicit accepted saves create new immutable versions
- existing AI modification entry can open with project context
- `/workspace` still works as a compatibility loader

## 12. Phase 5: My Trips Upgrade

### Goal

Convert My Trips from a `trip_plans` archive into a `TravelProject` management entry.

### Scope

My Trips should list:

- project title
- lifecycle state
- current version
- last activity
- source type

### Recommended Open Behavior

```text
PLANNING / PROPOSED / abandoned
  -> resume copilot flow

WORKSPACE / EDITING
  -> open /workspace/[projectId]

ARCHIVED
  -> open archived project detail or workspace read mode
```

### Modify Files

- `app/trips/page.tsx`
- `components/trips/SavedTripsList.tsx`
- `components/trips/SavedTripCard.tsx`
- `lib/trips/list-client.ts`
- `lib/trips/open-flow.ts`
- `lib/trips/metadata.ts`
- `app/api/trips/route.ts`
- `app/api/trips/[tripId]/route.ts`
- new `lib/projects/list-client.ts`
- new `app/api/projects/list/route.ts` or extend `app/api/projects/route.ts`

### Data Changes

- My Trips query source changes from `trip_plans` to `travel_projects`
- list query joins:
  - current version
  - primary source

### Compatibility Strategy

Recommended v1.9 behavior:

- primary My Trips UI reads `TravelProject`
- legacy `trip_plans` endpoints remain during rollout
- old saved plans appear because they were backfilled in Phase 1

### Risks

- if backfill is incomplete, old saved trips disappear from My Trips
- list filtering semantics change from `status/source_type` to lifecycle/source
- open behavior is more complex because not every project should go straight to Workspace

### Acceptance Criteria

- My Trips shows `TravelProject` rows, not raw plan rows
- user can open:
  - unfinished planning project
  - active workspace project
  - abandoned project
- filters work on lifecycle and source type
- last activity ordering is stable

## 13. Phase 6: Visual Refactor Preparation

### Goal

Stop at stable architecture boundaries and hand visual restructuring to Qwen only after the new data and route model are stable.

### Pages To Hand Off After Architecture Stabilizes

- `/create`
- `/plan`
- `/workspace/[projectId]`
- `/trips`
- Explore detail create branch surface
- optional import surface inside `/create`

### Modify Files

- no immediate UI implementation in this phase
- produce handoff notes against:
  - `app/create/page.tsx`
  - `app/plan/page.tsx`
  - `components/workspace/*`
  - `app/trips/page.tsx`
  - `components/explore/CreateMyVersion.tsx`

### Data Changes

- none

### Risks

- starting visual changes too early will force route and state rewrites twice

### Acceptance Criteria

- project APIs, routes, and persistence are stable enough that UI work is mostly presentational
- Qwen handoff can happen without reopening core data architecture

## 14. Cross-Phase Risks

### Highest-risk technical areas

- legacy localStorage state and new project state living side by side
- backfill correctness from `trip_plans` into `TravelProject`
- proposal-stage introduction because the current app jumps from parse to full generation
- Workspace save semantics around local edits versus accepted version checkpoints

### Recommended Risk Controls

- keep `trip_plans` table intact through the full v1.9 rollout
- add idempotent project backfill before switching My Trips
- do not rebuild `TripWorkspace`; wrap it
- enforce version creation only on accepted checkpoints
- keep route compatibility until project-backed Workspace is proven stable

## 15. v1.9 Must Complete

- TravelProject core schema
- TravelProjectVersion accepted checkpoints
- TravelProjectSource records with `source_type`
- lightweight TravelProjectMessage history
- project-aware AI flow with `source_review`
- `abandoned` persistence and resume
- Explore source branching
- import text/Markdown/TXT
- `/workspace/[projectId]`
- project-backed My Trips
- basic Workspace `Ask Wanderly` entry

## 16. Deferred After v1.9

- PDF import
- DOCX import
- OCR import
- advanced Workspace Copilot
- full version comparison
- timeline audit via `travel_project_events`
- POI knowledge enhancement
- autonomous route optimization
- multi-user collaboration

## 17. Final Recommendation

The minimum correct engineering move for v1.9 is:

```text
Do not replace the current trip generator.
Replace the identity, persistence, routing, and flow shell around it.
```

That means:

- reuse `TripPlan`
- reuse the existing Workspace editor
- reuse current parse/generate APIs where possible
- add TravelProject as the canonical identity
- add accepted versions as the canonical save model
- move My Trips from saved plans to projects

If the team keeps that boundary disciplined, v1.9 can land as a real architectural upgrade instead of another local-state-heavy generator iteration.
