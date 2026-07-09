# AI Provider Architecture

## Scope

This document describes the AI Provider module for the novel editor.

The AI Provider module owns:

- AI vendor integration.
- model selection.
- prompt construction.
- prompt versioning.
- output parsing.
- schema validation.
- normalized AI errors.

Business code should not call DeepSeek, OpenAI, Claude, or any other AI vendor directly.

## Design Goal

The rest of the system should call stable business capabilities:

```ts
generateNovelPlan(input)
generateChapterContent(input)
continueChapter(input)
chatWithNovelContext(input)
translateChapter(input)
summarizeChapter(input)
```

These functions hide the underlying model provider.

Replacing a model vendor should not require changes to:

- Next.js route handlers.
- database models.
- React Query hooks.
- frontend components.
- generation orchestration logic.

## Backend-Only Prompt Rule

Prompts should live on the backend.

Core prompts must not be stored in frontend code because they are product logic and business assets.

Backend-owned prompts include:

- novel plan prompt.
- chapter writer prompt.
- chapter continuation prompt.
- chapter summary prompt.
- chat prompt.
- translation prompt.
- review prompt.
- polish prompt.

The frontend should only send business input and user intent.

Example frontend request:

```ts
{
  prompt: "Write a 20-chapter sci-fi novel about a lost colony ship.",
  chapterCount: 20,
  language: "en",
  style: "cold, restrained, literary"
}
```

The frontend should not send:

```ts
{
  systemPrompt: "You are a professional novelist..."
}
```

## Suggested Directory Structure

```txt
app/lib/ai/
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
```

MVP can start with fewer files, but the boundary should stay the same.

## Provider Interface

All AI vendors should be adapted to one internal interface.

```ts
export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AICompletionInput = {
  messages: AIMessage[];
  temperature?: number;
  responseFormat?: "text" | "json";
};

export type AICompletionResult = {
  content: string;
  provider: string;
  model: string;
};

export interface AIModelProvider {
  complete(input: AICompletionInput): Promise<AICompletionResult>;
}
```

Provider examples:

```txt
DeepSeekProvider implements AIModelProvider
OpenAIProvider implements AIModelProvider
ClaudeProvider implements AIModelProvider
```

## Provider Selection

The active provider should be selected by environment variables.

DeepSeek example:

```env
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=xxx
DEEPSEEK_MODEL=deepseek-chat
```

