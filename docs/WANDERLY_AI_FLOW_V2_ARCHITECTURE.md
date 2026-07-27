# Wanderly AI Travel Flow v2 Architecture Proposal

Date: 2026-07-22  
Scope: architecture audit and v2 redesign proposal for Wanderly moving from an AI trip generator to an AI travel planning workspace.

## 1. Current State Audit

### 1.1 What Exists Today

Wanderly already has the right raw ingredients for v2, but they are still split across generator-era flows.

- Explore content exists as a real source layer: `app/explore/*`, `app/api/explore/*`, `lib/explore/*`, `lib/trip-packages/*`
- AI creation exists as a linear funnel: `app/create/page.tsx` -> `app/plan/page.tsx` -> `app/api/parse-trip/route.ts` -> `app/api/generate-trip/route.ts`
- Workspace exists as the final rendering and editing surface: `app/workspace/page.tsx`, `components/workspace/*`, `hooks/useTripWorkspaceState.ts`
- Trips exists as a saved-plan library: `app/trips/page.tsx`, `app/api/trips/*`, `lib/trips/*`
- Settings already influence generation: `app/settings/page.tsx`, `lib/settings/*`, `lib/trip/planner.ts`
- AI generation already merges weather and user preferences: `lib/trip/planner.ts`

Current primary flow:

```text
/create
  -> parse natural language
  -> /plan
  -> generate full TripPlan
  -> /workspace
  -> optional save to /trips
```

Current source flows:

```text
Source A: Natural language
  /create -> /plan -> /workspace

Source B: Explore archive
  /explore/[id] -> create draft
    -> /create (continue fill)
    or /workspace (direct import as draft)

Source C: User uploaded plan
  does not exist yet
```

### 1.2 Current Route Reality

Current route map:

```text
/                 landing
/explore          inspiration + archive list
/explore/[id]     archive detail
/create           entry selection + natural language input + blank workspace
/plan             missing-field form + generation loading
/result           compatibility shell for workspace
/workspace        actual working surface
/trips            saved plans library
/settings         preferences
```

Important audit conclusion: `/result` and `/workspace` already share the same shell through `components/workspace/WorkspaceRoutePage.tsx`. That means the codebase has already started moving from "result page" to "workspace", but the surrounding architecture still thinks in generator terms.

### 1.3 Create Audit

#### Current create-related pages and components

- `app/create/page.tsx`
- `app/plan/page.tsx`
- `components/trip/NaturalLanguageInput.tsx`
- `components/trip/StepQuestionForm.tsx`
- `components/trip/MissingFieldsSummary.tsx`
- `components/trip/TripDraftSidebar.tsx`
- `components/trip/GenerateLoading.tsx`
- `components/explore/CreateMyVersion.tsx`
- `lib/explore/flow.ts`
- `lib/trip/storage.ts`

#### Reusable as-is or with light refactor

- `NaturalLanguageInput`: good v2 Stage 1 starting point
- `parse-trip` API and `lib/ai/parseTrip.ts`: useful for AI understanding layer
- `StepQuestionForm` and normalization helpers: useful for structured clarification
- `GenerateLoading`: can be upgraded into v2 generation loading experience
- `createBlankWorkspaceDraft()`: good base for direct-to-workspace blank creation
- Explore adapters in `lib/explore/to-trip-draft.ts`: strong base for Source B

#### Needs structural refactor

- `/create` and `/plan` are page-separated form stages, not a project-scoped copilot flow
- `parsed-trip`, `trip-draft`, `trip-plan-draft`, `trip-plan`, and session metadata are local-storage artifacts, not a durable project model
- regeneration is a single textarea action (`RegenerateBox.tsx`), not conversation + versioned collaboration
- current create flow ends at "full plan generated", while v2 needs "proposal -> adjust -> commit to workspace"

### 1.4 Data Model Audit

Current domain objects:

- `TripRequestDraft`
- `TripRequest`
- `TripPlanDraft`
- `TripPlan`
- `WorkspaceSessionMetadata`
- cloud `trip_plans` row

Current support matrix:

| Capability | Current support | Notes |
| --- | --- | --- |
| Multiple versions per trip | No | only one current `TripPlan` snapshot |
| AI conversation per trip | No | only parse request and regenerate request |
| Source provenance | Partial | `sourceType` exists in draft/session/save metadata, not as first-class model |
| User import files | No | no route, no parser, no file model |
| User modification history | No | only transient pending changes |
| Stable workspace/project identity | Weak | localStorage + optional saved trip id |
| Restore old version | No | can reopen saved trip, cannot restore prior project versions |

