# Wanderly v1.9 Implementation Plan v2

Date: 2026-07-23  
Audience: engineering + product + implementation planning  
Input baseline: `WANDERLY_AI_FLOW_V2_ARCHITECTURE_V4.md` and `WANDERLY_V1.9_IMPLEMENTATION_PLAN.md`  
Constraint: implementation plan only, no code changes, no UI design expansion

## 1. Planning Baseline

This v2 plan keeps the original v1.9 implementation structure intact and clarifies three engineering decisions needed before Phase 0 starts:

- `travel_projects` should store project identity and lifecycle, not duplicate full trip content
- `proposal_ready` and `proposal_adjusting` need durable proposal persistence
- v1.9 import is a text import entry, not a file upload system

The implementation baseline remains:

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
  -> durable proposal
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

| Area | Reusable now | Why |
| --- | --- | --- |
| Trip render contract | `lib/trip/types.ts`, `lib/trip/schema.ts` | `TripPlan` is already the correct Workspace contract |
| AI generation core | `app/api/generate-trip/route.ts`, `lib/trip/planner.ts`, `lib/ai/generateTrip.ts`, `lib/ai/prompts.ts` | existing generation path already produces validated `TripPlan` |
| Parse flow core | `app/api/parse-trip/route.ts`, `lib/ai/parseTrip.ts` | still useful for blank-input source understanding |
| Explore normalization | `lib/explore/archive-reader.ts`, `lib/explore/to-trip-draft.ts`, `lib/explore/flow.ts` | already converts Explore content into structured travel seeds |
| Workspace renderer/editor | `components/workspace/*`, `hooks/useTripWorkspaceState.ts`, `hooks/useTripSave.ts` | this is the most expensive UI logic and should be wrapped, not rebuilt |
| Settings and AI preference storage | `app/api/user-settings/route.ts`, `lib/settings/*`, `supabase/migrations/005_user_settings.sql` | already supports user-level AI preferences and workspace defaults |

### 2.5 What Needs Refactor

| Area | Current issue | Why it must change |
| --- | --- | --- |
| Create and Plan | `/create` and `/plan` are local draft driven | v1.9 needs project-aware AI flow state |
| Workspace loader | `/workspace` only restores from localStorage | v1.9 needs `/workspace/[projectId]` and version loading |
| My Trips | lists `trip_plans` rows | v1.9 must list `TravelProject` |
| Save/update flow | `lib/trips/save-flow.ts` persists single mutable saved trip | v1.9 needs accepted version checkpoints |
| Storage model | `lib/trip/storage.ts` is canonical today | v1.9 needs server-backed project identity, local storage only as session cache |
| Explore create branching | current Explore detail has only partial branch logic | v1.9 needs AI improve / direct edit / replan as explicit source behaviors |

### 2.6 What Must Be Added

| Area | New addition | Why |
| --- | --- | --- |
| Core data model | `travel_projects`, `travel_project_versions`, `travel_project_sources`, `travel_project_messages` | foundational project architecture |
| Project APIs | `/api/projects/*` | app needs a project-aware backend surface |
| Project-aware workspace route | `/workspace/[projectId]` | canonical ownership route |
| Project-aware My Trips list | project list query and open behavior | support planning, editing, abandoned, archived states |
| AI flow state machine | source review, durable proposal, abandoned handling | architecture requires co-creation flow, not form-only generation |
| Text import source | pasted text / Markdown text / TXT text parsing | v1.9 source coverage requirement |

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
- file upload management
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
Everything above becomes safer after identity, proposal persistence, versioning, and flow state are stable.

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
  -> current accepted version pointer

TravelProjectVersion
  -> proposed planning artifact
  -> accepted TripPlan checkpoint

Workspace
  -> loads current accepted TravelProjectVersion.trip_plan_json
  -> edits locally
  -> creates accepted version checkpoints on explicit save
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
Phase 3  -> unify blank / Explore / text import entry paths
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
- define project identity fields separately from trip content fields before schema work begins
- keep legacy pages operational while new data model lands

### Project Identity Boundary

`TravelProject` should represent a project shell:

- who owns it
- what it is called
- where it is in the lifecycle
- which flow stage is active
- which accepted version is current
- when it was last active

