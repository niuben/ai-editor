"use client";

import Placeholder from "@tiptap/extension-placeholder";
import { Extension } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";

type Chapter = {
  id: string;
  title: string;
  content: Record<string, unknown>;
};

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type GhostSuggestionStorage = {
  text: string;
  position: number | null;
};

const emptyDoc = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

const initialChapters: Chapter[] = [
  {
    id: "chapter-1",
    title: "第一章：新的开始",
    content: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "这是一个 Tiptap + DeepSeek 的 AI 编辑器 Demo。" }],
        },
      ],
    },
  },
];

const ghostSuggestionKey = new PluginKey("ghostSuggestion");

const GhostSuggestion = Extension.create<unknown, GhostSuggestionStorage>({
  name: "ghostSuggestion",

  addStorage() {
    return {
      text: "",
      position: null,
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: ghostSuggestionKey,
        props: {
          decorations: ({ doc }) => {
            const { position, text } = this.storage;

            if (!text || position === null || position > doc.content.size) {
              return DecorationSet.empty;
            }

            return DecorationSet.create(doc, [
              Decoration.widget(position, () => {
                const span = document.createElement("span");
                span.className = "ghost-suggestion";
                span.textContent = text;
                return span;
              }),
            ]);
          },
        },
      }),
    ];
  },
});

export default function Home() {
  const [chapters, setChapters] = useState<Chapter[]>(initialChapters);
  const [activeChapterId, setActiveChapterId] = useState(initialChapters[0].id);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "system", content: "右侧可以和 DeepSeek 对话。左侧编辑器里按 Tab 可以尝试自动扩写。" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const requestIdRef = useRef(0);

  const activeChapter = useMemo(
    () => chapters.find((chapter) => chapter.id === activeChapterId) || chapters[0],
    [activeChapterId, chapters],
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      GhostSuggestion,
      Placeholder.configure({
        placeholder: "开始写作。聚焦后 AI 会自动生成浅色扩写，按 Tab 接受...",
      }),
    ],
    content: activeChapter.content,
    editorProps: {
      attributes: {
        spellcheck: "false",
      },
      handleKeyDown: (_view, event) => {
        if (event.key === "Tab") {
          event.preventDefault();
          acceptGhostSuggestion();
          return true;
        }

        return false;
      },
      handleDOMEvents: {
        focus: () => {
          void generateGhostSuggestion();
          return false;
        },
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      clearGhostSuggestion(currentEditor);
      const json = currentEditor.getJSON() as Record<string, unknown>;
      setChapters((current) =>
        current.map((chapter) =>
          chapter.id === activeChapterId ? { ...chapter, content: json } : chapter,
        ),
      );
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor || !activeChapter) return;

    const current = JSON.stringify(editor.getJSON());
    const next = JSON.stringify(activeChapter.content);
    if (current !== next) {
      editor.commands.setContent(activeChapter.content);
    }
    clearGhostSuggestion(editor);
  }, [activeChapter, editor]);

  function updateChapterTitle(title: string) {
    setChapters((current) =>
      current.map((chapter) => (chapter.id === activeChapterId ? { ...chapter, title } : chapter)),
    );
  }

  function addChapter() {
    const nextIndex = chapters.length + 1;
    const chapter: Chapter = {
      id: `chapter-${Date.now()}`,
      title: `第 ${nextIndex} 章`,
      content: emptyDoc,
    };

    setChapters((current) => [...current, chapter]);
    setActiveChapterId(chapter.id);
  }

  async function generateGhostSuggestion() {
    if (!editor || isSuggesting) return;

    clearGhostSuggestion(editor);
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const position = editor.state.selection.from;

    setIsSuggesting(true);
    try {
      const content = await callDeepSeek({
        mode: "expand",
        chapterTitle: activeChapter.title,
        chapterText: editor.getText(),
        prompt: "请从当前光标位置继续扩写 1 到 2 句，保持中文表达自然。",
      });

      if (content && requestId === requestIdRef.current) {
        setGhostSuggestion(editor, content, position);
      }
    } catch (error) {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: getErrorMessage(error) },
      ]);
    } finally {
      setIsSuggesting(false);
    }
  }

  function acceptGhostSuggestion() {
    if (!editor) return;

    const storage = editor.storage.ghostSuggestion as GhostSuggestionStorage;
    const text = storage.text;
    const position = storage.position;

    if (!text || position === null) {
      void generateGhostSuggestion();
      return;
    }

    clearGhostSuggestion(editor);
    editor.chain().focus().insertContentAt(position, text).run();
  }

  async function sendMessage(event: KeyboardEvent<HTMLTextAreaElement> | React.FormEvent) {
    event.preventDefault();
    const text = chatInput.trim();
    if (!text || isChatting) return;

    const nextMessages: ChatMessage[] = [
      ...messages.filter((message) => message.role !== "system"),
      { role: "user", content: text },
    ];

    setMessages((current) => [...current, { role: "user", content: text }]);
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

      setMessages((current) => [...current, { role: "assistant", content }]);
    } catch (error) {
      setMessages((current) => [...current, { role: "assistant", content: getErrorMessage(error) }]);
    } finally {
      setIsChatting(false);
    }
  }

  return (
    <main className="app-shell">
      <aside className="panel chapters">
        <div className="brand">
          <p className="brand-kicker">AI Writer</p>
          <h1>章节</h1>
        </div>

        <p className="section-label">Chapter List</p>
        <ul className="chapter-list">
          {chapters.map((chapter, index) => (
            <li key={chapter.id}>
              <button
                className={`chapter-button ${chapter.id === activeChapterId ? "active" : ""}`}
                onClick={() => setActiveChapterId(chapter.id)}
                type="button"
              >
                <span className="chapter-title">{chapter.title || "未命名章节"}</span>
                <span className="chapter-meta">第 {index + 1} 章</span>
              </button>
            </li>
          ))}
        </ul>
        <button className="add-chapter" onClick={addChapter} type="button">
          + 添加章节
        </button>
      </aside>

      <section className="panel editor-panel">
        {editor && <EditorToolbar editor={editor} />}
        <div className="document-stage">
          <article className="document-page">
          <input
            aria-label="章节标题"
            className="chapter-name-input"
            onChange={(event) => updateChapterTitle(event.target.value)}
            value={activeChapter.title}
          />
          <div className="editor-wrap">{editor && <EditorContent editor={editor} />}</div>
          <div className="floating-ai-note">
            <span className="sparkle">✧</span>
            <span>{isSuggesting ? "AI is writing a ghost suggestion..." : "Focus editor to preview AI expansion. Press Tab to accept."}</span>
          </div>
          </article>
          <button className="side-ai-orb" onClick={() => void generateGhostSuggestion()} type="button">
            ◒
          </button>
        </div>
      </section>

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

        <form className="chat-form" onSubmit={sendMessage}>
          <textarea
            onChange={(event) => setChatInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                void sendMessage(event);
              }
            }}
            placeholder="问 AI：帮我总结本章，或者继续扩写主角的冲突..."
            value={chatInput}
          />
          <button disabled={isChatting || !chatInput.trim()} type="submit">
            发送 Cmd/Ctrl + Enter
          </button>
        </form>
      </aside>
    </main>
  );
}

