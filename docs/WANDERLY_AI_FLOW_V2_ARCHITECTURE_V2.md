# Wanderly AI Travel Flow v2 Architecture Proposal v2

Date: 2026-07-22  
Audience: product + architecture + Codex implementation planning  
Scope: v1.9-oriented architecture revision for Wanderly AI Travel Flow v2  
Constraint: no code changes in this document; keep `TripPlan` as the Workspace render contract

## 1. Purpose Of This Revision

This v2 revision tightens the first proposal so it can act as the direct planning basis for Wanderly v1.9 restructuring.

This document keeps the core direction unchanged:

- `TravelProject` is the canonical top-level entity
- `Explore` remains the inspiration and source-content layer
- `AI Travel Copilot` remains the co-creation layer
- `Workspace` remains the ownership and editing layer
- `TripPlan` remains the final Workspace render contract

This revision strengthens five areas that were still too abstract in the first draft:

- AI Flow state machine
- `TravelProject` lifecycle
- phased import scope
- phased data-model implementation
- gradual route migration and implementation boundaries

## 2. Current Architectural Baseline

Wanderly already contains three partially overlapping systems:

```text
Generator-era flow
  /create -> /plan -> generate -> /workspace

Explore-era flow
  /explore -> draft seed -> /create or /workspace

Workspace-era flow
  /workspace <- local TripPlan <- save/restore <- /trips
```

The current codebase already proves these architectural facts:

- `Explore` is a real upstream source layer, not just a landing page
- `Workspace` is already the real destination surface
- `/result` is already mostly a compatibility route over the same Workspace shell
- `TripPlan` is already the single render payload for result/workspace
- `TripRequest` is already the normalized planning intent payload
- project identity, versioning, and conversation history do not yet exist as first-class models

That means v1.9 should not replace the entire system. It should wrap the existing `TripRequest -> TripPlan -> Workspace` chain inside a stronger project model.

## 3. Architecture Principles

### 3.1 Product Layering

```text
Explore
  -> where ideas and source material come from

AI Travel Copilot
  -> where ideas are understood, clarified, proposed, and transformed

Workspace
  -> where the user owns, edits, accepts, restores, and saves the trip
```

### 3.2 Ownership Rule

```text
AI can interpret, suggest, reorganize, and optimize
User owns the final decision
Workspace stores the accepted result
```

### 3.3 Contract Rule

```text
TravelProject     = project identity and lifecycle
TravelProjectVersion = immutable planning checkpoints
TripRequest       = normalized planning intent
TripPlan          = workspace render contract
```

Opinionated recommendation:

- do not replace `TripPlan`
- do not make AI chat messages the source of truth
- do not let local storage continue acting as the long-term project identity

## 4. TravelProject As The Core Entity

### 4.1 Why `TravelProject` Is Necessary

Today Wanderly can generate a trip and save a trip, but it still does not model a trip as a durable evolving project.

`TravelProject` is needed because one real trip can now contain:

- one or more input sources
- one evolving planning conversation
- multiple AI-generated proposals
- multiple accepted versions
- manual edits in Workspace
- restore points over time

Without `TravelProject`, these concerns stay fragmented across:

- local storage session keys
- one current `TripPlan`
- one cloud `trip_plans` row
- transient regenerate text

### 4.2 Core Hierarchy

```text
TravelProject
  |- source records
  |- current lifecycle status
  |- current AI flow stage
  |- conversation history
  |- version history
  |- current accepted version
  |- workspace session state

TravelProjectVersion
  |- TripRequest snapshot
  |- TripPlan snapshot
  |- enrichment snapshot
  |- change summary
```

## 5. AI Flow State Machine v2

## 5.1 Why `source_review` Must Exist

The first proposal moved too quickly from input to clarification.

That works for pure natural-language entry, but it is not correct for these future source types:

- Explore archive input
- imported Markdown/TXT plan
- pasted existing travel notes

For those inputs, AI must first read and interpret the existing material before asking the user more questions.

### 5.2 Canonical AI Flow States

Recommended canonical state machine:

```text
source_received
  -> source_review
  -> clarifying
  -> proposal_ready
  -> proposal_adjusting
  -> generating
  -> workspace_ready
```

