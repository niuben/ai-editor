import type { Chapter, NovelChapterPlan, ParsedChapter } from "./types";

export const emptyDoc = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export const initialChapters: Chapter[] = [
  {
    id: "chapter-1",
    title: "第一章：新的开始",
    content: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "这是一个 Tiptap + DeepSeek 的 AI 编辑器 Demo。" }],
        },
      ],
    },
  },
];

export function parseChapters(content: string): ParsedChapter[] {
  const lines = content.split(/\r?\n/);
  const chapters: ParsedChapter[] = [];
  let current: ParsedChapter | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const titleMatch = line.match(
      /^(?:#{1,3}\s*)?((?:第\s*[一二三四五六七八九十百千万\d]+\s*[章节]|Chapter\s+\d+|Section\s+\d+)[:：、.\s-]*(.*))$/i,
    );

    if (titleMatch) {
      if (current) chapters.push(current);
      current = {
        title: titleMatch[1].trim() || `第 ${chapters.length + 1} 章`,
        body: "",
      };
      continue;
    }

    if (current) {
      current.body = current.body ? `${current.body}\n${rawLine}` : rawLine;
    }
  }

  if (current) chapters.push(current);

  return chapters.filter((chapter) => chapter.title || chapter.body.trim());
}

export function textToDoc(text: string): Record<string, unknown> {
  const blocks = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => ({
      type: "paragraph",
      content: [{ type: "text", text: block.replace(/\n/g, " ") }],
    }));

  return {
    type: "doc",
    content: blocks.length ? blocks : [{ type: "paragraph" }],
  };
}

export function novelPlanToDoc(plan: NovelChapterPlan): Record<string, unknown> {
  return textToDoc(typeof plan.content === "string" ? plan.content : "");
}
