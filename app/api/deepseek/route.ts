import { NextResponse } from "next/server";

import { buildMessages, getTemperature } from "./messages";
import type { DeepSeekRequestBody } from "./types";

export async function POST(request: Request) {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing DEEPSEEK_API_KEY. Add it to .env.local first." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as DeepSeekRequestBody;

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
      temperature: getTemperature(body.mode),
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
