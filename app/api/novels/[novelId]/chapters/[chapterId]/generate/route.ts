import { NextResponse } from "next/server";

import { generateChapterContent } from "@/app/lib/ai/capabilities/novel-generation";
import {
  completeChapterWithVersion,
  failJobForNovel,
  getChapter,
  getNovel,
  listChapters,
  updateChapterStatus,
  updateJobProgressForChapter,
} from "@/app/lib/novels/memory-store";

export async function POST(
  request: Request,
  { params }: { params: { novelId: string; chapterId: string } },
) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      targetWordCount?: number;
    };
    const novel = getNovel(params.novelId);
    const chapter = getChapter(params.chapterId);

    if (!novel) {
      return NextResponse.json({ error: "Novel not found." }, { status: 404 });
    }

    if (!chapter || chapter.novelId !== novel.id) {
      return NextResponse.json({ error: "Chapter not found." }, { status: 404 });
    }

    updateChapterStatus(chapter.id, "generating");

    const chapters = listChapters(novel.id);
    const previousContext = chapters
      .filter((item) => item.order < chapter.order && item.content)
      .slice(-1)
      .map((item) => `${item.title}\n${item.content}`)
      .join("\n\n");

    const { draft, meta } = await generateChapterContent({
      novel,
      chapters,
      chapter,
      previousContext,
      targetWordCount: body.targetWordCount,
    });

    const completed = completeChapterWithVersion({
      chapterId: chapter.id,
      title: draft.title,
      content: draft.content,
      ...meta,
    });

    if (!completed) {
      return NextResponse.json({ error: "Failed to save chapter." }, { status: 500 });
    }

    const job = updateJobProgressForChapter(novel.id, chapter.id);

    return NextResponse.json({ ...completed, job });
  } catch (error) {
    const message = getErrorMessage(error);
    updateChapterStatus(params.chapterId, "failed", message);
    failJobForNovel(params.novelId, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to generate chapter.";
}
