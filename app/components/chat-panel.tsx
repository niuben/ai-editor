import type { FormEvent, KeyboardEvent } from "react";

import type { ChatMessage } from "../lib/types";

type ChatPanelProps = {
  messages: ChatMessage[];
  chatInput: string;
  isChatting: boolean;
  onChangeChatInput: (value: string) => void;
  onSendMessage: (event: KeyboardEvent<HTMLTextAreaElement> | FormEvent) => void;
  onGenerateManual: () => void;
};

export function ChatPanel({
  messages,
  chatInput,
  isChatting,
  onChangeChatInput,
  onSendMessage,
  onGenerateManual,
}: ChatPanelProps) {
  return (
    <aside className="panel chat-panel">
      <header className="chat-header">
        <h2>AI Chatbot</h2>
        <p>对话会携带当前章节标题和正文。可以让它总结、改写、生成大纲或给出续写方向。</p>
      </header>

      <div className="messages">
        {messages.map((message, index) => (
          <div className={`message ${message.role}`} key={`${message.role}-${index}`}>
            {message.content}
          </div>
        ))}
        {isChatting && <div className="message assistant">DeepSeek 思考中...</div>}
      </div>

      <form className="chat-form" onSubmit={onSendMessage}>
        <textarea
          onChange={(event) => onChangeChatInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              onSendMessage(event);
            }
          }}
          placeholder="问 AI：帮我总结本章，或者继续扩写主角的冲突..."
          value={chatInput}
        />
        <button disabled={isChatting || !chatInput.trim()} type="submit">
          发送 Cmd/Ctrl + Enter
        </button>
        <button
          className="manual-generate-button"
          disabled={isChatting || !chatInput.trim()}
          onClick={onGenerateManual}
          type="button"
        >
          生成手册并创建章节
        </button>
      </form>
    </aside>
  );
}