### 5.3 State Meaning

#### `source_received`

Meaning:

- a planning entry has been created
- the system knows where the trip idea came from
- the project exists, but AI has not interpreted the content yet

Typical sources:

- free-text idea
- Explore archive
- pasted text
- Markdown file
- TXT file

#### `source_review`

Meaning:

- AI is reviewing the incoming source material
- AI extracts what is already known
- AI identifies whether this source is sparse, structured, conflicting, or nearly complete

This stage is required for:

- Explore archive import
- pasted travel notes
- Markdown/TXT import

This stage may be minimal for:

- clean natural-language idea input

#### `clarifying`

Meaning:

- AI has enough source understanding to ask only the missing or ambiguous questions
- clarification should be selective, not form-heavy

#### `proposal_ready`

Meaning:

- AI has enough constraints to present one or more planning directions
- no full `TripPlan` has been committed yet

#### `proposal_adjusting`

Meaning:

- user is reacting to the proposal
- AI is refining direction before full generation

#### `generating`

Meaning:

- AI is committing a full structured `TripPlan` candidate
- this should create a new project version

#### `workspace_ready`

Meaning:

- the generated or imported plan is accepted as a Workspace version
- the user can now continue editing in Workspace

### 5.4 Canonical State Machine Diagram

```text
Source A: Natural language
  user input
    -> source_received
    -> source_review
    -> clarifying
    -> proposal_ready
    -> proposal_adjusting
    -> generating
    -> workspace_ready

Source B: Explore archive
  archive selected
    -> source_received
    -> source_review
    -> clarifying
    -> proposal_ready
    -> proposal_adjusting
    -> generating
    -> workspace_ready

Source C: Imported notes
  paste / md / txt
    -> source_received
    -> source_review
    -> clarifying
    -> proposal_ready
    -> proposal_adjusting
    -> generating
    -> workspace_ready
```

### 5.5 Operational Trigger Rules

| Transition | Trigger |
| --- | --- |
| `source_received -> source_review` | project created with any source payload |
| `source_review -> clarifying` | AI extracts known constraints and unresolved gaps |
| `clarifying -> proposal_ready` | enough answers exist to propose a direction |
| `proposal_ready -> proposal_adjusting` | user asks to tweak the direction |
| `proposal_ready -> generating` | user accepts current direction |
| `proposal_adjusting -> generating` | user accepts adjusted direction |
| `generating -> workspace_ready` | valid `TripPlan` version successfully created |

Opinionated recommendation:

- `proposal_ready` is the first “decision-ready” state
- `generating` should always produce a new immutable version
- `source_review` should be explicit in storage, not just an invisible preprocessing step

## 6. TravelProject Lifecycle Design

The AI Flow state machine describes the planning conversation.  
The `TravelProject` lifecycle describes the whole trip project from creation to archive.

### 6.1 Canonical Lifecycle

```text
NEW
  -> EXPLORING
  -> PLANNING
  -> PROPOSED
  -> GENERATING
  -> WORKSPACE
  -> EDITING
  -> ARCHIVED
```

### 6.2 Lifecycle State Meaning

#### `NEW`

Meaning:

- project row exists
- no usable source has been committed yet

Typical trigger:

- user clicks create new project

#### `EXPLORING`

Meaning:

- user is still deciding the source or source has just been attached
- this is where Explore selection or import source selection happens

Typical triggers:

- user browses Explore and chooses “use this archive”
- user opens import flow and selects a text source

#### `PLANNING`

Meaning:

- AI is understanding source material and clarifying missing constraints
- this maps to `source_review` + `clarifying` in AI Flow

#### `PROPOSED`

Meaning:

- AI has produced a direction-level proposal
- user is deciding whether to accept or adjust it

#### `GENERATING`

Meaning:

- system is producing a full `TripPlan` version

#### `WORKSPACE`

Meaning:

- first accepted version exists
- project is now openable as a real travel workspace

#### `EDITING`

Meaning:

- user is actively changing the trip in Workspace
- AI suggestions and manual edits may create newer versions

#### `ARCHIVED`

Meaning:

- project is no longer active
- still restorable and viewable

### 6.3 Lifecycle Transition Rules

