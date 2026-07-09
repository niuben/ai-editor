# Novel Generation Architecture

## Scope

This document describes the architecture for generating a complete novel in the MVP.

Current generation strategy:

- Single-user MVP.
- No background worker yet.
- The frontend starts the full-novel generation flow.
- The backend generates a novel plan first.
- The frontend then calls the backend chapter by chapter.
- Each generated chapter is persisted as plain text.
- Each generated chapter creates a `ChapterVersion` checkpoint.
- `GenerationJob` records progress and makes future worker migration easier.

Related documents:

- [System Architecture](./system-architecture.md)
- [AI Provider Architecture](./ai-provider-architecture.md)
- [Novel Translation Architecture](./novel-translation-architecture.md)

## High-Level Flow

```txt
User prompt
  ↓
POST /api/novels/generate-plan
  ↓
AI Provider: generateNovelPlan
  ↓
Create Novel + Chapter placeholders + GenerationJob
  ↓
Frontend loops through chapters
  ↓
POST /api/novels/:novelId/chapters/:chapterId/generate
  ↓
AI Provider: generateChapterContent
  ↓
Update Chapter + create ChapterVersion
  ↓
Complete GenerationJob + Novel
```

The product appears to support one-click full novel generation, but the MVP implementation uses frontend-orchestrated sequential chapter generation.

## Responsibilities

### Frontend

- Collect user generation prompt and options.
- Start novel plan generation.
- Set active novel and active chapter.
- Loop through generated chapter placeholders.
- Call the chapter generation API for each chapter.
- Display progress.
- Stop on failure.
- Allow retry for failed chapters.
- Refresh React Query caches after each generated chapter.

### Next.js API

- Validate generation requests.
- Create novel records.
- Create chapter placeholders.
- Create and update generation jobs.
- Call AI Provider capability functions.
- Persist generated chapter content.
- Create chapter versions.
- Return typed API responses to the frontend.

### AI Provider

- Build prompts.
- Call the selected model provider.
- Parse JSON responses.
- Validate output shape.
- Normalize model errors.

See [AI Provider Architecture](./ai-provider-architecture.md) for provider and prompt management details.

### Database

- Persist novels.
- Persist chapters.
- Persist chapter versions.
- Persist generation jobs.
- Persist chat messages separately from generation.

## Data Model

### Novel

```ts
type Novel = {
  id: string;
  title: string;
  description?: string;
  genre?: string;
  style?: string;
  language: string;
  kind: "original" | "translation";
  originalNovelId?: string;
  status: "draft" | "planning" | "generating" | "completed" | "failed";
  createdAt: Date;
  updatedAt: Date;
};
```

Generation creates original novels with:

```txt
kind = original
status = generating
```

### Chapter

```ts
type Chapter = {
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
  status: "pending" | "generating" | "completed" | "failed";
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
};
```

During plan generation, chapters are created with:

```txt
brief = planner output for the chapter
content = ""
status = pending
versionNumber = 0
```

### ChapterVersion

```ts
type ChapterVersion = {
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
  createdAt: Date;
};
```

AI-generated chapter content creates a version with:

```txt
source = ai
reason = AI generated chapter content
```

### GenerationJob

```ts
type GenerationJob = {
  id: string;
  novelId: string;
  type: "plan_novel" | "write_chapter" | "write_full_novel" | "translate_novel" | "translate_chapter";
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  currentChapterId?: string;
  totalChapters: number;
  completedChapters: number;
  promptVersion?: string;
  provider?: string;
  model?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
};
```

The MVP does not run a worker, but the job still tracks progress.

## AI Capabilities Used

### generateNovelPlan

Purpose:

```txt
Generate title, description, chapter list, and chapter briefs from the user's novel request.
```

Input:

```ts
type GenerateNovelPlanInput = {
  prompt: string;
  chapterCount?: number;
  language?: string;
  genre?: string;
  style?: string;
  targetWordCountPerChapter?: number;
};
```

Output:

```ts
type NovelPlan = {
  title: string;
  description?: string;
  chapters: {
    order: number;
    title: string;
    brief: string;
  }[];
};
```

### generateChapterContent

Purpose:

```txt
Generate the full content for one chapter.
```

Input:

```ts
type GenerateChapterContentInput = {
  novel: Novel;
  chapters: Pick<Chapter, "title" | "brief" | "order">[];
  chapter: Pick<Chapter, "title" | "brief" | "order">;
  previousContext?: string;
  targetWordCount?: number;
};
```

Output:

```ts
type ChapterDraft = {
  title: string;
  content: string;
};
```

## API Design

### Generate Novel Plan

```txt
POST /api/novels/generate-plan
```

Request:

```ts
{
  prompt: string;
  chapterCount?: number;
  language?: string;
  genre?: string;
  style?: string;
  targetWordCountPerChapter?: number;
}
```

Backend behavior:

```txt
1. Validate request.
2. Set job-like status to planning/generating.
3. Call AI Provider generateNovelPlan.
4. Create Novel with status=generating.
5. Create Chapter placeholders with status=pending.
6. Create GenerationJob with type=write_full_novel and status=running.
7. Return novel, chapters, and job.
```

Response:

```ts
{
  novel: Novel;
  chapters: Chapter[];
  job: GenerationJob;
}
```

### Generate One Chapter

```txt
POST /api/novels/:novelId/chapters/:chapterId/generate
```

Backend behavior:

