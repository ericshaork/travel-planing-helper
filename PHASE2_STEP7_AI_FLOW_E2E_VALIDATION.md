# Phase 2 Step 7 AI Flow End-to-End Validation

## Test Scenarios

### Scenario 1: User does not know the destination

- Input: user message equivalent to "不知道去哪玩"
- Verified:
  - project exists
  - user message is saved
  - assistant message is saved
  - AI response path returns an `unknown_destination` style result
  - action stays in question-guidance mode
  - flow ends at `source_review`

### Scenario 2: User already has a destination

- Input: user message equivalent to "想去云南玩5天"
- Verified:
  - destination-oriented conversation response is accepted
  - flow moves to `clarifying`
  - missing information guidance is preserved through structured response

### Scenario 3: Enough information for proposal

- Input context includes destination, duration, budget, and preference signals
- Verified:
  - conversation response requests proposal creation
  - flow moves to `proposal_ready`
  - assistant message is persisted

### Scenario 4: AI provider failure

- Input uses the same copilot path, but provider throws
- Verified:
  - fallback conversation rules take over
  - messages are still saved
  - flow remains valid and is not corrupted

## Flow Transition Coverage

Validated legal transitions:

- `source_review -> clarifying`
- `clarifying -> proposal_ready`
- `proposal_ready -> proposal_adjusting`
- `proposal_adjusting -> proposal_ready`
- `proposal_adjusting -> generating`
- `generating -> workspace_ready`
- planning stages to `abandoned`

Validated rejected transitions:

- `source_review -> workspace_ready`
- `clarifying -> generating`
- `workspace_ready -> clarifying`
- `abandoned -> source_review`

## Current Phase 2 Completion Scope

Phase 2 backend chain is now validated across:

- Copilot message entry
- Conversation service
- AI provider integration
- Structured response validation
- Flow stage transition
- Project message persistence
- Fallback behavior when provider output fails

## Not Yet Connected

- `/create` frontend flow
- `/workspace` frontend copilot surface
- `/trips` project-aware listing
- final proposal page
- final itinerary generation handoff UI
