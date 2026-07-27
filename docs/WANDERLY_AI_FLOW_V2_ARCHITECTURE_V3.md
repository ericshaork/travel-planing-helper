# Wanderly AI Travel Flow v2 Architecture Proposal v3

Date: 2026-07-22  
Audience: product + architecture + Codex implementation planning  
Scope: v1.9 implementation-input revision for Wanderly AI Travel Flow v2  
Constraint: no code changes in this document; keep `TripPlan` as the Workspace render contract

## 1. Purpose Of This Revision

This v3 revision keeps the v2 direction intact and fills the remaining architecture gaps needed before writing a concrete v1.9 implementation plan.

This document does not change the product direction:

- `TravelProject` remains the canonical core entity
- `Explore` remains the source layer
- `AI Travel Copilot` remains the co-creation layer
- `Workspace` remains the ownership and editing layer
- `TripPlan` remains the final Workspace render contract
- v1.9 import remains limited to text paste, Markdown, and TXT
- gradual route migration remains the recommended migration strategy

This revision adds six missing pieces:

- AI Flow exception state: `abandoned`
- AI Preference Layer
- lightweight `travel_project_messages` in Phase 1
- explicit `travel_project_sources.source_type`
- clearer mapping between AI Flow and `TravelProject` lifecycle
- stricter version-creation rules

## 2. Architectural Invariants

Wanderly v1.9 should keep the product separated into three layers:

```text
Explore
  -> source material and travel inspiration

AI Travel Copilot
  -> source understanding, clarification, proposal, generation

Workspace
  -> durable ownership, editing, version restore, accepted plan
```

Ownership rule:

```text
AI suggests, structures, explains, and optimizes
User decides, accepts, edits, restores, and owns
```

Contract rule:

```text
TravelProject          = durable project identity
TravelProjectVersion   = immutable accepted checkpoint
TripRequest            = normalized planning intent
TripPlan               = Workspace render contract
```

## 3. TravelProject As The Core Entity

`TravelProject` is still the right architectural center for v1.9 because one trip now needs to hold:

- one or more source records
- one AI planning flow
- lightweight message context
- multiple accepted versions
- current Workspace state
- lifecycle and recovery state

Recommended hierarchy:

```text
TravelProject
  |- lifecycle state
  |- current flow stage
  |- source records
  |- lightweight planning messages
  |- accepted versions
  |- current version pointer
  |- workspace metadata
```

`TravelProjectVersion` should remain the only durable planning checkpoint that Workspace renders as a stable plan.

## 4. AI Flow State Machine v3

### 4.1 Canonical AI Flow

```text
source_received
  -> source_review
  -> clarifying
  -> proposal_ready
  -> proposal_adjusting
  -> generating
  -> workspace_ready

exception / pause path
  -> abandoned
```

### 4.2 State Meaning

#### `source_received`

Meaning:

- a planning entry exists
- the system knows the incoming source
- AI has not interpreted the source yet

#### `source_review`

Meaning:

- AI reads the attached source material first
- AI extracts known constraints, gaps, conflicts, and reusable structure
- this is required for non-blank inputs and still valid for blank inputs

#### `clarifying`

Meaning:

- AI asks only the minimum missing questions
- the interaction should stay selective and easy to answer

#### `proposal_ready`

Meaning:

- AI has enough confidence to present a direction
- no full accepted `TripPlan` version exists yet for this step

#### `proposal_adjusting`

Meaning:

- the user is refining the proposal before full generation

#### `generating`

Meaning:

- AI is producing a structured `TripPlan`
- this is the stage that can result in a version candidate

#### `workspace_ready`

Meaning:

- an accepted plan version now exists
- the project can open in Workspace

#### `abandoned`

Meaning:

- the user stopped before completing the current AI planning loop
- the project should remain resumable instead of being deleted or lost

Use cases:

- user exits during clarification
- user leaves after source review
- user creates a project and never continues
- user temporarily pauses planning

### 4.3 `abandoned` Design Rules

#### Should `abandoned` be persisted?

Yes.

Recommendation:

- persist `abandoned` as `travel_projects.current_flow_stage`
- keep `TravelProject.lifecycle_state` unchanged unless the product explicitly wants a separate lifecycle-level archive decision

