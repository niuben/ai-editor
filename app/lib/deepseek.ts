export async function callDeepSeek(payload: Record<string, unknown>) {
  const response = await fetch("/api/deepseek", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "DeepSeek request failed");
  }

  return data.content as string;
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return `AI 请求失败：${error.message}`;
  }

  return "AI 请求失败：未知错误";
}
