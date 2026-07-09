export type NovelStatus = "draft" | "planning" | "generating" | "completed" | "failed";
export type ChapterStatus = "pending" | "generating" | "completed" | "failed";
export type GenerationJobStatus = "running" | "completed" | "failed" | "cancelled";

export type Novel = {
  id: string;
  title: string;
  description?: string;
  genre?: string;
  style?: string;
  language: string;
  kind: "original" | "translation";
  originalNovelId?: string;
  status: NovelStatus;
  createdAt: string;
  updatedAt: string;
};

export type Chapter = {
  id: string;
  novelId: string;
  title: string;
  brief?: string;
  content: string;
  order: number;
  originalChapterId?: string;
  originalChapterVersionId?: string;
  currentVersionId?: string;
  versionNumber: number;
  status: ChapterStatus;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
};

export type ChapterVersion = {
  id: string;
  novelId: string;
  chapterId: string;
  title: string;
  content: string;
  source: "user" | "ai" | "system";
  reason?: string;
  originalChapterVersionId?: string;
  promptVersion?: string;
  provider?: string;
  model?: string;
  temperature?: number;
  versionNumber: number;
  createdAt: string;
};

export type GenerationJob = {
  id: string;
  novelId: string;
  type: "write_full_novel";
  status: GenerationJobStatus;
  currentChapterId?: string;
  totalChapters: number;
  completedChapters: number;
  promptVersion?: string;
  provider?: string;
  model?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
};

export type GenerateNovelPlanInput = {
  prompt: string;
  chapterCount?: number;
  language?: string;
  genre?: string;
  style?: string;
  targetWordCountPerChapter?: number;
};

export type NovelPlan = {
  title: string;
  description?: string;
  chapters: {
    order: number;
    title: string;
    brief: string;
  }[];
};

export type ChapterDraft = {
  title: string;
  content: string;
};

export type GeneratePlanResult = {
  novel: Novel;
  chapters: Chapter[];
  job: GenerationJob;
};

export type GenerateChapterResult = {
  chapter: Chapter;
  version: ChapterVersion;
  job?: GenerationJob;
};
