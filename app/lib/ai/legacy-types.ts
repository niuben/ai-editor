import type { AIMessage } from "./types";

export type PlanStep = "characters_plot" | "worldview" | "style";

export type LegacyAIRequestBody = {
  mode?: "chat" | "expand" | "novel" | "plan_step";
  messages?: AIMessage[];
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
