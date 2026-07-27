# Explore Content Pipeline Plan

## 1. Project Positioning

`travel-content-pipeline` is redefined as an internal content production system for `travel_planing` Explore cold start.

It is not a user-facing travel planning website.

Its new role is:

- Generate high-quality Explore travel plan content in batches
- Support editorial review and publishing preparation
- Export approved content into `travel_planing`

Primary short-term objective:

- Produce about 200 approved Explore travel plans

Long-term objective:

- Serve as a controllable, low-frequency internal seeding tool
- Continue to support targeted refreshes, seasonal content, and gap filling
- Avoid becoming coupled to the user-facing application runtime

Non-goals for this project:

- UI design
- visual design
- page layout
- image style definition
- end-user trip personalization runtime

## 2. Explore Content Scope

Explore should be treated as a structured catalog of travel plans.

Phase 1 travel types:

1. Family
2. Couple
3. Student
4. Solo

Each Explore item should represent a complete, reviewable travel plan for a city and trip profile, rather than a loose inspiration card.

## 3. Core Data Model

The system should use one primary content entity: `ExplorePlan`.

Supporting entities should include:

- `ExplorePlanDay`
- `ExplorePlanPoi`
- `ExplorePlanFood`
- `ExplorePlanStaySuggestion`
- `GenerationRequest`
- `ReviewRecord`
- `PublishRecord`

### 3.1 User Display Fields

These fields are intended for `travel_planing` Explore consumption.

#### ExplorePlan

- `id`: internal stable UUID
- `slug`: stable public identifier for URLs/import mapping
- `title`: final user-facing plan title
- `subtitle`: short supporting line
- `city_code`: canonical city identifier
- `city_name`: canonical display city name
- `region_name`: province or broader region for filtering
- `trip_type`: `family | couple | student | solo`
- `days`: integer trip length
- `nights`: optional integer if needed for stay framing
- `budget_tier`: `low | medium | high`
- `budget_summary`: concise budget explanation
- `travel_pace`: `slow | balanced | dense`
- `seasonality`: suitable seasons or month ranges
- `summary`: short overview paragraph
- `highlights`: array of 3 to 6 key selling points
- `tags`: array of normalized tags
- `theme_tags`: interest tags such as food, history, nature, citywalk
- `target_audience_note`: short explanation of who this plan fits
- `recommended_transport`: primary in-city transport advice
- `cover_poi_ids`: optional references to major POIs for future cover selection
- `estimated_total_budget_min`
- `estimated_total_budget_max`
- `budget_currency`: default `CNY`
- `plan_version`: content version for import consistency

#### ExplorePlanDay

- `day_number`
- `day_title`
- `day_summary`
- `morning_plan`
- `afternoon_plan`
- `evening_plan`
- `transport_note`
- `meal_note`
- `pace_note`
- `primary_poi_ids`: ordered POI references

#### ExplorePlanPoi

- `poi_id`
- `canonical_name`
- `city_code`
- `district`
- `poi_type`
- `short_description`
- `visit_reason`
- `recommended_duration_minutes`
- `best_visit_time`
- `family_fit`
- `couple_fit`
- `student_fit`
- `solo_fit`
- `estimated_cost_note`
- `reservation_required`
- `official_status_confidence`
- `map_provider_ref`

#### ExplorePlanFood

- `food_id`
- `name`
- `category`
- `area`
- `why_recommended`
- `price_level`
- `best_for`
- `linked_day_number`

#### ExplorePlanStaySuggestion

- `stay_id`
- `area_name`
- `stay_reason`
- `best_for_trip_type`
- `budget_fit`
- `transport_advantage`

### 3.2 Backoffice Fields

These fields are for generation control, review, audit, and publishing.

#### ExplorePlan Backoffice

