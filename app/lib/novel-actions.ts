import type { NovelAction } from "./types";

export function parseNovelAction(content: string): NovelAction | null {
  const jsonText = extractJson(content);
  if (!jsonText) return null;

  try {
    const parsed = JSON.parse(jsonText) as NovelAction;
    if (
      parsed?.type === "create_novel" &&
      Array.isArray(parsed.payload?.chapters) &&
      parsed.payload.chapters.every(isNovelChapterPlan)
    ) {
      return parsed;
    }

    if (parsed?.type === "create_chapter" && isNovelChapterPlan(parsed.payload)) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

function isNovelChapterPlan(value: unknown) {
  if (!value || typeof value !== "object") return false;

  const plan = value as Record<string, unknown>;
  return typeof plan.title === "string" && typeof plan.content === "string";
}

function extractJson(content: string) {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  return content.slice(start, end + 1);
}