| From | To | Trigger |
| --- | --- | --- |
| `NEW` | `EXPLORING` | source entry started |
| `EXPLORING` | `PLANNING` | source locked and AI begins review/clarification |
| `PLANNING` | `PROPOSED` | AI provides proposal |
| `PROPOSED` | `PLANNING` | user reopens clarification or changes source assumptions |
| `PROPOSED` | `GENERATING` | user approves current direction |
| `GENERATING` | `WORKSPACE` | first valid version is committed |
| `WORKSPACE` | `EDITING` | user starts manual or AI-assisted editing |
| `EDITING` | `WORKSPACE` | editing checkpoint committed and user returns to stable read state |
| `WORKSPACE` | `ARCHIVED` | user archives the project |
| `EDITING` | `ARCHIVED` | user archives after save/confirm |

### 6.4 Which Lifecycle States Must Be Persisted

Must persist in database:

- `NEW`
- `EXPLORING`
- `PLANNING`
- `PROPOSED`
- `GENERATING`
- `WORKSPACE`
- `EDITING`
- `ARCHIVED`

Reason:

- the lifecycle is not just a UI state
- it affects resume behavior
- it affects route restoration
- it affects which actions are allowed
- it supports draft recovery and future notifications

Opinionated recommendation:

- persist lifecycle state on `travel_projects`
- persist AI flow stage separately as `current_flow_stage`
- do not overload one field to mean both project lifecycle and AI flow stage

## 7. Data Model Strategy

## 7.1 Long-Term Data Model

Long-term model stays unchanged:

- `travel_projects`
- `travel_project_versions`
- `travel_project_sources`
- `travel_project_messages`
- `travel_project_events`

### 7.2 Recommended Entity Roles

#### `travel_projects`

Solves:

- stable identity
- lifecycle state
- current route target
- active version pointer

#### `travel_project_versions`

Solves:

- immutable snapshots
- restore points
- AI-generated and user-accepted checkpoints

#### `travel_project_sources`

Solves:

- source provenance
- Explore/archive/import linkage
- source review recovery

#### `travel_project_messages`

Solves:

- project-scoped AI clarification and proposal history
- eventual copilot drawer memory

#### `travel_project_events`

Solves:

- audit trail
- user action log
- restore/edit/change history

## 7.3 Phased Implementation Priority

### Phase 1: v1.9 Core

Must build:

- `travel_projects`
- `travel_project_versions`
- `travel_project_sources`

These solve the minimum v1.9 needs:

- project identity
- multiple versions
- source tracking

Why this split is correct:

- without `travel_projects`, routes and lifecycle remain unstable
- without `travel_project_versions`, Workspace still cannot safely version
- without `travel_project_sources`, Explore/import/source_review cannot be modeled correctly

### Phase 2

Add:

- `travel_project_messages`

This solves:

- AI chat history
- project-level conversation continuity

Why defer it one phase:

- v1.9 can restructure AI Flow with staged state and version commits first
- full durable conversation history is important, but not required to validate the project/version architecture
- this keeps the initial schema smaller and migration safer

### Phase 3

Add:

- `travel_project_events`

This solves:

- detailed modification logs
- audit timeline
- explicit operational trace

Why defer it another phase:

- event logs improve observability and auditability
- they are useful after project/version behavior stabilizes
- they are not required to make the first v1.9 project model work

### 7.4 Phased Data Model Diagram

```text
Phase 1
  travel_projects
  travel_project_versions
  travel_project_sources

Phase 2
  + travel_project_messages

Phase 3
  + travel_project_events
```

Opinionated recommendation:

- Phase 1 should be the real v1.9 foundation
- do not try to land all five tables in one pass unless migration risk is proven low

## 8. Import Architecture Boundary

### 8.1 Revised Import Scope

The first proposal was too broad for v1.9.

v1.9 Phase 1 should support only:

- pasted text
- Markdown
- TXT

Not in v1.9 Phase 1:

- PDF parsing
- DOCX parsing
- image OCR

### 8.2 Why Scope Must Be Reduced

Because v1.9’s core value is:

```text
existing travel idea
  -> AI understands it
  -> AI organizes it
  -> user continues in Workspace
```

