import { useState } from "react";

import type {
  Chapter,
  GenerateChapterResult,
  GenerateNovelPlanInput,
  GeneratePlanResult,
  GenerationJob,
  Novel,
} from "@/app/lib/novels/types";

type GeneratedNovelState = {
  novel: Novel | null;
  chapters: Chapter[];
  job: GenerationJob | null;
  error: string | null;
  isGenerating: boolean;
  currentChapterId: string | null;
};

const initialState: GeneratedNovelState = {
  novel: null,
  chapters: [],
  job: null,
  error: null,
  isGenerating: false,
  currentChapterId: null,
};

export function useGenerateFullNovel() {
  const [state, setState] = useState<GeneratedNovelState>(initialState);

  async function generate(input: GenerateNovelPlanInput) {
    if (state.isGenerating) return;

    setState({ ...initialState, isGenerating: true });

    try {
      const planResult = await postJson<GeneratePlanResult>("/api/novels/generate-plan", input);

      setState({
        novel: planResult.novel,
        chapters: planResult.chapters,
        job: planResult.job,
        error: null,
        isGenerating: true,
        currentChapterId: planResult.chapters[0]?.id || null,
      });

      let chapters = planResult.chapters;
      let job = planResult.job;

      for (const chapter of planResult.chapters) {
        setState((current) => ({ ...current, currentChapterId: chapter.id }));

        const chapterResult = await postJson<GenerateChapterResult>(
          `/api/novels/${planResult.novel.id}/chapters/${chapter.id}/generate`,
          { targetWordCount: input.targetWordCountPerChapter },
        );

        chapters = chapters.map((item) =>
          item.id === chapterResult.chapter.id ? chapterResult.chapter : item,
        );
        job = chapterResult.job || job;

        setState((current) => ({
          ...current,
          chapters,
          job,
        }));
      }

      const completedJob = await patchJson<{ job: GenerationJob }>(
        `/api/generation-jobs/${planResult.job.id}`,
        {
          status: "completed",
          completedChapters: chapters.length,
        },
      );

      setState((current) => ({
        ...current,
        chapters,
        job: completedJob.job,
        isGenerating: false,
        currentChapterId: null,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "生成小说失败。";
      setState((current) => ({
        ...current,
        error: message,
        isGenerating: false,
      }));
    }
  }

  return {
    ...state,
    generate,
  };
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return parseResponse<T>(response);
}

async function patchJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return parseResponse<T>(response);
}

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data as T;
}
