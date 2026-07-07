import Placeholder from "@tiptap/extension-placeholder";
import type { Editor } from "@tiptap/react";
import { useEditor as useTiptapEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef, useState } from "react";

import {
  clearGhostSuggestion,
  GhostSuggestion,
  getGhostSuggestion,
  setGhostSuggestion,
} from "../editor/ghost-suggestion";
import { callDeepSeek, getErrorMessage } from "../lib/deepseek";
import { parseChapters, textToDoc } from "../lib/documents";
import type { Chapter } from "../lib/types";

type UseEditorOptions = {
  activeChapter: Chapter;
  updateActiveChapterContent: (content: Record<string, unknown>) => void;
  appendChapters: (chapters: Chapter[]) => void;
};

export function useEditor({
  activeChapter,
  updateActiveChapterContent,
  appendChapters,
}: UseEditorOptions) {
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const editorRef = useRef<Editor | null>(null);

  async function generateGhostSuggestion() {
    const editor = editorRef.current;
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
      setSuggestionError(getErrorMessage(error));
    } finally {
      setIsSuggesting(false);
    }
  }

  function acceptGhostSuggestion() {
    const editor = editorRef.current;
    if (!editor) return;

    const { text, position } = getGhostSuggestion(editor);

    if (!text || position === null) {
      void generateGhostSuggestion();
      return;
    }

    clearGhostSuggestion(editor);
    editor.chain().focus().insertContentAt(position, text).run();
  }

  const editor = useTiptapEditor({
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
        click: () => {
          void generateGhostSuggestion();
          return false;
        },
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      clearGhostSuggestion(currentEditor);
      updateActiveChapterContent(currentEditor.getJSON() as Record<string, unknown>);
    },
    immediatelyRender: false,
  });

  editorRef.current = editor;

  useEffect(() => {
    if (!editor || !activeChapter) return;

    const current = JSON.stringify(editor.getJSON());
    const next = JSON.stringify(activeChapter.content);
    if (current !== next) {
      editor.commands.setContent(activeChapter.content);
    }
    clearGhostSuggestion(editor);
  }, [activeChapter, editor]);

  function applyAssistantContent(content: string) {
    if (!editor) return;

    const parsedChapters = parseChapters(content);

    if (parsedChapters.length > 1) {
      const now = Date.now();
      const newChapters = parsedChapters.map((chapter, index) => ({
        id: `chapter-${now}-${index}`,
        title: chapter.title,
        content: textToDoc(chapter.body),
      }));

      appendChapters(newChapters);
      return;
    }

    const singleChapter = parsedChapters[0];
    const textToInsert = singleChapter ? `${singleChapter.title}\n\n${singleChapter.body}` : content;
    clearGhostSuggestion(editor);
    editor.chain().focus().insertContent(textToInsert).run();
  }

  return {
    editor,
    isSuggesting,
    suggestionError,
    clearSuggestionError: () => setSuggestionError(null),
    generateGhostSuggestion,
    applyAssistantContent,
  };
}
