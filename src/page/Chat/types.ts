import type { ChatMessage } from "../../services/agent/types";

export type ChatMessageRender = Omit<ChatMessage, 'content'> & {
  content: ChatMessage['content'] | Node;
};
