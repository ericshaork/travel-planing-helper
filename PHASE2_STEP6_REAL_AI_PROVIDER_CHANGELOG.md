# Phase 2 Step 6 Real AI Provider Integration Changelog

## Added Files

- `lib/ai/provider/providers/openai-compatible-conversation-provider.ts`
- `tests/ai/conversation-provider.test.ts`
- `PHASE2_STEP6_REAL_AI_PROVIDER_CHANGELOG.md`

## Updated Files

- `lib/ai/provider/provider.ts`
- `lib/ai/client.ts`
- `lib/utils/env.ts`
- `lib/projects/conversation/conversation-service.ts`
- `lib/projects/conversation/prompts/base-prompt.ts`
- `tests/projects/conversation.test.ts`
- `tests/projects/copilot.test.ts`
- `tests/utils/env.test.ts`
- `.env.example`

## Current Real Provider

- Real conversation AI now uses an OpenAI-compatible chat completions transport.
- `AI_PROVIDER=qwen` and `AI_PROVIDER=deepseek` are supported through the same provider implementation.
- `AI_PROVIDER=openai-compatible` is also supported for generic compatible endpoints.

## Provider Switching

- Mock mode: `USE_MOCK_AI=true` or `AI_PROVIDER=mock`
- Qwen: `USE_MOCK_AI=false` and `AI_PROVIDER=qwen`
- DeepSeek: `USE_MOCK_AI=false` and `AI_PROVIDER=deepseek`
- Generic compatible endpoint: `USE_MOCK_AI=false` and `AI_PROVIDER=openai-compatible`
- Runtime config priority: `AI_*` first, then `LLM_*` fallback

## Structured Output Handling

- Real provider responses are parsed as JSON from the model output
- `ConversationService` validates responses with `AIConversationResponse` Zod schema
- Invalid or failed provider responses fall back to the existing rule-based logic

## Not Changed

- No UI changes
- No create/workspace/trips integration changes
- No changes to `generate-trip` flow semantics
- No planner changes
