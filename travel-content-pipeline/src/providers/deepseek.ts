import type { JsonGenerationInput, LlmProvider } from "../types.js";

const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-chat";

interface DeepSeekChatResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
}

export class DeepSeekProvider implements LlmProvider {
  readonly name = "deepseek";

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY ?? "";
    this.baseUrl = process.env.DEEPSEEK_BASE_URL ?? DEFAULT_BASE_URL;
    this.model = process.env.DEEPSEEK_MODEL ?? DEFAULT_MODEL;

    if (!this.apiKey) {
      throw new Error("Missing DEEPSEEK_API_KEY environment variable.");
    }
  }

  async generateJson(input: JsonGenerationInput): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: input.systemPrompt,
          },
          {
            role: "user",
            content: input.userPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const bodyText = await response.text();
      throw new Error(`DeepSeek request failed with status ${response.status}: ${bodyText}`);
    }

    const payload = (await response.json()) as DeepSeekChatResponse;
    const content = payload.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error(payload.error?.message ?? "DeepSeek returned an empty response.");
    }

    try {
      return JSON.parse(content);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`DeepSeek returned invalid JSON: ${message}`);
    }
  }
}
