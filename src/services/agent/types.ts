export type ChatMessage = {
  role: "user" | "assistant" | "system" | string;
  content: string;
  reasoning_content: string;
};