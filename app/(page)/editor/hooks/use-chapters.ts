import { useMemo, useState } from "react";

import { emptyDoc, initialChapters, novelPlanToDoc } from "../../../lib/documents";
import type { Chapter, NovelAction } from "../../../lib/types";

export function useChapters() {
  const [chapters, setChapters] = useState<Chapter[]>(initialChapters);
  const [activeChapterId, setActiveChapterId] = useState(initialChapters[0].id);

  const activeChapter = useMemo(
    () => chapters.find((chapter) => chapter.id === activeChapterId) || chapters[0],
    [activeChapterId, chapters],
  );

  function updateChapterTitle(title: string) {
    setChapters((current) =>
      current.map((chapter) => (chapter.id === activeChapterId ? { ...chapter, title } : chapter)),
    );
  }

  function updateActiveChapterContent(content: Record<string, unknown>) {
    setChapters((current) =>
      current.map((chapter) =>
        chapter.id === activeChapterId ? { ...chapter, content } : chapter,
      ),
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

  function appendChapters(newChapters: Chapter[]) {
    if (!newChapters.length) return;

    setChapters((current) => [...current, ...newChapters]);
    setActiveChapterId(newChapters[0].id);
  }

  function applyNovelAction(action: NovelAction) {
    const plans = action.type === "create_novel" ? action.payload.chapters : [action.payload];
    const validPlans = plans.filter((plan) => typeof plan.title === "string" && plan.title.trim());

    if (!validPlans.length) return 0;

    const now = Date.now();
    const newChapters = validPlans.map((plan, index) => ({
      id: `chapter-${now}-${index}`,
      title: plan.title.trim(),
      content: novelPlanToDoc(plan),
    }));

    appendChapters(newChapters);
    return newChapters.length;
  }

  return {
    chapters,
    activeChapter,
    activeChapterId,
    setActiveChapterId,
    updateChapterTitle,
    updateActiveChapterContent,
    addChapter,
    appendChapters,
    applyNovelAction,
  };
}
