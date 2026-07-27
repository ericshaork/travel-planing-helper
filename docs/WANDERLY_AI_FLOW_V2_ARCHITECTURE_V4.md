# Wanderly AI Travel Flow v2 Architecture Proposal v4

Date: 2026-07-22  
Audience: product + architecture + Codex implementation planning  
Scope: final architecture supplement before v1.9 implementation planning  
Constraint: no code changes in this document; keep `TripPlan` as the Workspace render contract

## 1. Purpose Of This Revision

This v4 revision keeps the v3 architecture intact and only adds three implementation-critical clarifications before Wanderly moves into the v1.9 implementation plan.

The product direction remains unchanged:

- `TravelProject` is the core entity
- `Explore` is the source layer
- `AI Travel Copilot` is the co-creation layer
- `Workspace` is the ownership layer
- `TripPlan` is the render contract

This revision adds:

- version source semantics for `TravelProjectVersion`
- the relationship between My Trips and `TravelProject`
- the v1.9 boundary for Workspace AI Copilot entry

## 2. Architectural Invariants

The product stack remains:

```text
Explore
  -> source material and travel inspiration

AI Travel Copilot
  -> understanding, clarification, proposal, generation

Workspace
  -> accepted plan ownership, editing, version restore
```

Core contract remains:

```text
TravelProject          = durable project identity
TravelProjectVersion   = accepted checkpoint
TripRequest            = normalized planning intent
TripPlan               = Workspace render contract
```

## 3. TravelProject As The Core Entity

`TravelProject` remains the correct top-level entity because a real trip now needs to own:

- source provenance
- AI planning state
- lightweight project conversation
- accepted versions
- Workspace state
- lifecycle and recovery state

Recommended hierarchy:

```text
TravelProject
  |- lifecycle state
  |- current flow stage
  |- sources
  |- messages
  |- versions
  |- current version pointer
  |- workspace metadata
```

## 4. AI Flow And Lifecycle Baseline

The v3 state model remains unchanged.

AI Flow:

```text
source_received
  -> source_review
  -> clarifying
  -> proposal_ready
  -> proposal_adjusting
  -> generating
  -> workspace_ready
  -> abandoned
```

Project lifecycle:

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

The distinction still holds:

- AI Flow describes one co-creation process
- lifecycle describes the maturity of the whole project

## 5. TravelProjectVersion Source Semantics

### 5.1 Why Version Source Needs To Exist

v3 already defines when a version should be created:

- AI first accepted generation
- accepted AI replan
- confirmed AI optimization
- explicit important manual save

v4 adds one more requirement:

each version should also record why it was created.

This should be represented by a field such as:

- `version_reason`
- or `created_from`

The exact field name can be finalized during implementation planning, but the semantic requirement should now be locked.

### 5.2 Recommended Enum

Recommended values:

- `ai_generate`
- `ai_adjust`
- `manual_edit`
- `template_import`
- `import_transform`

Meaning:

#### `ai_generate`

- first accepted AI-generated plan

#### `ai_adjust`

- new accepted version created after AI updated the plan based on user feedback

#### `manual_edit`

- user explicitly saved important Workspace edits

#### `template_import`

- accepted version formed from an Explore-based creation path

#### `import_transform`

- accepted version formed by restructuring user-provided travel material

### 5.3 Why This Matters

This field helps with:

- explaining version history
- future version timeline display
- future restore labels
- product analytics
- AI explanation of how the current plan was produced

Without version source semantics, version history quickly becomes harder to understand once projects contain both AI-generated and user-saved checkpoints.

### 5.4 Is This Mandatory In v1.9?

Recommendation:

- not strictly mandatory for the first v1.9 release cut
- but strongly recommended as a database-reserved field in v1.9 schema design

Reason:

- the version model is already being introduced in v1.9
- adding a reason field later is possible, but less clean once historical rows already exist
- reserving the field now keeps the model forward-compatible even if only a subset of values is used initially

### 5.5 Recommended v1.9 Position

Recommended decision:

- schema should reserve the field in v1.9
- implementation may use a minimal subset first

Minimal acceptable v1.9 usage:

- `ai_generate`
- `ai_adjust`
- `manual_edit`

Deferred but reserved:

- `template_import`
- `import_transform`