`TravelProject` should not become another copy of full trip content.

Project identity fields:

- `id`
- `user_id`
- `title`
- `lifecycle_state`
- `current_flow_stage`
- `current_version_id`
- `last_activity_at`
- `created_at`
- `updated_at`

Version / request data fields:

- destination
- start date
- end date
- days
- budget
- preferences
- normalized travel request
- generated itinerary
- weather summary
- enrichment

These belong primarily in:

- `travel_project_versions.trip_request_json`
- `travel_project_versions.trip_plan_json`
- `travel_project_sources.source_payload_json`
- `travel_project_sources.parsed_trip_request_draft_json`

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
- keep derived destination/date/day display fields out of the first `TravelProject` type unless a later list-performance need proves they are required

### Risks

- local session metadata drift if old keys and new keys disagree
- accidental reliance on project fields before server schema exists
- reintroducing destination/date/day on `TravelProject` as convenience fields can blur ownership between Project and Version

### Acceptance Criteria

- old `/create`, `/plan`, `/workspace`, and `/trips` still function
- new shared types compile without changing render behavior
- browser session metadata can carry project references without breaking legacy drafts
- Phase 1 schema work can start with a clear Project identity versus Version data boundary

## 8. Phase 1: TravelProject Data Foundation

### Goal

Introduce the durable project model in Supabase and make it possible to represent a trip as a project with durable proposals and accepted plan checkpoints.

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
- `lifecycle_state`
- `current_flow_stage`
- `current_version_id`
- `last_activity_at`
- `created_at`
- `updated_at`

Do not include as core fields in v1.9:

- `destination_city`
- `start_date`
- `end_date`
- `days`
- `budget`
- detailed preference fields

Reason:

`TravelProject` is the identity and lifecycle shell. Destination, dates, days, budget, and preferences are content that can change by version, proposal, or source interpretation.

#### `travel_project_versions`

Recommended fields:

- `id`
- `project_id`
- `version_number`
- `version_status`
- `trip_request_json`
- `trip_plan_json`
- `proposal_json`
- `enrichment_json`
- `weather_summary_json`
- `created_from` or `version_reason`
- `created_at`

Recommended `version_status` values:

- `draft`
- `proposed`
- `accepted`

Important v1.9 rule:

- only `accepted` versions are Workspace-renderable checkpoints
- `proposed` versions persist the AI proposal for resume and adjustment
- `draft` is reserved for incomplete internal artifacts if needed

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

`uploaded_file` remains reserved for future PDF/DOCX/OCR work. It should not imply v1.9 file upload support.

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

### Proposal Persistence Decision

Proposal cannot live only in front-end state. It must survive:

- refresh
- later resume
- cross-device continuation
- AI context reconstruction

#### Option A: `travel_project_versions.version_status`

Model:

```text
travel_project_versions
  version_status = draft | proposed | accepted
  proposal_json  = populated for proposed artifacts
  trip_plan_json = populated for accepted Workspace versions
```

Pros:

- one project artifact table covers proposal and accepted checkpoints
- proposal history can later become useful context
- resume behavior can query the latest `proposed` artifact
- AI can read the proposal and messages together

Cons:

- `TravelProjectVersion` no longer means only accepted Workspace version
- Workspace queries must filter `version_status = accepted`
- current version pointer must only point to accepted versions

#### Option B: `travel_projects.current_proposal_json`

Model:

```text
travel_projects
  current_proposal_json = latest proposal object
```

Pros:

- simpler to load the current proposal
- fewer rows during proposal adjustment
- easy mental model for one active proposal

Cons:

- mixes active planning content into the identity row
- makes proposal history harder to inspect
- encourages a growing project row over time
- creates a separate proposal persistence path from versions

#### v1.9 Recommendation

Use Option A.

Recommendation:

- add `version_status` to `travel_project_versions`
- add nullable `proposal_json`
- keep `trip_plan_json` required only for `accepted` rows
- keep `travel_projects.current_version_id` pointing only to an `accepted` version
- retrieve the current proposal by latest `travel_project_versions` row where `version_status = 'proposed'`