- `status`: `draft | ai_generated | under_review | revision_needed | approved | published | archived`
- `source_type`: `manual_request | batch_request | regenerated`
- `generation_request_id`
- `generation_model`
- `generation_prompt_version`
- `generation_context_version`
- `fact_check_status`: `pending | partial | passed | failed`
- `editorial_score`
- `quality_score`
- `duplicate_risk_score`
- `poi_validation_score`
- `content_risk_flags`: array
- `created_at`
- `updated_at`
- `generated_at`
- `approved_at`
- `published_at`
- `created_by`
- `approved_by`
- `published_by`
- `revision_count`
- `source_snapshot_id`
- `import_batch_id`
- `travel_planing_record_id`
- `notes_internal`

#### GenerationRequest

- `id`
- `request_type`: `single | batch`
- `requested_city_codes`
- `days_options`
- `trip_types`
- `budget_tiers`
- `preference_tags`
- `pace`
- `language`
- `status`
- `request_payload`
- `requested_by`
- `created_at`
- `completed_at`

#### ReviewRecord

- `id`
- `explore_plan_id`
- `review_stage`: `editorial | fact | poi | final`
- `review_result`: `pass | fail | revise`
- `reviewer`
- `review_notes`
- `issues_found`
- `created_at`

#### PublishRecord

- `id`
- `explore_plan_id`
- `target_system`: `travel_planing`
- `target_environment`
- `export_payload_version`
- `publish_status`
- `published_by`
- `published_at`
- `rollback_reference`

## 4. Canonical Taxonomy

To keep Explore content consistent, the pipeline should own canonical dictionaries for:

- city codes
- trip types
- budget tiers
- pace levels
- interest tags
- POI categories
- dining categories
- content statuses

This taxonomy should be versioned and shared with `travel_planing` through a formal schema contract.

## 5. Content Production Workflow

The target workflow is:

1. Admin input
2. Structured request validation
3. AI generation
4. Automated checks
5. Human review
6. Approval
7. Publish preparation
8. Import into `travel_planing`

### 5.1 Step 1: Admin Input

Admin inputs:

- city
- trip length
- trip type
- budget
- preferences
- pace

Required technical support:

- request schema validation
- canonical city mapping
- trip-type and tag normalization
- batch job creation

### 5.2 Step 2: Structured Request Validation

The system should reject or flag:

- unsupported city
- invalid day count
- unsupported trip type
- conflicting preferences
- impossible budget and scope combinations

Required technical support:

- schema validator
- taxonomy validator
- rule engine for basic feasibility checks

### 5.3 Step 3: AI Generation

The system generates a structured travel plan draft, not raw prose only.

Generation outputs should include:

- title candidates
- short summary
- day-by-day itinerary
- POI selections
- food recommendations
- stay area suggestions
- budget notes
- tags

Required technical support:

- prompt orchestration
- structured output schema
- city context injection
- POI grounding context
- generation logging

### 5.4 Step 4: Automated Checks

Before a human sees the content, the system should run:

- schema validation
- missing field check
- duplicate detection
- POI existence check
- city consistency check
- trip-type fit check
- budget consistency check
- itinerary pace check
- prohibited content check

Required technical support:

- validation workers
- POI resolver
- rule-based QA checks
- LLM-as-judge only as secondary scoring, not source of truth

### 5.5 Step 5: Human Review

Reviewers should verify:

- factual plausibility
- itinerary coherence
- whether the plan matches the trip type
- whether recommendations are useful and non-generic
- whether the budget and pace are believable
- whether any POIs need replacement

Required technical support:

- review queue
- diff/version history
- issue annotations
- approval and revision actions

### 5.6 Step 6: Approval

Once approved, a plan becomes a publishable asset.

Required technical support:

- immutable approved snapshot
- approval audit log
- import payload generation

### 5.7 Step 7: Publish Preparation

The pipeline should convert internal content into the exact import schema required by `travel_planing`.

Required technical support:

- exporter
- schema mapper
- import payload validator
- batch manifest tracking

### 5.8 Step 8: Import Into travel_planing

Approved content should be pushed or pulled through an explicit integration boundary.

Required technical support:

- internal API or import job
- idempotent upsert behavior
- publish status callback

## 6. AI Generation Capability Design

## 6.1 Generation Principles

The system should not generate “creative travel fluff” first and try to repair it later.