The hard part is not file-format coverage.  
The hard part is:

- source review
- structured extraction
- proposal generation
- project/version creation
- Workspace continuity

### 8.3 Import Version Plan

#### v1.9 First Stage

Support:

- text paste
- `.md`
- `.txt`

Goal:

- validate “bring your own travel notes -> AI整理 -> Workspace” flow

#### Later Versions

Add:

- PDF parsing
- DOCX parsing
- image OCR

Goal:

- expand convenience only after the source-review pipeline is stable

### 8.4 Import Pipeline For v1.9

```text
paste text / upload md / upload txt
  -> create project
  -> create source record
  -> source_review
  -> clarifying
  -> proposal
  -> generating
  -> workspace
```

Opinionated recommendation:

- treat import as a source problem first
- treat PDF/DOCX/OCR as transport-layer expansion later

## 9. Route Migration Strategy

The first proposal named the right target routes, but v1.9 should not replace the whole route tree in one shot.

### 9.1 Target Route Direction

Long-term target:

```text
/create
/copilot/new
/import
/workspace/[projectId]
/workspace/[projectId]/history
/workspace/[projectId]/copilot
/trips
```

### 9.2 v1.9 Gradual Migration Rule

Do not immediately replace:

- `/create`
- `/plan`
- `/result`
- `/workspace`

Instead, introduce a compatibility-driven migration.

### 9.3 Recommended Migration Phases

#### Stage A: Keep `/create` As The Public Entry

```text
/create
  -> entry selector
  -> start new Copilot Flow under the hood
```

Meaning:

- user-facing entry stays stable
- implementation can route new flows into `TravelProject`
- avoids a jarring top-level URL break during v1.9

#### Stage B: Introduce New Project-Aware Copilot Internally

Recommended internal behavior:

```text
/create
  -> create TravelProject
  -> enter new AI Flow
  -> optional internal route state:
       /copilot/new?projectId=...
  or project-aware nested flow behind /create
```

Recommendation:

- if routing complexity is high, v1.9 may keep the visible route at `/create`
- but the internal state model must already be `TravelProject`-based

#### Stage C: Migrate Workspace Gradually

From:

```text
/workspace
```

To:

```text
/workspace/[projectId]
```

v1.9 compatibility plan:

- new project-aware flows should prefer `/workspace/[projectId]`
- old local-storage restore flows can still land on `/workspace`
- `/workspace` becomes a compatibility loader that resolves or redirects to the right project when possible

#### Stage D: Keep `/result` As Compatibility

`/result` should remain as a compatibility route in v1.9, but it should not receive new architecture responsibility.

Recommended behavior:

```text
/result
  -> compatibility shell
  -> load current workspace-compatible state
  -> optionally redirect to /workspace or /workspace/[projectId]
```

### 9.4 Route Migration Diagram

```text
v1.9 public entry
  /create
    -> new TravelProject-aware Copilot flow
    -> generate version
    -> /workspace/[projectId] when available
    -> /workspace fallback when compatibility path is still needed

legacy compatibility
  /plan
    -> retained temporarily

  /result
    -> retained as compatibility shell

  /workspace
    -> compatibility workspace loader
```

### 9.5 Recommended Compatibility Priority

Highest priority:

- keep `/create` usable
- keep `/workspace` usable
- keep `/result` from breaking saved flows

Second priority:

- progressively move new flows to `/workspace/[projectId]`

Opinionated recommendation:

- v1.9 should migrate data identity first
- route cleanup can follow once project-aware loading is stable

## 10. Workspace Relationship And Version Ownership

### 10.1 How AI Output Enters Workspace

Canonical rule:

```text
AI never writes directly into anonymous workspace state
AI writes a TravelProjectVersion
Workspace opens that version
```

### 10.2 How Workspace Saves Versions

Recommended checkpoint types:

- first generated plan
- accepted replan
- accepted import parse
- explicit version save
- restore as new current version

Not every keystroke should become a version.

### 10.3 Current-to-Future Mapping

Current:

```text
TripPlan in localStorage
  -> rendered in Workspace
```

Target:

```text
TravelProject.current_version_id
  -> TravelProjectVersion.trip_plan_json
  -> rendered in Workspace
```