This keeps planning artifacts durable without turning `travel_projects` into a content blob.

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
- add `version_status` to support proposed and accepted artifacts

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
- `trip_plans.status` -> mapped lifecycle seed
- `trip_plans.trip_request_json` -> `travel_project_versions.trip_request_json`
- `trip_plans.trip_plan_json` -> `travel_project_versions.trip_plan_json`
- `trip_plans.source_type` -> `travel_project_sources.source_type`
- `trip_plans.destination_city/start_date/end_date/days/budget` -> derived from version request/plan for list display, not copied into `travel_projects`

Recommended migration implementation:

- add an idempotent backfill script or admin task
- keep `trip_plans` table untouched during v1.9 rollout
- stop treating `trip_plans` as the canonical model after backfill succeeds

### Risks

- backfill mapping may lose lifecycle nuance because legacy `trip_plans` only knows `draft/saved/archived`
- duplicate visibility if both legacy and project rows are queried at the same time
- cyclic dependency risk around `current_version_id`
- list pages may need derived destination/date/day data from the current accepted version

### Acceptance Criteria

- new tables exist with indexes and RLS
- `travel_projects` stores identity and lifecycle only
- one legacy `trip_plans` record can be deterministically represented as one project plus one accepted version
- proposed artifacts can be persisted and reloaded
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
    - adjust_proposal
    - generate
    - abandon
    - resume
```

This keeps:

- message append
- project state mutation
- proposal generation
- proposed artifact persistence
- accepted version creation

inside one project-aware orchestration layer.

### Proposal Persistence Flow

Recommended v1.9 flow:

```text
proposal_ready
  -> create travel_project_versions row
       version_status = proposed
       proposal_json = AI proposal
       trip_request_json = normalized request snapshot if available

proposal_adjusting
  -> append user feedback to travel_project_messages
  -> update current proposal by creating a new proposed row
     or by updating the latest proposed row before acceptance

generating
  -> read latest proposed row + messages + source
  -> generate full TripPlan
  -> create accepted travel_project_versions row
       version_status = accepted
       trip_plan_json = generated TripPlan
       trip_request_json = final request snapshot
  -> update travel_projects.current_version_id
```

Recommended first implementation:

- create a new `proposed` row for each accepted proposal revision only when the user explicitly asks AI to adjust the proposal
- do not create a new proposed row for every keystroke
- keep ordinary chat as `travel_project_messages`

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
- create `proposed` version rows during proposal stages
- create `accepted` version rows only when generation is accepted

### State Management Change

Current state source:

- localStorage draft keys

Target v1.9 state source:

- server-backed `TravelProject`
- persisted proposal artifact
- local storage only as resume/session cache

### Risks

- proposal stage is new and has no direct equivalent in current implementation
- if project state and local cache drift, the user may resume from the wrong step
- `abandoned` handling can become noisy if inactivity logic is too aggressive
- Workspace loaders must ignore `proposed` versions and load only `accepted` versions

### Acceptance Criteria

- a blank-input project can be created without relying on local parsed session as the canonical source
- source review can run and persist project flow state
- clarification answers can be stored as lightweight messages
- proposal can be persisted and restored after refresh
- proposal adjustment can read prior proposal and message context
- accepted generation creates an `accepted` `TravelProjectVersion` and moves the project to `WORKSPACE`

## 10. Phase 3: Entry Consolidation

### Goal

Unify the three project creation sources under one TravelProject creation model:

- blank input
- Explore archive
- text import

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
- add text import surface inside `/create` first
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

v1.9 import only supports text-level input:

- user directly pastes travel guide text
- user enters Markdown text
- user provides TXT text content for parsing

v1.9 does not implement:

- PDF upload
- DOCX upload
- image OCR
- file management
- stored attachment library
- background file processing pipeline

Important naming rule:

`ImportTextPanel` means "text import entry".  
It should not be treated as a generic file upload component.

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
- for v1.9 text import, use `source_type = import_text`
- store imported text in `raw_text` or `source_payload_json`

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

- source adapters can diverge if blank input, Explore, and text import each use different normalization logic
- direct edit path can bypass project creation if not enforced centrally
- imported text quality may produce noisy source review output
- naming the entry like an upload panel could encourage premature file-upload work

### Acceptance Criteria

- blank input creates a project and enters AI flow
- Explore archive can branch into:
  - AI improve
  - direct edit
  - AI replan
- pasted text / Markdown text / TXT text can create a project and enter source review
- no PDF/DOCX/OCR/file-manager behavior is implemented in v1.9
- `/create` and `/plan` still work for legacy drafts during transition

## 11. Phase 4: Workspace Projectization

### Goal

Bind Workspace to `TravelProject` and `TravelProjectVersion` without rebuilding the current editor.

### Scope

- add `/workspace/[projectId]`
- load current accepted version from `TravelProject.current_version_id`
- keep local in-browser editing responsiveness
- create accepted version checkpoints through project APIs
- reserve the v1.9 `Ask Wanderly` AI entry

### Recommended Implementation Strategy

Keep the editor local-first, server-checkpoint-second:

```text
load current accepted TravelProjectVersion
  -> hydrate TripWorkspace
  -> edit locally with existing hooks
  -> save accepted checkpoint explicitly
  -> create new accepted TravelProjectVersion
  -> update TravelProject.current_version_id