Current database shape:

- `trip_plans` stores one saved plan snapshot
- metadata fields exist: `source_type`, `status`, `local_draft_id`, `last_opened_at`
- there is no project head, version table, message table, import table, or edit event log

### 1.5 Workspace Audit

What already aligns with v2:

- Workspace is already the final surface
- read/edit mode exists
- blank workspace entry exists
- map/search/add-place logic already proves the workspace can become an editing console
- save/restore flows already support a project library feeling

What blocks v2:

- workspace identity is not URL-based
- current workspace loads from one local `TripPlan`, not a project/version document
- AI assist is embedded as "regenerate this plan", not "copilot help me edit"
- no timeline of versions, conversations, or source imports

## 2. What Already Exists And Should Be Reused

Wanderly should not rebuild the whole stack. The v2 proposal should preserve these foundations:

- Keep `TripPlan` as the primary render contract for Workspace
- Keep `TripRequest` as the normalized travel intent contract
- Keep weather/provider/LLM abstractions in `lib/weather/*` and `lib/ai/*`
- Keep Explore as the inspiration and content ingestion surface
- Keep `trip_packages` as an upstream Explore content source
- Keep `TripWorkspace` and most itinerary editing UI as the Workspace core
- Keep `/trips` as the saved project library, even if the UI copy later shifts from "trips" to "projects"

Opinionated recommendation: v2 should add a new project envelope around the existing `TripRequest` and `TripPlan` contracts, not replace them.

## 3. New Product Architecture

### 3.1 Canonical Product Model

Wanderly v2 should be organized into three top-level modules:

```text
Explore
  -> discover ideas and source material

AI Travel Copilot
  -> understand intent
  -> clarify missing decisions
  -> propose directions
  -> generate or refine versions

Workspace
  -> own the trip
  -> edit the trip
  -> compare versions
  -> save history
```

Design principle:

```text
AI suggests
User decides
Workspace stores the decision
```

### 3.2 Canonical Unit: Travel Project

The core unit should no longer be "a generated plan". It should be a `TravelProject`.

```text
TravelProject
  |- sources
  |- messages
  |- versions
  |- current version
  |- workspace state
```

This is the missing container that lets one trip hold:

- original idea
- imported files
- AI clarifications
- AI proposals
- accepted workspace versions
- manual edits
- restore points

### 3.3 Source Entry Model

Recommended source model:

```text
Source A: blank idea
  "我想去成都玩4天"
  -> create project
  -> open AI Flow

Source B: Explore archive
  "用此档案创建"
  -> create project linked to explore source
  -> choose AI完善 / 直接编辑 / 重新规划

Source C: imported existing plan
  PDF / DOCX / TXT / Markdown / pasted text
  -> create project linked to import source
  -> parse
  -> choose 整理 / AI优化 / 重新规划
```

### 3.4 AI Flow State Machine

Recommended v2 state machine:

```text
idea_received
  -> clarifying
  -> proposal_ready
  -> proposal_adjusting
  -> generating
  -> workspace_ready
```

Detailed stage design:

```text
Stage 1 旅行委托
  user free text
  source-aware entry

Stage 2 AI理解
  summarize what is known
  ask only critical questions
  prefer choices over big forms

Stage 3 AI提案
  present 1-3 directions
  user can adjust or accept

Stage 4 生成
  produce full TripPlan version
  create version record

Stage 5 Workspace
  open accepted version in workspace
  continue editing with Copilot
```

Opinionated recommendation: Stage 2 should not reuse the current full `/plan` page as-is. It should reuse its validation and field widgets, but the interaction model must become AI-led clarification rather than a linear questionnaire.

### 3.5 Workspace Relationship

Target flow:

```text
any source
  -> create TravelProject
  -> AI Flow or direct workspace edit
  -> create Version v1
  -> open /workspace/[projectId]
  -> manual edits / AI edits create v2, v3, v4...
```

Workspace should always open a concrete version, but display a stable project identity.

```text
Project: 成都4日旅行
Current version: v4
History: v1, v2, v3, v4
Conversation: project-scoped
```

### 3.6 Workspace AI Copilot

Recommended interaction model:

- default workspace stays focused on plan + map
- AI lives behind a floating action button and side drawer
- drawer is project-scoped, not page-scoped
- AI actions should create suggestions first, commit only after user confirms

Copilot actions:

- adjust one day
- replace a stop
- explain route logic
- suggest nearby alternatives
- optimize for slower pace / less walking / food / photography

