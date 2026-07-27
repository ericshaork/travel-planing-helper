# Phase 3 Step 1 Create Flow Project Changelog

## Modified Files

- `components/trip/NaturalLanguageInput.tsx`
- `lib/projects/create-flow-client.ts`
- `tests/create-flow.test.ts`

## Create Flow Changes

- The `/create` AI entry now submits through a dedicated client helper.
- On first successful submit, the flow still calls `/api/parse-trip` and preserves the existing `/plan` handoff.
- When a browser access token is available, the same submit now also:
  - creates a `TravelProject`
  - saves the initial source as `blank_input`
  - initializes the project flow at `source_received`
  - calls the Copilot bootstrap step
  - stores `projectId` and `flowStage` in project session storage

## Compatibility Strategy

- Old `TripRequest` / `TripPlan` flow is preserved.
- `/plan` still reads from parsed trip session just like before.
- If no auth token is available, the helper skips project creation and continues the old flow.
- `generate-trip` and planner logic were not changed.

## Test Coverage

- project creation after first create submit
- source payload included in project creation request
- flow stage persisted from copilot bootstrap
- legacy parse-to-plan path still works without auth