```

Workspace must not load `version_status = proposed` as a renderable plan.

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
- proposed versions can accidentally appear in Workspace if queries do not filter correctly

### Acceptance Criteria

- `/workspace/[projectId]` opens a project-backed workspace
- `TripWorkspace` still renders the existing `TripPlan` contract
- explicit accepted saves create new immutable accepted versions
- existing AI modification entry can open with project context
- `/workspace` still works as a compatibility loader

## 12. Phase 5: My Trips Upgrade

### Goal

Convert My Trips from a `trip_plans` archive into a `TravelProject` management entry.

### Scope

My Trips should list:

- project title
- lifecycle state
- current accepted version
- last activity
- source type

Destination/date/day display can be derived from:

- current accepted version `trip_request_json`
- current accepted version `trip_plan_json`
- latest proposed version for unfinished planning projects if needed

These should not be treated as core `travel_projects` identity fields in v1.9.

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
  - current accepted version
  - latest proposed version when no accepted version exists
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
- derived list display can become slower if version joins are not indexed well

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
- text import entry inside `/create`

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
- proposal persistence accidentally turning `travel_projects` into a content blob
- Workspace save semantics around local edits versus accepted version checkpoints
- import scope creeping from text parsing into file upload infrastructure

### Recommended Risk Controls

- keep `trip_plans` table intact through the full v1.9 rollout
- add idempotent project backfill before switching My Trips
- keep `travel_projects` identity-only in Phase 1
- persist proposals in `travel_project_versions` with `version_status = proposed`
- do not rebuild `TripWorkspace`; wrap it
- enforce accepted-version creation only on accepted checkpoints
- keep route compatibility until project-backed Workspace is proven stable
- keep v1.9 import limited to text entry and text parsing

## 15. v1.9 Must Complete

- TravelProject core schema with identity and lifecycle fields only
- TravelProjectVersion with `version_status`
- durable proposed artifacts for `proposal_ready` and `proposal_adjusting`
- accepted TravelProjectVersion checkpoints for Workspace
- TravelProjectSource records with `source_type`
- lightweight TravelProjectMessage history
- project-aware AI flow with `source_review`
- `abandoned` persistence and resume
- Explore source branching
- text import for pasted text / Markdown text / TXT text
- `/workspace/[projectId]`
- project-backed My Trips
- basic Workspace `Ask Wanderly` entry

## 16. Deferred After v1.9

- PDF import
- DOCX import
- OCR import
- generic file upload system
- file management library
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

This v2 plan adds three Phase 0 guardrails:

- keep `travel_projects` as identity and lifecycle only
- persist proposals durably through `travel_project_versions.version_status`
- keep import as text import, not file upload

That means:

- reuse `TripPlan`
- reuse the existing Workspace editor
- reuse current parse/generate APIs where possible
- add TravelProject as the canonical identity
- add proposed and accepted version artifacts as the canonical planning persistence model
- move My Trips from saved plans to projects

If the team keeps that boundary disciplined, v1.9 can land as a real architectural upgrade without turning Phase 0 into a schema cleanup trap.
