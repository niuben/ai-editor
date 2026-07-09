# Novel Translation Architecture

## Scope

This document describes the translation architecture for the novel editor.

Product rules:

- A translated novel is stored as an independent `Novel` row.
- Translated novels have their own chapters and chapter versions.
- Translation is always based on the original novel.
- Translation from another translated version is not supported.
- A translated novel can be edited, versioned, chatted with, and published independently.

Example:

```txt
English original novel
  ↓
Chinese translated novel

English original novel
  ↓
Japanese translated novel
```

This is intentionally not supported:

```txt
English original novel
  ↓
Chinese translated novel
  ↓
Japanese translated novel
```

## Design Summary

Translations reuse the same core entities:

```txt
Novel
  ↓
Chapter
  ↓
ChapterVersion
```

A translated novel is still a normal `Novel`. It is linked to its original novel through `originalNovelId`.

Translated chapters are still normal `Chapter` rows. They are linked to their original chapters through `originalChapterId` and `originalChapterVersionId`.

## Novel Model Changes

Add translation-aware fields to `Novel`:

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

Field meanings:

- `language`: language code, such as `en`, `zh-CN`, `ja`, or `ko`.
- `kind`: whether this novel is an original or a translation.
- `originalNovelId`: set only for translated novels. It points to the original novel.

Example records:

```txt
English original
id = novel-en
kind = original
language = en
originalNovelId = null

Chinese translation
id = novel-zh
kind = translation
language = zh-CN
originalNovelId = novel-en

Japanese translation
id = novel-ja
kind = translation
language = ja
originalNovelId = novel-en
```

## Chapter Model Changes

Add original-link fields to `Chapter`:

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

Field meanings:

- `originalChapterId`: the original chapter this translated chapter was created from.
- `originalChapterVersionId`: the original chapter version used when this translation was created or last translated.

These fields are only populated for translated novels.

## ChapterVersion Model Changes

Add original version tracking to `ChapterVersion`:

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
  versionNumber: number;
  createdAt: Date;
};
```

For translated chapter versions, `originalChapterVersionId` records which original chapter version the translation was based on.

## Staleness Detection

A translated chapter may become stale when the original chapter changes.

Staleness rule:

```ts
translatedChapter.originalChapterVersionId !== originalChapter.currentVersionId
```

If this is true, the UI should show:

```txt
Original chapter has changed. Translation may be outdated.
```

Suggested actions:

- Re-translate this chapter.
- Keep current translation.
- View original changes.

## Translation Flow

User action:

```txt
Translate this novel to Chinese
```

Backend and frontend flow:

```txt
1. Validate that the source novel is kind=original.
2. Create a new Novel:
   kind=translation
   language=target language
   originalNovelId=source novel id
   status=generating
3. Copy the source chapter structure into translated Chapter rows:
   novelId=translated novel id
   originalChapterId=source chapter id
   originalChapterVersionId=source chapter currentVersionId
   status=pending
4. Create a translation job.
5. Frontend loops through translated chapters.
6. For each translated chapter, call the translate chapter API.
7. Backend loads the translated chapter and its original chapter.
8. Backend calls AI Provider to translate title and content.
9. Backend updates translated Chapter title/content/status.
10. Backend creates ChapterVersion with source=ai.
11. Backend stores originalChapterVersionId on Chapter and ChapterVersion.
12. After all chapters complete, mark the translated Novel completed.
```

## API Design

### Create Translation Novel

```txt
POST /api/novels/:novelId/translations
```

Creates a translated novel and translated chapter placeholders.

Request:

```ts
{
  language: "zh-CN"
}
```

Response:

```ts
{
  novel: translatedNovel,
  chapters: translatedChapters,
  job: translationJob
}
```

Backend behavior:

```txt
1. Reject if source novel is not kind=original.
2. Reject if a translation for the same originalNovelId and language already exists, unless explicit overwrite/duplicate behavior is added later.
3. Create translated Novel.
4. Create translated Chapter placeholders.
5. Create GenerationJob or Job with type=translate_novel.
6. Return translated novel, chapters, and job.
```

### List Translations For Original Novel

```txt
GET /api/novels/:novelId/translations
```

Returns all translated novels where:

```txt
originalNovelId = :novelId
```

### Translate One Chapter

```txt
POST /api/novels/:translatedNovelId/chapters/:chapterId/translate
```

The `chapterId` is the translated chapter ID.

Backend behavior:

```txt
1. Load translated chapter.
2. Load translated novel.
3. Validate translated novel kind=translation.
4. Load original chapter from translatedChapter.originalChapterId.
5. Load original chapter current version.
6. Call AI Provider to translate original title/content into translated novel language.
7. Update translated chapter title/content.
8. Set translated chapter originalChapterVersionId to originalChapter.currentVersionId.
9. Create translated ChapterVersion with source=ai.
10. Return updated translated chapter and version.
```

### Re-translate One Chapter

Re-translation uses the same endpoint:

```txt
POST /api/novels/:translatedNovelId/chapters/:chapterId/translate
```

If the original chapter changed, this updates the translated chapter based on the latest original version and creates a new translated chapter version.

## Job Type

The existing generation job model can be extended:

```ts
type JobType =
  | "plan_novel"
  | "write_chapter"
  | "write_full_novel"
  | "translate_novel"
  | "translate_chapter";
```

For the MVP, full-novel translation can follow the same frontend-orchestrated chapter-by-chapter approach as novel generation.

## Frontend Behavior

The UI can show translations as normal novels in the novel list.

Recommended labels:

```txt
Original: English
Translation: Chinese
Translation: Japanese
```

When editing a translated novel:

- The chapter editor behaves like any other novel.
- Chapter versions work the same way.
- Chat history is scoped to the translated novel.
- A staleness indicator appears if the original chapter has changed.

## MVP Decisions

Included:

- Translated novels stored in `Novel`.
- Translated chapters stored in `Chapter`.
- Translated chapter versions stored in `ChapterVersion`.
- `originalNovelId` on translated novels.
- `originalChapterId` and `originalChapterVersionId` on translated chapters.
- Translation staleness detection.
- One-click translation implemented as frontend-orchestrated chapter-by-chapter API calls.

Deferred:

- Translation from translated novels.
- Complex glossary management.
- Human review workflow.
- Side-by-side diff.
- Publication workflow per market.
- Background worker translation orchestration.

## Summary

Translation versions are modeled as independent novels while preserving a simple link back to the original novel.

This allows every translated novel to be edited, versioned, chatted with, and published independently, while still making it possible to detect when the original source content has changed.
