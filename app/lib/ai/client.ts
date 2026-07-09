import type { LegacyAIRequestBody } from "./legacy-types";

export async function callLegacyAI(payload: LegacyAIRequestBody) {
  const response = await fetch("/api/deepseek", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "AI request failed");
  }

  return data.content as string;
}

export function getAIErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return `AI 请求失败：${error.message}`;
  }

  return "AI 请求失败：未知错误";
}