## 6. My Trips And TravelProject

### 6.1 My Trips Should Not List Raw `TripPlan`

My Trips should no longer be modeled as a list of standalone `TripPlan` objects.

It should be modeled as a list of `TravelProject`.

Reason:

one trip can now exist in multiple real states:

- still in AI planning
- already generated
- being edited
- completed and stable in Workspace
- temporarily abandoned

A raw `TripPlan` cannot represent that lifecycle properly.

### 6.2 My Trips Is The Project Management Entry

Recommended definition:

```text
My Trips
  = TravelProject management entry
```

This means My Trips is where users return to:

- resume planning
- open the latest Workspace version
- inspect project status
- re-enter abandoned work
- continue editing an active trip

### 6.3 Recommended My Trips List Fields

Each list item should be project-oriented and should expose at least:

- project title
- lifecycle state
- current version
- last activity
- source type

Recommended meaning:

#### project title

- human-facing project identity, not merely a plan label

#### lifecycle state

- tells whether the project is planning, proposed, workspace-ready, editing, archived, or otherwise inactive

#### current version

- identifies the latest accepted checkpoint

#### last activity

- supports resume behavior and recency ordering

#### source type

- communicates whether the trip began from blank input, Explore, import, or another source

### 6.4 Why This Matters Architecturally

This clarifies the ownership model:

```text
My Trips
  -> lists TravelProject

TravelProject
  -> points to current TravelProjectVersion

TravelProjectVersion
  -> stores TripPlan snapshot
```

This preserves `TripPlan` as render data while making `TravelProject` the real navigational and management entity.

## 7. Workspace AI Copilot Boundary For v1.9

### 7.1 Core Principle

Advanced Workspace Copilot remains a later-stage capability, but v1.9 should still reserve a basic project-level AI entry inside Workspace.

Recommendation:

Workspace should have a stable AI entry point such as:

- `Ask Wanderly`

This is an architectural requirement, not a demand for a full advanced copilot feature set.

### 7.2 What v1.9 Should Support

v1.9 should support only the minimum project-aware Copilot entry:

- open a project-level AI conversation
- read basic project context
- understand the current accepted project version

That means the v1.9 Workspace AI entry is primarily:

- a continuity anchor
- a project-aware conversation hook
- a reserved surface for later capabilities

### 7.3 What v1.9 Does Not Need

v1.9 does not need:

- advanced route optimization
- POI knowledge enhancement
- automatic complex plan rewriting
- deep multi-step assistant behavior
- autonomous structural editing logic

Those belong to future Copilot expansion, not to the initial v1.9 architecture cut.

### 7.4 Why The Entry Should Still Exist In v1.9

Even if the assistant is initially lightweight, the entry matters because it establishes:

- Workspace as a project-aware environment
- project-level AI continuity
- a stable place for future Copilot growth

Without a reserved entry, Workspace and AI will remain structurally disconnected.

### 7.5 Recommended Boundary

Recommended distinction:

#### v1.9 Basic Workspace AI Entry

- fixed `Ask Wanderly` entry
- opens project-level conversation
- reads current project and version context
- supports lightweight explanation and discussion

#### Future Advanced Workspace Copilot

- route optimization
- day-level restructuring
- recommendation expansion
- smarter editing assistance
- stronger POI and destination intelligence
- more automated change application

This keeps the architecture honest:

- v1.9 reserves the integration point
- future versions grow the intelligence behind that point

## 8. Data Model Summary

The phased model remains:

- `travel_projects`
- `travel_project_versions`
- `travel_project_sources`
- lightweight `travel_project_messages`
- later `travel_project_events`

v4 adds two reinforcing expectations:

- `travel_project_versions` should reserve a version-source field
- My Trips should be built around `travel_projects`, not raw plan records

## 9. Final Recommendation

Before implementation planning starts, these three rules should now be treated as fixed architecture guidance:

```text
1. TravelProjectVersion needs source semantics
   -> why this version exists

2. My Trips lists TravelProject
   -> not standalone TripPlan

3. Workspace v1.9 includes a basic AI entry
   -> not advanced copilot logic yet
```

With these additions, Wanderly can enter v1.9 implementation planning with a clearer model for:

- version history meaning
- project list ownership
- Workspace and Copilot integration boundaries