This preserves an important distinction:

```text
lifecycle_state
  -> what stage the project is in overall

current_flow_stage
  -> where the current AI planning loop stopped
```

Example:

- lifecycle = `PLANNING`
- current_flow_stage = `abandoned`

This means the project is still a planning-stage project, but its active AI loop was interrupted.

#### How does a project become `abandoned`?

Recommended triggers:

- user leaves the flow without finishing and the draft is already created
- system detects long inactivity on a project that never reached `workspace_ready`
- user explicitly closes or pauses the planning flow

#### How is an `abandoned` project restored?

Recommended resume rule:

- reopening the project should restore the latest valid planning context
- resume target should be derived from the last meaningful saved stage

Examples:

- if source review completed, resume at `clarifying`
- if clarification was mostly done, resume at `clarifying`
- if proposal existed, resume at `proposal_ready` or `proposal_adjusting`

`abandoned` itself should be treated as a recoverable marker, not a working stage the UI must actively operate inside.

#### Can an `abandoned` project re-enter AI Flow?

Yes.

This is required for:

- unfinished project recovery
- future trips list resume entry points
- cross-device continuity

Recommendation:

- allow `abandoned -> clarifying`
- allow `abandoned -> proposal_ready`
- allow `abandoned -> source_review` only when source data changed or must be re-read

#### Does `abandoned` affect the successful path?

No.

The normal successful path remains:

```text
source_received
  -> source_review
  -> clarifying
  -> proposal_ready
  -> proposal_adjusting
  -> generating
  -> workspace_ready
```

`abandoned` is an exception and recovery branch, not a replacement for the primary flow.

### 4.4 AI Flow Trigger Rules

| Transition | Trigger |
| --- | --- |
| `source_received -> source_review` | project created with source payload |
| `source_review -> clarifying` | AI extracted enough source understanding |
| `clarifying -> proposal_ready` | enough answers exist to propose direction |
| `proposal_ready -> proposal_adjusting` | user asks to tweak direction |
| `proposal_ready -> generating` | user accepts current direction |
| `proposal_adjusting -> generating` | user accepts adjusted direction |
| `generating -> workspace_ready` | valid plan version committed |
| `source_review -> abandoned` | user stops before continuing |
| `clarifying -> abandoned` | user exits or pauses |
| `proposal_ready -> abandoned` | user leaves before generation |
| `proposal_adjusting -> abandoned` | user leaves during adjustment |

## 5. TravelProject Lifecycle

The project lifecycle still describes the whole trip project, not a single AI interaction loop.

### 5.1 Canonical Lifecycle

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

### 5.2 Lifecycle Meaning

#### `NEW`

- project identity exists
- no meaningful source is attached yet

#### `EXPLORING`

- source is being chosen or just attached
- Explore selection and import entry happen here

#### `PLANNING`

- AI is reviewing source and clarifying requirements

#### `PROPOSED`

- AI has produced a direction-level proposal
- user is deciding whether to adjust or proceed

#### `GENERATING`

- the system is committing a full plan candidate

#### `WORKSPACE`

- at least one accepted version exists
- the project is now a durable travel workspace

#### `EDITING`

- user or Copilot is making Workspace-level modifications

#### `ARCHIVED`

- project is no longer active
- still restorable and viewable

### 5.3 Which Lifecycle States Must Be Persisted

All of them should be persisted on `travel_projects`.

That includes:

- `NEW`
- `EXPLORING`
- `PLANNING`
- `PROPOSED`
- `GENERATING`
- `WORKSPACE`
- `EDITING`
- `ARCHIVED`

Reason:

- lifecycle affects resume behavior
- lifecycle affects route restoration
- lifecycle affects allowed actions
- lifecycle is not a purely visual state

## 6. AI Flow And Project Lifecycle Are Not The Same State

This distinction should be explicit in the v1.9 implementation plan.

### 6.1 The Difference

AI Flow state:

- describes one planning interaction process with the Copilot
- changes more frequently
- is operational and conversational

Project lifecycle state:

- describes the durable maturity of the whole travel project
- changes less often
- is ownership and routing oriented

