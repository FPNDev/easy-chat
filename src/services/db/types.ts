import type { ChatMessage } from "../agent/types";

export type ChatMessageEntry = {
  id: number;
  chat_id: string;
  message: ChatMessage;
}