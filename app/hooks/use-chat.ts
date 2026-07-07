import type { Editor } from "@tiptap/react";
import type { FormEvent, KeyboardEvent } from "react";
import { useState } from "react";

import { callDeepSeek, getErrorMessage } from "../lib/deepseek";
import { parseManualAction } from "../lib/manual-actions";
import type { Chapter, ChatMessage, ManualAction } from "../lib/types";

type UseChatOptions = {
  activeChapter: Chapter;
  editor: Editor | null;
  applyAssistantContent: (content: string) => void;
  applyManualAction: (action: ManualAction) => number;
};

export function useChat({
  activeChapter,
  editor,
  applyAssistantContent,
  applyManualAction,
}: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "system", content: "右侧可以和 DeepSeek 对话。左侧编辑器里按 Tab 可以尝试自动扩写。" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);

  function pushMessage(message: ChatMessage) {
    setMessages((current) => [...current, message]);
  }

  async function sendMessage(event: KeyboardEvent<HTMLTextAreaElement> | FormEvent) {
    event.preventDefault();
    const text = chatInput.trim();
    if (!text || isChatting) return;

    const nextMessages: ChatMessage[] = [
      ...messages.filter((message) => message.role !== "system"),
      { role: "user", content: text },
    ];

    pushMessage({ role: "user", content: text });
    setChatInput("");
    setIsChatting(true);

    try {
      const content = await callDeepSeek({
        mode: "chat",
        messages: [
          {
            role: "user",
            content: `当前章节：${activeChapter.title}\n\n章节内容：\n${editor?.getText() || ""}`,
          },
          ...nextMessages,
        ],
      });

      const action = parseManualAction(content);

      if (action) {
        const createdCount = applyManualAction(action);
        pushMessage({ role: "assistant", content: `已根据你的需求自动创建 ${createdCount} 个章节。` });
        return;
      }

      pushMessage({ role: "assistant", content });
      applyAssistantContent(content);
    } catch (error) {
      pushMessage({ role: "assistant", content: getErrorMessage(error) });
    } finally {
      setIsChatting(false);
    }
  }

  async function generateManual() {
    const prompt = chatInput.trim();
    if (!prompt || isChatting) return;

    pushMessage({ role: "user", content: prompt });
    setChatInput("");
    setIsChatting(true);

    try {
      const content = await callDeepSeek({
        mode: "manual",
        prompt,
      });
      const action = parseManualAction(content);

      if (!action) {
        pushMessage({ role: "assistant", content: "没有识别到可创建章节的手册结构，请换一种描述再试。" });
        return;
      }

      const createdCount = applyManualAction(action);
      pushMessage({
        role: "assistant",
        content: `已创建 ${createdCount} 个章节，并为每章写入摘要和小节清单。`,
      });
    } catch (error) {
      pushMessage({ role: "assistant", content: getErrorMessage(error) });
    } finally {
      setIsChatting(false);
    }
  }

  return {
    messages,
    chatInput,
    isChatting,
    setChatInput,
    sendMessage,
    generateManual,
    pushMessage,
  };
}
