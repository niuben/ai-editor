import type {
  Chapter,
  ChapterDraft,
  GenerateNovelPlanInput,
  Novel,
  NovelPlan,
} from "@/app/lib/novels/types";
import { AIProviderError } from "../errors";
import { parseJsonObject } from "../json";
import { buildChapterWriterMessages } from "../messages/chapter-writer";
import { buildNovelPlanMessages } from "../messages/novel-plan";
import { CHAPTER_WRITER_PROMPT_VERSION } from "../prompts/chapter-writer";
import { NOVEL_PLAN_PROMPT_VERSION } from "../prompts/novel-plan";
import { getAIProvider } from "../provider";

export async function generateNovelPlan(input: GenerateNovelPlanInput) {
  const provider = getAIProvider();
  const result = await provider.complete({
    messages: buildNovelPlanMessages(input),
    temperature: 0.4,
    responseFormat: "json",
  });
  const plan = parseJsonObject<NovelPlan>(result.content);

  if (!plan.title || !Array.isArray(plan.chapters) || !plan.chapters.length) {
    throw new AIProviderError("SCHEMA_VALIDATION_FAILED", "Novel plan missing title or chapters.");
  }

  return {
    plan: {
      ...plan,
      chapters: plan.chapters.map((chapter, index) => ({
        order: Number(chapter.order) || index + 1,
        title: chapter.title || `第 ${index + 1} 章`,
        brief: chapter.brief || "待补充。",
      })),
    },
    meta: {
      provider: result.provider,
      model: result.model,
      promptVersion: NOVEL_PLAN_PROMPT_VERSION,
      temperature: 0.4,
    },
  };
}

export async function generateChapterContent(input: {
  novel: Novel;
  chapters: Chapter[];
  chapter: Chapter;
  previousContext?: string;
  targetWordCount?: number;
}) {
  const provider = getAIProvider();
  const result = await provider.complete({
    messages: buildChapterWriterMessages(input),
    temperature: 0.65,
    responseFormat: "json",
  });
  const draft = parseJsonObject<ChapterDraft>(result.content);

  if (!draft.title || !draft.content) {
    throw new AIProviderError("SCHEMA_VALIDATION_FAILED", "Chapter draft missing title or content.");
  }

  return {
    draft,
    meta: {
      provider: result.provider,
      model: result.model,
      promptVersion: CHAPTER_WRITER_PROMPT_VERSION,
      temperature: 0.65,
    },
  };
}
