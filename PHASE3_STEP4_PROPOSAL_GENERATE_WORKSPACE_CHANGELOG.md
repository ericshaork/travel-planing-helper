# Phase 3 Step 4: Proposal Generate Workspace Integration

## Modified files

- `app/api/projects/[projectId]/proposal/route.ts`
- `components/trip/CreateCopilotPanel.tsx`
- `lib/projects/copilot/copilot-service.ts`
- `lib/projects/create-copilot-client.ts`

## Added files

- `lib/projects/proposal/proposal-types.ts`
- `lib/projects/proposal/proposal-service.ts`
- `tests/proposal-flow.test.ts`

## Proposal flow

- When Copilot advances into `proposal_ready`, the backend now builds a `TravelProposal`.
- The proposal is persisted through the existing project version stack as a `proposed` snapshot using `proposal_summary_json`.
- `/create` now exposes two proposal-stage actions:
  - continue adjusting
  - generate full trip

## Generate connection

- Proposal generation converts accumulated project context into a normalized `TripRequest`.
- The service reuses the existing `planTrip()` pipeline instead of rewriting planner logic.
- Successful generation creates an accepted `TravelProjectVersion`, updates the project to `workspace_ready`, writes `TripRequest` and `TripPlan` into the current workspace storage contract, and redirects into `/workspace`.

## Test coverage

- proposal generation service
- proposal adjusting transition
- proposal API route contract
- create-side proposal client helpers

## Not included

- No Workspace UI redesign
- No planner core rewrite
- No map or visual work
- No new `TripPlan` schema
