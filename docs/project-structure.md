# Project Structure

## Scope

This document defines the target file and module structure for the novel editor.

The structure is based on these architecture decisions:

- Next.js App Router is used for frontend pages and backend APIs.
- React Query owns server data fetching and mutations.
- Zustand owns UI-only state.
- AI Provider owns model vendor integration and prompt management.
- Novel generation, translation, versioning, chat, and editor modules are separated by responsibility.
- Full-novel generation is frontend-orchestrated in the MVP.

Related documents:

- [System Architecture](./system-architecture.md)
- [Novel Generation Architecture](./novel-generation-architecture.md)
- [Novel Translation Architecture](./novel-translation-architecture.md)
- [AI Provider Architecture](./ai-provider-architecture.md)

## Target Directory Structure

```txt
app/
  api/
    novels/
      route.ts
      generate-plan/
        route.ts
      [novelId]/
        route.ts
        chapters/
          route.ts
          [chapterId]/
            route.ts
            generate/
              route.ts
            translate/
              route.ts
            versions/
              route.ts
              [versionId]/
                route.ts
                restore/
                  route.ts
        chat-messages/
          route.ts
        translations/
          route.ts

    generation-jobs/
      route.ts
      [jobId]/
        route.ts

    deepseek/
      route.ts

  novels/
    page.tsx
    [novelId]/
      page.tsx

  components/
    layout/
      AppShell.tsx
      Sidebar.tsx
      RightPanel.tsx

    novels/
      NovelList.tsx
      NovelListItem.tsx
      NovelCreateDialog.tsx
      NovelMetadataForm.tsx
      NovelLanguageBadge.tsx

    chapters/
      ChapterList.tsx
      ChapterListItem.tsx
      ChapterStatusBadge.tsx
      ChapterCreateButton.tsx

    editor/
      EditorPanel.tsx
      PlainTextEditor.tsx
      EditorToolbar.tsx
      AutoSaveIndicator.tsx

    generation/
      GenerateNovelPanel.tsx
      GenerationProgress.tsx
      GenerationChapterQueue.tsx
      GenerationErrorState.tsx

    versions/
      ChapterVersionPanel.tsx
      ChapterVersionList.tsx
      ChapterVersionDetail.tsx
      RestoreVersionButton.tsx

    chat/
      ChatPanel.tsx
      ChatMessageList.tsx
      ChatInput.tsx

    translations/
      TranslationPanel.tsx
      TranslationList.tsx
      CreateTranslationButton.tsx
      TranslationStalenessBadge.tsx

  hooks/
    queries/
      useNovels.ts
      useNovel.ts
      useChapters.ts
      useChapter.ts
      useChapterVersions.ts
      useChatMessages.ts
      useGenerationJob.ts
      useTranslations.ts

    mutations/
      useCreateNovel.ts
      useUpdateNovel.ts
      useDeleteNovel.ts
      useCreateChapter.ts
      useUpdateChapter.ts
      useDeleteChapter.ts
      useGenerateNovelPlan.ts
      useGenerateChapter.ts
      useCreateChapterVersion.ts
      useRestoreChapterVersion.ts
      useCreateGenerationJob.ts
      useUpdateGenerationJob.ts
      useSendChatMessage.ts
      useCreateTranslation.ts
      useTranslateChapter.ts

    editor/
      usePlainTextEditor.ts
      useAutoSave.ts
      useChapterContinuation.ts

    orchestration/
      useGenerateFullNovel.ts
      useTranslateFullNovel.ts

  store/
    ui-store.ts

  lib/
    api/
      client.ts
      errors.ts

    ai/
      index.ts
      types.ts
      provider.ts
      errors.ts
      schemas.ts
      providers/
        deepseek.ts
        openai.ts
        claude.ts
      prompts/
        novel-plan.ts
        chapter-writer.ts
        chapter-continue.ts
        chapter-summary.ts
        chat.ts
        translation.ts
        review.ts
        polish.ts

    db/
      index.ts
      schema.ts
      repositories/
        novels.ts
        chapters.ts
        chapter-versions.ts
        chat-messages.ts
        generation-jobs.ts

    services/
      novels.ts
      chapters.ts
      chapter-versions.ts
      generation.ts
      translations.ts
      chat.ts

    validation/
      novels.ts
      chapters.ts
      generation.ts
      translations.ts
      chat.ts

    types/
      novel.ts
      chapter.ts
      chapter-version.ts
      generation-job.ts
      chat-message.ts
      translation.ts

  globals.css
  layout.tsx
  page.tsx

docs/
  system-architecture.md
  novel-generation-architecture.md
  novel-translation-architecture.md
  ai-provider-architecture.md
  project-structure.md
```

## Directory Responsibilities

### `app/api`

Contains Next.js Route Handlers.

Route handlers should stay thin:

- parse request.
- validate input.
- call service functions.
- return JSON.

They should not contain long prompts, raw model calls, or large business workflows directly.

### `app/components`

Contains presentational and feature UI components.

