import type { ChatMessage, DeepSeekRequestBody, PlanStep } from "./types";

const planStepPrompts: Record<PlanStep, string> = {
  characters_plot:
    "基于一句话故事，生成主要角色设定和核心情节推进。包含主角、关键配角、反派或阻力、人物关系、三到五个关键情节点。输出中文正文，不要 Markdown 表格，不要 JSON。",
  worldview:
    "基于已有故事、角色和情节，生成小说世界观。包含时代/地点、社会规则、关键组织或势力、核心矛盾来源、日常质感和限制条件。输出中文正文，不要 Markdown 表格，不要 JSON。",
  style:
    "基于已有故事上下文，生成小说整体风格。包含叙事视角、文笔气质、节奏、语言密度、对话风格、氛围关键词和应避免的写法。输出中文正文，不要 Markdown 表格，不要 JSON。",
};

export function buildMessages(body: DeepSeekRequestBody): ChatMessage[] {
  if (body.mode === "expand") return buildExpandMessages(body);
  if (body.mode === "novel") return buildNovelMessages(body);
  if (body.mode === "plan_step") return buildPlanStepMessages(body);

  return buildChatMessages(body);
}

export function getTemperature(mode: DeepSeekRequestBody["mode"]) {
  return mode === "expand" ? 0.75 : 0.45;
}

function buildExpandMessages(body: DeepSeekRequestBody): ChatMessage[] {
  return [
    {
      role: "system",
      content:
        "你是一个中文写作助手。根据当前章节和光标附近上下文，续写一小段自然、可直接插入编辑器的内容。只返回续写正文，不要解释。",
    },
    {
      role: "user",
      content: `章节标题：${body.chapterTitle || "未命名章节"}\n\n当前章节内容：\n${body.chapterText || ""}\n\n续写要求：${body.prompt || "从光标位置自然扩写下一段。"}`,
    },
  ];
}

function buildNovelMessages(body: DeepSeekRequestBody): ChatMessage[] {
  return [
    {
      role: "system",
      content:
        `你是一位小说作家。你必须只返回严格 JSON，不要 Markdown，不要解释。JSON 格式必须是：{"type":"create_novel","payload":{"title":"小说标题","chapters":[{"title":"章节标题","content":"本章节内容"}]}}。章节数量根据用户需求决定。如果用户提供了故事前提、角色情节、世界观和文笔风格，必须全部纳入最终小说。`,
    },
    {
      role: "user",
      content: body.prompt || "",
    },
  ];
}

function buildPlanStepMessages(body: DeepSeekRequestBody): ChatMessage[] {
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
      content:
        "你是小说策划助手。你负责把用户的简短创意逐步扩展成可用于最终生成小说的上下文。回答要具体、可执行、适合直接作为后续大模型生成小说的设定材料。",
    },
    {
      role: "user",
      content: `${previousContext}\n\n当前任务：${planStepPrompts[body.step || "characters_plot"]}`,
    },
  ];
}

function buildChatMessages(body: DeepSeekRequestBody): ChatMessage[] {
  return [
    {
      role: "system",
      content:
        '你是嵌在写作编辑器右侧的 AI 小说创作助手。回答要简洁，优先结合用户当前章节内容，必要时给出可执行的写作建议。如果用户明确要求生成一本完整小说、创建小说目录或新增章节，优先返回严格 JSON 动作，不要 Markdown，不要解释。创建完整小说用格式：{"type":"create_novel","payload":{"title":"小说标题","chapters":[{"title":"章节标题","content":"本章节内容"}]}}。只新增单章用格式：{"type":"create_chapter","payload":{"title":"章节标题","content":"本章节内容"}}。',
    },
    ...(body.messages || []),
  ];
}
