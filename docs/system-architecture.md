# System Architecture

## Scope

This document is the top-level architecture index for the novel editor product.

Current product direction:

- Single-user MVP first.
- Multiple novels.
- Plain text chapter content.
- Long-term chat history.
- Chapter-level version rollback.
- Full-novel generation through frontend-orchestrated sequential chapter generation.
- Translation versions are stored as independent novels linked to the original novel.
- AI vendors and prompts are isolated behind the AI Provider module.

## Architecture Overview

```txt
React UI
  ↓
Zustand UI State
  ↓
React Query
  ↓
Next.js Route Handlers
  ↓
Database
  ↓
AI Provider
```

Responsibilities:

- React UI renders editor, chapters, chat, generation progress, version history, and translation controls.
- Zustand stores UI-only state such as active novel, active chapter, and panel state.
- React Query owns server data fetching, caching, and mutations.
- Next.js Route Handlers expose CRUD, generation, translation, chat, and version APIs.
- Database persists novels, chapters, versions, jobs, and chat messages.
- AI Provider owns model vendor integration and prompt management.

## Core Documents

- [Novel Generation Architecture](./novel-generation-architecture.md)
- [Novel Translation Architecture](./novel-translation-architecture.md)
- [AI Provider Architecture](./ai-provider-architecture.md)
- [Project Structure](./project-structure.md)

## Core Modules

### Novel

Manages original and translated novel records.

Key responsibilities:

- create novel.
- update metadata.
- list novels.
- track generation status.
- link translated novels to original novels.

### Chapter

Manages chapter content and status.

Key responsibilities:

- create chapter.
- update title and content.
- sort chapters.
- track generation status.
- link translated chapters to original chapters.

### Chapter Version

Manages rollback history.

Key responsibilities:

- create checkpoint versions.
- list versions.
- read historical versions.
- restore old versions by creating a new version.

### Generation

Manages complete novel generation.

Details live in [Novel Generation Architecture](./novel-generation-architecture.md).

### Translation

Manages one-click translation into independent translated novels.

Details live in [Novel Translation Architecture](./novel-translation-architecture.md).

### Chat

Persists long-term chat messages by novel and optionally by chapter.

### AI Provider

Encapsulates model providers and prompt management.

Details live in [AI Provider Architecture](./ai-provider-architecture.md).

## Shared Data Models

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

### ChatMessage

```ts
type ChatMessage = {
  id: string;
  novelId: string;
  chapterId?: string;
  role: "user" | "assistant" | "system";
  content: string;
  promptVersion?: string;
  provider?: string;
  model?: string;
  createdAt: Date;
};
```

## Frontend State Split

React Query owns server data:

- novels.
- chapters.
- chapter versions.
- generation jobs.
- chat messages.

Zustand owns UI state:

```ts
type UiState = {
  activeNovelId: string | null;
  activeChapterId: string | null;
  rightPanelTab: "chat" | "generation" | "versions";
  sidebarCollapsed: boolean;
};
```

Editor-local hooks own editor instance state and transient generation suggestions.

## API Areas

API routes should be grouped by business area:

```txt
/api/novels
/api/novels/:novelId/chapters
/api/novels/:novelId/chapters/:chapterId/versions
/api/novels/:novelId/chat-messages
/api/novels/generate-plan
/api/novels/:novelId/chapters/:chapterId/generate
/api/novels/:novelId/translations
/api/novels/:translatedNovelId/chapters/:chapterId/translate
/api/generation-jobs
```

## Worker Migration

The MVP uses frontend-orchestrated generation and translation loops.

Future worker migration should move only orchestration loops into background jobs.

The following should remain stable:

- data models.
- AI Provider capability functions.
- chapter status lifecycle.
- generation job progress model.
- React Query progress UI.

## Summary

The system is structured around reusable `Novel`, `Chapter`, `ChapterVersion`, `GenerationJob`, and `ChatMessage` models.

Generation, translation, and AI provider details are documented separately so each subsystem can evolve independently while sharing the same core data model.
