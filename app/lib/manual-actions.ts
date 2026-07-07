import type { ManualAction } from "./types";

export function parseManualAction(content: string): ManualAction | null {
  const jsonText = extractJson(content);
  if (!jsonText) return null;

  try {
    const parsed = JSON.parse(jsonText) as ManualAction;
    if (parsed?.type === "create_manual" && Array.isArray(parsed.payload?.chapters)) {
      return parsed;
    }

    if (parsed?.type === "create_chapter" && typeof parsed.payload?.title === "string") {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

function extractJson(content: string) {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  return content.slice(start, end + 1);
}