```txt
1. Load Novel.
2. Load target Chapter.
3. Load all chapters for the novel ordered by order.
4. Build previousContext from previous chapter summaries or content.
5. Update Chapter.status=generating.
6. Call AI Provider generateChapterContent.
7. Update Chapter.title/content/status=completed.
8. Increment Chapter.versionNumber.
9. Create ChapterVersion with source=ai.
10. Set Chapter.currentVersionId to the new version.
11. Update GenerationJob progress.
12. Return chapter and version.
```

Response:

```ts
{
  chapter: Chapter;
  version: ChapterVersion;
  job?: GenerationJob;
}
```

### Update Generation Job

```txt
PATCH /api/generation-jobs/:jobId
```

Used by the frontend to mark a frontend-orchestrated job as completed, failed, or cancelled.

Request:

```ts
{
  status?: "running" | "completed" | "failed" | "cancelled";
  currentChapterId?: string;
  completedChapters?: number;
  errorMessage?: string;
}
```

### Get Chapters

```txt
GET /api/novels/:novelId/chapters
```

Used by React Query to refresh chapter status and content during generation.

## Frontend Orchestration

The frontend owns the generation loop in the MVP.

```ts
const result = await generateNovelPlan.mutateAsync({
  prompt,
  chapterCount,
  language,
  genre,
  style,
});

setActiveNovelId(result.novel.id);
setActiveChapterId(result.chapters[0]?.id ?? null);

for (const chapter of result.chapters) {
  await updateGenerationJob.mutateAsync({
    jobId: result.job.id,
    currentChapterId: chapter.id,
  });

  await generateChapter.mutateAsync({
    novelId: result.novel.id,
    chapterId: chapter.id,
  });

  queryClient.invalidateQueries({
    queryKey: ["chapters", result.novel.id],
  });

  queryClient.invalidateQueries({
    queryKey: ["chapterVersions", result.novel.id, chapter.id],
  });
}

await updateGenerationJob.mutateAsync({
  jobId: result.job.id,
  status: "completed",
  completedChapters: result.chapters.length,
});
```

## React Query Hooks

Suggested query hooks:

```txt
useNovels
useNovel
useChapters
useGenerationJob
useChapterVersions
```

Suggested mutation hooks:

```txt
useGenerateNovelPlan
useGenerateChapter
useUpdateGenerationJob
useCreateChapterVersion
```

The generation loop should use `mutateAsync` so chapters run sequentially.

## Zustand UI State

Zustand should store only UI state:

```ts
type UiState = {
  activeNovelId: string | null;
  activeChapterId: string | null;
  rightPanelTab: "chat" | "generation" | "versions";
  sidebarCollapsed: boolean;
};
```

Do not store full novels, chapters, or versions in Zustand. They are server data owned by React Query.

## Progress Display

The UI should show:

- total chapters.
- completed chapters.
- current generating chapter.
- failed chapter, if any.
- retry action.
- cancel action, optional for MVP.

Progress can be derived from:

```txt
GenerationJob.completedChapters
GenerationJob.totalChapters
GenerationJob.currentChapterId
Chapter.status
```

## Failure Handling

If one chapter fails:

```txt
1. Set Chapter.status=failed.
2. Store Chapter.errorMessage.
3. Set GenerationJob.status=failed.
4. Store GenerationJob.errorMessage.
5. Stop the frontend loop.
6. Show retry action.
```

Retry uses the same chapter generation endpoint:

```txt
POST /api/novels/:novelId/chapters/:chapterId/generate
```

If retry succeeds:

```txt
1. Update Chapter.content.
2. Create new ChapterVersion.
3. Continue generation from the next pending chapter, if the user chooses to resume.
```

## Chapter Versioning During Generation

Each successful AI-generated chapter must create a `ChapterVersion`.

Version metadata:

```txt
source = ai
reason = AI generated chapter content
promptVersion = CHAPTER_WRITER_PROMPT_VERSION
provider = active provider
model = active model
```

This makes rollback, audit, and generation quality debugging possible.

## Previous Context Strategy

Writing later chapters requires context.

MVP options:

```txt
Option A: include previous 1-2 chapter contents.
Option B: include summaries of previous chapters.
Option C: include both recent chapter content and older summaries.
```

Recommended MVP:

```txt
Use previous 1 chapter content plus the full chapter outline.
```

Future improvement:

```txt
Generate and store ChapterSummary after each chapter.
Use summaries for long-range continuity.
```

## MVP Limitations

- Browser refresh can interrupt the generation loop.
- Browser close stops generation.
- There is no background recovery.
- There is no multi-user concurrency control.
- Long novels depend on the frontend staying open.
- Previous context may become too large for long novels without summaries.

## Worker Migration Path

This design intentionally keeps worker migration simple.

Current MVP:

```txt
Frontend loops through chapters.
```

Future worker version:

```txt
Frontend calls POST /api/novels/:novelId/generate-full.
Backend creates job.
Worker loops through chapters.
Frontend polls job and chapter statuses.
```

Unchanged parts:

- `Novel`
- `Chapter`
- `ChapterVersion`
- `GenerationJob`
- AI Provider capability functions
- chapter status lifecycle
- React Query progress display

Changed part:

```txt
The generation loop moves from frontend to worker.
```

## Summary

The MVP generates a complete novel through a two-stage flow: plan first, then sequential chapter generation.

This keeps implementation simple while preserving the data model and API boundaries needed for future background worker orchestration.
