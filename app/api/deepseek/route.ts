import { NextResponse } from "next/server";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function POST(request: Request) {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing DEEPSEEK_API_KEY. Add it to .env.local first." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as {
    mode?: "chat" | "expand";
    messages?: ChatMessage[];
    prompt?: string;
    chapterTitle?: string;
    chapterText?: string;
  };

  const messages = buildMessages(body);

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      messages,
      temperature: body.mode === "expand" ? 0.75 : 0.5,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json({ error: errorText }, { status: response.status });
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? "";

  return NextResponse.json({ content });
}

function buildMessages(body: {
  mode?: "chat" | "expand";
  messages?: ChatMessage[];
  prompt?: string;
  chapterTitle?: string;
  chapterText?: string;
}): ChatMessage[] {
  if (body.mode === "expand") {
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

  return [
    {
      role: "system",
      content:
        "你是嵌在写作编辑器右侧的 AI 助手。回答要简洁，优先结合用户当前章节内容，必要时给出可执行的写作建议。",
    },
    ...(body.messages || []),
  ];
}
