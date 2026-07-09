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

export type AIModelProvider = {
  complete(input: AICompletionInput): Promise<AICompletionResult>;
};
