import type { AIConversationResponse } from "../../projects/conversation/ai-response-schema";
import type { ConversationContext } from "../../projects/conversation/conversation-types";

export interface ConversationProviderInput {
  message: string;
  context: ConversationContext;
  systemPrompt: string;
  userPrompt: string;
}

export interface AIProvider {
  readonly providerName: string;
  generateConversationResponse(
    input: ConversationProviderInput,
  ): Promise<AIConversationResponse | unknown>;
}
