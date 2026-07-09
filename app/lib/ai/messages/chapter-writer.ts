import type { Chapter, Novel } from "@/app/lib/novels/types";
import type { AIMessage } from "../types";
import { CHAPTER_WRITER_SYSTEM_PROMPT } from "../prompts/chapter-writer";

export function buildChapterWriterMessages(input: {
  novel: Novel;
  chapters: Chapter[];
  chapter: Chapter;
  previousContext?: string;
  targetWordCount?: number;
}): AIMessage[] {
  const outline = input.chapters
    .map((chapter) => `${chapter.order}. ${chapter.title}${chapter.brief ? `：${chapter.brief}` : ""}`)
    .join("\n");

  return [
    {
      role: "system",
      content: CHAPTER_WRITER_SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: [
        `小说标题：${input.novel.title}`,
        input.novel.description ? `小说简介：${input.novel.description}` : "",
        input.novel.genre ? `题材：${input.novel.genre}` : "",
        input.novel.style ? `风格：${input.novel.style}` : "",
        `语言：${input.novel.language}`,
        `完整章节计划：\n${outline}`,
        `当前章节：第 ${input.chapter.order} 章 ${input.chapter.title}`,
        input.chapter.brief ? `当前章节概要：${input.chapter.brief}` : "",
        input.previousContext ? `前文上下文：\n${input.previousContext}` : "",
        input.targetWordCount ? `目标字数：${input.targetWordCount}` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
    },
  ];
}