function EditorToolbar({ editor }: { editor: NonNullable<ReturnType<typeof useEditor>> }) {
  return (
    <div className="toolbar" aria-label="编辑格式工具栏">
      <button type="button" disabled>
        ↶
      </button>
      <button type="button" disabled>
        ↷
      </button>
      <span className="toolbar-divider" />
      <button type="button" disabled>
        −
      </button>
      <span className="zoom-label">100%</span>
      <button type="button" disabled>
        +
      </button>
      <span className="toolbar-divider" />
      <button
        className={editor.isActive("heading", { level: 1 }) ? "active" : ""}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        type="button"
      >
        H⌄
      </button>
      <button
        className={editor.isActive("bold") ? "active" : ""}
        onClick={() => editor.chain().focus().toggleBold().run()}
        type="button"
      >
        加粗
      </button>
      <button
        className={editor.isActive("italic") ? "active" : ""}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        type="button"
      >
        I
      </button>
      <button type="button" disabled>
        S
      </button>
      <button type="button" disabled>
        U
      </button>
      <button
        className={editor.isActive("bulletList") ? "active" : ""}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        type="button"
      >
        ☷
      </button>
      <button
        className={editor.isActive("orderedList") ? "active" : ""}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        type="button"
      >
        ≡
      </button>
      <button
        className={editor.isActive("blockquote") ? "active" : ""}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        type="button"
      >
        ☰
      </button>
      <button type="button" disabled>
        ⇱
      </button>
    </div>
  );
}

function setGhostSuggestion(
  editor: NonNullable<ReturnType<typeof useEditor>>,
  text: string,
  position: number,
) {
  const storage = editor.storage.ghostSuggestion as GhostSuggestionStorage;
  storage.text = text;
  storage.position = position;
  editor.view.dispatch(editor.state.tr.setMeta(ghostSuggestionKey, Date.now()));
}

function clearGhostSuggestion(editor: NonNullable<ReturnType<typeof useEditor>>) {
  const storage = editor.storage.ghostSuggestion as GhostSuggestionStorage | undefined;
  if (!storage?.text) return;

  storage.text = "";
  storage.position = null;
  editor.view.dispatch(editor.state.tr.setMeta(ghostSuggestionKey, Date.now()));
}

async function callDeepSeek(payload: Record<string, unknown>) {
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

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return `AI 请求失败：${error.message}`;
  }

  return "AI 请求失败：未知错误";
}