They should not be merged into one field.

Recommended persistence split:

```text
travel_projects.lifecycle_state
travel_projects.current_flow_stage
```

### 6.2 Mapping Between Them

Recommended mapping:

| Lifecycle State | Typical AI Flow State |
| --- | --- |
| `NEW` | none yet |
| `EXPLORING` | `source_received` |
| `PLANNING` | `source_review` + `clarifying` |
| `PROPOSED` | `proposal_ready` + `proposal_adjusting` |
| `GENERATING` | `generating` |
| `WORKSPACE` | `workspace_ready` |
| `EDITING` | workspace copilot or manual edits, outside the initial AI flow |
| `ARCHIVED` | no active flow |

Special case:

| Lifecycle State | Current Flow Stage |
| --- | --- |
| `PLANNING` or `PROPOSED` | `abandoned` |

This is the correct way to represent a paused unfinished project without inventing a second archive-like lifecycle.

## 7. AI Preference Layer

### 7.1 Goal

Wanderly should reserve an architecture layer for user-level Copilot behavior preferences, even if v1.9 ships without a dedicated preference UI.

Default persona:

- `Travel Curator`

Behavior:

- professional
- warm
- suggestive
- non-pushy

Future personas can include:

- warm concierge
- professional curator
- efficient advisor
- exploration companion

### 7.2 Storage Recommendation

Recommendation:

- store AI behavior preferences in `user_settings`
- use the existing AI preferences payload as the architecture anchor

Suggested logical chain:

```text
user preference
  -> AI behavior preference
  -> Copilot prompt assembly
```

In practice:

```text
user_settings
  -> ai_preferences_json
  -> copilot persona + behavior flags
  -> prompt composer
```

### 7.3 Why `user_settings` Is The Right Home

Because AI style is:

- user-level, not project-level
- reusable across multiple trips
- compatible with future settings surfaces
- consistent with existing preference architecture

Recommended split:

- user-level preference decides default Copilot style
- project-level data may still override tone only when product rules explicitly allow it

### 7.4 v1.9 Boundary

v1.9 should only reserve the architecture.

That means:

- no full persona-switching UI required
- no advanced multi-style prompt experiments required
- no per-message dynamic tone engine required

v1.9 should only ensure the prompt system can eventually consume:

- a default persona identifier
- a small set of behavior preferences

## 8. Source Record Design

### 8.1 `source_type` Is Required

`travel_project_sources` should explicitly include `source_type`.

Recommended enum:

- `blank_input`
- `explore_archive`
- `import_text`
- `uploaded_file`
- `existing_trip`

### 8.2 Meaning Of Each `source_type`

#### `blank_input`

- user starts with natural language such as "I want to spend 4 days in Chengdu"

#### `explore_archive`

- source comes from an Explore travel archive

#### `import_text`

- source comes from pasted text, Markdown, or TXT in v1.9

#### `uploaded_file`

- reserved for future file-based import such as PDF, DOCX, or image OCR

#### `existing_trip`

- source is an already existing plan that should be reorganized, optimized, or replanned

### 8.3 Why `source_type` Matters

It is needed for:

- deciding which AI Flow entry behavior to use
- powering `source_review`
- measuring source usage and conversion
- supporting future product analysis

Example:

```text
blank_input
  -> source_review may be lightweight

explore_archive / import_text / existing_trip
  -> source_review becomes a real understanding stage
```

## 9. Data Model Strategy

### 9.1 Long-Term Model

Long-term target model remains:

- `travel_projects`
- `travel_project_versions`
- `travel_project_sources`
- `travel_project_messages`
- `travel_project_events`

### 9.2 Phase 1 Scope Must Include Lightweight Messages

v3 recommendation:

Phase 1 should now include a lightweight `travel_project_messages`.

Minimum payload:

- `project_id`
- `role`
- `content`
- `created_at`

No complex chat system is required in v1.9.

### 9.3 Why Messages Move Into Phase 1

Because AI co-creation is now part of the core product, not a later add-on.

Without lightweight messages, Wanderly will struggle to:

- resume unfinished AI planning context
- explain why a version changed
- support future Copilot continuity
- recover abandoned projects cleanly