It should generate grounded, structured content from verified city context and POI candidates.

Priority order:

1. factual grounding
2. useful structure
3. trip-type relevance
4. readable copy quality

## 6.2 Recommended Prompt Architecture

Use a multi-part prompt with clear boundaries.

### System Layer

Defines:

- role as an Explore travel content generator
- output language rules
- factual caution rules
- required schema
- trip-type constraints
- no fabricated transportation, prices, or operating facts

### Task Layer

Provides:

- target city
- days
- trip type
- budget
- preferences
- pace
- required output sections

### Context Layer

Provides grounded context:

- city profile
- candidate POIs
- district groupings
- food areas
- transport heuristics
- seasonal notes
- budget heuristics

### Output Contract Layer

Requires strict JSON or schema-constrained output with:

- required fields
- max lengths
- enum constraints
- ordered daily structure

## 6.3 City Knowledge Input

The model should not rely on generic pretrained memory alone.

Each generation should be provided with a curated city knowledge packet containing:

- city overview
- top districts/areas
- validated POI list
- visit suitability by trip type
- common route clusters
- local food signals
- season and weather caveats
- transport heuristics
- budget heuristics

Recommended sources for the city packet:

- internal curated city profile data
- verified POI provider results
- manually approved editorial notes

## 6.4 POI Data Source Strategy

POIs should come from a real provider-backed pipeline, not hand-written mock lists.

Recommended POI data layers:

1. Canonical POI source
2. Internal normalized POI cache
3. Explore suitability metadata

Canonical source should provide:

- official or near-official names
- address
- district
- coordinates
- business or availability metadata if available

Internal metadata should add:

- trip-type suitability
- recommended stay duration
- cost level
- indoor/outdoor
- crowd level
- child friendliness
- pacing compatibility

## 6.5 Fact Checking Strategy

Fact checking should be layered.

### Layer 1: deterministic checks

- city and POI match
- day count matches plan length
- budget fields present
- no missing mandatory sections

### Layer 2: POI grounding checks

- all referenced POIs resolve to canonical POIs
- no duplicate POIs unless intentional
- area transitions are plausible

### Layer 3: content plausibility checks

- excessive daily density detection
- mismatch between trip type and recommendations
- low-budget plans containing premium-only recommendations
- family plans with unsafe or inconvenient pacing

### Layer 4: editorial fact review

- human validation of doubtful claims
- correction of local inaccuracies

The system should avoid exact claims that are time-sensitive unless sourced and versioned.

## 6.6 Content Quality Control

Quality should be measured with a combination of rules and review, not only model confidence.

Suggested checks:

- duplicate title detection
- duplicate itinerary pattern detection
- generic text density detection
- unsupported claims detection
- missing local specificity detection
- overuse of the same POIs across plans
- weak trip-type differentiation

Suggested quality signals:

- POI diversity score
- day coherence score
- city specificity score
- trip-type fit score
- budget consistency score
- readability score

## 6.7 Recommended Generation Strategy

Do not use one giant prompt to generate everything in a single uncontrolled shot.

Preferred staged generation:

1. select city context and candidate POIs
2. draft itinerary skeleton
3. expand into copy and notes
4. run validation
5. regenerate only failed sections if needed

This reduces hallucination and makes QA easier.

## 7. Relationship With travel_planing

The two projects should stay separate.

### 7.1 travel-content-pipeline Responsibilities

- content generation
- source normalization
- POI grounding
- editorial review workflow
- publish-ready export generation
- content versioning and audit trail

### 7.2 travel_planing Responsibilities

- Explore display
- search and filtering
- user interactions
- detail page rendering
- personalization for end users
- analytics and engagement measurement

### 7.3 Integration Boundary

Recommended contract:

- `travel-content-pipeline` produces approved Explore content payloads
- `travel_planing` imports approved payloads through an internal API or import worker

Recommended integration modes:

- pull mode: `travel_planing` fetches approved payloads from pipeline
- push mode: pipeline calls a protected import endpoint in `travel_planing`

