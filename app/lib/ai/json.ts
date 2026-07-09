import { AIProviderError } from "./errors";

export function parseJsonObject<T>(content: string): T {
  const jsonText = extractJson(content);
  if (!jsonText) {
    throw new AIProviderError("INVALID_JSON", "Model response did not contain a JSON object.");
  }

  try {
    return JSON.parse(jsonText) as T;
  } catch {
    throw new AIProviderError("INVALID_JSON", "Model response contained invalid JSON.");
  }
}

function extractJson(content: string) {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  return content.slice(start, end + 1);
}