This is still intentionally lightweight:

- no advanced threading
- no message annotations requirement
- no tool-call persistence requirement
- no full audit model requirement

### 9.4 Revised Phased Implementation

#### Phase 1: v1.9 Core

Must build:

- `travel_projects`
- `travel_project_versions`
- `travel_project_sources`
- lightweight `travel_project_messages`

This solves:

- project identity
- accepted versions
- source provenance
- minimal AI co-creation continuity

#### Phase 2

Expand `travel_project_messages` if needed for:

- richer proposal memory
- project-level copilot continuity
- future Workspace Copilot context

#### Phase 3

Add:

- `travel_project_events`

This solves:

- modification log
- operation audit
- richer history timeline

### 9.5 Why `travel_project_events` Still Stays Later

Because event history is valuable but not required to validate the first v1.9 backbone.

v1.9 first needs:

- source-aware project creation
- resumable AI planning
- durable accepted versions
- project-aware Workspace opening

Detailed audit can safely follow once those behaviors stabilize.

## 10. Version Creation Rules

Versioning should stay intentional.  
Not every interaction should create a new `TravelProjectVersion`.

### 10.1 Must Create A New Version

Create a new immutable version when:

- AI generates the first accepted plan
- user accepts an AI replan
- user confirms an AI optimization
- user explicitly saves an important manual edit

### 10.2 Should Not Create A New Version

Do not create a new immutable version for:

- ordinary chat
- unconfirmed AI suggestions
- temporary previews
- draft proposal text before user acceptance

### 10.3 Recommended Rule

Use this checkpoint principle:

```text
Only accepted planning milestones become TravelProjectVersion rows
```

This prevents:

- uncontrolled version growth
- noisy restore history
- low-signal timeline clutter

It also preserves the meaning of version history:

- each version is a user-meaningful state
- each version should be restorable
- each version should be explainable

## 11. Import Boundary

v1.9 import scope remains unchanged:

- pasted text
- Markdown
- TXT

Not in v1.9:

- PDF parsing
- DOCX parsing
- image OCR

Reason:

- file-type breadth is not the main value
- source understanding and Workspace continuity are the main value

## 12. Route Migration Strategy

The route migration strategy from v2 remains valid and should not be replaced by a big-bang rewrite.

Recommended gradual migration:

```text
/create
  -> stays as public entry
  -> internally starts the new project-aware Copilot flow

/workspace
  -> stays as compatibility loader

/workspace/[projectId]
  -> becomes the preferred target for new project-backed flows

/result
  -> remains compatibility only
```

This keeps v1.9 focused on identity and state migration first.

## 13. v1.9 Implementation Boundary

### 13.1 v1.9 Must Complete

- `TravelProject` as the canonical project identity
- AI Flow refactor with `source_review`
- recoverable `abandoned` handling
- Explore-to-project creation branching
- Workspace projectization
- immutable accepted version checkpoints
- lightweight project messages
- source typing with `source_type`
- project-aware opening into Workspace

### 13.2 v2.0 And Later

Not required for v1.9:

- PDF import
- DOCX import
- OCR import
- full version comparison
- rich event audit timeline
- advanced Workspace Copilot memory
- POI knowledge enhancement
- full AI persona UI

## 14. Final Recommendation

The v1.9 implementation plan should treat this as the backbone:

```text
Explore as source layer
TravelProject as identity layer
AI Travel Copilot as source-aware co-creation layer
TravelProjectVersion as accepted checkpoint layer
Workspace as ownership layer
TripPlan as render contract
```

And the minimum correct state model is:

```text
AI Flow
  source_received
    -> source_review
    -> clarifying
    -> proposal_ready
    -> proposal_adjusting
    -> generating
    -> workspace_ready
    -> abandoned

Project Lifecycle
  NEW
    -> EXPLORING
    -> PLANNING
    -> PROPOSED
    -> GENERATING
    -> WORKSPACE
    -> EDITING
    -> ARCHIVED
```

If v1.9 lands this model cleanly, Wanderly will have a stable base for:

- unfinished project recovery
- reusable Copilot context
- controlled version history
- project-aware Workspace editing
- later import expansion
- later advanced Copilot behavior
