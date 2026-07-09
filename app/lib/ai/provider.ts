import { AIProviderError } from "./errors";
import type { AICompletionInput, AIModelProvider } from "./types";

class DeepSeekProvider implements AIModelProvider {
  async complete(input: AICompletionInput) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new AIProviderError("UNKNOWN", "Missing DEEPSEEK_API_KEY. Add it to .env.local first.");
    }

    console.log("DeepSeekProvider: Sending request to DeepSeek API with input:", input);
    const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: input.messages,
        temperature: input.temperature ?? 0.45,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new AIProviderError(response.status === 429 ? "RATE_LIMITED" : "UNKNOWN", errorText);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "";
    console.log("DeepSeekProvider: Received response from DeepSeek API:", data);
    if (!content) {
      throw new AIProviderError("EMPTY_RESPONSE", "Model returned an empty response.");
    }

    return {
      content,
      provider: "deepseek",
      model,
    };
  }
}

export function getAIProvider(): AIModelProvider {
  return new DeepSeekProvider();
}
