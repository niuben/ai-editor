export type Chapter = {
  id: string;
  title: string;
  content: Record<string, unknown>;
};

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ParsedChapter = {
  title: string;
  body: string;
};

export type NovelChapterPlan = {
  title: string;
  content: string;
};

export type NovelAction =
  | {
      type: "create_novel";
      payload: {
        title?: string;
        chapters: NovelChapterPlan[];
      };
    }
  | {
      type: "create_chapter";
      payload: NovelChapterPlan;
    };