OpenAI example:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=xxx
OPENAI_MODEL=gpt-4o-mini
```

Provider factory:

```ts
export function getAIProvider(): AIModelProvider {
  const provider = process.env.AI_PROVIDER || "deepseek";

  if (provider === "openai") {
    return new OpenAIProvider();
  }

  if (provider === "claude") {
    return new ClaudeProvider();
  }

  return new DeepSeekProvider();
}
```

## Provider Capabilities

Different vendors have different capabilities.

Examples:

- native JSON mode support.
- maximum output tokens.
- system message support.
- streaming support.
- tool calling support.

Optional capability config:

```ts
export type AIModelCapabilities = {
  supportsJsonMode: boolean;
  supportsSystemMessage: boolean;
  supportsStreaming: boolean;
  maxOutputTokens: number;
};
```

Business logic should not branch on vendor-specific request formats. Provider implementations should adapt vendor differences.

## Capability Functions

Capability functions are the public API of the AI Provider module.

They combine:

- provider selection.
- prompt construction.
- model call.
- JSON extraction.
- schema validation.
- normalized errors.

Example:

```ts
export async function generateNovelPlan(input: GenerateNovelPlanInput): Promise<NovelPlan> {
  const provider = getAIProvider();

  const result = await provider.complete({
    messages: buildNovelPlanPrompt(input),
    temperature: 0.4,
    responseFormat: "json",
  });

  return parseNovelPlan(result.content);
}
```

Next.js route handlers should stay thin:

```ts
export async function POST(request: Request) {
  const body = await request.json();
  const plan = await generateNovelPlan(body);

  return NextResponse.json({ plan });
}
```

## Prompt Inventory

### Novel Plan Prompt

Capability:

```ts
generateNovelPlan(input)
```

Purpose:

```txt
Generate novel title, description, chapter list, and chapter briefs.
```

Expected output:

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

### Chapter Writer Prompt

Capability:

```ts
generateChapterContent(input)
```

Purpose:

```txt
Generate one full chapter from novel metadata, the chapter plan, and previous context.
```

Expected output:

```ts
type ChapterDraft = {
  title: string;
  content: string;
};
```

### Chapter Continue Prompt

Capability:

```ts
continueChapter(input)
```

Purpose:

```txt
Continue writing from the current cursor or nearby context.
```

Expected output:

```ts
type ChapterContinuation = {
  content: string;
};
```

### Chapter Summary Prompt

Capability:

```ts
summarizeChapter(input)
```

Purpose:

```txt
Summarize a chapter for long-context generation.
```

Expected output:

```ts
type ChapterSummary = {
  summary: string;
  characters: string[];
  events: string[];
  unresolvedThreads: string[];
};
```

### Chat Prompt

Capability:

```ts
chatWithNovelContext(input)
```

Purpose:

```txt
Answer user questions and provide writing help using current novel and chapter context.
```

Expected output:

```ts
type ChatResult = {
  content: string;
};
```

### Translation Prompt

Capability:

```ts
translateChapter(input)
```

Purpose:

```txt
Translate one source chapter into the target language while preserving names, style, and terminology.
```

Expected output:

```ts
type TranslatedChapterDraft = {
  title: string;
  content: string;
};
```

### Review Prompt

Capability:

```ts
reviewChapter(input)
```

Purpose:

```txt
Find plot, continuity, character, or style issues.
```

Expected output:

```ts
type ChapterReview = {
  issues: {
    severity: "low" | "medium" | "high";
    message: string;
    suggestion?: string;
  }[];
};
```

### Polish Prompt

Capability:

```ts
polishChapter(input)
```

Purpose:

```txt
Improve prose quality without changing plot meaning.
```

Expected output:

```ts
type PolishedChapter = {
  content: string;
};
```

## Prompt Versioning

Each prompt should have a stable version string.

Example:

```ts
export const NOVEL_PLAN_PROMPT_VERSION = "novel-plan-v1";
export const CHAPTER_WRITER_PROMPT_VERSION = "chapter-writer-v1";
export const TRANSLATION_PROMPT_VERSION = "translation-v1";
```

Prompt versions should be saved with generated artifacts.

Suggested fields:

```txt
GenerationJob.promptVersion
ChapterVersion.promptVersion
ChatMessage.promptVersion
```

For AI-generated versions, also save:

```txt
provider
model
temperature
```

This makes generation quality easier to debug later.

## Output Parsing And Schema Validation

AI outputs should be parsed and validated in the AI Provider module.

Business code should receive typed data, not raw model text.

Example validation flow:

```txt
1. Call provider.complete().
2. Extract JSON from content.
3. Parse JSON.
4. Validate required fields.
5. Return typed result.
6. Throw AIProviderError if invalid.
```

MVP validation can be manual. Later, use a schema library such as Zod.

## Error Handling

AI Provider should normalize provider-specific errors.

Suggested error type:

```ts
export class AIProviderError extends Error {
  code:
    | "RATE_LIMITED"
    | "TIMEOUT"
    | "EMPTY_RESPONSE"
    | "INVALID_JSON"
    | "SCHEMA_VALIDATION_FAILED"
    | "TRUNCATED_OUTPUT"
    | "UNKNOWN";
}
```

Route handlers can map these errors to API responses and job/chapter failure states.

## Model Replacement Process

To replace or add an AI vendor:

```txt
1. Implement AIModelProvider for the new vendor.
2. Add provider selection to getAIProvider().
3. Add environment variables.
4. Validate prompt behavior for JSON and long text outputs.
5. Keep capability function signatures unchanged.
```

Example environment switch:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=xxx
OPENAI_MODEL=gpt-4o-mini
```

No route handler, React Query hook, or component should need to change.

## MVP Scope

Include first:

- `generateNovelPlan`
- `generateChapterContent`
- `continueChapter`
- `chatWithNovelContext`
- `translateChapter`
- prompt version constants
- provider factory
- DeepSeek provider implementation

Add later:

- `summarizeChapter`
- `extractNovelMemory`
- `reviewChapter`
- `polishChapter`
- provider-specific prompt variants
- streaming support

## Summary

The AI Provider module is the model capability layer.

It keeps prompts and model-specific implementation details on the backend, exposes stable business functions to the rest of the system, and makes future model replacement a configuration and provider-implementation change instead of a full application rewrite.
