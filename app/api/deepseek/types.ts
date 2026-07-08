export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type PlanStep = "characters_plot" | "worldview" | "style";

export type DeepSeekRequestBody = {
  mode?: "chat" | "expand" | "novel" | "plan_step";
  messages?: ChatMessage[];
  prompt?: string;
  step?: PlanStep;
  context?: {
    premise?: string;
    charactersPlot?: string;
    worldview?: string;
    style?: string;
  };
  chapterTitle?: string;
  chapterText?: string;
};
