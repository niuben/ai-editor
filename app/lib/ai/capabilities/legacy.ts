import type { LegacyAIRequestBody } from "../legacy-types";
import { buildLegacyMessages, getLegacyTemperature } from "../messages/legacy";
import { getLegacyPromptVersion } from "../prompts/legacy";
import { getAIProvider } from "../provider";

export async function runLegacyAIRequest(body: LegacyAIRequestBody) {
  const provider = getAIProvider();
  const temperature = getLegacyTemperature(body.mode);
  const result = await provider.complete({
    messages: buildLegacyMessages(body),
    temperature,
    responseFormat: body.mode === "novel" ? "json" : "text",
  });

  return {
    content: result.content,
    meta: {
      provider: result.provider,
      model: result.model,
      temperature,
      promptVersion: getLegacyPromptVersion(body.mode),
    },
  };
}