Opinionated recommendation: do not let workspace AI directly overwrite the active version on every message. AI should create a proposed draft or pending change set, then the user applies it into a new version.

## 4. Proposed Data Model

### 4.1 Design Principles

- keep `TripPlan` as the workspace rendering contract
- keep full-snapshot versions for reliability and restore
- separate project identity from version payload
- keep conversation records attached to project, not to page session
- treat import and explore as first-class sources
- make audit history explicit

### 4.2 Recommended Entities

#### `travel_projects`

Purpose: stable workspace/project identity.

Suggested fields:

- `id`
- `user_id`
- `title`
- `destination_city`
- `status` (`active | archived | deleted`)
- `source_kind` (`blank | explore | import | prompt`)
- `current_version_id`
- `current_stage` (`clarifying | proposal_ready | generating | workspace_ready`)
- `created_at`
- `updated_at`

#### `travel_project_versions`

Purpose: immutable snapshots.

Suggested fields:

- `id`
- `project_id`
- `version_number`
- `parent_version_id`
- `version_kind` (`ai_initial | ai_replan | import_parse | manual_checkpoint | restore`)
- `trip_request_json`
- `trip_plan_json`
- `enrichment_json`
- `weather_summary_json`
- `change_summary_json`
- `created_by` (`user | ai | system`)
- `created_at`

This table is the answer to "multi-version support".

#### `travel_project_messages`

Purpose: AI conversation and clarification history.

Suggested fields:

- `id`
- `project_id`
- `role` (`user | assistant | system`)
- `stage`
- `content_text`
- `structured_payload_json`
- `derived_version_id`
- `created_at`

This table is the answer to "AI conversation support".

#### `travel_project_sources`

Purpose: preserve provenance.

Suggested fields:

- `id`
- `project_id`
- `source_kind` (`prompt | explore | import`)
- `source_ref`
- `source_title`
- `source_metadata_json`
- `created_at`

This table is the answer to "source provenance" and "import file support".

#### `travel_project_events`

Purpose: user modification log and audit trail.

Suggested fields:

- `id`
- `project_id`
- `version_id`
- `event_type` (`manual_edit | ai_suggestion_applied | version_restored | import_completed`)
- `summary`
- `payload_json`
- `created_by`
- `created_at`

This table is the answer to "user modification records".

### 4.3 Why Not Store Everything Inside `trip_plans`

Because v2 needs one-to-many relationships:

- one project -> many versions
- one project -> many messages
- one project -> many sources
- one project -> many events

Trying to keep this inside a single `trip_plans` row would make restore, history, source attribution, and copilot UX much harder.

### 4.4 Compatibility Recommendation

Short-term migration strategy:

- keep current `TripPlan` JSON shape unchanged
- keep current save/restore APIs working
- add project/version repositories beside the current `trip_plans` logic
- migrate old saved trips into:
  - one `travel_project`
  - one initial `travel_project_version`

Opinionated recommendation: use current `trip_plans` as a migration source, not as the final v2 core model.

## 5. Page And Route Design

### 5.1 Recommended Route Map

```text
/explore
/explore/[id]

/create
  lightweight launcher only

/copilot/new
  AI Flow entry

/import
  upload / paste / parse review

/workspace/[projectId]
  canonical workspace route

/workspace/[projectId]/history
  versions + restore

/workspace/[projectId]/copilot
  deep link to project conversation

/trips
  saved project library
```

### 5.2 Answer To Route Audit Questions

#### AI Flow route

Yes, add one.  
Reason: current `/create` + `/plan` cannot represent a project-scoped, resumable copilot session.

Recommended route:

- `/copilot/new`
- optional query params: `source_kind`, `source_ref`

#### Import route

Yes, add one.  
Reason: imported plans need upload, parsing, source review, and mode selection. That is a distinct funnel, not a sub-state of Explore or Create.

Recommended route:

- `/import`

#### Conversation route

Yes, but project-scoped.  
Reason: conversation belongs to a trip project, not to a global chat surface.

Recommended routes:

- `/workspace/[projectId]/copilot`
- `/workspace/[projectId]/history`

### 5.3 Page State Model

```text
Create launcher
  -> choose source

Copilot flow
  -> delegate
  -> clarify
  -> propose
  -> generate
  -> open workspace

Workspace
  -> read
  -> edit
  -> copilot drawer
  -> history restore
```

## 6. Workspace Versioning Model

Recommended behavior:

```text
v1 = initial AI draft or imported structured draft
v2 = user accepted AI food-route adjustment
v3 = user slowed down day 3
v4 = current version
```

