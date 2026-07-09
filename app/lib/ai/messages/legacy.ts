import type { AIMessage } from "../types";
import type { LegacyAIRequestBody } from "../legacy-types";
import {
  LEGACY_CHAT_SYSTEM_PROMPT,
  LEGACY_EXPAND_SYSTEM_PROMPT,
  LEGACY_NOVEL_SYSTEM_PROMPT,
  LEGACY_PLAN_STEP_SYSTEM_PROMPT,
  planStepPrompts,
} from "../prompts/legacy";

export function buildLegacyMessages(body: LegacyAIRequestBody): AIMessage[] {
  if (body.mode === "expand") return buildExpandMessages(body);
  if (body.mode === "novel") return buildNovelMessages(body);
  if (body.mode === "plan_step") return buildPlanStepMessages(body);

  return buildChatMessages(body);
}

export function getLegacyTemperature(mode: LegacyAIRequestBody["mode"]) {
  return mode === "expand" ? 0.75 : 0.45;
}

function buildExpandMessages(body: LegacyAIRequestBody): AIMessage[] {
  return [
    {
      role: "system",
      content: LEGACY_EXPAND_SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: `章节标题：${body.chapterTitle || "未命名章节"}\n\n当前章节内容：\n${body.chapterText || ""}\n\n续写要求：${body.prompt || "从光标位置自然扩写下一段。"}`,
    },
  ];
}

function buildNovelMessages(body: LegacyAIRequestBody): AIMessage[] {
  return [
    {
      role: "system",
      content: LEGACY_NOVEL_SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: body.prompt || "",
    },
  ];
}

function buildPlanStepMessages(body: LegacyAIRequestBody): AIMessage[] {
  const premise = body.context?.premise || body.prompt || "";
  const previousContext = [
    `一句话故事：${premise}`,
    body.context?.charactersPlot ? `角色和情节：\n${body.context.charactersPlot}` : "",
    body.context?.worldview ? `世界观：\n${body.context.worldview}` : "",
    body.context?.style ? `整体风格：\n${body.context.style}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return [
    {
      role: "system",
      content: LEGACY_PLAN_STEP_SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: `${previousContext}\n\n当前任务：${planStepPrompts[body.step || "characters_plot"]}`,
    },
  ];
}

function buildChatMessages(body: LegacyAIRequestBody): AIMessage[] {
  return [
    {
      role: "system",
      content: LEGACY_CHAT_SYSTEM_PROMPT,
    },
    ...(body.messages || []),
  ];
}
