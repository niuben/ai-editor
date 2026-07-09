import type { GenerateNovelPlanInput } from "@/app/lib/novels/types";
import type { AIMessage } from "../types";
import { NOVEL_PLAN_SYSTEM_PROMPT } from "../prompts/novel-plan";

export function buildNovelPlanMessages(input: GenerateNovelPlanInput): AIMessage[] {
  return [
    {
      role: "system",
      content: NOVEL_PLAN_SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: [
        `用户需求：${input.prompt}`,
        `目标章节数：${input.chapterCount || "根据故事需要决定，默认 6 章"}`,
        `语言：${input.language || "zh-CN"}`,
        input.genre ? `题材：${input.genre}` : "",
        input.style ? `风格：${input.style}` : "",
        input.targetWordCountPerChapter ? `每章目标字数：${input.targetWordCountPerChapter}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ];
}