For Phase 1, a file-based import or admin-triggered import job is acceptable.

For later phases, move to API-based import with idempotent upsert.

### 7.4 Shared Contract Requirements

Both systems should share:

- schema version
- taxonomy version
- canonical city codes
- content status mapping
- stable external IDs

## 8. Storage and System Architecture

Recommended logical modules for `travel-content-pipeline`:

- request intake
- taxonomy and schema layer
- city knowledge service
- POI normalization service
- generation orchestrator
- validation and QA engine
- review workflow service
- export and publish service

Recommended storage categories:

- generation requests
- approved city knowledge packets
- normalized POI cache
- generated drafts
- review records
- published snapshots

Avoid treating JSON files as the long-term system of record.

JSON export can remain as an interchange layer, but the system should eventually use a database-backed workflow.

## 9. Phase Plan

## Phase 0: Redefine Data Structure and Workflow

Goal:

- Replace the old prototype framing with a production-oriented content seeding definition

Deliverables:

- canonical Explore content schema
- request schema
- status flow definition
- review flow definition
- import contract draft for `travel_planing`
- city taxonomy and trip-type taxonomy

Success criteria:

- the pipeline knows exactly what one Explore plan is
- the import target for `travel_planing` is unambiguous
- review and publish states are clearly defined

## Phase 1: Minimum End-to-End Loop

Goal:

- Input one travel request
- Generate one structured plan with AI
- Save it
- Export it into an Explore import payload

Scope:

- single request generation
- one or a few cities
- one real model integration
- one real POI source integration
- basic validation
- manual review step
- importable output

Success criteria:

- one approved Explore plan can move from request to import without manual file surgery

## Phase 2: Batch Generate 200 Plans

Goal:

- produce the initial Explore cold-start inventory

Scope:

- batch request management
- generation queue
- city and trip-type coverage matrix
- duplicate prevention
- approval batching
- import batch manifests

Recommended operating approach:

- define target matrix by city x trip type x days x budget bands
- generate drafts in controlled batches
- review in waves
- publish incrementally

Success criteria:

- around 200 approved plans with acceptable diversity and factual quality

## Phase 3: Automation and Quality Improvement

Goal:

- reduce manual rework while improving consistency

Scope:

- stronger POI normalization
- automatic duplicate detection
- regeneration of failed sections only
- scoring dashboards for reviewers
- targeted refresh workflows
- better context packs per city

Success criteria:

- lower revision rate
- higher approval rate
- faster batch turnaround

## 10. 200-Plan Production Strategy

The initial batch should not be random.

Build a coverage matrix such as:

- top target cities
- four trip types
- 2-day, 3-day, 4-day common lengths
- selected budget tiers

Selection principles:

- prioritize high-demand cities first
- avoid creating many near-duplicates
- ensure each trip type has clearly distinct recommendations
- keep city coverage and content depth balanced

The pipeline should support tracking coverage gaps:

- missing city and trip type combinations
- overrepresented POIs
- underrepresented trip lengths

## 11. Key Risks

- low-quality city knowledge will contaminate all generated content
- lack of canonical POI grounding will create factual drift
- weak taxonomy discipline will make import and filtering brittle
- single-shot generation will produce repetitive or generic plans
- no versioned contract with `travel_planing` will cause integration churn
- trying to add UI concerns too early will distract from content system quality

## 12. Recommended Immediate Next Actions

1. Freeze the old prototype as reference only, not as the production design baseline.
2. Confirm the final Explore import schema expected by `travel_planing`.
3. Define canonical enums for city, trip type, budget, pace, and tags.
4. Define the `ExplorePlan` and related entities as the new source of truth.
5. Define the approval status flow and reviewer responsibilities.
6. Choose the real POI data source and normalization approach.
7. Design the first single-plan generation contract before any batch work begins.

## 13. Final Definition

`travel-content-pipeline` should become a backoffice content seeding system with three clear responsibilities:

- generate grounded Explore travel plans
- help humans review and approve them
- deliver approved structured content into `travel_planing`

It should not become the website itself, and it should not own end-user interaction logic.