This preserves `TripPlan` while upgrading identity and history.

## 11. v1.9 Implementation Boundary

This section defines the execution boundary for the next restructuring cycle.

### 11.1 v1.9 Must Complete

#### A. TravelProject foundation

- introduce `TravelProject` as canonical identity
- persist lifecycle state
- connect source and current version

#### B. Basic version architecture

- create immutable `travel_project_versions`
- first generated/imported/accepted version must be durable
- Workspace must open a project version, not only anonymous local state

#### C. AI Flow restructuring

- add `source_review`
- support source-aware planning stages
- move from linear form mindset toward project-scoped flow

#### D. Explore creation split

- support source-aware branching from Explore
- distinguish:
  - AI完善
  - 直接编辑
  - 重新规划

#### E. Workspace projectization

- start moving Workspace from anonymous local state to project-aware state
- support version-backed opening for new flows

#### F. Basic import

- support pasted text
- support Markdown
- support TXT

#### G. Gradual route compatibility

- `/create` remains stable
- `/workspace` remains stable
- `/result` remains compatible
- new project-backed flows can start using `/workspace/[projectId]`

### 11.2 v2.0 And Later

Not required for v1.9:

- PDF parsing
- DOCX parsing
- OCR import
- full project message history if Phase 2 is not reached yet
- detailed operation event audit if Phase 3 is not reached yet
- advanced version diffing
- rich version comparison UI
- advanced Workspace Copilot memory
- POI knowledge graph enhancement
- deep route optimization intelligence

### 11.3 Boundary Rule

If a feature does not help complete this chain, it should not block v1.9:

```text
source
  -> review
  -> clarify
  -> propose
  -> generate version
  -> open project-aware workspace
```

## 12. Revised Phase Plan

### Phase 0: Architecture Preparation

Deliver:

- canonical state machines
- lifecycle model
- route migration plan
- compatibility plan
- schema rollout plan

### Phase 1: Data Model Core

Deliver:

- `travel_projects`
- `travel_project_versions`
- `travel_project_sources`
- project lifecycle persistence
- current-version loading

### Phase 2: AI Flow Refactor

Deliver:

- `source_received -> source_review -> clarifying -> proposal -> generating -> workspace`
- source-aware planning pipeline
- `/create` compatibility entry into new flow

### Phase 3: Import v1.9 Scope

Deliver:

- pasted text
- Markdown
- TXT
- source review for imported content

### Phase 4: Workspace Projectization

Deliver:

- project-aware Workspace loading
- version-backed entry
- partial migration to `/workspace/[projectId]`

### Phase 5: Conversation And Audit Extensions

Deliver later as scope allows:

- `travel_project_messages`
- `travel_project_events`
- richer history and audit

## 13. What Already Exists

These existing parts should be reused rather than rebuilt:

- `TripPlan` render contract
- `TripRequest` normalization path
- parse/generate providers in `lib/ai/*`
- weather/provider abstractions in `lib/weather/*`
- Explore source and archive adapters in `lib/explore/*`
- Workspace rendering and editing core in `components/workspace/*`
- save/restore patterns from `lib/trips/*`

## 14. Not In Scope

- UI polish details
- visual redesign language
- booking flows
- real-time maps and live traffic
- full file-format support at once
- full audit/event system in the first v1.9 core pass
- advanced semantic POI intelligence

## 15. Final Recommendation

The most important shift for Wanderly v1.9 is this:

```text
Do not evolve from “generator page” to “better generator page”.
Evolve from “one generated plan” to “one durable travel project”.
```

The minimum correct v1.9 architecture is:

```text
Explore as source layer
TravelProject as identity layer
AI Travel Copilot as source-aware planning layer
TravelProjectVersion as checkpoint layer
Workspace as ownership/editing layer
TripPlan as render contract
```

And the minimum correct planning flow is:

```text
source_received
  -> source_review
  -> clarifying
  -> proposal_ready
  -> generating
  -> workspace_ready
```

If v1.9 delivers that backbone cleanly, Wanderly will have a safe base for:

- richer import
- project conversation
- version restore
- stronger copilot
- deeper workspace intelligence

without needing another full architectural reset.