Recommended grouping:

- `layout`: page layout primitives.
- `novels`: novel list and metadata UI.
- `chapters`: chapter navigation UI.
- `editor`: plain text editing UI.
- `generation`: full-novel generation UI.
- `versions`: chapter version history and restore UI.
- `chat`: chat interface.
- `translations`: translation controls and status UI.

Components should receive data and callbacks through props. Data fetching should live in hooks or page-level composition.

### `app/hooks/queries`

Contains React Query read hooks.

Examples:

- `useNovels`
- `useChapters`
- `useChapterVersions`
- `useChatMessages`

These hooks should wrap `useQuery` and own query keys.

### `app/hooks/mutations`

Contains React Query write hooks.

Examples:

- `useGenerateNovelPlan`
- `useGenerateChapter`
- `useRestoreChapterVersion`
- `useCreateTranslation`

These hooks should wrap `useMutation`, update or invalidate related query caches, and expose business actions to components.

### `app/hooks/orchestration`

Contains frontend-controlled long flows.

MVP examples:

- `useGenerateFullNovel`
- `useTranslateFullNovel`

These hooks coordinate multiple mutations sequentially. In the future worker architecture, most of this orchestration can move to backend workers.

### `app/store`

Contains Zustand stores.

Only store UI state here:

```ts
activeNovelId
activeChapterId
rightPanelTab
sidebarCollapsed
```

Do not store full novels, chapters, versions, or chat messages here. Those are server data and belong to React Query.

### `app/lib/ai`

Contains the AI Provider module.

Responsibilities:

- vendor abstraction.
- model selection.
- prompt construction.
- prompt versioning.
- output parsing.
- schema validation.
- normalized AI errors.

Prompt files must stay on the backend and should not be imported by client components.

### `app/lib/db`

Contains database access setup and repository functions.

Repositories should contain low-level persistence logic, not AI prompt logic or UI behavior.

### `app/lib/services`

Contains business services.

Examples:

- create a novel from a generated plan.
- generate one chapter and create a version.
- restore a chapter version.
- create a translated novel and translated chapter placeholders.
- save chat messages.

Services are called by Route Handlers.

### `app/lib/validation`

Contains request and response validation helpers.

MVP can use manual validation. Later, this can move to Zod schemas.

### `app/lib/types`

Contains shared TypeScript domain types.

These types should mirror database models and API response shapes where appropriate.

## Page Structure

### `/`

Entry page. It can redirect to `/novels` or open the current editor workspace.

### `/novels`

Novel list page.

Responsibilities:

- show all novels.
- create a new novel.
- open an existing novel.
- show original/translation labels.

### `/novels/[novelId]`

Main novel workspace.

Responsibilities:

- chapter list.
- active chapter editor.
- generation progress.
- chat panel.
- version panel.
- translation panel.

## API Route Responsibilities

### Novel Routes

```txt
GET    /api/novels
POST   /api/novels
GET    /api/novels/:novelId
PATCH  /api/novels/:novelId
DELETE /api/novels/:novelId
```

### Chapter Routes

```txt
GET    /api/novels/:novelId/chapters
POST   /api/novels/:novelId/chapters
PATCH  /api/novels/:novelId/chapters/:chapterId
DELETE /api/novels/:novelId/chapters/:chapterId
```

### Generation Routes

```txt
POST /api/novels/generate-plan
POST /api/novels/:novelId/chapters/:chapterId/generate
```

### Version Routes

```txt
GET  /api/novels/:novelId/chapters/:chapterId/versions
POST /api/novels/:novelId/chapters/:chapterId/versions
GET  /api/novels/:novelId/chapters/:chapterId/versions/:versionId
POST /api/novels/:novelId/chapters/:chapterId/versions/:versionId/restore
```

### Chat Routes

```txt
GET  /api/novels/:novelId/chat-messages
POST /api/novels/:novelId/chat-messages
```

### Translation Routes

```txt
GET  /api/novels/:novelId/translations
POST /api/novels/:novelId/translations
POST /api/novels/:translatedNovelId/chapters/:chapterId/translate
```

### Job Routes

```txt
POST  /api/generation-jobs
GET   /api/generation-jobs/:jobId
PATCH /api/generation-jobs/:jobId
```

## Implementation Order

Recommended order:

```txt
1. Domain types and database schema.
2. AI Provider module.
3. Novel and chapter CRUD services.
4. Generation plan API.
5. Chapter generation API.
6. React Query hooks.
7. Zustand UI store.
8. Full-novel frontend orchestration hook.
9. Editor workspace UI.
10. Chapter version APIs and UI.
11. Chat persistence.
12. Translation architecture implementation.
```

## MVP Notes

The current project already contains an editor demo. During migration, prefer replacing demo-specific hooks and components gradually with the target module structure instead of doing one large rewrite.

The first production-quality slice should be:

```txt
Generate plan → create novel and chapter placeholders → generate chapters sequentially → save chapter versions → display progress.
```
