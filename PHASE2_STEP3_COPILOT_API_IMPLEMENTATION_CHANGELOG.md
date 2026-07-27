# Phase 2 Step 3 Copilot API Implementation Changelog

## Added Files

- `app/api/projects/[projectId]/copilot/route.ts`
- `lib/projects/copilot/copilot-types.ts`
- `lib/projects/copilot/copilot-service.ts`
- `tests/projects/copilot.test.ts`

## API Surface

- `POST /api/projects/[projectId]/copilot`

Request body:

```json
{
  "message": "string"
}
```

Behavior:

- Validates `projectId`
- Validates `message`
- Saves the user message to `travel_project_messages`
- Reads the current project flow stage
- Uses `FlowService` to advance or resume the flow when needed
- Generates a placeholder assistant reply
- Saves the assistant reply
- Returns `success`, `reply`, `stage`, and `projectId`

## Service Responsibilities

`lib/projects/copilot/copilot-service.ts` is responsible for:

- Checking that the project exists
- Persisting the incoming user message
- Moving `source_received` to `source_review`
- Resuming abandoned flows before replying
- Generating a stage-aware placeholder reply
- Persisting the assistant reply

## Test Coverage

`tests/projects/copilot.test.ts` covers:

- Normal message flow
- Empty message validation
- Missing project handling

## Not Yet Connected

- `/create`
- `/plan`
- `/workspace`
- `/trips`
- `generate-trip`
- Planner logic
- Prompt layer
- LLM integration
- UI components
