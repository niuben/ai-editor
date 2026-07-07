"use client";

import { useEffect } from "react";

import { ChapterSidebar } from "./components/chapter-sidebar";
import { ChatPanel } from "./components/chat-panel";
import { EditorPanel } from "./components/editor-panel";
import { useChapters } from "./hooks/use-chapters";
import { useChat } from "./hooks/use-chat";
import { useEditor } from "./hooks/use-editor";

export default function Home() {
  const {
    chapters,
    activeChapter,
    activeChapterId,
    setActiveChapterId,
    updateChapterTitle,
    updateActiveChapterContent,
    addChapter,
    appendChapters,
    applyManualAction,
  } = useChapters();

  const editorState = useEditor({
    activeChapter,
    updateActiveChapterContent,
    appendChapters,
  });

  const chatState = useChat({
    activeChapter,
    editor: editorState.editor,
    applyAssistantContent: editorState.applyAssistantContent,
    applyManualAction,
  });

  useEffect(() => {
    if (!editorState.suggestionError) return;

    chatState.pushMessage({ role: "assistant", content: editorState.suggestionError });
    editorState.clearSuggestionError();
  }, [chatState, editorState]);

  return (
    <main className="app-shell">
      <ChapterSidebar
        activeChapterId={activeChapterId}
        chapters={chapters}
        onAddChapter={addChapter}
        onSelectChapter={setActiveChapterId}
      />

      <EditorPanel
        activeChapter={activeChapter}
        editor={editorState.editor}
        isSuggesting={editorState.isSuggesting}
        onGenerateGhostSuggestion={() => void editorState.generateGhostSuggestion()}
        onUpdateChapterTitle={updateChapterTitle}
      />

      <ChatPanel
        chatInput={chatState.chatInput}
        isChatting={chatState.isChatting}
        messages={chatState.messages}
        onChangeChatInput={chatState.setChatInput}
        onGenerateManual={() => void chatState.generateManual()}
        onSendMessage={chatState.sendMessage}
      />
    </main>
  );
}