Rules:

- manual edits do not need a new version on every keystroke
- create a checkpoint on meaningful commits:
  - accepted AI suggestion
  - restored history
  - imported parse accepted
  - explicit "save version"
- current workspace can keep transient local draft state, but commit to a full version snapshot at clear checkpoints

Opinionated recommendation: version at intent boundaries, not at UI event boundaries.

## 7. Import Architecture

### 7.1 Import Scope

Current codebase has no user import route or parser. v2 should add one.

Recommended abstraction:

```text
ImportProvider
  -> pasted text
  -> markdown/txt parser
  -> pdf text extraction
  -> docx text extraction
```

### 7.2 Import Pipeline

```text
upload/paste
  -> extract text
  -> parse structure
  -> create source record
  -> create draft version
  -> user chooses:
       整理成手账
       AI优化
       重新规划
```

Opinionated recommendation: Phase 3 should ship pasted text + Markdown/TXT first, with the PDF/DOCX pipeline designed up front but rolled out behind the same interface.

## 8. Implementation Plan

### Phase 0: Architecture Preparation

Goals:

- rename product vocabulary in code and docs from "result page" to "workspace project"
- define canonical `TravelProject` concepts
- add compatibility plan for current `/workspace` and `/result`
- identify migration path from `trip_plans` to project/version model

Deliverables:

- architecture doc
- route contract doc
- migration strategy doc
- compatibility layer checklist

### Phase 1: Data Model

Goals:

- add project/version/source/message/event persistence
- preserve existing `TripPlan` and `TripRequest` schemas
- backfill existing saved trips into project/version model

Deliverables:

- new migrations
- repositories/services for project load/save/history
- compatibility adapter from old saved trip rows

### Phase 2: AI Flow

Goals:

- replace `/create -> /plan` linear form mindset with project-scoped copilot flow
- preserve existing parse/generate services
- add stage machine: delegate -> clarify -> proposal -> generate

Deliverables:

- `/copilot/new`
- clarification UI using existing field widgets
- proposal UI
- generation commit into project version

### Phase 3: Import

Goals:

- add import route and source type
- parse user-provided plan text into a structured draft
- let import create a project and first version

Deliverables:

- `/import`
- import parser abstraction
- text paste + Markdown/TXT first pass
- PDF/DOCX adapters behind same contract

### Phase 4: Workspace AI

Goals:

- move AI from full-plan regenerate box into project copilot drawer
- create project-scoped message history
- create project version history and restore

Deliverables:

- floating AI action entry
- side drawer copilot
- `/workspace/[projectId]/history`
- apply-suggestion -> new version flow

### Phase 5: Visual Rebuild

Goals:

- align UI with "Travel Curator + Workspace"
- reduce generator/form feeling
- add stronger project, version, and source cues

Deliverables:

- new create launcher
- new copilot flow visuals
- watercolor generation loading
- workspace history surface
- import review surface

## 9. Risks

### 9.1 LocalStorage-Centric Identity

Current workspace still centers on local storage. Without URL/project identity, version history and conversation continuity will stay fragile.

### 9.2 Overwriting Instead Of Versioning

Current regenerate flow replaces the active plan. That is fine for v1.x, but unsafe for a copilot workspace.

### 9.3 Import Parsing Quality

PDF and DOCX import quality will vary. The architecture must assume incomplete extraction and require a user review step before version commit.

### 9.4 Route Fragmentation

If `/create`, `/plan`, `/result`, `/workspace`, and future `/copilot` all remain peer flows without a canonical project route, the product will feel stitched together.

### 9.5 Scope Creep

v2 should not expand into booking, live operations, or chat-for-chat’s-sake. The goal is a planning workspace, not a general travel assistant.

## 10. Not In Scope

- real hotel or ticket booking
- maps with live traffic and turn-by-turn routing
- collaborative multi-user editing
- realtime CRDT document sync
- autonomous AI decisions without user confirmation
- historical analytics or recommendation feed beyond current Explore scope
- drag-and-drop timeline redesign in the same phase as data-model migration

## 11. Final Recommendation

Wanderly should evolve by changing its core unit from `generated trip` to `travel project`.

The minimum durable v2 architecture is:

```text
Explore as source layer
Copilot as project creation + refinement layer
Workspace as ownership + editing layer
Project as identity
Version as restore unit
Message as conversation unit
TripPlan as render contract
```

This gives Wanderly a clean path from:

```text
AI tool that outputs a trip
```

to:

```text
AI travel planning workspace where the user owns the final plan
```

