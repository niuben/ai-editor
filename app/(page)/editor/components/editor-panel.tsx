import { EditorContent } from "@tiptap/react";
import type { Editor } from "@tiptap/react";

import type { Chapter } from "@/app/lib/types";

type EditorPanelProps = {
  editor: Editor | null;
  activeChapter: Chapter;
  isSuggesting: boolean;
  onUpdateChapterTitle: (title: string) => void;
  onGenerateGhostSuggestion: () => void;
};

export function EditorPanel({
  editor,
  activeChapter,
  isSuggesting,
  onUpdateChapterTitle,
  onGenerateGhostSuggestion,
}: EditorPanelProps) {
  return (
    <section className="panel editor-panel">
      {editor && <EditorToolbar editor={editor} />}
      <div className="document-stage">
        <article className="document-page">
          <input
            aria-label="章节标题"
            className="chapter-name-input"
            onChange={(event) => onUpdateChapterTitle(event.target.value)}
            value={activeChapter.title}
          />
          <div className="editor-wrap">{editor && <EditorContent editor={editor} />}</div>
          <div className="floating-ai-note">
            <span className="sparkle">✧</span>
            <span>
              {isSuggesting
                ? "AI is writing a ghost suggestion..."
                : "Focus editor to preview AI expansion. Press Tab to accept."}
            </span>
          </div>
        </article>
        <button className="side-ai-orb" onClick={onGenerateGhostSuggestion} type="button">
          ◒
        </button>
      </div>
    </section>
  );
}

function EditorToolbar({ editor }: { editor: Editor }) {
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
