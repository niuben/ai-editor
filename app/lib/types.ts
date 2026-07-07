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

export type ManualChapterPlan = {
  title: string;
  summary?: string;
  sections?: string[];
};

export type ManualAction =
  | {
      type: "create_manual";
      payload: {
        title?: string;
        chapters: ManualChapterPlan[];
      };
    }
  | {
      type: "create_chapter";
      payload: ManualChapterPlan;
    };
