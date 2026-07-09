import type {
  Chapter,
  ChapterStatus,
  ChapterVersion,
  GenerateNovelPlanInput,
  GenerationJob,
  GenerationJobStatus,
  Novel,
  NovelPlan,
  NovelStatus,
} from "./types";

type Store = {
  novels: Map<string, Novel>;
  chapters: Map<string, Chapter>;
  versions: Map<string, ChapterVersion>;
  jobs: Map<string, GenerationJob>;
};

const globalStore = globalThis as typeof globalThis & {
  __aiEditorNovelStore?: Store;
};

const store =
  globalStore.__aiEditorNovelStore ||
  (globalStore.__aiEditorNovelStore = {
    novels: new Map<string, Novel>(),
    chapters: new Map<string, Chapter>(),
    versions: new Map<string, ChapterVersion>(),
    jobs: new Map<string, GenerationJob>(),
  });

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function now() {
  return new Date().toISOString();
}

export function createNovelFromPlan(input: GenerateNovelPlanInput, plan: NovelPlan) {
  const timestamp = now();
  const novel: Novel = {
    id: createId("novel"),
    title: plan.title,
    description: plan.description,
    genre: input.genre,
    style: input.style,
    language: input.language || "zh-CN",
    kind: "original",
    status: "generating",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  store.novels.set(novel.id, novel);

  const chapters = plan.chapters
    .sort((a, b) => a.order - b.order)
    .map<Chapter>((chapter, index) => ({
      id: createId("chapter"),
      novelId: novel.id,
      title: chapter.title || `第 ${index + 1} 章`,
      brief: chapter.brief,
      content: "",
      order: chapter.order || index + 1,
      versionNumber: 0,
      status: "pending",
      createdAt: timestamp,
      updatedAt: timestamp,
    }));

  chapters.forEach((chapter) => store.chapters.set(chapter.id, chapter));

  const job: GenerationJob = {
    id: createId("job"),
    novelId: novel.id,
    type: "write_full_novel",
    status: "running",
    totalChapters: chapters.length,
    completedChapters: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  store.jobs.set(job.id, job);

  return { novel, chapters, job };
}

export function getNovel(novelId: string) {
  return store.novels.get(novelId) || null;
}

export function listNovels() {
  return Array.from(store.novels.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function updateNovelStatus(novelId: string, status: NovelStatus) {
  const novel = getNovel(novelId);
  if (!novel) return null;

  const updated = { ...novel, status, updatedAt: now() };
  store.novels.set(novelId, updated);
  return updated;
}

export function getChapter(chapterId: string) {
  return store.chapters.get(chapterId) || null;
}

export function listChapters(novelId: string) {
  return Array.from(store.chapters.values())
    .filter((chapter) => chapter.novelId === novelId)
    .sort((a, b) => a.order - b.order);
}

export function updateChapterStatus(chapterId: string, status: ChapterStatus, errorMessage?: string) {
  const chapter = getChapter(chapterId);
  if (!chapter) return null;

  const updated: Chapter = {
    ...chapter,
    status,
    errorMessage,
    updatedAt: now(),
  };
  store.chapters.set(chapterId, updated);
  return updated;
}

export function completeChapterWithVersion(input: {
  chapterId: string;
  title: string;
  content: string;
  promptVersion?: string;
  provider?: string;
  model?: string;
  temperature?: number;
}) {
  const chapter = getChapter(input.chapterId);
  if (!chapter) return null;

  const versionNumber = chapter.versionNumber + 1;
  const timestamp = now();
  const version: ChapterVersion = {
    id: createId("version"),
    novelId: chapter.novelId,
    chapterId: chapter.id,
    title: input.title,
    content: input.content,
    source: "ai",
    reason: "AI generated chapter content",
    promptVersion: input.promptVersion,
    provider: input.provider,
    model: input.model,
    temperature: input.temperature,
    versionNumber,
    createdAt: timestamp,
  };

  store.versions.set(version.id, version);

  const updatedChapter: Chapter = {
    ...chapter,
    title: input.title,
    content: input.content,
    currentVersionId: version.id,
    versionNumber,
    status: "completed",
    errorMessage: undefined,
    updatedAt: timestamp,
  };

  store.chapters.set(chapter.id, updatedChapter);
  return { chapter: updatedChapter, version };
}

export function getJob(jobId: string) {
  return store.jobs.get(jobId) || null;
}

export function getActiveJobForNovel(novelId: string) {
  return (
    Array.from(store.jobs.values()).find(
      (job) => job.novelId === novelId && job.type === "write_full_novel" && job.status === "running",
    ) || null
  );
}

export function updateJob(input: {
  jobId: string;
  status?: GenerationJobStatus;
  currentChapterId?: string;
  completedChapters?: number;
  errorMessage?: string;
}) {
  const job = getJob(input.jobId);
  if (!job) return null;

  const updated: GenerationJob = {
    ...job,
    status: input.status || job.status,
    currentChapterId: input.currentChapterId,
    completedChapters: input.completedChapters ?? job.completedChapters,
    errorMessage: input.errorMessage,
    updatedAt: now(),
  };
  store.jobs.set(job.id, updated);
  return updated;
}

export function updateJobProgressForChapter(novelId: string, chapterId: string) {
  const job = getActiveJobForNovel(novelId);
  if (!job) return null;

  const completedChapters = listChapters(novelId).filter((chapter) => chapter.status === "completed").length;
  const status = completedChapters >= job.totalChapters ? "completed" : job.status;
  const updated = updateJob({
    jobId: job.id,
    currentChapterId: chapterId,
    completedChapters,
    status,
  });

  if (status === "completed") {
    updateNovelStatus(novelId, "completed");
  }

  return updated;
}

export function failJobForNovel(novelId: string, errorMessage: string) {
  const job = getActiveJobForNovel(novelId);
  if (!job) return null;

  updateNovelStatus(novelId, "failed");
  return updateJob({ jobId: job.id, status: "failed", errorMessage });
}
